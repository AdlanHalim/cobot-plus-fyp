"""
CObot+ Face Recognition Attendance System - Automatic Mode
==========================================================
Raspberry Pi Flask server for face recognition attendance tracking.

Features:
- 24/7 automatic attendance based on section_schedules
- Automatic present/late detection based on arrival time
- Window: start -15min, late +15min after start, stop at end -15min
"""

import os
import cv2
import numpy as np
import threading
import queue
import time
import datetime
import signal
import atexit
from functools import wraps, lru_cache
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from supabase import create_client
import face_recognition

# --- INITIALIZATION ---
load_dotenv()
app = Flask(__name__)

# --- CONFIGURATION ---
CONFIG = {
    # Security
    "ALLOWED_ORIGINS": os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(","),
    "API_SECRET_KEY": os.getenv("API_SECRET_KEY", ""),
    
    # Attendance Timing (in minutes)
    "EARLY_WINDOW_MINUTES": 15,    # Start taking attendance 15 min before class
    "LATE_GRACE_MINUTES": 15,      # 15 min after start = late
    "END_BUFFER_MINUTES": 15,      # Stop 15 min before end (prepare for next class)
    
    # Face Recognition
    "FACE_TOLERANCE": float(os.getenv("FACE_TOLERANCE", "0.6")),
    "FRAME_SCALE": float(os.getenv("FRAME_SCALE", "0.2")),
    "PROCESS_EVERY_N_FRAMES": int(os.getenv("PROCESS_EVERY_N", "5")),
    
    # Directories
    "KNOWN_FACES_DIR": os.getenv("KNOWN_FACES_DIR", "known_faces"),
    "UPLOADS_DIR": os.getenv("UPLOADS_DIR", "uploads"),
    
    # Cache
    "WINDOW_CHECK_INTERVAL": 30,  # Check attendance window every 30 seconds
    
    # Camera
    "CAMERA_INDEX": int(os.getenv("CAMERA_INDEX", "0")),
    "CAMERA_FPS": 30,
    "MAX_CAMERA_RETRIES": 5,
}

# --- CORS Configuration ---
CORS(app, resources={
    r"/*": {
        "origins": CONFIG["ALLOWED_ORIGINS"],
        "supports_credentials": True
    }
})

# --- SUPABASE INIT ---
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

supabase = None
try:
    if not supabase_url or not supabase_key:
        raise ValueError("SUPABASE_URL or SUPABASE_KEY missing in .env")
    supabase = create_client(supabase_url, supabase_key)
    print("[OK] Supabase client initialized.")
except Exception as e:
    print(f"[ERROR] Supabase init failed: {e}")
    supabase = None

# --- GLOBAL STATE ---
frame_lock = threading.Lock()
latest_frame = None
known_face_encodings = []
known_face_names = []
camera = None
lock = threading.Lock()

# Automatic mode state
current_attendance_window = None  # Dict with section info + timing
last_window_check = 0
is_streaming = True
shutdown_event = threading.Event()

# Attendance tracking
attendance_logged_today = {}  # {section_id: set(matric_nos)}

# Face processing
face_queue = queue.Queue(maxsize=3)
detected_faces = []


