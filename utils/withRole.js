import { useEffect, useState } from "react";
import { useRouter } from "next/router";
// Using useUser instead of useSession for cleaner check of authenticated state
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react'; 
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
    const user = useUser(); // Use user hook
    const supabase = useSupabaseClient();
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
      // 1. If user state hasn't resolved yet, wait.
      if (user === undefined) return;

      // 2. Not logged in: Redirect to login
      if (!user) {
        setLoading(false);
        router.replace("/login");
        return;
      }

      // 3. If logged in, check the user's profile for the explicit 'role'
      const checkProfile = async () => {
        try {
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("role") // IMPORTANT: Fetching the explicit 'role' string
            .eq("id", user.id)
            .single();

          if (error || !profile?.role) {
            console.error("Profile or Role check error:", error?.message || "Role not found.");
            // If the profile or role is missing, treat as unauthorized
            setLoading(false);
            router.replace("/unauthorized"); 
            return;
          }

          const userRole = profile.role; // e.g., 'admin', 'lecturer', or 'student'

          // 4. Check if the user's role is in the list of allowed roles
          if (allowedRoles.includes(userRole)) {
            setAuthorized(true);
          } else {
            router.replace("/unauthorized");
          }
          setLoading(false);

        } catch (err) {
            console.error("Fatal error during role check:", err);
            setLoading(false);
            router.replace("/unauthorized");
        }
      };

      checkProfile();
    }, [user, router, allowedRoles, supabase]);

    if (loading) {
      return <LoadingSpinner />; // Show the spinner while checking
    }

    if (!authorized) {
      return null; // Don't render the component while redirecting
    }

    return <Component {...props} />;
  };
}