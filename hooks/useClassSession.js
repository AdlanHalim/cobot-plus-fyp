import { useState, useEffect, useCallback } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

/**
 * Custom hook for managing class sessions (Start/End class functionality).
 * 
 * @returns {{
 *   sections: Array,
 *   activeSession: Object | null,
 *   isLoading: boolean,
 *   selectedSectionId: string,
 *   setSelectedSectionId: Function,
 *   startClass: Function,
 *   endClass: Function,
 *   error: string | null
 * }}
 */
export function useClassSession() {
    const supabase = useSupabaseClient();

    const [sections, setSections] = useState([]);
    const [activeSession, setActiveSession] = useState(null);
    const [selectedSectionId, setSelectedSectionId] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch available sections for the current user
    const fetchSections = useCallback(async () => {
        if (!supabase) return;

        try {
            const { data, error: fetchError } = await supabase
                .from("sections")
                .select(`
          id,
          name,
          courses (code, name)
        `)
                .order("name");

            if (fetchError) throw fetchError;
            setSections(data || []);
        } catch (err) {
            console.error("Error fetching sections:", err);
            setError(err.message);
        }
    }, [supabase]);

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

    useEffect(() => {
        fetchSections();
        checkActiveSession();
    }, [fetchSections, checkActiveSession]);

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
                    headers: { "Content-Type": "application/json" },
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
                    headers: { "Content-Type": "application/json" },
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
        startClass,
        endClass,
        error,
    };
}
