/**
 * @file login.js
 * @location cobot-plus-fyp/pages/login.js
 * 
 * @description
 * User authentication page for the CObot+ Attendance System.
 * Handles email/password login via Supabase Auth.
 * 
 * Features:
 * - Email and password validation
 * - Role-based redirect after login:
 *   - Students → /student-view
 *   - Admin/Lecturer → / (dashboard)
 * - Split-screen design with CObot+ branding
 * - Error message display
 * 
 * @access Public (no authentication required)
 */

import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Image from "next/image";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight } from "lucide-react";

/**
 * Login Page Component
 * Renders the authentication form with email/password inputs.
 */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const router = useRouter();

  const supabase = useSupabaseClient();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoggingIn(true);

    if (!supabase) {
      setErrorMsg("Authentication service is initializing. Please try again.");
      setIsLoggingIn(false);
      return;
    }

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setIsLoggingIn(false);
      return;
    }

    // Fetch user profile to determine redirect destination
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    const userRole = profile?.role || "student";

    // Redirect based on role
    if (userRole === "student") {
      router.push("/student-view");
    } else {
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen flex bg-teal-50">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-teal-600 via-cyan-700 to-teal-800 p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center overflow-hidden">
            <Image src="/logo.png" alt="CObot+" width={48} height={48} />
          </div>
          <span className="text-white text-2xl font-bold">CObot+</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Smart Attendance<br />Made Simple
          </h1>
          <p className="text-white/80 text-lg">
            AI-powered facial recognition for seamless classroom attendance tracking.
          </p>
        </div>

        <div className="text-white/60 text-sm">
          © 2024 CObot+ Attendance System
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center overflow-hidden">
              <Image src="/logo.png" alt="CObot+" width={48} height={48} />
            </div>
            <span className="text-slate-800 text-2xl font-bold">CObot+</span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-800">Welcome back</h2>
              <p className="text-slate-500 text-sm mt-1">Sign in to your account to continue</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none transition text-sm"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none transition text-sm"
                  />
                </div>
                <div className="text-right">
                  <Link href="/forgot-password" className="text-sm text-teal-600 hover:text-teal-700">
                    Forgot password?
                  </Link>
                </div>
              </div>

              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl text-sm">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-medium rounded-xl transition disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-6">
              Don't have an account?{" "}
              <Link href="/signup" className="text-teal-600 hover:text-teal-700 font-medium">
                Create account
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}