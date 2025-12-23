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

import { useState } from 'react';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { UserProvider } from '@/contexts/UserContext';

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
 * Provides Supabase session context and centralized user state.
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
  // UserProvider fetches profile ONCE and shares it across all pages
  return (
    <SessionContextProvider supabaseClient={supabaseClient}>
      <UserProvider>
        <Component {...pageProps} />
      </UserProvider>
    </SessionContextProvider>
  );
}

export default MyApp;

// NOTE: getInitialProps has been REMOVED to enable Next.js client-side navigation.
// This significantly improves navigation performance by:
// 1. Not blocking on SSR for every page change
// 2. Allowing browser-side caching of pages
// 3. Enabling instant navigation with React state

/**
 * Helper function to get the current logged-in user.
 * @returns {Promise<User|null>} Current user or null
 */
export async function getCurrentUser() {
  const supabase = createClientComponentClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}