import cv2
import os
import numpy as np
import random


# Paths
INPUT_DIR = "Dataset"
OUTPUT_DIR = "new_augmented_dataset"

os.makedirs(OUTPUT_DIR, exist_ok=True)

# ---------------- Augmentation Functions ----------------

def rotate(img, angle):
    h, w = img.shape[:2]
    M = cv2.getRotationMatrix2D((w//2, h//2), angle, 1)
    return cv2.warpAffine(img, M, (w, h))

def brightness_contrast(img, alpha=1.2, beta=20):
    return cv2.convertScaleAbs(img, alpha=alpha, beta=beta)

def blur(img):
    return cv2.GaussianBlur(img, (5, 5), 0)

def horizontal_flip(img):
    return cv2.flip(img, 1)

def head_angle(img, shift=10):
    h, w = img.shape[:2]
    pts1 = np.float32([[0,0], [w,0], [0,h]])
    pts2 = np.float32([[shift,5], [w-shift,0], [0,h]])
    M = cv2.getAffineTransform(pts1, pts2)
    return cv2.warpAffine(img, M, (w,h))

def random_crop_resize(img, crop_ratio=0.9):
    h, w = img.shape[:2]
    ch, cw = int(h * crop_ratio), int(w * crop_ratio)
    y = random.randint(0, h - ch)
    x = random.randint(0, w - cw)
    crop = img[y:y+ch, x:x+cw]
    return cv2.resize(crop, (w, h))

# ---------------- Main Loop ----------------

for person in os.listdir(INPUT_DIR):
    person_path = os.path.join(INPUT_DIR, person)
    if not os.path.isdir(person_path):
        continue

    out_person = os.path.join(OUTPUT_DIR, person)
    os.makedirs(out_person, exist_ok=True)

    for img_name in os.listdir(person_path):
        img_path = os.path.join(person_path, img_name)
        img = cv2.imread(img_path)
        if img is None:
            continue

        base = os.path.splitext(img_name)[0]

        # Original
        cv2.imwrite(f"{out_person}/{base}_orig.jpg", img)

        # Rotation
        cv2.imwrite(f"{out_person}/{base}_rot.jpg", rotate(img, random.choice([-15, 15])))

        # Flip
        cv2.imwrite(f"{out_person}/{base}_flip.jpg", horizontal_flip(img))

        # Brightness low
        cv2.imwrite(f"{out_person}/{base}_dark.jpg",
                    brightness_contrast(img, alpha=0.85, beta=-15))

        # Brightness high
        cv2.imwrite(f"{out_person}/{base}_bright.jpg",
                    brightness_contrast(img, alpha=1.25, beta=25))

        # Blur
        cv2.imwrite(f"{out_person}/{base}_blur.jpg", blur(img))

        # Head angle
        cv2.imwrite(f"{out_person}/{base}_angle.jpg", head_angle(img))

        # Crop + zoom
        cv2.imwrite(f"{out_person}/{base}_zoom.jpg", random_crop_resize(img))

print("✅ Strong-but-safe augmentation completed.")
