"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout"; 
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, Clock, Search, User, Mail, Calendar as CalendarIcon, List } from 'lucide-react'; 
import Calendar from 'react-calendar'; 
import 'react-calendar/dist/Calendar.css'; 

// ✅ INLINED TABLE COMPONENT DEFINITIONS START 
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


// Supabase setup - Assuming environment variables are configured
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClientComponentClient({ supabaseUrl, supabaseKey: supabaseAnonKey });
} else {
  console.error("Supabase environment variables are missing. Data fetching will not work.");
}


// --- Component: AttendanceCalendar ---
const AttendanceCalendar = ({ attendanceRecords }) => {
  // Creates a Map: { 'YYYY-MM-DD': [status1, status2, ...] }
  const attendanceMap = attendanceRecords.reduce((acc, record) => {
    const classDate = record.class_sessions?.class_date;
    if (!classDate) return acc;
    
    const date = new Date(classDate).toISOString().split('T')[0];
    if (!acc.has(date)) {
      acc.set(date, []);
    }
    acc.get(date).push(record.status);
    return acc;
  }, new Map());


  // Function to apply custom class to a day tile
  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const dateString = date.toISOString().split('T')[0];
      const statuses = attendanceMap.get(dateString);

      if (statuses && statuses.length > 0) {
        // Priority: Absent > Late > Present
        if (statuses.includes('absent')) return 'calendar-absent';
        if (statuses.includes('late')) return 'calendar-late';
        if (statuses.some(s => s === 'present')) return 'calendar-present';
      }
    }
    return null;
  };
  
  return (
    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-inner">
        <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4"/>
            Attendance Overview by Date (Highest priority status shown)
        </h4>
        <style jsx global>{`
          /* Custom styles for the calendar view */
          .react-calendar {
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            border: 1px solid #e2e8f0;
          }
          .react-calendar__tile {
            position: relative;
            padding: 10px 6px;
          }
          .calendar-present {
            background-color: #d1fae5 !important; /* emerald-100 */
          }
          .calendar-absent {
            background-color: #fee2e2 !important; /* rose-100 */
          }
          .calendar-late {
            background-color: #fef3c7 !important; /* amber-100 */
          }
          .react-calendar__tile.calendar-absent abbr, 
          .react-calendar__tile.calendar-late abbr, 
          .react-calendar__tile.calendar-present abbr {
            font-weight: 700;
          }
        `}</style>
        <Calendar 
            tileClassName={tileClassName}
            className="w-full border-none p-2"
        />
    </div>
  );
};
// --- End of AttendanceCalendar Component ---


