/**
 * @file useCourseManagement.js
 * @location cobot-plus-fyp/hooks/useCourseManagement.js
 * 
 * @description
 * Custom hook for course management with CRUD operations.
 * Supports custom IDs for courses.
 */

import { useState, useEffect, useCallback } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { toast } from "react-toastify";

/**
 * Custom hook for course management with CRUD operations.
 * 
 * @returns {{
 *   courses: Array,
 *   lecturers: Array,
 *   formData: Object,
 *   editingId: string | null,
 *   loading: boolean,
 *   handleChange: Function,
 *   handleSubmit: Function,
 *   handleDelete: Function,
 *   startEdit: Function,
 *   resetForm: Function
 * }}
 */
export function useCourseManagement() {
    const supabase = useSupabaseClient();

    const [courses, setCourses] = useState([]);
    const [lecturers, setLecturers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        id: "",
        code: "",
        name: "",
        credit_hour: "",
        semester: "",
        session: "",
        lecturer_id: "",
    });

    // Fetch lecturers for dropdown
    const fetchLecturers = useCallback(async () => {
        if (!supabase) return;
        const { data, error } = await supabase
            .from("lecturers")
            .select("id, name, email")
            .order("name");

        if (error) {
            console.error("Error fetching lecturers:", error);
        } else {
            setLecturers(data || []);
        }
    }, [supabase]);

    // Fetch all courses with lecturer info
    const fetchCourses = useCallback(async () => {
        if (!supabase) return;

        setLoading(true);
        const { data, error } = await supabase
            .from("courses")
            .select(`
                id, code, name, credit_hour, semester, session, lecturer_id,
                lecturers(id, name, email)
            `)
            .order("code", { ascending: true });

        if (error) {
            toast.error("Failed to load courses: " + error.message);
        } else {
            setCourses(data || []);
        }
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchLecturers();
        fetchCourses();
    }, [fetchLecturers, fetchCourses]);

    // Handle form input changes
    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    }, []);

    // Submit form (create or update)
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        if (!supabase) return;

        // Validate required fields
        if (!formData.id || !formData.code || !formData.name) {
            toast.error("Course ID, Code, and Name are required.");
            return;
        }

        const payload = {
            id: formData.id.trim(),
            code: formData.code.trim(),
            name: formData.name.trim(),
            credit_hour: formData.credit_hour ? parseInt(formData.credit_hour) : null,
            semester: formData.semester.trim() || null,
            session: formData.session.trim() || null,
            lecturer_id: formData.lecturer_id || null,
        };

        let error;
        if (editingId) {
            // Update existing course (don't update ID)
            const { id, ...updatePayload } = payload;
            ({ error } = await supabase
                .from("courses")
                .update(updatePayload)
                .eq("id", editingId));
        } else {
            // Check if ID already exists
            const { data: existing } = await supabase
                .from("courses")
                .select("id")
                .eq("id", payload.id)
                .single();

            if (existing) {
                toast.error("Course ID already exists. Please use a unique ID.");
                return;
            }

            ({ error } = await supabase.from("courses").insert([payload]));
        }

        if (error) {
            toast.error(`Failed to ${editingId ? "update" : "add"} course: ${error.message}`);
        } else {
            toast.success(`Course ${editingId ? "updated" : "added"} successfully!`);
            resetForm();
            fetchCourses();
        }
    }, [supabase, formData, editingId, fetchCourses]);

    // Reset form to initial state
    const resetForm = useCallback(() => {
        setFormData({
            id: "",
            code: "",
            name: "",
            credit_hour: "",
            semester: "",
            session: "",
            lecturer_id: "",
        });
        setEditingId(null);
    }, []);

    // Start editing a course
    const startEdit = useCallback((course) => {
        setFormData({
            id: course.id,
            code: course.code || "",
            name: course.name || "",
            credit_hour: course.credit_hour?.toString() || "",
            semester: course.semester || "",
            session: course.session || "",
            lecturer_id: course.lecturer_id || "",
        });
        setEditingId(course.id);
    }, []);

    // Delete a course
    const handleDelete = useCallback(async (id) => {
        if (!supabase) return;

        const confirmed = window.confirm(
            "Are you sure you want to delete this course? This will also delete all associated sections."
        );
        if (!confirmed) return;

        const { error } = await supabase.from("courses").delete().eq("id", id);
        if (error) {
            toast.error("Failed to delete course: " + error.message);
        } else {
            toast.success("Course deleted successfully!");
            fetchCourses();
        }
    }, [supabase, fetchCourses]);

    return {
        courses,
        lecturers,
        formData,
        editingId,
        loading,
        handleChange,
        handleSubmit,
        handleDelete,
        startEdit,
        resetForm,
    };
}
