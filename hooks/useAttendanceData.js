/**
 * @file useAttendanceData.js
 * @location cobot-plus-fyp/hooks/useAttendanceData.js
 * 
 * @description
 * Custom hook for fetching and processing attendance analytics data.
 * Includes month filtering, late tracking, punctuality metrics, and at-risk student detection.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

const ATTENDANCE_GOAL = 80;

/**
 * Custom hook for fetching and managing attendance analysis data.
 * Supports month-based filtering with week breakdown.
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
    const [allStudentsReport, setAllStudentsReport] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Generate available months for dropdown (last 6 months + current)
    const availableMonths = useMemo(() => {
        const months = [];
        const now = new Date();
        for (let i = 0; i < 6; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
                value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
                label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                year: d.getFullYear(),
                month: d.getMonth(),
            });
        }
        return months;
    }, []);

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
        setAllStudentsReport([]);
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

            // Parse selected month (empty = all time)
            const now = new Date();
            let monthStart = null;
            let monthEnd = null;
            let isAllTime = !filters.month;
            let isCurrentMonth = false;

            if (filters.month) {
                const [year, month] = filters.month.split('-').map(Number);
                const selectedYear = year;
                const selectedMonth = month - 1; // Convert to 0-indexed
                monthStart = new Date(selectedYear, selectedMonth, 1);
                monthEnd = new Date(selectedYear, selectedMonth + 1, 0); // Last day of month
                isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth();
            }

            // --- A. Load SECTIONS Dropdown ---
            let sectionBaseQuery = supabase
                .from("sections")
                .select(`
                    id, 
                    name, 
                    course_id, 
                    lecturer_id,
                    is_hidden_from_analysis,  
                    courses!inner(code, name)
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
                courses: s.courses,
            }));
            setSections(formattedSections);

            // --- B. Attendance Trend Calculation (filtered by month if specified) ---
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

            const { data: allTrend, error: trendError } = await attendanceQuery;
            if (trendError) throw trendError;

            // Filter by date range client-side (only if month is selected)
            const trend = isAllTime
                ? (allTrend || [])
                : (allTrend || []).filter(r => {
                    const classDate = new Date(r.class_sessions.class_date);
                    return classDate >= monthStart && classDate <= (isCurrentMonth ? now : monthEnd);
                });

            // Transform trend data - group by week of month
            const grouped = {};
            let presentCount = 0;
            let lateCount = 0;
            let absentCount = 0;

            trend?.forEach((r) => {
                const date = new Date(r.class_sessions.class_date);
                const dayOfMonth = date.getDate();
                const weekOfMonth = Math.ceil(dayOfMonth / 7);
                const weekLabel = `Week ${weekOfMonth}`;

                if (!grouped[weekOfMonth]) {
                    grouped[weekOfMonth] = {
                        weekIndex: weekOfMonth,
                        week: weekLabel,
                        total: 0,
                        attended: 0,
                        present: 0,
                        late: 0,
                        isPartial: false,
                    };
                }
                grouped[weekOfMonth].total += 1;

                if (r.status === "present") {
                    grouped[weekOfMonth].present += 1;
                    grouped[weekOfMonth].attended += 1;
                    presentCount++;
                } else if (r.status === "late") {
                    grouped[weekOfMonth].late += 1;
                    grouped[weekOfMonth].attended += 1;
                    lateCount++;
                } else {
                    absentCount++;
                }
            });

            // Mark current week as partial if we're in current month
            if (isCurrentMonth) {
                const currentWeekOfMonth = Math.ceil(now.getDate() / 7);
                if (grouped[currentWeekOfMonth]) {
                    grouped[currentWeekOfMonth].isPartial = true;
                    grouped[currentWeekOfMonth].week = `Week ${currentWeekOfMonth}*`;
                }
            }

            const formattedTrend = Object.values(grouped)
                .map((w) => ({
                    week: w.week,
                    weekIndex: w.weekIndex,
                    attendance: w.total > 0 ? Math.round((w.attended / w.total) * 100) : 0,
                    present: w.present,
                    late: w.late,
                    goal: ATTENDANCE_GOAL,
                    isPartial: w.isPartial,
                }))
                .sort((a, b) => a.weekIndex - b.weekIndex);

            setAttendanceData(formattedTrend);

            // Status Breakdown
            setStatusBreakdown({ present: presentCount, late: lateCount, absent: absentCount });

            // Summary Calculations
            const totalRecords = trend?.length || 0;
            const attendedRecords = presentCount + lateCount;
            const overallAverage = totalRecords > 0 ? Math.round((attendedRecords / totalRecords) * 100) : 0;
            setAverageAttendance(overallAverage);

            // Punctuality Score
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

            // Trend Difference (this week vs last week)
            const currentWeekAvg = formattedTrend.length > 0 ? formattedTrend[formattedTrend.length - 1].attendance : 0;
            const previousWeekAvg = formattedTrend.length > 1 ? formattedTrend[formattedTrend.length - 2].attendance : 0;
            setTrendDifference(Math.round(currentWeekAvg - previousWeekAvg));

            // --- C. Generate All Students Report Data ---
            // Fetch detailed attendance per student for reports
            let reportQuery = supabase
                .from("attendance_records")
                .select(`
                    student_id,
                    status,
                    student:student_id(id, name, nickname, matric_no, email),
                    class_sessions!inner(
                        class_date,
                        section_id,
                        sections!inner(lecturer_id, is_hidden_from_analysis)
                    )
                `);

            if (isLecturerFilterNeeded) {
                reportQuery = reportQuery.eq("class_sessions.sections.lecturer_id", lecturerId);
            }
            reportQuery = reportQuery.eq("class_sessions.sections.is_hidden_from_analysis", false);

            if (filters.section) {
                reportQuery = reportQuery.eq("class_sessions.section_id", filters.section);
            }

            const { data: reportData, error: reportError } = await reportQuery;

            if (!reportError && reportData) {
                // Filter by date range (only if month is selected)
                const filteredReportData = isAllTime
                    ? reportData
                    : reportData.filter(r => {
                        const classDate = new Date(r.class_sessions.class_date);
                        return classDate >= monthStart && classDate <= (isCurrentMonth ? now : monthEnd);
                    });

                // Aggregate per student
                const studentStats = {};
                filteredReportData.forEach(rec => {
                    const sid = rec.student_id;
                    if (!studentStats[sid]) {
                        studentStats[sid] = {
                            id: sid,
                            matric_no: rec.student?.matric_no || "-",
                            name: rec.student?.nickname || rec.student?.name || "Unknown",
                            email: rec.student?.email || "",
                            present: 0,
                            late: 0,
                            absent: 0,
                            total: 0,
                        };
                    }
                    studentStats[sid].total++;
                    if (rec.status === "present") studentStats[sid].present++;
                    else if (rec.status === "late") studentStats[sid].late++;
                    else studentStats[sid].absent++;
                });

                // Calculate percentages and classify
                const studentsReport = Object.values(studentStats).map(s => {
                    const attended = s.present + s.late;
                    const percentage = s.total > 0 ? Math.round((attended / s.total) * 100) : 0;
                    let status = "Good";
                    if (s.absent >= 6) status = "Barred";
                    else if (s.absent >= 3) status = "Warning";
                    else if (s.late >= 3) status = "Chronic Late";

                    return {
                        ...s,
                        percentage,
                        status,
                    };
                }).sort((a, b) => a.name.localeCompare(b.name));

                setAllStudentsReport(studentsReport);
            }

            // --- D. Absence Lists ---
            const targetSectionId = filters.section;
            let absent3List = [];
            let absent6List = [];

            if (targetSectionId) {
                const { data: allAbsencesData, error: absDataError } = await supabase
                    .from("student_course_attendance")
                    .select(`
                        absence_count, 
                        student_id,
                        student:student_id(id, name, nickname, email, matric_no), 
                        sections!inner(courses!inner(code))
                    `)
                    .eq("section_id", targetSectionId);

                if (absDataError) {
                    console.error("Absence Data Fetch Error:", absDataError);
                }

                const safeAllAbsencesData = allAbsencesData || [];

                const mapAbsences = (data, minCount, maxCount = Infinity) =>
                    data
                        .filter((s) => s.absence_count >= minCount && s.absence_count < maxCount)
                        .map((s) => ({
                            id: s.student_id,
                            name: s.student.nickname || s.student.name,
                            matric_no: s.student.matric_no,
                            course: s.sections.courses.code,
                            section_id: targetSectionId,
                            email: s.student.email,
                            absences: s.absence_count,
                        }));

                absent3List = mapAbsences(safeAllAbsencesData, 3, 6);
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
                setChronicLate([]);
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
        allStudentsReport,
        isLoading,
        error,
        refetch: fetchData,
        setAbsent3,
        setAbsent6,
        setAbsenceStatusData,
        availableMonths,
    };
}
