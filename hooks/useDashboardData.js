import { useState, useEffect, useCallback } from "react";

/**
 * Custom hook for fetching dashboard data from the Raspberry Pi backend.
 * Handles attendance list, active class info, and backend connectivity status.
 * 
 * @param {string} apiBase - Base URL of the Raspberry Pi API
 * @param {number} pollingInterval - Interval in ms for polling (default: 15000)
 * 
 * @returns {{
 *   attendanceList: Array,
 *   activeSection: Object | null,
 *   lastUpdate: string | null,
 *   isBackendOnline: boolean,
 *   isLoading: boolean,
 *   refetch: Function
 * }}
 */
export function useDashboardData(apiBase, pollingInterval = 15000) {
    const [attendanceList, setAttendanceList] = useState([]);
    const [activeSection, setActiveSection] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [isBackendOnline, setIsBackendOnline] = useState(true);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const [classRes, attendanceRes] = await Promise.allSettled([
                fetch(`${apiBase}/api/current-class`, { cache: "no-store" }),
                fetch(`${apiBase}/api/attendance-records`, { cache: "no-store" }),
            ]);

            let classData = null;
            let attendanceData = null;

            // Handle class response
            if (classRes.status === "fulfilled" && classRes.value.ok) {
                try {
                    classData = await classRes.value.json();
                } catch (jsonErr) {
                    console.warn("Invalid JSON from /api/current-class", jsonErr);
                }
            }

            // Handle attendance response
            if (attendanceRes.status === "fulfilled" && attendanceRes.value.ok) {
                try {
                    attendanceData = await attendanceRes.value.json();
                } catch (jsonErr) {
                    console.warn("Invalid JSON from /api/attendance-records", jsonErr);
                }
            }

            // Update states only if data exists
            if (classData?.activeClass) {
                setActiveSection(classData.activeClass);
            }

            if (attendanceData?.attendance) {
                setAttendanceList(attendanceData.attendance);
            }

            setLastUpdate(new Date().toLocaleTimeString());
            setIsBackendOnline(true);
        } catch (err) {
            console.warn("⚠️ Backend unreachable or unexpected error:", err);
            setIsBackendOnline(false);
        } finally {
            setIsLoading(false);
        }
    }, [apiBase]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, pollingInterval);
        return () => clearInterval(interval);
    }, [fetchData, pollingInterval]);

    return {
        attendanceList,
        activeSection,
        lastUpdate,
        isBackendOnline,
        isLoading,
        refetch: fetchData,
    };
}
