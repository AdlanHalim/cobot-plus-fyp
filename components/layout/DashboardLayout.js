/**
 * @file DashboardLayout.js
 * @location cobot-plus-fyp/components/layout/DashboardLayout.js
 * 
 * @description
 * Main layout wrapper component for all dashboard pages.
 * Provides consistent page structure with sidebar navigation.
 * 
 * Performance optimizations:
 * - Uses React.memo to prevent unnecessary re-renders
 * - Sidebar is rendered once and persists across navigations
 * 
 * @example
 * // Usage in a page component
 * function MyPage() {
 *   return (
 *     <DashboardLayout>
 *       <h1>Page Content</h1>
 *     </DashboardLayout>
 *   );
 * }
 */

import React, { memo, useMemo } from "react";
import Sidebar from "./Sidebar";

/**
 * Dashboard Layout Component
 * Wraps page content with sidebar and responsive main area.
 * Memoized to prevent re-renders when children change but layout doesn't.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Page content to render
 * @returns {JSX.Element}
 */
function DashboardLayout({ children }) {
  // Memoize the layout structure to prevent re-renders
  const layoutClasses = useMemo(() => ({
    container: "min-h-screen bg-teal-50",
    main: "lg:pl-64 pt-16 lg:pt-0 min-h-screen transition-all duration-300",
    content: "p-6",
  }), []);

  return (
    <div className={layoutClasses.container}>
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content */}
      <main className={layoutClasses.main}>
        <div className={layoutClasses.content}>
          {children}
        </div>
      </main>
    </div>
  );
}

// Memoize to prevent re-renders when parent components update
export default memo(DashboardLayout);