function StudentView() {
  const [matricNo, setMatricNo] = useState("");
  const [studentData, setStudentData] = useState(null);
  const [allAttendanceRecords, setAllAttendanceRecords] = useState([]); 
  const [totalAbsences, setTotalAbsences] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState('calendar'); 

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'absent': return <AlertTriangle className="w-5 h-5 text-rose-500" />;
      case 'late': return <Clock className="w-5 h-5 text-amber-500" />;
      default: return null;
    }
  };

  /**
   * Handles the search action: Fetches student details and ALL attendance records.
   */
  const handleSearch = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    setStudentData(null);
    setAllAttendanceRecords([]);
    setTotalAbsences(0);
    setActiveTab('calendar'); 

    if (!supabase) {
      setMessage("❌ Database connection failed. Please check environment variables.");
      setLoading(false);
      return;
    }

    const trimmedMatricNo = matricNo.trim();
    if (!trimmedMatricNo) {
      setMessage("⚠️ Please enter your Matric No.");
      setLoading(false);
      return;
    }

    try {
      // 1. Find Student ID and details using matric_no
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id, name, nickname, matric_no, email") 
        .eq("matric_no", trimmedMatricNo)
        .single();

      if (studentError || !student) {
        if (studentError && studentError.code !== 'PGRST116') console.error("Student Fetch Error:", studentError);
        setMessage(`❌ Error: Student with Matric No. ${trimmedMatricNo} not found.`);
        setLoading(false);
        return;
      }
      
      setStudentData(student);
      
      // 2. Fetch ALL attendance records for the student.
      const { data: records, error: recordsError } = await supabase
        .from("attendance_records")
        .select(`
          status,
          timestamp,
          class_sessions!inner ( 
            class_date,
            sections (
              name,
              courses ( code, name )
            )
          )
        `)
        .eq("student_id", student.id)
        .order("timestamp", { ascending: false }); 

      if (recordsError) {
        console.error("Attendance Records Fetch Error:", recordsError.message);
        setMessage(`❌ An error occurred while fetching attendance records: ${recordsError.message || recordsError.code}`);
        setLoading(false);
        return;
      }
      
      const recordsArray = records || [];
      const calculatedAbsences = recordsArray.filter(r => r.status === 'absent').length;

      setAllAttendanceRecords(recordsArray);
      setTotalAbsences(calculatedAbsences);

      setMessage(`✅ Found ${recordsArray.length} attendance records.`);

    } catch (error) {
      console.error("Student View Catch Error:", error);
      setMessage("❌ An unexpected internal error occurred while fetching data.");
    } finally {
      setLoading(false);
    }
  };

  
  return (
    <DashboardLayout> 
      <div className="flex flex-col items-center justify-start py-8 min-h-screen bg-slate-100">
        
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
            <p className="text-slate-600 text-sm">Enter your matric number to view your complete attendance records.</p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 p-4 bg-slate-100/50 rounded-xl shadow-inner border border-slate-200">
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
              className="px-6 py-2 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-teal-400 hover:scale-[1.03] text-white font-medium rounded-xl shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Search className="w-5 h-5" />
              {loading ? "Searching..." : "Search Records"}
            </button>
          </form>

          {message && <p className={`text-center text-sm mt-4 p-3 rounded-lg ${message.includes('❌') ? 'text-rose-700 bg-rose-100 border border-rose-300' : message.includes('⚠️') ? 'text-amber-700 bg-amber-100 border border-amber-300' : 'text-emerald-700 bg-emerald-100 border border-emerald-300'}`}>{message}</p>}

          {/* Results Display */}
          {studentData && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pt-4">
                  
                  {/* Student Header with Combined Summary */}
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4 p-4 bg-indigo-50 rounded-xl shadow-md border-l-4 border-indigo-500">
                    <div className="flex items-start gap-3">
                        <User className="w-7 h-7 text-indigo-600 flex-shrink-0" />
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">
                              {studentData.name}
                            </h2>
                            <p className="text-sm text-indigo-700 font-medium">
                              Matric No: {studentData.matric_no} 
                              {studentData.email && <span className="ml-4 flex items-center gap-1 text-slate-500"><Mail className="w-3 h-3"/>{studentData.email}</span>}
                            </p>
                        </div>
                    </div>

                    {/* Total Absences & Warning (Moved here) */}
                    <div className="flex flex-col items-end sm:items-center p-2 bg-white rounded-lg shadow-inner border border-slate-100">
                        <div className="flex items-center gap-2">
                            <span className={`text-2xl font-extrabold ${totalAbsences >= 5 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {totalAbsences}
                            </span>
                            <p className="text-sm text-slate-700 font-medium whitespace-nowrap">
                                Total Absences
                            </p>
                        </div>
                        <span className={`text-xs mt-1 font-semibold ${totalAbsences >= 5 ? 'text-rose-600' : 'text-emerald-600'}`}>
                           {totalAbsences >= 5 ? '⚠️ High risk of warning.' : 'Attendance: Good.'}
                        </span>
                    </div>
                  </div>

                  {/* Tab Navigation */}
                  <div className="flex border-b border-slate-200">
                    <button
                      onClick={() => setActiveTab('calendar')}
                      className={`px-6 py-3 text-sm font-medium transition duration-200 flex items-center gap-2 ${activeTab === 'calendar' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <CalendarIcon className="w-4 h-4" />
                      Calendar View
                    </button>
                    <button
                      onClick={() => setActiveTab('table')}
                      className={`px-6 py-3 text-sm font-medium transition duration-200 flex items-center gap-2 ${activeTab === 'table' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <List className="w-4 h-4" />
                      Detailed Log Table ({allAttendanceRecords.length})
                    </button>
                  </div>
                  
                  {/* Tab Content */}
                  <div className="pt-4">
                      {activeTab === 'calendar' && <AttendanceCalendar attendanceRecords={allAttendanceRecords} />}
                      
                      {activeTab === 'table' && (
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
                                      {allAttendanceRecords.length > 0 ? (
                                          allAttendanceRecords.map((record, index) => {
                                              const session = record.class_sessions;
                                              const section = session?.sections;
                                              const course = section?.courses;

                                              return (
                                                  <TableRow key={index} className="transition duration-100 ease-in-out">
                                                      <TableCell className="font-medium text-slate-700">
                                                          {session?.class_date ? new Date(session.class_date).toLocaleDateString() : 'N/A'}
                                                      </TableCell>
                                                      <TableCell className="flex items-center gap-2 capitalize">
                                                          {getStatusIcon(record.status)}
                                                          <span className={`font-semibold ${record.status === 'absent' ? 'text-rose-600' : record.status === 'present' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                            {record.status}
                                                          </span>
                                                      </TableCell>
                                                      <TableCell className="text-sm text-slate-600">
                                                        <span className="font-bold">{course?.code || 'N/A'}</span> - {course?.name || 'N/A'}
                                                      </TableCell>
                                                      <TableCell className="text-sm text-slate-500">{section?.name || 'N/A'}</TableCell>
                                                      <TableCell className="text-sm text-slate-500">
                                                          {record.timestamp ? new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                                      </TableCell>
                                                  </TableRow>
                                              );
                                          })
                                      ) : (
                                          <TableRow>
                                              <TableCell colSpan={5} className="text-center text-slate-500 italic py-4">No attendance records found for this student.</TableCell>
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