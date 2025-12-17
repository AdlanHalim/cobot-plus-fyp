import { useState, useEffect, useCallback } from "react";
import { useSupabaseClient, useSession } from "@supabase/auth-helpers-react";

/**
 * Custom hook for managing excuse submissions.
 * Handles creating, viewing, and updating excuse records.
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.isAdmin - If true, show all excuses (admin mode)
 * @param {boolean} options.isLecturer - If true, filter by lecturer's sections
 */
export function useExcuseManagement(options = {}) {
    const supabase = useSupabaseClient();
    const session = useSession();
    const { isAdmin = false, isLecturer = false } = options;

    const [excuses, setExcuses] = useState([]);
    const [sections, setSections] = useState([]);
    const [lecturerSections, setLecturerSections] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [studentId, setStudentId] = useState(null);
    const [lecturerId, setLecturerId] = useState(null);

    // Get student ID or lecturer ID from profile
    useEffect(() => {
        const fetchProfile = async () => {
            if (!session?.user?.id) return;

            const { data, error } = await supabase
                .from("profiles")
                .select("student_id, lecturer_uuid, role")
                .eq("id", session.user.id)
                .single();

            if (data?.student_id) {
                setStudentId(data.student_id);
            }
            if (data?.lecturer_uuid) {
                setLecturerId(data.lecturer_uuid);
            }
        };

        fetchProfile();
    }, [session, supabase]);

    // Fetch lecturer's sections
    useEffect(() => {
        const fetchLecturerSections = async () => {
            if (!supabase || !lecturerId) return;

            const { data } = await supabase
                .from("sections")
                .select(`
                    id,
                    name,
                    courses (code, name)
                `)
                .eq("lecturer_id", lecturerId);

            if (data) {
                setLecturerSections(data);
            }
        };

        if (isLecturer && lecturerId) {
            fetchLecturerSections();
        }
    }, [supabase, lecturerId, isLecturer]);

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
                    students (name, matric_no, email),
                    sections (
                        id,
                        name,
                        lecturer_id,
                        courses (code, name)
                    ),
                    class_sessions (class_date)
                `)
                .order("created_at", { ascending: false });

            // Filter based on role
            if (!isAdmin && !isLecturer && studentId) {
                // Student: only their own excuses
                query = query.eq("student_id", studentId);
            }

            const { data, error: fetchError } = await query;

            if (fetchError) throw fetchError;

            let filteredData = data || [];

            // For lecturers, filter excuses to only their sections
            if (isLecturer && lecturerId && !isAdmin) {
                const lecturerSectionIds = lecturerSections.map((s) => s.id);
                filteredData = filteredData.filter((e) =>
                    lecturerSectionIds.includes(e.section_id)
                );
            }

            setExcuses(filteredData);
        } catch (err) {
            console.error("Error fetching excuses:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [supabase, isAdmin, isLecturer, studentId, lecturerId, lecturerSections]);

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
        const shouldFetch = studentId || isAdmin || (isLecturer && lecturerSections.length > 0);
        if (shouldFetch) {
            fetchExcuses();
        }
        if (studentId) {
            fetchSections();
        }
    }, [fetchExcuses, fetchSections, studentId, isAdmin, isLecturer, lecturerSections]);

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

    // Review excuse (approve/reject) - Admin/Lecturer only
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
        lecturerSections,
        isLoading,
        error,
        studentId,
        lecturerId,
        submitExcuse,
        reviewExcuse,
        uploadDocument,
        refetch: fetchExcuses,
    };
}

