import os
from flask import Flask, render_template, request, redirect, session
from pymongo import MongoClient
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
import threading
from datetime import datetime, timedelta
import pytz
from flask import jsonify
from flask_mail import Mail, Message
from flask import send_from_directory



# ---------------- LOAD ENV ----------------
load_dotenv()

# ---------------- APP SETUP ----------------
app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY")

app.config["MAIL_SERVER"] = "smtp.gmail.com"
app.config["MAIL_PORT"] = 587
app.config["MAIL_USE_TLS"] = True
app.config["MAIL_USERNAME"] = os.getenv("MAIL_USERNAME")
app.config["MAIL_PASSWORD"] = os.getenv("MAIL_PASSWORD")

mail = Mail(app)


# ---------------- FILE UPLOAD CONFIG ----------------
UPLOAD_FOLDER = "static/uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# ---------------- MONGODB CONNECTION ----------------
MONGO_URI = os.getenv("MONGO_URI")

client = MongoClient(
    MONGO_URI,
    serverSelectionTimeoutMS=3000
)

db = client["visionstay_db"]
admins_col = db["admins"]
students_col = db["students"]
attendance_col = db["attendance"]


# ---------------- TEST DB CONNECTION ----------------
try:
    client.admin.command("ping")
    print("MongoDB connected successfully")
except Exception as e:
    print("MongoDB connection failed:", e)

# ===================================================
# =================== AUTH FLOW =====================
# ===================================================

# ---------------- WELCOME PAGE ----------------
@app.route("/")
def welcome():
    return render_template("welcome.html")

# ---------------- LOGIN HANDLER ----------------
@app.route("/login", methods=["POST"])
def login():
    role = request.form.get("role")
    username = request.form.get("username")
    password = request.form.get("password")

    # ---------- ADMIN LOGIN ----------
    if role == "admin":
        admin = admins_col.find_one({
            "username": username,
            "password": password
        })
        if admin:
            session.clear()
            session["admin"] = username
            return redirect("/admin/dashboard")
        return "Invalid admin credentials"

    # ---------- STUDENT LOGIN ----------
    elif role == "student":
        student = students_col.find_one({"roll_no": username})
        if student and username == password:
            session.clear()
            session["student"] = username
            return redirect("/student/dashboard")
        return "Invalid student credentials"

    return redirect("/")

# ---------------- LOGOUT ----------------
@app.route("/logout")
def logout():
    session.clear()
    return redirect("/")

# ===================================================
# ================= ADMIN MODULE ====================
# ===================================================

# ---------------- ADMIN DASHBOARD ----------------
@app.route("/admin/dashboard")
def admin_dashboard():
    if "admin" not in session:
        return redirect("/")
    return render_template("admin_dashboard.html")

# ---------------- ADD STUDENT ----------------
@app.route("/admin/students/add", methods=["GET", "POST"])
def add_student():
    if "admin" not in session:
        return redirect("/")

    if request.method == "POST":
        roll_no = request.form["roll_no"]
        name = request.form["name"]
        course = request.form["course"]
        year = request.form["year"]
        hosteller = request.form["hosteller"] == "yes"

        photo = request.files["photo"]
        filename = secure_filename(photo.filename)
        photo.save(os.path.join(app.config["UPLOAD_FOLDER"], filename))

        students_col.insert_one({
            "roll_no": roll_no,
            "name": name,
            "course": course,
            "year": year,
            "hosteller": hosteller,
            "photo": filename
        })

        return redirect("/admin/students/view")

    return render_template("student_add.html")

# ---------------- VIEW STUDENTS ----------------
@app.route("/admin/students/view")
def view_students():
    if "admin" not in session:
        return redirect("/")

    students = list(students_col.find())
    return render_template("student_view.html", students=students)

# ---------------- EDIT STUDENT ----------------
@app.route("/admin/students/edit/<roll_no>", methods=["GET", "POST"])
def edit_student(roll_no):
    if "admin" not in session:
        return redirect("/")

    student = students_col.find_one({"roll_no": roll_no})

    if request.method == "POST":
        students_col.update_one(
            {"roll_no": roll_no},
            {"$set": {
                "name": request.form["name"],
                "course": request.form["course"],
                "year": request.form["year"],
                "hosteller": request.form["hosteller"] == "yes"
            }}
        )
        return redirect("/admin/students/view")

    return render_template("student_edit.html", student=student)

