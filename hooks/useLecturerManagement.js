/**
 * @file useLecturerManagement.js
 * @location cobot-plus-fyp/hooks/useLecturerManagement.js
 * 
 * @description
 * Custom hook for lecturer management with CRUD operations.
 * Supports separate staff_id field that is editable.
 */

import { useState, useEffect, useCallback } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { toast } from "react-toastify";

/**
 * Custom hook for lecturer management with CRUD operations.
 */
export function useLecturerManagement() {
    const supabase = useSupabaseClient();

    const [lecturers, setLecturers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        staffId: "",
        name: "",
        email: "",
        department: "",
    });

    // Fetch all lecturers
    const fetchLecturers = useCallback(async () => {
        if (!supabase) return;

        setLoading(true);
        const { data, error } = await supabase
            .from("lecturers")
            .select("id, staff_id, name, email, department")
            .order("name", { ascending: true });

        if (error) {
            toast.error("Failed to load lecturers: " + error.message);
        } else {
            setLecturers(data || []);
        }
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchLecturers();
    }, [fetchLecturers]);

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
        if (!formData.name || !formData.email) {
            toast.error("Name and Email are required.");
            return;
        }

        const payload = {
            staff_id: formData.staffId.trim() || null,
            name: formData.name.trim(),
            email: formData.email.trim().toLowerCase(),
            department: formData.department.trim() || null,
        };

        let error;
        if (editingId) {
            // Update existing lecturer - can update staff_id
            ({ error } = await supabase
                .from("lecturers")
                .update(payload)
                .eq("id", editingId));
        } else {
            // Check if email already exists
            const { data: existingEmail } = await supabase
                .from("lecturers")
                .select("id")
                .eq("email", payload.email)
                .maybeSingle();

            if (existingEmail) {
                toast.error("A lecturer with this email already exists.");
                return;
            }

            // Check if staff_id already exists (if provided)
            if (payload.staff_id) {
                const { data: existingStaffId } = await supabase
                    .from("lecturers")
                    .select("id")
                    .eq("staff_id", payload.staff_id)
                    .maybeSingle();

                if (existingStaffId) {
                    toast.error("A lecturer with this Staff ID already exists.");
                    return;
                }
            }

            // Insert new lecturer - UUID auto-generated, staff_id is separate
            ({ error } = await supabase.from("lecturers").insert([payload]));
        }

        if (error) {
            toast.error(`Failed to ${editingId ? "update" : "add"} lecturer: ${error.message}`);
        } else {
            toast.success(`Lecturer ${editingId ? "updated" : "added"} successfully!`);
            resetForm();
            fetchLecturers();
        }
    }, [supabase, formData, editingId, fetchLecturers]);

    // Reset form to initial state
    const resetForm = useCallback(() => {
        setFormData({
            staffId: "",
            name: "",
            email: "",
            department: "",
        });
        setEditingId(null);
    }, []);

    // Start editing a lecturer
    const startEdit = useCallback((lecturer) => {
        setFormData({
            staffId: lecturer.staff_id || "",
            name: lecturer.name || "",
            email: lecturer.email || "",
            department: lecturer.department || "",
        });
        setEditingId(lecturer.id);
    }, []);

    // Delete a lecturer
    const handleDelete = useCallback(async (id) => {
        if (!supabase) return;

        const confirmed = window.confirm(
            "Are you sure you want to delete this lecturer? This may affect courses and sections assigned to them."
        );
        if (!confirmed) return;

        const { error } = await supabase.from("lecturers").delete().eq("id", id);
        if (error) {
            if (error.message.includes("violates foreign key")) {
                toast.error("Cannot delete: This lecturer is assigned to courses or sections.");
            } else {
                toast.error("Failed to delete lecturer: " + error.message);
            }
        } else {
            toast.success("Lecturer deleted successfully!");
            fetchLecturers();
        }
    }, [supabase, fetchLecturers]);

    return {
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
