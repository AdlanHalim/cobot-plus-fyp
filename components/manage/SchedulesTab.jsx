/**
 * @file SchedulesTab.jsx
 * @location cobot-plus-fyp/components/manage/SchedulesTab.jsx
 * 
 * @description
 * Tab component for managing section schedules (class timings).
 * Groups schedules by section and time, showing M-W and T-TH pairs together.
 */

import { useState, useMemo } from "react";
import { useScheduleManagement, useDebounce } from "@/hooks";
import { SortableHeader, useSortableData } from "@/components/ui/SortableHeader";

export default function SchedulesTab() {
    const {
        schedules,
        sections,
        formData,
        editingId,
        loading,
        daysOfWeek,
        handleChange,
        handleSubmit,
        handleDelete,
        startEdit,
        resetForm,
    } = useScheduleManagement();

    const [search, setSearch] = useState("");
    const [formError, setFormError] = useState("");

    // Group schedules by section + time slot (shows M-W, T-TH together)
    const groupedSchedules = useMemo(() => {
        const groups = {};

        schedules.forEach(sch => {
            // Create a key based on section and time
            const key = `${sch.section_id}-${sch.start_time}-${sch.end_time}`;

            if (!groups[key]) {
                groups[key] = {
                    section: sch.sections,
                    startTime: sch.start_time,
                    endTime: sch.end_time,
                    days: [],
                    scheduleIds: [],
                };
            }

            groups[key].days.push(sch.day_of_week);
            groups[key].scheduleIds.push(sch.id);
        });

        // Convert to array and sort by course name
        return Object.values(groups).sort((a, b) => {
            const nameA = a.section?.courses?.name || "";
            const nameB = b.section?.courses?.name || "";
            return nameA.localeCompare(nameB);
        });
    }, [schedules]);

    // Debounce search for performance
    const debouncedSearch = useDebounce(search, 300);

    // Filter schedules by debounced search
    const filteredSchedules = useMemo(() => {
        const searchLower = debouncedSearch.toLowerCase();
        return schedules.filter((sch) => {
            return (
                sch.sections?.name?.toLowerCase().includes(searchLower) ||
                sch.sections?.courses?.code?.toLowerCase().includes(searchLower) ||
                sch.sections?.courses?.name?.toLowerCase().includes(searchLower) ||
                sch.day_of_week?.toLowerCase().includes(searchLower)
            );
        });
    }, [schedules, debouncedSearch]);

    // Sort filtered schedules
    const { sortedItems: sortedSchedules, sortConfig, requestSort } = useSortableData(filteredSchedules);

    // Custom submit with validation
    const onSubmit = (e) => {
        e.preventDefault();
        setFormError("");
        if (!formData.section_id || !formData.day_of_week || !formData.start_time || !formData.end_time) {
            setFormError("All fields are required.");
            return;
        }
        if (formData.start_time >= formData.end_time) {
            setFormError("End time must be after start time.");
            return;
        }
        handleSubmit(e);
    };

    // Format time for display
    const formatTime = (time) => {
        if (!time) return "-";
        return time.slice(0, 5);
    };

    // Format days for display (e.g., "Monday, Wednesday" or "M-W")
    const formatDays = (days) => {
        const sorted = [...days].sort((a, b) => {
            const order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
            return order.indexOf(a) - order.indexOf(b);
        });

        // Check for common patterns
        if (sorted.length === 2) {
            if (sorted[0] === "Monday" && sorted[1] === "Wednesday") return "Mon-Wed";
            if (sorted[0] === "Tuesday" && sorted[1] === "Thursday") return "Tue-Thu";
        }

        // Otherwise show abbreviated days
        const abbrev = {
            Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed",
            Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun"
        };
        return sorted.map(d => abbrev[d] || d).join(", ");
    };

    // Delete all schedules in a group
    const handleDeleteGroup = async (scheduleIds) => {
        if (!confirm(`Delete ${scheduleIds.length} schedule(s)?`)) return;
        for (const id of scheduleIds) {
            await handleDelete(id);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12 text-slate-500">
                Loading schedules...
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
                        placeholder="Search by section, course, or day..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 min-w-[150px] rounded-xl px-3 py-2 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-teal-400 transition text-sm"
                    />

                    {/* Form Fields */}
                    <select
                        name="section_id"
                        value={formData.section_id}
                        onChange={handleChange}
                        className="w-52 rounded-xl px-2 py-1.5 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-teal-400 text-sm transition"
                    >
                        <option value="">Select Section*</option>
                        {sections.map((sec) => (
                            <option key={sec.id} value={sec.id}>
                                {sec.courses?.name || sec.courses?.code} - Sec {sec.name}
                            </option>
                        ))}
                    </select>

                    <select
                        name="day_of_week"
                        value={formData.day_of_week}
                        onChange={handleChange}
                        className="w-28 rounded-xl px-2 py-1.5 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-teal-400 text-sm transition"
                    >
                        <option value="">Day*</option>
                        {daysOfWeek.map((day) => (
                            <option key={day} value={day}>
                                {day}
                            </option>
                        ))}
                    </select>

                    <div className="flex items-center gap-1">
                        <input
                            type="time"
                            name="start_time"
                            value={formData.start_time}
                            onChange={handleChange}
                            className="w-28 rounded-xl px-2 py-1.5 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-teal-400 text-sm transition"
                        />
                        <span className="text-slate-400">→</span>
                        <input
                            type="time"
                            name="end_time"
                            value={formData.end_time}
                            onChange={handleChange}
                            className="w-28 rounded-xl px-2 py-1.5 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-teal-400 text-sm transition"
                        />
                    </div>

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

            {/* Grouped Schedules Table */}
            <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-slate-100">
                <table className="min-w-full border-collapse text-sm">
                    <thead>
                        <tr className="bg-slate-100/80 text-slate-600 uppercase tracking-wide text-xs">
                            <SortableHeader label="Course" sortKey="sections.courses.name" sortConfig={sortConfig} onSort={requestSort} className="px-3 py-2" />
                            <SortableHeader label="Section" sortKey="sections.name" sortConfig={sortConfig} onSort={requestSort} className="px-3 py-2 text-center" />
                            <SortableHeader label="Day" sortKey="day_of_week" sortConfig={sortConfig} onSort={requestSort} className="px-3 py-2 text-center" />
                            <SortableHeader label="Time" sortKey="start_time" sortConfig={sortConfig} onSort={requestSort} className="px-3 py-2 text-center" />
                            <th className="px-3 py-2 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedSchedules.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="text-center py-6 text-slate-500 italic">
                                    No schedules found.
                                </td>
                            </tr>
                        ) : (
                            sortedSchedules.map((sch) => (
                                <tr key={sch.id} className={`border-b border-slate-100 hover:bg-sky-50/60 transition ${editingId === sch.id ? 'bg-amber-50' : ''}`}>
                                    <td className="px-3 py-2">
                                        <div className="font-semibold">{sch.sections?.courses?.name || "-"}</div>
                                        <div className="text-xs text-slate-500">{sch.sections?.courses?.code}</div>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <span className="bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                            {sch.sections?.name || "-"}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                            {sch.day_of_week}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-center font-mono">
                                        {formatTime(sch.start_time)} - {formatTime(sch.end_time)}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <div className="flex justify-center gap-1">
                                            <button
                                                onClick={() => startEdit(sch)}
                                                className="px-2 py-1 rounded-lg text-white bg-gradient-to-r from-yellow-500 to-amber-500 hover:scale-[1.05] text-xs transition"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(sch.id)}
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

            {/* Stats */}
            <div className="text-sm text-slate-500 text-center">
                {schedules.length} schedule(s)
            </div>
        </div>
    );
}
