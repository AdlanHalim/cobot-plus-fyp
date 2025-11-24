import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion } from "framer-motion";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [matricNo, setMatricNo] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const supabase = createClientComponentClient();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    // 1. Sign up the user with Supabase Auth
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Pass matric_no and full_name in user_metadata for access in RLS or triggers
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
    
    // 2. Insert additional profile data explicitly
    // This is necessary because user_metadata is not automatically copied to profile columns.
    if (authData.user) {
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ 
                full_name: fullName, 
                matric_no: matricNo 
            })
            .eq('id', authData.user.id);
        
        if (profileError) {
            console.error("Profile update error:", profileError);
            // We proceed anyway, as the user is signed up.
        }

        // 3. Handle the outcome and redirect
        if (authData.session) {
            setMessage("Signup successful! Redirecting to dashboard...");
        } else {
            setMessage("Signup successful! Please check your email to confirm your account.");
        }
        
        router.push('/'); 
    }
    
    setIsSubmitting(false);
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
            CObot+ Sign Up
          </h1>
          <p className="text-slate-600 text-sm">Create your account to access the Attendance Dashboard.</p>
        </div>

        <form className="space-y-4" onSubmit={handleSignUp}>
          {/* Full Name Field */}
          <div>
            <label htmlFor="fullName" className="block text-slate-600 text-sm font-medium mb-1">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              placeholder="Your Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-400 outline-none transition"
            />
          </div>

          {/* Matric No. Field */}
          <div>
            <label htmlFor="matricNo" className="block text-slate-600 text-sm font-medium mb-1">
              Matric No.
            </label>
            <input
              id="matricNo"
              type="text"
              placeholder="e.g., A123456"
              value={matricNo}
              onChange={(e) => setMatricNo(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-400 outline-none transition"
            />
          </div>

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
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-400 outline-none transition"
            />
          </div>

          {message && <p className={`text-center text-sm ${message.includes('successful') ? 'text-emerald-600' : 'text-rose-600'}`}>{message}</p>}

          <button
            type="submit"
            className="w-full py-2 bg-gradient-to-r from-indigo-500 to-teal-400 hover:scale-[1.01] text-white font-medium text-base rounded-xl shadow-md transition disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing Up..." : "Sign Up"}
          </button>

          <p className="text-center text-sm text-slate-600 pt-2">
            Already have an account?{" "}
            <Link href="/login" className="text-sky-600 hover:text-sky-700 font-medium transition">Log in</Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}