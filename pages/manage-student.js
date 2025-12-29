"use client";
import { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ReactModal from "react-modal";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import withRole from "../utils/withRole";
import { useStudentManagement } from "@/hooks";

ReactModal.setAppElement("#__next");

function ManageStudent() {
  // Use custom hook for data and operations
  const {
    students,
    courses,
    sections,
    loading,
    selectedStudent,
    studentEnrollments,
    isModalOpen,
    openManageCourses,
    closeModal,
    toggleEnrollment,
    saveEnrollments,
  } = useStudentManagement();

  // Local UI state for filtering and pagination
  const [selectedCourse, setSelectedCourse] = useState("All");
  const [selectedSection, setSelectedSection] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Filter students based on UI selections
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesCourse =
        selectedCourse === "All" ||
        student.student_section_enrollments?.some(
          (enroll) => enroll.sections?.courses?.code === selectedCourse
        );
      const matchesSection =
        selectedSection === "All" ||
        student.student_section_enrollments?.some(
          (enroll) => enroll.sections?.id === selectedSection
        );
      const matchesSearch = student.name?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCourse && matchesSection && matchesSearch;
    });
  }, [students, selectedCourse, selectedSection, searchQuery]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const currentStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const modalStyles = {
    content: {
      width: "650px",
      maxHeight: "80vh",
      overflowY: "auto",
      margin: "auto",
      borderRadius: "20px",
      padding: "24px",
      background: "rgba(255,255,255,0.85)",
      backdropFilter: "blur(14px)",
      border: "1px solid rgba(255,255,255,0.25)",
      boxShadow: "0 8px 25px rgba(0,0,0,0.1)",
    },
    overlay: {
      backgroundColor: "rgba(0, 0, 0, 0.45)",
    },
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-full py-20 text-slate-500">
          Loading student data...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <ToastContainer />
      <div className="min-h-screen p-8 text-slate-700 flex flex-col">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Student Enrollments</h1>
          <p className="text-slate-500 text-sm">Manage student course registrations</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
          <div className="flex gap-3">
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="rounded-xl px-3 py-2 bg-white/70 backdrop-blur-md border border-slate-200 focus:ring-2 focus:ring-teal-400 transition"
            >
              <option value="All">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.code}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>

            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="rounded-xl px-3 py-2 bg-white/70 backdrop-blur-md border border-slate-200 focus:ring-2 focus:ring-teal-400 transition"
            >
              <option value="All">All Sections</option>
              {sections
                .filter((s) => selectedCourse === "All" || s.course_id === courses.find((c) => c.code === selectedCourse)?.id)
                .map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
            </select>
          </div>

          <input
            type="text"
            placeholder="Search student name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-xl px-3 py-2 bg-white/70 backdrop-blur-md border border-slate-200 w-64 focus:ring-2 focus:ring-teal-400 transition"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-slate-100">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100/80 text-slate-600 text-xs uppercase tracking-wide">
                <th className="text-left px-3 py-2">Matric No</th>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Email</th>
                <th className="text-left px-3 py-2">Sections</th>
                <th className="text-center px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentStudents.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-6 text-slate-500 italic">
                    No students found.
                  </td>
                </tr>
              ) : (
                currentStudents.map((s) => {
                  const sectionText = s.student_section_enrollments
                    ?.map((enroll) => `${enroll.sections?.courses?.code}-${enroll.sections?.name}`)
                    .join(", ");
                  return (
                    <tr key={s.id} className="border-b border-slate-100 hover:bg-sky-50/60 transition">
                      <td className="px-3 py-2 font-semibold">{s.matric_no}</td>
                      <td className="px-3 py-2">{s.name}</td>
                      <td className="px-3 py-2 text-slate-500">{s.email}</td>
                      <td className="px-3 py-2">
                        {sectionText ? (
                          <span className="text-slate-600" title={sectionText}>
                            {s.student_section_enrollments?.length} section(s)
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No section</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => openManageCourses(s)}
                          className="p-2 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:opacity-90 hover:scale-[1.05] transition"
                          title="Manage Enrollments"
                        >
                          <Cog6ToothIcon className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <button
              className="px-3 py-1 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg hover:opacity-90 disabled:opacity-40"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Prev
            </button>
            <span className="text-sm text-slate-600">
              Page <b>{currentPage}</b> of {totalPages}
            </span>
            <button
              className="px-3 py-1 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg hover:opacity-90 disabled:opacity-40"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}

        {/* Modal */}
        <ReactModal isOpen={isModalOpen} onRequestClose={closeModal} style={modalStyles}>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-teal-500 to-cyan-500 bg-clip-text text-transparent">
              Manage Courses
            </h2>
            <p className="text-slate-600 mt-1">{selectedStudent?.name}</p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {courses.map((course) => {
              const relatedSections = sections.filter((s) => s.course_id === course.id);
              return (
                <div key={course.id} className="bg-white/60 backdrop-blur-md rounded-xl border border-slate-200 p-3 shadow-sm">
                  <h3 className="font-semibold text-teal-600 text-sm mb-2">
                    {course.code} - {course.name}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {relatedSections.map((sec) => (
                      <label
                        key={sec.id}
                        className={`px-2 py-1 rounded-full text-xs cursor-pointer border ${studentEnrollments.includes(sec.id)
                          ? "bg-teal-500 text-white border-teal-500"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                          } transition`}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={studentEnrollments.includes(sec.id)}
                          onChange={() => toggleEnrollment(sec.id)}
                        />
                        {sec.name}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={saveEnrollments}
              className="px-4 py-2 rounded-lg text-white bg-gradient-to-r from-teal-500 to-cyan-500 hover:scale-[1.03] transition"
            >
              Save
            </button>
            <button
              onClick={closeModal}
              className="px-4 py-2 rounded-lg bg-slate-200/70 hover:bg-slate-300/80 transition"
            >
              Cancel
            </button>
          </div>
        </ReactModal>
      </div>
    </DashboardLayout>
  );
}

export default withRole(ManageStudent, ["admin"]);