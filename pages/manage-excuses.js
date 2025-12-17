"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FileText, CheckCircle, XCircle, Clock, Eye, MessageSquare, Filter, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import withRole from "../utils/withRole";
import { useExcuseManagement, useUserRole } from "@/hooks";
import ReactModal from "react-modal";

if (typeof window !== "undefined") {
    ReactModal.setAppElement("body");
}

const STATUS_FILTERS = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending", color: "amber" },
    { value: "approved", label: "Approved", color: "emerald" },
    { value: "rejected", label: "Rejected", color: "rose" },
];

function ManageExcuses() {
    const { userRole } = useUserRole();
    const isAdmin = userRole === "admin";
    const isLecturer = userRole === "lecturer";

    const {
        excuses,
        lecturerSections,
        isLoading,
        reviewExcuse,
    } = useExcuseManagement({ isAdmin, isLecturer });

    const [statusFilter, setStatusFilter] = useState("pending");
    const [sectionFilter, setSectionFilter] = useState("");
    const [selectedExcuse, setSelectedExcuse] = useState(null);
    const [adminNotes, setAdminNotes] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    // Filter excuses by status and section
    const filteredExcuses = excuses.filter((e) => {
        const matchesStatus = statusFilter === "all" || e.status === statusFilter;
        const matchesSection = !sectionFilter || e.section_id === sectionFilter;
        return matchesStatus && matchesSection;
    });

    // Get unique sections from excuses for filter dropdown
    const uniqueSections = [...new Map(
        excuses.map((e) => [e.section_id, { id: e.section_id, name: e.sections?.name, code: e.sections?.courses?.code }])
    ).values()].filter((s) => s.name);

    // Stats
    const pendingCount = excuses.filter((e) => e.status === "pending").length;
    const approvedToday = excuses.filter((e) => {
        if (e.status !== "approved" || !e.reviewed_at) return false;
        const today = new Date().toDateString();
        return new Date(e.reviewed_at).toDateString() === today;
    }).length;

    const handleReview = async (status) => {
        if (!selectedExcuse) return;

        setIsProcessing(true);
        const result = await reviewExcuse(selectedExcuse.id, status, adminNotes);

        if (result.success) {
            toast.success(status === "approved" ? "✓ Excuse approved" : "✗ Excuse rejected");
            setSelectedExcuse(null);
            setAdminNotes("");
        } else {
            toast.error("Failed: " + result.error);
        }
        setIsProcessing(false);
    };

    const getStatusBadge = (status) => {
        const config = {
            pending: { bg: "bg-amber-100", text: "text-amber-700", icon: Clock },
            approved: { bg: "bg-emerald-100", text: "text-emerald-700", icon: CheckCircle },
            rejected: { bg: "bg-rose-100", text: "text-rose-700", icon: XCircle },
        };
        const { bg, text, icon: Icon } = config[status] || config.pending;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 ${bg} ${text} rounded-full text-xs font-medium`}>
                <Icon className="w-3 h-3" /> {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    const getExcuseTypeLabel = (type) => {
        const labels = {
            medical: "🏥 Medical",
            emergency: "🚨 Emergency",
            official: "🎓 Official Event",
            other: "📝 Other",
        };
        return labels[type] || type;
    };

    const modalStyles = {
        content: {
            maxWidth: "500px",
            margin: "auto",
            borderRadius: "16px",
            padding: "24px",
            background: "rgba(255,255,255,0.98)",
            border: "1px solid #e2e8f0",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        },
        overlay: {
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 50,
        },
    };

    return (
        <DashboardLayout>
            <ToastContainer />

            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Manage Excuses</h1>
                <p className="text-slate-500 text-sm">Review and approve student absence submissions</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <Card className="bg-white shadow-sm border border-slate-100">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 mb-1">Pending Review</p>
                            <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
                        </div>
                        <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
                            <Clock className="w-6 h-6 text-amber-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white shadow-sm border border-slate-100">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 mb-1">Approved Today</p>
                            <p className="text-2xl font-bold text-emerald-600">{approvedToday}</p>
                        </div>
                        <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-emerald-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white shadow-sm border border-slate-100">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 mb-1">Total Submissions</p>
                            <p className="text-2xl font-bold text-slate-800">{excuses.length}</p>
                        </div>
                        <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
                            <FileText className="w-6 h-6 text-teal-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters Bar */}
            <Card className="bg-white shadow-sm border border-slate-100 mb-6">
                <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Status Filter */}
                        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
                            {STATUS_FILTERS.map((filter) => (
                                <button
                                    key={filter.value}
                                    onClick={() => setStatusFilter(filter.value)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${statusFilter === filter.value
                                        ? "bg-white text-teal-600 shadow-sm"
                                        : "text-slate-600 hover:text-slate-800"
                                        }`}
                                >
                                    {filter.label}
                                    {filter.value !== "all" && (
                                        <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${statusFilter === filter.value
                                            ? "bg-teal-100 text-teal-700"
                                            : "bg-slate-200 text-slate-600"
                                            }`}>
                                            {excuses.filter((e) => e.status === filter.value).length}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Section Filter */}
                        {uniqueSections.length > 0 && (
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-slate-400" />
                                <select
                                    value={sectionFilter}
                                    onChange={(e) => setSectionFilter(e.target.value)}
                                    className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none"
                                >
                                    <option value="">All Sections</option>
                                    {uniqueSections.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.code} - {s.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Excuse List */}
            <Card className="bg-white shadow-sm border border-slate-100">
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-12 text-center">
                            <div className="w-8 h-8 border-4 border-teal-100 border-t-teal-500 rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-slate-500">Loading excuses...</p>
                        </div>
                    ) : filteredExcuses.length === 0 ? (
                        <div className="p-12 text-center">
                            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500">No {statusFilter === "all" ? "" : statusFilter} excuses found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-100">
                                        <th className="text-left px-5 py-4">Student</th>
                                        <th className="text-left px-5 py-4">Course / Section</th>
                                        <th className="text-left px-5 py-4">Type</th>
                                        <th className="text-left px-5 py-4">Submitted</th>
                                        <th className="text-center px-5 py-4">Status</th>
                                        <th className="text-center px-5 py-4">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredExcuses.map((excuse) => (
                                        <tr
                                            key={excuse.id}
                                            className="border-b border-slate-50 hover:bg-slate-50/50 transition"
                                        >
                                            <td className="px-5 py-4">
                                                <p className="font-medium text-slate-800">{excuse.students?.name}</p>
                                                <p className="text-xs text-slate-500">{excuse.students?.matric_no}</p>
                                            </td>
                                            <td className="px-5 py-4">
                                                <p className="text-sm font-medium text-slate-700">{excuse.sections?.courses?.code}</p>
                                                <p className="text-xs text-slate-500">{excuse.sections?.name}</p>
                                            </td>
                                            <td className="px-5 py-4 text-sm">
                                                {getExcuseTypeLabel(excuse.excuse_type)}
                                            </td>
                                            <td className="px-5 py-4 text-sm text-slate-500">
                                                {new Date(excuse.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                {getStatusBadge(excuse.status)}
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <button
                                                    onClick={() => {
                                                        setSelectedExcuse(excuse);
                                                        setAdminNotes(excuse.admin_notes || "");
                                                    }}
                                                    className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition"
                                                    title="Review"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Review Modal */}
            <ReactModal
                isOpen={!!selectedExcuse}
                onRequestClose={() => setSelectedExcuse(null)}
                style={modalStyles}
            >
                {selectedExcuse && (
                    <div className="space-y-5">
                        <h2 className="text-xl font-bold text-slate-800">Review Excuse</h2>

                        <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Student</span>
                                <span className="font-medium text-slate-800">{selectedExcuse.students?.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Matric No</span>
                                <span className="text-slate-700">{selectedExcuse.students?.matric_no}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Course</span>
                                <span className="text-slate-700">{selectedExcuse.sections?.courses?.code} - {selectedExcuse.sections?.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Type</span>
                                <span>{getExcuseTypeLabel(selectedExcuse.excuse_type)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Submitted</span>
                                <span className="text-slate-700">{new Date(selectedExcuse.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Reason Given
                            </label>
                            <p className="p-3 bg-slate-100 rounded-xl text-sm text-slate-700">
                                {selectedExcuse.reason}
                            </p>
                        </div>

                        {selectedExcuse.document_url && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Attached Document
                                </label>
                                <a
                                    href={selectedExcuse.document_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 text-sm font-medium"
                                >
                                    <FileText className="w-4 h-4" /> View Document →
                                </a>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                <MessageSquare className="w-4 h-4 inline mr-1" />
                                Notes for Student (Optional)
                            </label>
                            <textarea
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                                placeholder="Add notes that will be visible to the student..."
                                rows={2}
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-400 focus:outline-none resize-none text-sm"
                            />
                        </div>

                        {selectedExcuse.status === "pending" ? (
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => handleReview("approved")}
                                    disabled={isProcessing}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition disabled:opacity-50"
                                >
                                    <CheckCircle className="w-4 h-4" /> Approve
                                </button>
                                <button
                                    onClick={() => handleReview("rejected")}
                                    disabled={isProcessing}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition disabled:opacity-50"
                                >
                                    <XCircle className="w-4 h-4" /> Reject
                                </button>
                            </div>
                        ) : (
                            <div className="text-center py-3 bg-slate-50 rounded-xl">
                                {getStatusBadge(selectedExcuse.status)}
                                {selectedExcuse.reviewed_at && (
                                    <p className="text-xs text-slate-500 mt-2">
                                        Reviewed on {new Date(selectedExcuse.reviewed_at).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                        )}

                        <button
                            onClick={() => setSelectedExcuse(null)}
                            className="w-full px-4 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition font-medium"
                        >
                            Close
                        </button>
                    </div>
                )}
            </ReactModal>
        </DashboardLayout>
    );
}

export default withRole(ManageExcuses, ["admin", "lecturer"]);
