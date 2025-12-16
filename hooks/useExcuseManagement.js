import { useState, useEffect, useCallback } from "react";
import { useSupabaseClient, useSession } from "@supabase/auth-helpers-react";

/**
 * Custom hook for managing excuse submissions.
 * Handles creating, viewing, and updating excuse records.
 */
export function useExcuseManagement(options = {}) {
    const supabase = useSupabaseClient();
    const session = useSession();
    const { isAdmin = false } = options;

    const [excuses, setExcuses] = useState([]);
    const [sections, setSections] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [studentId, setStudentId] = useState(null);

    // Get student ID from profile
    useEffect(() => {
        const fetchStudentId = async () => {
            if (!session?.user?.id) return;

            const { data, error } = await supabase
                .from("profiles")
                .select("student_id")
                .eq("id", session.user.id)
                .single();

            if (data?.student_id) {
                setStudentId(data.student_id);
            }
        };

        fetchStudentId();
    }, [session, supabase]);

    // Fetch excuses
    const fetchExcuses = useCallback(async () => {
        if (!supabase) return;

        setIsLoading(true);
        setError(null);

        try {
            let query = supabase
                .from("excuses")
                .select(`
          *,
          students (name, matric_no),
          sections (
            name,
            courses (code, name)
          ),
          class_sessions (class_date)
        `)
                .order("created_at", { ascending: false });

            // If student, filter to their own excuses
            if (!isAdmin && studentId) {
                query = query.eq("student_id", studentId);
            }

            const { data, error: fetchError } = await query;

            if (fetchError) throw fetchError;
            setExcuses(data || []);
        } catch (err) {
            console.error("Error fetching excuses:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [supabase, isAdmin, studentId]);

    // Fetch sections for student dropdown
    const fetchSections = useCallback(async () => {
        if (!supabase || !studentId) return;

        const { data } = await supabase
            .from("student_section_enrollments")
            .select(`
        section_id,
        sections (
          id,
          name,
          courses (code, name)
        )
      `)
            .eq("student_id", studentId);

        if (data) {
            setSections(data.map((d) => d.sections).filter(Boolean));
        }
    }, [supabase, studentId]);

    useEffect(() => {
        if (studentId || isAdmin) {
            fetchExcuses();
        }
        if (studentId) {
            fetchSections();
        }
    }, [fetchExcuses, fetchSections, studentId, isAdmin]);

    // Submit new excuse
    const submitExcuse = useCallback(
        async ({ sectionId, excuseType, reason, documentUrl = null, classSessionId = null }) => {
            if (!supabase || !studentId) {
                return { success: false, error: "Not authenticated or student ID not found" };
            }

            try {
                const { data, error: insertError } = await supabase
                    .from("excuses")
                    .insert({
                        student_id: studentId,
                        section_id: sectionId,
                        class_session_id: classSessionId,
                        excuse_type: excuseType,
                        reason: reason,
                        document_url: documentUrl,
                        status: "pending",
                    })
                    .select()
                    .single();

                if (insertError) throw insertError;

                // Refresh list
                fetchExcuses();
                return { success: true, data };
            } catch (err) {
                console.error("Error submitting excuse:", err);
                return { success: false, error: err.message };
            }
        },
        [supabase, studentId, fetchExcuses]
    );

    // Review excuse (approve/reject) - Admin only
    const reviewExcuse = useCallback(
        async (excuseId, status, adminNotes = "") => {
            if (!supabase || !session?.user?.id) {
                return { success: false, error: "Not authenticated" };
            }

            try {
                const { error: updateError } = await supabase
                    .from("excuses")
                    .update({
                        status: status,
                        reviewed_by: session.user.id,
                        reviewed_at: new Date().toISOString(),
                        admin_notes: adminNotes,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", excuseId);

                if (updateError) throw updateError;

                // If approved, update attendance record to excused
                if (status === "approved") {
                    const excuse = excuses.find((e) => e.id === excuseId);
                    if (excuse?.class_session_id) {
                        await supabase
                            .from("attendance_records")
                            .update({ status: "excused" })
                            .eq("student_id", excuse.student_id)
                            .eq("class_session_id", excuse.class_session_id);
                    }
                }

                fetchExcuses();
                return { success: true };
            } catch (err) {
                console.error("Error reviewing excuse:", err);
                return { success: false, error: err.message };
            }
        },
        [supabase, session, fetchExcuses, excuses]
    );

    // Upload document
    const uploadDocument = useCallback(
        async (file) => {
            if (!supabase || !studentId) {
                return { success: false, error: "Not authenticated" };
            }

            try {
                const fileExt = file.name.split(".").pop();
                const fileName = `${studentId}/${Date.now()}.${fileExt}`;

                const { data, error: uploadError } = await supabase.storage
                    .from("excuses")
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                // Get public URL
                const { data: urlData } = supabase.storage
                    .from("excuses")
                    .getPublicUrl(fileName);

                return { success: true, url: urlData.publicUrl };
            } catch (err) {
                console.error("Error uploading document:", err);
                return { success: false, error: err.message };
            }
        },
        [supabase, studentId]
    );

    return {
        excuses,
        sections,
        isLoading,
        error,
        studentId,
        submitExcuse,
        reviewExcuse,
        uploadDocument,
        refetch: fetchExcuses,
    };
}
