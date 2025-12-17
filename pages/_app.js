/**
 * @file _app.js
 * @location cobot-plus-fyp/pages/_app.js
 * 
 * @description
 * Next.js custom App component for the CObot+ Attendance System.
 * Wraps all pages with Supabase session provider for authentication.
 * 
 * Key responsibilities:
 * - Initialize Supabase client for client-side usage
 * - Provide session context to all pages via SessionContextProvider
 * - Import global CSS styles
 * - Handle server-side session pre-fetching
 * 
 * @see https://nextjs.org/docs/advanced-features/custom-app
 */

import { useState } from 'react';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Global stylesheet imports
// These styles are applied to all pages in the application
import '../styles/globals.css';       // Tailwind base, components, utilities + CSS variables
import '../styles/Navbar.module.css'; // Navbar-specific styles
import '../styles/login.css';         // Login page styles
import '../styles/signup.css';        // Signup page styles
import '../styles/manage-roles.css';  // Role management page styles

/**
 * Factory function to create Supabase client.
 * Called once per component lifecycle to ensure single instance.
 * Uses environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 * 
 * @returns {SupabaseClient} Configured Supabase client
 */
const createSupabaseClient = () => createClientComponentClient();

/**
 * Custom App Component
 * 
 * All pages in the application are wrapped by this component.
 * Provides Supabase session context for authentication.
 * 
 * @param {Object} props
 * @param {React.ComponentType} props.Component - The active page component
 * @param {Object} props.pageProps - Props passed from getServerSideProps/getStaticProps
 * @returns {JSX.Element}
 */
function MyApp({ Component, pageProps }) {
  // Create Supabase client once and persist across re-renders
  // Using useState ensures the client is created only once
  const [supabaseClient] = useState(createSupabaseClient);

  // SessionContextProvider makes session available via useSession() hook
  // initialSession from getInitialProps enables SSR auth
  return (
    <SessionContextProvider
      supabaseClient={supabaseClient}
      initialSession={pageProps.initialSession}
    >
      <Component {...pageProps} />
    </SessionContextProvider>
  );
}


// 🔑 DEFINITIVE FIX: Create the client locally inside getInitialProps 
// to ensure it correctly parses the server-side cookies (req/res).
MyApp.getInitialProps = async ({ ctx }) => {
  // CRITICAL: Must create a new client instance here using the server-side context (req/res)
  // The previous client instance defined globally doesn't have the req/res context.
  const supabaseServerClient = createClientComponentClient({ req: ctx.req, res: ctx.res });

  // 1. Fetch user data using the server-aware client
  const { data: { session } } = await supabaseServerClient.auth.getSession();

  // 2. Return the props
  return {
    pageProps: {
      // This session object is what prevents the component from seeing a null session on first render.
      initialSession: session || null,
    }
  };
};

export default MyApp;


// Optional: A modern helper function to get the current logged-in user
export async function getCurrentUser() {
  const supabase = createClientComponentClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}