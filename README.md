# CObot+ Attendance System

An intelligent face recognition-based attendance tracking system for educational institutions. Features real-time facial recognition via Raspberry Pi, role-based access control, and comprehensive analytics.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![React](https://img.shields.io/badge/React-19-blue)
![Supabase](https://img.shields.io/badge/Supabase-Database-green)
![Python](https://img.shields.io/badge/Python-Flask-yellow)

## ✨ Features

### 🎓 For Students
- **My Records** - View personal attendance history with calendar view
- **Submit Excuses** - Upload excuse letters with supporting documents
- **Auto-redirect** - Students are automatically directed to their records page after login

### 👨‍🏫 For Lecturers
- **Dashboard** - Real-time attendance monitoring with live camera feed
- **Class Management** - Start/end class sessions with auto-suggested schedules
- **Analytics** - Attendance trends, punctuality scores, and absence tracking
- **Excuse Management** - Review and approve/reject student excuses (filtered by sections)

### 🔐 For Admins
- **Full Access** - All lecturer features plus system administration
- **User Management** - Assign roles and manage user accounts
- **Course Management** - Create and manage courses/sections
- **Email Alerts** - Automated warning and barring notifications

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Supabase account
- Raspberry Pi with camera (for face recognition)

### 1. Clone & Install

```bash
git clone https://github.com/AdlanHalim/cobot-plus-fyp.git
cd cobot-plus-fyp
npm install
```

### 2. Environment Setup

Create `.env.local` in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Raspberry Pi
NEXT_PUBLIC_PI_URL=http://192.168.x.x:5000
NEXT_PUBLIC_PI_API_KEY=your-secret-key  # Optional, for production

# Supabase Edge Functions (for email)
NEXT_PUBLIC_SUPABASE_FUNCTION_URL=https://your-project.supabase.co/functions/v1
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🍓 Raspberry Pi Setup

The face recognition runs on a Raspberry Pi with a connected camera.

### 1. Copy Backend Files

```bash
scp raspberry-pi/app_optimized.py pi@your-pi:/home/pi/cobot/
```

### 2. Install Dependencies

```bash
pip install flask flask-cors python-dotenv supabase face_recognition opencv-python numpy
```

### 3. Configure Environment

Create `.env` on the Pi:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# Security (recommended for production)
API_SECRET_KEY=your-secret-key
ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com

# Performance tuning
PROCESS_EVERY_N=5
FRAME_SCALE=0.2
```

### 4. Run the Server

```bash
python app_optimized.py
```

Server runs at `http://0.0.0.0:5000`

### Health Check

```bash
curl http://your-pi:5000/health
```

---

## 📁 Project Structure

```
cobot-plus-fyp/
├── components/          # React components
│   ├── layout/          # DashboardLayout, Sidebar
│   └── ui/              # Card, Button, etc.
├── hooks/               # Custom React hooks
│   ├── useUserRole.js       # Role detection
│   ├── useDashboardData.js  # Pi data fetching
│   ├── useClassSession.js   # Class start/end
│   └── useExcuseManagement.js
├── pages/               # Next.js pages
│   ├── api/             # API routes
│   ├── index.js         # Dashboard
│   ├── student-view.js  # Student records
│   ├── analysis.js      # Analytics
│   └── manage-excuses.js
├── utils/               # Utilities
│   └── withRole.js      # Role-based access HOC
├── raspberry-pi/        # Pi backend
│   └── app_optimized.py # Optimized Flask server
└── styles/              # CSS files
```

---

## 🔒 Security Features

- **Role-based access control** via `withRole` HOC
- **Supabase RLS** - Row Level Security on all tables
- **API authentication** - Protected endpoints require API key
- **Security headers** - X-Frame-Options, X-XSS-Protection, etc.
- **CORS restrictions** - Whitelist-only origins

---

## ⚡ Performance Optimizations

| Feature | Description |
|---------|-------------|
| **Frame skipping** | Pi processes every 5th frame (~80% CPU reduction) |
| **Background processing** | Face recognition runs in separate thread |
| **Student caching** | LRU cache for database lookups |
| **Visibility polling** | Dashboard pauses polling when tab hidden |
| **Lazy loading** | Heavy components (charts) load on demand |
| **Image optimization** | Next.js image optimization enabled |

---

## 📊 Database Schema

Key tables in Supabase:

- `profiles` - User accounts with roles
- `students` - Student information with face images
- `courses` / `sections` - Course structure
- `section_schedules` - Class timetables
- `class_sessions` - Active/completed sessions
- `attendance_records` - Individual attendance logs
- `excuse_letters` - Student excuse submissions

---

## 🛠️ Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

---

## 📝 License

This project is part of a Final Year Project (FYP).

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
