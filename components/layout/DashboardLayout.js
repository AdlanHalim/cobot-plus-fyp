// components/layout/DashboardLayout.js
import Sidebar from "./Sidebar";

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
