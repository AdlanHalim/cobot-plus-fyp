// pages/_app.js
import { useState } from 'react';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
// We need createClientComponentClient for client-side use
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Note: Pi API URL is configured via NEXT_PUBLIC_PI_URL in .env.local

// Your CSS imports
import '../styles/globals.css';
import '../styles/Navbar.module.css';
import '../styles/login.css';
import '../styles/signup.css';
import '../styles/manage-roles.css';


// Define a function to create the client that will be used inside the component
// The client will be created only once within the functional component's scope.
const createSupabaseClient = () => createClientComponentClient();

function MyApp({ Component, pageProps }) {
  // Create or retrieve the client instance using useState
  const [supabaseClient] = useState(createSupabaseClient);

  console.log('SUPABASE URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('SUPABASE ANON KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...');

  // Always wrap with SessionContextProvider so useSupabaseClient hook works
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