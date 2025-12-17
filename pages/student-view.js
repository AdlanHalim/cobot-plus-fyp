"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, CheckCircle, Clock, Search, User, Mail,
  Calendar as CalendarIcon, List, FileText, Send, Upload, XCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AttendanceCalendar } from "@/components/attendance/AttendanceCalendar";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { useStudentSearch, useExcuseManagement, useUserRole } from "@/hooks";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import withRole from "../utils/withRole";

const EXCUSE_TYPES = [
  { value: "medical", label: "Medical (MC)", icon: "🏥" },
  { value: "emergency", label: "Emergency", icon: "🚨" },
  { value: "official", label: "Official Event", icon: "🎓" },
  { value: "other", label: "Other", icon: "📝" },
];

function StudentView() {
  const { userRole } = useUserRole();
  const isStudent = userRole === "student";

  // For students: auto-load their records; for admins: manual search
  const {
    matricNo,
    setMatricNo,
    studentData,
    attendanceRecords,
    totalAbsences,
    totalPresent,
    totalLate,
    loading,
    message,
    handleSearch,
    isAutoLoaded,
  } = useStudentSearch({ autoLoad: isStudent });

  // Excuse management
  const {
    excuses,
    sections,
    isLoading: excusesLoading,
    submitExcuse,
    uploadDocument,
  } = useExcuseManagement();

  const [activeTab, setActiveTab] = useState("calendar");
  const [showExcuseModal, setShowExcuseModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [excuseForm, setExcuseForm] = useState({ type: "", reason: "" });
  const [excuseFile, setExcuseFile] = useState(null);
  const [isSubmittingExcuse, setIsSubmittingExcuse] = useState(false);

  const totalClasses = attendanceRecords.length;

  const getStatusIcon = (status) => {
    switch (status) {
      case "present": return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case "absent": return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      case "late": return <Clock className="w-4 h-4 text-amber-500" />;
      default: return null;
    }
  };

  const getExcuseStatusBadge = (status) => {
    const config = {
      pending: { bg: "bg-amber-100", text: "text-amber-700", label: "Pending" },
      approved: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Approved" },
      rejected: { bg: "bg-rose-100", text: "text-rose-700", label: "Rejected" },
    };
    const { bg, text, label } = config[status] || config.pending;
    return <span className={`px-2 py-0.5 ${bg} ${text} rounded-full text-xs font-medium`}>{label}</span>;
  };

  // Open excuse modal for a specific absent record
  const handleSubmitExcuseClick = (record) => {
    setSelectedRecord(record);
    setExcuseForm({ type: "", reason: "" });
    setExcuseFile(null);
    setShowExcuseModal(true);
  };

  // Submit excuse
  const handleExcuseSubmit = async (e) => {
    e.preventDefault();
    if (!excuseForm.type || !excuseForm.reason) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmittingExcuse(true);
    try {
      let documentUrl = null;
      if (excuseFile) {
        const uploadResult = await uploadDocument(excuseFile);
        if (uploadResult.success) documentUrl = uploadResult.url;
      }

      const result = await submitExcuse({
        sectionId: selectedRecord.class_sessions?.section_id,
        excuseType: excuseForm.type,
        reason: excuseForm.reason,
        documentUrl,
        classSessionId: selectedRecord.class_session_id,
      });

      if (result.success) {
        toast.success("✓ Excuse submitted successfully!");
        setShowExcuseModal(false);
      } else {
        toast.error("Failed: " + result.error);
      }
    } catch (err) {
      toast.error("Error submitting excuse");
    } finally {
      setIsSubmittingExcuse(false);
    }
  };

  return (
    <DashboardLayout>
      <ToastContainer />

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          {isStudent ? "My Attendance Records" : "Student Attendance Portal"}
        </h1>
        <p className="text-slate-500 text-sm">
          {isStudent ? "View your attendance history and submit excuses" : "Search for student attendance records"}
        </p>
      </div>

      {/* Admin Search Form - Only show for non-students or when not auto-loaded */}
      {(!isStudent || !isAutoLoaded) && !studentData && (
        <Card className="mb-6 bg-white shadow-sm border border-slate-100">
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Enter Matric No. (e.g., A123456)"
                  value={matricNo}
                  onChange={(e) => setMatricNo(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-teal-400 focus:outline-none text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-xl shadow-md transition disabled:opacity-50"
              >
                <Search className="w-4 h-4" />
                {loading ? "Searching..." : "Search"}
              </button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-teal-100 border-t-teal-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-500">Loading attendance records...</p>
          </div>
        </div>
      )}

      {/* Message Display */}
      {message && !loading && (
        <div className={`mb-6 p-4 rounded-xl text-sm ${message.includes("❌") ? "bg-rose-50 text-rose-700 border border-rose-200"
          : message.includes("⚠️") ? "bg-amber-50 text-amber-700 border border-amber-200"
            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
          }`}>
          {message}
        </div>
      )}

      {/* Main Content - Show when student data is loaded */}
      {studentData && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Student Info Header */}
          <Card className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                    <User className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{studentData.name}</h2>
                    <p className="text-white/80 text-sm flex items-center gap-2">
                      <span>{studentData.matric_no}</span>
                      {studentData.email && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-white/50"></span>
                          <Mail className="w-3 h-3" />
                          <span>{studentData.email}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="bg-white shadow-sm border border-slate-100">
              <CardContent className="p-5">
                <p className="text-sm text-slate-500 mb-1">Total Classes</p>
                <p className="text-2xl font-bold text-slate-800">{totalClasses}</p>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-sm border border-slate-100">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm text-slate-500">Present</p>
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-2xl font-bold text-emerald-600">{totalPresent}</p>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-sm border border-slate-100">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm text-slate-500">Late</p>
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-2xl font-bold text-amber-600">{totalLate}</p>
              </CardContent>
            </Card>
            <Card className={`shadow-sm border ${totalAbsences >= 3 ? "bg-rose-50 border-rose-200" : "bg-white border-slate-100"}`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm text-slate-500">Absent</p>
                  <AlertTriangle className={`w-4 h-4 ${totalAbsences >= 3 ? "text-rose-500" : "text-slate-400"}`} />
                </div>
                <p className={`text-2xl font-bold ${totalAbsences >= 3 ? "text-rose-600" : "text-slate-800"}`}>{totalAbsences}</p>
                {totalAbsences >= 3 && <p className="text-xs text-rose-600 mt-1">⚠️ Warning threshold</p>}
              </CardContent>
            </Card>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
            {[
              { id: "calendar", label: "Calendar", icon: CalendarIcon },
              { id: "table", label: "Details", icon: List },
              { id: "excuses", label: "My Excuses", icon: FileText },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab.id
                  ? "bg-white text-teal-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
                  }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.id === "excuses" && excuses.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-teal-100 text-teal-700 text-xs rounded-full">
                    {excuses.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <Card className="bg-white shadow-sm border border-slate-100">
            <CardContent className="p-6">
              {activeTab === "calendar" && (
                <AttendanceCalendar attendanceRecords={attendanceRecords} />
              )}

              {activeTab === "table" && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Section</TableHead>
                        <TableHead>Time</TableHead>
                        {isStudent && <TableHead className="text-right">Action</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceRecords.length > 0 ? (
                        attendanceRecords.map((record, index) => {
                          const session = record.class_sessions;
                          const section = session?.sections;
                          const course = section?.courses;
                          const hasExcuse = excuses.some(
                            (e) => e.class_session_id === record.class_session_id
                          );

                          return (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                {session?.class_date ? new Date(session.class_date).toLocaleDateString() : "N/A"}
                              </TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium capitalize
                                                                    ${record.status === "present" ? "bg-emerald-100 text-emerald-700" :
                                    record.status === "late" ? "bg-amber-100 text-amber-700" :
                                      "bg-rose-100 text-rose-700"}`}>
                                  {getStatusIcon(record.status)}
                                  {record.status}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm">
                                <span className="font-semibold">{course?.code || "N/A"}</span>
                                <span className="text-slate-500"> - {course?.name || ""}</span>
                              </TableCell>
                              <TableCell className="text-sm text-slate-600">{section?.name || "N/A"}</TableCell>
                              <TableCell className="text-sm text-slate-500">
                                {record.timestamp ? new Date(record.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "N/A"}
                              </TableCell>
                              {isStudent && (
                                <TableCell className="text-right">
                                  {record.status === "absent" && !hasExcuse && (
                                    <button
                                      onClick={() => handleSubmitExcuseClick(record)}
                                      className="px-3 py-1.5 text-xs bg-teal-50 text-teal-600 hover:bg-teal-100 rounded-lg transition font-medium"
                                    >
                                      Submit Excuse
                                    </button>
                                  )}
                                  {hasExcuse && (
                                    <span className="text-xs text-slate-500">Excuse submitted</span>
                                  )}
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={isStudent ? 6 : 5} className="text-center text-slate-500 py-8">
                            No attendance records found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {activeTab === "excuses" && (
                <div className="space-y-4">
                  {excusesLoading ? (
                    <p className="text-center text-slate-500 py-8">Loading excuses...</p>
                  ) : excuses.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">No excuse submissions yet</p>
                      <p className="text-sm text-slate-400 mt-1">Submit an excuse from the Details tab for any absence</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {excuses.map((excuse) => (
                        <div key={excuse.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium text-slate-800">
                                {excuse.sections?.courses?.code} - {excuse.sections?.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {new Date(excuse.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            {getExcuseStatusBadge(excuse.status)}
                          </div>
                          <p className="text-sm text-slate-600 mb-2">{excuse.reason}</p>
                          {excuse.admin_notes && (
                            <p className="text-xs text-slate-500 italic bg-white p-2 rounded border">
                              💬 {excuse.admin_notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Excuse Submission Modal */}
      <AnimatePresence>
        {showExcuseModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowExcuseModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-slate-800 mb-4">Submit Excuse</h3>

              <form onSubmit={handleExcuseSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Excuse Type *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {EXCUSE_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setExcuseForm({ ...excuseForm, type: type.value })}
                        className={`p-3 rounded-xl border text-left transition text-sm ${excuseForm.type === type.value
                          ? "border-teal-500 bg-teal-50 text-teal-700"
                          : "border-slate-200 hover:border-slate-300"
                          }`}
                      >
                        <span className="text-lg">{type.icon}</span>
                        <p className="font-medium mt-1">{type.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reason *</label>
                  <textarea
                    value={excuseForm.reason}
                    onChange={(e) => setExcuseForm({ ...excuseForm, reason: e.target.value })}
                    placeholder="Explain your reason..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-400 focus:outline-none resize-none text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Document (Optional)</label>
                  <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-teal-400 transition">
                    <Upload className="w-5 h-5 text-slate-400" />
                    <span className="text-sm text-slate-600">
                      {excuseFile ? excuseFile.name : "Upload MC/Document"}
                    </span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setExcuseFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowExcuseModal(false)}
                    className="flex-1 px-4 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingExcuse}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-medium transition disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    {isSubmittingExcuse ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}

export default withRole(StudentView, ["admin", "student"]);