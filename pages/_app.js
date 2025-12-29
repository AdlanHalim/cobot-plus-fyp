/**
 * @file _app.js
 * @location cobot-plus-fyp/pages/_app.js
 * 
 * @description
 * Next.js custom App component for the CObot+ Attendance System.
 * Wraps all pages with Supabase session provider and UserProvider.
 * 
 * Key responsibilities:
 * - Initialize Supabase client for client-side usage
 * - Provide session context via SessionContextProvider
 * - Provide user profile/role context via UserProvider (fetched once)
 * - Import global CSS styles
 * 
 * Performance optimizations:
 * - Removed getInitialProps to enable client-side navigation
 * - Centralized user profile fetching in UserProvider
 * 
 * @see https://nextjs.org/docs/advanced-features/custom-app
 */

import { useState, useEffect } from 'react';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { loadConfig } from "@/utils/config";

// Global stylesheet imports
import '../styles/globals.css';
import '../styles/Navbar.module.css';
import '../styles/login.css';
import '../styles/signup.css';
import '../styles/manage-roles.css';

/**
 * Factory function to create Supabase client.
 * Called once per component lifecycle to ensure single instance.
 */
const createSupabaseClient = () => createClientComponentClient();

/**
 * Custom App Component
 * All pages in the application are wrapped by this component.
 */
function MyApp({ Component, pageProps }) {
  const [ready, setReady] = useState(false);
  const [supabaseClient] = useState(createSupabaseClient);

  // Config loader for the app (e.g., dynamic API base URL)
  useEffect(() => {
    loadConfig()
      .then(() => setReady(true))
      .catch((err) => {
        console.error("⚠️ Failed to load config. Using fallback.", err);
        setReady(true);
      });
  }, []);

  if (!ready) {
    return <div>Loading configuration...</div>;
  }

  return (
    <SessionContextProvider
      supabaseClient={supabaseClient}
      initialSession={pageProps.initialSession}
    >
      <Component {...pageProps} />
    </SessionContextProvider>
  );
}

export default MyApp;

/**
 * Helper function to get the current logged-in user.
 * @returns {Promise<User|null>} Current user or null
 */
export async function getCurrentUser() {
  const supabase = createClientComponentClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}