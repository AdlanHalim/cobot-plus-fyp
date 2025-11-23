"use client";
import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import DashboardLayout from "@/components/DashboardLayout";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import withRole from "../utils/withRole";

function ManageCourse() {
  const supabase = createClientComponentClient();
  const [courses, setCourses] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("All");
  const [sessionFilter, setSessionFilter] = useState("All");

  const [form, setForm] = useState({
    code: "",
    name: "",
    credit_hour: "",
    semester: "",
    session: "",
    lecturer_id: "",
  });

  // Fetch lecturers
  const fetchLecturers = async () => {
    const { data, error } = await supabase
      .from("lecturers")
      .select("id, name")
      .order("name");
    if (error) console.error(error);
    else setLecturers(data || []);
  };

  // Fetch courses
  const fetchCourses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("courses")
      .select(`
        id, code, name, credit_hour, semester, session, lecturer_id,
        lecturers ( name )
      `)
      .order("code");
    if (error) console.error(error);
    else setCourses(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLecturers();
    fetchCourses();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.code || !form.name) {
      setFormError("Please fill in required fields (Code, Name).");
      return;
    }

    try {
      if (isEditing) {
        const { error } = await supabase
          .from("courses")
          .update(form)
          .eq("id", editId);
        if (error) throw error;
        toast.success("✅ Course updated successfully");
      } else {
        const { error } = await supabase.from("courses").insert([form]);
        if (error) throw error;
        toast.success("✅ New course added");
      }
      resetForm();
      fetchCourses();
    } catch (error) {
      console.error(error);
      setFormError(error.message);
    }
  };

  const resetForm = () => {
    setForm({
      code: "",
      name: "",
      credit_hour: "",
      semester: "",
      session: "",
      lecturer_id: "",
    });
    setIsEditing(false);
    setEditId(null);
  };

  const startEdit = (course) => {
    setIsEditing(true);
    setEditId(course.id);
    setForm({
      code: course.code,
      name: course.name,
      credit_hour: course.credit_hour || "",
      semester: course.semester || "",
      session: course.session || "",
      lecturer_id: course.lecturer_id || "",
    });
  };

  const handleDelete = async (id) => {
    // NOTE: Replaced window.confirm() with console/prompt as alerts/confirms are not allowed.
    console.warn("ADMIN ACTION: Course deletion attempted.");
    const shouldDelete = window.prompt("Type 'DELETE' (case sensitive) to confirm you want to delete this course:");
    if (shouldDelete !== 'DELETE') {
        toast.info("Deletion cancelled.");
        return;
    }

    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) toast.error("Failed to delete course");
    else {
      toast.success("🗑️ Course deleted");
      setCourses((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.lecturers?.name || "").toLowerCase().includes(search.toLowerCase());

    const matchesSemester =
      semesterFilter === "All" || c.semester === semesterFilter;

    const matchesSession =
      sessionFilter === "All" || c.session === sessionFilter;

    return matchesSearch && matchesSemester && matchesSession;
  });

  // Unique semester and session values for filters
  const semesters = [...new Set(courses.map((c) => c.semester).filter(Boolean))];
  const sessions = [...new Set(courses.map((c) => c.session).filter(Boolean))];

  if (loading)
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-full py-20 text-slate-500">
          Loading course data...
        </div>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      <ToastContainer />
      <div className="min-h-screen p-6 bg-[#e6f0fb] text-slate-700 flex flex-col gap-6">
        <h1 className="text-3xl font-bold text-center mb-4 bg-gradient-to-r from-indigo-600 via-sky-600 to-teal-600 bg-clip-text text-transparent">
          📘 Manage Courses
        </h1>

        {/* Toolbar: Search + Filters + Inline Form */}
        <div className="flex flex-wrap gap-2 justify-between items-center bg-white/70 backdrop-blur-md border border-slate-200 rounded-xl p-3">
          <input
            type="text"
            placeholder="Search by code, name, or lecturer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[150px] rounded-xl px-3 py-2 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-teal-400 transition text-sm"
          />

          <select
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            className="w-24 rounded-xl px-2 py-1 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-indigo-400 text-sm transition"
          >
            <option value="All">Semester All</option>
            {semesters.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={sessionFilter}
            onChange={(e) => setSessionFilter(e.target.value)}
            className="w-28 rounded-xl px-2 py-1 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-indigo-400 text-sm transition"
          >
            <option value="All">Session All</option>
            {sessions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Inline Add/Edit Form */}
          <input
            type="text"
            name="code"
            placeholder="Code"
            value={form.code}
            onChange={handleChange}
            className="w-20 rounded-xl px-2 py-1 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-indigo-400 text-sm transition"
          />
          <input
            type="text"
            name="name"
            placeholder="Name"
            value={form.name}
            onChange={handleChange}
            className="w-36 rounded-xl px-2 py-1 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-indigo-400 text-sm transition"
          />
          <input
            type="number"
            name="credit_hour"
            placeholder="Credit"
            value={form.credit_hour}
            onChange={handleChange}
            className="w-16 rounded-xl px-2 py-1 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-indigo-400 text-sm transition"
          />
          <input
            type="text"
            name="semester"
            placeholder="Semester"
            value={form.semester}
            onChange={handleChange}
            className="w-20 rounded-xl px-2 py-1 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-indigo-400 text-sm transition"
          />
          <input
            type="text"
            name="session"
            placeholder="Session"
            value={form.session}
            onChange={handleChange}
            className="w-28 rounded-xl px-2 py-1 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-indigo-400 text-sm transition"
          />
          <select
            name="lecturer_id"
            value={form.lecturer_id}
            onChange={handleChange}
            className="w-32 rounded-xl px-2 py-1 bg-white/80 border border-slate-200 focus:ring-2 focus:ring-indigo-400 text-sm transition"
          >
            <option value="">Lecturer</option>
            {lecturers.map((lec) => (
              <option key={lec.id} value={lec.id}>
                {lec.name}
              </option>
            ))}
          </select>

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

        {/* Courses Table */}
        <div className="overflow-x-auto bg-white/70 backdrop-blur-md rounded-2xl shadow-md border border-slate-200 p-3">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100/80 text-slate-600 uppercase tracking-wide text-xs">
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Code</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-center">Credit</th>
                <th className="px-3 py-2 text-center">Semester</th>
                <th className="px-3 py-2 text-center">Session</th>
                <th className="px-3 py-2 text-center">Lecturer</th>
                <th className="px-3 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-4 text-slate-500 italic">
                    No courses found.
                  </td>
                </tr>
              ) : (
                filteredCourses.map((c, i) => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-100 hover:bg-sky-50/60 transition text-sm"
                  >
                    <td className="px-3 py-2">{i + 1}</td>
                    <td className="px-3 py-2 font-semibold">{c.code}</td>
                    <td className="px-3 py-2">{c.name}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                        {c.credit_hour || "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">{c.semester || "-"}</td>
                    <td className="px-3 py-2 text-center">{c.session || "-"}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                        {c.lecturers?.name || "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center flex justify-center gap-1">
                      <button
                        onClick={() => startEdit(c)}
                        className="px-2 py-1 rounded-lg text-white bg-gradient-to-r from-yellow-500 to-amber-500 hover:scale-[1.05] text-xs transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
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
export default withRole(ManageCourse, ["admin"]);