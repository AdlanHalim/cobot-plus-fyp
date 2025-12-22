/**
 * @file ClassesTab.jsx
 * @location cobot-plus-fyp/components/manage/ClassesTab.jsx
 * 
 * @description
 * Unified tab for managing classes (course + section combined).
 * Creates both course and section records together as one "class" entity.
 * Example: "INFO3001 - Information Privacy - Section 1" = one class
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { toast } from "react-toastify";
import { SortableHeader, useSortableData } from "@/components/ui/SortableHeader";
import { useDebounce } from "@/hooks";

export default function ClassesTab() {
    const supabase = useSupabaseClient();

    const [classes, setClasses] = useState([]);
    const [lecturers, setLecturers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        course_code: "",     // e.g., "INFO3001"
        course_name: "",     // e.g., "Information Privacy"
        section_name: "",    // e.g., "Section 1" or "1" or "A"
        lecturer_id: "",
        credit_hour: "",
    });

    // Auto-generate Class ID from course_code + section_name
    const generateClassId = (courseCode, sectionName) => {
        const code = courseCode.trim().toUpperCase().replace(/\s+/g, "");
        const section = sectionName.trim().replace(/\s+/g, "-");
        return `${code}-${section}`;
    };
    const [search, setSearch] = useState("");
    const [formError, setFormError] = useState("");

    // Fetch lecturers for dropdown
    const fetchLecturers = useCallback(async () => {
        if (!supabase) return;
        const { data } = await supabase
            .from("lecturers")
            .select("id, name")
            .order("name");
        setLecturers(data || []);
    }, [supabase]);

    // Fetch all classes (sections with course info)
    const fetchClasses = useCallback(async () => {
        if (!supabase) return;

        setLoading(true);
        const { data, error } = await supabase
            .from("sections")
            .select(`
                id, name, course_id, lecturer_id, is_hidden_from_analysis,
                courses(id, code, name, credit_hour),
                lecturers(id, name)
            `)
            .order("id", { ascending: true });

        if (error) {
            toast.error("Failed to load classes: " + error.message);
        } else {
            setClasses(data || []);
        }
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchLecturers();
        fetchClasses();
    }, [fetchLecturers, fetchClasses]);

    // Debounce search for performance
    const debouncedSearch = useDebounce(search, 300);

    // Filter classes by debounced search
    const filteredClasses = useMemo(() => {
        const searchLower = debouncedSearch.toLowerCase();
        return classes.filter((c) => {
            const fullName = `${c.courses?.code || ""} ${c.courses?.name || ""} ${c.name || ""}`.toLowerCase();
            return (
                fullName.includes(searchLower) ||
                c.id?.toLowerCase().includes(searchLower) ||
                c.lecturers?.name?.toLowerCase().includes(searchLower)
            );
        });
    }, [classes, debouncedSearch]);

    // Sort filtered classes
    const { sortedItems: sortedClasses, sortConfig, requestSort } = useSortableData(filteredClasses);

    // Handle form input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // Submit form - creates or updates both course and section
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError("");

        // Validate required fields
        if (!formData.course_code || !formData.course_name || !formData.section_name) {
            setFormError("Course Code, Course Name, and Section Name are required.");
            return;
        }

        // Auto-generate the class ID
        const classId = generateClassId(formData.course_code, formData.section_name);

        try {
            if (editingId) {
                // EDIT MODE: Update existing class
                const existingClass = classes.find(c => c.id === editingId);
                if (!existingClass) {
                    toast.error("Class not found.");
                    return;
                }

                // Update the course
                const { error: courseError } = await supabase
                    .from("courses")
                    .update({
                        code: formData.course_code.trim(),
                        name: formData.course_name.trim(),
                        credit_hour: formData.credit_hour ? parseInt(formData.credit_hour) : null,
                    })
                    .eq("id", existingClass.course_id);

                if (courseError) {
                    toast.error("Failed to update course: " + courseError.message);
                    return;
                }

                // Update the section
                const { error: sectionError } = await supabase
                    .from("sections")
                    .update({
                        name: formData.section_name.trim(),
                        lecturer_id: formData.lecturer_id || null,
                    })
                    .eq("id", editingId);

                if (sectionError) {
                    toast.error("Failed to update section: " + sectionError.message);
                    return;
                }

                toast.success("Class updated successfully!");
            } else {
                // CREATE MODE: Create new class

                // Check if class ID already exists
                const { data: existingSection } = await supabase
                    .from("sections")
                    .select("id")
                    .eq("id", classId)
                    .single();

                if (existingSection) {
                    toast.error(`Class "${classId}" already exists. Try a different section name.`);
                    return;
                }

                // Check if course with same code exists
                const { data: existingCourse } = await supabase
                    .from("courses")
                    .select("id, code")
                    .eq("code", formData.course_code.trim())
                    .single();

                let courseId;

                if (existingCourse) {
                    // Use existing course
                    courseId = existingCourse.id;
                } else {
                    // Create new course (use course code as ID for simplicity)
                    const newCourseId = `COURSE-${formData.course_code.trim()}`;
                    const { data: newCourse, error: courseError } = await supabase
                        .from("courses")
                        .insert([{
                            id: newCourseId,
                            code: formData.course_code.trim(),
                            name: formData.course_name.trim(),
                            credit_hour: formData.credit_hour ? parseInt(formData.credit_hour) : null,
                        }])
                        .select()
                        .single();

                    if (courseError) {
                        toast.error("Failed to create course: " + courseError.message);
                        return;
                    }
                    courseId = newCourse.id;
                }

                // Create the section (class)
                const { error: sectionError } = await supabase
                    .from("sections")
                    .insert([{
                        id: classId,
                        name: formData.section_name.trim(),
                        course_id: courseId,
                        lecturer_id: formData.lecturer_id || null,
                    }]);

                if (sectionError) {
                    toast.error("Failed to create class: " + sectionError.message);
                    return;
                }

                toast.success("Class created successfully!");
            }

            resetForm();
            fetchClasses();
        } catch (err) {
            toast.error("An error occurred: " + err.message);
        }
    };

    // Reset form
    const resetForm = () => {
        setFormData({
            course_code: "",
            course_name: "",
            section_name: "",
            lecturer_id: "",
            credit_hour: "",
        });
        setEditingId(null);
        setFormError("");
    };

    // Start editing a class
    const startEdit = (cls) => {
        setFormData({
            course_code: cls.courses?.code || "",
            course_name: cls.courses?.name || "",
            section_name: cls.name || "",
            lecturer_id: cls.lecturer_id || "",
            credit_hour: cls.courses?.credit_hour?.toString() || "",
        });
        setEditingId(cls.id);
    };

    // Delete a class (section only, keeps course if other sections exist)
    const handleDelete = async (cls) => {
        const confirmed = window.confirm(
            `Delete class "${cls.courses?.code} - ${cls.name}"? This will also remove schedules and enrollments for this class.`
        );
        if (!confirmed) return;

        const { error } = await supabase.from("sections").delete().eq("id", cls.id);
        if (error) {
            toast.error("Failed to delete class: " + error.message);
        } else {
            toast.success("Class deleted successfully!");
            fetchClasses();
        }
    };

    // Toggle visibility in analysis
    const handleToggleVisibility = async (cls) => {
        const newValue = !cls.is_hidden_from_analysis;
        const { error } = await supabase
            .from("sections")
            .update({ is_hidden_from_analysis: newValue })
            .eq("id", cls.id);

        if (error) {
            toast.error("Failed to update visibility: " + error.message);
        } else {
            toast.success(`Class ${newValue ? "hidden from" : "visible in"} analysis.`);
            fetchClasses();
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12 text-slate-500">
                Loading classes...
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
                <strong>💡 Tip:</strong> A class = Course + Section. The Class ID is auto-generated from Course Code + Section Name.
                If multiple sections share the same course code, they'll be grouped under the same course automatically.
            </div>

            {/* Toolbar: Search + Inline Form */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="flex flex-wrap gap-2 items-center mb-2">
                    <input
                        type="text"
                        placeholder="Search classes..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 min-w-[150px] rounded-xl px-3 py-2 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-teal-400 transition text-sm"
                    />
                </div>

                {/* Form Fields */}
                <div className="flex flex-wrap gap-2 items-end">

                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-500">Course Code*</label>
                        <input
                            type="text"
                            name="course_code"
                            placeholder="e.g., INFO3001"
                            value={formData.course_code}
                            onChange={handleChange}
                            className="w-28 rounded-xl px-2 py-1.5 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-teal-400 text-sm transition"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-500">Course Name*</label>
                        <input
                            type="text"
                            name="course_name"
                            placeholder="e.g., Information Privacy"
                            value={formData.course_name}
                            onChange={handleChange}
                            className="w-44 rounded-xl px-2 py-1.5 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-teal-400 text-sm transition"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-500">Section*</label>
                        <input
                            type="text"
                            name="section_name"
                            placeholder="e.g., Section 1"
                            value={formData.section_name}
                            onChange={handleChange}
                            className="w-24 rounded-xl px-2 py-1.5 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-teal-400 text-sm transition"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-500">Credits</label>
                        <input
                            type="number"
                            name="credit_hour"
                            placeholder="3"
                            value={formData.credit_hour}
                            onChange={handleChange}
                            className="w-16 rounded-xl px-2 py-1.5 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-teal-400 text-sm transition"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-500">Lecturer</label>
                        <select
                            name="lecturer_id"
                            value={formData.lecturer_id}
                            onChange={handleChange}
                            className="w-36 rounded-xl px-2 py-1.5 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-teal-400 text-sm transition"
                        >
                            <option value="">Select Lecturer</option>
                            {lecturers.map((lec) => (
                                <option key={lec.id} value={lec.id}>
                                    {lec.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-1">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            className="px-4 py-1.5 rounded-xl text-white bg-gradient-to-r from-teal-500 to-cyan-500 hover:scale-[1.03] text-sm transition"
                        >
                            {editingId ? "Update" : "Add Class"}
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

            {/* Classes Table */}
            <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-slate-100">
                <table className="min-w-full border-collapse text-sm">
                    <thead>
                        <tr className="bg-slate-100/80 text-slate-600 uppercase tracking-wide text-xs">
                            <SortableHeader label="Class ID" sortKey="id" sortConfig={sortConfig} onSort={requestSort} className="px-3 py-2" />
                            <SortableHeader label="Course Code" sortKey="courses.code" sortConfig={sortConfig} onSort={requestSort} className="px-3 py-2" />
                            <SortableHeader label="Course Name" sortKey="courses.name" sortConfig={sortConfig} onSort={requestSort} className="px-3 py-2" />
                            <SortableHeader label="Section" sortKey="name" sortConfig={sortConfig} onSort={requestSort} className="px-3 py-2 text-center" />
                            <th className="px-3 py-2 text-center">Lecturer</th>
                            <th className="px-3 py-2 text-center">Visibility</th>
                            <th className="px-3 py-2 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedClasses.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="text-center py-6 text-slate-500 italic">
                                    No classes found.
                                </td>
                            </tr>
                        ) : (
                            sortedClasses.map((c) => (
                                <tr key={c.id} className="border-b border-slate-100 hover:bg-sky-50/60 transition">
                                    <td className="px-3 py-2 font-mono text-xs">{c.id}</td>
                                    <td className="px-3 py-2 font-semibold">{c.courses?.code || "-"}</td>
                                    <td className="px-3 py-2">{c.courses?.name || "-"}</td>
                                    <td className="px-3 py-2 text-center">
                                        <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                            {c.name}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        {c.lecturers?.name ? (
                                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                                {c.lecturers.name}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <button
                                            onClick={() => handleToggleVisibility(c)}
                                            title={c.is_hidden_from_analysis ? "Click to Show" : "Click to Hide"}
                                            className={`px-2 py-0.5 rounded-full text-xs font-medium transition duration-200 ${c.is_hidden_from_analysis
                                                ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
                                                : "bg-teal-100 text-teal-700 hover:bg-teal-200"
                                                }`}
                                        >
                                            {c.is_hidden_from_analysis ? "Hidden 🙈" : "Visible ✅"}
                                        </button>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <div className="flex justify-center gap-1">
                                            <button
                                                onClick={() => startEdit(c)}
                                                className="px-2 py-1 rounded-lg text-white bg-gradient-to-r from-yellow-500 to-amber-500 hover:scale-[1.05] text-xs transition"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(c)}
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
