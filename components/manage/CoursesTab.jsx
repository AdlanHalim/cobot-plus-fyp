/**
 * @file CoursesTab.jsx
 * @location cobot-plus-fyp/components/manage/CoursesTab.jsx
 * 
 * @description
 * Tab component for managing courses with custom ID support.
 * Provides CRUD operations for courses with lecturer assignment.
 */

import { useState, useMemo } from "react";
import { useCourseManagement } from "@/hooks";

export default function CoursesTab() {
    const {
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
    } = useCourseManagement();

    const [search, setSearch] = useState("");
    const [formError, setFormError] = useState("");

    // Filter courses by search
    const filteredCourses = useMemo(() => {
        return courses.filter((c) => {
            const searchLower = search.toLowerCase();
            return (
                c.code?.toLowerCase().includes(searchLower) ||
                c.name?.toLowerCase().includes(searchLower) ||
                c.id?.toLowerCase().includes(searchLower)
            );
        });
    }, [courses, search]);

    // Custom submit with validation
    const onSubmit = (e) => {
        e.preventDefault();
        setFormError("");
        if (!formData.id || !formData.code || !formData.name) {
            setFormError("Course ID, Code, and Name are required.");
            return;
        }
        handleSubmit(e);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12 text-slate-500">
                Loading courses...
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
                        placeholder="Search courses..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 min-w-[150px] rounded-xl px-3 py-2 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-teal-400 transition text-sm"
                    />

                    {/* Form Fields */}
                    <input
                        type="text"
                        name="id"
                        placeholder="Course ID*"
                        value={formData.id}
                        onChange={handleChange}
                        disabled={!!editingId}
                        className={`w-24 rounded-xl px-2 py-1.5 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-teal-400 text-sm transition ${editingId ? "bg-slate-100 cursor-not-allowed" : ""}`}
                    />
                    <input
                        type="text"
                        name="code"
                        placeholder="Code*"
                        value={formData.code}
                        onChange={handleChange}
                        className="w-20 rounded-xl px-2 py-1.5 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-teal-400 text-sm transition"
                    />
                    <input
                        type="text"
                        name="name"
                        placeholder="Course Name*"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-40 rounded-xl px-2 py-1.5 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-teal-400 text-sm transition"
                    />
                    <input
                        type="number"
                        name="credit_hour"
                        placeholder="Credits"
                        value={formData.credit_hour}
                        onChange={handleChange}
                        className="w-16 rounded-xl px-2 py-1.5 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-teal-400 text-sm transition"
                    />
                    <select
                        name="lecturer_id"
                        value={formData.lecturer_id}
                        onChange={handleChange}
                        className="w-36 rounded-xl px-2 py-1.5 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-teal-400 text-sm transition"
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
                            onClick={onSubmit}
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

            {/* Courses Table */}
            <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-slate-100">
                <table className="min-w-full border-collapse text-sm">
                    <thead>
                        <tr className="bg-slate-100/80 text-slate-600 uppercase tracking-wide text-xs">
                            <th className="px-3 py-2 text-left">ID</th>
                            <th className="px-3 py-2 text-left">Code</th>
                            <th className="px-3 py-2 text-left">Name</th>
                            <th className="px-3 py-2 text-center">Credits</th>
                            <th className="px-3 py-2 text-center">Lecturer</th>
                            <th className="px-3 py-2 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCourses.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="text-center py-6 text-slate-500 italic">
                                    No courses found.
                                </td>
                            </tr>
                        ) : (
                            filteredCourses.map((c) => (
                                <tr key={c.id} className="border-b border-slate-100 hover:bg-sky-50/60 transition">
                                    <td className="px-3 py-2 font-mono text-xs">{c.id}</td>
                                    <td className="px-3 py-2 font-semibold">{c.code}</td>
                                    <td className="px-3 py-2">{c.name}</td>
                                    <td className="px-3 py-2 text-center">{c.credit_hour || "-"}</td>
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
                                        <div className="flex justify-center gap-1">
                                            <button
                                                onClick={() => startEdit(c)}
                                                className="px-2 py-1 rounded-lg text-white bg-gradient-to-r from-yellow-500 to-amber-500 hover:scale-[1.05] text-xs transition"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(c.id)}
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
