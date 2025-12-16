"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FileText, Upload, Send, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import withRole from "../utils/withRole";
import { useExcuseManagement } from "@/hooks";

const EXCUSE_TYPES = [
    { value: "medical", label: "Medical Certificate (MC)", icon: "🏥" },
    { value: "emergency", label: "Family Emergency", icon: "🚨" },
    { value: "official", label: "Official University Event", icon: "🎓" },
    { value: "other", label: "Other Reason", icon: "📝" },
];

function SubmitExcuse() {
    const {
        excuses,
        sections,
        isLoading,
        studentId,
        submitExcuse,
        uploadDocument,
    } = useExcuseManagement();

    const [formData, setFormData] = useState({
        sectionId: "",
        excuseType: "",
        reason: "",
    });
    const [file, setFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.sectionId || !formData.excuseType || !formData.reason) {
            toast.error("Please fill in all required fields");
            return;
        }

        setIsSubmitting(true);

        try {
            let documentUrl = null;

            // Upload document if provided
            if (file) {
                const uploadResult = await uploadDocument(file);
                if (uploadResult.success) {
                    documentUrl = uploadResult.url;
                } else {
                    toast.warning("Document upload failed, but submitting excuse anyway");
                }
            }

            const result = await submitExcuse({
                sectionId: formData.sectionId,
                excuseType: formData.excuseType,
                reason: formData.reason,
                documentUrl,
            });

            if (result.success) {
                toast.success("✓ Excuse submitted successfully!");
                setFormData({ sectionId: "", excuseType: "", reason: "" });
                setFile(null);
            } else {
                toast.error("Failed to submit: " + result.error);
            }
        } catch (err) {
            toast.error("Error submitting excuse");
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case "pending":
                return (
                    <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs">
                        <Clock className="w-3 h-3" /> Pending
                    </span>
                );
            case "approved":
                return (
                    <span className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs">
                        <CheckCircle className="w-3 h-3" /> Approved
                    </span>
                );
            case "rejected":
                return (
                    <span className="flex items-center gap-1 px-2 py-1 bg-rose-100 text-rose-700 rounded-full text-xs">
                        <XCircle className="w-3 h-3" /> Rejected
                    </span>
                );
            default:
                return null;
        }
    };

    if (!studentId) {
        return (
            <DashboardLayout>
                <div className="min-h-screen flex items-center justify-center bg-teal-50">
                    <div className="bg-white/70 backdrop-blur-md rounded-2xl p-8 text-center shadow-lg">
                        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Account Not Linked</h2>
                        <p className="text-slate-600">Your account is not linked to a student record.</p>
                        <p className="text-sm text-slate-500 mt-2">Please contact an administrator.</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <ToastContainer />
            <div className="min-h-screen p-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-2xl mx-auto"
                >
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-slate-800">Submit Excuse / MC</h1>
                        <p className="text-slate-500 text-sm">Upload documentation for your absence</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Submission Form */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-teal-500" />
                                New Submission
                            </h2>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Course/Section *
                                    </label>
                                    <select
                                        value={formData.sectionId}
                                        onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-400 focus:outline-none"
                                        required
                                    >
                                        <option value="">Select section...</option>
                                        {sections.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.courses?.code} - {s.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Excuse Type *
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {EXCUSE_TYPES.map((type) => (
                                            <button
                                                key={type.value}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, excuseType: type.value })}
                                                className={`p-3 rounded-xl border text-left transition ${formData.excuseType === type.value
                                                    ? "border-teal-500 bg-teal-50 text-teal-700"
                                                    : "border-slate-200 hover:border-slate-300"
                                                    }`}
                                            >
                                                <span className="text-lg">{type.icon}</span>
                                                <p className="text-sm font-medium mt-1">{type.label}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Reason / Details *
                                    </label>
                                    <textarea
                                        value={formData.reason}
                                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                        placeholder="Explain your reason for absence..."
                                        rows={4}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-400 focus:outline-none resize-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Supporting Document (Optional)
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-teal-400 transition">
                                            <Upload className="w-5 h-5 text-slate-400" />
                                            <span className="text-sm text-slate-600">
                                                {file ? file.name : "Upload MC/Document"}
                                            </span>
                                            <input
                                                type="file"
                                                accept="image/*,.pdf"
                                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                                className="hidden"
                                            />
                                        </label>
                                        {file && (
                                            <button
                                                type="button"
                                                onClick={() => setFile(null)}
                                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                                            >
                                                <XCircle className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-medium hover:scale-[1.01] transition disabled:opacity-50"
                                >
                                    <Send className="w-4 h-4" />
                                    {isSubmitting ? "Submitting..." : "Submit Excuse"}
                                </button>
                            </form>
                        </div>

                        {/* Submission History */}
                        <div className="bg-white/70 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-slate-200/50">
                            <h2 className="text-lg font-semibold text-slate-800 mb-4">
                                📜 Your Submissions
                            </h2>

                            {isLoading ? (
                                <p className="text-center text-slate-500 py-8">Loading...</p>
                            ) : excuses.length === 0 ? (
                                <p className="text-center text-slate-500 py-8">No submissions yet</p>
                            ) : (
                                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                                    {excuses.map((excuse) => (
                                        <div
                                            key={excuse.id}
                                            className="p-3 bg-slate-50 rounded-xl border border-slate-200"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="font-medium text-slate-800">
                                                        {excuse.sections?.courses?.code} - {excuse.sections?.name}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {new Date(excuse.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                {getStatusBadge(excuse.status)}
                                            </div>
                                            <p className="text-sm text-slate-600 mb-2">{excuse.reason}</p>
                                            {excuse.admin_notes && (
                                                <p className="text-xs text-slate-500 italic bg-slate-100 p-2 rounded">
                                                    Admin: {excuse.admin_notes}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </DashboardLayout>
    );
}

export default withRole(SubmitExcuse, ["student"]);
