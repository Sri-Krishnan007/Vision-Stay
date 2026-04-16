# VisionStay

VisionStay is an AI-powered hostel access, attendance, and surveillance system built with Flask, MongoDB, OpenCV, face recognition, YOLO-based face detection, mask detection, and a lightweight liveness capture service.

It is designed for administrators to manage students, monitor live camera frames, track attendance events, detect masked or unknown people, and review analytics. Students get a simple dashboard to view their profile and attendance activity.

---

## 1. Project Purpose

This project is intended to solve a common hostel or campus security workflow:

1. Register students into the system with basic details and a reference photo.
2. Capture frames from a camera or IP camera feed.
3. Detect whether a face is live, masked, known, unknown, or failed verification.
4. Save detections into categorized folders.
5. Store attendance and student data in MongoDB.
6. Provide admin and student dashboards for management and visibility.
7. Allow future extension for analytics, alerts, notifications, and AI assistance.

---

## 2. Who This Project Is For

This project is useful for:

1. Hostel administrators who want to manage student entry records.
2. Security teams who need automatic face-based monitoring.
3. Developers who want a Flask-based face recognition and attendance project.
4. Students and project reviewers who want a complete AI security dashboard.
5. Final-year project teams who need an end-to-end system with dataset creation and live monitoring.

---

## 3. Main Features

1. Admin login and student login.
2. Student registration with photo upload.
3. Student view, edit, and delete features.
4. Live frame capture and liveness checking.
5. Face detection and recognition using embeddings.
6. Mask detection.
7. Unknown person detection.
8. Siamese-style verification of identity.
9. Attendance and analytics endpoints.
10. Day scholar tracking and email notification support.
11. Separate camera capture service for saving live frames.
12. Dataset augmentation utilities.
13. Embedding generation pipeline for face recognition.
14. Folder-based output for detected image categories.

---

## 4. Folder Overview

The repository is organized like this:

1. app.py  
   Main Flask dashboard application for login, student management, analytics, attendance APIs, bot endpoints, and admin pages.

2. create_admin.py  
   Script for creating the initial admin account in MongoDB.

3. recognizer.py  
   Face recognition and detection pipeline that loads models, embeddings, and processes saved live frames.

4. creation data  
   Contains scripts for dataset augmentation and embedding creation.

5. ip_cam_flask  
   Separate Flask application for capturing frames from a webcam or camera source and saving live frames.

6. models  
   Stores model files such as face detection and mask detection weights, plus the embeddings file.

7. templates  
   HTML templates for admin dashboard, student dashboard, login page, welcome page, and other pages.

8. static  
   CSS and JavaScript assets for the web interface.

9. detected_persons  
   Output folder for verified recognized detections.

10. masked_persons_detected  
    Output folder for people detected with masks.

11. unknown_persons_detected  
    Output folder for people not matched to known embeddings.

12. siamese_failed_detected  
    Output folder for faces that matched initially but failed verification.

13. ip_cam_flask/LiveFrames  
    Live captured frames saved by the camera service.

---

## 5. How The System Works

The project runs in two main layers:

### 5.1 Dashboard Layer
This is the web application in app.py. It manages login, student CRUD, analytics, attendance APIs, dashboards, and admin pages.

### 5.2 Capture and Recognition Layer
This includes the camera capture service inside ip_cam_flask/app.py and the recognition pipeline in recognizer.py. The camera service saves images into LiveFrames. The recognizer processes those frames and classifies them into detected, unknown, masked, or Siamese-failed categories.

### 5.3 General Flow

1. Start the camera service.
2. Capture frames from the webcam.
3. Save approved frames into the LiveFrames folder.
4. Run recognizer.py to process those frames.
5. Store result images into category folders.
6. Show the results through the dashboard and analytics pages.

---

## 6. End User View

### 6.1 Admin User

An admin can:

1. Log in to the dashboard.
2. Add a new student with name, roll number, course, year, hosteller status, and photo.
3. View all students.
4. Edit student details.
5. Delete student records.
6. Open the live detection page.
7. Review frames and detection results.
8. View attendance and analytics.
9. Use the AI assistant page if configured.
10. Send day scholar email notifications.
11. Track security alerts and recognized visitors.

### 6.2 Student User

A student can:

1. Log in with roll number credentials.
2. Open the student dashboard.
3. View their profile.
4. See their attendance summary.
5. Review recent attendance records.
6. See personal statistics such as total entries and present days.

---

## 7. Installation Guide

This section explains how to install and run the project on your own machine.

### 7.1 Install Python

Install Python 3.10 or newer.

