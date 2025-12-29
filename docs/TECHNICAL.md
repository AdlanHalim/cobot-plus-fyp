# CObot+ Technical Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Component Details](#component-details)
4. [Database Schema](#database-schema)
5. [API Reference](#api-reference)
6. [Authentication & Authorization](#authentication--authorization)
7. [Automatic Attendance System](#automatic-attendance-system)
8. [Performance Optimizations](#performance-optimizations)
9. [Security Measures](#security-measures)
10. [Deployment Guide](#deployment-guide)

---

## 1. System Overview

CObot+ is an intelligent face recognition-based attendance tracking system designed for educational institutions. The system consists of three main components:

| Component | Technology | Purpose |
|-----------|------------|---------|
| Web Application | Next.js 15 + React 19 | User interface, dashboards, management |
| Backend API | Flask (Python) | Face recognition, camera control |
| Database | Supabase (PostgreSQL) | Data persistence, authentication |

### Key Features
- **Automatic Attendance**: 24/7 face recognition based on class schedules
- **Present/Late Detection**: Automatic status based on arrival time
- **Role-Based Access**: Student, Lecturer, Admin roles
- **Excuse Management**: Students submit excuses, lecturers review
- **Analytics Dashboard**: Attendance trends, punctuality scores

---

## 2. Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER DEVICES                               │
│                    (Browsers, Mobile Devices)                       │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      NEXT.JS WEB APPLICATION                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │    Pages     │  │    Hooks     │  │  Components  │              │
│  │  - Dashboard │  │- useDashData │  │- DashLayout  │              │
│  │  - Analysis  │  │- useUserRole │  │- Card, Button│              │
│  │  - Students  │  │- useClassSes │  │- Sidebar     │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                              │                                      │
│  ┌───────────────────────────┴─────────────────────┐               │
│  │                   API Routes                     │               │
│  │     /api/send-warning, /api/send-barring        │               │
│  └─────────────────────────────────────────────────┘               │
└────────────────────────────┬────────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│   SUPABASE (Cloud)      │   │   RASPBERRY PI (Local)  │
│  ┌─────────────────┐    │   │  ┌─────────────────┐    │
│  │   PostgreSQL    │    │   │  │   Flask Server  │    │
│  │   - profiles    │    │   │  │   Port 5000     │    │
│  │   - students    │    │   │  └────────┬────────┘    │
│  │   - sections    │◄───┼───┼───────────┤             │
│  │   - attendance  │    │   │  ┌────────▼────────┐    │
│  └─────────────────┘    │   │  │  Face Recognition│   │
│  ┌─────────────────┐    │   │  │  (dlib/OpenCV)  │    │
│  │   Auth Service  │    │   │  └────────┬────────┘    │
│  └─────────────────┘    │   │  ┌────────▼────────┐    │
│  ┌─────────────────┐    │   │  │     Camera      │    │
│  │     Storage     │    │   │  │   (USB/CSI)     │    │
│  │  (excuse docs)  │    │   │  └─────────────────┘    │
│  └─────────────────┘    │   └─────────────────────────┘
└─────────────────────────┘
```

### Data Flow

```
1. FACE DETECTED
   Camera → OpenCV → face_recognition library
   
2. IDENTITY MATCHED
   Face encoding → Compare with known_faces → Student matric_no

3. SCHEDULE CHECKED
   Current time → Query section_schedules → Determine present/late

4. ATTENDANCE RECORDED
   Student + Session → Insert attendance_records → Update course stats

5. FRONTEND UPDATED
   Polling /api/attendance-records → React state → UI render
```

---

## 3. Component Details

### Frontend (Next.js)

#### Pages Structure

| Page | Path | Role Access | Description |
|------|------|-------------|-------------|
| Dashboard | `/` | Lecturer, Admin | Live camera feed, attendance list |
| Analysis | `/analysis` | Lecturer, Admin | Charts, statistics, reports |
| Student View | `/student-view` | Student | Personal attendance records |
| Manage Excuses | `/manage-excuses` | Lecturer, Admin | Review excuse submissions |
| Manage Students | `/manage-student` | Admin | Student CRUD operations |
| Manage Roles | `/manage-roles` | Admin | User role assignment |
| Add Student | `/add-student1` | Admin | Register new students |

#### Custom Hooks

```javascript
// useDashboardData.js - Fetches real-time data from Pi
const { attendanceList, activeSection, isBackendOnline } = useDashboardData(apiBase);

// useUserRole.js - Gets current user's role and profile
const { userRole, lecturerId, studentId, isLoading } = useUserRole();

// useClassSession.js - Class session management (legacy)
const { sections, activeSession, startClass, endClass } = useClassSession();

// useExcuseManagement.js - Excuse CRUD operations
const { excuses, submitExcuse, updateExcuseStatus } = useExcuseManagement();
```

### Backend (Flask)

#### Core Modules

| Module | Function | Description |
|--------|----------|-------------|
| `get_current_attendance_window()` | Auto-detection | Checks schedules, returns active window |
| `log_attendance()` | Recording | Inserts attendance with present/late status |
| `face_recognition_worker()` | Processing | Background thread for face detection |
| `generate_frames()` | Streaming | MJPEG video stream generator |

---

## 4. Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    profiles     │     │    students     │     │    courses      │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK, FK Auth)│────►│ id (PK, UUID)   │     │ id (PK, UUID)   │
│ role            │     │ matric_no       │     │ code            │
│ full_name       │     │ name            │     │ name            │
│ student_id (FK) │     │ nickname        │     │ description     │
│ matric_no       │     │ email           │     └────────┬────────┘
└─────────────────┘     │ face_image_url  │              │
                        └────────┬────────┘              │
                                 │                       │
                                 │         ┌─────────────┴─────────────┐
                                 │         ▼                           │
                        ┌────────▼────────────────┐    ┌───────────────▼───────┐
                        │       sections          │    │   section_schedules   │
                        ├─────────────────────────┤    ├───────────────────────┤
                        │ id (PK, UUID)           │───►│ id (PK)               │
                        │ course_id (FK)          │    │ section_id (FK)       │
                        │ lecturer_id (FK)        │    │ day_of_week           │
                        │ name                    │    │ start_time            │
                        └────────┬────────────────┘    │ end_time              │
                                 │                     │ room                  │
                 ┌───────────────┴───────────────┐     └───────────────────────┘
                 ▼                               ▼
┌────────────────────────────┐   ┌────────────────────────────┐
│ student_section_enrollments│   │      class_sessions        │
├────────────────────────────┤   ├────────────────────────────┤
│ id (PK)                    │   │ id (PK)                    │
│ student_id (FK)            │   │ section_id (FK)            │
│ section_id (FK)            │   │ class_date                 │
│ enrolled_at                │   │ start_time                 │
└────────────────────────────┘   │ ended_at                   │
                                 │ status                     │
                                 └────────────┬───────────────┘
                                              │
                                              ▼
                                 ┌────────────────────────────┐
                                 │    attendance_records      │
                                 ├────────────────────────────┤
                                 │ id (PK)                    │
                                 │ student_id (FK)            │
                                 │ class_session_id (FK)      │
                                 │ status (present/late/absent│
                                 │ timestamp                  │
                                 └────────────────────────────┘
```

### Key Tables

#### profiles
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  role TEXT CHECK (role IN ('admin', 'lecturer', 'student')),
  full_name TEXT,
  matric_no TEXT,
  student_id UUID REFERENCES students(id),  -- Link to student record
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### section_schedules
```sql
CREATE TABLE section_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES sections(id),
  day_of_week TEXT CHECK (day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room TEXT
);
```

#### attendance_records
```sql
CREATE TABLE attendance_records (
  id TEXT PRIMARY KEY,
  student_id UUID REFERENCES students(id),
  class_session_id TEXT REFERENCES class_sessions(id),
  status TEXT CHECK (status IN ('present', 'late', 'absent')),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. API Reference

### Raspberry Pi Endpoints

| Endpoint | Method | Description | Response |
|----------|--------|-------------|----------|
| `/video` | GET | MJPEG video stream | `multipart/x-mixed-replace` |
| `/health` | GET | System health check | `{status, camera, supabase, known_faces}` |
| `/api/current-class` | GET | Current attendance window | `{activeClass, mode}` |
| `/api/attendance-records` | GET | Today's attendance | `{attendance: [...], mode}` |
| `/api/start-class` | POST | Legacy (returns auto-mode info) | `{message, mode}` |
| `/api/end-class` | POST | Legacy (returns auto-mode info) | `{message, mode}` |
| `/api/pause-stream` | POST | Pause video streaming | `{message}` |
| `/api/resume-stream` | POST | Resume video streaming | `{message}` |
| `/api/reconnect` | POST | Reload known faces | `{message, count}` |
| `/upload-image` | POST | Upload student face | `{message}` or `{error}` |

### Response Examples

#### GET /api/current-class
```json
{
  "activeClass": {
    "section_id": "uuid-here",
    "name": "Section A",
    "course_id": "uuid-here",
    "courseName": "Data Structures",
    "status": "present",
    "window_start": "08:45",
    "late_cutoff": "09:15",
    "window_end": "10:45"
  },
  "mode": "automatic"
}
```

#### GET /api/attendance-records
```json
{
  "attendance": [
    {
      "id": "att_123_session_456_2024-01-15",
      "status": "present",
      "timestamp": "2024-01-15T09:02:34Z",
      "student_id": "uuid",
      "student": {
        "matric_no": "A12345",
        "nickname": "John",
        "name": "John Doe"
      }
    }
  ],
  "mode": "automatic"
}
```

### Next.js API Routes

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/send-warning` | POST | Admin | Send absence warning emails |
| `/api/send-barring` | POST | Admin | Send barring notice emails |

---

## 6. Authentication & Authorization

### Authentication Flow

```
1. User signs up/logs in via Supabase Auth
2. On signup, profile created with role assignment
3. JWT token stored in session
4. Token validated on each request
```

### Role-Based Access Control

```javascript
// utils/withRole.js - HOC for page protection
export default function withRole(WrappedComponent, allowedRoles) {
  return function AuthenticatedComponent(props) {
    const { userRole, isLoading } = useUserRole();
    
    if (isLoading) return <LoadingSpinner />;
    if (!allowedRoles.includes(userRole)) {
      router.push('/unauthorized');
      return null;
    }
    return <WrappedComponent {...props} />;
  };
}

// Usage
export default withRole(AnalysisPage, ['admin', 'lecturer']);
```

### Role Permissions Matrix

| Feature | Student | Lecturer | Admin |
|---------|---------|----------|-------|
| View Dashboard | ❌ | ✅ | ✅ |
| View Own Records | ✅ | ❌ | ❌ |
| Submit Excuse | ✅ | ❌ | ❌ |
| Review Excuses | ❌ | ✅ (own sections) | ✅ (all) |
| View Analytics | ❌ | ✅ | ✅ |
| Manage Students | ❌ | ❌ | ✅ |
| Manage Roles | ❌ | ❌ | ✅ |

---

## 7. Automatic Attendance System

### Timing Window Logic

```
         -15min        START        +15min                    END-15min
           │             │            │                          │
    ───────┼─────────────┼────────────┼──────────────────────────┼────────
           │◄─ PRESENT ─►│◄─ PRESENT─►│◄──────── LATE ──────────►│ STOP
```

### Window Detection Algorithm

```python
def get_current_attendance_window():
    current_day = datetime.now().strftime("%A")  # e.g., "Monday"
    current_minutes = hours * 60 + minutes
    
    for schedule in section_schedules.filter(day=current_day):
        window_start = schedule.start_time - 15  # 15 min early
        late_cutoff = schedule.start_time + 15   # 15 min grace
        window_end = schedule.end_time - 15      # 15 min buffer
        
        if window_start <= current_minutes <= window_end:
            return {
                "section_id": schedule.section_id,
                "is_late": current_minutes > late_cutoff,
                "status": "late" if current_minutes > late_cutoff else "present"
            }
    return None
```

### Attendance Recording Flow

```
1. Face recognized → Get student matric_no
2. Check enrollment → student_section_enrollments
3. Get/Create session → class_sessions
4. Determine status → present if early, late otherwise
5. Insert record → attendance_records
6. Update stats → student_course_attendance
```

---

## 8. Performance Optimizations

### Frontend Optimizations

| Optimization | Implementation | Impact |
|--------------|----------------|--------|
| Lazy Loading | `dynamic()` for recharts | Reduced initial bundle |
| Smart Polling | Visibility API in useDashboardData | Saves bandwidth when tab hidden |
| Duplicate Prevention | Shared useUserRole hook | Single DB call per page |
| Image Optimization | next/image with Supabase config | Automatic WebP/AVIF |

### Backend Optimizations

| Optimization | Implementation | Impact |
|--------------|----------------|--------|
| Frame Skipping | Process every 5th frame | ~80% CPU reduction |
| Background Processing | Separate thread for face recognition | Non-blocking video stream |
| LRU Cache | `@lru_cache` for student lookups | Reduced DB calls |
| In-Memory Tracking | `attendance_logged_today` set | Skip duplicate checks |
| Window Caching | 30-second cache for schedule checks | Fewer DB queries |

---

## 9. Security Measures

### Security Headers (next.config.mjs)

```javascript
headers: async () => [{
  source: '/:path*',
  headers: [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-XSS-Protection', value: '1; mode=block' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  ],
}]
```

### API Security

- **CORS Restricted**: Whitelist-only origins
- **API Key Auth**: Optional `X-API-Key` header for Pi endpoints
- **Admin-Only Routes**: `/api/send-warning`, `/api/send-barring` require admin role
- **Row Level Security**: Supabase RLS enabled on all tables

---

## 10. Deployment Guide

### Frontend (Vercel/VPS)

```bash
# Build
npm run build

# Environment Variables Required
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
NEXT_PUBLIC_PI_URL=http://pi-ip:5000
NEXT_PUBLIC_PI_API_KEY=optional-key
```

### Raspberry Pi

```bash
# Install dependencies
pip install flask flask-cors python-dotenv supabase face_recognition opencv-python numpy

# Environment Variables (.env)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=xxx
API_SECRET_KEY=optional-key
ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com

# Run
python app_optimized.py
```

### Supabase Setup

1. Create project at supabase.com
2. Run SQL migrations for all tables
3. Enable Row Level Security
4. Configure Auth settings (email/password)
5. Create Storage bucket for excuse documents

---

## Appendix

### Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side operations |
| `NEXT_PUBLIC_PI_URL` | Yes | Raspberry Pi Flask URL |
| `NEXT_PUBLIC_PI_API_KEY` | No | Optional API key for Pi |
| `SUPABASE_URL` (Pi) | Yes | Same as above |
| `SUPABASE_KEY` (Pi) | Yes | Same as anon key |
| `API_SECRET_KEY` (Pi) | No | Pi endpoint protection |
| `ALLOWED_ORIGINS` (Pi) | No | CORS whitelist |
