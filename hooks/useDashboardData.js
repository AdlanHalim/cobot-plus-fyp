/**
 * @file useDashboardData.js
 * @location cobot-plus-fyp/hooks/useDashboardData.js
 * 
 * @description
 * Custom hook for fetching real-time dashboard data from the Raspberry Pi backend.
 * Implements smart polling with tab visibility detection to optimize bandwidth.
 */

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Custom hook for fetching dashboard data from the Raspberry Pi backend.
 * Handles attendance list, active class info, and backend connectivity status.
 * 
 * Features:
 * - Smart polling that pauses when tab is hidden (saves bandwidth)
 * - Auto-reconnect when backend comes back online
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
    const [isTabVisible, setIsTabVisible] = useState(true);

    const intervalRef = useRef(null);

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

            // Update active section (includes auto-mode info)
            if (classData) {
                setActiveSection(classData.activeClass || null);
            }

            // Update attendance list
            if (attendanceData?.attendance) {
                setAttendanceList(attendanceData.attendance);
            } else if (!classData?.activeClass) {
                // Clear attendance if no active class
                setAttendanceList([]);
            }

            setLastUpdate(new Date().toLocaleTimeString());
            setIsBackendOnline(true);
        } catch (err) {
            console.warn("Backend unreachable:", err);
            setIsBackendOnline(false);
        } finally {
            setIsLoading(false);
        }
    }, [apiBase]);

    // Track tab visibility to pause polling when hidden
    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsTabVisible(!document.hidden);
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, []);

    // Smart polling - pause when tab is hidden
    useEffect(() => {
        fetchData();

        // Clear existing interval
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        // Only poll when tab is visible
        if (isTabVisible) {
            intervalRef.current = setInterval(fetchData, pollingInterval);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [fetchData, pollingInterval, isTabVisible]);

    // Immediate refetch when tab becomes visible again
    useEffect(() => {
        if (isTabVisible) {
            fetchData();
        }
    }, [isTabVisible, fetchData]);

    return {
        attendanceList,
        activeSection,
        lastUpdate,
        isBackendOnline,
        isLoading,
        refetch: fetchData,
    };
}
