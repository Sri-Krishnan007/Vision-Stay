import cv2
import numpy as np
from flask import Flask, render_template, Response, jsonify
from datetime import datetime
import pytz
import os
import threading
import time

app = Flask(__name__)

# Configuration
CAMERA_INDEX = 0  # 0 = built-in laptop camera, 1 = external USB camera
RESOLUTION = (640, 480)
QUALITY = 45
MAX_FPS = 30
FRAME_INTERVAL = 1 / MAX_FPS
SAVE_INTERVAL = 4

# Liveness Detection Thresholds
LIVENESS_THRESHOLD = 58.0

# Timezone IST
IST = pytz.timezone('Asia/Kolkata')

# Directories
LIVE_FRAMES_DIR = "LiveFrames"
MOTION_FRAMES_DIR = "MotionFrames"

os.makedirs(LIVE_FRAMES_DIR, exist_ok=True)
os.makedirs(MOTION_FRAMES_DIR, exist_ok=True)

# Global variables
current_frame = None
video_lock = threading.Lock()

# Algorithm variables
algo_frame = None
algo_prev_frame = None
liveness_score = 0
liveness_status = "UNKNOWN"
algo_lock = threading.Lock()

# Camera and recording variables
camera_status = "INITIALIZING"
camera_error_msg = ""
frames_saved_count = 0
is_recording = False
control_lock = threading.Lock()

def generate_filename():
    """Generate filename with IST timestamp"""
    now = datetime.now(IST)
    return now.strftime("%d-%m-%Y_%H-%M-%S.jpg")

# ============ LIVENESS ALGORITHMS ============
def calculate_blur_score(frame):
    try:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        return max(0, laplacian_var)
    except:
        return 0

def calculate_texture_variance(frame):
    try:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        magnitude = np.sqrt(sobelx**2 + sobely**2)
        return max(0, np.var(magnitude))
    except:
        return 0

def calculate_motion_magnitude(current_frame, prev_frame):
    try:
        gray_curr = cv2.cvtColor(current_frame, cv2.COLOR_BGR2GRAY)
        gray_prev = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)
        diff = cv2.absdiff(gray_curr, gray_prev)
        motion_pixels = np.sum(diff > 15)
        motion_score = (motion_pixels / (RESOLUTION[0] * RESOLUTION[1])) * 100
        return min(motion_score, 100)
    except:
        return 0

def calculate_color_consistency(frame):
    try:
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        h_var = np.var(hsv[:, :, 0])
        s_var = np.var(hsv[:, :, 1])
        v_var = np.var(hsv[:, :, 2])
        color_consistency = (h_var + s_var + v_var) / 3.0
        return min(color_consistency / 2, 100)
    except:
        return 50

def calculate_local_binary_pattern_score(frame):
    try:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape
        region_h, region_w = h // 4, w // 4
        total_variance = 0
        for i in range(0, h - region_h, region_h):
            for j in range(0, w - region_w, region_w):
                region = gray[i:i+region_h, j:j+region_w]
                total_variance += np.var(region)
        avg_variance = total_variance / 16
        return min(avg_variance / 50, 100)
    except:
        return 50

def liveness_detection_model(current_frame, prev_frame):
    try:
        if prev_frame is None:
            return 50, "INITIALIZING"
        
        motion_score = calculate_motion_magnitude(current_frame, prev_frame)
        if motion_score > 0:
            motion_score = motion_score ** 0.8
        
        texture_var = calculate_texture_variance(current_frame)
        texture_score = min(texture_var / 5, 100)
        
        blur_score = calculate_blur_score(current_frame)
        blur_normalized = min(blur_score / 1000, 100) if blur_score < 5000 else 50
        
        color_score = calculate_color_consistency(current_frame)
        lbp_score = calculate_local_binary_pattern_score(current_frame)
        
        liveness_score = (
            motion_score * 0.30 +
            texture_score * 0.30 +
            blur_normalized * 0.15 +
            color_score * 0.15 +
            lbp_score * 0.10
        )
        
        if 0.5 < motion_score < 50:
            liveness_score += 15
        if texture_score > 40:
            liveness_score += 10
        
        liveness_score = min(liveness_score, 100)
        
        if liveness_score >= LIVENESS_THRESHOLD:
            status = "LIFE"
        else:
            status = "SPOOFING"
        
        return liveness_score, status
    
    except Exception as e:
        print(f"[ERROR] Liveness model error: {e}")
        return 50, "ERROR"