Recommended checks:

1. Open a terminal.
2. Run `python --version`.
3. Confirm that Python is installed correctly.

### 7.2 Install Git

If you plan to clone the repository, install Git.

### 7.3 Create a Virtual Environment

Create a virtual environment in the project root.

Windows example:

1. Open terminal in the project folder.
2. Run `python -m venv venv`.
3. Activate it using `.\venv\Scripts\activate`.

### 7.4 Install Dependencies

Install the required Python packages.

The project uses packages such as:

1. Flask
2. pymongo
3. python-dotenv
4. flask-mail
5. opencv-python
6. numpy
7. pytz
8. torch
9. torchvision
10. ultralytics
11. face_recognition
12. dlib
13. tqdm
14. werkzeug

If you already have a requirements file, use it. Otherwise, install these packages manually.

### 7.5 Add Environment Variables

Create a `.env` file in the project root and configure the following values:

1. `SECRET_KEY`
2. `MONGO_URI`
3. `MAIL_USERNAME`
4. `MAIL_PASSWORD`
5. `GROQ_API_KEY`

Example values:

```env
SECRET_KEY=your_secret_key_here
MONGO_URI=your_mongodb_connection_string
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_gmail_app_password
GROQ_API_KEY=your_groq_api_key
```

Important note:

1. For Gmail, use an app password, not your regular login password.
2. For MongoDB Atlas, make sure your IP address is allowed.
3. For production, use strong secrets and never commit the `.env` file.

### 7.6 Prepare Model Files

The project expects model files in the `models` folder.

Typical required files are:

1. YOLO face detection model
2. Mask detector model
3. `face_embeddings.pkl`

If any of these are missing, the recognition pipeline may fail.

### 7.7 Create the Admin Account

Run the admin creation script once to create the default admin account.

Default credentials in the current script:

1. Username: `admin`
2. Password: `admin123`

Important:

1. Change this for production use.
2. Do not keep default credentials in a live deployment.

---

## 8. Create The Dataset

Before generating embeddings, prepare your own dataset.

Recommended dataset structure:

```text
Dataset/
  person_1/
    img1.jpg
    img2.jpg
  person_2/
    img1.jpg
    img2.jpg
```

Each folder name should represent one person identity.

---

## 9. Run Augmentation

Use the augmenter script to create additional training samples from the original images.

This script:

1. Rotates images.
2. Flips images.
3. Changes brightness.
4. Adds blur.
5. Applies random crop and resize.
6. Produces a larger dataset for better recognition robustness.

Output folder:

`new_augmented_dataset`

---

## 10. Generate Face Embeddings

Use the embeddings creator script after augmentation.

This script:

1. Detects faces in the augmented dataset.
2. Extracts embeddings from each face.
3. Saves the result into a pickle file.
4. Produces the `face_embeddings.pkl` file used by `recognizer.py`.

Important:

1. The current script contains machine-specific Windows paths.
2. You should replace those paths with your own project paths.
3. The script also uses dlib shape predictor path configuration.
4. Make sure the predictor file exists and the path is correct.

---

## 11. Run The Camera Capture Service

Start the camera service from `ip_cam_flask/app.py`.

This service:

1. Opens the webcam.
2. Captures frames.
3. Performs liveness checks.
4. Saves approved frames periodically.
5. Exposes a small Flask UI and status endpoints.

Default port:

1. The service runs on port `5001`.
2. The UI and status endpoints are available there.

---

## 12. Run The Main Dashboard

Start the main Flask application from `app.py`.

This is the main web application for:

1. Login
2. Student management
3. Live detection
4. Analytics
5. Attendance APIs
6. Student dashboard
7. AI assistant features

---

## 13. Open The Application

Open the application in your browser after starting the services.

Suggested access flow:

1. Start MongoDB.
2. Start the camera service.
3. Start the dashboard app.
4. Open the dashboard in the browser.
5. Log in as admin or student.

---

## 14. Login Flow

### 14.1 Admin Login

Admin login uses values from the MongoDB `admins` collection.

Fields used:

1. Username
2. Password

If the credentials are correct, the admin is redirected to the admin dashboard.

### 14.2 Student Login

Student login uses the roll number.

Current behavior:

1. Username is the roll number.
2. Password is also the roll number.

This is simple for a project demo, but you may want to improve it later with proper passwords.

---

## 15. Default Routes

The dashboard application provides several routes.

### 15.1 Public Routes

1. `/`  
   Welcome page.

2. `/login`  
   Login handler.

3. `/logout`  
   Clears session and logs the user out.

