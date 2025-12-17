/**
 * @file DashboardLayout.js
 * @location cobot-plus-fyp/components/layout/DashboardLayout.js
 * 
 * @description
 * Main layout wrapper component for all dashboard pages.
 * Provides consistent page structure with sidebar navigation.
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

import Sidebar from "./Sidebar";

/**
 * Dashboard Layout Component
 * Wraps page content with sidebar and responsive main area.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Page content to render
 * @returns {JSX.Element}
 */
export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-teal-50">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content */}
      <main className="lg:pl-64 pt-16 lg:pt-0 min-h-screen transition-all duration-300">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