# --- DECORATORS ---
def require_api_key(f):
    """Decorator to require API key for sensitive endpoints."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not CONFIG["API_SECRET_KEY"]:
            return f(*args, **kwargs)
        api_key = request.headers.get("X-API-Key")
        if api_key != CONFIG["API_SECRET_KEY"]:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated


# --- TIME HELPERS ---
def time_to_minutes(t):
    """Convert time object to minutes since midnight."""
    return t.hour * 60 + t.minute

def parse_time_string(time_str):
    """Parse HH:MM:SS string to time object."""
    parts = time_str.split(":")
    return datetime.time(int(parts[0]), int(parts[1]), int(parts[2]) if len(parts) > 2 else 0)


# --- AUTOMATIC ATTENDANCE WINDOW ---
def get_current_attendance_window():
    """
    Detect if we're currently in an attendance window based on section_schedules.
    Returns window info with present/late status, or None if no active window.
    
    Window logic:
    - START: start_time - 15 min (begin taking attendance)
    - LATE:  start_time + 15 min (after this = late)
    - END:   end_time - 15 min (stop to prepare for next class)
    """
    global current_attendance_window, last_window_check
    
    now = time.time()
    if now - last_window_check < CONFIG["WINDOW_CHECK_INTERVAL"]:
        return current_attendance_window
    
    last_window_check = now
    
    if not supabase:
        current_attendance_window = None
        return None
    
    try:
        current_datetime = datetime.datetime.now()
        current_day = current_datetime.strftime("%A")
        current_time = current_datetime.time()
        current_minutes = time_to_minutes(current_time)
        
        # Fetch all schedules for today
        query = (
            supabase.table("section_schedules")
            .select("section_id, start_time, end_time, sections(course_id, name)")
            .eq("day_of_week", current_day)
            .execute()
        )
        
        if not query.data:
            current_attendance_window = None
            return None
        
        for schedule in query.data:
            start_time = parse_time_string(schedule["start_time"])
            end_time = parse_time_string(schedule["end_time"])
            
            start_minutes = time_to_minutes(start_time)
            end_minutes = time_to_minutes(end_time)
            
            # Calculate window boundaries
            window_start = start_minutes - CONFIG["EARLY_WINDOW_MINUTES"]  # 15 min before
            late_cutoff = start_minutes + CONFIG["LATE_GRACE_MINUTES"]     # 15 min after start
            window_end = end_minutes - CONFIG["END_BUFFER_MINUTES"]        # 15 min before end
            
            # Check if current time is within this window
            if window_start <= current_minutes <= window_end:
                is_late = current_minutes > late_cutoff
                
                current_attendance_window = {
                    "section_id": schedule["section_id"],
                    "course_id": schedule["sections"]["course_id"],
                    "section_name": schedule["sections"]["name"],
                    "start_time": schedule["start_time"],
                    "end_time": schedule["end_time"],
                    "is_late": is_late,
                    "window_start": f"{window_start // 60:02d}:{window_start % 60:02d}",
                    "late_cutoff": f"{late_cutoff // 60:02d}:{late_cutoff % 60:02d}",
                    "window_end": f"{window_end // 60:02d}:{window_end % 60:02d}",
                    "status": "late" if is_late else "present"
                }
                
                print(f"[WINDOW] Active: {schedule['sections']['name']} | Status: {'LATE' if is_late else 'PRESENT'}")
                return current_attendance_window
        
        # No matching window found
        if current_attendance_window is not None:
            print("[WINDOW] No active attendance window")
        current_attendance_window = None
        return None
        
    except Exception as e:
        print(f"[ERROR] Window detection: {e}")
        current_attendance_window = None
        return None


# --- HELPERS ---
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg'}


def load_faces():
    """Load known face encodings from disk."""
    global known_face_encodings, known_face_names
    known_face_encodings.clear()
    known_face_names.clear()

    os.makedirs(CONFIG["KNOWN_FACES_DIR"], exist_ok=True)
    print(f"[INFO] Loading faces from {CONFIG['KNOWN_FACES_DIR']}...")

    for filename in os.listdir(CONFIG["KNOWN_FACES_DIR"]):
        if filename.lower().endswith((".jpg", ".jpeg", ".png")):
            name = os.path.splitext(filename)[0]
            path = os.path.join(CONFIG["KNOWN_FACES_DIR"], filename)
            try:
                image = face_recognition.load_image_file(path)
                encodings = face_recognition.face_encodings(image)
                if encodings:
                    known_face_encodings.append(encodings[0])
                    known_face_names.append(name)
                    print(f"  - Loaded: {name}")
            except Exception as e:
                print(f"  - Error loading {path}: {e}")

    print(f"[OK] Total known faces: {len(known_face_names)}")


@lru_cache(maxsize=500)
def get_student_cached(matric_no):
    """Cached student lookup."""
    if not supabase:
        return None
    try:
        resp = supabase.table("students").select("id, nickname").eq("matric_no", matric_no).execute()
        return resp.data[0] if resp.data else None
    except Exception as e:
        print(f"[WARN] Student lookup failed for {matric_no}: {e}")
        return None


def get_or_create_class_session(section_id, start_time_str=None):
    """Find or create today's class session."""
    if not supabase:
        return None
        
    today = datetime.date.today().isoformat()
    try:
        res = (
            supabase.table("class_sessions")
            .select("*")
            .eq("section_id", section_id)
            .eq("class_date", today)
            .execute()
        )
        if res.data:
            return res.data[0]["id"]

        session_id = f"session_{section_id}_{today}"
        supabase.table("class_sessions").insert({
            "id": session_id,
            "section_id": section_id,
            "class_date": today,
            "start_time": start_time_str or datetime.datetime.now().time().isoformat(),
            "status": "active"
        }).execute()
        print(f"[SESSION] Auto-created: {session_id}")
        return session_id
    except Exception as e:
        print(f"[ERROR] Session creation: {e}")
        return None