### 15.2 Admin Routes

1. `/admin/dashboard`  
   Admin dashboard page.

2. `/admin/students/add`  
   Add a new student.

3. `/admin/students/view`  
   View all students.

4. `/admin/students/edit/<roll_no>`  
   Edit student details.

5. `/admin/students/delete/<roll_no>`  
   Delete a student.

6. `/admin/live_detection`  
   Live detection dashboard page.

7. `/admin/analytics`  
   Analytics page.

8. `/admin/bot`  
   AI assistant page.

### 15.3 Student Routes

1. `/student/dashboard`  
   Student dashboard page.

### 15.4 API Routes

1. `/api/frames`  
   Returns saved frame information.

2. `/api/detect`  
   Processes selected frames.

3. `/api/detection_history`  
   Returns detection history.

4. `/api/attendance`  
   Returns attendance records.

5. `/api/attendance/today`  
   Returns today’s attendance.

6. `/api/dayscholars`  
   Returns day scholar records.

7. `/api/dayscholars/send_email`  
   Sends email for a selected day scholar.

8. `/api/dayscholars/send_all`  
   Sends all pending day scholar emails.

9. `/api/analytics/stats`  
   Returns analytics summary.

10. `/api/analytics/attendance_trend`  
    Returns attendance trend data.

11. `/api/analytics/hourly_distribution`  
    Returns hourly distribution.

12. `/api/analytics/attendance_table`  
    Returns attendance table data.

13. `/api/analytics/top_visitors`  
    Returns top visitor stats.

14. `/api/bot/chat`  
    Sends chat request to the assistant.

15. `/api/bot/quick_stats`  
    Returns quick statistics.

16. `/api/student/profile`  
    Returns student profile data.

17. `/api/student/attendance`  
    Returns student attendance.

18. `/api/student/attendance_trend`  
    Returns student trend data.

19. `/api/student/stats`  
    Returns student statistics.

---

## 16. Camera Service Details

The camera service in `ip_cam_flask/app.py` works independently from the dashboard.

### 16.1 What It Does

1. Captures frames from a camera device.
2. Checks liveness using motion, texture, blur, color consistency, and local variation.
3. Saves frames periodically when the system detects live behavior.
4. Exposes a streaming endpoint.
5. Provides a status endpoint for monitoring.

### 16.2 Camera Endpoints

1. `/`  
   Camera UI page.

2. `/video_feed`  
   JPEG video stream.

3. `/start_recording`  
   Enables frame saving.

4. `/stop_recording`  
   Stops frame saving.

5. `/status`  
   Returns current camera and liveness status.

6. `/saved_frames`  
   Returns saved frame listing.

7. `/diagnostics`  
   Returns debug information.

### 16.3 Default Camera Settings

1. Camera index: `0`
2. Resolution: `640 x 480`
3. Quality: `45`
4. Maximum FPS: `30`
5. Save interval: `4` seconds

### 16.4 Liveness Logic

The current liveness model uses:

1. Motion magnitude
2. Texture variance
3. Blur score
4. Color consistency
5. Local binary pattern inspired score

It computes a final score and compares it to a threshold.

---

## 17. Recognition Pipeline Details

The recognizer loads and uses:

1. YOLO face detector
2. Mask detector
3. Face embeddings file
4. Face recognition distance matching
5. Siamese-style verification

### 17.1 Processing Steps

1. Load frame from `LiveFrames`.
2. Detect faces.
3. Crop face region.
4. Check for mask.
5. Preprocess the face.
6. Extract embedding.
7. Compare against stored embeddings.
8. Perform Siamese verification.
9. Save the image into the correct output folder.

### 17.2 Recognition Output Categories

1. `detected_persons`  
   Recognized and verified person images.

2. `masked_persons_detected`  
   Faces classified as masked.

3. `unknown_persons_detected`  
   Unknown faces.

4. `siamese_failed_detected`  
   Faces that matched initially but failed verification.

---

## 18. Dataset Pipeline Details

This project uses a simple but practical dataset flow.

### 18.1 Recommended Workflow

1. Collect raw images for each person.
2. Put them into one folder per identity.
3. Run augmentation.
4. Generate embeddings.
5. Place the output pickle file into the `models` folder.
6. Run recognition against live frames.

### 18.2 Suggested Data Quality Rules

1. Use clear frontal face images where possible.
2. Keep lighting reasonably consistent.
3. Include some variation in angle and expression.
4. Avoid heavily blurred images.
5. Avoid images where the face is too small.
6. Use consistent folder names for each identity.