# ---------------- DELETE STUDENT ----------------
@app.route("/admin/students/delete/<roll_no>")
def delete_student(roll_no):
    if "admin" not in session:
        return redirect("/")

    student = students_col.find_one({"roll_no": roll_no})
    if student and "photo" in student:
        photo_path = os.path.join(app.config["UPLOAD_FOLDER"], student["photo"])
        if os.path.exists(photo_path):
            os.remove(photo_path)

    students_col.delete_one({"roll_no": roll_no})
    return redirect("/admin/students/view")




# ===================================================
# ================= STUDENT MODULE ==================
# ===================================================

# ---------------- STUDENT DASHBOARD ----------------
@app.route("/student/dashboard")
def student_dashboard():
    if "student" not in session:
        return redirect("/")

    student = students_col.find_one({"roll_no": session["student"]})
    return render_template(
        "student_dashboard.html",
        student=student
    )


# ===================================================
# ================= LIVE DETECTION ==================
# ===================================================
from recognizer import process_frame, LIVEFRAME_DIR, DETECTED_FOLDER, MASKED_FOLDER, UNKNOWN_FOLDER, SIAMESE_FAILED_FOLDER
import glob

# ---------------- LIVE DETECTION PAGE ----------------
@app.route("/admin/live_detection")
def live_detection():
    if "admin" not in session:
        return redirect("/")
    return render_template("admin_live_detection.html")

