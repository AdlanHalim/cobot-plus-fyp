"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout"; 
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, Clock, Search, User, Mail } from 'lucide-react'; 

// ✅ INLINED TABLE COMPONENT DEFINITIONS START (To prevent module not found errors)
const Table = ({ children }) => (
  <div className="w-full">
    <table className="min-w-full divide-y divide-slate-200/80">{children}</table>
  </div>
);
const TableHeader = ({ children }) => (
  <thead>{children}</thead>
);
const TableHead = ({ children, className = "" }) => (
  <th className={`px-4 py-2 text-left text-xs font-medium text-slate-600 uppercase tracking-wider ${className}`}>
    {children}
  </th>
);
const TableBody = ({ children }) => (
  <tbody className="divide-y divide-slate-100">{children}</tbody>
);
const TableRow = ({ children, className = "" }) => (
  <tr className={`hover:bg-slate-50/50 ${className}`}>{children}</tr>
);
const TableCell = ({ children, className = "" }) => (
  <td className={`px-4 py-3 whitespace-nowrap ${className}`}>{children}</td>
);
// ✅ INLINED TABLE COMPONENT DEFINITIONS END


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClientComponentClient({ supabaseUrl, supabaseKey: supabaseAnonKey });

function StudentView() {
  const [matricNo, setMatricNo] = useState("");
  const [studentData, setStudentData] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState([]); // Stores { sectionId, absenceCount, lecturerEmail }
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSearch = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    setStudentData(null);
    setAttendanceSummary([]);

    if (!matricNo) {
      setMessage("⚠️ Please enter your Matric No.");
      setLoading(false);
      return;
    }

    try {
      // 1. Find Student ID and details
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id, name, nickname, matric_no, email") 
        .eq("matric_no", matricNo)
        .single();

      if (studentError || !student) {
        setMessage(`❌ Error: Student with Matric No. ${matricNo} not found.`);
        setLoading(false);
        return;
      }
      
      setStudentData(student);
      
      // 2. Find all sections student is enrolled in
      const { data: enrollments } = await supabase
        .from("student_section_enrollments")
        .select(`
          section_id,
          sections (
            name, 
            lecturer_id,
            courses ( code, name ),
            lecturers ( email ) // Join to get lecturer email for action button
          )
        `)
        .eq("student_id", student.id);
      
      if (!enrollments || enrollments.length === 0) {
        setMessage(`✅ Student found, but no active course enrollments.`);
        setLoading(false);
        return;
      }

      // 3. Fetch detailed attendance and calculate absence count for each section
      const summaryPromises = enrollments.map(async (enrollment) => {
        const section = enrollment.sections;
        const sectionId = enrollment.section_id;
        const lecturerEmail = section.lecturers?.email;

        // Query all attendance records for this student and this section
        const { data: records } = await supabase
          .from("attendance_records")
          .select(`
            status,
            timestamp,
            class_sessions!inner(class_date)
          `)
          .eq("student_id", student.id)
          .eq("class_sessions.section_id", sectionId) 
          .order("class_sessions.class_date", { ascending: true });

        const absenceCount = (records || []).filter(r => r.status === 'absent').length;

        return {
          sectionId,
          courseCode: section.courses.code,
          courseName: section.courses.name,
          sectionName: section.name,
          lecturerEmail,
          absenceCount,
          records: records || []
        };
      });

      const summaryResults = await Promise.all(summaryPromises);
      setAttendanceSummary(summaryResults);

      setMessage(`✅ Attendance records loaded.`);

    } catch (error) {
      console.error("Student View Fetch Error:", error);
      setMessage("❌ An unexpected internal error occurred while fetching data.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLecturer = (courseCode, lecturerEmail) => {
    if (!lecturerEmail) {
      alert(`Error: Lecturer email not found for ${courseCode}.`);
      return;
    }
    
    // Placeholder to open the user's default email client
    const subject = `Excuse Letter for Absences in ${courseCode}`;
    const body = `Dear Lecturer,

Please find attached my excuse letter/documentation regarding my recent absences in your course (${courseCode}). 
I would appreciate it if you could review this at your earliest convenience.

Thank you,
${studentData.name} (${studentData.matric_no})`;
    
    window.location.href = `mailto:${lecturerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  
  const getStatusIcon = (status) => {
    switch (status) {
      case 'present': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'absent': return <AlertTriangle className="w-5 h-5 text-rose-500" />;
      case 'late': return <Clock className="w-5 h-5 text-amber-500" />;
      default: return null;
    }
  };

  return (
    <DashboardLayout> 
      <div className="flex flex-col items-center justify-start py-8">
        
        <motion.div
          className="w-full max-w-5xl bg-white/90 backdrop-blur-md border border-slate-200/50 rounded-3xl shadow-2xl p-8 space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 via-sky-600 to-teal-600 bg-clip-text text-transparent mb-2">
              Student Attendance Portal
            </h1>
            <p className="text-slate-600 text-sm">Enter your matric number to view your records.</p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex gap-3 p-4 bg-slate-100/50 rounded-xl shadow-inner border border-slate-200">
            <input
              type="text"
              placeholder="Enter your Matric No. (e.g., A123456)"
              value={matricNo}
              onChange={(e) => setMatricNo(e.target.value)}
              required
              className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-base focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-teal-400 hover:scale-[1.03] text-white font-medium rounded-xl shadow-md transition disabled:opacity-50"
            >
              <Search className="w-5 h-5" />
              {loading ? "Searching..." : "Search"}
            </button>
          </form>

          {message && <p className={`text-center text-sm mt-4 ${message.includes('❌') ? 'text-rose-600 bg-rose-50 p-2 rounded-lg' : 'text-emerald-600'}`}>{message}</p>}

          {/* Results Display */}
          {studentData && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pt-4">
                  <div className="flex items-center gap-2 border-b pb-3 border-slate-200/80">
                    <User className="w-6 h-6 text-indigo-500" />
                    <h2 className="text-xl font-semibold text-slate-700">
                      Welcome, {studentData.nickname || studentData.name} ({studentData.matric_no})
                    </h2>
                  </div>

                  {attendanceSummary.length > 0 ? (
                      attendanceSummary.map((summary) => (
                          <div key={summary.sectionId} className="bg-slate-50/90 p-5 rounded-xl shadow-lg border border-slate-200 space-y-4">
                              <h3 className="text-lg font-bold text-sky-600">
                                  {summary.courseCode}: {summary.courseName} — Section {summary.sectionName}
                              </h3>

                              {/* Absence Summary & Action */}
                              <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-inner border border-amber-100">
                                  <div className="flex items-center gap-4">
                                      <span className={`text-3xl font-extrabold ${summary.absenceCount >= 3 ? 'text-rose-600' : 'text-green-600'}`}>
                                          {summary.absenceCount}
                                      </span>
                                      <p className="text-sm text-slate-600">
                                          Total Absences Recorded
                                      </p>
                                  </div>
                                  
                                  {/* Action Button */}
                                  <button
                                      onClick={() => handleEmailLecturer(summary.courseCode, summary.lecturerEmail)}
                                      className="px-4 py-2 flex items-center gap-2 rounded-xl text-white text-sm font-medium bg-gradient-to-r from-amber-500 to-yellow-600 hover:scale-[1.05] transition disabled:opacity-50"
                                      disabled={!summary.lecturerEmail}
                                      title={!summary.lecturerEmail ? 'Lecturer email not set' : 'Email your lecturer'}
                                  >
                                      <Mail className="w-4 h-4" />
                                      Email Excuse
                                  </button>
                              </div>

                              {/* Detailed Attendance Table */}
                              <h4 className="text-sm font-semibold text-slate-700 pt-2 border-t border-slate-100">Detailed Attendance Log:</h4>
                              <div className="overflow-x-auto max-h-60">
                                  <Table>
                                      <TableHeader className="bg-slate-100/70 sticky top-0">
                                          <TableRow>
                                              <TableHead className="w-[150px]">Date</TableHead>
                                              <TableHead>Time Recorded</TableHead>
                                              <TableHead>Status</TableHead>
                                          </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                          {summary.records.length > 0 ? (
                                              summary.records.map((record, index) => (
                                                  <TableRow key={index} className="hover:bg-slate-50/50">
                                                      <TableCell className="font-medium">
                                                          {new Date(record.class_sessions.class_date).toLocaleDateString()}
                                                      </TableCell>
                                                      <TableCell className="text-sm text-slate-500">
                                                          {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                      </TableCell>
                                                      <TableCell className="flex items-center gap-2 capitalize">
                                                          {getStatusIcon(record.status)}
                                                          <span className="font-semibold">{record.status}</span>
                                                      </TableCell>
                                                  </TableRow>
                                              ))
                                          ) : (
                                              <TableRow>
                                                  <TableCell colSpan={3} className="text-center text-slate-500 italic">No attendance records found.</TableCell>
                                              </TableRow>
                                          )}
                                      </TableBody>
                                  </Table>
                              </div>
                          </div>
                      ))
                  ) : (
                      <p className="text-center text-slate-500 bg-amber-50 p-3 rounded-lg border border-amber-200">No attendance data or course enrollments found.</p>
                  )}
              </motion.div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}

export default StudentView;