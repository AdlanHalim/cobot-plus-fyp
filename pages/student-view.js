"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, Clock, Search, User, Mail, Calendar as CalendarIcon, List } from "lucide-react";
import { AttendanceCalendar } from "@/components/attendance/AttendanceCalendar";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { useStudentSearch } from "@/hooks";

function StudentView() {
  const [activeTab, setActiveTab] = useState("calendar");

  // Use custom hook for student search
  const {
    matricNo,
    setMatricNo,
    studentData,
    attendanceRecords,
    totalAbsences,
    loading,
    message,
    handleSearch,
  } = useStudentSearch();

  const getStatusIcon = (status) => {
    switch (status) {
      case "present": return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case "absent": return <AlertTriangle className="w-5 h-5 text-rose-500" />;
      case "late": return <Clock className="w-5 h-5 text-amber-500" />;
      default: return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-start py-8 min-h-screen">
        <motion.div
          className="w-full max-w-5xl bg-white border border-slate-100 rounded-3xl shadow-sm p-8 space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-left mb-6">
            <h1 className="text-2xl font-bold text-slate-800">Student Attendance Portal</h1>
            <p className="text-slate-500 text-sm">Enter your matric number to view records</p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <input
              type="text"
              placeholder="Enter your Matric No. (e.g., A123456)"
              value={matricNo}
              onChange={(e) => setMatricNo(e.target.value)}
              required
              className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-base focus:ring-2 focus:ring-teal-500 outline-none transition"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-400 hover:scale-[1.03] text-white font-medium rounded-xl shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Search className="w-5 h-5" />
              {loading ? "Searching..." : "Search Records"}
            </button>
          </form>

          {message && (
            <p className={`text-center text-sm mt-4 p-3 rounded-lg ${message.includes("❌") ? "text-rose-700 bg-rose-100 border border-rose-300"
              : message.includes("⚠️") ? "text-amber-700 bg-amber-100 border border-amber-300"
                : "text-emerald-700 bg-emerald-100 border border-emerald-300"
              }`}>
              {message}
            </p>
          )}

          {/* Results Display */}
          {studentData && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pt-4">
              {/* Student Header */}
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4 p-4 bg-teal-50 rounded-xl shadow-md border-l-4 border-teal-500">
                <div className="flex items-start gap-3">
                  <User className="w-7 h-7 text-teal-600 flex-shrink-0" />
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{studentData.name}</h2>
                    <p className="text-sm text-teal-700 font-medium">
                      Matric No: {studentData.matric_no}
                      {studentData.email && (
                        <span className="ml-4 flex items-center gap-1 text-slate-500">
                          <Mail className="w-3 h-3" />{studentData.email}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Total Absences */}
                <div className="flex flex-col items-end sm:items-center p-2 bg-white rounded-lg shadow-inner border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl font-extrabold ${totalAbsences >= 5 ? "text-rose-600" : "text-emerald-600"}`}>
                      {totalAbsences}
                    </span>
                    <p className="text-sm text-slate-700 font-medium whitespace-nowrap">Total Absences</p>
                  </div>
                  <span className={`text-xs mt-1 font-semibold ${totalAbsences >= 5 ? "text-rose-600" : "text-emerald-600"}`}>
                    {totalAbsences >= 5 ? "⚠️ High risk of warning." : "Attendance: Good."}
                  </span>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-slate-200">
                <button
                  onClick={() => setActiveTab("calendar")}
                  className={`px-6 py-3 text-sm font-medium transition duration-200 flex items-center gap-2 ${activeTab === "calendar"
                    ? "text-teal-600 border-b-2 border-teal-600 bg-teal-50/50"
                    : "text-slate-500 hover:text-slate-700"
                    }`}
                >
                  <CalendarIcon className="w-4 h-4" />
                  Calendar View
                </button>
                <button
                  onClick={() => setActiveTab("table")}
                  className={`px-6 py-3 text-sm font-medium transition duration-200 flex items-center gap-2 ${activeTab === "table"
                    ? "text-teal-600 border-b-2 border-teal-600 bg-teal-50/50"
                    : "text-slate-500 hover:text-slate-700"
                    }`}
                >
                  <List className="w-4 h-4" />
                  Detailed Log Table ({attendanceRecords.length})
                </button>
              </div>

              {/* Tab Content */}
              <div className="pt-4">
                {activeTab === "calendar" && <AttendanceCalendar attendanceRecords={attendanceRecords} />}

                {activeTab === "table" && (
                  <div className="overflow-x-auto max-h-96 border border-slate-200 rounded-xl shadow-inner">
                    <Table>
                      <TableHeader className="bg-slate-100 sticky top-0 shadow-sm z-10">
                        <TableRow>
                          <TableHead className="w-[150px]">Date</TableHead>
                          <TableHead className="w-[150px]">Status</TableHead>
                          <TableHead>Course</TableHead>
                          <TableHead>Section</TableHead>
                          <TableHead>Time Recorded</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceRecords.length > 0 ? (
                          attendanceRecords.map((record, index) => {
                            const session = record.class_sessions;
                            const section = session?.sections;
                            const course = section?.courses;

                            return (
                              <TableRow key={index} className="transition duration-100 ease-in-out">
                                <TableCell className="font-medium text-slate-700">
                                  {session?.class_date ? new Date(session.class_date).toLocaleDateString() : "N/A"}
                                </TableCell>
                                <TableCell className="flex items-center gap-2 capitalize">
                                  {getStatusIcon(record.status)}
                                  <span className={`font-semibold ${record.status === "absent" ? "text-rose-600"
                                    : record.status === "present" ? "text-emerald-600"
                                      : "text-amber-600"
                                    }`}>
                                    {record.status}
                                  </span>
                                </TableCell>
                                <TableCell className="text-sm text-slate-600">
                                  <span className="font-bold">{course?.code || "N/A"}</span> - {course?.name || "N/A"}
                                </TableCell>
                                <TableCell className="text-sm text-slate-500">{section?.name || "N/A"}</TableCell>
                                <TableCell className="text-sm text-slate-500">
                                  {record.timestamp ? new Date(record.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "N/A"}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-slate-500 italic py-4">
                              No attendance records found for this student.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}

export default StudentView;