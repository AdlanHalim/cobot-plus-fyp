import { useEffect } from "react";
import supabase from "../utils/supabase";

export default function CheckUser() {
  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      console.log("Current user:", user);
    }
    checkUser();
  }, []);

  return <div>Check console for current user info.</div>;
}
