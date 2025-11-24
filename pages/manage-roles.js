"use client";
import React, { useState, useEffect } from "react";
// ✅ CORRECTED PATH: Removed one '..' level
import DashboardLayout from "../components/DashboardLayout"; 
// External dependencies
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"; 
import { toast, ToastContainer } from "react-toastify";
import withRole from "../utils/withRole"; 
import ReactModal from "react-modal";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";

// Set the app element for ReactModal
if (typeof window !== 'undefined') {
  ReactModal.setAppElement('body');
}

// Helper component for displaying roles (defined here for single-file presentation)
const RoleBadge = ({ role }) => {
  const baseClasses = "px-3 py-1 text-xs font-semibold rounded-full";
  switch (role) {
    case 'admin':
      return <span className={`${baseClasses} bg-rose-100 text-rose-700`}>Admin</span>;
    case 'lecturer':
      return <span className={`${baseClasses} bg-indigo-100 text-indigo-700`}>Lecturer</span>;
    case 'student':
    default:
      return <span className={`${baseClasses} bg-teal-100 text-teal-700`}>Student</span>;
  }
};

function ManageUsers() {
  const supabase = createClientComponentClient();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    // Fetch all profiles, sorted by role then name
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .order("role", { ascending: false })
      .order("full_name", { ascending: true });

    if (error) {
      toast.error("Failed to load user profiles.");
      console.error(error);
    } else {
      setProfiles(data || []);
    }
    setLoading(false);
  };

  const openEditModal = (profile) => {
    setSelectedProfile(profile);
    setNewRole(profile.role);
    setIsModalOpen(true);
  };

  const handleRoleUpdate = async () => {
    if (!selectedProfile || !newRole || newRole === selectedProfile.role) {
      setIsModalOpen(false);
      return;
    }

    setIsUpdating(true);
    
    // Update the role in the profiles table
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", selectedProfile.id);

    if (error) {
      toast.error("❌ Failed to update role: " + error.message);
      console.error(error);
    } else {
      toast.success(`✅ Role for ${selectedProfile.full_name || selectedProfile.id} updated to ${newRole}.`);
      fetchProfiles(); // Refresh the list
      setIsModalOpen(false);
    }
    setIsUpdating(false);
  };

  const modalStyles = {
    content: {
      width: "450px",
      height: "350px",
      margin: "auto",
      borderRadius: "16px",
      padding: "30px",
      background: "rgba(255,255,255,0.9)",
      backdropFilter: "blur(10px)",
      border: "1px solid #e2e8f0",
      boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
    },
    overlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.45)'
    }
  };

  if (loading)
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-full py-20 text-slate-500">
          Loading user profiles...
        </div>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      <ToastContainer />
      <div className="min-h-screen p-8 bg-[#e6f0fb] text-slate-700 flex flex-col">
        <h1 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-indigo-600 via-sky-600 to-teal-600 bg-clip-text text-transparent">
          ⚙️ Admin Role Management
        </h1>

        <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100/80 text-slate-600 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">Full Name</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-center px-4 py-3">Current Role</th>
                <th className="text-center px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {profiles.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-6 text-slate-500 italic">
                    No users registered.
                  </td>
                </tr>
              ) : (
                profiles.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-sky-50/60 transition">
                    <td className="px-4 py-3 font-medium">{p.full_name || "N/A"}</td>
                    <td className="px-4 py-3 text-slate-500">{p.email}</td>
                    <td className="px-4 py-3 text-center">
                      <RoleBadge role={p.role} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openEditModal(p)}
                        className="p-2 rounded-full bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500 hover:text-white transition"
                        title="Edit Role"
                      >
                        <Cog6ToothIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Role Edit Modal */}
      {selectedProfile && (
        <RoleEditModal
            isOpen={isModalOpen}
            onRequestClose={() => setIsModalOpen(false)}
            profile={selectedProfile}
            newRole={newRole}
            setNewRole={setNewRole}
            handleRoleUpdate={handleRoleUpdate}
            isUpdating={isUpdating}
            styles={modalStyles}
        />
      )}

    </DashboardLayout>
  );
}

// Separate component for the modal content
const RoleEditModal = ({ isOpen, onRequestClose, profile, newRole, setNewRole, handleRoleUpdate, isUpdating, styles }) => (
    <ReactModal
        isOpen={isOpen}
        onRequestClose={onRequestClose}
        style={styles}
    >
        <h2 className="text-xl font-bold mb-4 text-slate-800">Edit Role for {profile.full_name}</h2>
        <p className="text-sm text-slate-600 mb-6">Current Role: <RoleBadge role={profile.role} /></p>

        <div className="mb-8">
            <label htmlFor="role-select" className="block text-sm font-medium text-slate-700 mb-2">
                Select New Role
            </label>
            <select
                id="role-select"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white shadow-sm focus:ring-sky-500 focus:border-sky-500"
            >
                <option value="student">Student</option>
                <option value="lecturer">Lecturer</option>
                <option value="admin">Admin</option>
            </select>
        </div>

        <div className="flex justify-end gap-3">
            <button
                onClick={onRequestClose}
                className="px-4 py-2 rounded-lg bg-slate-200/70 hover:bg-slate-300/80 transition text-sm"
                disabled={isUpdating}
            >
                Cancel
            </button>
            <button
                onClick={handleRoleUpdate}
                className="px-4 py-2 rounded-lg text-white font-medium bg-gradient-to-r from-teal-500 to-indigo-500 hover:scale-[1.03] transition text-sm disabled:opacity-50"
                disabled={isUpdating}
            >
                {isUpdating ? "Saving..." : "Update Role"}
            </button>
        </div>
    </ReactModal>
);


// 🔑 Access Control: Restrict access to Admins only
export default withRole(ManageUsers, ["admin"]);