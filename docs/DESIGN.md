# CObot+ Design Documentation

## Table of Contents
1. [Design Philosophy](#design-philosophy)
2. [User Interface Design](#user-interface-design)
3. [User Experience Flows](#user-experience-flows)
4. [Component Library](#component-library)
5. [Color System](#color-system)
6. [Typography](#typography)
7. [Responsive Design](#responsive-design)
8. [Accessibility](#accessibility)
9. [State Management](#state-management)
10. [Design Decisions](#design-decisions)

---

## 1. Design Philosophy

### Core Principles

| Principle | Description |
|-----------|-------------|
| **Clarity** | Information at a glance, minimal cognitive load |
| **Consistency** | Unified design language across all pages |
| **Efficiency** | Streamlined workflows, minimal clicks |
| **Feedback** | Real-time status updates, toast notifications |
| **Accessibility** | ARIA labels, keyboard navigation, color contrast |

### Design Language

CObot+ uses a **modern, clean aesthetic** with:
- Rounded corners (2xl radius)
- Subtle shadows
- Gradient accents
- Card-based layouts
- Generous whitespace

---

## 2. User Interface Design

### Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                         HEADER (hidden)                         │
├─────────────┬───────────────────────────────────────────────────┤
│             │                                                   │
│             │              PAGE HEADER                          │
│             │    ┌─────────────────────────────────────┐       │
│   SIDEBAR   │    │          STATS CARDS                │       │
│             │    └─────────────────────────────────────┘       │
│   - Logo    │    ┌─────────────────────────────────────┐       │
│   - Nav     │    │          CONTROL BAR                │       │
│   - User    │    └─────────────────────────────────────┘       │
│             │    ┌─────────────────┬───────────────────┐       │
│             │    │                 │                   │       │
│             │    │   MAIN CONTENT  │   SECONDARY       │       │
│             │    │   (2/3 width)   │   (1/3 width)     │       │
│             │    │                 │                   │       │
│             │    └─────────────────┴───────────────────┘       │
└─────────────┴───────────────────────────────────────────────────┘
```

### Page Templates

#### Dashboard Template
- Stats cards row (4 columns on desktop)
- Auto-mode info bar
- 2-column grid: Video feed | Attendance list

#### Management Template
- Page header with description
- Filters/search bar
- Data table with actions
- Pagination

#### Form Template
- Card container
- Form fields with labels
- Submit button row

---

## 3. User Experience Flows

### Student Flow

```
Login ──► Auto-redirect to Student View
              │
              ▼
     ┌─────────────────┐
     │  My Records     │
     │  - Calendar     │
     │  - Stats cards  │
     │  - Excuses tab  │
     └────────┬────────┘
              │
              ▼
     Click "Submit Excuse"
              │
              ▼
     ┌─────────────────┐
     │  Excuse Modal   │
     │  - Select date  │
     │  - Reason       │
     │  - Upload doc   │
     │  - Submit       │
     └────────┬────────┘
              │
              ▼
     View in "My Excuses" tab
```

### Lecturer Flow

```
Login ──► Dashboard
              │
              ▼
     ┌─────────────────────────────┐
     │  Dashboard                  │
     │  - Auto-mode banner         │
     │  - Live camera feed         │
     │  - Real-time attendance     │
     └────────┬────────────────────┘
              │
              ├──► Analysis (view charts, generate reports)
              │
              └──► Manage Excuses (review student submissions)
```

### Admin Flow

```
Login ──► Dashboard
              │
              ▼
     ┌─────────────────────────────────┐
     │  Full Navigation Access          │
     │  - Dashboard                     │
     │  - Analysis                      │
     │  - Manage Students               │
     │  - Manage Courses                │
     │  - Manage Roles                  │
     │  - Manage Excuses                │
     └─────────────────────────────────┘
```

---

## 4. Component Library

### Core Components

#### Card
```jsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
</Card>
```
- Rounded corners: `rounded-2xl`
- Shadow: `shadow-sm`
- Border: `border border-slate-100`
- Padding: `p-5`

#### Button Variants

| Variant | Class | Use Case |
|---------|-------|----------|
| Primary | `bg-teal-600 text-white` | Main actions |
| Secondary | `bg-slate-100 text-slate-700` | Secondary actions |
| Danger | `bg-rose-500 text-white` | Destructive actions |
| Ghost | `bg-transparent hover:bg-slate-50` | Tertiary actions |

#### Input

```jsx
<input 
  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 
             bg-slate-50 focus:ring-2 focus:ring-teal-400 focus:outline-none"
/>
```

#### Badge

```jsx
// Status badges
<span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700">
  Present
</span>
<span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">
  Late
</span>
<span className="px-2 py-0.5 text-xs rounded-full bg-rose-100 text-rose-700">
  Absent
</span>
```

### Motion Components

Using Framer Motion for animations:

```jsx
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.1 }}
>
  Content
</motion.div>
```

---

## 5. Color System

### Primary Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Teal 500 | `#14b8a6` | Primary buttons, links |
| Teal 600 | `#0d9488` | Hover states |
| Cyan 500 | `#06b6d4` | Gradient accents |

### Semantic Colors

| Status | Background | Text | Usage |
|--------|------------|------|-------|
| Success | `bg-emerald-100` | `text-emerald-700` | Present, approved |
| Warning | `bg-amber-100` | `text-amber-700` | Late, pending |
| Error | `bg-rose-100` | `text-rose-700` | Absent, rejected |
| Info | `bg-teal-100` | `text-teal-700` | Information |

### Gradients

```css
/* Primary gradient (active states) */
bg-gradient-to-br from-teal-500 to-cyan-500

/* Late period */
bg-gradient-to-r from-amber-500 to-orange-500

/* Present period */
bg-gradient-to-r from-emerald-500 to-teal-500
```

### Neutral Palette

| Name | Class | Usage |
|------|-------|-------|
| Text Primary | `text-slate-800` | Headings, important text |
| Text Secondary | `text-slate-500` | Descriptions, labels |
| Background | `bg-slate-50` | Page background |
| Card Background | `bg-white` | Card surfaces |
| Border | `border-slate-100` | Subtle borders |
| Border Active | `border-slate-200` | Input borders |

---

## 6. Typography

### Font Stack

```css
font-family: 'Inter', system-ui, -apple-system, sans-serif;
```

### Type Scale

| Element | Class | Size |
|---------|-------|------|
| Page Title | `text-2xl font-bold` | 24px |
| Card Title | `text-lg font-semibold` | 18px |
| Body | `text-sm` | 14px |
| Caption | `text-xs` | 12px |
| Stats Number | `text-3xl font-bold` | 30px |

### Font Weights

| Weight | Class | Usage |
|--------|-------|-------|
| Regular (400) | default | Body text |
| Medium (500) | `font-medium` | Buttons, labels |
| Semibold (600) | `font-semibold` | Subheadings |
| Bold (700) | `font-bold` | Headings, stats |

---

## 7. Responsive Design

### Breakpoints

| Breakpoint | Width | Typical Device |
|------------|-------|----------------|
| sm | 640px | Mobile landscape |
| md | 768px | Tablet |
| lg | 1024px | Small laptop |
| xl | 1280px | Desktop |

### Layout Adaptations

```jsx
// Stats cards: 1 col → 2 col → 4 col
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

// Main content: Full → 2/3 + 1/3
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2">Main</div>
  <div>Secondary</div>
</div>

// Sidebar: Hidden on mobile, visible on lg+
<aside className="hidden lg:block w-64">
```

### Mobile Considerations

- Collapsible sidebar with hamburger menu
- Stack cards vertically
- Full-width buttons
- Touch-friendly hit targets (44px minimum)

---

## 8. Accessibility

### ARIA Implementation

```jsx
// Button with loading state
<button aria-busy={isLoading} aria-label="Submit attendance">
  {isLoading ? <Spinner /> : 'Submit'}
</button>

// Status announcements
<div role="status" aria-live="polite">
  {statusMessage}
</div>
```

### Keyboard Navigation

- All interactive elements are focusable
- Tab order follows visual flow
- Escape closes modals
- Enter activates buttons

### Color Contrast

All text meets WCAG AA standards:
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum
- Interactive elements: 3:1 minimum

---

## 9. State Management

### State Categories

| Category | Solution | Examples |
|----------|----------|----------|
| Server State | Custom Hooks + Polling | Attendance list, class info |
| Auth State | Supabase Context | Session, user profile |
| UI State | React useState | Modals, loading, tabs |
| Form State | React useState | Input values, validation |

### Data Fetching Pattern

```jsx
// Custom hook pattern
function useDashboardData(apiBase) {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  return { data, isLoading, error, refetch };
}
```

### Toast Notifications

```jsx
// Success
toast.success("✓ Student marked present");

// Error
toast.error("Failed to submit excuse");

// Info
toast.info("Connection restored");
```

---

## 10. Design Decisions

### Why Automatic Attendance Mode?

| Manual Mode (Old) | Automatic Mode (New) |
|-------------------|----------------------|
| Requires lecturer to start/end class | Runs 24/7 based on schedule |
| Misses late arrivals before button click | Captures all arrivals in window |
| Human error in timing | Consistent, schedule-based |
| Extra cognitive load | Zero interaction required |

### Why Card-Based Layout?

- **Scanability**: Grouped information easy to scan
- **Modularity**: Cards can be rearranged
- **Mobile-friendly**: Cards stack naturally
- **Visual hierarchy**: Clear content boundaries

### Why Teal/Cyan Theme?

- **Professional**: Suitable for educational context
- **Calm**: Not aggressive like red/orange
- **Accessible**: Good contrast ratios
- **Distinctive**: Differentiates from common blue themes

### Why Polling Instead of WebSockets?

- **Simplicity**: No additional infrastructure
- **Reliability**: HTTP always works
- **Supabase Integration**: Native REST API
- **Adequate for use case**: 15-second updates sufficient

### Why Client-Side Routing?

- **SPA Experience**: No full page reloads
- **State Persistence**: Keeps session data
- **Better UX**: Instant navigation feel
- **Next.js Default**: Optimized for hybrid apps