# ============ BACKGROUND LIVENESS DETECTION ============
def background_liveness_detection():
    global algo_frame, algo_prev_frame, liveness_score, liveness_status
    
    while True:
        try:
            with algo_lock:
                if algo_frame is not None:
                    frame_to_process = algo_frame.copy()
                    prev_to_process = algo_prev_frame.copy() if algo_prev_frame is not None else None
                else:
                    frame_to_process = None
                    prev_to_process = None
            
            if frame_to_process is not None and prev_to_process is not None:
                liveness_score, liveness_status = liveness_detection_model(frame_to_process, prev_to_process)
            
            time.sleep(0.5)
        
        except Exception as e:
            print(f"[ERROR] Background liveness error: {e}")
            time.sleep(0.5)

# ============ LAPTOP CAMERA CAPTURE ============
def capture_frames():
    global current_frame, algo_frame, algo_prev_frame, camera_status, camera_error_msg
    
    cap = None
    frame_count = 0
    
    while True:
        try:
            if cap is None:
                print(f"[CAMERA] Opening laptop camera (index {CAMERA_INDEX})...")
                cap = cv2.VideoCapture(CAMERA_INDEX)
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                cap.set(cv2.CAP_PROP_FRAME_WIDTH, RESOLUTION[0])
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, RESOLUTION[1])
                cap.set(cv2.CAP_PROP_FPS, MAX_FPS)
                
                if not cap.isOpened():
                    print("[CAMERA] ❌ Failed to open laptop camera")
                    with control_lock:
                        camera_status = "CONNECTION_FAILED"
                        camera_error_msg = "Cannot open laptop camera"
                    time.sleep(2)
                    cap = None
                    continue
                
                print("[CAMERA] ✓ Laptop camera connected")
                with control_lock:
                    camera_status = "LIVE"
                    camera_error_msg = ""
            
            ret, frame = cap.read()
            
            if not ret:
                print("[CAMERA] Read error - Reconnecting...")
                with control_lock:
                    camera_status = "READ_ERROR"
                    camera_error_msg = "Cannot read frames"
                
                if cap is not None:
                    cap.release()
                cap = None
                time.sleep(2)
                continue
            
            frame = cv2.resize(frame, RESOLUTION)
            
            with video_lock:
                current_frame = frame.copy()
            
            with algo_lock:
                algo_prev_frame = algo_frame.copy() if algo_frame is not None else frame.copy()
                algo_frame = frame.copy()
            
            frame_count += 1
            if frame_count % 100 == 0:
                print(f"[CAMERA] Frames captured: {frame_count}")
            
            time.sleep(FRAME_INTERVAL)
        
        except Exception as e:
            print(f"[CAMERA] Error: {e}")
            with control_lock:
                camera_status = "ERROR"
                camera_error_msg = str(e)
            
            if cap is not None:
                cap.release()
            cap = None
            time.sleep(2)

# ============ AUTO-SAVE FRAMES ============
def auto_save_frames():
    global frames_saved_count
    last_save_time = time.time()
    
    while True:
        try:
            current_time = time.time()
            
            if current_time - last_save_time >= SAVE_INTERVAL:
                with video_lock:
                    frame_to_save = current_frame.copy() if current_frame is not None else None
                
                if (is_recording and frame_to_save is not None and 
                    camera_status == "LIVE" and liveness_status == "LIFE"):
                    
                    filename = generate_filename()
                    filepath = os.path.join(LIVE_FRAMES_DIR, filename)
                    
                    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), QUALITY]
                    cv2.imwrite(filepath, frame_to_save, encode_param)
                    
                    frames_saved_count += 1
                    print(f"[SAVE] ✓ LIFE - Saved: {filename}")
                
                last_save_time = current_time
            
            time.sleep(0.1)
        
        except Exception as e:
            print(f"[SAVE] Error: {e}")
            time.sleep(SAVE_INTERVAL)

