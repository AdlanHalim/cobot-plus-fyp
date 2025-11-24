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
} from "recharts";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useSession } from "@supabase/auth-helpers-react";
import withRole from "../utils/withRole";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClientComponentClient({ supabaseUrl, supabaseKey: supabaseAnonKey });

function AttendanceDashboard() {
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
        
        // --- DEBUG LOGS ---
        console.log("--- FETCH START ---");
        console.log("DEBUG: Current User Role:", userRole);
        console.log("DEBUG: Current Lecturer ID (UUID/false/null):", lecturerId);
        console.log("DEBUG: Is Lecturer Filter Needed:", isLecturerFilterNeeded);
        console.log("-------------------");
        // --- END DEBUG LOGS ---


        // --- A. Load SECTIONS & COURSES Data ---
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

        // ❌ FIX: Apply Visibility Filter (Exclude hidden sections)
        sectionBaseQuery = sectionBaseQuery.eq("is_hidden_from_analysis", false);
        

        const { data: baseSections, error: sectionsError } = await sectionBaseQuery;
        if (sectionsError) throw sectionsError;
        
        // Set sections for the dropdown (including course code for clarity)
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
        
        // Trend transform
        const grouped = {};
        trend?.forEach(r => {
            const date = new Date(r.class_sessions.class_date);
            const week = `Wk ${Math.ceil(date.getDate() / 7)}`; 
            if (!grouped[week]) grouped[week] = { week, total: 0, present: 0 };
            grouped[week].total += 1;
            if (r.status === "present") grouped[week].present += 1;
        });

        const formattedTrend = Object.values(grouped).map(w => ({
            week: w.week,
            attendance: Math.round((w.present / w.total) * 100),
        }));

        setAttendanceData(formattedTrend);

        // Summary Calculations
        const total = trend?.length || 0;
        const present = trend?.filter(r => r.status === "present").length || 0;
        const average = total > 0 ? Math.round((present / total) * 100) : 0;
        setAverageAttendance(average);

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

        // Trend Difference
        const thisPeriod = average;
        const lastPeriod = formattedTrend.length > 1 ? formattedTrend[formattedTrend.length - 2].attendance : average;
        setTrendDifference(Math.round(thisPeriod - lastPeriod));

        // Load Absences 3 & 6 (Keeping same for now)
        const { data: abs3 } = await supabase
            .from("student_course_attendance")
            .select(`absence_count, student:student_id(name, nickname), course:course_id(code)`)
            .eq("absence_count", 3);
        setAbsent3(abs3?.map(s => ({ id: s.student_id, name: s.student.nickname, course: s.course.code })));

        const { data: abs6 } = await supabase
            .from("student_course_attendance")
            .select(`absence_count, student:student_id(name, nickname), course:course_id(code)`)
            .eq("absence_count", 6);
        setAbsent6(abs6?.map(s => ({ id: s.student_id, name: s.student.nickname, course: s.course.code })));

      } catch (error) {
        console.error("Fetch Error:", error);
        setLoadingToEmptyState();
      }
    }

    fetchData();
  }, [filters, lecturerId, userRole, initialLoading]); 

  // --- Render Logic (Unchanged) ---
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


  const handleSendEmail = (student) => {
    console.log(`Email sent to ${student.name}`); 
    setAbsent3(absent3.filter((s) => s.id !== student.id));
    setAbsent6(absent6.filter((s) => s.id !== student.id));
  };

  const handleExportCSV = () => {
    const headers = "Week,Attendance\n";
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/50 backdrop-blur-md rounded-xl p-4 shadow-md border border-slate-200">
          <h1 className="text-2xl font-semibold sm:mr-4 bg-gradient-to-r from-indigo-600 via-sky-600 to-teal-600 bg-clip-text text-transparent">
            📊 Attendance Analytics
          </h1>

          <div className="flex flex-wrap gap-2 items-center flex-1">
            {/* Section Dropdown (Primary filter) */}
            <select
              className="px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white/80 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                onChange={(e) => setFilters({ ...filters, section: e.target.value })}>
                  <option value="">Filter by Section</option>
                  {sections.map(s => (
                    // Display includes course code for context
                    <option key={s.id} value={s.id}>{s.name}</option> 
                  ))}
            </select>

            <Button
              onClick={handleExportCSV}
              className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-indigo-500 hover:scale-[1.03] text-white rounded-xl text-sm px-4 py-2"
            >
              <Download className="w-4 h-4" /> Export CSV
            </Button>
          </div>
        </div>
        
        {/* Summary Cards and Charts (JSX remains the same) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="shadow-md hover:shadow-lg transition-all">
                <CardHeader className="flex items-center justify-between">
                <CardTitle>Average Attendance</CardTitle>
                <BarChart2 className="w-5 h-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                <p className="text-3xl font-bold text-blue-600">{averageAttendance}%</p>
                <p className="text-sm text-gray-500 mt-1">This semester</p>
                </CardContent>
            </Card>

            <Card className="shadow-md hover:shadow-lg transition-all">
                <CardHeader className="flex items-center justify-between">
                <CardTitle>Total Students</CardTitle>
                <Users className="w-5 h-5 text-green-600" />
                </CardHeader>
                <CardContent>
                <p className="text-3xl font-bold text-green-600">{totalStudents}</p>
                <p className="text-sm text-gray-500 mt-1">Across all sections</p>
                </CardContent>
            </Card>

            <Card className="shadow-md hover:shadow-lg transition-all">
                <CardHeader className="flex items-center justify-between">
                <CardTitle>Attendance Trend</CardTitle>
                <TrendingUp className="w-5 h-5 text-yellow-600" />
                </CardHeader>
                <CardContent>
                <p className="text-3xl font-bold text-yellow-600">{trendDifference}%</p>
                <p className="text-sm text-gray-500 mt-1">Compared to last month</p>
                </CardContent>
            </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 shadow-md">
            <CardHeader>
              <CardTitle>Attendance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="attendance"
                    stroke="#2563eb"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>3 Absences</CardTitle>
            </CardHeader>
            <CardContent>
              {absent3.length > 0 ? (
                <ul className="space-y-2">
                  {absent3.map((s) => (
                    <li
                      key={s.id}
                      className="flex justify-between items-center bg-white/70 backdrop-blur-md p-2 rounded-xl border border-slate-200"
                    >
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-sm text-slate-500">
                          {s.course}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSendEmail(s)}
                        className="flex items-center gap-1 bg-gradient-to-r from-teal-500 to-indigo-500 text-white rounded-lg px-3 py-1"
                      >
                        <Mail className="w-4 h-4" /> Notify
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">✅ No pending alerts.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>6 Absences</CardTitle>
            </CardHeader>
            <CardContent>
              {absent6.length > 0 ? (
                <ul className="space-y-2">
                  {absent6.map((s) => (
                    <li
                      key={s.id}
                      className="flex justify-between items-center bg-white/70 backdrop-blur-md p-2 rounded-xl border border-slate-200"
                    >
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-sm text-slate-500">
                          {s.course}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSendEmail(s)}
                        className="flex items-center gap-1 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg px-3 py-1"
                      >
                        <Mail className="w-4 h-4" /> Warn
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">✅ No warnings pending.</p>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 shadow-md">
            <CardHeader>
              <CardTitle>Attendance by Week</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="attendance" fill="#16a34a" radius={[6, 6, 0, 0]} />
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