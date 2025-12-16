import { useState, useEffect, useCallback } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { toast } from "react-toastify";

/**
 * Custom hook for section/course management with CRUD operations.
 * 
 * @returns {{
 *   sections: Array,
 *   courses: Array,
 *   lecturers: Array,
 *   formData: Object,
 *   editingId: number | null,
 *   loading: boolean,
 *   handleChange: Function,
 *   handleSubmit: Function,
 *   handleDelete: Function,
 *   handleToggleVisibility: Function,
 *   startEdit: Function,
 *   resetForm: Function
 * }}
 */
export function useSectionManagement() {
    const supabase = useSupabaseClient();

    const [sections, setSections] = useState([]);
    const [courses, setCourses] = useState([]);
    const [lecturers, setLecturers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        course_id: "",
        lecturer_id: "",
    });

    const fetchLookups = useCallback(async () => {
        if (!supabase) return;

        const [lecturerRes, courseRes] = await Promise.all([
            supabase.from("lecturers").select("id, name"),
            supabase.from("courses").select("id, code, name"),
        ]);

        setLecturers(lecturerRes.data || []);
        setCourses(courseRes.data || []);
    }, [supabase]);

    const fetchSections = useCallback(async () => {
        if (!supabase) return;

        setLoading(true);
        const { data, error } = await supabase
            .from("sections")
            .select(`
        id, name, course_id, lecturer_id, is_hidden_from_analysis,
        courses(code, name),
        lecturers(name)
      `)
            .order("id", { ascending: true });

        if (error) {
            toast.error("Failed to load sections: " + error.message);
        } else {
            setSections(data || []);
        }
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchLookups();
        fetchSections();
    }, [fetchLookups, fetchSections]);

    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    }, []);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        if (!supabase) return;

        const payload = {
            name: formData.name,
            course_id: formData.course_id || null,
            lecturer_id: formData.lecturer_id || null,
        };

        let error;
        if (editingId) {
            ({ error } = await supabase.from("sections").update(payload).eq("id", editingId));
        } else {
            ({ error } = await supabase.from("sections").insert([payload]));
        }

        if (error) {
            toast.error(`Failed to ${editingId ? "update" : "add"} section: ${error.message}`);
        } else {
            toast.success(`Section ${editingId ? "updated" : "added"} successfully!`);
            resetForm();
            fetchSections();
        }
    }, [supabase, formData, editingId, fetchSections]);

    const resetForm = useCallback(() => {
        setFormData({ name: "", course_id: "", lecturer_id: "" });
        setEditingId(null);
    }, []);

    const startEdit = useCallback((section) => {
        setFormData({
            name: section.name,
            course_id: section.course_id || "",
            lecturer_id: section.lecturer_id || "",
        });
        setEditingId(section.id);
    }, []);

    const handleDelete = useCallback(async (id) => {
        if (!supabase) return;

        const confirmed = window.confirm("Are you sure you want to delete this section?");
        if (!confirmed) return;

        const { error } = await supabase.from("sections").delete().eq("id", id);
        if (error) {
            toast.error("Failed to delete section: " + error.message);
        } else {
            toast.success("Section deleted successfully!");
            fetchSections();
        }
    }, [supabase, fetchSections]);

    const handleToggleVisibility = useCallback(async (section) => {
        if (!supabase) return;

        const newValue = !section.is_hidden_from_analysis;
        const { error } = await supabase
            .from("sections")
            .update({ is_hidden_from_analysis: newValue })
            .eq("id", section.id);

        if (error) {
            toast.error("Failed to update visibility: " + error.message);
        } else {
            toast.success(`Section ${newValue ? "hidden from" : "visible in"} analysis.`);
            fetchSections();
        }
    }, [supabase, fetchSections]);

    return {
        sections,
        courses,
        lecturers,
        formData,
        editingId,
        loading,
        handleChange,
        handleSubmit,
        handleDelete,
        handleToggleVisibility,
        startEdit,
        resetForm,
    };
}
