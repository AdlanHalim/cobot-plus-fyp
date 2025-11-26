// utils/withRole.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useUser, useSupabaseClient, useSessionContext } from '@supabase/auth-helpers-react'; // Import useSessionContext
import { motion } from "framer-motion";

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
    const user = useUser();
    const supabase = useSupabaseClient();
    // CRITICAL: Get the session status check
    const { isLoading: isSupabaseLoading, session } = useSessionContext(); 
    
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
      // 1. Wait for Supabase to finish checking the session cookie (isSupabaseLoading)
      // This is the key difference from just checking 'user === undefined'.
      if (isSupabaseLoading) return; 

      // 2. Not Logged In (session is null after loading): Redirect to login immediately.
      if (!session) {
        setLoading(false);
        router.replace("/login");
        return;
      }

      // 3. Logged In: Check the user's explicit role from the database.
      const checkProfile = async () => {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

          const userRole = profile?.role || 'student';

          // 4. Check Authorization
          if (allowedRoles.includes(userRole)) {
            setAuthorized(true);
          } else {
            // Logged in, but unauthorized for this page
            router.replace("/unauthorized");
          }
          setLoading(false);

        } catch (err) {
            console.error("Error fetching role:", err);
            router.replace("/unauthorized");
            setLoading(false);
        }
      };

      // Only run the DB check if the session is present (not null)
      if (session) {
        checkProfile();
      }

    }, [isSupabaseLoading, session, router, allowedRoles, supabase, user]);

    // 5. Render Guards
    // IMPORTANT: Check isSupabaseLoading to continue showing the spinner until the session check is finished.
    if (isSupabaseLoading || loading) {
      return <LoadingSpinner />; 
    }

    if (!authorized) {
      // If we finished checking (loading is false) and are not authorized, 
      // the router.replace() call handles redirecting, so we render nothing.
      return null; 
    }

    // Access granted
    return <Component {...props} />;
  };
}