# ---------------- GET AVAILABLE FRAMES ----------------
@app.route("/api/frames", methods=["GET"])
def get_frames():
    if "admin" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        frames = []
        if os.path.exists(LIVEFRAME_DIR):
            for f in os.listdir(LIVEFRAME_DIR):
                if f.endswith(('.jpg', '.png', '.jpeg')):
                    # Extract datetime from filename: 12-02-2026_15-43-47.jpg
                    name = os.path.splitext(f)[0]
                    parts = name.split("_")
                    if len(parts) >= 2:
                        date_str = parts[0]  # 12-02-2026
                        time_str = parts[1]  # 15-43-47
                        frames.append({
                            "filename": f,
                            "date": date_str,
                            "time": time_str.replace("-", ":"),
                            "datetime": f"{date_str} {time_str.replace('-', ':')}"
                        })
        
        frames.sort(key=lambda x: x["filename"])
        return jsonify({"frames": frames, "count": len(frames)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------- RUN DETECTION ON SELECTED FRAMES ----------------
@app.route("/api/detect", methods=["POST"])
def run_detection():
    if "admin" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    
    data = request.get_json()
    selected_frames = data.get("frames", [])
    
    if not selected_frames:
        return jsonify({"error": "No frames selected"}), 400
    
    results = {
        "detected": [],
        "masked": [],
        "unknown": [],
        "siamese_failed": [],
        "no_face": []
    }
    
    attendance_marked = []
    
    for frame_name in selected_frames:
        frame_path = os.path.join(LIVEFRAME_DIR, frame_name)
        if not os.path.exists(frame_path):
            continue
        
        detections = process_frame(frame_path)
        
        if detections is None:
            results["no_face"].append({"filename": frame_name})
        else:
            for det in detections:
                det["source_frame"] = frame_name
                
                if det["status"] == "detected":
                    results["detected"].append(det)
                    
                    # Mark attendance
                    time_str = os.path.splitext(frame_name)[0]  # Remove extension
                    success, msg = mark_attendance(det["name"], time_str)
                    attendance_marked.append({
                        "name": det["name"],
                        "datetime": time_str.replace("_", " ").replace("-", ":", 2),
                        "success": success,
                        "message": msg
                    })
                    
                elif det["status"] == "masked":
                    results["masked"].append(det)
                elif det["status"] == "unknown":
                    results["unknown"].append(det)
                elif det["status"] == "siamese_failed":
                    results["siamese_failed"].append(det)
    
    summary = {
        "total_processed": len(selected_frames),
        "detected_count": len(results["detected"]),
        "masked_count": len(results["masked"]),
        "unknown_count": len(results["unknown"]),
        "siamese_failed_count": len(results["siamese_failed"]),
        "no_face_count": len(results["no_face"]),
        "attendance_marked": len([a for a in attendance_marked if a["success"]])
    }
    
    return jsonify({
        "results": results,
        "summary": summary,
        "attendance": attendance_marked
    })

# ---------------- GET DETECTION HISTORY ----------------
@app.route("/api/detection_history", methods=["GET"])
def detection_history():
    if "admin" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    history = {
        "detected": [],
        "masked": [],
        "unknown": [],
        "siamese_failed": []
    }
    
    folders = {
        "detected": DETECTED_FOLDER,
        "masked": MASKED_FOLDER,
        "unknown": UNKNOWN_FOLDER,
        "siamese_failed": SIAMESE_FAILED_FOLDER
    }
    
    for category, folder in folders.items():
        if os.path.exists(folder):
            for f in os.listdir(folder):
                if f.endswith(('.jpg', '.png', '.jpeg')):
                    history[category].append({
                        "filename": f,
                        "path": f"/static/{os.path.basename(folder)}/{f}"
                    })
    
    return jsonify(history)


@app.route("/detection_images/<folder>/<filename>")
def serve_detection_image(folder, filename):
    if "admin" not in session:
        return "Unauthorized", 401
    
    folder_map = {
        "detected": DETECTED_FOLDER,
        "masked": MASKED_FOLDER,
        "unknown": UNKNOWN_FOLDER,
        "siamese_failed": SIAMESE_FAILED_FOLDER
    }
    
    if folder not in folder_map:
        return "Not found", 404
    
    return send_from_directory(folder_map[folder], filename)


# ===================================================
# ================= ATTENDANCE HELPER ===============
# ===================================================

def mark_attendance(name, detection_time_str):
    """
    Mark attendance for detected person.
    - Stores entries with date and time
    - Skips if last entry was within 15 seconds
    
    detection_time_str format: "12-02-2026_15-43-47"
    
    MongoDB document structure:
    {
        "name": "Sri Krishnan",
        "roll_no": "CS2021001",
        "date": "12-02-2026",
        "entries": [
            {
                "date": "12-02-2026",
                "time": "15:43:47",
                "datetime": "12-02-2026 15:43:47",
                "timestamp": 1707745427
            }
        ]
    }
    """
    try:
        # Parse detection time
        parts = detection_time_str.split("_")
        if len(parts) < 2:
            return False, "Invalid time format"
        
        date_str = parts[0]  # "12-02-2026"
        time_str = parts[1].replace("-", ":")  # "15:43:47"
        datetime_str = f"{date_str} {time_str}"  # "12-02-2026 15:43:47"
        
        # Convert to timestamp for comparison
        dt = datetime.strptime(datetime_str, "%d-%m-%Y %H:%M:%S")
        timestamp = int(dt.timestamp())
        
        # Get student info (roll_no)
        student = students_col.find_one({"name": name})
        roll_no = student.get("roll_no", "Unknown") if student else "Unknown"
        
        # Find existing attendance record for this person on this date
        record = attendance_col.find_one({
            "name": name,
            "date": date_str
        })
        
        entry = {
            "date": date_str,
            "time": time_str,
            "datetime": datetime_str,
            "timestamp": timestamp
        }
        
        if record:
            # Check last entry time
            entries = record.get("entries", [])
            if entries:
                last_timestamp = entries[-1].get("timestamp", 0)
                time_diff = timestamp - last_timestamp
                
                # Skip if within 15 seconds
                if time_diff < 15:
                    return False, f"Skipped (last entry {time_diff}s ago)"
            
            # Add new entry
            attendance_col.update_one(
                {"_id": record["_id"]},
                {"$push": {"entries": entry}}
            )
        else:
            # Create new record for today
            attendance_col.insert_one({
                "name": name,
                "roll_no": roll_no,
                "date": date_str,
                "entries": [entry]
            })
        
        return True, f"Attendance marked at {datetime_str}"
    
    except Exception as e:
        return False, str(e)
    
@app.route("/api/attendance", methods=["GET"])
def get_attendance():
    if "admin" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    date = request.args.get("date")
    name = request.args.get("name")
    
    query = {}
    if date:
        query["date"] = date
    if name:
        query["name"] = name
    
    records = list(attendance_col.find(query, {"_id": 0}))
    return jsonify({"records": records, "count": len(records)})


@app.route("/api/attendance/today", methods=["GET"])
def get_today_attendance():
    if "admin" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    today = datetime.now().strftime("%d-%m-%Y")
    records = list(attendance_col.find({"date": today}, {"_id": 0}))
    
    return jsonify({
        "date": today,
        "records": records,
        "total_persons": len(records),
        "total_entries": sum(len(r.get("entries", [])) for r in records)
    })


# ===================================================
# ================= DAY SCHOLAR MODULE ==============
# ===================================================

@app.route("/api/dayscholars", methods=["GET"])
def get_dayscholars():
    """Get day scholars who have attendance entries"""
    if "admin" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    start_date = request.args.get("start_date")  # Format: 12-02-2026
    end_date = request.args.get("end_date")
    
    # Build date query
    date_query = {}
    if start_date and end_date:
        # Get all dates in range
        from datetime import datetime, timedelta
        start = datetime.strptime(start_date, "%d-%m-%Y")
        end = datetime.strptime(end_date, "%d-%m-%Y")
        dates = []
        current = start
        while current <= end:
            dates.append(current.strftime("%d-%m-%Y"))
            current += timedelta(days=1)
        date_query["date"] = {"$in": dates}
    elif start_date:
        date_query["date"] = start_date
    
    # Get all attendance records
    attendance_records = list(attendance_col.find(date_query, {"_id": 0}))
    
    # Filter for day scholars only
    dayscholar_entries = []
    
    for record in attendance_records:
        name = record.get("name")
        roll_no = record.get("roll_no", "")
        
        # Check if student is day scholar (not hosteller)
        student = students_col.find_one({"name": name})
        if student and student.get("hosteller") == False:
            # Check email status
            email_status = record.get("email_sent", False)
            
            dayscholar_entries.append({
                "name": name,
                "roll_no": roll_no,
                "date": record.get("date"),
                "entries": record.get("entries", []),
                "photo": student.get("photo", ""),
                "email_sent": email_status,
                "entry_count": len(record.get("entries", []))
            })
    
    return jsonify({
        "dayscholars": dayscholar_entries,
        "count": len(dayscholar_entries)
    })


@app.route("/api/dayscholars/send_email", methods=["POST"])
def send_dayscholar_email():
    """Send email notification to day scholar"""
    if "admin" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.get_json()
    roll_no = data.get("roll_no")
    name = data.get("name")
    date = data.get("date")
    entries = data.get("entries", [])
    
    if not roll_no or not name or not date:
        return jsonify({"error": "Missing required fields"}), 400
    
    # Construct email
    email_to = f"{roll_no}@cit.edu.in"
    
    # Format entry times
    entry_times = ", ".join([e.get("time", "") for e in entries])
    
    subject = f"VisionStay Alert: Day Scholar Entry Detected - {date}"
    body = f"""
Dear {name},

Your presence has been detected in the college hostel premises on {date}.

Entry Times: {entry_times}

As a day scholar, you are required to meet the Warden regarding your visit to the hostel area.

Please visit the Warden's office at your earliest convenience.

Regards,
VisionStay Security System
College Administration
    """
    
    try:
        msg = Message(
            subject=subject,
            sender=app.config["MAIL_USERNAME"],
            recipients=[email_to]
        )
        msg.body = body
        mail.send(msg)
        
        # Update email status in attendance record
        attendance_col.update_one(
            {"name": name, "date": date},
            {"$set": {"email_sent": True, "email_sent_at": datetime.now().strftime("%d-%m-%Y %H:%M:%S")}}
        )
        
        return jsonify({
            "success": True,
            "message": f"Email sent to {email_to}"
        })
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/dayscholars/send_all", methods=["POST"])
def send_all_dayscholar_emails():
    """Send emails to all day scholars who haven't been notified"""
    if "admin" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.get_json()
    dayscholars = data.get("dayscholars", [])
    
    sent_count = 0
    failed_count = 0
    results = []
    
    for ds in dayscholars:
        if ds.get("email_sent"):
            continue
        
        roll_no = ds.get("roll_no")
        name = ds.get("name")
        date = ds.get("date")
        entries = ds.get("entries", [])
        
        email_to = f"{roll_no}@cit.edu.in"
        entry_times = ", ".join([e.get("time", "") for e in entries])
        
        subject = f"VisionStay Alert: Day Scholar Entry Detected - {date}"
        body = f"""
Dear {name},

Your presence has been detected in the college hostel premises on {date}.

Entry Times: {entry_times}

As a day scholar, you are required to meet the Warden regarding your visit to the hostel area.

Please visit the Warden's office at your earliest convenience.

Regards,
VisionStay Security System
College Administration
        """
        
        try:
            msg = Message(
                subject=subject,
                sender=app.config["MAIL_USERNAME"],
                recipients=[email_to]
            )
            msg.body = body
            mail.send(msg)
            
            attendance_col.update_one(
                {"name": name, "date": date},
                {"$set": {"email_sent": True, "email_sent_at": datetime.now().strftime("%d-%m-%Y %H:%M:%S")}}
            )
            
            sent_count += 1
            results.append({"name": name, "email": email_to, "status": "sent"})
        
        except Exception as e:
            failed_count += 1
            results.append({"name": name, "email": email_to, "status": "failed", "error": str(e)})
    
    return jsonify({
        "sent": sent_count,
        "failed": failed_count,
        "results": results
    })


# ---------------- ANALYTICS PAGE ----------------
@app.route("/admin/analytics")
def analytics():
    if "admin" not in session:
        return redirect("/")
    return render_template("analytics.html")



# ===================================================
# ================= ANALYTICS API ===================
# ===================================================

@app.route("/api/analytics/stats", methods=["GET"])
def get_analytics_stats():
    """Get overview statistics for the analytics dashboard"""
    if "admin" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    total_students = students_col.count_documents({})
    hostellers = students_col.count_documents({"hosteller": True})
    day_scholars = students_col.count_documents({"hosteller": False})
    
    today = datetime.now().strftime("%d-%m-%Y")
    today_records = list(attendance_col.find({"date": today}))
    entries_today = sum(len(r.get("entries", [])) for r in today_records)
    unique_today = len(today_records)
    
    # Get masked and unknown counts from folders
    masked_count = len(os.listdir(MASKED_FOLDER)) if os.path.exists(MASKED_FOLDER) else 0
    unknown_count = len(os.listdir(UNKNOWN_FOLDER)) if os.path.exists(UNKNOWN_FOLDER) else 0
    
    return jsonify({
        "total_students": total_students,
        "hostellers": hostellers,
        "day_scholars": day_scholars,
        "entries_today": entries_today,
        "unique_persons_today": unique_today,
        "masked_alerts": masked_count,
        "unknown_alerts": unknown_count
    })


@app.route("/api/analytics/attendance_trend", methods=["GET"])
def get_attendance_trend():
    """Get attendance data for the last 7 or 30 days"""
    if "admin" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    days = int(request.args.get("days", 7))
    
    trend_data = []
    for i in range(days - 1, -1, -1):
        date = (datetime.now() - timedelta(days=i)).strftime("%d-%m-%Y")
        records = list(attendance_col.find({"date": date}))
        total_entries = sum(len(r.get("entries", [])) for r in records)
        unique_persons = len(records)
        
        trend_data.append({
            "date": date,
            "total_entries": total_entries,
            "unique_persons": unique_persons
        })
    
    return jsonify({"trend": trend_data, "days": days})


@app.route("/api/analytics/hourly_distribution", methods=["GET"])
def get_hourly_distribution():
    """Get entry distribution by hour for a given date"""
    if "admin" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    date = request.args.get("date", datetime.now().strftime("%d-%m-%Y"))
    
    # Initialize hourly buckets
    hourly = {str(h).zfill(2): 0 for h in range(24)}
    
    records = list(attendance_col.find({"date": date}))
    for record in records:
        for entry in record.get("entries", []):
            time_str = entry.get("time", "")
            if time_str:
                hour = time_str.split(":")[0]
                if hour in hourly:
                    hourly[hour] += 1
    
    return jsonify({
        "date": date,
        "distribution": hourly,
        "labels": list(hourly.keys()),
        "values": list(hourly.values())
    })


@app.route("/api/analytics/attendance_table", methods=["GET"])
def get_attendance_table():
    """Get detailed attendance records with filtering"""
    if "admin" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    # Filter parameters
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    student_name = request.args.get("name")
    student_type = request.args.get("type")  # 'hosteller', 'dayscholar', or 'all'
    
    query = {}
    
    # Date range filter
    if start_date and end_date:
        start = datetime.strptime(start_date, "%d-%m-%Y")
        end = datetime.strptime(end_date, "%d-%m-%Y")
        dates = []
        current = start
        while current <= end:
            dates.append(current.strftime("%d-%m-%Y"))
            current += timedelta(days=1)
        query["date"] = {"$in": dates}
    elif start_date:
        query["date"] = start_date
    
    # Name filter
    if student_name:
        query["name"] = {"$regex": student_name, "$options": "i"}
    
    records = list(attendance_col.find(query, {"_id": 0}).sort("date", -1))
    
    # Enrich with student data and filter by type
    enriched_records = []
    for record in records:
        student = students_col.find_one({"name": record.get("name")})
        is_hosteller = student.get("hosteller", False) if student else False
        
        # Filter by student type
        if student_type == "hosteller" and not is_hosteller:
            continue
        if student_type == "dayscholar" and is_hosteller:
            continue
        
        enriched_records.append({
            "name": record.get("name"),
            "roll_no": record.get("roll_no"),
            "date": record.get("date"),
            "entry_count": len(record.get("entries", [])),
            "entries": record.get("entries", []),
            "is_hosteller": is_hosteller,
            "course": student.get("course", "N/A") if student else "N/A",
            "year": student.get("year", "N/A") if student else "N/A"
        })
    
    return jsonify({
        "records": enriched_records,
        "count": len(enriched_records)
    })


@app.route("/api/analytics/top_visitors", methods=["GET"])
def get_top_visitors():
    """Get students with most entries in a date range"""
    if "admin" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    days = int(request.args.get("days", 7))
    limit = int(request.args.get("limit", 10))
    
    # Get dates
    dates = []
    for i in range(days):
        date = (datetime.now() - timedelta(days=i)).strftime("%d-%m-%Y")
        dates.append(date)
    
    # Aggregate entries by person
    records = list(attendance_col.find({"date": {"$in": dates}}))
    visitor_counts = {}
    
    for record in records:
        name = record.get("name")
        count = len(record.get("entries", []))
        visitor_counts[name] = visitor_counts.get(name, 0) + count
    
    # Sort and limit
    sorted_visitors = sorted(visitor_counts.items(), key=lambda x: x[1], reverse=True)[:limit]
    
    return jsonify({
        "top_visitors": [{"name": v[0], "entries": v[1]} for v in sorted_visitors],
        "days": days
    })



# ===================================================
# ================= AI BOT MODULE ===================
# ===================================================
import requests

@app.route("/admin/bot")
def bot_page():
    if "admin" not in session:
        return redirect("/")
    return render_template("bots.html")


@app.route("/api/bot/chat", methods=["POST"])
def bot_chat():
    """Process chat message using Groq API with context from MongoDB"""
    if "admin" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.get_json()
    user_message = data.get("message", "")
    
    if not user_message:
        return jsonify({"error": "No message provided"}), 400
    
    # Gather context from MongoDB
    context = gather_data_context()
    
    # Build the prompt
    system_prompt = f"""You are VisionStay AI Assistant, a helpful assistant for a hostel security and attendance management system.
You have access to the following data about the hostel:

{context}

Answer questions based on this data. Be concise, helpful, and accurate. If the data doesn't contain the answer, say so politely.
Format your responses nicely with bullet points when listing items. Use numbers when appropriate."""

    try:
        groq_api_key = os.getenv("GROQ_API_KEY")
        
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {groq_api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "llama-3.1-8b-instant",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                "temperature": 0.7,
                "max_tokens": 1024
            },
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            bot_reply = result["choices"][0]["message"]["content"]
            return jsonify({"reply": bot_reply, "success": True})
        else:
            return jsonify({"error": f"Groq API error: {response.status_code}", "success": False}), 500
            
    except Exception as e:
        return jsonify({"error": str(e), "success": False}), 500


def gather_data_context():
    """Gather relevant data from MongoDB for the AI context"""
    
    # Student statistics
    total_students = students_col.count_documents({})
    hostellers = students_col.count_documents({"hosteller": True})
    day_scholars = students_col.count_documents({"hosteller": False})
    
    # Get all students list
    students_list = list(students_col.find({}, {"_id": 0, "name": 1, "roll_no": 1, "course": 1, "year": 1, "hosteller": 1}))
    
    # Today's attendance
    today = datetime.now().strftime("%d-%m-%Y")
    today_attendance = list(attendance_col.find({"date": today}, {"_id": 0}))
    today_entries = sum(len(r.get("entries", [])) for r in today_attendance)
    today_unique = len(today_attendance)
    
    # Last 7 days attendance summary
    weekly_summary = []
    for i in range(7):
        date = (datetime.now() - timedelta(days=i)).strftime("%d-%m-%Y")
        records = list(attendance_col.find({"date": date}))
        entries = sum(len(r.get("entries", [])) for r in records)
        unique = len(records)
        weekly_summary.append(f"{date}: {unique} persons, {entries} entries")
    
    # Day scholars who entered hostel (last 7 days)
    ds_entries = []
    for i in range(7):
        date = (datetime.now() - timedelta(days=i)).strftime("%d-%m-%Y")
        records = list(attendance_col.find({"date": date}))
        for r in records:
            student = students_col.find_one({"name": r.get("name")})
            if student and student.get("hosteller") == False:
                ds_entries.append(f"{r.get('name')} on {date} ({len(r.get('entries', []))} entries)")
    
    # Course-wise breakdown
    courses = students_col.distinct("course")
    course_breakdown = []
    for course in courses:
        count = students_col.count_documents({"course": course})
        course_breakdown.append(f"{course}: {count} students")
    
    # Year-wise breakdown
    years = students_col.distinct("year")
    year_breakdown = []
    for year in years:
        count = students_col.count_documents({"year": year})
        year_breakdown.append(f"Year {year}: {count} students")
    
    # Frequent visitors (most entries in last 7 days)
    all_recent_attendance = []
    for i in range(7):
        date = (datetime.now() - timedelta(days=i)).strftime("%d-%m-%Y")
        all_recent_attendance.extend(list(attendance_col.find({"date": date})))
    
    visitor_counts = {}
    for record in all_recent_attendance:
        name = record.get("name")
        count = len(record.get("entries", []))
        visitor_counts[name] = visitor_counts.get(name, 0) + count
    
    top_visitors = sorted(visitor_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    top_visitors_str = [f"{v[0]}: {v[1]} entries" for v in top_visitors]
    
    # Build context string
    context = f"""
=== STUDENT STATISTICS ===
- Total Students: {total_students}
- Hostellers: {hostellers}
- Day Scholars: {day_scholars}

=== STUDENT LIST ===
{chr(10).join([f"- {s['name']} ({s['roll_no']}) - {s['course']} Year {s['year']} - {'Hosteller' if s['hosteller'] else 'Day Scholar'}" for s in students_list[:50]])}

=== TODAY'S ATTENDANCE ({today}) ===
- Unique persons: {today_unique}
- Total entries: {today_entries}
- Names: {', '.join([r.get('name') for r in today_attendance]) if today_attendance else 'No entries yet'}

=== LAST 7 DAYS ATTENDANCE ===
{chr(10).join(weekly_summary)}

=== DAY SCHOLARS WHO ENTERED HOSTEL (Last 7 Days) ===
{chr(10).join(ds_entries) if ds_entries else 'No day scholar entries detected'}

=== COURSE-WISE BREAKDOWN ===
{chr(10).join(course_breakdown)}

=== YEAR-WISE BREAKDOWN ===
{chr(10).join(year_breakdown)}

=== TOP VISITORS (Last 7 Days - Most Entries) ===
{chr(10).join(top_visitors_str) if top_visitors_str else 'No data available'}
"""
    
    return context


@app.route("/api/bot/quick_stats", methods=["GET"])
def bot_quick_stats():
    """Get quick stats for display in bot interface"""
    if "admin" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    total_students = students_col.count_documents({})
    hostellers = students_col.count_documents({"hosteller": True})
    day_scholars = students_col.count_documents({"hosteller": False})
    
    today = datetime.now().strftime("%d-%m-%Y")
    today_records = list(attendance_col.find({"date": today}))
    today_entries = sum(len(r.get("entries", [])) for r in today_records)
    
    return jsonify({
        "total_students": total_students,
        "hostellers": hostellers,
        "day_scholars": day_scholars,
        "today_entries": today_entries
    })

# ===================================================
# ================= STUDENT ANALYTICS API ===========
# ===================================================

@app.route("/api/student/profile", methods=["GET"])
def get_student_profile():
    """Get logged-in student's profile"""
    if "student" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    student = students_col.find_one({"roll_no": session["student"]}, {"_id": 0})
    if not student:
        return jsonify({"error": "Student not found"}), 404
    
    return jsonify(student)


@app.route("/api/student/attendance", methods=["GET"])
def get_student_attendance():
    """Get logged-in student's attendance records"""
    if "student" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    student = students_col.find_one({"roll_no": session["student"]})
    if not student:
        return jsonify({"error": "Student not found"}), 404
    
    name = student.get("name")
    records = list(attendance_col.find({"name": name}, {"_id": 0}).sort("date", -1))
    
    return jsonify({
        "records": records,
        "total_days": len(records),
        "total_entries": sum(len(r.get("entries", [])) for r in records)
    })


@app.route("/api/student/attendance_trend", methods=["GET"])
def get_student_attendance_trend():
    """Get student's attendance trend for last N days"""
    if "student" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    student = students_col.find_one({"roll_no": session["student"]})
    if not student:
        return jsonify({"error": "Student not found"}), 404
    
    name = student.get("name")
    days = int(request.args.get("days", 7))
    
    trend_data = []
    for i in range(days - 1, -1, -1):
        date = (datetime.now() - timedelta(days=i)).strftime("%d-%m-%Y")
        record = attendance_col.find_one({"name": name, "date": date})
        entries = len(record.get("entries", [])) if record else 0
        
        trend_data.append({
            "date": date,
            "entries": entries,
            "present": 1 if record else 0
        })
    
    return jsonify({"trend": trend_data, "days": days})


@app.route("/api/student/stats", methods=["GET"])
def get_student_stats():
    """Get student's attendance statistics"""
    if "student" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    student = students_col.find_one({"roll_no": session["student"]})
    if not student:
        return jsonify({"error": "Student not found"}), 404
    
    name = student.get("name")
    
    # All attendance records for this student
    all_records = list(attendance_col.find({"name": name}))
    total_days_present = len(all_records)
    total_entries = sum(len(r.get("entries", [])) for r in all_records)
    
    # Today's data
    today = datetime.now().strftime("%d-%m-%Y")
    today_record = attendance_col.find_one({"name": name, "date": today})
    entries_today = len(today_record.get("entries", [])) if today_record else 0
    
    # This week's data (last 7 days)
    week_present = 0
    for i in range(7):
        date = (datetime.now() - timedelta(days=i)).strftime("%d-%m-%Y")
        if attendance_col.find_one({"name": name, "date": date}):
            week_present += 1
    
    # This month's data
    month_present = 0
    current_month = datetime.now().strftime("-%m-%Y")
    for record in all_records:
        if current_month in record.get("date", ""):
            month_present += 1
    
    # Get hourly distribution for today
    hourly_data = [0] * 24
    if today_record:
        for entry in today_record.get("entries", []):
            time_str = entry.get("time", "00:00:00")
            hour = int(time_str.split(":")[0])
            hourly_data[hour] += 1
    
    return jsonify({
        "total_days_present": total_days_present,
        "total_entries": total_entries,
        "entries_today": entries_today,
        "week_present": week_present,
        "month_present": month_present,
        "hourly_today": hourly_data,
        "attendance_percentage": round((week_present / 7) * 100, 1)
    })
    
# ===================================================
# ================= RUN APP =========================
# ===================================================




if __name__ == "__main__":
    app.run(debug=True, use_reloader=False, threaded=True)
