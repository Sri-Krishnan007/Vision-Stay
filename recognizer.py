import os
import cv2
import pickle
import numpy as np
import torch
import torch.nn as nn
from torchvision import transforms, models
from ultralytics import YOLO
import face_recognition
from datetime import datetime

# ===============================
# CUDA Setup
# ===============================
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
print(f"[INFO] Using device: {DEVICE}")

# ===============================
# Paths
# ===============================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
LIVEFRAME_DIR = os.path.join(os.path.dirname(BASE_DIR), "ip_cam_flask", "LiveFrames")

EMBEDDINGS_PATH = os.path.join(MODELS_DIR, "face_embeddings.pkl")
YOLO_MODEL_PATH = os.path.join(MODELS_DIR, "yolov8n-face.pt")
MASK_MODEL_PATH = os.path.join(MODELS_DIR, "mask_detector.pt")

# Output folders
MASKED_FOLDER = os.path.join(BASE_DIR, "masked_persons_detected")
DETECTED_FOLDER = os.path.join(BASE_DIR, "detected_persons")
UNKNOWN_FOLDER = os.path.join(BASE_DIR, "unknown_persons_detected")
SIAMESE_FAILED_FOLDER = os.path.join(BASE_DIR, "siamese_failed_detected")

# Create output folders
for folder in [MASKED_FOLDER, DETECTED_FOLDER, UNKNOWN_FOLDER, SIAMESE_FAILED_FOLDER]:
    os.makedirs(folder, exist_ok=True)

# ===============================
# Thresholds
# ===============================
RECOGNITION_THRESHOLD = 0.45
SIAMESE_THRESHOLD = 0.45
MIN_SIAMESE_MATCHES = 5
MAX_SIAMESE_CHECKS = 10
MASK_PROB_THRESHOLD = 0.5

# ===============================
# Load Models
# ===============================
# YOLO Face Detection
yolo_model = YOLO(YOLO_MODEL_PATH)
if DEVICE == "cuda":
    yolo_model.to("cuda")
print("[INFO] YOLO face detector loaded")

# Mask Detector (MobileNetV2)
mask_model = models.mobilenet_v2(pretrained=False)
mask_model.classifier[1] = nn.Linear(mask_model.last_channel, 1)
mask_model.load_state_dict(torch.load(MASK_MODEL_PATH, map_location=DEVICE))
mask_model = mask_model.to(DEVICE)
mask_model.eval()
print("[INFO] Mask detector loaded")

# Face Embeddings
with open(EMBEDDINGS_PATH, "rb") as f:
    saved_embeddings = pickle.load(f)
print(f"[INFO] Loaded {len(saved_embeddings)} embeddings")

# ===============================
# Transforms
# ===============================
mask_transform = transforms.Compose([
    transforms.ToPILImage(),
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225])
])

# ===============================
# Helper Functions
# ===============================
def extract_time_from_filename(filename):
    """Extract datetime from filename like '12-02-2026_15-43-47.jpg'"""
    try:
        name = os.path.splitext(filename)[0]
        return name
    except:
        return datetime.now().strftime("%d-%m-%Y_%H-%M-%S")

def gamma_correction(image, gamma=1.2):
    """Apply gamma correction to image"""
    invGamma = 1.0 / gamma
    table = np.array([
        ((i / 255.0) ** invGamma) * 255
        for i in np.arange(256)
    ]).astype("uint8")
    return cv2.LUT(image, table)

def preprocess_face(img):
    """
    Preprocess face image using:
    1. Grayscale conversion
    2. CLAHE (Adaptive Histogram Equalization)
    3. Gamma Correction
    4. Merge back to RGB
    """
    # Step 1: Convert to Grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Step 2: Adaptive Histogram Equalization (CLAHE)
    clahe = cv2.createCLAHE(
        clipLimit=2.0,
        tileGridSize=(8, 8)
    )
    clahe_img = clahe.apply(gray)
    
    # Step 3: Gamma Correction
    gamma_img = gamma_correction(clahe_img, gamma=1.2)
    
    # Step 4: Merge back to RGB (Replace Y channel in YCrCb)
    ycrcb = cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)
    ycrcb[:, :, 0] = gamma_img
    final_img = cv2.cvtColor(ycrcb, cv2.COLOR_YCrCb2BGR)
    
    return final_img

def align_face(img, bbox):
    """Crop face from image using bounding box"""
    x1, y1, x2, y2 = map(int, bbox)
    h, w = img.shape[:2]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w, x2), min(h, y2)
    if x1 >= x2 or y1 >= y2:
        return None
    return img[y1:y2, x1:x2]

def get_embedding(face_img):
    """Get face embedding using face_recognition"""
    if face_img is None or face_img.size == 0:
        return None
    try:
        face_rgb = cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB)
        face_locations = [(0, face_rgb.shape[1], face_rgb.shape[0], 0)]
        enc = face_recognition.face_encodings(
            face_rgb,
            known_face_locations=face_locations,
            num_jitters=1,
            model="small"
        )
        if not enc:
            return None
        return enc[0]
    except:
        return None

def check_mask(face_img):
    """Check if person is wearing mask. Returns (is_masked, probability)"""
    try:
        face_rgb = cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB)
        face_resized = cv2.resize(face_rgb, (224, 224))
        face_tensor = mask_transform(face_resized).unsqueeze(0).to(DEVICE)
        
        with torch.no_grad():
            output = mask_model(face_tensor)
            prob = torch.sigmoid(output).item()
        
        is_masked = prob < MASK_PROB_THRESHOLD
        mask_prob = 1 - prob if is_masked else prob
        return is_masked, round(mask_prob, 4)
    except:
        return False, 0.0

