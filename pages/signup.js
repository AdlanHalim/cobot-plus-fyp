import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  const supabase = createClientComponentClient();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setMessage("");

    // 1. Sign up the user with Supabase Auth
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setMessage(signUpError.message);
      return;
    }
    
    // 2. Handle the outcome
    if (data.user) {
      // The profile creation and default role ('student') assignment 
      // are now handled securely by the PostgreSQL trigger on the Supabase backend.
      
      if (data.session) {
          // Email confirmation is OFF (user is logged in immediately)
          setMessage("Signup successful! You are now logged in.");
      } else {
          // Email confirmation is ON (user must verify email)
          setMessage("Signup successful! Please check your email to confirm your account.");
      }
      
      // Redirect to the dashboard, which will handle authentication status.
      router.push('/'); 
    }
  };

  return (
    <div className="signup-container">
      <div className="left-section">
        <h1 className="signup-branding">
          <span className="brand-highlight">CObot+</span> Attendance Dashboard
        </h1>

        <h2 className="signup-title">Create an Account</h2>

        <form className="signup-form" onSubmit={handleSignUp}>
          <label htmlFor="email" className="input-label">Email</label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input-field"
          />

          <label htmlFor="password" className="input-label">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Minimum 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="input-field"
          />

          {message && <p className="message-text">{message}</p>}

          <button type="submit" className="signup-button">Sign Up</button>

          <p className="login-prompt">
            Already have an account?{" "}
            <Link href="/login" className="login-link">Log in</Link>
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