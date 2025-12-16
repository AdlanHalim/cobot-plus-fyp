import { useState, useEffect, useCallback } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { toast } from "react-toastify";

/**
 * Custom hook for student management including CRUD and enrollment operations.
 * 
 * @returns {{
 *   students: Array,
 *   courses: Array,
 *   sections: Array,
 *   loading: boolean,
 *   selectedStudent: Object | null,
 *   studentEnrollments: Array,
 *   isModalOpen: boolean,
 *   fetchStudents: Function,
 *   openManageCourses: Function,
 *   closeModal: Function,
 *   toggleEnrollment: Function,
 *   saveEnrollments: Function
 * }}
 */
export function useStudentManagement() {
    const supabase = useSupabaseClient();

    const [students, setStudents] = useState([]);
    const [courses, setCourses] = useState([]);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentEnrollments, setStudentEnrollments] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchStudents = useCallback(async () => {
        if (!supabase) return;

        setLoading(true);
        const { data, error } = await supabase
            .from("students")
            .select(`
        id, name, nickname, email, matric_no,
        student_section_enrollments (
          section_id,
          sections ( 
            name, 
            courses ( code ) 
          )
        )
      `)
            .order("name", { ascending: true });

        if (error) {
            toast.error("Failed to load students: " + error.message);
            console.error(error);
        } else {
            setStudents(data || []);
        }
        setLoading(false);
    }, [supabase]);

    const fetchCourses = useCallback(async () => {
        if (!supabase) return;
        const { data } = await supabase.from("courses").select("id, code, name");
        setCourses(data || []);
    }, [supabase]);

    const fetchSections = useCallback(async () => {
        if (!supabase) return;
        const { data } = await supabase.from("sections").select("id, name, course_id, courses(code)");
        setSections(data || []);
    }, [supabase]);

    useEffect(() => {
        fetchStudents();
        fetchCourses();
        fetchSections();
    }, [fetchStudents, fetchCourses, fetchSections]);

    const openManageCourses = useCallback(async (student) => {
        setSelectedStudent(student);

        // Fetch current enrollments
        const { data } = await supabase
            .from("student_section_enrollments")
            .select("section_id")
            .eq("student_id", student.id);

        setStudentEnrollments(data?.map((e) => e.section_id) || []);
        setIsModalOpen(true);
    }, [supabase]);

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        setSelectedStudent(null);
        setStudentEnrollments([]);
    }, []);

    const toggleEnrollment = useCallback((sectionId) => {
        setStudentEnrollments((prev) =>
            prev.includes(sectionId)
                ? prev.filter((id) => id !== sectionId)
                : [...prev, sectionId]
        );
    }, []);

    const saveEnrollments = useCallback(async () => {
        if (!selectedStudent || !supabase) return;

        // Delete existing enrollments
        await supabase
            .from("student_section_enrollments")
            .delete()
            .eq("student_id", selectedStudent.id);

        // Insert new enrollments
        if (studentEnrollments.length > 0) {
            const { error } = await supabase
                .from("student_section_enrollments")
                .insert(
                    studentEnrollments.map((sectionId) => ({
                        student_id: selectedStudent.id,
                        section_id: sectionId,
                    }))
                );

            if (error) {
                toast.error("Failed to save enrollments: " + error.message);
                return;
            }
        }

        toast.success("Enrollments updated successfully!");
        closeModal();
        fetchStudents();
    }, [selectedStudent, studentEnrollments, supabase, closeModal, fetchStudents]);

    return {
        students,
        courses,
        sections,
        loading,
        selectedStudent,
        studentEnrollments,
        isModalOpen,
        fetchStudents,
        openManageCourses,
        closeModal,
        toggleEnrollment,
        saveEnrollments,
    };
}
