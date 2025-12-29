/**
 * @file useStudentSearch.js
 * @location cobot-plus-fyp/hooks/useStudentSearch.js
 * 
 * @description
 * Custom hook for searching students and retrieving attendance records.
 * Supports both manual search (admin) and auto-load mode (logged-in student).
 * Includes per-class grouping and summaries for multi-class students.
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { useSupabaseClient, useSession } from "@supabase/auth-helpers-react";

/**
 * Custom hook for student search and attendance record retrieval.
 * Supports both manual search (admin) and auto-load (student).
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoLoad - If true, auto-fetch logged-in student's records
 * @returns {Object} Student data, attendance records, and per-class groupings
 */
export function useStudentSearch(options = {}) {
    const { autoLoad = false } = options;
    const supabase = useSupabaseClient();
    const session = useSession();

    const [matricNo, setMatricNo] = useState("");
    const [studentData, setStudentData] = useState(null);
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [totalAbsences, setTotalAbsences] = useState(0);
    const [totalPresent, setTotalPresent] = useState(0);
    const [totalLate, setTotalLate] = useState(0);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [isAutoLoaded, setIsAutoLoaded] = useState(false);

    // Per-class filtering state
    const [selectedClass, setSelectedClass] = useState("all");

    // Compute enrolled classes from attendance records
    const enrolledClasses = useMemo(() => {
        const classMap = new Map();
        attendanceRecords.forEach(record => {
            const section = record.class_sessions?.sections;
            const course = section?.courses;
            if (section && !classMap.has(section.id)) {
                classMap.set(section.id, {
                    id: section.id,
                    name: section.name,
                    courseCode: course?.code || "N/A",
                    courseName: course?.name || "N/A",
                    displayName: `${course?.code || "N/A"} - ${section.name}`,
                });
            }
        });
        return Array.from(classMap.values());
    }, [attendanceRecords]);

    // Group records by class (section_id)
    const recordsByClass = useMemo(() => {
        const grouped = {};
        attendanceRecords.forEach(record => {
            const sectionId = record.class_sessions?.section_id;
            if (sectionId) {
                if (!grouped[sectionId]) {
                    grouped[sectionId] = [];
                }
                grouped[sectionId].push(record);
            }
        });
        return grouped;
    }, [attendanceRecords]);

    // Compute per-class summaries
    const classSummaries = useMemo(() => {
        return enrolledClasses.map(cls => {
            const records = recordsByClass[cls.id] || [];
            const present = records.filter(r => r.status === "present").length;
            const late = records.filter(r => r.status === "late").length;
            const absent = records.filter(r => r.status === "absent").length;
            const total = records.length;
            const attended = present + late;
            const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;

            // Determine status based on absences
            let statusLabel = "Good";
            let statusColor = "emerald";
            if (absent >= 6) {
                statusLabel = "Barred";
                statusColor = "rose";
            } else if (absent >= 3) {
                statusLabel = "Warning";
                statusColor = "amber";
            }

            return {
                ...cls,
                present,
                late,
                absent,
                total,
                percentage,
                statusLabel,
                statusColor,
            };
        });
    }, [enrolledClasses, recordsByClass]);

    // Filter records based on selected class
    const filteredRecords = useMemo(() => {
        if (selectedClass === "all") {
            return attendanceRecords;
        }
        return recordsByClass[selectedClass] || [];
    }, [selectedClass, attendanceRecords, recordsByClass]);

    // Calculate filtered stats
    const filteredStats = useMemo(() => {
        const present = filteredRecords.filter(r => r.status === "present").length;
        const late = filteredRecords.filter(r => r.status === "late").length;
        const absent = filteredRecords.filter(r => r.status === "absent").length;
        return { present, late, absent, total: filteredRecords.length };
    }, [filteredRecords]);

    // Fetch attendance records helper
    const fetchAttendanceForStudent = useCallback(async (student) => {
        const { data: records, error: recordsError } = await supabase
            .from("attendance_records")
            .select(`
                id,
                status,
                timestamp,
                class_session_id,
                class_sessions!inner ( 
                    id,
                    class_date,
                    section_id,
                    sections (
                        id,
                        name,
                        courses ( code, name )
                    )
                )
            `)
            .eq("student_id", student.id)
            .order("timestamp", { ascending: false });

        if (recordsError) {
            throw new Error(recordsError.message);
        }

        const recordsArray = records || [];
        const absences = recordsArray.filter((r) => r.status === "absent").length;
        const present = recordsArray.filter((r) => r.status === "present").length;
        const late = recordsArray.filter((r) => r.status === "late").length;

        setStudentData(student);
        setAttendanceRecords(recordsArray);
        setTotalAbsences(absences);
        setTotalPresent(present);
        setTotalLate(late);
        setSelectedClass("all"); // Reset filter

        return recordsArray;
    }, [supabase]);

    // Auto-load for logged-in students
    useEffect(() => {
        if (!autoLoad || !session?.user?.id || !supabase) return;

        const autoFetch = async () => {
            setLoading(true);
            setMessage("");

            try {
                // Get student_id from profile
                const { data: profile, error: profileError } = await supabase
                    .from("profiles")
                    .select("student_id, matric_no")
                    .eq("id", session.user.id)
                    .single();

                if (profileError || !profile?.student_id) {
                    setMessage("⚠️ Your account is not linked to a student record.");
                    setLoading(false);
                    return;
                }

                // Fetch student data
                const { data: student, error: studentError } = await supabase
                    .from("students")
                    .select("id, name, nickname, matric_no, email")
                    .eq("id", profile.student_id)
                    .single();

                if (studentError || !student) {
                    setMessage("❌ Could not find your student record.");
                    setLoading(false);
                    return;
                }

                await fetchAttendanceForStudent(student);
                setIsAutoLoaded(true);
                setMessage("");
            } catch (error) {
                console.error("Auto-load error:", error);
                setMessage("❌ An error occurred while loading your records.");
            } finally {
                setLoading(false);
            }
        };

        autoFetch();
    }, [autoLoad, session, supabase, fetchAttendanceForStudent]);

    // Manual search by matric number
    const handleSearch = useCallback(async (e) => {
        e?.preventDefault();
        setMessage("");
        setLoading(true);
        setStudentData(null);
        setAttendanceRecords([]);
        setTotalAbsences(0);
        setTotalPresent(0);
        setTotalLate(0);
        setIsAutoLoaded(false);
        setSelectedClass("all");

        if (!supabase) {
            setMessage("❌ Database connection not available.");
            setLoading(false);
            return;
        }

        const trimmedMatricNo = matricNo.trim();
        if (!trimmedMatricNo) {
            setMessage("⚠️ Please enter a Matric No.");
            setLoading(false);
            return;
        }

        try {
            // Find Student by matric_no
            const { data: student, error: studentError } = await supabase
                .from("students")
                .select("id, name, nickname, matric_no, email")
                .eq("matric_no", trimmedMatricNo)
                .single();

            if (studentError || !student) {
                if (studentError && studentError.code !== "PGRST116") {
                    console.error("Student Fetch Error:", studentError);
                }
                setMessage(`❌ Student with Matric No. "${trimmedMatricNo}" not found.`);
                setLoading(false);
                return;
            }

            const records = await fetchAttendanceForStudent(student);
            setMessage(`✅ Found ${records.length} attendance records.`);
        } catch (error) {
            console.error("Student View Catch Error:", error);
            setMessage("❌ An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    }, [supabase, matricNo, fetchAttendanceForStudent]);

    return {
        matricNo,
        setMatricNo,
        studentData,
        attendanceRecords,
        totalAbsences,
        totalPresent,
        totalLate,
        loading,
        message,
        handleSearch,
        isAutoLoaded,
        // Per-class features
        selectedClass,
        setSelectedClass,
        enrolledClasses,
        recordsByClass,
        classSummaries,
        filteredRecords,
        filteredStats,
    };
}

