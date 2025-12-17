/**
 * @file AttendanceCalendar.jsx
 * @location cobot-plus-fyp/components/attendance/AttendanceCalendar.jsx
 * 
 * @description
 * Calendar visualization component for attendance records.
 * Uses react-calendar library with custom color-coded day tiles.
 * 
 * Features:
 * - Color-coded days based on attendance status:
 *   - Green (emerald-100): Present
 *   - Amber (amber-100): Late
 *   - Red (rose-100): Absent
 * - Priority-based display: Absent > Late > Present
 * - Memoized attendance map for performance
 */

import { useMemo } from "react";
import Calendar from "react-calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import "react-calendar/dist/Calendar.css";

/**
 * Calendar component that displays attendance records with color-coded days.
 * 
 * @param {{ attendanceRecords: Array }} props
 * @param {Array} props.attendanceRecords - Array of attendance records with class_sessions data
 */
export function AttendanceCalendar({ attendanceRecords }) {
  // Creates a Map: { 'YYYY-MM-DD': [status1, status2, ...] }
  const attendanceMap = useMemo(() => {
    return attendanceRecords.reduce((acc, record) => {
      const classDate = record.class_sessions?.class_date;
      if (!classDate) return acc;

      const date = new Date(classDate).toISOString().split("T")[0];
      if (!acc.has(date)) {
        acc.set(date, []);
      }
      acc.get(date).push(record.status);
      return acc;
    }, new Map());
  }, [attendanceRecords]);

  // Function to apply custom class to a day tile
  const tileClassName = ({ date, view }) => {
    if (view === "month") {
      const dateString = date.toISOString().split("T")[0];
      const statuses = attendanceMap.get(dateString);

      if (statuses && statuses.length > 0) {
        // Priority: Absent > Late > Present
        if (statuses.includes("absent")) return "calendar-absent";
        if (statuses.includes("late")) return "calendar-late";
        if (statuses.some((s) => s === "present")) return "calendar-present";
      }
    }
    return null;
  };

  return (
    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-inner">
      <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
        <CalendarIcon className="w-4 h-4" />
        Attendance Overview by Date (Highest priority status shown)
      </h4>
      <style jsx global>{`
        /* Custom styles for the calendar view */
        .react-calendar {
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
        }
        .react-calendar__tile {
          position: relative;
          padding: 10px 6px;
        }
        .calendar-present {
          background-color: #d1fae5 !important; /* emerald-100 */
        }
        .calendar-absent {
          background-color: #fee2e2 !important; /* rose-100 */
        }
        .calendar-late {
          background-color: #fef3c7 !important; /* amber-100 */
        }
        .react-calendar__tile.calendar-absent abbr,
        .react-calendar__tile.calendar-late abbr,
        .react-calendar__tile.calendar-present abbr {
          font-weight: 700;
        }
      `}</style>
      <Calendar tileClassName={tileClassName} className="w-full border-none p-2" />
    </div>
  );
}