def log_attendance(student_matric, status="present"):
    """Insert attendance record with automatic present/late detection."""
    global supabase, current_attendance_window, attendance_logged_today

    window = current_attendance_window
    if not window or not supabase:
        return False

    section_id = window["section_id"]
    
    # Check if already logged for this section today
    if section_id not in attendance_logged_today:
        attendance_logged_today[section_id] = set()
    
    if student_matric in attendance_logged_today[section_id]:
        return False

    try:
        student = get_student_cached(student_matric)
        if not student:
            return False

        student_id = student["id"]
        course_id = window["course_id"]

        # Check enrollment
        enroll_check = (
            supabase.table("student_section_enrollments")
            .select("id")
            .eq("student_id", student_id)
            .eq("section_id", section_id)
            .limit(1)
            .execute()
        )
        if not enroll_check.data:
            return False

        # Get or create session
        class_session_id = get_or_create_class_session(section_id, window.get("start_time"))
        if not class_session_id:
            return False

        today_date = datetime.datetime.utcnow().date().isoformat()

        # Check if already in DB
        existing = (
            supabase.table("attendance_records")
            .select("id")
            .eq("student_id", student_id)
            .eq("class_session_id", class_session_id)
            .limit(1)
            .execute()
        )

        if existing.data:
            attendance_logged_today[section_id].add(student_matric)
            return False

        # Use the status from window (present or late)
        attendance_status = window.get("status", "present")

        # Insert attendance
        payload = {
            "id": f"att_{student_id}_{class_session_id}_{today_date}",
            "student_id": student_id,
            "class_session_id": class_session_id,
            "status": attendance_status,
            "timestamp": datetime.datetime.utcnow().isoformat()
        }
        supabase.table("attendance_records").insert(payload).execute()

        # Ensure student_course_attendance row exists
        course_attendance_res = (
            supabase.table("student_course_attendance")
            .select("id")
            .eq("student_id", student_id)
            .eq("course_id", course_id)
            .limit(1)
            .execute()
        )

        if not course_attendance_res.data:
            supabase.table("student_course_attendance").insert({
                "student_id": student_id,
                "course_id": course_id,
                "absence_count": 0
            }).execute()

        attendance_logged_today[section_id].add(student_matric)
        status_icon = "LATE" if attendance_status == "late" else "OK"
        print(f"[{status_icon}] {student_matric} -> {window['section_name']}")
        return True

    except Exception as e:
        print(f"[ERROR] Attendance log: {e}")
        return False


