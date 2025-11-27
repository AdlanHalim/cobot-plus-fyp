"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Mail, Users, BarChart2, TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend, 
} from "recharts";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useSession } from "@supabase/auth-helpers-react";
import withRole from "../utils/withRole";

// Remove the global initialization lines:
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// const supabase = createClientComponentClient({ supabaseUrl, supabaseKey: supabaseAnonKey });

// Define the target goal for the chart background line
const ATTENDANCE_GOAL = 80;

function AttendanceDashboard() {
  // ✅ FIX: Initialize client and get environment variables safely inside the function
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClientComponentClient({ supabaseUrl, supabaseKey: supabaseAnonKey });

  const sessionResult = useSession();
  const sessionData = sessionResult?.data;

  const [attendanceData, setAttendanceData] = useState([]);
  const [absent3, setAbsent3] = useState([]);
  const [absent6, setAbsent6] = useState([]);
  const [filters, setFilters] = useState({
    section: "",
    period: "month",
  });
  
  const [sections, setSections] = useState([]); 
  const [averageAttendance, setAverageAttendance] = useState(0); 
  const [totalStudents, setTotalStudents] = useState(0);
  const [trendDifference, setTrendDifference] = useState(0);
  const [absenceStatusData, setAbsenceStatusData] = useState([]); 

  const [lecturerId, setLecturerId] = useState(undefined); 
  const [userRole, setUserRole] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const setLoadingToEmptyState = () => {
      setAttendanceData([]);
      setSections([]);
      setAverageAttendance(0);
      setTotalStudents(0);
      setTrendDifference(0);
      setAbsent3([]);
      setAbsent6([]);
  };

  // --- 1. Identify User Role & Lecturer ID (Authentication and ID determination) ---
  useEffect(() => {
    if (!sessionResult || sessionResult.isLoading) return; 

    async function getUserData() {
      if (!sessionData?.session?.user) {
        setUserRole(null);
        setLecturerId(null);
        setInitialLoading(false); 
        return;
      }

      const user = sessionData.session.user;

      // Fetch role and lecturer_uuid
      const { data: profileData } = await supabase
          .from("profiles")
          .select("role, lecturer_uuid") 
          .eq("id", user.id)
          .single();

      const role = profileData?.role || 'student';
      setUserRole(role);

      let foundLecturerId = null;

      // Get Lecturer ID directly from the profiles table
      if (role === 'lecturer') {
          foundLecturerId = profileData?.lecturer_uuid || null; 
      } 
      
      // Set final lecturerId state based on role/ID check
      if (role === 'admin') {
          setLecturerId(false); // Admin bypass (no filtering)
      } else {
          setLecturerId(foundLecturerId); // Sets to UUID or null (unauthorized)
      }
      
      setInitialLoading(false); 
    }
    getUserData();
  }, [sessionResult]); 

  // --- 2. Main Data Fetching Effect (Filters data based on determined ID) ---
  useEffect(() => {
    if (initialLoading || lecturerId === undefined || userRole === 'student') return;

    if (userRole === 'lecturer' && lecturerId === null) {
        setLoadingToEmptyState();
        return; 
    }

    async function fetchData() {
      try {
        const isLecturerFilterNeeded = (userRole === 'lecturer' && lecturerId);
        
        // --- A. Load SECTIONS Dropdown (with Visibility Filter) ---
        let sectionBaseQuery = supabase
          .from("sections")
          .select(`
            id, 
            name, 
            course_id, 
            lecturer_id,
            is_hidden_from_analysis,  
            courses!inner(code)
          `); 

        
        // CRITICAL FILTER 1: Apply Lecturer Scope
        if (isLecturerFilterNeeded) {
            sectionBaseQuery = sectionBaseQuery.eq("lecturer_id", lecturerId);
        }

        // CRITICAL FILTER 2: Apply Visibility Filter (Exclude hidden sections)
        sectionBaseQuery = sectionBaseQuery.eq("is_hidden_from_analysis", false);
        

        const { data: baseSections, error: sectionsError } = await sectionBaseQuery;
        if (sectionsError) throw sectionsError;
        
        // Set sections for the dropdown
        const formattedSections = baseSections.map(s => ({
            id: s.id,
            name: `${s.courses.code} - ${s.name}`, 
            course_id: s.course_id 
        }));
        setSections(formattedSections);


        // --- B. Attendance Trend Calculation ---
        let attendanceQuery = supabase
            .from("attendance_records")
            .select(`
                status,
                class_sessions!inner(
                    class_date,
                    section_id,
                    sections!inner(lecturer_id, is_hidden_from_analysis)
                )
            `);

        // Apply Lecturer Filter
        if (isLecturerFilterNeeded) {
            attendanceQuery = attendanceQuery.eq("class_sessions.sections.lecturer_id", lecturerId);
        }
        
        // Apply Visibility Filter
        attendanceQuery = attendanceQuery.eq("class_sessions.sections.is_hidden_from_analysis", false);

        // Apply UI Filter
        if (filters.section) attendanceQuery = attendanceQuery.eq("class_sessions.section_id", filters.section);

        const { data: trend, error: trendError } = await attendanceQuery;
        if (trendError) throw trendError;
        
        // Trend transform - FIXING THE WEEK ORDERING
        const grouped = {};
        trend?.forEach(r => {
            const date = new Date(r.class_sessions.class_date);
            const weekIndex = Math.ceil(date.getDate() / 7); 
            const weekLabel = `Wk ${weekIndex}`;

            if (!grouped[weekIndex]) grouped[weekIndex] = { 
                weekIndex, 
                week: weekLabel, 
                total: 0, 
                present: 0 
            };
            grouped[weekIndex].total += 1;
            if (r.status === "present") grouped[weekIndex].present += 1;
        });

        // Calculate percentage, add goal, AND SORT BY NUMERICAL INDEX
        const formattedTrend = Object.values(grouped)
            .map(w => ({
                week: w.week,
                weekIndex: w.weekIndex, 
                attendance: Math.round((w.present / w.total) * 100), 
                goal: ATTENDANCE_GOAL 
            }))
            .sort((a, b) => a.weekIndex - b.weekIndex); 

        setAttendanceData(formattedTrend);

        // Summary Calculations
        const totalRecords = trend?.length || 0;
        const presentRecords = trend?.filter(r => r.status === "present").length || 0;
        
        const overallAverage = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0;
        setAverageAttendance(overallAverage); 

        // Total Students (Filtered)
        let studentQuery = supabase
            .from("student_section_enrollments")
            .select("student_id, sections!inner(lecturer_id, is_hidden_from_analysis)");

        if (isLecturerFilterNeeded) {
             studentQuery = studentQuery.eq("sections.lecturer_id", lecturerId);
        }
        studentQuery = studentQuery.eq("sections.is_hidden_from_analysis", false);
        
        if (filters.section) studentQuery = studentQuery.eq("section_id", filters.section);

        const { data: students } = await studentQuery;
        setTotalStudents(new Set(students?.map(s => s.student_id)).size);

        // Trend Difference (Percentage Change between the last two weeks)
        const currentWeekAvg = formattedTrend.length > 0 ? formattedTrend[formattedTrend.length - 1].attendance : 0;
        const previousWeekAvg = formattedTrend.length > 1 ? formattedTrend[formattedTrend.length - 2].attendance : 0;
        const diffPercent = Math.round(currentWeekAvg - previousWeekAvg);
        setTrendDifference(diffPercent);

        // --- C. ACTIONABLE FIX: Load Absences 3 & 6 Filtered DIRECTLY by Section ID ---
        
        const targetSectionId = filters.section;
        
        let absent3List = [];
        let absent6List = [];

        if (targetSectionId) {
            // Fetch ALL absences for courses associated with the lecturer's sections
            const { data: allAbsencesData, error: absDataError } = await supabase
                .from("student_course_attendance")
                .select(`
                    absence_count, 
                    student_id,
                    student:student_id(id, name, nickname, email), 
                    sections!inner(courses!inner(code))
                `)
                .eq("section_id", targetSectionId); // Filter by section_id directly
                
            if (absDataError) {
                console.error("Absence Data Fetch Error:", absDataError);
            }
            
            const safeAllAbsencesData = allAbsencesData || []; 

            // Map data, extracting Course Code via the Section join
            const mapAbsences = (data, count) => data
                .filter(s => s.absence_count === count)
                .map(s => ({ 
                    id: s.student_id,
                    name: s.student.nickname || s.student.name, 
                    course: s.sections.courses.code,
                    section_id: targetSectionId,
                    email: s.student.email, // Include email for the Edge Function
                }));

            absent3List = mapAbsences(safeAllAbsencesData, 3);
            absent6List = mapAbsences(safeAllAbsencesData, 6);

            // Update Absence Status Data for the bar chart
            setAbsenceStatusData([
                {
                    name: 'Intervention Required',
                    '3+ Absences': absent3List.length,
                    '6+ Absences': absent6List.length,
                }
            ]);

        } else {
            // No section selected, clear lists and chart data
            setAbsent3([]);
            setAbsent6([]);
            setAbsenceStatusData([]); 
        }

        setAbsent3(absent3List);
        setAbsent6(absent6List);


      } catch (error) {
        console.error("Fetch Error:", error);
        setLoadingToEmptyState();
      }
    }

    fetchData();
  }, [filters, lecturerId, userRole, initialLoading]); 

  // --- NEW: handleSendEmail function to call Edge Function and update DB flags ---
  const handleSendEmail = async (student, absenceCount) => {
    
    const actionType = absenceCount === 3 ? 'warning' : 'barring';
    const listToUpdate = absenceCount === 3 ? absent3 : absent6;
    const setListState = absenceCount === 3 ? setAbsent3 : setAbsent6;
    const actionMessage = absenceCount === 3 ? 'Warning Letter Sent' : 'Exam Barring Letter Sent';
    
    // 1. Invoke the secure Supabase Edge Function
    const subject = actionType === 'warning'
      ? 'Attendance Warning Notice'
      : 'Barring Notice – Excessive Absences';

    const bodyText = actionType === 'warning'
      ? `Dear ${student.name},\n\nYou have been absent 3 times in ${student.course}.\nPlease take this as an official warning.\n\nRegards,\nAcademic Affairs Office`
      : `Dear ${student.name},\n\nYou have been absent 6 times in ${student.course}.\nAs per attendance policy, you are hereby barred from final examinations.\n\nPlease contact your course lecturer immediately.\n\nRegards,\nAcademic Affairs Office`;

    const { data: edgeFunctionResponse, error: invokeError } = await supabase.functions.invoke(
      'send-email', // The name of your deployed Edge Function
      {
        method: 'POST',
        body: {
          to: student.email,
          subject,
          body: bodyText,
        }
      }
    );

    if (invokeError) {
        console.error("EDGE FUNCTION INVOKE FAILED:", invokeError);
        alert(`Failed to trigger email service: ${invokeError.message}`);
        return;
    }
    
    // 2. Optimistically update local state (remove student from the intervention list)
    const updatedList = listToUpdate.filter(s => s.id !== student.id);
    setListState(updatedList);
    
    // 3. Update the Bar Chart counts (manually, since state changed)
    const updatedAbs3Count = absenceCount === 3 ? updatedList.length : absent3.length;
    const updatedAbs6Count = absenceCount === 6 ? updatedList.length : absent6.length;

    setAbsenceStatusData([
        {
            name: 'Intervention Required',
            '3+ Absences': updatedAbs3Count,
            '6+ Absences': updatedAbs6Count,
        }
    ]);

    // Final confirmation message
    alert(`${actionMessage} successfully recorded and triggered for ${student.name}!`);
  };


  // --- Render Logic ---
  if (initialLoading || lecturerId === undefined) {
      return (
        <DashboardLayout>
            <div className="text-center py-20 text-xl font-semibold text-sky-600">Loading user permissions...</div>
        </DashboardLayout>
      );
  }

  // Unauthorized Lecturer
  if (userRole === 'lecturer' && lecturerId === null) {
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
  if (userRole === 'student') {
      return (
        <DashboardLayout>
            <div className="text-center py-20 text-xl font-semibold text-gray-500">
                Data access for students is currently restricted.
            </div>
        </DashboardLayout>
      );
  }


  const handleExportCSV = () => {
    const headers = "Week,Attendance Percentage\n";
    const rows = attendanceData
      .map((row) => `${row.week},${row.attendance}`)
      .join("\n");
    const csv = headers + rows;

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "attendance_report.csv";
    a.click();
  };


  return (
    <DashboardLayout>
      <div className="min-h-screen p-6 space-y-6 bg-[#e6f0fb] text-slate-700">
        <h1 className="text-2xl font-semibold sm:mr-4 bg-gradient-to-r from-indigo-600 via-sky-600 to-teal-600 bg-clip-text text-transparent">
          📊 Attendance Analysis Report
        </h1>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/50 backdrop-blur-md rounded-xl p-4 shadow-md border border-slate-200">
          

          <div className="flex flex-wrap gap-2 items-center flex-1">
            {/* Section Dropdown (Primary filter) */}
            <select
              className="px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white/80 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                onChange={(e) => setFilters({ ...filters, section: e.target.value })}>
                  <option value="">Filter by Section</option>
                  {sections.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option> 
                  ))}
            </select>

            <Button
              onClick={handleExportCSV}
              className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-indigo-500 hover:scale-[1.03] text-white rounded-xl text-sm px-4 py-2"
            >
              <Download className="w-4 h-4" /> Export Report Data
            </Button>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="shadow-md hover:shadow-lg transition-all">
                <CardHeader className="flex items-center justify-between">
                <CardTitle>Overall Attendance</CardTitle>
                <BarChart2 className="w-5 h-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                <p className="text-3xl font-bold text-blue-600">{averageAttendance}%</p>
                <p className="text-sm text-gray-500 mt-1">Average across filtered period</p>
                </CardContent>
            </Card>

            <Card className="shadow-md hover:shadow-lg transition-all">
                <CardHeader className="flex items-center justify-between">
                <CardTitle>Total Students</CardTitle>
                <Users className="w-5 h-5 text-green-600" />
                </CardHeader>
                <CardContent>
                <p className="text-3xl font-bold text-green-600">{totalStudents}</p>
                <p className="text-sm text-gray-500 mt-1">Total enrolled students</p>
                </CardContent>
            </Card>

            <Card className="shadow-md hover:shadow-lg transition-all">
                <CardHeader className="flex items-center justify-between">
                <CardTitle>Weekly Trend</CardTitle>
                <TrendingUp className="w-5 h-5 text-yellow-600" />
                </CardHeader>
                <CardContent>
                <p className="text-3xl font-bold text-yellow-600">{trendDifference}%</p>
                <p className="text-sm text-gray-500 mt-1">Change from previous week</p>
                </CardContent>
            </Card>
        </div>

        {/* Charts & Absence Lists */}
        <div className="grid lg:grid-cols-3 gap-4">
            {/* Line Chart: Percentage Trend with Goal Line */}
            <Card className="lg:col-span-2 shadow-md">
            <CardHeader>
              <CardTitle>Attendance Performance Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis domain={[50, 100]} unit="%" /> 
                  <Tooltip formatter={(value, name) => [name === 'goal' ? `${value}% Target` : `${value}%`, name]} />
                  
                  {/* Goal Line */}
                  <Line 
                    type="monotone"
                    dataKey="goal"
                    stroke="#EF4444" // Red color
                    strokeWidth={2}
                    strokeDasharray="3 3" 
                    dot={false}
                    isAnimationActive={false}
                  />
                  {/* Actual Attendance Line */}
                  <Line
                    type="monotone"
                    dataKey="attendance"
                    stroke="#2563eb"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-sm text-gray-500 mt-2 text-center">Red line indicates the {ATTENDANCE_GOAL}% performance target.</p>
            </CardContent>
          </Card>

          {/* Absence Lists (Actionable: Filtered by Section) */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>3 Absences ({filters.section ? 'Filtered' : 'Select Section'})</CardTitle>
            </CardHeader>
            <CardContent>
              {filters.section && absent3.length > 0 ? (
                <ul className="space-y-2">
                  {absent3.map((s) => (
                    <li
                      key={s.id}
                      className="flex justify-between items-center bg-white/70 backdrop-blur-md p-2 rounded-xl border border-slate-200"
                    >
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-sm text-slate-500">
                          {s.course} | Section: {s.section_id} {/* Display Section ID */}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSendEmail(s, 3)} 
                        className="flex items-center gap-1 bg-gradient-to-r from-teal-500 to-indigo-500 text-white rounded-lg px-3 py-1"
                      >
                        <Mail className="w-4 h-4" /> Notify
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">
                  {filters.section ? `✅ No alerts for Section ${filters.section}` : 'Please select a section to view actionable alerts.'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>6 Absences ({filters.section ? 'Filtered' : 'Select Section'})</CardTitle>
            </CardHeader>
            <CardContent>
              {filters.section && absent6.length > 0 ? (
                <ul className="space-y-2">
                  {absent6.map((s) => (
                    <li
                      key={s.id}
                      className="flex justify-between items-center bg-white/70 backdrop-blur-md p-2 rounded-xl border border-slate-200"
                    >
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-sm text-slate-500">
                          {s.course} | Section: {s.section_id} {/* Display Section ID */}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSendEmail(s, 6)} 
                        className="flex items-center gap-1 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg px-3 py-1"
                      >
                        <Mail className="w-4 h-4" /> Warn
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">
                  {filters.section ? `✅ No alerts for Section ${filters.section}` : 'Please select a section to view actionable alerts.'}
                </p>
              )}
            </CardContent>
          </Card>
          
          {/* New Bar Chart: Absence Status Comparison */}
          <Card className="lg:col-span-2 shadow-md">
            <CardHeader>
              <CardTitle>Intervention Status</CardTitle>
              <p className="text-xs text-gray-500">Students requiring 3+ or 6+ absence intervention.</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={absenceStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} label={{ value: 'Students', angle: -90, position: 'insideLeft' }} />
                  <Tooltip 
                    formatter={(value, name) => [value, name]} 
                    cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} 
                  />
                  <Legend />
                  
                  {/* Bar for 3 Absences (Warning) */}
                  <Bar dataKey="3+ Absences" fill="#facc15" name="3+ Absences (Warning)" radius={[6, 6, 0, 0]} />
                  
                  {/* Bar for 6 Absences (Barring) */}
                  <Bar dataKey="6+ Absences" fill="#ef4444" name="6+ Absences (Barring)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default withRole(AttendanceDashboard, ["admin", "lecturer"]);