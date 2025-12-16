import { useState, useEffect, useCallback } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

const ATTENDANCE_GOAL = 80;

/**
 * Custom hook for fetching and managing attendance analysis data.
 * Includes late tracking and punctuality metrics.
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
 *   punctualityScore: number,
 *   totalStudents: number,
 *   trendDifference: number,
 *   statusBreakdown: { present: number, late: number, absent: number },
 *   chronicLate: Array,
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
    const [punctualityScore, setPunctualityScore] = useState(0);
    const [totalStudents, setTotalStudents] = useState(0);
    const [trendDifference, setTrendDifference] = useState(0);
    const [statusBreakdown, setStatusBreakdown] = useState({ present: 0, late: 0, absent: 0 });
    const [chronicLate, setChronicLate] = useState([]);
    const [absent3, setAbsent3] = useState([]);
    const [absent6, setAbsent6] = useState([]);
    const [absenceStatusData, setAbsenceStatusData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const resetToEmpty = useCallback(() => {
        setAttendanceData([]);
        setSections([]);
        setAverageAttendance(0);
        setPunctualityScore(0);
        setTotalStudents(0);
        setTrendDifference(0);
        setStatusBreakdown({ present: 0, late: 0, absent: 0 });
        setChronicLate([]);
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

            // Transform trend data - include late in attendance count
            const grouped = {};
            let presentCount = 0;
            let lateCount = 0;
            let absentCount = 0;

            trend?.forEach((r) => {
                const date = new Date(r.class_sessions.class_date);
                const weekIndex = Math.ceil(date.getDate() / 7);
                const weekLabel = `Wk ${weekIndex}`;

                if (!grouped[weekIndex]) {
                    grouped[weekIndex] = { weekIndex, week: weekLabel, total: 0, attended: 0, present: 0, late: 0 };
                }
                grouped[weekIndex].total += 1;

                if (r.status === "present") {
                    grouped[weekIndex].present += 1;
                    grouped[weekIndex].attended += 1;
                    presentCount++;
                } else if (r.status === "late") {
                    grouped[weekIndex].late += 1;
                    grouped[weekIndex].attended += 1;  // Late still counts as attended
                    lateCount++;
                } else {
                    absentCount++;
                }
            });

            const formattedTrend = Object.values(grouped)
                .map((w) => ({
                    week: w.week,
                    weekIndex: w.weekIndex,
                    attendance: w.total > 0 ? Math.round((w.attended / w.total) * 100) : 0,
                    present: w.present,
                    late: w.late,
                    goal: ATTENDANCE_GOAL,
                }))
                .sort((a, b) => a.weekIndex - b.weekIndex);

            setAttendanceData(formattedTrend);

            // Status Breakdown
            setStatusBreakdown({ present: presentCount, late: lateCount, absent: absentCount });

            // Summary Calculations - attendance includes both present and late
            const totalRecords = trend?.length || 0;
            const attendedRecords = presentCount + lateCount;
            const overallAverage = totalRecords > 0 ? Math.round((attendedRecords / totalRecords) * 100) : 0;
            setAverageAttendance(overallAverage);

            // Punctuality Score - % of attended students who were on-time (not late)
            const punctuality = attendedRecords > 0 ? Math.round((presentCount / attendedRecords) * 100) : 100;
            setPunctualityScore(punctuality);

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

                // --- D. Chronic Late Arrivers (3+ late) ---
                const { data: lateData, error: lateError } = await supabase
                    .from("attendance_records")
                    .select(`
                        student_id,
                        status,
                        student:student_id(id, name, nickname, email),
                        class_sessions!inner(section_id)
                    `)
                    .eq("class_sessions.section_id", targetSectionId)
                    .eq("status", "late");

                if (lateError) {
                    console.error("Late Data Fetch Error:", lateError);
                }

                // Count late occurrences per student
                const lateCountMap = {};
                (lateData || []).forEach((rec) => {
                    const sid = rec.student_id;
                    if (!lateCountMap[sid]) {
                        lateCountMap[sid] = {
                            id: sid,
                            name: rec.student?.nickname || rec.student?.name || "Unknown",
                            email: rec.student?.email || "",
                            count: 0,
                        };
                    }
                    lateCountMap[sid].count++;
                });

                // Filter to 3+ late
                const chronicLateList = Object.values(lateCountMap)
                    .filter((s) => s.count >= 3)
                    .sort((a, b) => b.count - a.count);

                setChronicLate(chronicLateList);

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
        punctualityScore,
        totalStudents,
        trendDifference,
        statusBreakdown,
        chronicLate,
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
