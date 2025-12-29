// pages/_app.js
import { useState, useEffect } from 'react';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { loadConfig } from "@/utils/config";

import '../styles/globals.css';
import '../styles/Navbar.module.css';
import '../styles/login.css';
import '../styles/signup.css';
import '../styles/manage-roles.css';


// Define a function to create the client that will be used inside the component
// The client will be created only once within the functional component's scope.
const createSupabaseClient = () => createClientComponentClient();

function MyApp({ Component, pageProps }) {
  const [ready, setReady] = useState(false);

  // Create or retrieve the client instance using useState
  const [supabaseClient] = useState(createSupabaseClient);


  console.log('SUPABASE URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('SUPABASE ANON KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...');

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
    // Pass the client and the initial session prop
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


// A modern helper function to get the current logged-in user
export async function getCurrentUser() {
  const supabase = createClientComponentClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}