/**
 * @file UserContext.js
 * @location cobot-plus-fyp/contexts/UserContext.js
 * 
 * @description
 * Centralized user context provider for the CObot+ application.
 * Fetches user profile ONCE on app load and shares data across all components.
 * 
 * This eliminates redundant profile fetches that were happening on:
 * - Every page navigation (withRole HOC)
 * - Sidebar component
 * - useUserRole hook
 * 
 * Benefits:
 * - Profile data fetched only once per session
 * - Instant access to role/profile from any component
 * - Significantly faster page navigation
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { clearAllCache } from "@/hooks/useDataCache";

/**
 * User context shape
 * @typedef {Object} UserContextValue
 * @property {Object|null} profile - User profile data (role, full_name, lecturer_uuid)
 * @property {string|null} userRole - User's role (admin, lecturer, student)
 * @property {string|null|false} lecturerId - Lecturer UUID or false for admin
 * @property {boolean} isLoading - Whether profile is still loading
 * @property {Function} refreshUser - Force refresh user data
 */

const UserContext = createContext({
    profile: null,
    userRole: null,
    lecturerId: undefined,
    isLoading: true,
    refreshUser: () => { },
});

/**
 * UserProvider component
 * Wraps the app and provides user data to all children.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 */
export function UserProvider({ children }) {
    const session = useSession();
    const supabase = useSupabaseClient();

    const [profile, setProfile] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [lecturerId, setLecturerId] = useState(undefined);
    const [isLoading, setIsLoading] = useState(true);

    /**
     * Fetch user profile from database.
     * Only runs once when session becomes available.
     */
    // Track previous session to detect logout
    const prevSessionRef = useRef(session);

    const fetchProfile = useCallback(async () => {
        if (!session?.user) {
            // Clear all caches on logout for fresh data next login
            if (prevSessionRef.current?.user) {
                clearAllCache();
            }
            setProfile(null);
            setUserRole(null);
            setLecturerId(null);
            setIsLoading(false);
            prevSessionRef.current = session;
            return;
        }
        prevSessionRef.current = session;

        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("role, full_name, lecturer_uuid, student_id, matric_no")
                .eq("id", session.user.id)
                .single();

            if (error) {
                console.error("Error fetching profile:", error);
                setUserRole("student"); // Default fallback
                setLecturerId(null);
            } else if (data) {
                setProfile(data);
                const role = data.role || "student";
                setUserRole(role);

                // Determine lecturerId based on role
                if (role === "admin") {
                    setLecturerId(false); // Admin bypass - no filtering needed
                } else if (role === "lecturer") {
                    setLecturerId(data.lecturer_uuid || null);
                } else {
                    setLecturerId(null);
                }
            }
        } catch (err) {
            console.error("Unexpected error fetching profile:", err);
            setUserRole("student");
            setLecturerId(null);
        } finally {
            setIsLoading(false);
        }
    }, [session?.user, supabase]);

    // Fetch profile when session changes
    useEffect(() => {
        // If session is undefined, wait for it to resolve
        if (session === undefined) return;

        fetchProfile();
    }, [session, fetchProfile]);

    /**
     * Force refresh user data.
     * Useful after profile updates.
     */
    const refreshUser = useCallback(() => {
        setIsLoading(true);
        fetchProfile();
    }, [fetchProfile]);

    const value = {
        profile,
        userRole,
        lecturerId,
        isLoading,
        refreshUser,
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
}

/**
 * Custom hook to access user context.
 * 
 * @returns {UserContextValue} User context data
 * @throws {Error} If used outside of UserProvider
 * 
 * @example
 * const { userRole, profile, isLoading } = useUser();
 */
export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error("useUser must be used within a UserProvider");
    }
    return context;
}

export default UserContext;