# --- BACKGROUND FACE RECOGNITION ---
def face_recognition_worker():
    """Background thread for face recognition."""
    global detected_faces
    
    while not shutdown_event.is_set():
        try:
            frame = face_queue.get(timeout=1)
            if frame is None:
                continue
            
            # Get current window (uses cache)
            window = get_current_attendance_window()
            
            small_frame = cv2.resize(frame, (0, 0), 
                                     fx=CONFIG["FRAME_SCALE"], 
                                     fy=CONFIG["FRAME_SCALE"])
            rgb_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
            
            face_locations = face_recognition.face_locations(rgb_frame)
            face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)
            
            results = []
            for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
                matches = face_recognition.compare_faces(
                    known_face_encodings, face_encoding, 
                    tolerance=CONFIG["FACE_TOLERANCE"]
                )
                face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)
                
                name = "Unknown"
                if len(face_distances) > 0:
                    best_match_index = np.argmin(face_distances)
                    if matches[best_match_index] and face_distances[best_match_index] < CONFIG["FACE_TOLERANCE"]:
                        name = known_face_names[best_match_index]
                        
                        # Log attendance if window is active
                        if name != "Unknown" and window:
                            log_attendance(name)
                
                scale = 1 / CONFIG["FRAME_SCALE"]
                results.append({
                    "name": name,
                    "box": (int(top * scale), int(right * scale), 
                           int(bottom * scale), int(left * scale))
                })
            
            detected_faces = results
            face_queue.task_done()
            
        except queue.Empty:
            continue
        except Exception as e:
            print(f"[ERROR] Face recognition: {e}")


# --- CAMERA FUNCTIONS ---
frame_counter = 0

