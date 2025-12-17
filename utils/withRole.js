// utils/withRole.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSessionContext } from '@supabase/auth-helpers-react';
import { motion } from "framer-motion";
import { useUserRole } from "@/hooks";

// Simple Component to show while loading/redirecting
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