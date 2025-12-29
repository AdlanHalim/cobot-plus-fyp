/**
 * @file index.js
 * @location cobot-plus-fyp/hooks/index.js
 * 
 * @description
 * Barrel export file for all custom React hooks in the CObot+ Attendance System.
 * Provides a single import point for all hooks.
 * 
 * @example
 * // Import multiple hooks from single path
 * import { useUserRole, useAttendanceData, useClassSession } from "@/hooks";
 * 
 * // Instead of:
 * // import { useUserRole } from "@/hooks/useUserRole";
 * // import { useAttendanceData } from "@/hooks/useAttendanceData";
 */

// Authentication & Role Management
export { useUserRole } from "./useUserRole";           // Get current user's role and lecturer ID

// Attendance Data & Analytics
export { useAttendanceData } from "./useAttendanceData"; // Fetch attendance stats and analytics

// Student Operations
export { useStudentSearch } from "./useStudentSearch";       // Search students and view records
export { useStudentManagement } from "./useStudentManagement"; // CRUD for students and enrollments

// Course & Section Operations
export { useSectionManagement } from "./useSectionManagement"; // CRUD for sections and courses
export { useCourseManagement } from "./useCourseManagement";   // CRUD for courses
export { useLecturerManagement } from "./useLecturerManagement"; // CRUD for lecturers
export { useScheduleManagement } from "./useScheduleManagement"; // CRUD for section schedules
export { useEnrollmentManagement } from "./useEnrollmentManagement"; // Bulk enrollment via CSV

// Real-time Dashboard
export { useDashboardData } from "./useDashboardData"; // Poll Raspberry Pi for live attendance

// Class Session Control
export { useClassSession } from "./useClassSession";   // Start/end class sessions

// Excuse Management
export { useExcuseManagement } from "./useExcuseManagement"; // Submit and review excuses

// Utilities
export { useDebounce } from "./useDebounce"; // Debounce values for performance

// Data Caching (Performance)
export {
    useDataCache,
    clearAllCache,
    clearCacheByPrefix
} from "./useDataCache"; // In-memory cache for Supabase queries

