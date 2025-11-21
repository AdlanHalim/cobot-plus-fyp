"use client";

import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import DashboardLayout from "@/components/DashboardLayout";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { motion } from "framer-motion";

export default function AddStudent() {
  const [formData, setFormData] = useState({
    matricNo: "",
    fullName: "",
    nickname: "",
    email: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [image, setImage] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const supabase = createClientComponentClient();

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { matricNo, fullName, email } = formData;
    if (!matricNo || !fullName || !email) {
      setMessage("⚠️ Please fill in Matric No, Name, and Email.");
      setError(true);
      return;
    }
    setIsSubmitting(true);
    setMessage("");

    const { error: dbError } = await supabase
      .from("students")
      .insert([
        {
          id: matricNo,
          name: fullName,
          nickname: formData.nickname || null,
          matric_no: matricNo,
          email: email,
        },
      ])
      .select();

    if (dbError) {
      setMessage(dbError.message || "❌ Error saving student data.");
      setError(true);
    } else {
      setMessage("✅ Student added successfully!");
      setFormData({
        matricNo: "",
        fullName: "",
        nickname: "",
        email: "",
      });
    }
    setIsSubmitting(false);
  };

  const handleImageChange = (e) => {
    setImage(e.target.files[0]);
    setCapturedImage(null);
  };

  const captureImage = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (video && canvas) {
      const ctx = canvas.getContext("2d");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      setCapturedImage(canvas.toDataURL("image/jpeg"));
      setShowCamera(false);
    }
  };

  const redoCapture = () => {
    setCapturedImage(null);
    setShowCamera(true);
  };

  useEffect(() => {
    if (showCamera && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch((err) => alert("Camera access failed: " + err.message));
    }
    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }
    };
  }, [showCamera]);

  const handleImageUpload = async () => {
    const form = new FormData();
    const selectedImage = capturedImage || image;
    if (!selectedImage) {
      setMessage("⚠️ Please upload or capture an image first.");
      setError(true);
      return;
    }

    let file;
    if (capturedImage) {
      const byteString = atob(capturedImage.split(",")[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      file = new File([new Blob([ia], { type: "image/jpeg" })], `${formData.matricNo}.jpg`);
    } else file = image;

    form.append("image", file);

    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://192.168.252.103:5000";
      const res = await axios.post(`${BASE_URL}/upload-image`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.status === 200) {
        setMessage("✅ Image uploaded successfully!");
        setError(false);
      } else {
        setMessage(res.data.error || "❌ Upload failed.");
        setError(true);
      }
    } catch (err) {
      setMessage("❌ Failed to upload image.");
      setError(true);
    }
  };

  return (
    <DashboardLayout>
      {/* Unified gradient background matching theme */}
      <div className="flex flex-col justify-center items-center h-[calc(100vh-5rem)] bg-gradient-to-br from-indigo-50 via-sky-50 to-teal-50 overflow-hidden px-6">
        {/* Title */}
        <motion.h1
          className="text-2xl md:text-3xl font-bold mb-6 text-center bg-gradient-to-r from-indigo-600 via-sky-600 to-teal-600 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          👩‍🎓 Add New Student
        </motion.h1>

        {/* Compact Card */}
        <motion.div
          className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/60 backdrop-blur-md border border-slate-200/50 rounded-3xl shadow-lg p-6 md:p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* 🧾 Student Info */}
          <div>
            <h2 className="text-lg font-semibold mb-4 text-slate-700">
              📝 Student Information
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              {[
                { name: "matricNo", label: "Matric No", type: "text" },
                { name: "fullName", label: "Full Name", type: "text" },
                { name: "nickname", label: "Nickname", type: "text" },
                { name: "email", label: "Email", type: "email" },
              ].map((f) => (
                <div key={f.name}>
                  <label className="block text-slate-600 text-sm mb-1">
                    {f.label}
                  </label>
                  <input
                    name={f.name}
                    type={f.type}
                    value={formData[f.name]}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-400 outline-none transition"
                    required={["matricNo", "fullName", "email"].includes(f.name)}
                  />
                </div>
              ))}
              <button
                type="submit"
                className="w-full py-2 mt-2 bg-gradient-to-r from-indigo-500 to-teal-400 hover:scale-[1.02] text-white font-medium text-sm rounded-xl shadow-md transition"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Student Info"}
              </button>
            </form>

            {message && (
              <p
                className={`mt-4 text-center text-sm rounded-lg py-2 ${
                  error
                    ? "bg-rose-100 text-rose-700 border border-rose-300"
                    : "bg-emerald-100 text-emerald-700 border border-emerald-300"
                }`}
              >
                {message}
              </p>
            )}
          </div>

          {/* 📸 Image Upload */}
          <div className="flex flex-col items-center justify-start">
            <h2 className="text-lg font-semibold mb-4 text-slate-700">
              📸 Upload / Capture Image
            </h2>

            <label className="w-full text-sm text-slate-600 mb-3">
              Upload from device:
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="mt-1 block w-full text-slate-700 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 cursor-pointer"
              />
            </label>

            {!showCamera && !capturedImage && (
              <button
                onClick={() => setShowCamera(true)}
                className="w-full bg-gradient-to-r from-indigo-500 to-sky-500 text-white py-2 rounded-xl text-sm hover:scale-[1.02] transition"
              >
                Open Camera
              </button>
            )}

            {showCamera && !capturedImage && (
              <div className="mt-3 text-center">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="rounded-xl border border-slate-200 shadow-sm mx-auto"
                  style={{ width: "100%", maxWidth: "280px" }}
                />
                <canvas ref={canvasRef} className="hidden"></canvas>
                <button
                  onClick={captureImage}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded-lg text-sm mt-2"
                >
                  Capture
                </button>
              </div>
            )}

            {capturedImage && (
              <div className="mt-3 text-center">
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="rounded-xl border border-slate-200 shadow-sm mx-auto"
                  style={{ width: "100%", maxWidth: "280px" }}
                />
                <div className="flex justify-center gap-2 mt-3">
                  <button
                    onClick={redoCapture}
                    className="bg-amber-400 hover:bg-amber-500 text-white px-3 py-1 rounded-lg text-sm"
                  >
                    Retake
                  </button>
                  <button
                    onClick={handleImageUpload}
                    className="bg-sky-500 hover:bg-sky-600 text-white px-3 py-1 rounded-lg text-sm"
                  >
                    Upload
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
