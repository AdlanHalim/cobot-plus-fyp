/**
 * @file analysis.js
 * @location cobot-plus-fyp/pages/analysis.js
 * 
 * @description
 * Attendance Analytics Dashboard for the CObot+ Attendance System.
 * Provides comprehensive attendance metrics, charts, and intervention tools.
 * 
 * Features:
 * - KPI Cards: Average Attendance, Punctuality Score, Enrollment, Weekly Trend
 * - Attendance Trend Line Chart with goal line (80%)
 * - At-Risk Bar Chart showing 3+ and 6+ absence counts
 * - Warning List: Students with 3 absences (send warning button)
 * - Barring List: Students with 6+ absences (send barring notice)
 * - Status Breakdown Pie Chart (Present/Late/Absent)
 * - Chronic Late Arrivers List
 * - CSV and PDF export functionality
 * 
 * @access Admin, Lecturer (protected by withRole HOC)
 */

"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Mail, Users, BarChart2, TrendingUp, AlertTriangle, XCircle, CheckCircle, Clock } from "lucide-react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import withRole from "../utils/withRole";
import { useUserRole, useAttendanceData } from "@/hooks";
// PDF generation is dynamically imported when needed to reduce initial bundle

// Lazy load recharts components to reduce initial bundle size
// This improves page load performance by code-splitting heavy charting libraries