def generate_frames():
    """Video stream generator with automatic attendance."""
    global latest_frame, detected_faces, is_streaming, frame_counter

    while not shutdown_event.is_set():
        with frame_lock:
            if latest_frame is None:
                time.sleep(0.03)
                continue
            frame = latest_frame.copy()

        # Check attendance window (cached, runs every 30s)
        window = get_current_attendance_window()

        if not is_streaming:
            ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            if ret:
                yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            time.sleep(0.1)
            continue

        frame_counter += 1

        # Process face recognition if window is active
        if window and frame_counter % CONFIG["PROCESS_EVERY_N_FRAMES"] == 0:
            try:
                if not face_queue.full():
                    face_queue.put_nowait(frame.copy())
            except queue.Full:
                pass

        # Draw window status on frame
        if window:
            status_text = f"Recording: {window['section_name']} | {window['status'].upper()}"
            color = (0, 165, 255) if window['status'] == 'late' else (0, 255, 0)
            cv2.putText(frame, status_text, (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
        else:
            cv2.putText(frame, "No active class", (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (128, 128, 128), 2)

        # Draw detected faces
        for face in detected_faces:
            top, right, bottom, left = face["box"]
            name = face["name"]
            
            display_name = name
            student = get_student_cached(name) if name != "Unknown" else None
            if student:
                display_name = student.get("nickname", name)
            
            color = (0, 255, 0) if name != "Unknown" else (0, 0, 255)
            cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
            cv2.putText(frame, display_name, (left + 6, bottom - 6),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)

        ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        if ret:
            yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')


def capture_frames():
    """Capture camera frames with reconnection."""
    global latest_frame, camera
    retry_count = 0

    while not shutdown_event.is_set() and retry_count < CONFIG["MAX_CAMERA_RETRIES"]:
        try:
            camera = cv2.VideoCapture(CONFIG["CAMERA_INDEX"])
            camera.set(cv2.CAP_PROP_FPS, CONFIG["CAMERA_FPS"])
            camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            
            if not camera.isOpened():
                retry_count += 1
                print(f"[WARN] Camera failed, retry {retry_count}/{CONFIG['MAX_CAMERA_RETRIES']}...")
                time.sleep(2)
                continue

            print("[OK] Camera started.")
            retry_count = 0

            while not shutdown_event.is_set():
                success, frame = camera.read()
                if not success:
                    print("[WARN] Frame capture failed, reconnecting...")
                    break
                with frame_lock:
                    latest_frame = frame
                time.sleep(1 / CONFIG["CAMERA_FPS"])

        except Exception as e:
            print(f"[ERROR] Camera: {e}")
            retry_count += 1
        finally:
            if camera and camera.isOpened():
                camera.release()
            time.sleep(1)

    print("[WARN] Camera capture stopped")


# --- API ENDPOINTS ---
@app.route("/video")
def video():
    return Response(generate_frames(), mimetype="multipart/x-mixed-replace; boundary=frame")


@app.route("/health", methods=["GET"])
def health_check():
    """Health check with automatic mode info."""
    window = current_attendance_window
    return jsonify({
        "status": "ok",
        "mode": "automatic",
        "camera": camera is not None and camera.isOpened(),
        "supabase": supabase is not None,
        "known_faces": len(known_face_names),
        "is_streaming": is_streaming,
        "attendance_window": {
            "active": window is not None,
            "section": window["section_name"] if window else None,
            "status": window["status"] if window else None,
            "window_start": window["window_start"] if window else None,
            "late_cutoff": window["late_cutoff"] if window else None,
            "window_end": window["window_end"] if window else None,
        } if window else {"active": False}
    })


@app.route("/api/current-class", methods=["GET"])
def api_current_class():
    """Return current attendance window info."""
    try:
        window = get_current_attendance_window()
        
        if not window:
            return jsonify({"activeClass": None, "mode": "automatic"}), 200

        course_name = "Unknown Course"
        if window.get("course_id") and supabase:
            course_res = supabase.table("courses").select("name").eq("id", window["course_id"]).execute()
            if course_res.data:
                course_name = course_res.data[0]["name"]

        return jsonify({
            "activeClass": {
                "section_id": window["section_id"],
                "name": window["section_name"],
                "course_id": window["course_id"],
                "courseName": course_name,
                "status": window["status"],
                "window_start": window["window_start"],
                "late_cutoff": window["late_cutoff"],
                "window_end": window["window_end"],
            },
            "mode": "automatic"
        }), 200

    except Exception as e:
        print(f"[ERROR] /api/current-class: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/attendance-records", methods=["GET"])
def get_attendance_records():
    """Fetch attendance records for current window's section."""
    if not supabase:
        return jsonify({"error": "Supabase not initialized"}), 500

    try:
        window = get_current_attendance_window()
        if not window:
            return jsonify({"attendance": [], "mode": "automatic"}), 200

        section_id = window["section_id"]
        today = datetime.date.today().isoformat()

        class_session_res = (
            supabase.table("class_sessions")
            .select("id")
            .eq("section_id", section_id)
            .eq("class_date", today)
            .limit(1)
            .execute()
        )
        if not class_session_res.data:
            return jsonify({"attendance": [], "mode": "automatic"}), 200

        class_session_id = class_session_res.data[0]["id"]

        records_res = (
            supabase.table("attendance_records")
            .select("id, status, timestamp, student_id")
            .eq("class_session_id", class_session_id)
            .order("timestamp", desc=True)
            .execute()
        )

        if not records_res.data:
            return jsonify({"attendance": [], "mode": "automatic"}), 200

        student_ids = list(set([r["student_id"] for r in records_res.data]))
        students_res = (
            supabase.table("students")
            .select("id, matric_no, nickname, name")
            .in_("id", student_ids)
            .execute()
        )
        student_map = {s["id"]: s for s in students_res.data}

        combined_records = []
        for rec in records_res.data:
            s = student_map.get(rec["student_id"], {})
            combined_records.append({
                "id": rec["id"],
                "status": rec["status"],
                "timestamp": rec["timestamp"],
                "student_id": rec["student_id"],
                "student": {
                    "matric_no": s.get("matric_no", "-"),
                    "nickname": s.get("nickname") or s.get("name", "-"),
                    "name": s.get("name", "-")
                }
            })

        return jsonify({"attendance": combined_records, "mode": "automatic"}), 200

    except Exception as e:
        print(f"[ERROR] /api/attendance-records: {e}")
        return jsonify({"error": str(e)}), 500


# Legacy endpoints (kept for compatibility, but not needed in auto mode)
@app.route("/api/start-class", methods=["POST"])
@require_api_key
def start_class():
    """Legacy endpoint - system is now automatic."""
    return jsonify({
        "message": "System is in automatic mode. Attendance is taken automatically based on schedules.",
        "mode": "automatic"
    })


@app.route("/api/end-class", methods=["POST"])
@require_api_key
def end_class():
    """Legacy endpoint - system is now automatic."""
    return jsonify({
        "message": "System is in automatic mode. Sessions end automatically based on schedules.",
        "mode": "automatic"
    })


@app.route("/api/pause-stream", methods=["POST"])
@require_api_key
def pause_stream():
    global is_streaming
    with lock:
        is_streaming = False
    print("[STREAM] Paused")
    return jsonify({"message": "Stream paused"})


@app.route("/api/resume-stream", methods=["POST"])
@require_api_key
def resume_stream():
    global is_streaming
    with lock:
        is_streaming = True
    print("[STREAM] Resumed")
    return jsonify({"message": "Stream resumed"})


@app.route("/api/reconnect", methods=["POST"])
@require_api_key
def reconnect():
    load_faces()
    get_student_cached.cache_clear()
    print("[RELOAD] Faces reloaded")
    return jsonify({"message": "Reconnected and reloaded faces", "count": len(known_face_names)})


@app.route("/upload-image", methods=["POST"])
@require_api_key
def upload_image():
    global known_face_encodings, known_face_names

    if "image" not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    file = request.files["image"]
    if file.filename == "" or not allowed_file(file.filename):
        return jsonify({"error": "Invalid file format. Use JPG/PNG only"}), 400

    student_name = os.path.splitext(file.filename)[0].strip()
    save_path = os.path.join(CONFIG["KNOWN_FACES_DIR"], file.filename)
    os.makedirs(CONFIG["KNOWN_FACES_DIR"], exist_ok=True)

    try:
        file.save(save_path)
        image = face_recognition.load_image_file(save_path)
        encodings = face_recognition.face_encodings(image)

        if not encodings:
            os.remove(save_path)
            return jsonify({"error": "No recognizable face detected"}), 400

        known_face_encodings.append(encodings[0])
        known_face_names.append(student_name)

        print(f"[FACE] Added: {student_name}")
        return jsonify({"message": f"Face registered for {student_name}"}), 200

    except Exception as e:
        print(f"[ERROR] Upload: {e}")
        return jsonify({"error": str(e)}), 500


# --- SHUTDOWN ---
def signal_handler(sig, frame):
    print("\n[SHUTDOWN] Graceful shutdown...")
    shutdown_event.set()
    try:
        face_queue.put(None)
    except:
        pass

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)


@atexit.register
def cleanup():
    global camera
    shutdown_event.set()
    if camera and camera.isOpened():
        camera.release()
        print("[CLEANUP] Camera released")


# --- MAIN ---
if __name__ == "__main__":
    os.makedirs(CONFIG["KNOWN_FACES_DIR"], exist_ok=True)
    os.makedirs(CONFIG["UPLOADS_DIR"], exist_ok=True)
    
    load_faces()
    
    threading.Thread(target=capture_frames, daemon=True).start()
    threading.Thread(target=face_recognition_worker, daemon=True).start()
    
    print("=" * 60)
    print("CObot+ Face Recognition Server - AUTOMATIC MODE")
    print("=" * 60)
    print(f"  Known faces: {len(known_face_names)}")
    print(f"  Early window: {CONFIG['EARLY_WINDOW_MINUTES']} min before start")
    print(f"  Late after: {CONFIG['LATE_GRACE_MINUTES']} min past start")
    print(f"  End buffer: {CONFIG['END_BUFFER_MINUTES']} min before end")
    print(f"  Allowed origins: {CONFIG['ALLOWED_ORIGINS']}")
    print("=" * 60)
    print("[OK] Server running at http://0.0.0.0:5000")
    print("[AUTO] Attendance is automatic based on section_schedules")
    
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)
