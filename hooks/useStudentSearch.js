import { useState, useCallback } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

/**
 * Custom hook for student search and attendance record retrieval.
 * Used in student-view page for looking up individual student records.
 * 
 * @returns {{
 *   matricNo: string,
 *   setMatricNo: Function,
 *   studentData: Object | null,
 *   attendanceRecords: Array,
 *   totalAbsences: number,
 *   loading: boolean,
 *   message: string,
 *   handleSearch: Function
 * }}
 */
export function useStudentSearch() {
    const supabase = useSupabaseClient();

    const [matricNo, setMatricNo] = useState("");
    const [studentData, setStudentData] = useState(null);
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [totalAbsences, setTotalAbsences] = useState(0);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const handleSearch = useCallback(async (e) => {
        e?.preventDefault();
        setMessage("");
        setLoading(true);
        setStudentData(null);
        setAttendanceRecords([]);
        setTotalAbsences(0);

        if (!supabase) {
            setMessage("❌ Database connection not available.");
            setLoading(false);
            return;
        }

        const trimmedMatricNo = matricNo.trim();
        if (!trimmedMatricNo) {
            setMessage("⚠️ Please enter your Matric No.");
            setLoading(false);
            return;
        }

        try {
            // 1. Find Student by matric_no
            const { data: student, error: studentError } = await supabase
                .from("students")
                .select("id, name, nickname, matric_no, email")
                .eq("matric_no", trimmedMatricNo)
                .single();

            if (studentError || !student) {
                if (studentError && studentError.code !== "PGRST116") {
                    console.error("Student Fetch Error:", studentError);
                }
                setMessage(`❌ Error: Student with Matric No. ${trimmedMatricNo} not found.`);
                setLoading(false);
                return;
            }

            setStudentData(student);

            // 2. Fetch ALL attendance records for the student
            const { data: records, error: recordsError } = await supabase
                .from("attendance_records")
                .select(`
          status,
          timestamp,
          class_sessions!inner ( 
            class_date,
            sections (
              name,
              courses ( code, name )
            )
          )
        `)
                .eq("student_id", student.id)
                .order("timestamp", { ascending: false });

            if (recordsError) {
                console.error("Attendance Records Fetch Error:", recordsError.message);
                setMessage(`❌ An error occurred while fetching attendance records: ${recordsError.message}`);
                setLoading(false);
                return;
            }

            const recordsArray = records || [];
            const calculatedAbsences = recordsArray.filter((r) => r.status === "absent").length;

            setAttendanceRecords(recordsArray);
            setTotalAbsences(calculatedAbsences);
            setMessage(`✅ Found ${recordsArray.length} attendance records.`);

        } catch (error) {
            console.error("Student View Catch Error:", error);
            setMessage("❌ An unexpected internal error occurred while fetching data.");
        } finally {
            setLoading(false);
        }
    }, [supabase, matricNo]);

    return {
        matricNo,
        setMatricNo,
        studentData,
        attendanceRecords,
        totalAbsences,
        loading,
        message,
        handleSearch,
    };
}
