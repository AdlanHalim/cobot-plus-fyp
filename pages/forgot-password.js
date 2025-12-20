/**
 * @file forgot-password.js
 * @location cobot-plus-fyp/pages/forgot-password.js
 * 
 * @description
 * Password reset request page.
 * Users enter their email to receive a password reset link.
 */

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [sent, setSent] = useState(false);

    const supabase = useSupabaseClient();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");
        setIsSubmitting(true);

        if (!supabase) {
            setError("Service is initializing. Please try again.");
            setIsSubmitting(false);
            return;
        }

        // Get the current URL for redirect
        const redirectUrl = `${window.location.origin}/reset-password`;

        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl,
        });

        setIsSubmitting(false);

        if (resetError) {
            setError(resetError.message);
        } else {
            setSent(true);
            setMessage("Check your email for a password reset link!");
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
                        Forgot Your<br />Password?
                    </h1>
                    <p className="text-white/80 text-lg">
                        No worries! Enter your email and we'll send you a link to reset it.
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
                        {sent ? (
                            /* Success State */
                            <div className="text-center">
                                <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle className="w-8 h-8 text-green-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-800 mb-2">Check Your Email</h2>
                                <p className="text-slate-500 mb-6">
                                    We've sent a password reset link to<br />
                                    <strong className="text-slate-700">{email}</strong>
                                </p>
                                <p className="text-sm text-slate-400 mb-6">
                                    Didn't receive the email? Check your spam folder or try again.
                                </p>
                                <Link
                                    href="/login"
                                    className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to Login
                                </Link>
                            </div>
                        ) : (
                            /* Form State */
                            <>
                                <div className="text-center mb-8">
                                    <h2 className="text-2xl font-bold text-slate-800">Reset Password</h2>
                                    <p className="text-slate-500 text-sm mt-1">
                                        Enter your email to receive a reset link
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-5">
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

                                    {error && (
                                        <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl text-sm">
                                            {error}
                                        </div>
                                    )}

                                    {message && (
                                        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-xl text-sm">
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
                                                Sending...
                                            </>
                                        ) : (
                                            "Send Reset Link"
                                        )}
                                    </button>
                                </form>

                                <p className="text-center text-sm text-slate-500 mt-6">
                                    Remember your password?{" "}
                                    <Link href="/login" className="text-teal-600 hover:text-teal-700 font-medium">
                                        Sign in
                                    </Link>
                                </p>
                            </>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