### 18.3 Why Augmentation Helps

Augmentation improves robustness by exposing the model to:

1. Slight rotations
2. Cropping variation
3. Bright and dark variants
4. Horizontal flips
5. Slight blur
6. Pose-like shifts

This makes recognition more stable in real deployment conditions.

---

## 19. Customizing The Project With Your Own Data

To adapt VisionStay for your own hostel, college, or institution:

1. Update the MongoDB connection string.
2. Change admin credentials after first login.
3. Add your own student records.
4. Replace the sample dataset with your own faces.
5. Regenerate embeddings after every dataset change.
6. Update the camera index if needed.
7. Change email settings if you want notifications.
8. Adjust face recognition thresholds if you need stricter matching.
9. Add your own dashboard branding in the static files.
10. Modify templates to match your organization’s workflow.

---

## 20. Files You Will Most Likely Edit

1. `app.py`  
   For dashboard behavior, routes, login logic, student management, analytics, and API logic.

2. `create_admin.py`  
   For initial admin creation or changing default admin data.

3. `creation data/augmenter.py`  
   For dataset augmentation behavior.

4. `creation data/embeddings_creator.py`  
   For dataset path changes and embedding generation.

5. `recognizer.py`  
   For detection thresholds, model paths, and recognition logic.

6. `ip_cam_flask/app.py`  
   For camera index, recording behavior, frame saving interval, and liveness tuning.

7. `templates`  
   For UI and page structure changes.

8. `static`  
   For visual styling and client-side behavior.

---

## 21. Security Notes

This project is suitable for a demo or academic prototype, but some things should be improved before production:

1. Passwords are stored too simply in the current logic.
2. Default admin credentials should be changed.
3. Hardcoded file paths should be removed.
4. Secrets should always come from environment variables.
5. Database access should be restricted.
6. Email credentials should be protected.
7. Sensitive models and dataset paths should be managed carefully.

---

## 22. Troubleshooting

### 22.1 MongoDB Connection Fails

Check:

1. `MONGO_URI` in `.env`
2. Network access to Atlas
3. Username and password
4. IP allowlist settings

### 22.2 Camera Does Not Open

Check:

1. Camera device connection
2. Camera index in `ip_cam_flask/app.py`
3. Another app using the webcam
4. Operating system camera permissions

### 22.3 Embeddings File Missing

Check:

1. Whether `face_embeddings.pkl` exists in `models`
2. Whether `embeddings_creator.py` ran successfully
3. Whether the data directory paths were updated correctly

### 22.4 Recognition Is Poor

Check:

1. Whether the dataset contains enough images per person
2. Whether the face images are clear enough
3. Whether thresholds in `recognizer.py` are too strict
4. Whether the embeddings file is outdated

### 22.5 Email Notifications Fail

Check:

1. `MAIL_USERNAME`
2. `MAIL_PASSWORD`
3. Gmail app password settings
4. SMTP access permissions
5. Internet connectivity

### 22.6 App Crashes on Startup

Check:

1. Missing Python packages
2. Bad environment variables
3. Wrong model file paths
4. Wrong dataset paths
5. Invalid pickle or model files

---

## 23. Suggested Run Order

For a smooth workflow, start the system in this order:

1. Start MongoDB.
2. Activate your virtual environment.
3. Run `create_admin.py` once.
4. Run the camera service in `ip_cam_flask/app.py`.
5. Run the main dashboard `app.py`.
6. Open the dashboard in the browser.
7. Add students.
8. Prepare dataset images.
9. Generate embeddings.
10. Start capturing and processing live frames.

---

## 24. Development Tips

1. Keep model paths relative if you move the project to another machine.
2. Regenerate embeddings whenever you add new identities.
3. Use a consistent folder naming scheme for people.
4. Back up MongoDB collections before making schema changes.
5. Test the camera service before testing recognition.
6. Check the output folders after running detections.
7. Review logs in the terminal if something seems wrong.
8. Update the UI text if you want a cleaner project presentation.

---

## 25. End User Summary

If you are the end user, the system gives you:

1. A login page for admin and student access.
2. A student management screen for registering people.
3. A live monitoring page for camera-based detection.
4. An analytics page for attendance insights.
5. A separate camera service that saves frames.
6. Folder-based detection results for review.
7. A complete AI security workflow with dataset support.

---

## 26. Final Notes

This project is designed as a full-stack AI surveillance and attendance system. The strongest part of the project is the separation between dashboard, capture service, dataset creation, and recognition logic. That makes it easier to explain in a final-year project, easier to demo, and easier to modify later.
```
