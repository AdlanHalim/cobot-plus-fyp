import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
// MODERN IMPORT: Use the client component helper
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  // MODERN CLIENT: Create the Supabase client inside the component
  const supabase = createClientComponentClient();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setMessage("");

    // 1. Sign up the user with Supabase Auth
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // You can pass extra user metadata here
        data: {
          full_name: "New User", // You can get this from a form field
        }
      }
    });

    if (signUpError) {
      setMessage(signUpError.message);
      return;
    }

    // 2. Handle the two possible outcomes of signup
    // If a user object is returned but no session, email confirmation is needed
    if (data.user && !data.session) {
      setMessage("Signup successful! Please check your email to confirm your account.");
      // We don't create a profile in the DB until the user is confirmed
      return;
    }
    
    // If a session is returned, the user is confirmed and logged in
    if (data.user && data.session) {
      // 3. Create the user's profile in our 'profiles' table
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        // CORRECTED: Use 'is_admin' with a boolean value, not 'role'
        is_admin: false, 
        full_name: data.user.user_metadata.full_name || "",
      });

      if (profileError) {
        console.error("Profile Error:", profileError);
        setMessage("Account created, but failed to create profile. Please contact support.");
        return;
      }

      setMessage("Signup successful! You are now logged in.");
      // Redirect to the desired page after successful signup
      router.push('/admin'); 
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