# ============ VIDEO STREAMING ============
def video_stream():
    while True:
        try:
            with video_lock:
                if current_frame is not None:
                    frame_to_send = current_frame.copy()
                else:
                    frame_to_send = None
            
            if frame_to_send is not None:
                encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), QUALITY]
                ret, buffer = cv2.imencode('.jpg', frame_to_send, encode_param)
                
                if ret and len(buffer) > 0:
                    frame_data = buffer.tobytes()
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n'
                           b'Content-Length: ' + str(len(frame_data)).encode() + b'\r\n\r\n' 
                           + frame_data + b'\r\n')
            
            time.sleep(FRAME_INTERVAL)
        
        except Exception as e:
            print(f"[STREAM] Error: {e}")
            time.sleep(FRAME_INTERVAL)

# ============ ROUTES ============
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/video_feed')
def video_feed():
    return Response(video_stream(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/start_recording')
def start_recording():
    global is_recording, frames_saved_count
    is_recording = True
    frames_saved_count = 0
    print("[CONTROL] ▶️ RECORDING STARTED")
    return jsonify({'status': 'success', 'message': 'Recording started'})

@app.route('/stop_recording')
def stop_recording():
    global is_recording
    is_recording = False
    print(f"[CONTROL] ⏹️ RECORDING STOPPED - Total: {frames_saved_count} frames")
    return jsonify({'status': 'success', 'message': 'Recording stopped', 'frames_saved': frames_saved_count})

@app.route('/status')
def status():
    return jsonify({
        'camera_status': str(camera_status),
        'error_message': str(camera_error_msg),
        'liveness_score': float(round(liveness_score, 2)),
        'liveness_status': str(liveness_status),
        'is_recording': bool(is_recording),
        'frames_saved': int(frames_saved_count),
        'resolution': list(RESOLUTION),
        'quality': int(QUALITY),
        'fps': int(MAX_FPS),
        'save_interval': float(SAVE_INTERVAL),
        'threshold': float(LIVENESS_THRESHOLD),
        'camera_index': int(CAMERA_INDEX),
        'timestamp': datetime.now(IST).strftime("%d-%m-%Y %H:%M:%S")
    })

@app.route('/saved_frames')
def saved_frames():
    try:
        frames = os.listdir(LIVE_FRAMES_DIR)
        frames.sort(reverse=True)
        return jsonify({'status': 'success', 'total_frames': len(frames), 'frames': frames[:50]})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/diagnostics')
def diagnostics():
    return jsonify({
        'camera_type': 'Laptop Camera',
        'camera_index': int(CAMERA_INDEX),
        'camera_status': str(camera_status),
        'liveness_status': str(liveness_status),
        'liveness_threshold': float(LIVENESS_THRESHOLD),
        'is_recording': bool(is_recording),
        'frames_saved_total': int(frames_saved_count),
        'resolution_set': list(RESOLUTION),
        'quality_set': int(QUALITY),
        'fps_set': int(MAX_FPS)
    })

if __name__ == '__main__':
    print("=" * 70)
    print("🎥 LAPTOP CAMERA SURVEILLANCE + LIVENESS DETECTION")
    print("=" * 70)
    print(f"✓ Camera Index: {CAMERA_INDEX}")
    print(f"✓ Resolution: {RESOLUTION}")
    print("=" * 70)
    
    # Start capture thread
    capture_thread = threading.Thread(target=capture_frames, daemon=True)
    capture_thread.start()
    
    # Start background liveness detection
    liveness_thread = threading.Thread(target=background_liveness_detection, daemon=True)
    liveness_thread.start()
    
    # Start auto-save thread
    save_thread = threading.Thread(target=auto_save_frames, daemon=True)
    save_thread.start()
    
    print("[INFO] UI: http://localhost:5000")
    print("[INFO] Status: http://localhost:5000/status")
    
    app.run(host='0.0.0.0', port=5001, debug=False, threaded=True)