# CObot+ Page-by-Page Documentation

A comprehensive guide for developers explaining every page, its features, functions, related hooks, and backend integration.

---

## Table of Contents

1. [Authentication Pages](#authentication-pages)
   - [Login](#1-login-page)
   - [Signup](#2-signup-page)
   - [Unauthorized](#3-unauthorized-page)
2. [Dashboard & Monitoring](#dashboard--monitoring)
   - [Dashboard (Home)](#4-dashboard-home-page)
   - [Student View](#5-student-view-page)
3. [Analytics & Reports](#analytics--reports)
   - [Analysis](#6-analysis-page)
4. [Management Pages](#management-pages)
   - [Manage Excuses](#7-manage-excuses-page)
   - [Manage Students](#8-manage-students-page)
   - [Add Student](#9-add-student-page)
   - [Manage Courses](#10-manage-courses-page)
   - [Manage Roles](#11-manage-roles-page)
5. [Utility Pages](#utility-pages)
   - [Settings](#12-settings-page)
   - [Submit Excuse](#13-submit-excuse-page)

---

# Authentication Pages

## 1. Login Page

**File:** `pages/login.js`  
**Route:** `/login`  
**Access:** Public (unauthenticated users)

### Purpose
Authenticates users and redirects them based on their role (student → student-view, others → dashboard).

### Features
| Feature | Description |
|---------|-------------|
| Email/Password Login | Standard credential-based authentication |
| Role-Based Redirect | Students go to `/student-view`, lecturers/admins to `/` |
| Error Handling | Displays authentication errors |
| Loading State | Shows spinner during login |

### Tech Stack
| Technology | Usage |
|------------|-------|
| `@supabase/auth-helpers-react` | `useSupabaseClient()` for auth operations |
| `next/router` | Navigation after login |
| `framer-motion` | Page entrance animation |
| `lucide-react` | Mail, Lock icons |

### Key Functions

```javascript
handleLogin(e)
├── Prevents form default
├── Calls supabase.auth.signInWithPassword({ email, password })
├── On success: Fetches profile to get role
├── Redirects based on role:
│   ├── student → /student-view
│   └── admin/lecturer → /
└── On error: Sets errorMsg state
```

### Related Backend
- **Supabase Auth**: Handles JWT token generation
- **profiles table**: Stores user roles

### Database Queries
```sql
-- Fetch user role after login
SELECT role FROM profiles WHERE id = :user_id;
```

---

## 2. Signup Page

**File:** `pages/signup.js`  
**Route:** `/signup`  
**Access:** Public

### Purpose
Creates new user accounts and automatically links student records based on matric number.

### Features
| Feature | Description |
|---------|-------------|
| User Registration | Creates Supabase auth user |
| Profile Creation | Creates profile with role and metadata |
| Student Linking | Auto-links student_id if matric_no matches |
| Role Assignment | Sets default role to 'student' |

### Key Functions

```javascript
handleSignup(e)
├── Creates auth user: supabase.auth.signUp({ email, password })
├── Looks up student by matric_no in students table
├── Updates profile with:
│   ├── full_name
│   ├── matric_no
│   ├── role: 'student'
│   └── student_id (if found)
├── Redirects student to /student-view
└── On error: Displays error message
```

### Database Operations
```sql
-- Check if student exists by matric number
SELECT id FROM students WHERE matric_no = :matric_no;

-- Update profile with student link
UPDATE profiles 
SET full_name = :name, matric_no = :matric, student_id = :student_id, role = 'student'
WHERE id = :user_id;
```

---

## 3. Unauthorized Page

**File:** `pages/unauthorized.js`  
**Route:** `/unauthorized`  
**Access:** All authenticated users

### Purpose
Displays when a user tries to access a page they don't have permission for.

### Features
- Shows "Access Denied" message
- Redirects students to `/student-view`
- Redirects others to `/` (dashboard)

---

# Dashboard & Monitoring

## 4. Dashboard (Home) Page

**File:** `pages/index.js`  
**Route:** `/`  
**Access:** Admin, Lecturer

### Purpose
Main control center for real-time attendance monitoring with live camera feed from Raspberry Pi.

### Features

| Feature | Description |
|---------|-------------|
| Live Video Feed | MJPEG stream from Pi camera |
| Real-Time Attendance | Updates every 15 seconds |
| Automatic Mode Banner | Shows present/late period status |
| Stats Cards | Present count, Late count, Total detected |
| Manual Add | Search and manually mark students |
| Toast Notifications | Alert when new student detected |

### UI Sections

```
┌─────────────────────────────────────────────────────┐
│  Stats Cards: Present | Late | Total | Auto Status │
├─────────────────────────────────────────────────────┤
│  Automatic Mode Info Bar                            │
│  [Green: Present] [Orange: Late] [Gray: No class]   │
├───────────────────────────┬─────────────────────────┤
│   Live Camera Feed        │   Attendance List       │
│   (Pi Video Stream)       │   - Name, Status, Time  │
│                           │   - Search/Filter       │
└───────────────────────────┴─────────────────────────┘
```

### Tech Stack

| Technology | Usage |
|------------|-------|
| `useDashboardData` hook | Fetches attendance from Pi |
| `useClassSession` hook | Legacy class management |
| `useUserRole` hook | Role verification |
| `framer-motion` | Animations |
| `react-toastify` | Notifications |

### Key Functions

```javascript
// From useDashboardData hook
fetchData()
├── GET ${API_BASE}/api/current-class
│   └── Returns: { activeClass: {section, status, window_start, window_end}, mode }
├── GET ${API_BASE}/api/attendance-records
│   └── Returns: { attendance: [{id, status, student, timestamp}] }
└── Updates state: attendanceList, activeSection, isBackendOnline

handleManualMark(student)
├── Creates attendance record in Supabase
├── INSERT INTO attendance_records (id, student_id, class_session_id, status, timestamp)
└── Shows toast confirmation
```

### Backend Integration (Raspberry Pi)

The dashboard connects to these Pi endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/video` | GET | MJPEG video stream |
| `/api/current-class` | GET | Current attendance window info |
| `/api/attendance-records` | GET | Today's attendance list |

### Pi Backend Code Explanation

```python
# app_optimized.py

def get_current_attendance_window():
    """
    Called every 30 seconds.
    Queries section_schedules for today's day (e.g., "Monday")
    Calculates:
    - window_start = start_time - 15 min
    - late_cutoff = start_time + 15 min  
    - window_end = end_time - 15 min
    Returns current section info with status (present/late)
    """
    
def generate_frames():
    """
    Video streaming generator.
    - Captures frames from camera
    - Sends every 5th frame to face_recognition_worker
    - Draws bounding boxes on detected faces
    - Overlays status text (Recording: Section X | PRESENT/LATE)
    - Yields JPEG bytes as MJPEG stream
    """
    
def face_recognition_worker():
    """
    Background thread for face detection.
    - Resizes frame to 20% for faster processing
    - Compares against known_face_encodings
    - Calls log_attendance() for matched faces
    """

def log_attendance(student_matric):
    """
    Records attendance in Supabase.
    - Checks if student enrolled in section
    - Creates/gets class_session for today
    - Determines status from current_attendance_window
    - Inserts attendance_record
    """
```

---

## 5. Student View Page

**File:** `pages/student-view.js`  
**Route:** `/student-view`  
**Access:** Student, Admin

### Purpose
Personal attendance dashboard for students to view their records and submit excuses.

### Features

| Feature | Description |
|---------|-------------|
| Auto-Load Records | Automatically fetches student's attendance |
| Summary Stats | Total Classes, Present, Late, Absent |
| Calendar View | Visual representation of attendance |
| Details Tab | List view with filters |
| My Excuses Tab | View submitted excuse status |
| Inline Excuse Submit | Submit excuse directly from absent record |

### UI Layout

```
┌─────────────────────────────────────────────────────┐
│  Student Info Card: Name, Matric, Email             │
│  Stats: Total | Present | Late | Absent             │
├─────────────────────────────────────────────────────┤
│  Tabs: [Calendar] [Details] [My Excuses]            │
├─────────────────────────────────────────────────────┤
│  Tab Content:                                       │
│  - Calendar: Month view with colored dots           │
│  - Details: Table with date, course, status, action │
│  - Excuses: List of submitted excuses with status   │
└─────────────────────────────────────────────────────┘
```

### Tech Stack

| Technology | Usage |
|------------|-------|
| `useUserRole` hook | Gets student_id from profile |
| `useExcuseManagement` hook | Excuse CRUD operations |
| `@supabase/auth-helpers-react` | Database queries |
| `framer-motion` | Tab transitions |

### Key Functions

```javascript
// Auto-load student attendance on mount
useEffect(() => {
  if (studentId) {
    fetchAttendanceRecords(studentId);
  }
}, [studentId]);

fetchAttendanceRecords(studentId)
├── Joins attendance_records with class_sessions and sections
├── Filters by student_id
└── Populates attendanceRecords state

handleSubmitExcuseClick(record)
├── Opens excuse modal
├── Pre-fills date and course from selected record

handleExcuseSubmit(e)
├── Uploads document to Supabase Storage
├── Creates excuse_letters record:
│   ├── student_id
│   ├── attendance_record_id  
│   ├── excuse_type
│   ├── description
│   ├── document_url
│   └── status: 'pending'
└── Shows success toast
```

### Database Queries

```sql
-- Fetch student's attendance
SELECT ar.*, cs.class_date, cs.section_id, 
       s.name as section_name, c.name as course_name
FROM attendance_records ar
JOIN class_sessions cs ON ar.class_session_id = cs.id
JOIN sections s ON cs.section_id = s.id
JOIN courses c ON s.course_id = c.id
WHERE ar.student_id = :student_id
ORDER BY cs.class_date DESC;

-- Fetch student's excuses
SELECT * FROM excuse_letters
WHERE student_id = :student_id
ORDER BY created_at DESC;
```

---

# Analytics & Reports

## 6. Analysis Page

**File:** `pages/analysis.js`  
**Route:** `/analysis`  
**Access:** Admin, Lecturer

### Purpose
Comprehensive analytics dashboard with charts, statistics, and report generation.

### Features

| Feature | Description |
|---------|-------------|
| Attendance Overview | Present, Late, Absent, Excused breakdown |
| Attendance Trend Chart | Line chart over time |
| Course Comparison | Bar chart by course |
| Status Distribution | Pie chart breakdown |
| At-Risk Students | Students with >3 absences |
| Export Reports | CSV and PDF generation |
| Email Warnings | Send warning/barring notices |

### UI Sections

```
┌─────────────────────────────────────────────────────┐
│  Filter Bar: Course dropdown, Date range, Search    │
├─────────────────────────────────────────────────────┤
│  Stats Cards: Total | Present | Late | Absent       │
├─────────────────────────────────────────────────────┤
│  Charts Row:                                        │
│  [Line Chart: Trend] [Bar Chart: By Course]        │
├─────────────────────────────────────────────────────┤
│  [Pie Chart: Status] [At-Risk Students Table]      │
├─────────────────────────────────────────────────────┤
│  Export Actions: [Generate Report] [Send Warnings] │
└─────────────────────────────────────────────────────┘
```

### Tech Stack

| Technology | Usage |
|------------|-------|
| `recharts` (lazy loaded) | LineChart, BarChart, PieChart |
| `useAttendanceData` hook | Fetches aggregated data |
| `jspdf` + `jspdf-autotable` | PDF report generation |
| `file-saver` | CSV download |

### Key Functions

```javascript
handleSendEmail(student, absenceCount)
├── Determines type: absenceCount >= 6 ? 'barring' : 'warning'
├── Calls appropriate API route:
│   ├── /api/send-warning (3-5 absences)
│   └── /api/send-barring (6+ absences)
└── Shows confirmation toast

handleExportCSV()
├── Converts attendance data to CSV format
├── Triggers download via file-saver

handleExportPDF()
├── Uses jspdf to create PDF document
├── Adds header, stats summary
├── Creates table with jspdf-autotable
└── Saves file
```

### Related API Routes

**File:** `pages/api/send-warning.js`
```javascript
// Auth check: Requires admin role
// Fetches students with absence_count >= 3
// Calls Supabase Edge Function to send emails
// Updates warning_sent flag in student_course_attendance
```

**File:** `pages/api/send-barring.js`
```javascript
// Similar to send-warning but for 6+ absences
// Sends barring notice instead of warning
// Updates barring_sent flag
```

---

# Management Pages

## 7. Manage Excuses Page

**File:** `pages/manage-excuses.js`  
**Route:** `/manage-excuses`  
**Access:** Admin, Lecturer

### Purpose
Review and approve/reject student excuse submissions.

### Features

| Feature | Description |
|---------|-------------|
| Section Filter | Lecturers see only their sections |
| Status Filter | All, Pending, Approved, Rejected |
| Stats Overview | Pending count, Approved today, Total |
| Excuse Cards | Shows student, type, reason, document |
| Review Modal | View details and approve/reject |
| Document Preview | View uploaded excuse documents |

### UI Layout

```
┌─────────────────────────────────────────────────────┐
│  Stats: Pending | Approved Today | Total            │
├─────────────────────────────────────────────────────┤
│  Filters: [Section ▼] [Status ▼] [Search]          │
├─────────────────────────────────────────────────────┤
│  Excuse Cards Grid:                                 │
│  ┌─────────────────┐ ┌─────────────────┐           │
│  │ Student: John   │ │ Student: Jane   │           │
│  │ Type: Medical   │ │ Type: Emergency │           │
│  │ Status: Pending │ │ Status: Approved│           │
│  │ [Review]        │ │ [View]          │           │
│  └─────────────────┘ └─────────────────┘           │
└─────────────────────────────────────────────────────┘
```

### Tech Stack

| Technology | Usage |
|------------|-------|
| `useExcuseManagement` hook | Fetches/updates excuses |
| `useUserRole` hook | For lecturer section filtering |
| `react-modal` | Review modal |

### Key Functions

```javascript
// From useExcuseManagement hook
fetchExcuses(options)
├── If isLecturer: filters by lecturerSections
├── Joins with students, sections, courses
└── Returns formatted excuse list

handleReview(status)
├── Updates excuse_letters.status to 'approved' or 'rejected'
├── Sets reviewed_by = current_user_id
├── Sets reviewed_at = now()
├── If approved: may update attendance_record status
└── Closes modal, shows toast
```

### Database Queries

```sql
-- Fetch excuses for lecturer's sections
SELECT el.*, 
       st.name as student_name, st.matric_no,
       s.name as section_name, c.name as course_name
FROM excuse_letters el
JOIN students st ON el.student_id = st.id
JOIN attendance_records ar ON el.attendance_record_id = ar.id
JOIN class_sessions cs ON ar.class_session_id = cs.id
JOIN sections s ON cs.section_id = s.id
JOIN courses c ON s.course_id = c.id
WHERE s.id IN (:lecturer_sections)
ORDER BY el.created_at DESC;
```

---

## 8. Manage Students Page

**File:** `pages/manage-student.js`  
**Route:** `/manage-student`  
**Access:** Admin only

### Purpose
View, edit, and delete student records.

### Features

| Feature | Description |
|---------|-------------|
| Student List | Paginated table of all students |
| Search | Filter by name or matric |
| Edit Modal | Update student details |
| Delete | Remove student record |
| Enrollment View | See which sections student is in |

### Tech Stack

| Technology | Usage |
|------------|-------|
| `useStudentManagement` hook | CRUD operations |
| `react-modal` | Edit modal |

### Key Functions

```javascript
// From useStudentManagement hook
students - List of all students
updateStudent(id, data) - Update student record
deleteStudent(id) - Delete student
refreshStudents() - Reload list
```

---

## 9. Add Student Page

**File:** `pages/add-student1.js`  
**Route:** `/add-student1`  
**Access:** Admin, Lecturer

### Purpose
Register new students with face image for recognition.

### Features

| Feature | Description |
|---------|-------------|
| Form Input | Name, Email, Matric No, Section |
| Image Upload | Drag & drop or file picker |
| Camera Capture | Take photo via webcam |
| Image Preview | Shows selected/captured image |
| Pi Upload | Sends image to Raspberry Pi for face encoding |

### UI Layout

```
┌─────────────────────────────────────────────────────┐
│  Student Information Form                           │
│  ┌─────────────────────────────────────────────┐   │
│  │ Matric No: [____________]                    │   │
│  │ Name:      [____________]                    │   │
│  │ Email:     [____________]                    │   │
│  │ Section:   [▼ Select Section]               │   │
│  └─────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│  Face Image Upload                                  │
│  ┌─────────────────────┐  ┌──────────────────────┐ │
│  │                     │  │ Or use camera:       │ │
│  │   Drop image here   │  │ [Start Camera]       │ │
│  │   or click to select│  │ [Capture]            │ │
│  │                     │  │                      │ │
│  └─────────────────────┘  └──────────────────────┘ │
├─────────────────────────────────────────────────────┤
│  [Register Student]                                 │
└─────────────────────────────────────────────────────┘
```

### Tech Stack

| Technology | Usage |
|------------|-------|
| `navigator.mediaDevices` | Webcam access |
| `axios` | Upload image to Pi |
| `@supabase/auth-helpers-react` | Save to database |

### Key Functions

```javascript
handleSubmit(e)
├── Validates form fields
├── Creates student record in Supabase:
│   INSERT INTO students (matric_no, name, email, nickname)
├── Creates enrollment:
│   INSERT INTO student_section_enrollments (student_id, section_id)
├── Uploads face image to Pi:
│   POST ${PI_URL}/upload-image (multipart/form-data)
└── Shows success/error message

startCamera()
├── Requests camera permission
├── Creates video stream
└── Displays in video element

captureImage()
├── Draws video frame to canvas
├── Converts canvas to blob
└── Sets as selectedImage
```

### Backend Integration (Pi)

```python
# app_optimized.py

@app.route("/upload-image", methods=["POST"])
def upload_image():
    """
    Receives student face image.
    1. Validates file format (jpg/png)
    2. Saves to known_faces directory with matric_no as filename
    3. Extracts face encoding using face_recognition library
    4. Adds to known_face_encodings array
    5. Returns success/error response
    """
```

---

## 10. Manage Courses Page

**File:** `pages/manage-course.js`  
**Route:** `/manage-course`  
**Access:** Admin

### Purpose
Create and manage courses and their sections.

### Features

| Feature | Description |
|---------|-------------|
| Course List | All courses with section count |
| Add Course | Create new course |
| Add Section | Create section under course |
| Edit | Update course/section details |
| Delete | Remove course or section |

---

## 11. Manage Roles Page

**File:** `pages/manage-roles.js`  
**Route:** `/manage-roles`  
**Access:** Admin only

### Purpose
Assign and change user roles.

### Features

| Feature | Description |
|---------|-------------|
| User List | All registered users |
| Role Badge | Current role indicator |
| Role Dropdown | Change role (admin/lecturer/student) |
| Quick Filter | Filter by role type |

### Key Operations

```javascript
updateUserRole(userId, newRole)
├── UPDATE profiles SET role = :newRole WHERE id = :userId
└── Refresh user list
```

---

# Utility Pages

## 12. Settings Page

**File:** `pages/settings.js`  
**Route:** `/settings`  
**Access:** All authenticated users

### Purpose
User preferences and account settings.

### Features
- Profile editing
- Password change
- Notification preferences

---

## 13. Submit Excuse Page

**File:** `pages/submit-excuse.js`  
**Route:** `/submit-excuse`  
**Access:** Student

### Purpose
Dedicated page for students to submit excuses (alternative to inline modal).

### Features

| Feature | Description |
|---------|-------------|
| Date Selection | Choose absence date |
| Excuse Type | Medical, Emergency, Official, Other |
| Description | Text area for details |
| Document Upload | Supporting documents |

---

# Hooks Reference

All pages utilize these shared hooks located in `/hooks`:

| Hook | File | Purpose |
|------|------|---------|
| `useUserRole` | `useUserRole.js` | Gets current user's role, studentId, lecturerId |
| `useDashboardData` | `useDashboardData.js` | Fetches real-time data from Pi |
| `useClassSession` | `useClassSession.js` | Class session management (legacy) |
| `useExcuseManagement` | `useExcuseManagement.js` | Excuse CRUD operations |
| `useStudentManagement` | `useStudentManagement.js` | Student CRUD operations |
| `useAttendanceData` | `useAttendanceData.js` | Aggregated attendance data |

---

# Access Control Summary

| Page | Student | Lecturer | Admin |
|------|---------|----------|-------|
| Login/Signup | ✅ | ✅ | ✅ |
| Dashboard | ❌ | ✅ | ✅ |
| Student View | ✅ | ❌ | ✅ |
| Analysis | ❌ | ✅ | ✅ |
| Manage Excuses | ❌ | ✅ | ✅ |
| Manage Students | ❌ | ❌ | ✅ |
| Add Student | ❌ | ✅ | ✅ |
| Manage Courses | ❌ | ❌ | ✅ |
| Manage Roles | ❌ | ❌ | ✅ |
| Settings | ✅ | ✅ | ✅ |

Protected by `withRole` HOC which checks `profiles.role` before rendering.
