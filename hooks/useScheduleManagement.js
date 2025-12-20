/**
 * @file useScheduleManagement.js
 * @location cobot-plus-fyp/hooks/useScheduleManagement.js
 * 
 * @description
 * Custom hook for section schedule management with CRUD operations.
 * Handles weekly class schedules (day + time slots).
 */

import { useState, useEffect, useCallback } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { toast } from "react-toastify";

const DAYS_OF_WEEK = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
];

/**
 * Custom hook for schedule management with CRUD operations.
 * 
 * @returns {{
 *   schedules: Array,
 *   sections: Array,
 *   formData: Object,
 *   editingId: number | null,
 *   loading: boolean,
 *   daysOfWeek: Array,
 *   handleChange: Function,
 *   handleSubmit: Function,
 *   handleDelete: Function,
 *   startEdit: Function,
 *   resetForm: Function
 * }}
 */
export function useScheduleManagement() {
    const supabase = useSupabaseClient();

    const [schedules, setSchedules] = useState([]);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        section_id: "",
        day_of_week: "",
        start_time: "",
        end_time: "",
    });

    // Fetch sections for dropdown
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

    // Fetch all schedules with section info
    const fetchSchedules = useCallback(async () => {
        if (!supabase) return;

        setLoading(true);
        const { data, error } = await supabase
            .from("section_schedules")
            .select(`
                id, section_id, day_of_week, start_time, end_time,
                sections(id, name, courses(code, name))
            `)
            .order("day_of_week", { ascending: true });

        if (error) {
            toast.error("Failed to load schedules: " + error.message);
        } else {
            // Sort by day of week order
            const sorted = (data || []).sort((a, b) => {
                return DAYS_OF_WEEK.indexOf(a.day_of_week) - DAYS_OF_WEEK.indexOf(b.day_of_week);
            });
            setSchedules(sorted);
        }
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchSections();
        fetchSchedules();
    }, [fetchSections, fetchSchedules]);

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
        if (!formData.section_id || !formData.day_of_week || !formData.start_time || !formData.end_time) {
            toast.error("All fields are required.");
            return;
        }

        // Validate time order
        if (formData.start_time >= formData.end_time) {
            toast.error("End time must be after start time.");
            return;
        }

        const payload = {
            section_id: formData.section_id,
            day_of_week: formData.day_of_week,
            start_time: formData.start_time,
            end_time: formData.end_time,
        };

        let error;
        if (editingId) {
            ({ error } = await supabase
                .from("section_schedules")
                .update(payload)
                .eq("id", editingId));
        } else {
            ({ error } = await supabase.from("section_schedules").insert([payload]));
        }

        if (error) {
            toast.error(`Failed to ${editingId ? "update" : "add"} schedule: ${error.message}`);
        } else {
            toast.success(`Schedule ${editingId ? "updated" : "added"} successfully!`);
            resetForm();
            fetchSchedules();
        }
    }, [supabase, formData, editingId, fetchSchedules]);

    // Reset form to initial state
    const resetForm = useCallback(() => {
        setFormData({
            section_id: "",
            day_of_week: "",
            start_time: "",
            end_time: "",
        });
        setEditingId(null);
    }, []);

    // Start editing a schedule
    const startEdit = useCallback((schedule) => {
        setFormData({
            section_id: schedule.section_id || "",
            day_of_week: schedule.day_of_week || "",
            start_time: schedule.start_time || "",
            end_time: schedule.end_time || "",
        });
        setEditingId(schedule.id);
    }, []);

    // Delete a schedule
    const handleDelete = useCallback(async (id) => {
        if (!supabase) return;

        const confirmed = window.confirm("Are you sure you want to delete this schedule?");
        if (!confirmed) return;

        const { error } = await supabase.from("section_schedules").delete().eq("id", id);
        if (error) {
            toast.error("Failed to delete schedule: " + error.message);
        } else {
            toast.success("Schedule deleted successfully!");
            fetchSchedules();
        }
    }, [supabase, fetchSchedules]);

    return {
        schedules,
        sections,
        formData,
        editingId,
        loading,
        daysOfWeek: DAYS_OF_WEEK,
        handleChange,
        handleSubmit,
        handleDelete,
        startEdit,
        resetForm,
    };
}
