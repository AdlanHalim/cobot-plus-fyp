import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import supabase from "./supabase";

export default function withAuth(Component) {
  return function AuthenticatedComponent(props) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);

    useEffect(() => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) {
          router.replace("/login");
        } else {
          setAuthenticated(true);
        }
        setLoading(false);
      });
    }, [router]);

    if (loading) return <div>Loading...</div>;
    if (!authenticated) return null;

    return <Component {...props} />;
  };
}
