import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
// MODERN IMPORT: Use the client component helper
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  // MODERN CLIENT: Create the Supabase client inside the component
  const supabase = createClientComponentClient();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    // 1. Authenticate the user with email and password
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    // 2. On successful login, redirect to a protected route
    // The 'withRole' HOC on that page will check the user's profile
    // and redirect them to the correct place (e.g., /admin or /unauthorized)
    router.push("/"); 
  };

  return (
    <div className="login-container">
      <div className="left-section">
        <h1 className="login-branding">
          <span className="brand-highlight">CObot+</span> Attendance Dashboard
        </h1>

        <form className="login-form" onSubmit={handleLogin}>
          {/* 
            REMOVED: The role selection is a security risk.
            The user's role is determined by their profile in the database.
          */}

          <label htmlFor="email" className="input-label">
            User name
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input-field"
          />

          <label htmlFor="password" className="input-label">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input-field"
          />

          {errorMsg && <p className="error-message">{errorMsg}</p>}

          <button type="submit" className="login-button">
            Log In
          </button>

          <p className="signup-prompt">
            Don't have an account?{" "}
            <Link href="/signup" className="signup-link">
              Sign up
            </Link>
          </p>
        </form>
      </div>

      <div className="right-section">
        <h2>Start managing now</h2>
        <p>Stop struggling with common tasks and focus on the real choke points.</p>
        <button className="cta-button">Get started</button>
      </div>
    </div>
  );
}