def recognize_face(test_embedding):
    """Find closest match in saved embeddings"""
    min_dist = float("inf")
    identity = "Unknown"
    
    for record in saved_embeddings:
        dist = np.linalg.norm(record["embedding"] - test_embedding)
        if dist < min_dist:
            min_dist = dist
            identity = record["name"]
    
    if min_dist > RECOGNITION_THRESHOLD:
        return "Unknown", min_dist
    
    return identity, min_dist

def siamese_verify(test_embedding, predicted_name):
    """Siamese-style verification using saved embeddings"""
    if predicted_name == "Unknown":
        return False, 0, 0
    
    person_embeddings = [
        rec["embedding"] for rec in saved_embeddings
        if rec["name"] == predicted_name
    ]
    
    if len(person_embeddings) == 0:
        return False, 0, 0
    
    verified = 0
    checked = 0
    
    for ref_emb in person_embeddings:
        if checked >= MAX_SIAMESE_CHECKS:
            break
        
        dist = np.linalg.norm(ref_emb - test_embedding)
        checked += 1
        
        if dist < SIAMESE_THRESHOLD:
            verified += 1
    
    passed = verified >= MIN_SIAMESE_MATCHES
    return passed, verified, checked

def save_result(img, filename, folder, name, time_str, score):
    """Save image to appropriate folder"""
    score_str = f"{score:.4f}".replace(".", "-")
    save_name = f"{name}_{time_str}_{score_str}.jpg"
    save_path = os.path.join(folder, save_name)
    cv2.imwrite(save_path, img)
    return save_path

# ===============================
# Main Processing Function
# ===============================
def process_frame(image_path):
    """Process a single frame from LiveFrames folder"""
    filename = os.path.basename(image_path)
    time_str = extract_time_from_filename(filename)
    
    # Load image
    img = cv2.imread(image_path)
    if img is None:
        print(f"[ERROR] Could not load: {image_path}")
        return None
    
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # Detect faces
    results = yolo_model(img_rgb, verbose=False, conf=0.4)
    
    if not results or len(results[0].boxes) == 0:
        print(f"[INFO] No face detected in {filename}")
        return None
    
    detections = []
    
    for box in results[0].boxes:
        bbox = box.xyxy[0].cpu().numpy()
        x1, y1, x2, y2 = map(int, bbox)
        
        # Crop face
        face = align_face(img, bbox)
        if face is None:
            continue
        
        # Step 1: Check for mask
        is_masked, mask_prob = check_mask(face)
        
        if is_masked:
            save_path = save_result(img, filename, MASKED_FOLDER, "masked", time_str, mask_prob)
            print(f"[MASK] Mask detected ({mask_prob:.2%}) -> {save_path}")
            detections.append({
                "status": "masked",
                "mask_prob": mask_prob,
                "path": save_path
            })
            continue
        
        # Step 2: Preprocess face (CLAHE + Gamma Correction)
        preprocessed_face = preprocess_face(face)
        
        # Step 3: Get face embedding from preprocessed face
        embedding = get_embedding(preprocessed_face)
        if embedding is None:
            print(f"[WARN] Could not extract embedding from {filename}")
            continue
        
        # Step 4: Initial recognition
        identity, distance = recognize_face(embedding)
        score = round(1 - distance, 4)
        
        if identity == "Unknown":
            save_path = save_result(img, filename, UNKNOWN_FOLDER, "unknown", time_str, distance)
            print(f"[UNKNOWN] Unknown person (dist={distance:.4f}) -> {save_path}")
            detections.append({
                "status": "unknown",
                "distance": distance,
                "path": save_path
            })
            continue
        
        # Step 5: Siamese verification
        passed, verified, checked = siamese_verify(embedding, identity)
        
        if passed:
            save_path = save_result(img, filename, DETECTED_FOLDER, identity, time_str, score)
            print(f"[DETECTED] {identity} verified ({verified}/{checked}) -> {save_path}")
            detections.append({
                "status": "detected",
                "name": identity,
                "score": score,
                "verified": f"{verified}/{checked}",
                "path": save_path
            })
        else:
            save_path = save_result(img, filename, SIAMESE_FAILED_FOLDER, f"{identity}_sf", time_str, score)
            print(f"[SIAMESE_FAILED] {identity} failed verification ({verified}/{checked}) -> {save_path}")
            detections.append({
                "status": "siamese_failed",
                "name": identity,
                "score": score,
                "verified": f"{verified}/{checked}",
                "path": save_path
            })
    
    return detections

def process_all_frames():
    """Process all frames in LiveFrames folder"""
    if not os.path.exists(LIVEFRAME_DIR):
        print(f"[ERROR] LiveFrames directory not found: {LIVEFRAME_DIR}")
        return []
    
    all_results = []
    images = [f for f in os.listdir(LIVEFRAME_DIR) if f.endswith(('.jpg', '.png', '.jpeg'))]
    
    print(f"[INFO] Processing {len(images)} frames...")
    
    for img_name in sorted(images):
        img_path = os.path.join(LIVEFRAME_DIR, img_name)
        result = process_frame(img_path)
        if result:
            all_results.extend(result)
    
    return all_results

# ===============================
# Entry Point
# ===============================
if __name__ == "__main__":
    results = process_all_frames()
    print(f"\n[DONE] Processed {len(results)} detections")