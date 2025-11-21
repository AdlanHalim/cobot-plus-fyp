import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [attendanceList, setAttendanceList] = useState([]);
  const [activeSection, setActiveSection] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isBackendOnline, setIsBackendOnline] = useState(true);

  const videoUrl = "http://192.168.252.103:5000/video";
  const apiBase = "http://192.168.252.103:5000";

  useEffect(() => {
    const fetchData = async () => {
      try {
        // --- attempt to fetch both endpoints ---
        const [classRes, attendanceRes] = await Promise.allSettled([
          fetch(`${apiBase}/api/current-class`, { cache: "no-store" }),
          fetch(`${apiBase}/api/attendance-records`, { cache: "no-store" }),
        ]);

        let classData = null;
        let attendanceData = null;

        // --- Handle class response safely ---
        if (classRes.status === "fulfilled" && classRes.value.ok) {
          try {
            classData = await classRes.value.json();
          } catch (jsonErr) {
            console.warn("Invalid JSON from /api/current-class", jsonErr);
          }
        }

        // --- Handle attendance response safely ---
        if (attendanceRes.status === "fulfilled" && attendanceRes.value.ok) {
          try {
            attendanceData = await attendanceRes.value.json();
          } catch (jsonErr) {
            console.warn("Invalid JSON from /api/attendance-records", jsonErr);
          }
        }

        // --- Update states only if data exists ---
        if (classData?.activeClass) {
          setActiveSection(classData.activeClass);
        }

        if (attendanceData?.attendance) {
          setAttendanceList(attendanceData.attendance);
        }

        // --- update time + mark backend online ---
        setLastUpdate(new Date().toLocaleTimeString());
        setIsBackendOnline(true);
      } catch (err) {
        // Catch any unexpected runtime/network errors
        console.warn("⚠️ Backend unreachable or unexpected error:", err);
        setIsBackendOnline(false);
      }
    };

    // --- Initial load + polling every 15s ---
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleStream = () => setIsPaused(!isPaused);
  const handleEndClass = () => alert("Class ended");

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-5rem)] flex flex-col justify-center items-center px-6 bg-gradient-to-br from-indigo-50 via-sky-50 to-teal-50 transition-all overflow-hidden relative">

        {/* 🔴 Connection Alert */}
        <AnimatePresence>
          {!isBackendOnline && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 bg-rose-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium z-50"
            >
              ⚠️ Connection lost. Waiting for server...
            </motion.div>
          )}
        </AnimatePresence>

        {/* Title */}
        <motion.h1
          className="text-2xl sm:text-3xl font-bold text-center mb-4 bg-gradient-to-r from-indigo-600 via-sky-600 to-teal-600 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          🎓 Attendance Monitoring Dashboard
        </motion.h1>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl w-full h-[85%]">
          {/* 🎥 Live Camera */}
          <motion.div
            className="bg-white/60 backdrop-blur-md border border-slate-200/50 shadow-md rounded-2xl p-5 flex flex-col justify-between hover:shadow-lg transition h-full"
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
          >
            <h2 className="text-lg font-semibold mb-3 text-slate-700 flex items-center gap-2">
              📹{" "}
              <span className="bg-gradient-to-r from-indigo-500 to-teal-500 bg-clip-text text-transparent">
                Live Camera Feed
              </span>
            </h2>

            <div className="relative flex-1 flex justify-center items-center overflow-hidden rounded-xl bg-slate-100 border border-slate-200">
              {isLoading && !videoError && (
                <div className="absolute inset-0 flex flex-col justify-center items-center text-slate-500 text-sm">
                  <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                  Connecting to camera...
                </div>
              )}
              {!videoError ? (
                <img
                  src={videoUrl}
                  alt="Live Stream"
                  className="w-full h-full object-cover"
                  onLoad={() => setIsLoading(false)}
                  onError={() => {
                    setIsLoading(false);
                    setVideoError(true);
                  }}
                />
              ) : (
                <div className="text-slate-400 text-sm">
                  ❌ Failed to load camera stream
                </div>
              )}
            </div>

            <div className="flex justify-between mt-4">
              <button
                onClick={handleToggleStream}
                className="px-4 py-2 rounded-lg text-white text-sm font-medium bg-gradient-to-r from-indigo-500 to-teal-400 hover:shadow-md hover:scale-[1.02] transition"
              >
                {isPaused ? "▶ Resume Stream" : "⏸ Pause Stream"}
              </button>
              <button
                onClick={handleEndClass}
                className="px-4 py-2 rounded-lg text-white text-sm font-medium bg-gradient-to-r from-rose-400 to-red-500 hover:shadow-md hover:scale-[1.02] transition"
              >
                ⏹ End Class
              </button>
            </div>
          </motion.div>

          {/* 👥 Attendance List */}
          <motion.div
            className="bg-white/60 backdrop-blur-md border border-slate-200/50 shadow-md rounded-2xl p-5 flex flex-col justify-between hover:shadow-lg transition h-full"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
          >
            <div>
              <h2 className="text-lg font-semibold mb-3 text-slate-700 flex items-center gap-2">
                👥{" "}
                <span className="bg-gradient-to-r from-indigo-500 to-teal-500 bg-clip-text text-transparent">
                  Students Present
                </span>
              </h2>

              {activeSection ? (
                <div className="mb-3 text-sm text-slate-600">
                  <p className="font-medium">
                    🏫 {activeSection.name || "Unnamed Section"}
                  </p>
                  <p>📘 {activeSection.courseName || "No course name"}</p>
                </div>
              ) : (
                <p className="text-sm text-slate-500 mb-3">
                  ⚠️ No active class detected
                </p>
              )}
            </div>

            <div className="flex-1 overflow-auto rounded-lg bg-slate-50/60 p-3 border border-slate-200/50">
              {attendanceList.length === 0 ? (
                <p className="text-slate-500 text-center text-sm">
                  No students detected yet 👀
                </p>
              ) : (
                <ul className="space-y-2">
                  {attendanceList.map((record) => (
                    <li
                      key={record.id}
                      className="flex justify-between items-center bg-white/80 backdrop-blur-sm rounded-lg shadow-sm px-3 py-2 text-sm border border-slate-100"
                    >
                      <div>
                        <p className="font-medium text-slate-800">
                          {record.student?.nickname || "—"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {record.student?.matric_no}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-md text-xs font-semibold ${
                          record.status === "present"
                            ? "bg-emerald-100 text-emerald-700"
                            : record.status === "late"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {record.status === "present"
                          ? "✓ Present"
                          : record.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {lastUpdate && (
              <p className="mt-3 text-xs text-slate-500 text-center">
                Last updated: {lastUpdate}
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
