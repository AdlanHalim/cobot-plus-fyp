"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FileText, CheckCircle, XCircle, Clock, Eye, MessageSquare } from "lucide-react";
import withRole from "../utils/withRole";
import { useExcuseManagement } from "@/hooks";
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
    const {
        excuses,
        isLoading,
        reviewExcuse,
        refetch,
    } = useExcuseManagement({ isAdmin: true });

    const [statusFilter, setStatusFilter] = useState("pending");
    const [selectedExcuse, setSelectedExcuse] = useState(null);
    const [adminNotes, setAdminNotes] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    const filteredExcuses = excuses.filter((e) =>
        statusFilter === "all" || e.status === statusFilter
    );

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
            <span className={`flex items-center gap-1 px-2 py-1 ${bg} ${text} rounded-full text-xs`}>
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
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(10px)",
            border: "1px solid #e2e8f0",
        },
        overlay: {
            backgroundColor: "rgba(0, 0, 0, 0.5)",
        },
    };

    return (
        <DashboardLayout>
            <ToastContainer />
            <div className="min-h-screen p-8">
                <motion.div
                    className="max-w-5xl mx-auto"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-slate-800">Manage Excuses</h1>
                        <p className="text-slate-500 text-sm">Review and approve student absentee submissions</p>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-2 mb-6">
                        {STATUS_FILTERS.map((filter) => (
                            <button
                                key={filter.value}
                                onClick={() => setStatusFilter(filter.value)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${statusFilter === filter.value
                                    ? "bg-teal-500 text-white"
                                    : "bg-white/70 text-slate-700 hover:bg-white"
                                    }`}
                            >
                                {filter.label}
                                {filter.value !== "all" && (
                                    <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-white/20">
                                        {excuses.filter((e) => e.status === filter.value).length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Excuse List Card */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 min-h-[500px] overflow-hidden">
                        {isLoading ? (
                            <div className="p-8 text-center text-slate-500">Loading...</div>
                        ) : filteredExcuses.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                No {statusFilter === "all" ? "" : statusFilter} excuses found
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-100/80 text-slate-600 text-xs uppercase tracking-wider">
                                        <th className="text-left px-4 py-3">Student</th>
                                        <th className="text-left px-4 py-3">Course</th>
                                        <th className="text-left px-4 py-3">Type</th>
                                        <th className="text-left px-4 py-3">Date</th>
                                        <th className="text-center px-4 py-3">Status</th>
                                        <th className="text-center px-4 py-3">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredExcuses.map((excuse) => (
                                        <tr
                                            key={excuse.id}
                                            className="border-b border-slate-100 hover:bg-slate-50/60 transition"
                                        >
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-slate-800">{excuse.students?.name}</p>
                                                <p className="text-xs text-slate-500">{excuse.students?.matric_no}</p>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600">
                                                {excuse.sections?.courses?.code} - {excuse.sections?.name}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {getExcuseTypeLabel(excuse.excuse_type)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-500">
                                                {new Date(excuse.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {getStatusBadge(excuse.status)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
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
                        )}
                    </div>
                </motion.div>

                {/* Review Modal */}
                <ReactModal
                    isOpen={!!selectedExcuse}
                    onRequestClose={() => setSelectedExcuse(null)}
                    style={modalStyles}
                >
                    {selectedExcuse && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold text-slate-800">Review Excuse</h2>

                            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-500">Student</span>
                                    <span className="font-medium">{selectedExcuse.students?.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-500">Course</span>
                                    <span>{selectedExcuse.sections?.courses?.code}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-500">Type</span>
                                    <span>{getExcuseTypeLabel(selectedExcuse.excuse_type)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-500">Submitted</span>
                                    <span>{new Date(selectedExcuse.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Reason Given
                                </label>
                                <p className="p-3 bg-slate-100 rounded-lg text-sm text-slate-700">
                                    {selectedExcuse.reason}
                                </p>
                            </div>

                            {selectedExcuse.document_url && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Attached Document
                                    </label>
                                    <a
                                        href={selectedExcuse.document_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-teal-600 hover:text-teal-700"
                                    >
                                        <FileText className="w-4 h-4" /> View Document
                                    </a>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    <MessageSquare className="w-4 h-4 inline mr-1" />
                                    Admin Notes (Optional)
                                </label>
                                <textarea
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    placeholder="Add notes for the student..."
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-400 focus:outline-none resize-none"
                                />
                            </div>

                            {selectedExcuse.status === "pending" ? (
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleReview("approved")}
                                        disabled={isProcessing}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition disabled:opacity-50"
                                    >
                                        <CheckCircle className="w-4 h-4" /> Approve
                                    </button>
                                    <button
                                        onClick={() => handleReview("rejected")}
                                        disabled={isProcessing}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition disabled:opacity-50"
                                    >
                                        <XCircle className="w-4 h-4" /> Reject
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center py-2">
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
                                className="w-full px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </ReactModal>
            </div>
        </DashboardLayout>
    );
}

export default withRole(ManageExcuses, ["admin", "lecturer"]);
