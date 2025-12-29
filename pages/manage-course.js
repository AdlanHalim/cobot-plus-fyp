"use client";
/**
 * @file manage-course.js
 * @location cobot-plus-fyp/pages/manage-course.js
 * 
 * @description
 * Unified Course Management Hub with tabbed interface.
 * Allows admins to manage classes, schedules, lecturers, and enrollments.
 * 
 * A "Class" = Course + Section combined (e.g., "INFO3001 - Information Privacy - Section 1")
 * 
 * Features:
 * - Multi-tab layout for different management areas
 * - Custom IDs for classes
 * - CSV bulk enrollment with validation
 * - Consistent design with existing pages
 */

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import withRole from "../utils/withRole";
import dynamic from "next/dynamic";
import {
  BookOpen,
  Calendar,
  Users,
  UserPlus,
  Upload
} from "lucide-react";

// Dynamically import tab components for code splitting
const ClassesTab = dynamic(() => import("@/components/manage/ClassesTab"), {
  loading: () => <TabLoading />,
});
const SchedulesTab = dynamic(() => import("@/components/manage/SchedulesTab"), {
  loading: () => <TabLoading />,
});
const LecturersTab = dynamic(() => import("@/components/manage/LecturersTab"), {
  loading: () => <TabLoading />,
});
const EnrollmentsTab = dynamic(() => import("@/components/manage/EnrollmentsTab"), {
  loading: () => <TabLoading />,
});
const ImportTab = dynamic(() => import("@/components/manage/ImportTab"), {
  loading: () => <TabLoading />,
});

// Loading placeholder for tabs
function TabLoading() {
  return (
    <div className="flex justify-center items-center py-12 text-slate-500">
      <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mr-2" />
      Loading...
    </div>
  );
}

// Tab configuration
const TABS = [
  { id: "classes", label: "Classes", icon: BookOpen },
  { id: "schedules", label: "Schedules", icon: Calendar },
  { id: "lecturers", label: "Lecturers", icon: Users },
  { id: "enrollments", label: "Enrollments", icon: UserPlus },
  { id: "import", label: "Import", icon: Upload },
];

function ManageCourse() {
  const [activeTab, setActiveTab] = useState("classes");

  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case "classes":
        return <ClassesTab />;
      case "schedules":
        return <SchedulesTab />;
      case "lecturers":
        return <LecturersTab />;
      case "enrollments":
        return <EnrollmentsTab />;
      case "import":
        return <ImportTab />;
      default:
        return <ClassesTab />;
    }
  };

  return (
    <DashboardLayout>
      <ToastContainer />
      <div className="min-h-screen p-6 text-slate-700 flex flex-col gap-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Course Management Hub</h1>
          <p className="text-slate-500 text-sm">
            Manage classes, schedules, lecturers, and student enrollments
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-100">
          <div className="flex flex-wrap gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                    ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md"
                    : "text-slate-600 hover:bg-slate-100"
                    }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-500"}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1">
          {renderTabContent()}
        </div>
      </div>
    </DashboardLayout>
  );
}

// 🔑 Access Control: Restrict access to Admins only
export default withRole(ManageCourse, ["admin"]);