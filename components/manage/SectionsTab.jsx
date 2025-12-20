/**
 * @file SectionsTab.jsx
 * @location cobot-plus-fyp/components/manage/SectionsTab.jsx
 * 
 * @description
 * Tab component for managing sections with custom ID support.
 * Provides CRUD operations for sections under courses.
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { toast } from "react-toastify";

export default function SectionsTab() {
    const supabase = useSupabaseClient();

    const [sections, setSections] = useState([]);
    const [courses, setCourses] = useState([]);
    const [lecturers, setLecturers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        id: "",
        name: "",
        course_id: "",
        lecturer_id: "",
    });
    const [search, setSearch] = useState("");
    const [formError, setFormError] = useState("");

    // Fetch lookup data
    const fetchLookups = useCallback(async () => {
        if (!supabase) return;

        const [lecturerRes, courseRes] = await Promise.all([
            supabase.from("lecturers").select("id, name"),
            supabase.from("courses").select("id, code, name"),
        ]);

        setLecturers(lecturerRes.data || []);
        setCourses(courseRes.data || []);
    }, [supabase]);

    // Fetch sections
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

    // Filter sections by search
    const filteredSections = useMemo(() => {
        return sections.filter((s) => {
            const searchLower = search.toLowerCase();
            return (
                s.name?.toLowerCase().includes(searchLower) ||
                s.id?.toLowerCase().includes(searchLower) ||
                s.courses?.code?.toLowerCase().includes(searchLower) ||
                s.lecturers?.name?.toLowerCase().includes(searchLower)
            );
        });
    }, [sections, search]);

    // Handle form input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // Submit form
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError("");

        if (!formData.id || !formData.name || !formData.course_id) {
            setFormError("Section ID, Name, and Course are required.");
            return;
        }

        const payload = {
            id: formData.id.trim(),
            name: formData.name.trim(),
            course_id: formData.course_id,
            lecturer_id: formData.lecturer_id || null,
        };

        let error;
        if (editingId) {
            const { id, ...updatePayload } = payload;
            ({ error } = await supabase
                .from("sections")
                .update(updatePayload)
                .eq("id", editingId));
        } else {
            // Check if ID exists
            const { data: existing } = await supabase
                .from("sections")
                .select("id")
                .eq("id", payload.id)
                .single();

            if (existing) {
                toast.error("Section ID already exists. Please use a unique ID.");
                return;
            }

            ({ error } = await supabase.from("sections").insert([payload]));
        }

        if (error) {
            toast.error(`Failed to ${editingId ? "update" : "add"} section: ${error.message}`);
        } else {
            toast.success(`Section ${editingId ? "updated" : "added"} successfully!`);
            resetForm();
            fetchSections();
        }
    };

    // Reset form
    const resetForm = () => {
        setFormData({ id: "", name: "", course_id: "", lecturer_id: "" });
        setEditingId(null);
        setFormError("");
    };

    // Start editing
    const startEdit = (section) => {
        setFormData({
            id: section.id,
            name: section.name || "",
            course_id: section.course_id || "",
            lecturer_id: section.lecturer_id || "",
        });
        setEditingId(section.id);
    };

    // Delete section
    const handleDelete = async (id) => {
        const confirmed = window.confirm("Delete this section? This will remove all related schedules and enrollments.");
        if (!confirmed) return;

        const { error } = await supabase.from("sections").delete().eq("id", id);
        if (error) {
            toast.error("Failed to delete section: " + error.message);
        } else {
            toast.success("Section deleted successfully!");
            fetchSections();
        }
    };

    // Toggle visibility
    const handleToggleVisibility = async (section) => {
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
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12 text-slate-500">
                Loading sections...
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Toolbar: Search + Inline Form */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="flex flex-wrap gap-2 items-center">
                    <input
                        type="text"
                        placeholder="Search sections..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 min-w-[150px] rounded-xl px-3 py-2 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-teal-400 transition text-sm"
                    />

                    {/* Form Fields */}
                    <input
                        type="text"
                        name="id"
                        placeholder="Section ID*"
                        value={formData.id}
                        onChange={handleChange}
                        disabled={!!editingId}
                        className={`w-28 rounded-xl px-2 py-1.5 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-teal-400 text-sm transition ${editingId ? "bg-slate-100 cursor-not-allowed" : ""}`}
                    />
                    <input
                        type="text"
                        name="name"
                        placeholder="Section Name*"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-24 rounded-xl px-2 py-1.5 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-teal-400 text-sm transition"
                    />
                    <select
                        name="course_id"
                        value={formData.course_id}
                        onChange={handleChange}
                        className="w-36 rounded-xl px-2 py-1.5 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-teal-400 text-sm transition"
                    >
                        <option value="">Select Course*</option>
                        {courses.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.code} - {c.name}
                            </option>
                        ))}
                    </select>
                    <select
                        name="lecturer_id"
                        value={formData.lecturer_id}
                        onChange={handleChange}
                        className="w-32 rounded-xl px-2 py-1.5 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-teal-400 text-sm transition"
                    >
                        <option value="">Lecturer (opt)</option>
                        {lecturers.map((lec) => (
                            <option key={lec.id} value={lec.id}>
                                {lec.name}
                            </option>
                        ))}
                    </select>

                    <div className="flex gap-1">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            className="px-3 py-1.5 rounded-xl text-white bg-gradient-to-r from-teal-500 to-cyan-500 hover:scale-[1.03] text-sm transition"
                        >
                            {editingId ? "Update" : "Add"}
                        </button>
                        {editingId && (
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-3 py-1.5 rounded-xl bg-slate-200/80 hover:bg-slate-300/80 text-sm transition"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </div>
                {formError && <p className="text-red-500 text-sm mt-2">{formError}</p>}
            </div>

            {/* Sections Table */}
            <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-slate-100">
                <table className="min-w-full border-collapse text-sm">
                    <thead>
                        <tr className="bg-slate-100/80 text-slate-600 uppercase tracking-wide text-xs">
                            <th className="px-3 py-2 text-left">ID</th>
                            <th className="px-3 py-2 text-left">Name</th>
                            <th className="px-3 py-2 text-left">Course</th>
                            <th className="px-3 py-2 text-center">Lecturer</th>
                            <th className="px-3 py-2 text-center">Visibility</th>
                            <th className="px-3 py-2 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSections.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="text-center py-6 text-slate-500 italic">
                                    No sections found.
                                </td>
                            </tr>
                        ) : (
                            filteredSections.map((s) => (
                                <tr key={s.id} className="border-b border-slate-100 hover:bg-sky-50/60 transition">
                                    <td className="px-3 py-2 font-mono text-xs">{s.id}</td>
                                    <td className="px-3 py-2 font-semibold">{s.name}</td>
                                    <td className="px-3 py-2">{s.courses?.code || "-"}</td>
                                    <td className="px-3 py-2 text-center">
                                        {s.lecturers?.name ? (
                                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                                {s.lecturers.name}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <button
                                            onClick={() => handleToggleVisibility(s)}
                                            title={s.is_hidden_from_analysis ? "Click to Show" : "Click to Hide"}
                                            className={`px-2 py-0.5 rounded-full text-xs font-medium transition duration-200 ${s.is_hidden_from_analysis
                                                ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
                                                : "bg-teal-100 text-teal-700 hover:bg-teal-200"
                                                }`}
                                        >
                                            {s.is_hidden_from_analysis ? "Hidden 🙈" : "Visible ✅"}
                                        </button>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <div className="flex justify-center gap-1">
                                            <button
                                                onClick={() => startEdit(s)}
                                                className="px-2 py-1 rounded-lg text-white bg-gradient-to-r from-yellow-500 to-amber-500 hover:scale-[1.05] text-xs transition"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(s.id)}
                                                className="px-2 py-1 rounded-lg text-white bg-gradient-to-r from-red-500 to-pink-500 hover:scale-[1.05] text-xs transition"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
