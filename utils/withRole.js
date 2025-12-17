/**
 * @file withRole.js
 * @location cobot-plus-fyp/utils/withRole.js
 * 
 * @description
 * Higher-Order Component (HOC) for role-based access control.
 * Wraps page components to enforce authentication and authorization.
 * 
 * @example
 * // Protect a page for admin and lecturer only
 * export default withRole(AnalysisPage, ["admin", "lecturer"]);
 * 
 * // Protect a page for students only
 * export default withRole(StudentDashboard, ["student"]);
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSessionContext } from '@supabase/auth-helpers-react';
import { motion } from "framer-motion";
import { useUserRole } from "@/hooks";

/**
 * Loading spinner component displayed while checking authentication/authorization.
 * Shows an animated spinner with a friendly message.
 * 
 * @returns {JSX.Element} Full-screen loading spinner
 */
const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-indigo-50 via-sky-50 to-teal-50">
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ ease: "linear", duration: 1, repeat: Infinity }}
      className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full mb-4"
    />
    <p className="text-slate-600 font-medium">Checking access permissions...</p>
  </div>
);

/**
 * Higher-Order Component that enforces role-based access control.
 * 
 * @param {React.ComponentType} Component - The component to wrap and protect
 * @param {string[]} allowedRoles - Array of roles that can access this component
 *                                  Valid roles: "admin", "lecturer", "student"
 * @returns {React.ComponentType} Protected component with access control
 * 
 * @description
 * Authorization Flow:
 * 1. Wait for Supabase session to load
 * 2. Wait for user role to be fetched from profiles table
 * 3. If no session → redirect to /login
 * 4. If session but role not in allowedRoles → redirect to /unauthorized
 * 5. If authorized → render the protected component
 * 
 * @example
 * // pages/analysis.js
 * function AnalysisPage() {
 *   return <div>Analytics Dashboard</div>;
 * }
 * export default withRole(AnalysisPage, ["admin", "lecturer"]);
 */
export default function withRole(Component, allowedRoles = []) {
  return function RoleProtected(props) {
    const router = useRouter();
    const { isLoading: isSupabaseLoading, session } = useSessionContext();

    // Use shared useUserRole hook instead of duplicate DB call
    const { userRole, isLoading: isRoleLoading } = useUserRole();

    const [authorized, setAuthorized] = useState(false);
    const [checked, setChecked] = useState(false);

    useEffect(() => {
      // Wait for Supabase session and role to load
      if (isSupabaseLoading || isRoleLoading) return;

      // Not logged in - redirect to login
      if (!session) {
        router.replace("/login");
        setChecked(true);
        return;
      }

      // Session exists but no role yet (still loading)
      if (!userRole) return;

      // Check authorization
      if (allowedRoles.includes(userRole)) {
        setAuthorized(true);
      } else {
        router.replace("/unauthorized");
      }
      setChecked(true);
    }, [isSupabaseLoading, isRoleLoading, session, userRole, router, allowedRoles]);

    // Show loading while checking
    if (isSupabaseLoading || isRoleLoading || !checked) {
      return <LoadingSpinner />;
    }

    // Not authorized - null while redirecting
    if (!authorized) {
      return null;
    }

    // Access granted
    return <Component {...props} />;
  };
}