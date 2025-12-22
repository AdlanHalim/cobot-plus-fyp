/**
 * @file reset-password.js
 * @location cobot-plus-fyp/pages/reset-password.js
 * 
 * @description
 * Password reset page where users set a new password.
 * Accessed via the reset link sent to email.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Image from "next/image";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { motion } from "framer-motion";
import { Lock, CheckCircle, AlertCircle } from "lucide-react";

export default function ResetPasswordPage() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [sessionChecked, setSessionChecked] = useState(false);
    const [hasValidSession, setHasValidSession] = useState(false);

    const supabase = useSupabaseClient();
    const router = useRouter();

    // Check if user has a valid session from the reset link
    useEffect(() => {
        const checkSession = async () => {
            if (!supabase) return;

            const { data: { session } } = await supabase.auth.getSession();
            setHasValidSession(!!session);
            setSessionChecked(true);
        };

        checkSession();

        // Listen for auth state changes (when user clicks the email link)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "PASSWORD_RECOVERY") {
                setHasValidSession(true);
            }
        });

        return () => subscription?.unsubscribe();
    }, [supabase]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setIsSubmitting(true);

        const { error: updateError } = await supabase.auth.updateUser({
            password: password,
        });

        setIsSubmitting(false);

        if (updateError) {
            setError(updateError.message);
        } else {
            setSuccess(true);
            // Redirect to login after 3 seconds
            setTimeout(() => {
                router.push("/login");
            }, 3000);
        }
    };

    if (!sessionChecked) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-teal-50">
                <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

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
                        Create New<br />Password
                    </h1>
                    <p className="text-white/80 text-lg">
                        Set a strong password to secure your account.
                    </p>
                </div>

                <div className="text-white/60 text-sm">
                    © 2024 CObot+ Attendance System
                </div>
            </div>

            {/* Right Side - Form */}
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
                        {!hasValidSession ? (
                            /* Invalid/Expired Link */
                            <div className="text-center">
                                <div className="w-16 h-16 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-4">
                                    <AlertCircle className="w-8 h-8 text-amber-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-800 mb-2">Invalid Reset Link</h2>
                                <p className="text-slate-500 mb-6">
                                    This password reset link has expired or is invalid.
                                </p>
                                <Link
                                    href="/forgot-password"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition"
                                >
                                    Request New Link
                                </Link>
                            </div>
                        ) : success ? (
                            /* Success State */
                            <div className="text-center">
                                <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle className="w-8 h-8 text-green-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-800 mb-2">Password Updated!</h2>
                                <p className="text-slate-500 mb-6">
                                    Your password has been reset successfully.<br />
                                    Redirecting to login...
                                </p>
                                <Link
                                    href="/login"
                                    className="text-teal-600 hover:text-teal-700 font-medium"
                                >
                                    Go to Login
                                </Link>
                            </div>
                        ) : (
                            /* Form State */
                            <>
                                <div className="text-center mb-8">
                                    <h2 className="text-2xl font-bold text-slate-800">Set New Password</h2>
                                    <p className="text-slate-500 text-sm mt-1">
                                        Enter your new password below
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div>
                                        <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                                            New Password
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
                                                minLength={6}
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none transition text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
                                            Confirm Password
                                        </label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input
                                                id="confirmPassword"
                                                type="password"
                                                placeholder="••••••••"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                required
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none transition text-sm"
                                            />
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl text-sm">
                                            {error}
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
                                                Updating...
                                            </>
                                        ) : (
                                            "Update Password"
                                        )}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
