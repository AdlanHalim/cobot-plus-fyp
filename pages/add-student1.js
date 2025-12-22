"use client";

import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { motion } from "framer-motion";
import withRole from "../utils/withRole"; // Import the HOC for role access control

function AddStudent() {
  const supabase = useSupabaseClient();

  const [formData, setFormData] = useState({
    matricNo: "",
    fullName: "",
    nickname: "",
    email: "",
  });

  // Class enrollment state
  const [sections, setSections] = useState([]);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [image, setImage] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState("upload"); // 'upload' or 'camera'

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const pathInputRef = useRef(null);

  // Fetch sections on mount
  useEffect(() => {
    const fetchSections = async () => {
      const { data, error } = await supabase
        .from("sections")
        .select("id, name, courses(code, name)")
        .order("name");

      if (data) setSections(data);
      if (error) console.error("Error fetching sections:", error);
      setSectionsLoading(false);
    };
    fetchSections();
  }, [supabase]);

  // Toggle class selection
  const toggleClassSelection = (sectionId) => {
    setSelectedClasses(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  // Handle Form Change
  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // Handle Drag & Drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    setImage(file);
    setCapturedImage(null);
    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setCapturedImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImage(null);
    setCapturedImage(null);
    if (pathInputRef.current) pathInputRef.current.value = "";
  };


  // Camera Logic
  const captureImage = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (video && canvas) {
      const ctx = canvas.getContext("2d");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      // Flip horizontally for natural mirror feel if needed, but usually raw is better for recognition
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg");
      setCapturedImage(dataUrl);
      setShowCamera(false);
    }
  };

  const startCamera = () => {
    setActiveTab("camera");
    setShowCamera(true);
    setCapturedImage(null);
    setImage(null); // Clear upload if switching to camera
  };

  useEffect(() => {
    let stream = null;
    if (showCamera && activeTab === "camera" && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { width: 1280, height: 720 } })
        .then((s) => {
          stream = s;
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch((err) => {
          console.error("Camera error:", err);
          setMessage("❌ Camera access denied or unavailable.");
          setError(true);
        });
    }
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [showCamera, activeTab]);

  // Submit Logic
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { matricNo, fullName, email } = formData;

    if (!matricNo || !fullName || !email) {
      setMessage("⚠️ Please fill in all required fields.");
      setError(true);
      return;
    }

    if (!image && !capturedImage) {
      setMessage("⚠️ Please provide a photo for facial recognition.");
      setError(true);
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      // 1. Upload Image
      let fileToUpload = image;
      if (!fileToUpload && capturedImage) {
        const res = await fetch(capturedImage);
        const blob = await res.blob();
        fileToUpload = new File([blob], `${matricNo}.jpg`, { type: "image/jpeg" });
      }

      const form = new FormData();
      form.append("image", fileToUpload);

      const BASE_URL = process.env.NEXT_PUBLIC_PI_URL || "http://192.168.252.103:5000";
      // Attempt upload first to ensure recognition server is reachable
      const uploadRes = await axios.post(`${BASE_URL}/upload-image`, form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 5000
      });

      if (uploadRes.status !== 200) {
        throw new Error(uploadRes.data.error || "Image upload failed");
      }

      // 2. Save to Supabase
      const { error: dbError } = await supabase
        .from("students")
        .upsert([ // Using upsert to handle potential re-registration fixes
          {
            id: matricNo,
            name: fullName,
            nickname: formData.nickname || null,
            matric_no: matricNo,
            email: email,
          },
        ]);

      if (dbError) throw dbError;

      // 3. Auto-enroll in selected classes
      if (selectedClasses.length > 0) {
        const enrollments = selectedClasses.map(sectionId => ({
          student_id: matricNo,
          section_id: sectionId,
        }));

        const { error: enrollError } = await supabase
          .from("section_students")
          .upsert(enrollments, { onConflict: "student_id,section_id" });

        if (enrollError) {
          console.error("Enrollment error:", enrollError);
          // Don't fail the whole operation, just warn
          setMessage(`✅ Student registered! ⚠️ Some enrollments may have failed.`);
          setError(false);
        } else {
          setMessage(`✅ Student registered and enrolled in ${selectedClasses.length} class(es)!`);
          setError(false);
        }
      } else {
        setMessage("✅ Student registered successfully!");
        setError(false);
      }

      setFormData({ matricNo: "", fullName: "", nickname: "", email: "" });
      setSelectedClasses([]);
      setCapturedImage(null);
      setImage(null);
      setShowCamera(false);
      setActiveTab("upload");

    } catch (err) {
      console.error(err);
      setMessage(err.message || "❌ Registration failed. Check connection.");
      setError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col justify-center items-center py-8 px-6 min-h-[calc(100vh-5rem)]">

        {/* Header with Breadcrumb-ish feel */}
        <div className="w-full max-w-5xl mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">New Student Registration</h1>
            <p className="text-slate-500 text-sm">Create a profile and register face data</p>
          </div>
        </div>

        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* LEFT COLUMN: Student Details */}
          <motion.div
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col h-full"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
              <span className="bg-teal-100 text-teal-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">1</span>
              <h2 className="text-lg font-semibold text-slate-800">Student Details</h2>
            </div>

            <form id="student-form" onSubmit={handleSubmit} className="space-y-4 flex-1">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Matric Number <span className="text-rose-500">*</span></label>
                <input
                  name="matricNo"
                  value={formData.matricNo}
                  onChange={handleChange}
                  placeholder="e.g. A123456"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none transition"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name <span className="text-rose-500">*</span></label>
                <input
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="e.g. Ahmad Ali"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none transition"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nickname (Optional)</label>
                <input
                  name="nickname"
                  value={formData.nickname}
                  onChange={handleChange}
                  placeholder="e.g. Ali"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address <span className="text-rose-500">*</span></label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="student@example.com"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none transition"
                  required
                />
              </div>

              {/* Class Enrollment Section */}
              <div className="pt-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Enroll in Classes (Optional)
                  {selectedClasses.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-xs">
                      {selectedClasses.length} selected
                    </span>
                  )}
                </label>
                {sectionsLoading ? (
                  <div className="text-sm text-slate-500">Loading classes...</div>
                ) : sections.length === 0 ? (
                  <div className="text-sm text-slate-500 italic">No classes available</div>
                ) : (
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                    {sections.map((section) => (
                      <label
                        key={section.id}
                        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 transition ${selectedClasses.includes(section.id) ? "bg-teal-50" : ""
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedClasses.includes(section.id)}
                          onChange={() => toggleClassSelection(section.id)}
                          className="w-4 h-4 rounded border-slate-300 text-teal-500 focus:ring-teal-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800">
                            {section.courses?.code || "N/A"} - {section.name}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {section.courses?.name || ""}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </form>
          </motion.div>

          {/* RIGHT COLUMN: Face Registration */}
          <motion.div
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col h-full"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
              <span className="bg-teal-100 text-teal-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">2</span>
              <h2 className="text-lg font-semibold text-slate-800">Face Registration</h2>
            </div>

            {/* Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
              <button
                onClick={() => { setActiveTab("upload"); setShowCamera(false); }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${activeTab === "upload" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                📤 Upload Photo
              </button>
              <button
                onClick={startCamera}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${activeTab === "camera" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                📷 Use Webcam
              </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 relative overflow-hidden min-h-[300px]">

              {/* UPLOAD MODE */}
              {activeTab === "upload" && !capturedImage && (
                <div
                  className={`absolute inset-0 flex flex-col items-center justify-center p-6 text-center transition-colors ${dragActive ? "bg-teal-50 border-teal-400" : ""}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-700">Drag & Drop photo here</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">or click to browse</p>
                  <input
                    ref={pathInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              )}

              {/* CAMERA MODE */}
              {activeTab === "camera" && showCamera && !capturedImage && (
                <div className="absolute inset-0 bg-black flex flex-col items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                    <button
                      onClick={captureImage}
                      className="w-14 h-14 bg-white rounded-full border-4 border-slate-300 flex items-center justify-center hover:scale-105 transition shadow-lg"
                    >
                      <div className="w-10 h-10 bg-teal-500 rounded-full"></div>
                    </button>
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              )}

              {/* PREVIEW MODE (Shared) */}
              {capturedImage && (
                <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center">
                  <img src={capturedImage} alt="Preview" className="max-h-[80%] max-w-[90%] rounded-lg shadow-lg object-contain" />
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={clearImage}
                      className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="absolute bottom-4">
                    <span className="px-3 py-1 bg-emerald-500/90 text-white text-xs font-semibold rounded-full backdrop-blur-sm">
                      Photo Ready
                    </span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

        </div>

        {/* Global Action Bar */}
        <div className="w-full max-w-5xl mt-8">
          <button
            type="submit"
            form="student-form"
            disabled={isSubmitting}
            className="w-full sm:w-auto float-right px-8 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:scale-[1.02] text-white font-bold rounded-xl shadow-md transition disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing Registration...
              </>
            ) : (
              "Save & Register Student"
            )}
          </button>

          {/* Status Message */}
          <div className="clear-both pt-4">
            {message && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl border flex items-center gap-3 ${error ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}
              >
                <span className="text-2xl">{error ? "⚠️" : "🎉"}</span>
                <div>
                  <p className="font-semibold">{error ? "Registration Failed" : "Success!"}</p>
                  <p className="text-sm opacity-90">{message}</p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// ---------------------------------------------
// ✅ CORRECTED EXPORT STATEMENT
// ---------------------------------------------

// Define the roles allowed to access this page
const allowedRoles = ['admin', 'lecturer'];

// Export the component wrapped with the role checker HOC
export default withRole(AddStudent, allowedRoles);