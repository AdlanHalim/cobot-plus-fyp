"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import { LockClosedIcon } from '@heroicons/react/24/outline';

export default function UnauthorizedPage() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const session = useSession();
  const [redirectPath, setRedirectPath] = useState('/');

  // Determine redirect path based on user role
  useEffect(() => {
    const fetchRole = async () => {
      if (!session?.user?.id) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      const userRole = profile?.role || "student";
      setRedirectPath(userRole === "student" ? "/student-view" : "/");
    };

    fetchRole();
  }, [session, supabase]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 text-slate-700 p-6">
      <div className="text-center bg-white/80 backdrop-blur-md p-10 rounded-2xl shadow-xl border border-rose-200 max-w-md w-full">
        <LockClosedIcon className="w-16 h-16 text-rose-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold mb-3 text-rose-700">Access Denied</h1>
        <p className="text-lg mb-6">
          You do not have the required permissions to view this page.
        </p>
        <button
          onClick={() => router.push(redirectPath)}
          className="w-full py-3 rounded-xl text-white font-medium bg-gradient-to-r from-teal-500 to-cyan-500 hover:scale-[1.02] transition shadow-md"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}