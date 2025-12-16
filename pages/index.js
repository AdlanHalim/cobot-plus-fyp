import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import withRole from "../utils/withRole";
import { useDashboardData, useClassSession, useUserRole } from "@/hooks";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { UserPlus, Play, Square, Users, Search, X, Video, Clock, CheckCircle } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_PI_URL || "http://192.168.252.103:5000";
const VIDEO_URL = `${API_BASE}/video`;

function Home() {
  const supabase = useSupabaseClient();
  const [isLoading, setIsLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Manual add modal state
  const [showManualModal, setShowManualModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Track previous attendance for toast notifications
  const prevAttendanceRef = useRef([]);

  // Use custom hooks
  const { userRole, lecturerId } = useUserRole();
  const { attendanceList, lastUpdate, isBackendOnline, refetch } = useDashboardData(API_BASE);
  const {
    sections,
    activeSession,
    selectedSectionId,
    setSelectedSectionId,
    suggestedSectionIds,
    startClass,
    endClass,
    error: sessionError,
    isLoading: sessionLoading
  } = useClassSession({ lecturerId, userRole });

  // Toast notification when new student detected
  useEffect(() => {
    if (attendanceList.length > prevAttendanceRef.current.length) {
      const newEntries = attendanceList.filter(
        (item) => !prevAttendanceRef.current.some((prev) => prev.id === item.id)
      );
      newEntries.forEach((entry) => {
        const name = entry.student?.nickname || entry.student?.name || "Student";
        toast.success(`✓ Welcome, ${name}!`, {
          position: "top-right",
          autoClose: 3000,
        });
      });
    }
    prevAttendanceRef.current = attendanceList;
  }, [attendanceList]);

  // Start class handler
  const handleStartClass = async () => {
    if (!selectedSectionId) {
      toast.error("Please select a section first");
      return;
    }
    const success = await startClass(selectedSectionId);
    if (success) {
      toast.success("🎓 Class started!");
    } else if (sessionError) {
      toast.error(sessionError);
    }
  };

  // End class handler
  const handleEndClass = async () => {
    const success = await endClass();
    if (success) {
      toast.info("📚 Class ended. Attendance saved.");
    } else if (sessionError) {
      toast.error(sessionError);
    }
  };

  // Search students for manual add
  const handleSearchStudents = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const { data, error } = await supabase
      .from("students")
      .select("id, name, nickname, matric_no")
      .or(`name.ilike.%${query}%,matric_no.ilike.%${query}%,nickname.ilike.%${query}%`)
      .limit(10);

    if (!error) {
      const presentIds = attendanceList.map((a) => a.student_id || a.student?.id);
      const filtered = data.filter((s) => !presentIds.includes(s.id));
      setSearchResults(filtered);
    }
    setIsSearching(false);
  };

  // Manually mark student present
  const handleManualMark = async (student) => {
    if (!activeSession) {
      toast.error("Start a class first to mark attendance");
      return;
    }

    try {
      const recordId = `manual_${Date.now()}`;
      const { error } = await supabase.from("attendance_records").insert({
        id: recordId,
        student_id: student.id,
        class_session_id: activeSession.id,
        status: "present",
        timestamp: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success(`✓ ${student.nickname || student.name} marked present`);
      setShowManualModal(false);
      setSearchQuery("");
      setSearchResults([]);
      refetch();
    } catch (err) {
      toast.error("Failed to mark attendance: " + err.message);
    }
  };

  const presentCount = attendanceList.filter(a => a.status === "present").length;
  const lateCount = attendanceList.filter(a => a.status === "late").length;

  return (
    <DashboardLayout>
      <ToastContainer />

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm">Classroom attendance monitoring</p>
      </div>

      {/* Connection Alert */}
      <AnimatePresence>
        {!isBackendOnline && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-xl text-sm"
          >
            ⚠️ Connection to Raspberry Pi lost. Waiting for reconnection...
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Students Present */}
        <motion.div
          className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">Present</span>
            <span className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{presentCount}</p>
          <p className="text-xs text-emerald-600 mt-1">+{presentCount} this session</p>
        </motion.div>

        {/* Students Late */}
        <motion.div
          className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">Late</span>
            <span className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-600" />
            </span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{lateCount}</p>
          <p className="text-xs text-slate-500 mt-1">Arrived after start time</p>
        </motion.div>

        {/* Total Students */}
        <motion.div
          className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">Total Detected</span>
            <span className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
              <Users className="w-4 h-4 text-teal-600" />
            </span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{attendanceList.length}</p>
          <p className="text-xs text-slate-500 mt-1">Face recognitions</p>
        </motion.div>

        {/* Session Status */}
        <motion.div
          className={`rounded-2xl p-5 shadow-sm border ${activeSession ? "bg-gradient-to-br from-teal-500 to-cyan-500 text-white border-transparent" : "bg-white border-slate-100"
            }`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={`text-sm ${activeSession ? "text-white/80" : "text-slate-500"}`}>Status</span>
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeSession ? "bg-white/20" : "bg-slate-100"
              }`}>
              <Video className={`w-4 h-4 ${activeSession ? "text-white" : "text-slate-600"}`} />
            </span>
          </div>
          <p className={`text-lg font-bold ${activeSession ? "text-white" : "text-slate-800"}`}>
            {activeSession ? "Class Active" : "No Active Class"}
          </p>
          <p className={`text-xs mt-1 ${activeSession ? "text-white/70" : "text-slate-500"}`}>
            {activeSession ? `Started ${activeSession.start_time?.slice(0, 5)}` : "Start a class to record"}
          </p>
        </motion.div>
      </div>

      {/* Class Control Bar */}
      <motion.div
        className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex flex-wrap items-center gap-3">
          {!activeSession ? (
            <>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="flex-1 min-w-[200px] px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-teal-400 focus:outline-none text-sm"
              >
                <option value="">Select Section...</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.courses?.code} - {s.name}{suggestedSectionIds?.includes(s.id) ? " ⏰ (Now)" : ""}
                  </option>
                ))}
              </select>
              <button
                onClick={handleStartClass}
                disabled={!selectedSectionId || sessionLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4" />
                Start Class
              </button>
            </>
          ) : (
            <>
              <div className="flex-1 flex items-center gap-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <div>
                  <span className="font-semibold text-slate-800">
                    {activeSession.sections?.courses?.code} - {activeSession.sections?.name}
                  </span>
                  <span className="text-sm text-slate-500 ml-2">
                    Started at {activeSession.start_time?.slice(0, 5)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowManualModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition"
              >
                <UserPlus className="w-4 h-4" />
                Manual Add
              </button>
              <button
                onClick={handleEndClass}
                className="flex items-center gap-2 px-4 py-2.5 bg-rose-500 text-white font-medium rounded-xl hover:bg-rose-600 transition"
              >
                <Square className="w-4 h-4" />
                End Class
              </button>
            </>
          )}
        </div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Camera Feed */}
        <motion.div
          className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <Video className="w-5 h-5 text-teal-500" />
              Live Camera Feed
            </h2>
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 bg-slate-100 rounded-lg transition"
            >
              {isPaused ? "▶ Resume" : "⏸ Pause"}
            </button>
          </div>
          <div className="aspect-video bg-slate-900 relative">
            {isLoading && !videoError && (
              <div className="absolute inset-0 flex flex-col justify-center items-center text-slate-400 text-sm">
                <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                Connecting to camera...
              </div>
            )}
            {!videoError ? (
              <img
                src={VIDEO_URL}
                alt="Live Stream"
                className={`w-full h-full object-cover ${isPaused ? "opacity-50" : ""}`}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setVideoError(true);
                }}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col justify-center items-center text-slate-400 text-center p-4">
                <Video className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">Camera stream unavailable</p>
                <p className="text-xs mt-1">Check Raspberry Pi connection</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Attendance List */}
        <motion.div
          className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col max-h-[500px]"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h2 className="font-semibold text-slate-800">Students Present</h2>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
              {attendanceList.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {attendanceList.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">
                No students detected yet
              </p>
            ) : (
              <div className="space-y-2">
                {attendanceList.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-cyan-400 flex items-center justify-center text-white text-sm font-medium">
                      {(record.student?.nickname || record.student?.name || "?").charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">
                        {record.student?.nickname || record.student?.name || "Unknown"}
                      </p>
                      <p className="text-xs text-slate-500">{record.student?.matric_no}</p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-lg text-xs font-medium ${record.id?.startsWith("manual_")
                        ? "bg-teal-100 text-teal-700"
                        : record.status === "present"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                        }`}
                    >
                      {record.id?.startsWith("manual_") ? "Manual" : record.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {lastUpdate && (
            <div className="p-3 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-400">Last updated: {lastUpdate}</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Manual Add Modal */}
      <AnimatePresence>
        {showManualModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowManualModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800">Add Student Manually</h3>
                <button
                  onClick={() => setShowManualModal(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name or matric no..."
                  value={searchQuery}
                  onChange={(e) => handleSearchStudents(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-teal-400 focus:outline-none text-sm"
                  autoFocus
                />
              </div>

              <div className="max-h-64 overflow-y-auto">
                {isSearching ? (
                  <p className="text-center text-slate-400 py-6 text-sm">Searching...</p>
                ) : searchResults.length === 0 && searchQuery.length >= 2 ? (
                  <p className="text-center text-slate-400 py-6 text-sm">No students found</p>
                ) : (
                  <div className="space-y-2">
                    {searchResults.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                        onClick={() => handleManualMark(student)}
                      >
                        <div>
                          <p className="font-medium text-slate-800 text-sm">
                            {student.nickname || student.name}
                          </p>
                          <p className="text-xs text-slate-500">{student.matric_no}</p>
                        </div>
                        <button className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-medium rounded-lg hover:bg-emerald-600 transition">
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}

export default withRole(Home, ["admin", "lecturer"]);