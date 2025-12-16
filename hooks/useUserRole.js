import { useState, useEffect } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";

/**
 * Custom hook for determining user role and lecturer ID.
 * Used for role-based data filtering in dashboard components.
 * 
 * @returns {{
 *   userRole: string | null,
 *   lecturerId: string | null | false,
 *   isLoading: boolean
 * }}
 * 
 * Note: lecturerId can be:
 * - undefined: still loading
 * - null: user is not a lecturer or has no lecturer_uuid
 * - false: user is admin (no filtering needed)
 * - string: actual lecturer UUID for filtering
 */
export function useUserRole() {
    const supabase = useSupabaseClient();
    const session = useSession();

    const [userRole, setUserRole] = useState(null);
    const [lecturerId, setLecturerId] = useState(undefined);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Wait for session to be determined
        if (session === undefined) return;

        async function fetchUserRole() {
            // No session = no user
            if (!session?.user) {
                setUserRole(null);
                setLecturerId(null);
                setIsLoading(false);
                return;
            }

            try {
                const { data: profileData, error } = await supabase
                    .from("profiles")
                    .select("role, lecturer_uuid")
                    .eq("id", session.user.id)
                    .single();

                if (error) {
                    console.error("Error fetching user role:", error);
                    setUserRole("student");
                    setLecturerId(null);
                    setIsLoading(false);
                    return;
                }

                const role = profileData?.role || "student";
                setUserRole(role);

                // Determine lecturerId based on role
                if (role === "admin") {
                    setLecturerId(false); // Admin bypass - no filtering needed
                } else if (role === "lecturer") {
                    setLecturerId(profileData?.lecturer_uuid || null);
                } else {
                    setLecturerId(null);
                }
            } catch (err) {
                console.error("Unexpected error fetching user role:", err);
                setUserRole("student");
                setLecturerId(null);
            } finally {
                setIsLoading(false);
            }
        }

        fetchUserRole();
    }, [session, supabase]);

    return { userRole, lecturerId, isLoading };
}
