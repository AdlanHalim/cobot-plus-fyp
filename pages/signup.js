/**
 * @file signup.js
 * @location cobot-plus-fyp/pages/signup.js
 * 
 * @description
 * User registration page for the CObot+ Attendance System.
 * Handles new account creation via Supabase Auth.
 * 
 * Features:
 * - Collects: Full Name, Matric No, Email, Password
 * - Auto-links to existing student record if matric number matches
 * - Sets role to "student" when linked to student record
 * - Email confirmation workflow (if not auto-confirmed)
 * - Split-screen design matching login page
 * 
 * @access Public (no authentication required)
 */

import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Image from "next/image";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { motion } from "framer-motion";
import { Mail, Lock, User, Hash, ArrowRight } from "lucide-react";

/**
 * Sign Up Page Component
 * Renders the registration form with student information inputs.
 */
export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [matricNo, setMatricNo] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const supabase = useSupabaseClient();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    if (!supabase) {
      setMessage("Authentication service is initializing. Please try again.");
      setIsSubmitting(false);
      return;
    }

    // First, check if student exists with this matric number
    const { data: existingStudent } = await supabase
      .from("students")
      .select("id, email")
      .eq("matric_no", matricNo.trim().toUpperCase())
      .single();

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          matric_no: matricNo,
        }
      }
    });

    if (signUpError) {
      setMessage(signUpError.message);
      setIsSubmitting(false);
      return;
    }

    if (authData.user) {
      // Update profile with full_name, matric_no, and link student_id if found
      const profileUpdate = {
        full_name: fullName,
        matric_no: matricNo.trim().toUpperCase(),
        email: email,
      };

      // If student record exists, link it
      if (existingStudent?.id) {
        profileUpdate.student_id = existingStudent.id;
        profileUpdate.role = "student"; // Ensure role is set to student
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', authData.user.id);

      if (profileError) {
        console.error("Profile update error:", profileError);
      }

      if (authData.session) {
        setMessage("Signup successful! Redirecting...");
        // Redirect students to student-view, others to dashboard
        setTimeout(() => {
          router.push(existingStudent?.id ? '/student-view' : '/');
        }, 1000);
      } else {
        setMessage("Please check your email to confirm your account.");
      }
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex bg-teal-50">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-600 p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center overflow-hidden">
            <Image src="/logo.png" alt="CObot+" width={48} height={48} />
          </div>
          <span className="text-white text-2xl font-bold">CObot+</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Join CObot+<br />Today
          </h1>
          <p className="text-white/80 text-lg">
            Create your account and experience seamless attendance tracking.
          </p>
        </div>

        <div className="text-white/60 text-sm">
          © 2024 CObot+ Attendance System
        </div>
      </div>

      {/* Right Side - Signup Form */}
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
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Create account</h2>
              <p className="text-slate-500 text-sm mt-1">Fill in your details to get started</p>
            </div>

            <form onSubmit={handleSignUp} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-teal-400 outline-none transition text-sm"
                  />
                </div>
              </div>

              {/* Matric No */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Matric No.
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g., A123456"
                    value={matricNo}
                    onChange={(e) => setMatricNo(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-teal-400 outline-none transition text-sm"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-teal-400 outline-none transition text-sm"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-teal-400 outline-none transition text-sm"
                  />
                </div>
              </div>

              {message && (
                <div className={`px-4 py-3 rounded-xl text-sm ${message.includes('successful') || message.includes('check')
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                  : 'bg-rose-50 border border-rose-200 text-rose-600'
                  }`}>
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-medium rounded-xl transition disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-6">
              Already have an account?{" "}
              <Link href="/login" className="text-teal-600 hover:text-teal-700 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}