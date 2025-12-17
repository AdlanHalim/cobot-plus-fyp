/**
 * @file useClassSession.js
 * @location cobot-plus-fyp/hooks/useClassSession.js
 * 
 * @description
 * Custom hook for managing class session lifecycle (start/end).
 * Integrates with Raspberry Pi backend for attendance tracking control.
 */

import { useState, useEffect, useCallback } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

// Helper to get Pi API headers (with optional API key)
const getPiHeaders = () => {
    const headers = { "Content-Type": "application/json" };
    const apiKey = process.env.NEXT_PUBLIC_PI_API_KEY;
    if (apiKey) {
        headers["X-API-Key"] = apiKey;
    }
    return headers;
};

/**
 * Custom hook for managing class sessions (Start/End class functionality).
 * Now supports lecturer filtering and schedule-based auto-suggest.
 * 
 * @param {Object} options
 * @param {string|null|false} options.lecturerId - Lecturer UUID for filtering (false = admin, no filter)
 * @param {string|null} options.userRole - Current user's role
 * 
 * @returns {{
 *   sections: Array,
 *   activeSession: Object | null,
 *   isLoading: boolean,
 *   selectedSectionId: string,
 *   setSelectedSectionId: Function,
 *   suggestedSectionIds: Array,
 *   startClass: Function,
 *   endClass: Function,
 *   error: string | null
 * }}
 */
export function useClassSession({ lecturerId, userRole } = {}) {
    const supabase = useSupabaseClient();

    const [sections, setSections] = useState([]);
    const [activeSession, setActiveSession] = useState(null);
    const [selectedSectionId, setSelectedSectionId] = useState("");
    const [suggestedSectionIds, setSuggestedSectionIds] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch available sections for the current user (filtered by lecturer if applicable)
    const fetchSections = useCallback(async () => {
        if (!supabase) return;

        try {
            let query = supabase
                .from("sections")
                .select(`
                    id,
                    name,
                    lecturer_id,
                    courses (code, name)
                `)
                .order("name");

            // Filter by lecturer if user is a lecturer (not admin)
            if (userRole === "lecturer" && lecturerId) {
                query = query.eq("lecturer_id", lecturerId);
            }

            const { data, error: fetchError } = await query;
            if (fetchError) throw fetchError;
            setSections(data || []);
        } catch (err) {
            console.error("Error fetching sections:", err);
            setError(err.message);
        }
    }, [supabase, lecturerId, userRole]);

    // Check for any active (non-ended) session
    const checkActiveSession = useCallback(async () => {
        if (!supabase) return;

        try {
            const today = new Date().toISOString().split("T")[0];

            const { data, error: fetchError } = await supabase
                .from("class_sessions")
                .select(`
                    id,
                    section_id,
                    class_date,
                    start_time,
                    ended_at,
                    status,
                    sections (
                        name,
                        courses (code, name)
                    )
                `)
                .eq("class_date", today)
                .is("ended_at", null)
                .limit(1)
                .single();

            if (fetchError && fetchError.code !== "PGRST116") {
                // PGRST116 = no rows returned, which is fine
                throw fetchError;
            }

            if (data) {
                setActiveSession(data);
                setSelectedSectionId(data.section_id);
            } else {
                setActiveSession(null);
            }
        } catch (err) {
            console.error("Error checking active session:", err);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    // Detect sections scheduled for current day/time and auto-suggest
    const detectScheduledSections = useCallback(async () => {
        if (!supabase || sections.length === 0) return;

        try {
            const now = new Date();
            const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long" });
            const currentTime = now.toTimeString().split(" ")[0]; // HH:MM:SS

            // Query section_schedules for current day and time
            const { data: schedules, error: scheduleError } = await supabase
                .from("section_schedules")
                .select("section_id")
                .eq("day_of_week", dayOfWeek)
                .lte("start_time", currentTime)
                .gte("end_time", currentTime);

            if (scheduleError) {
                console.warn("Could not fetch schedules:", scheduleError);
                return;
            }

            // Get section IDs that match current schedule
            const scheduledIds = schedules?.map(s => s.section_id) || [];

            // Filter to only include sections the user can see
            const userSectionIds = sections.map(s => s.id);
            const matchingIds = scheduledIds.filter(id => userSectionIds.includes(id));

            setSuggestedSectionIds(matchingIds);

            // Auto-select if exactly 1 matching section and no active session
            if (matchingIds.length === 1 && !selectedSectionId) {
                setSelectedSectionId(matchingIds[0]);
            }
        } catch (err) {
            console.error("Error detecting scheduled sections:", err);
        }
    }, [supabase, sections, selectedSectionId]);

    useEffect(() => {
        fetchSections();
        checkActiveSession();
    }, [fetchSections, checkActiveSession]);

    // Run schedule detection after sections are loaded
    useEffect(() => {
        if (sections.length > 0) {
            detectScheduledSections();
        }
    }, [sections, detectScheduledSections]);

    // Start a new class session
    const startClass = useCallback(async (sectionId) => {
        if (!supabase || !sectionId) {
            setError("Please select a section first");
            return false;
        }

        setError(null);

        try {
            const now = new Date();
            const sessionId = `session_${Date.now()}`;

            const { data, error: insertError } = await supabase
                .from("class_sessions")
                .insert({
                    id: sessionId,
                    section_id: sectionId,
                    class_date: now.toISOString().split("T")[0],
                    start_time: now.toTimeString().split(" ")[0],
                    status: "active",
                })
                .select(`
          id,
          section_id,
          class_date,
          start_time,
          ended_at,
          status,
          sections (
            name,
            courses (code, name)
          )
        `)
                .single();

            if (insertError) throw insertError;

            setActiveSession(data);

            // Notify Raspberry Pi backend to start recognition
            const apiBase = process.env.NEXT_PUBLIC_PI_URL || "http://192.168.252.103:5000";
            try {
                await fetch(`${apiBase}/api/start-class`, {
                    method: "POST",
                    headers: getPiHeaders(),
                    body: JSON.stringify({
                        session_id: data.id,
                        section_id: sectionId,
                    }),
                });
            } catch (piError) {
                console.warn("Could not notify Pi backend:", piError);
                // Continue anyway - session is created in DB
            }

            return true;
        } catch (err) {
            console.error("Error starting class:", err);
            setError(err.message);
            return false;
        }
    }, [supabase]);

    // End the current class session
    const endClass = useCallback(async () => {
        if (!supabase || !activeSession) {
            setError("No active session to end");
            return false;
        }

        setError(null);

        try {
            const now = new Date();

            const { error: updateError } = await supabase
                .from("class_sessions")
                .update({
                    ended_at: now.toISOString(),
                    status: "completed",
                })
                .eq("id", activeSession.id);

            if (updateError) throw updateError;

            // Notify Raspberry Pi backend to stop recognition
            const apiBase = process.env.NEXT_PUBLIC_PI_URL || "http://192.168.252.103:5000";
            try {
                await fetch(`${apiBase}/api/end-class`, {
                    method: "POST",
                    headers: getPiHeaders(),
                    body: JSON.stringify({
                        session_id: activeSession.id,
                    }),
                });
            } catch (piError) {
                console.warn("Could not notify Pi backend:", piError);
            }

            setActiveSession(null);
            setSelectedSectionId("");
            return true;
        } catch (err) {
            console.error("Error ending class:", err);
            setError(err.message);
            return false;
        }
    }, [supabase, activeSession]);

    return {
        sections,
        activeSession,
        isLoading,
        selectedSectionId,
        setSelectedSectionId,
        suggestedSectionIds,
        startClass,
        endClass,
        error,
    };
}
