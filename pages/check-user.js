import { useEffect } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

export default function CheckUser() {
  const supabase = useSupabaseClient();

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      console.log("Current user:", user);
    }
    checkUser();
  }, [supabase]);

  return <div>Check console for current user info.</div>;
}
