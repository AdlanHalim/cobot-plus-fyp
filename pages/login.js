import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion } from "framer-motion";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();


  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoggingIn(true);

    // 1. Authenticate the user with email and password
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoggingIn(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    // 2. Fetch profile to check role
    const { data: { user } } = await supabase.auth.getUser();

    // Default redirect
    let redirectPath = "/";

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role === "student") {
        redirectPath = "/student-view";
      }
    }

    // 3. Redirect
    router.push(redirectPath);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-cyan-50 to-teal-50">
      <motion.div
        className="w-full max-w-lg bg-white/70 backdrop-blur-md border border-slate-200/50 rounded-3xl shadow-2xl p-8 space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 via-sky-600 to-teal-600 bg-clip-text text-transparent mb-2">
            CObot+ Log In
          </h1>
          <p className="text-slate-600 text-sm">Welcome back to the Attendance Dashboard.</p>
        </div>

        <form className="space-y-4" onSubmit={handleLogin}>
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-slate-600 text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-400 outline-none transition"
            />
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-slate-600 text-sm font-medium mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-400 outline-none transition"
            />
          </div>

          {errorMsg && <p className="text-center text-sm text-rose-600">{errorMsg}</p>}

          <button
            type="submit"
            className="w-full py-2 bg-gradient-to-r from-indigo-500 to-teal-400 hover:scale-[1.01] text-white font-medium text-base rounded-xl shadow-md transition disabled:opacity-50"
            disabled={isLoggingIn}
          >
            {isLoggingIn ? "Logging In..." : "Log In"}
          </button>

          <p className="text-center text-sm text-slate-600 pt-2">
            Don't have an account?{" "}
            <Link href="/signup" className="text-sky-600 hover:text-sky-700 font-medium transition">Sign up</Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}