/**
 * @file Sidebar.js
 * @location cobot-plus-fyp/components/layout/Sidebar.js
 * 
 * @description
 * Collapsible sidebar navigation component for the CObot+ dashboard.
 * Displays navigation links filtered by user role.
 * 
 * Features:
 * - Collapsible on desktop (click toggle button)
 * - Mobile hamburger menu with slide-out panel
 * - Role-based menu item visibility
 * - User profile display (name, role, avatar)
 * - Active route highlighting
 * - Logout functionality
 */

import { useRouter } from "next/router";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import Image from "next/image";
import {
    LayoutDashboard,
    UserPlus,
    Users,
    BookOpen,
    BarChart3,
    FileText,
    UserCog,
    Settings,
    LogOut,
    ChevronLeft,
    Menu,
} from "lucide-react";

/**
 * Sidebar Navigation Component
 * Fetches user profile and renders role-appropriate navigation links.
 */
const Sidebar = () => {
    const router = useRouter();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const session = useSession();
    const supabase = useSupabaseClient();
    const [profile, setProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(true);

    useEffect(() => {
        if (session?.user) {
            const fetchProfile = async () => {
                const { data, error } = await supabase
                    .from("profiles")
                    .select("role, full_name")
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
    }, [session?.user, supabase]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const userRole = profile?.role || "student";

    const navItems = [
        { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["student", "lecturer", "admin"] },
        { href: "/add-student1", label: "Add Student", icon: UserPlus, roles: ["lecturer", "admin"] },
        { href: "/manage-student", label: "Students", icon: Users, roles: ["admin"] },
        { href: "/manage-course", label: "Course Hub", icon: BookOpen, roles: ["admin"] },
        { href: "/analysis", label: "Analysis", icon: BarChart3, roles: ["student", "lecturer", "admin"] },
        { href: "/student-view", label: "My Records", icon: FileText, roles: ["admin", "student"] },
        { href: "/submit-excuse", label: "Submit Excuse", icon: FileText, roles: ["student"] },
        { href: "/manage-excuses", label: "Excuses", icon: FileText, roles: ["admin", "lecturer"] },
        { href: "/manage-roles", label: "User Roles", icon: UserCog, roles: ["admin"] },
        { href: "/settings", label: "Settings", icon: Settings, roles: ["admin"] },
    ];

    const filteredNavItems = navItems.filter((item) => item.roles.includes(userRole));

    if (profileLoading) {
        return (
            <aside className="fixed left-0 top-0 h-screen w-16 bg-white border-r border-slate-200 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </aside>
        );
    }

    return (
        <>
            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-50">
                <div className="flex items-center gap-3">
                    <Image src="/logo.png" alt="CObot+" width={32} height={32} className="rounded-lg" />
                    <span className="font-bold text-lg text-slate-800">CObot+</span>
                </div>
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition"
                >
                    <Menu className="w-6 h-6 text-slate-600" />
                </button>
            </header>

            {/* Mobile Overlay */}
            {!isCollapsed && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setIsCollapsed(true)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed left-0 top-0 h-screen bg-white border-r border-slate-200 z-50 transition-all duration-300 flex flex-col
          ${isCollapsed ? "-translate-x-full lg:translate-x-0 lg:w-20" : "w-64"}
          lg:translate-x-0`}
            >
                {/* Logo Section */}
                <div className="p-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center overflow-hidden">
                            <Image src="/logo.png" alt="CObot+" width={40} height={40} className="object-cover" />
                        </div>
                        {!isCollapsed && (
                            <div className="flex-1">
                                <h1 className="font-bold text-lg text-slate-800">CObot+</h1>
                                <p className="text-xs text-slate-500">Attendance System</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Collapse Toggle (Desktop) */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-white border border-slate-200 rounded-full items-center justify-center shadow-sm hover:bg-slate-50 transition"
                >
                    <ChevronLeft className={`w-4 h-4 text-slate-500 transition-transform ${isCollapsed ? "rotate-180" : ""}`} />
                </button>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {filteredNavItems.map((item) => {
                        const isActive = router.pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsCollapsed(true)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                  ${isActive
                                        ? "bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md"
                                        : "text-slate-600 hover:bg-slate-100"
                                    }
                  ${isCollapsed ? "justify-center lg:justify-center" : ""}
                `}
                                title={isCollapsed ? item.label : undefined}
                            >
                                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-white" : "text-slate-500"}`} />
                                {!isCollapsed && (
                                    <span className={`text-sm font-medium ${isActive ? "text-white" : ""}`}>
                                        {item.label}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Section */}
                <div className="p-3 border-t border-slate-100">
                    {!isCollapsed && (
                        <div className="flex items-center gap-3 px-3 py-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-cyan-400 flex items-center justify-center text-white text-sm font-medium">
                                {profile?.full_name?.charAt(0) || session?.user?.email?.charAt(0)?.toUpperCase() || "U"}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800 truncate">
                                    {profile?.full_name || "User"}
                                </p>
                                <p className="text-xs text-slate-500 capitalize">{userRole}</p>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        className={`flex items-center gap-3 w-full px-3 py-2.5 text-slate-600 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition
              ${isCollapsed ? "justify-center" : ""}
            `}
                        title={isCollapsed ? "Log Out" : undefined}
                    >
                        <LogOut className="w-5 h-5" />
                        {!isCollapsed && <span className="text-sm font-medium">Log Out</span>}
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
