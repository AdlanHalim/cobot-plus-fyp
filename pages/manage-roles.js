import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import withRole from "../utils/withRole";
import DashboardLayout from "@/components/DashboardLayout"; // Use your existing layout


const roles = ["student", "teacher", "admin"];

function ManageRoles() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState(null);

  useEffect(() => {
    async function fetchUsers() {
      // Correct join alias assumes your FK is set up from profiles.id -> auth.users.id
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          role,
          full_name,
          auth_users:auth.users(email)
        `);

      if (error) {
        console.error("Error fetching users:", error);
      } else {
        setUsers(data);
      }
      setLoading(false);
    }
    fetchUsers();
  }, []);

  const updateRole = async (userId, newRole) => {
    setUpdatingUserId(userId);
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) {
      alert("Failed to update role: " + error.message);
    } else {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    }
    setUpdatingUserId(null);
  };

  if (loading) return <p>Loading users...</p>;

  return (
    <DashboardLayout>
      <div className="manage-roles-container">
        <h1>User Role Management</h1>
        <table className="roles-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Full Name</th>
              <th>Role</th>
              <th>Change Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.auth_users?.email || "N/A"}</td>
                <td>{user.full_name || "-"}</td>
                <td>{user.role}</td>
                <td>
                  <select
                    value={user.role}
                    disabled={updatingUserId === user.id}
                    onChange={(e) => updateRole(user.id, e.target.value)}
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}

// Protect page for admins and teachers only
export default withRole(ManageRoles, ["admin", "teacher"]);
