/**
 * @file EnrollmentsTab.jsx
 * @location cobot-plus-fyp/components/manage/EnrollmentsTab.jsx
 * 
 * @description
 * Tab component for managing student enrollments with CSV bulk upload.
 * Provides validation preview and error reporting before insertion.
 */

import { useState, useMemo, useRef } from "react";
import { useEnrollmentManagement, useDebounce } from "@/hooks";
import { Upload, Download, X, CheckCircle, AlertCircle } from "lucide-react";
import { SortableHeader, useSortableData } from "@/components/ui/SortableHeader";

export default function EnrollmentsTab() {
    const {
        enrollments,
        sections,
        loading,
        uploading,
        csvData,
        csvErrors,
        handleCSVUpload,
        confirmBulkEnroll,
        clearCSV,
        handleDelete,
        downloadSampleCSV,
        filterBySection,
        selectedSection,
    } = useEnrollmentManagement();

    const fileInputRef = useRef(null);
    const [search, setSearch] = useState("");

    // Debounce search for performance
    const debouncedSearch = useDebounce(search, 300);

    // Filter enrollments by debounced search
    const filteredEnrollments = useMemo(() => {
        const searchLower = debouncedSearch.toLowerCase();
        return enrollments.filter((e) => {
            return (
                e.students?.name?.toLowerCase().includes(searchLower) ||
                e.students?.matric_no?.toLowerCase().includes(searchLower) ||
                e.sections?.name?.toLowerCase().includes(searchLower) ||
                e.sections?.courses?.code?.toLowerCase().includes(searchLower)
            );
        });
    }, [enrollments, debouncedSearch]);

    // Sort filtered enrollments
    const { sortedItems: sortedEnrollments, sortConfig, requestSort } = useSortableData(filteredEnrollments);

    // Handle file selection
    const onFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            handleCSVUpload(file);
        }
        // Reset input so same file can be selected again
        e.target.value = "";
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12 text-slate-500">
                Loading enrollments...
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* CSV Upload Section */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-teal-500" />
                    Bulk Enrollment via CSV
                </h3>

                {/* Instructions */}
                <div className="bg-slate-50 rounded-xl p-3 mb-4 text-sm">
                    <p className="font-medium text-slate-700 mb-2">📋 CSV Format Requirements:</p>
                    <ul className="list-disc list-inside text-slate-600 space-y-1 mb-3">
                        <li>Columns: <code className="bg-slate-200 px-1 rounded">student_id</code>, <code className="bg-slate-200 px-1 rounded">section_id</code></li>
                        <li>First row must be the header</li>
                        <li>Student IDs and Section IDs must exist in the system</li>
                    </ul>
                    <div className="bg-white rounded-lg p-2 font-mono text-xs text-slate-600">
                        <div className="text-slate-400"># Example:</div>
                        <div>student_id,section_id</div>
                        <div>STU001,SEC-CS101-A</div>
                        <div>STU002,SEC-CS101-A</div>
                    </div>
                </div>

                {/* Upload Button & Sample Download */}
                <div className="flex flex-wrap gap-2 items-center">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={onFileChange}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 rounded-xl text-white bg-gradient-to-r from-teal-500 to-cyan-500 hover:scale-[1.03] text-sm transition flex items-center gap-2"
                    >
                        <Upload className="w-4 h-4" />
                        Upload CSV
                    </button>
                    <button
                        onClick={downloadSampleCSV}
                        className="px-4 py-2 rounded-xl bg-slate-200/80 hover:bg-slate-300/80 text-sm transition flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Download Sample
                    </button>
                </div>

                {/* CSV Preview */}
                {(csvData.length > 0 || csvErrors.length > 0) && (
                    <div className="mt-4">
                        {/* Valid Entries */}
                        {csvData.length > 0 && (
                            <div className="mb-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    <span className="text-sm font-medium text-green-700">
                                        {csvData.length} valid enrollment(s) ready
                                    </span>
                                </div>
                                <div className="bg-green-50 rounded-lg p-2 max-h-32 overflow-y-auto text-xs">
                                    {csvData.slice(0, 5).map((row, i) => (
                                        <div key={i} className="text-green-700">
                                            {row.studentMatric} → {row.courseCode}-{row.sectionName}
                                        </div>
                                    ))}
                                    {csvData.length > 5 && (
                                        <div className="text-green-600 mt-1">... and {csvData.length - 5} more</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Errors */}
                        {csvErrors.length > 0 && (
                            <div className="mb-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle className="w-4 h-4 text-red-500" />
                                    <span className="text-sm font-medium text-red-700">
                                        {csvErrors.length} error(s) found
                                    </span>
                                </div>
                                <div className="bg-red-50 rounded-lg p-2 max-h-32 overflow-y-auto text-xs">
                                    {csvErrors.slice(0, 5).map((err, i) => (
                                        <div key={i} className="text-red-700">
                                            Row {err.row}: {err.error}
                                        </div>
                                    ))}
                                    {csvErrors.length > 5 && (
                                        <div className="text-red-600 mt-1">... and {csvErrors.length - 5} more</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            {csvData.length > 0 && (
                                <button
                                    onClick={confirmBulkEnroll}
                                    disabled={uploading}
                                    className="px-4 py-2 rounded-xl text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:scale-[1.03] text-sm transition disabled:opacity-50"
                                >
                                    {uploading ? "Enrolling..." : `Confirm Enrollment (${csvData.length})`}
                                </button>
                            )}
                            <button
                                onClick={clearCSV}
                                className="px-4 py-2 rounded-xl bg-slate-200/80 hover:bg-slate-300/80 text-sm transition flex items-center gap-1"
                            >
                                <X className="w-4 h-4" />
                                Clear
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Current Enrollments */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <h3 className="font-semibold text-slate-700 mb-3">Current Enrollments</h3>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 mb-3">
                    <input
                        type="text"
                        placeholder="Search by student or section..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 min-w-[200px] rounded-xl px-3 py-2 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-teal-400 transition text-sm"
                    />
                    <select
                        value={selectedSection}
                        onChange={(e) => filterBySection(e.target.value)}
                        className="w-48 rounded-xl px-3 py-2 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-teal-400 text-sm transition"
                    >
                        <option value="">All Sections</option>
                        {sections.map((sec) => (
                            <option key={sec.id} value={sec.id}>
                                {sec.courses?.code} - {sec.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="min-w-full border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-100/80 text-slate-600 uppercase tracking-wide text-xs">
                                <th className="px-3 py-2 text-left">#</th>
                                <SortableHeader label="Student" sortKey="students.name" sortConfig={sortConfig} onSort={requestSort} className="px-3 py-2" />
                                <SortableHeader label="Matric No" sortKey="students.matric_no" sortConfig={sortConfig} onSort={requestSort} className="px-3 py-2" />
                                <SortableHeader label="Section" sortKey="sections.name" sortConfig={sortConfig} onSort={requestSort} className="px-3 py-2" />
                                <SortableHeader label="Course" sortKey="sections.courses.code" sortConfig={sortConfig} onSort={requestSort} className="px-3 py-2" />
                                <th className="px-3 py-2 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedEnrollments.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-6 text-slate-500 italic">
                                        No enrollments found.
                                    </td>
                                </tr>
                            ) : (
                                sortedEnrollments.slice(0, 50).map((e, index) => (
                                    <tr key={e.id} className="border-b border-slate-100 hover:bg-sky-50/60 transition">
                                        <td className="px-3 py-2 text-slate-400">{index + 1}</td>
                                        <td className="px-3 py-2 font-semibold">{e.students?.name || "-"}</td>
                                        <td className="px-3 py-2 font-mono text-xs">{e.students?.matric_no || "-"}</td>
                                        <td className="px-3 py-2">
                                            <span className="bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                                {e.sections?.name || "-"}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2">{e.sections?.courses?.code || "-"}</td>
                                        <td className="px-3 py-2 text-center">
                                            <button
                                                onClick={() => handleDelete(e.id)}
                                                className="px-2 py-1 rounded-lg text-white bg-gradient-to-r from-red-500 to-pink-500 hover:scale-[1.05] text-xs transition"
                                            >
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    {sortedEnrollments.length > 50 && (
                        <div className="text-center py-2 text-sm text-slate-500">
                            Showing first 50 of {sortedEnrollments.length} enrollments
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
