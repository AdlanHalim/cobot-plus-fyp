// utils/withRole.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';

export default function withRole(Component, allowedRoles = []) {
  return function RoleProtected(props) {
    const router = useRouter();
    const session = useSession(); // Get session from the modern context
    const supabase = useSupabaseClient(); // Get client from the context
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
      // If there is no session, redirect to login
      if (!session?.user) {
        router.replace("/login");
        return;
      }

      // If there is a session, check the user's profile
      const checkProfile = async () => {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("is_admin") // Select the correct column
          .eq("id", session.user.id)
          .single();

        if (error || !profile) {
          console.error("Profile check error:", error);
          router.replace("/unauthorized"); // Redirect if profile not found
          return;
        }

        // Determine the user's role based on the is_admin boolean
        const userRole = profile.is_admin ? 'admin' : 'student';

        // Check if the user's role is in the list of allowed roles
        if (allowedRoles.length === 0 || allowedRoles.includes(userRole)) {
          setAuthorized(true);
        } else {
          router.replace("/unauthorized");
        }
        setLoading(false);
      };

      checkProfile();
    }, [session, router, allowedRoles]);

    if (loading) {
      return <div>Loading...</div>; // Or a loading spinner component
    }

    if (!authorized) {
      return null; // Don't render the component while redirecting
    }

    return <Component {...props} />;
  };
}