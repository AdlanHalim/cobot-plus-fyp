"use client";
import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import DashboardLayout from "@/components/DashboardLayout";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import withRole from "../utils/withRole";

// This component now manages SECTIONS, not Courses
function ManageSection() {
  const supabase = createClientComponentClient();
  // State for all lookup data
  const [sections, setSections] = useState([]);
  const [courses, setCourses] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form and control states
  const [formError, setFormError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    name: "", // Section Name (e.g., 'A')
    course_id: "", 
    lecturer_id: "",
    is_hidden_from_analysis: false, 
  });

  // Fetch Lecturers and Courses for dropdown lookups
  const fetchLookups = async () => {
    const { data: lecData } = await supabase.from("lecturers").select("id, name").order("name");
    setLecturers(lecData || []);
    
    const { data: courseData } = await supabase.from("courses").select("id, code, name").order("code");
    setCourses(courseData || []);
  };

  // Fetch Sections
  const fetchSections = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sections")
      .select(`
        id, name, course_id, lecturer_id, is_hidden_from_analysis,
        courses ( code ),
        lecturers ( name )
      `)
      .order("name");
      
    if (error) console.error(error);
    else setSections(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLookups();
    fetchSections();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.name || !form.course_id || !form.lecturer_id) {
      setFormError("Please fill in Section Name, Course, and Lecturer.");
      return;
    }

    try {
      if (isEditing) {
        const { error } = await supabase
          .from("sections")
          .update(form)
          .eq("id", editId);
        if (error) throw error;
        toast.success("✅ Section updated successfully");
      } else {
        const { error } = await supabase.from("sections").insert([form]);
        if (error) throw error;
        toast.success("✅ New section added");
      }
      resetForm();
      fetchSections();
    } catch (error) {
      console.error(error);
      setFormError(error.message);
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      course_id: "",
      lecturer_id: "",
      is_hidden_from_analysis: false,
    });
    setIsEditing(false);
    setEditId(null);
  };

  const startEdit = (section) => {
    setIsEditing(true);
    setEditId(section.id);
    setForm({
      name: section.name,
      course_id: section.course_id || "",
      lecturer_id: section.lecturer_id || "",
      is_hidden_from_analysis: section.is_hidden_from_analysis || false,
    });
  };

  const handleDelete = async (id) => {
    console.warn("ADMIN ACTION: Section deletion attempted.");
    const shouldDelete = window.prompt("Type 'DELETE' (case sensitive) to confirm you want to delete this section:");
    if (shouldDelete !== 'DELETE') {
        toast.info("Deletion cancelled.");
        return;
    }

    const { error } = await supabase.from("sections").delete().eq("id", id);
    if (error) toast.error("❌ Failed to delete section");
    else {
      toast.success("🗑️ Section deleted");
      setSections((prev) => prev.filter((s) => s.id !== id));
    }
  };
  
  // Toggle Visibility function for the table row
  const handleToggleVisibility = async (section) => {
    const newState = !section.is_hidden_from_analysis;
    
    const { error } = await supabase
        .from("sections")
        .update({ is_hidden_from_analysis: newState })
        .eq("id", section.id);
        
    if (error) {
        toast.error("Failed to update visibility");
        console.error(error);
    } else {
        toast.success(newState ? "🙈 Section hidden from Analysis filter" : "✅ Section visible in Analysis filter");
        // Optimistically update the local state
        setSections(prev => prev.map(s => 
            s.id === section.id ? { ...s, is_hidden_from_analysis: newState } : s
        ));
    }
  };


  const filteredSections = sections.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.courses?.code || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.lecturers?.name || "").toLowerCase().includes(search.toLowerCase());

    // You can add more filters here if needed
    return matchesSearch;
  });

  if (loading)
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-full py-20 text-slate-500">
          Loading section data...
        </div>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      <ToastContainer />
      <div className="min-h-screen p-6 bg-[#e6f0fb] text-slate-700 flex flex-col gap-6">
        <h1 className="text-3xl font-bold text-center mb-4 bg-gradient-to-r from-indigo-600 via-sky-600 to-teal-600 bg-clip-text text-transparent">
          📚 Manage Sections
        </h1>

        {/* Toolbar: Search + Inline Form */}
        <div className="flex flex-wrap gap-2 justify-between items-center bg-white/70 backdrop-blur-md border border-slate-200 rounded-xl p-3">
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
            value={form.name}
            onChange={handleChange}
            className="w-20 rounded-xl px-2 py-1 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-indigo-400 text-sm transition"
          />

          <select
            name="course_id"
            value={form.course_id}
            onChange={handleChange}
            className="w-32 rounded-xl px-2 py-1 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-indigo-400 text-sm transition"
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
            value={form.lecturer_id}
            onChange={handleChange}
            className="w-32 rounded-xl px-2 py-1 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-indigo-400 text-sm transition"
          >
            <option value="">Select Lecturer</option>
            {lecturers.map((lec) => (
              <option key={lec.id} value={lec.id}>
                {lec.name}
              </option>
            ))}
          </select>
          
          {/* Visibility Checkbox in Form */}
          <div className="flex items-center space-x-1.5 min-w-[100px]">
            <input
                type="checkbox"
                name="is_hidden_from_analysis"
                checked={form.is_hidden_from_analysis}
                onChange={handleChange}
                id="hide-checkbox"
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="hide-checkbox" className="text-xs text-slate-600">
                Hide from Analysis
            </label>
          </div>
          

          <div className="flex gap-1">
            <button
              type="button"
              onClick={handleSubmit}
              className="px-3 py-1 rounded-xl text-white bg-gradient-to-r from-teal-500 to-indigo-500 hover:scale-[1.03] text-sm transition"
            >
              {isEditing ? "Update" : "Add"}
            </button>
            {isEditing && (
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
        <div className="overflow-x-auto bg-white/70 backdrop-blur-md rounded-2xl shadow-md border border-slate-200 p-3">
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
                  <tr
                    key={s.id}
                    className="border-b border-slate-100 hover:bg-sky-50/60 transition text-sm"
                  >
                    <td className="px-3 py-2">{i + 1}</td>
                    <td className="px-3 py-2 font-semibold">{s.name}</td>
                    <td className="px-3 py-2">{s.courses?.code || "-"}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                        {s.lecturers?.name || "-"}
                      </span>
                    </td>
                    
                    {/* Visibility Toggle Column */}
                    <td className="px-3 py-2 text-center">
                        <button
                            onClick={() => handleToggleVisibility(s)}
                            title={s.is_hidden_from_analysis ? "Click to Show" : "Click to Hide"}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium transition duration-200 ${
                                s.is_hidden_from_analysis 
                                    ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' 
                                    : 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                            }`}
                        >
                            {s.is_hidden_from_analysis ? 'Hidden 🙈' : 'Visible ✅'}
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