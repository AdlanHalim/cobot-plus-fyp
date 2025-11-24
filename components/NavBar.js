// components/ui/NavBar.js
import { useRouter } from "next/router";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";

const Navbar = () => {
  const router = useRouter();
  const [isMenuOpen, setMenuOpen] = useState(false);
  const session = useSession();
  const supabase = useSupabaseClient();

  // State now holds the full profile data, including the role
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      const fetchProfile = async () => {
        // --- FIX: Fetch the 'role' column from your table ---
        const { data, error } = await supabase
          .from("profiles")
          .select("role") // Fetching only the role
          .eq("id", session.user.id)
          .single();

        if (data) setProfile(data);
        if (error) console.error("Error fetching profile:", error);
        setProfileLoading(false);
      };
      fetchProfile();
    } else {
      setProfile(null);
      setProfileLoading(false);
    }
  }, [session?.user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const links = [
    // Roles now match the exact text values in your database constraint
    { href: "/", label: "Dashboard", roles: ["student", "lecturer", "admin"] },
    { href: "/add-student1", label: "Add Student", roles: ["lecturer", "admin"] },
    { href: "/manage-student", label: "Manage Student", roles: [ "admin"] },
    { href: "/manage-course", label: "Manage Course", roles: ["admin"] },
    { href: "/analysis", label: "Analysis", roles: ["student", "lecturer", "admin"] },
    { href: "/manage-roles", label: "User Roles", roles: ["admin"] },
  ];

  // --- FIX: Use the role text directly from the fetched profile ---
  // Default to 'student' if profile or role is null/undefined while loading is complete
  const userRole = profile?.role || "student";

  if (profileLoading) {
    return (
      <nav className="fixed top-0 w-full bg-blue-700/70 backdrop-blur-md shadow-sm py-4 px-6 flex justify-between items-center rounded-b-3xl">
        <h1 className="font-bold text-xl text-blue-50">CObot+</h1>
        <span className="text-blue-200 animate-pulse">Loading...</span>
      </nav>
    );
  }

  // Rest of the component uses the userRole variable for filtering
  return (
    <nav className="fixed top-0 w-full bg-blue-700/80 backdrop-blur-md text-blue-50 shadow-md rounded-b-3xl z-50 border-b border-blue-600/50">
      <div className="max-w-6xl mx-auto flex justify-between items-center px-6 py-4">
        {/* Logo */}
        <Link
          href="/"
          className="text-2xl font-bold tracking-tight text-blue-50"
        >
          CObot+
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center space-x-6">
          {links
            .filter((link) => link.roles.includes(userRole))
            .map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`text-sm font-medium transition-all duration-300 hover:text-blue-200 ${
                  router.pathname === href
                    ? "text-blue-100 font-semibold border-b-2 border-blue-300 pb-1"
                    : "text-blue-50"
                }`}
              >
                {label}
              </Link>
            ))}

          <button
            onClick={handleLogout}
            className="ml-4 bg-blue-600/90 hover:bg-blue-800/90 text-white text-sm px-4 py-2 rounded-xl shadow-sm transition-all duration-300"
          >
            Log Out
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden flex flex-col gap-1.5 text-blue-50 focus:outline-none"
          onClick={() => setMenuOpen(!isMenuOpen)}
        >
          <span className="w-6 h-0.5 bg-blue-50 rounded"></span>
          <span className="w-6 h-0.5 bg-blue-50 rounded"></span>
          <span className="w-6 h-0.5 bg-blue-50 rounded"></span>
        </button>
      </div>

      {/* Mobile Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden bg-blue-700/80 backdrop-blur-xl text-blue-50 px-6 pb-4 space-y-3 rounded-b-3xl shadow-md border-t border-blue-600/50 animate-fade-in">
          {links
            .filter((link) => link.roles.includes(userRole))
            .map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`block py-2 px-3 rounded-lg text-sm transition-all duration-300 hover:bg-blue-600/50 ${
                  router.pathname === href
                    ? "bg-blue-600/40 font-semibold text-blue-50"
                    : ""
                }`}
              >
                {label}
              </Link>
            ))}

          <button
            onClick={() => {
              setMenuOpen(false);
              handleLogout();
            }}
            className="w-full bg-blue-600/90 hover:bg-blue-800/90 text-white px-3 py-2 rounded-lg font-medium text-sm transition-all duration-300 shadow-sm"
          >
            Log Out
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;