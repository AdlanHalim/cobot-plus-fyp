/**
 * @file LecturersTab.jsx
 * @location cobot-plus-fyp/components/manage/LecturersTab.jsx
 * 
 * @description
 * Tab component for managing lecturers.
 * Provides CRUD operations for lecturer records.
 */

import { useState, useMemo } from "react";
import { useLecturerManagement, useDebounce } from "@/hooks";
import { SortableHeader, useSortableData } from "@/components/ui/SortableHeader";

export default function LecturersTab() {
    const {
        lecturers,
        formData,
        editingId,
        loading,
        handleChange,
        handleSubmit,
        handleDelete,
        startEdit,
        resetForm,
    } = useLecturerManagement();

    const [search, setSearch] = useState("");
    const [formError, setFormError] = useState("");

    // Debounce search for performance (wait 300ms after typing stops)
    const debouncedSearch = useDebounce(search, 300);

    // Filter lecturers by debounced search
    const filteredLecturers = useMemo(() => {
        const searchLower = debouncedSearch.toLowerCase();
        return lecturers.filter((lec) => {
            return (
                lec.name?.toLowerCase().includes(searchLower) ||
                lec.email?.toLowerCase().includes(searchLower) ||
                lec.department?.toLowerCase().includes(searchLower) ||
                lec.staff_id?.toLowerCase().includes(searchLower)
            );
        });
    }, [lecturers, debouncedSearch]);

    // Sort filtered lecturers
    const { sortedItems: sortedLecturers, sortConfig, requestSort } = useSortableData(filteredLecturers);

    // Custom submit with validation
    const onSubmit = (e) => {
        e.preventDefault();
        setFormError("");
        // Staff ID is optional now
        if (!formData.name || !formData.email) {
            setFormError("Name and Email are required.");
            return;
        }
        // Basic email validation
        if (!formData.email.includes("@")) {
            setFormError("Please enter a valid email address.");
            return;
        }
        handleSubmit(e);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12 text-slate-500">
                Loading lecturers...
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
                        placeholder="Search lecturers..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 min-w-[150px] rounded-xl px-3 py-2 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-teal-400 transition text-sm"
                    />

                    {/* Form Fields */}
                    <input
                        type="text"
                        name="staffId"
                        placeholder="Staff ID"
                        value={formData.staffId}
                        onChange={handleChange}
                        className="w-28 rounded-xl px-2 py-1.5 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-teal-400 text-sm transition"
                    />
                    <input
                        type="text"
                        name="name"
                        placeholder="Name*"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-36 rounded-xl px-2 py-1.5 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-teal-400 text-sm transition"
                    />
                    <input
                        type="email"
                        name="email"
                        placeholder="Email*"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-48 rounded-xl px-2 py-1.5 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-teal-400 text-sm transition"
                    />
                    <input
                        type="text"
                        name="department"
                        placeholder="Department"
                        value={formData.department}
                        onChange={handleChange}
                        className="w-36 rounded-xl px-2 py-1.5 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-teal-400 text-sm transition"
                    />

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

            {/* Lecturers Table */}
            <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-slate-100">
                <table className="min-w-full border-collapse text-sm">
                    <thead>
                        <tr className="bg-slate-100/80 text-slate-600 uppercase tracking-wide text-xs">
                            <th className="px-3 py-2 text-left">#</th>
                            <SortableHeader label="Staff ID" sortKey="staff_id" sortConfig={sortConfig} onSort={requestSort} className="px-3 py-2" />
                            <SortableHeader label="Name" sortKey="name" sortConfig={sortConfig} onSort={requestSort} className="px-3 py-2" />
                            <SortableHeader label="Email" sortKey="email" sortConfig={sortConfig} onSort={requestSort} className="px-3 py-2" />
                            <SortableHeader label="Department" sortKey="department" sortConfig={sortConfig} onSort={requestSort} className="px-3 py-2" />
                            <th className="px-3 py-2 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedLecturers.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="text-center py-6 text-slate-500 italic">
                                    No lecturers found.
                                </td>
                            </tr>
                        ) : (
                            sortedLecturers.map((lec, index) => (
                                <tr key={lec.id} className="border-b border-slate-100 hover:bg-sky-50/60 transition">
                                    <td className="px-3 py-2 text-slate-400">{index + 1}</td>
                                    <td className="px-3 py-2 font-mono text-xs text-teal-700 bg-teal-50/50 rounded">{lec.staff_id || "-"}</td>
                                    <td className="px-3 py-2 font-semibold">{lec.name}</td>
                                    <td className="px-3 py-2 text-slate-600">{lec.email}</td>
                                    <td className="px-3 py-2">
                                        {lec.department ? (
                                            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                                {lec.department}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <div className="flex justify-center gap-1">
                                            <button
                                                onClick={() => startEdit(lec)}
                                                className="px-2 py-1 rounded-lg text-white bg-gradient-to-r from-yellow-500 to-amber-500 hover:scale-[1.05] text-xs transition"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(lec.id)}
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
