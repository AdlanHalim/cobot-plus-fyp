/**
 * @file useEnrollmentManagement.js
 * @location cobot-plus-fyp/hooks/useEnrollmentManagement.js
 * 
 * @description
 * Custom hook for student enrollment management with CSV bulk upload.
 * Handles validation and batch insertion of student-section enrollments.
 */

import { useState, useEffect, useCallback } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { toast } from "react-toastify";

/**
 * Custom hook for enrollment management with CSV bulk upload.
 * 
 * @returns {{
 *   enrollments: Array,
 *   sections: Array,
 *   students: Array,
 *   loading: boolean,
 *   uploading: boolean,
 *   csvData: Array,
 *   csvErrors: Array,
 *   handleCSVUpload: Function,
 *   confirmBulkEnroll: Function,
 *   clearCSV: Function,
 *   handleDelete: Function,
 *   downloadSampleCSV: Function,
 *   filterBySection: Function,
 *   selectedSection: string
 * }}
 */
export function useEnrollmentManagement() {
    const supabase = useSupabaseClient();

    const [enrollments, setEnrollments] = useState([]);
    const [sections, setSections] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [csvData, setCsvData] = useState([]);
    const [csvErrors, setCsvErrors] = useState([]);
    const [selectedSection, setSelectedSection] = useState("");

    // Fetch sections for dropdown and validation
    const fetchSections = useCallback(async () => {
        if (!supabase) return;
        const { data, error } = await supabase
            .from("sections")
            .select(`
                id, name, course_id,
                courses(code, name)
            `)
            .order("name");

        if (error) {
            console.error("Error fetching sections:", error);
        } else {
            setSections(data || []);
        }
    }, [supabase]);

    // Fetch students for validation
    const fetchStudents = useCallback(async () => {
        if (!supabase) return;
        const { data, error } = await supabase
            .from("students")
            .select("id, name, matric_no")
            .order("name");

        if (error) {
            console.error("Error fetching students:", error);
        } else {
            setStudents(data || []);
        }
    }, [supabase]);

    // Fetch all enrollments with student and section info
    const fetchEnrollments = useCallback(async () => {
        if (!supabase) return;

        setLoading(true);
        const { data, error } = await supabase
            .from("student_section_enrollments")
            .select(`
                id, student_id, section_id,
                students(id, name, matric_no),
                sections(id, name, courses(code, name))
            `)
            .order("id", { ascending: false });

        if (error) {
            toast.error("Failed to load enrollments: " + error.message);
        } else {
            setEnrollments(data || []);
        }
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchSections();
        fetchStudents();
        fetchEnrollments();
    }, [fetchSections, fetchStudents, fetchEnrollments]);

    // Parse CSV file
    const handleCSVUpload = useCallback((file) => {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const lines = text.split("\n").filter(line => line.trim());

            if (lines.length < 2) {
                toast.error("CSV file is empty or has no data rows.");
                return;
            }

            // Parse header
            const header = lines[0].toLowerCase().split(",").map(h => h.trim());
            const studentIdIndex = header.indexOf("student_id");
            const sectionIdIndex = header.indexOf("section_id");

            if (studentIdIndex === -1 || sectionIdIndex === -1) {
                toast.error("CSV must have 'student_id' and 'section_id' columns.");
                return;
            }

            // Parse data rows
            const parsed = [];
            const errors = [];

            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(",").map(v => v.trim());
                const studentId = values[studentIdIndex];
                const sectionId = values[sectionIdIndex];

                if (!studentId || !sectionId) {
                    errors.push({ row: i + 1, error: "Missing student_id or section_id" });
                    continue;
                }

                // Validate student exists
                const student = students.find(s => s.id === studentId);
                if (!student) {
                    errors.push({ row: i + 1, error: `Student ID '${studentId}' not found` });
                    continue;
                }

                // Validate section exists
                const section = sections.find(s => s.id === sectionId);
                if (!section) {
                    errors.push({ row: i + 1, error: `Section ID '${sectionId}' not found` });
                    continue;
                }

                // Check for duplicates in current data
                const isDuplicate = parsed.some(
                    p => p.student_id === studentId && p.section_id === sectionId
                );
                if (isDuplicate) {
                    errors.push({ row: i + 1, error: "Duplicate entry in CSV" });
                    continue;
                }

                parsed.push({
                    student_id: studentId,
                    section_id: sectionId,
                    studentName: student.name,
                    studentMatric: student.matric_no,
                    sectionName: section.name,
                    courseCode: section.courses?.code || "",
                });
            }

            setCsvData(parsed);
            setCsvErrors(errors);

            if (parsed.length > 0) {
                toast.success(`Parsed ${parsed.length} valid enrollments.`);
            }
            if (errors.length > 0) {
                toast.warning(`${errors.length} rows have errors.`);
            }
        };

        reader.readAsText(file);
    }, [students, sections]);

    // Confirm and insert bulk enrollments
    const confirmBulkEnroll = useCallback(async () => {
        if (!supabase || csvData.length === 0) return;

        setUploading(true);

        // Prepare payload (only student_id and section_id)
        const payload = csvData.map(row => ({
            student_id: row.student_id,
            section_id: row.section_id,
        }));

        // Filter out existing enrollments
        const existingSet = new Set(
            enrollments.map(e => `${e.student_id}-${e.section_id}`)
        );
        const newPayload = payload.filter(
            p => !existingSet.has(`${p.student_id}-${p.section_id}`)
        );

        if (newPayload.length === 0) {
            toast.info("All enrollments already exist. No new enrollments added.");
            setUploading(false);
            return;
        }

        const { error } = await supabase
            .from("student_section_enrollments")
            .insert(newPayload);

        if (error) {
            toast.error("Failed to bulk enroll: " + error.message);
        } else {
            toast.success(`Successfully enrolled ${newPayload.length} students!`);
            clearCSV();
            fetchEnrollments();
        }

        setUploading(false);
    }, [supabase, csvData, enrollments, fetchEnrollments]);

    // Clear CSV data
    const clearCSV = useCallback(() => {
        setCsvData([]);
        setCsvErrors([]);
    }, []);

    // Delete single enrollment
    const handleDelete = useCallback(async (id) => {
        if (!supabase) return;

        const confirmed = window.confirm("Are you sure you want to remove this enrollment?");
        if (!confirmed) return;

        const { error } = await supabase
            .from("student_section_enrollments")
            .delete()
            .eq("id", id);

        if (error) {
            toast.error("Failed to delete enrollment: " + error.message);
        } else {
            toast.success("Enrollment removed successfully!");
            fetchEnrollments();
        }
    }, [supabase, fetchEnrollments]);

    // Download sample CSV
    const downloadSampleCSV = useCallback(() => {
        const sampleContent = `student_id,section_id
STU001,SEC-CS101-A
STU002,SEC-CS101-A
STU003,SEC-CS101-B`;

        const blob = new Blob([sampleContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "enrollment_sample.csv";
        a.click();
        window.URL.revokeObjectURL(url);
    }, []);

    // Filter enrollments by section
    const filterBySection = useCallback((sectionId) => {
        setSelectedSection(sectionId);
    }, []);

    // Get filtered enrollments
    const filteredEnrollments = selectedSection
        ? enrollments.filter(e => e.section_id === selectedSection)
        : enrollments;

    return {
        enrollments: filteredEnrollments,
        allEnrollments: enrollments,
        sections,
        students,
        loading,
        uploading,
        csvData,
        csvErrors,
        handleCSVUpload,
        confirmBulkEnroll,
        clearCSV,
        handleDelete,
        downloadSampleCSV,
        filterBySection,
        selectedSection,
    };
}