// Lazy load recharts components to reduce initial bundle size
const LineChart = dynamic(() => import("recharts").then((mod) => mod.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then((mod) => mod.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((mod) => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((mod) => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((mod) => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((mod) => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((mod) => mod.ResponsiveContainer), { ssr: false });
const BarChart = dynamic(() => import("recharts").then((mod) => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((mod) => mod.Bar), { ssr: false });
const Legend = dynamic(() => import("recharts").then((mod) => mod.Legend), { ssr: false });
const PieChart = dynamic(() => import("recharts").then((mod) => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import("recharts").then((mod) => mod.Pie), { ssr: false });
const Cell = dynamic(() => import("recharts").then((mod) => mod.Cell), { ssr: false });

const ATTENDANCE_GOAL = 80;

function AttendanceDashboard() {
  const supabase = useSupabaseClient();

  // Use custom hooks for data fetching
  const { userRole, lecturerId, isLoading: userLoading } = useUserRole();

  // Get current month as default
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [filters, setFilters] = useState({
    section: "",
    month: currentMonth,
  });

  const {
    attendanceData,
    sections,
    averageAttendance,
    punctualityScore,
    totalStudents,
    trendDifference,
    statusBreakdown,
    chronicLate,
    absent3,
    absent6,
    absenceStatusData,
    allStudentsReport,
    isLoading: dataLoading,
    setAbsent3,
    setAbsent6,
    setAbsenceStatusData,
    availableMonths,
  } = useAttendanceData({ filters, lecturerId, userRole });

  // Get selected month label for display
  const selectedMonthLabel = availableMonths?.find(m => m.value === filters.month)?.label || 'This Month';

  // Handle sending email notifications
  const handleSendEmail = async (student, absenceCount) => {
    const actionType = absenceCount === 3 ? "warning" : "barring";
    const listToUpdate = absenceCount === 3 ? absent3 : absent6;
    const setListState = absenceCount === 3 ? setAbsent3 : setAbsent6;
    const actionMessage = absenceCount === 3 ? "Warning Letter Sent" : "Exam Barring Letter Sent";

    const subject = actionType === "warning"
      ? "Attendance Warning Notice"
      : "Barring Notice – Excessive Absences";

    const bodyText = actionType === "warning"
      ? `Dear ${student.name},\n\nYou have been absent 3 times in ${student.course}.\nPlease take this as an official warning.\n\nRegards,\nAcademic Affairs Office`
      : `Dear ${student.name},\n\nYou have been absent 6 times in ${student.course}.\nAs per attendance policy, you are hereby barred from final examinations.\n\nPlease contact your course lecturer immediately.\n\nRegards,\nAcademic Affairs Office`;

    const { error: invokeError } = await supabase.functions.invoke("send-email", {
      method: "POST",
      body: {
        to: student.email,
        subject,
        content: bodyText,
        student_id: student.id,
        section_id: student.section_id,
        email_type: actionType,
      },
    });

    if (invokeError) {
      console.error("EDGE FUNCTION INVOKE FAILED:", invokeError);
      alert(`Failed to trigger email service: ${invokeError.message}`);
      return;
    }

    // Optimistically update local state
    const updatedList = listToUpdate.filter((s) => s.id !== student.id);
    setListState(updatedList);

    // Update the Bar Chart counts
    const updatedAbs3Count = absenceCount === 3 ? updatedList.length : absent3.length;
    const updatedAbs6Count = absenceCount === 6 ? updatedList.length : absent6.length;

    setAbsenceStatusData([
      {
        name: "Intervention Required",
        "3+ Absences": updatedAbs3Count,
        "6+ Absences": updatedAbs6Count,
      },
    ]);

    alert(`${actionMessage} successfully recorded and triggered for ${student.name}!`);
  };

  const handleExportCSV = () => {
    const selectedSection = sections.find((s) => s.id === filters.section);
    const sectionName = selectedSection?.name || "All Sections";

    // Build comprehensive CSV
    let csv = `Monthly Attendance Report - ${selectedMonthLabel}\n`;
    csv += `Section: ${sectionName}\n`;
    csv += `Generated: ${new Date().toLocaleString()}\n\n`;

    // Summary section
    csv += `SUMMARY\n`;
    csv += `Total Students,${totalStudents}\n`;
    csv += `Average Attendance,${averageAttendance}%\n`;
    csv += `Punctuality Score,${punctualityScore}%\n`;
    csv += `Total Present,${statusBreakdown.present}\n`;
    csv += `Total Late,${statusBreakdown.late}\n`;
    csv += `Total Absent,${statusBreakdown.absent}\n`;
    csv += `Students at Warning (3+),${absent3.length}\n`;
    csv += `Students Barred (6+),${absent6.length}\n\n`;

    // Weekly trend
    csv += `WEEKLY TREND\n`;
    csv += `Week,Attendance %,Present,Late\n`;
    attendanceData.forEach((row) => {
      csv += `${row.week},${row.attendance}%,${row.present},${row.late}\n`;
    });
    csv += `\n`;

    // Student details
    csv += `STUDENT DETAILS\n`;
    csv += `Matric No,Name,Present,Late,Absent,Attendance %,Status\n`;
    allStudentsReport.forEach((s) => {
      csv += `${s.matric_no},${s.name},${s.present},${s.late},${s.absent},${s.percentage}%,${s.status}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_report_${selectedMonthLabel.replace(/ /g, '_')}.csv`;
    a.click();
  };

  const handleExportPDF = async () => {
    // Dynamic import - only load PDF library when needed
    const { generateAndDownloadReport } = await import("../utils/generateReport");

    const selectedSection = sections.find((s) => s.id === filters.section);

    generateAndDownloadReport({
      title: `Monthly Attendance Report`,
      sectionName: selectedSection?.name || "All Sections",
      courseName: selectedSection?.courses?.name || "",
      dateRange: selectedMonthLabel,
      summary: {
        totalStudents: totalStudents || 0,
        averageAttendance: averageAttendance || 0,
        totalClasses: attendanceData.reduce((sum, w) => sum + w.present + w.late, 0),
        atRisk: absent3.length + absent6.length,
      },
      students: allStudentsReport,
      fileName: `attendance_report_${selectedMonthLabel.replace(/ /g, '_')}.pdf`,
    });
  };

  // Loading state
  if (userLoading || lecturerId === undefined) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[500px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-teal-100 border-t-teal-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-500 font-medium">Loading analysis data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Unauthorized Lecturer
  if (userRole === "lecturer" && lecturerId === null) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 min-h-[500px]">
          <h2 className="text-3xl font-bold text-rose-700 mb-4">Access Denied! 🛑</h2>
          <p className="text-lg text-slate-600 mb-2">
            Your account is assigned the **Lecturer** role, but your profile is not correctly linked.
          </p>
          <p className="text-md text-slate-500">
            Please contact an administrator to set your `lecturer_uuid` in the profiles table.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  // Student role check
  if (userRole === "student") {
    return (
      <DashboardLayout>
        <div className="text-center py-20 text-xl font-semibold text-gray-500">
          Data access for students is currently restricted.
        </div>
      </DashboardLayout>
    );
  }

  // Define chart colors matching theme
  const CHART_COLORS = {
    teal: "#14b8a6", // teal-500
    cyan: "#06b6d4", // cyan-500
    emerald: "#10b981", // emerald-500
    rose: "#f43f5e", // rose-500
    amber: "#f59e0b", // amber-500
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen p-2 space-y-6">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Attendance Analysis</h1>
            <p className="text-slate-500 text-sm">Real-time performance metrics and risk monitoring</p>
          </div>

          {/* Filters & Actions Bar */}
          <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
            <select
              className="px-3 py-2 rounded-lg border-0 bg-slate-50 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none hover:bg-slate-100 transition min-w-[180px]"
              value={filters.section}
              onChange={(e) => setFilters({ ...filters, section: e.target.value })}
            >
              <option value="">All Sections</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select
              className="px-3 py-2 rounded-lg border-0 bg-slate-50 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none hover:bg-slate-100 transition min-w-[150px]"
              value={filters.month}
              onChange={(e) => setFilters({ ...filters, month: e.target.value })}
            >
              {availableMonths?.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <div className="h-6 w-px bg-slate-200 mx-1"></div>
            <Button
              onClick={handleExportCSV}
              className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm rounded-lg text-xs font-medium px-3 py-2 h-auto"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </Button>
            <Button
              onClick={handleExportPDF}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-medium px-3 py-2 h-auto shadow-sm"
            >
              <Download className="w-3.5 h-3.5" /> PDF Report
            </Button>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white shadow-sm border border-slate-100">
            <CardContent className="p-6 flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Average Attendance</p>
                <h3 className="text-3xl font-bold text-slate-800">{averageAttendance}%</h3>
                <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Target: {ATTENDANCE_GOAL}%
                </p>
              </div>
              <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center">
                <BarChart2 className="w-5 h-5 text-teal-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border border-slate-100">
            <CardContent className="p-6 flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Punctuality Score</p>
                <h3 className={`text-3xl font-bold ${punctualityScore >= 80 ? "text-emerald-600" : punctualityScore >= 60 ? "text-amber-600" : "text-rose-600"}`}>
                  {punctualityScore}%
                </h3>
                <p className="text-xs text-slate-400 mt-1">On-time arrivals</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${punctualityScore >= 80 ? "bg-emerald-50" : punctualityScore >= 60 ? "bg-amber-50" : "bg-rose-50"}`}>
                <Clock className={`w-5 h-5 ${punctualityScore >= 80 ? "text-emerald-600" : punctualityScore >= 60 ? "text-amber-600" : "text-rose-600"}`} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border border-slate-100">
            <CardContent className="p-6 flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Total Enrollment</p>
                <h3 className="text-3xl font-bold text-slate-800">{totalStudents}</h3>
                <p className="text-xs text-slate-400 mt-1">Active students</p>
              </div>
              <div className="w-10 h-10 bg-cyan-50 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-cyan-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border border-slate-100">
            <CardContent className="p-6 flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Weekly Trend</p>
                <h3 className={`text-3xl font-bold ${trendDifference >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {trendDifference > 0 ? "+" : ""}{trendDifference}%
                </h3>
                <p className="text-xs text-slate-400 mt-1">vs. last week</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${trendDifference >= 0 ? "bg-emerald-50" : "bg-rose-50"}`}>
                <TrendingUp className={`w-5 h-5 ${trendDifference >= 0 ? "text-emerald-600" : "text-rose-600"}`} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Charts Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Trend Line Chart */}
          <Card className="lg:col-span-2 bg-white shadow-sm border border-slate-100">
            <CardHeader className="pb-2 border-b border-slate-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-800">
                  Attendance Trend - {selectedMonthLabel}
                </CardTitle>
                {attendanceData.some(d => d.isPartial) && (
                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                    * Current week (in progress)
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={attendanceData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="week"
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis
                      domain={[0, 100]}
                      unit="%"
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value, name) => [name === "goal" ? `${value}% Target` : `${value}%`, name === "goal" ? "Goal" : "Actual"]}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Line
                      type="monotone"
                      dataKey="goal"
                      stroke="#cbd5e1"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Goal (80%)"
                      activeDot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="attendance"
                      stroke={CHART_COLORS.teal}
                      strokeWidth={3}
                      dot={{ r: 4, fill: CHART_COLORS.teal, strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, fill: CHART_COLORS.teal }}
                      name="Attendance"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Right: Intervention Bar Chart */}
          <Card className="bg-white shadow-sm border border-slate-100">
            <CardHeader className="pb-2 border-b border-slate-50">
              <CardTitle className="text-base font-semibold text-slate-800">At-Risk Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={absenceStatusData} layout="vertical" margin={{ left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" hide width={10} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar
                      dataKey="3+ Absences"
                      fill={CHART_COLORS.amber}
                      name="Warning (3+)"
                      radius={[0, 4, 4, 0]}
                      barSize={30}
                      label={{ position: 'right', fill: '#64748b', fontSize: 12 }}
                    />
                    <Bar
                      dataKey="6+ Absences"
                      fill={CHART_COLORS.rose}
                      name="Barred (6+)"
                      radius={[0, 4, 4, 0]}
                      barSize={30}
                      label={{ position: 'right', fill: '#64748b', fontSize: 12 }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Lists: Warnings & Barring */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Warnings List */}
          <Card className="bg-white shadow-sm border border-slate-100 flex flex-col h-full">
            <CardHeader className="pb-3 border-b border-slate-50 bg-amber-50/50 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <CardTitle className="text-base font-semibold text-slate-800">
                  Warning Required (3 Absences)
                </CardTitle>
                <span className="ml-auto bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {absent3.length}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              {absent3.length > 0 ? (
                <div className="divide-y divide-slate-50 max-h-[300px] overflow-y-auto">
                  {absent3.map((s) => (
                    <div key={s.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between group">
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{s.name}</p>
                        <p className="text-xs text-slate-500">{s.matric_no} • {s.section_id}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSendEmail(s, 3)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-white hover:bg-amber-50 text-amber-600 border border-amber-200 shadow-sm h-8 text-xs"
                      >
                        Send Warning
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                  <CheckCircle className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-sm">No warnings pending</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Barring List */}
          <Card className="bg-white shadow-sm border border-slate-100 flex flex-col h-full">
            <CardHeader className="pb-3 border-b border-slate-50 bg-rose-50/50 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-500" />
                <CardTitle className="text-base font-semibold text-slate-800">
                  Action Required (6+ Absences)
                </CardTitle>
                <span className="ml-auto bg-rose-100 text-rose-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {absent6.length}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              {absent6.length > 0 ? (
                <div className="divide-y divide-slate-50 max-h-[300px] overflow-y-auto">
                  {absent6.map((s) => (
                    <div key={s.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between group">
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{s.name}</p>
                        <p className="text-xs text-slate-500">{s.matric_no} • {s.section_id}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSendEmail(s, 6)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-rose-500 hover:bg-rose-600 text-white shadow-sm h-8 text-xs border border-transparent"
                      >
                        Send Barring Notice
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                  <CheckCircle className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-sm">No barring actions pending</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Status Breakdown & Chronic Late */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Status Breakdown Pie Chart */}
          <Card className="bg-white shadow-sm border border-slate-100">
            <CardHeader className="pb-2 border-b border-slate-50">
              <CardTitle className="text-base font-semibold text-slate-800">Attendance Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "On Time", value: statusBreakdown.present, color: CHART_COLORS.emerald },
                        { name: "Late", value: statusBreakdown.late, color: CHART_COLORS.amber },
                        { name: "Absent", value: statusBreakdown.absent, color: CHART_COLORS.rose },
                      ].filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {[
                        { name: "On Time", value: statusBreakdown.present, color: CHART_COLORS.emerald },
                        { name: "Late", value: statusBreakdown.late, color: CHART_COLORS.amber },
                        { name: "Absent", value: statusBreakdown.absent, color: CHART_COLORS.rose },
                      ].filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div className="bg-emerald-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-emerald-600">{statusBreakdown.present}</p>
                  <p className="text-xs text-slate-500">On Time</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-amber-600">{statusBreakdown.late}</p>
                  <p className="text-xs text-slate-500">Late</p>
                </div>
                <div className="bg-rose-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-rose-600">{statusBreakdown.absent}</p>
                  <p className="text-xs text-slate-500">Absent</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chronic Late Arrivers */}
          <Card className="bg-white shadow-sm border border-slate-100 flex flex-col h-full">
            <CardHeader className="pb-3 border-b border-slate-50 bg-orange-50/50 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-500" />
                <CardTitle className="text-base font-semibold text-slate-800">
                  Chronic Late Arrivers (3+ times)
                </CardTitle>
                <span className="ml-auto bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {chronicLate.length}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              {chronicLate.length > 0 ? (
                <div className="divide-y divide-slate-50 max-h-[300px] overflow-y-auto">
                  {chronicLate.map((s) => (
                    <div key={s.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{s.name}</p>
                        <p className="text-xs text-slate-500">{s.email}</p>
                      </div>
                      <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full">
                        {s.count} times late
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                  <CheckCircle className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-sm">No chronic late arrivers</p>
                  <p className="text-xs mt-1">Select a section to view data</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </DashboardLayout>
  );
}

export default withRole(AttendanceDashboard, ["admin", "lecturer"]);