"use client";
import { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import withRole from "../utils/withRole";
import { useSectionManagement } from "@/hooks";

function ManageSection() {
  // Use custom hook for data and operations
  const {
    sections,
    courses,
    lecturers,
    formData,
    editingId,
    loading,
    handleChange,
    handleSubmit,
    handleDelete,
    handleToggleVisibility,
    startEdit,
    resetForm,
  } = useSectionManagement();

  // Local UI state for search
  const [search, setSearch] = useState("");
  const [formError, setFormError] = useState("");

  // Custom submit handler with validation
  const onSubmit = (e) => {
    e.preventDefault();
    setFormError("");
    if (!formData.name || !formData.course_id || !formData.lecturer_id) {
      setFormError("Please fill in Section Name, Course, and Lecturer.");
      return;
    }
    handleSubmit(e);
  };

  // Filter sections by search
  const filteredSections = useMemo(() => {
    return sections.filter((s) => {
      const matchesSearch =
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        (s.courses?.code || "").toLowerCase().includes(search.toLowerCase()) ||
        (s.lecturers?.name || "").toLowerCase().includes(search.toLowerCase());
      return matchesSearch;
    });
  }, [sections, search]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-full py-20 text-slate-500">
          Loading section data...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <ToastContainer />
      <div className="min-h-screen p-6 text-slate-700 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manage Sections</h1>
          <p className="text-slate-500 text-sm">Create and modify course sections</p>
        </div>

        {/* Toolbar: Search + Inline Form */}
        <div className="flex flex-wrap gap-2 justify-between items-center bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <input
            type="text"
            placeholder="Search by section name, course code, or lecturer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[150px] rounded-xl px-3 py-2 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-teal-400 transition text-sm"
          />

          {/* Form Input Fields */}
          <input
            type="text"
            name="name"
            placeholder="Section Name"
            value={formData.name}
            onChange={handleChange}
            className="w-20 rounded-xl px-2 py-1 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-teal-400 text-sm transition"
          />

          <select
            name="course_id"
            value={formData.course_id}
            onChange={handleChange}
            className="w-32 rounded-xl px-2 py-1 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-teal-400 text-sm transition"
          >
            <option value="">Select Course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} - {c.name}
              </option>
            ))}
          </select>

          <select
            name="lecturer_id"
            value={formData.lecturer_id}
            onChange={handleChange}
            className="w-32 rounded-xl px-2 py-1 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-teal-400 text-sm transition"
          >
            <option value="">Select Lecturer</option>
            {lecturers.map((lec) => (
              <option key={lec.id} value={lec.id}>
                {lec.name}
              </option>
            ))}
          </select>

          <div className="flex gap-1">
            <button
              type="button"
              onClick={onSubmit}
              className="px-3 py-1 rounded-xl text-white bg-gradient-to-r from-teal-500 to-cyan-500 hover:scale-[1.03] text-sm transition"
            >
              {editingId ? "Update" : "Add"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-1 rounded-xl bg-slate-200/80 hover:bg-slate-300/80 text-sm transition"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {formError && <p className="text-red-500 text-sm">{formError}</p>}

        {/* Sections Table */}
        <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100/80 text-slate-600 uppercase tracking-wide text-xs">
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Section Name</th>
                <th className="px-3 py-2 text-left">Course Code</th>
                <th className="px-3 py-2 text-center">Lecturer</th>
                <th className="px-3 py-2 text-center">Visibility</th>
                <th className="px-3 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSections.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-slate-500 italic">
                    No sections found.
                  </td>
                </tr>
              ) : (
                filteredSections.map((s, i) => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-sky-50/60 transition text-sm">
                    <td className="px-3 py-2">{i + 1}</td>
                    <td className="px-3 py-2 font-semibold">{s.name}</td>
                    <td className="px-3 py-2">{s.courses?.code || "-"}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                        {s.lecturers?.name || "-"}
                      </span>
                    </td>

                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => handleToggleVisibility(s)}
                        title={s.is_hidden_from_analysis ? "Click to Show" : "Click to Hide"}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium transition duration-200 ${s.is_hidden_from_analysis
                          ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
                          : "bg-teal-100 text-teal-700 hover:bg-teal-200"
                          }`}
                      >
                        {s.is_hidden_from_analysis ? "Hidden 🙈" : "Visible ✅"}
                      </button>
                    </td>

                    <td className="px-3 py-2 text-center flex justify-center gap-1">
                      <button
                        onClick={() => startEdit(s)}
                        className="px-2 py-1 rounded-lg text-white bg-gradient-to-r from-yellow-500 to-amber-500 hover:scale-[1.05] text-xs transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="px-2 py-1 rounded-lg text-white bg-gradient-to-r from-red-500 to-pink-500 hover:scale-[1.05] text-xs transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}

// 🔑 Access Control: Restrict access to Admins only
export default withRole(ManageSection, ["admin"]);