// pages/_app.js
import { useState, useEffect } from 'react';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Your custom config loader
import { loadConfig } from "@/utils/config"; 

// Your CSS imports
import '../styles/globals.css';
import '../styles/Navbar.module.css';
import '../styles/login.css'; 
import '../styles/signup.css'; 
import '../styles/manage-roles.css'; 


export default function App({ Component, pageProps }) {
  const [ready, setReady] = useState(false);

  
  // Add these debug lines
  console.log('SUPABASE URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('SUPABASE ANON KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...'); // Only logs first 20 chars for security

  const [supabaseClient] = useState(() => createClientComponentClient());
  
  // ... rest of the component
  // Create a single supabase client for the entire app

  // Config loader for the app (e.g., dynamic API base URL)
  useEffect(() => {
    loadConfig()
      .then(() => setReady(true))
      .catch((err) => {
        console.error("⚠️ Failed to load config. Using fallback.", err);
        setReady(true); // Proceed with fallback if config loading fails
      });
  }, []);

  // Show a loading screen until the initial config is loaded
  if (!ready) {
    return <div>Loading configuration...</div>;
  }

  return (
    // The SessionContextProvider makes the user's session available to all components
    <SessionContextProvider supabaseClient={supabaseClient}>
      <Component {...pageProps} />
    </SessionContextProvider>
  );
}

// Optional: A modern helper function to get the current logged-in user
// This can be used in any client-side component or utility function.
export async function getCurrentUser() {
  const supabase = createClientComponentClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}