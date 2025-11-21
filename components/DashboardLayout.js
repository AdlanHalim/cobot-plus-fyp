// components/ui/DashboardLayout.js
import Navbar from "./NavBar";

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col font-inter bg-gradient-to-br from-indigo-50 via-cyan-50 to-teal-50 text-gray-800 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 dark:text-gray-100 transition-colors duration-500">
      {/* Navbar */}
      <Navbar />

      {/* Page Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 mt-24 bg-indigo/80 dark:bg-slate-800/70 backdrop-blur-md rounded-3xl shadow-lg ring-1 ring-slate-200/50 dark:ring-slate-700/50">
        {children}
      </main>


    </div>
  );
}
