import { useState, useEffect, useCallback } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

const ATTENDANCE_GOAL = 80;

/**
 * Custom hook for fetching and managing attendance analysis data.
 * 
 * @param {Object} params
 * @param {Object} params.filters - { section: string, period: string }
 * @param {string|null|false} params.lecturerId - Lecturer ID for filtering (false = admin)
 * @param {string|null} params.userRole - Current user's role
 * 
 * @returns {{
 *   attendanceData: Array,
 *   sections: Array,
 *   averageAttendance: number,
 *   totalStudents: number,
 *   trendDifference: number,
 *   absent3: Array,
 *   absent6: Array,
 *   absenceStatusData: Array,
 *   isLoading: boolean,
 *   error: Error | null,
 *   refetch: Function
 * }}
 */
export function useAttendanceData({ filters, lecturerId, userRole }) {
    const supabase = useSupabaseClient();

    const [attendanceData, setAttendanceData] = useState([]);
    const [sections, setSections] = useState([]);
    const [averageAttendance, setAverageAttendance] = useState(0);
    const [totalStudents, setTotalStudents] = useState(0);
    const [trendDifference, setTrendDifference] = useState(0);
    const [absent3, setAbsent3] = useState([]);
    const [absent6, setAbsent6] = useState([]);
    const [absenceStatusData, setAbsenceStatusData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const resetToEmpty = useCallback(() => {
        setAttendanceData([]);
        setSections([]);
        setAverageAttendance(0);
        setTotalStudents(0);
        setTrendDifference(0);
        setAbsent3([]);
        setAbsent6([]);
        setAbsenceStatusData([]);
    }, []);

    const fetchData = useCallback(async () => {
        if (!supabase) return;

        // Skip for students or loading state
        if (lecturerId === undefined || userRole === "student") return;

        // Lecturer without proper ID
        if (userRole === "lecturer" && lecturerId === null) {
            resetToEmpty();
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const isLecturerFilterNeeded = userRole === "lecturer" && lecturerId;

            // --- A. Load SECTIONS Dropdown ---
            let sectionBaseQuery = supabase
                .from("sections")
                .select(`
          id, 
          name, 
          course_id, 
          lecturer_id,
          is_hidden_from_analysis,  
          courses!inner(code)
        `);

            if (isLecturerFilterNeeded) {
                sectionBaseQuery = sectionBaseQuery.eq("lecturer_id", lecturerId);
            }
            sectionBaseQuery = sectionBaseQuery.eq("is_hidden_from_analysis", false);

            const { data: baseSections, error: sectionsError } = await sectionBaseQuery;
            if (sectionsError) throw sectionsError;

            const formattedSections = baseSections.map((s) => ({
                id: s.id,
                name: `${s.courses.code} - ${s.name}`,
                course_id: s.course_id,
            }));
            setSections(formattedSections);

            // --- B. Attendance Trend Calculation ---
            let attendanceQuery = supabase
                .from("attendance_records")
                .select(`
          status,
          class_sessions!inner(
            class_date,
            section_id,
            sections!inner(lecturer_id, is_hidden_from_analysis)
          )
        `);

            if (isLecturerFilterNeeded) {
                attendanceQuery = attendanceQuery.eq("class_sessions.sections.lecturer_id", lecturerId);
            }
            attendanceQuery = attendanceQuery.eq("class_sessions.sections.is_hidden_from_analysis", false);

            if (filters.section) {
                attendanceQuery = attendanceQuery.eq("class_sessions.section_id", filters.section);
            }

            const { data: trend, error: trendError } = await attendanceQuery;
            if (trendError) throw trendError;

            // Transform trend data
            const grouped = {};
            trend?.forEach((r) => {
                const date = new Date(r.class_sessions.class_date);
                const weekIndex = Math.ceil(date.getDate() / 7);
                const weekLabel = `Wk ${weekIndex}`;

                if (!grouped[weekIndex]) {
                    grouped[weekIndex] = { weekIndex, week: weekLabel, total: 0, present: 0 };
                }
                grouped[weekIndex].total += 1;
                if (r.status === "present") grouped[weekIndex].present += 1;
            });

            const formattedTrend = Object.values(grouped)
                .map((w) => ({
                    week: w.week,
                    weekIndex: w.weekIndex,
                    attendance: Math.round((w.present / w.total) * 100),
                    goal: ATTENDANCE_GOAL,
                }))
                .sort((a, b) => a.weekIndex - b.weekIndex);

            setAttendanceData(formattedTrend);

            // Summary Calculations
            const totalRecords = trend?.length || 0;
            const presentRecords = trend?.filter((r) => r.status === "present").length || 0;
            const overallAverage = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0;
            setAverageAttendance(overallAverage);

            // Total Students
            let studentQuery = supabase
                .from("student_section_enrollments")
                .select("student_id, sections!inner(lecturer_id, is_hidden_from_analysis)");

            if (isLecturerFilterNeeded) {
                studentQuery = studentQuery.eq("sections.lecturer_id", lecturerId);
            }
            studentQuery = studentQuery.eq("sections.is_hidden_from_analysis", false);

            if (filters.section) {
                studentQuery = studentQuery.eq("section_id", filters.section);
            }

            const { data: students } = await studentQuery;
            setTotalStudents(new Set(students?.map((s) => s.student_id)).size);

            // Trend Difference
            const currentWeekAvg = formattedTrend.length > 0 ? formattedTrend[formattedTrend.length - 1].attendance : 0;
            const previousWeekAvg = formattedTrend.length > 1 ? formattedTrend[formattedTrend.length - 2].attendance : 0;
            setTrendDifference(Math.round(currentWeekAvg - previousWeekAvg));

            // --- C. Absence Lists ---
            const targetSectionId = filters.section;
            let absent3List = [];
            let absent6List = [];

            if (targetSectionId) {
                const { data: allAbsencesData, error: absDataError } = await supabase
                    .from("student_course_attendance")
                    .select(`
            absence_count, 
            student_id,
            student:student_id(id, name, nickname, email), 
            sections!inner(courses!inner(code))
          `)
                    .eq("section_id", targetSectionId);

                if (absDataError) {
                    console.error("Absence Data Fetch Error:", absDataError);
                }

                const safeAllAbsencesData = allAbsencesData || [];

                const mapAbsences = (data, count) =>
                    data
                        .filter((s) => s.absence_count === count)
                        .map((s) => ({
                            id: s.student_id,
                            name: s.student.nickname || s.student.name,
                            course: s.sections.courses.code,
                            section_id: targetSectionId,
                            email: s.student.email,
                        }));

                absent3List = mapAbsences(safeAllAbsencesData, 3);
                absent6List = mapAbsences(safeAllAbsencesData, 6);

                setAbsenceStatusData([
                    {
                        name: "Intervention Required",
                        "3+ Absences": absent3List.length,
                        "6+ Absences": absent6List.length,
                    },
                ]);
            } else {
                setAbsenceStatusData([]);
            }

            setAbsent3(absent3List);
            setAbsent6(absent6List);

        } catch (err) {
            console.error("Fetch Error:", err);
            setError(err);
            resetToEmpty();
        } finally {
            setIsLoading(false);
        }
    }, [supabase, filters, lecturerId, userRole, resetToEmpty]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        attendanceData,
        sections,
        averageAttendance,
        totalStudents,
        trendDifference,
        absent3,
        absent6,
        absenceStatusData,
        isLoading,
        error,
        refetch: fetchData,
        setAbsent3,
        setAbsent6,
        setAbsenceStatusData,
    };
}
