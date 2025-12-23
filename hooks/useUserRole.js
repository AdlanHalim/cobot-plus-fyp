/**
 * @file useUserRole.js
 * @location cobot-plus-fyp/hooks/useUserRole.js
 * 
 * @description
 * Backward-compatible hook for accessing user role and lecturer ID.
 * Now simply re-exports values from the centralized UserContext.
 * 
 * This hook exists for backward compatibility - new code should use
 * useUser() from @/contexts/UserContext directly.
 * 
 * Performance: No database queries! Reads from cached context.
 */

import { useUser } from "@/contexts/UserContext";

/**
 * Custom hook for accessing user role and lecturer ID.
 * This is a backward-compatible wrapper around useUser context.
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
 * 
 * @example
 * const { userRole, lecturerId, isLoading } = useUserRole();
 */
export function useUserRole() {
    // Simply re-export values from context - no DB query!
    const { userRole, lecturerId, isLoading } = useUser();

    return { userRole, lecturerId, isLoading };
}

