import { useState, useCallback, useEffect } from "react";
import { useSupabaseClient, useSession } from "@supabase/auth-helpers-react";

/**
 * Custom hook for student search and attendance record retrieval.
 * Supports both manual search (admin) and auto-load (student).
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoLoad - If true, auto-fetch logged-in student's records
 * @returns {{
 *   matricNo: string,
 *   setMatricNo: Function,
 *   studentData: Object | null,
 *   attendanceRecords: Array,
 *   totalAbsences: number,
 *   totalPresent: number,
 *   totalLate: number,
 *   loading: boolean,
 *   message: string,
 *   handleSearch: Function,
 *   isAutoLoaded: boolean
 * }}
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
    };
}
