"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Settings as SettingsIcon, Save, RotateCcw, Wifi, WifiOff } from "lucide-react";
import withRole from "../utils/withRole";

const DEFAULT_PI_URL = "http://192.168.252.103:5000";

function Settings() {
    const [piUrl, setPiUrl] = useState("");
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState(null); // null, 'online', 'offline'
    const [isSaving, setIsSaving] = useState(false);

    // Load saved settings on mount
    useEffect(() => {
        const savedUrl = localStorage.getItem("cobot_pi_url") || DEFAULT_PI_URL;
        setPiUrl(savedUrl);
    }, []);

    // Test connection to Pi
    const handleTestConnection = async () => {
        setIsTestingConnection(true);
        setConnectionStatus(null);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`${piUrl}/api/health`, {
                method: "GET",
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                setConnectionStatus("online");
                toast.success("✓ Connection successful!");
            } else {
                setConnectionStatus("offline");
                toast.error("Connection failed - Server responded with error");
            }
        } catch (error) {
            setConnectionStatus("offline");
            if (error.name === "AbortError") {
                toast.error("Connection timed out after 5 seconds");
            } else {
                toast.error("Connection failed - Unable to reach server");
            }
        } finally {
            setIsTestingConnection(false);
        }
    };

    // Save settings
    const handleSave = () => {
        setIsSaving(true);

        // Validate URL format
        try {
            new URL(piUrl);
        } catch {
            toast.error("Invalid URL format");
            setIsSaving(false);
            return;
        }

        // Save to localStorage
        localStorage.setItem("cobot_pi_url", piUrl);

        // Also update environment variable for current session
        if (typeof window !== "undefined") {
            window.__COBOT_PI_URL__ = piUrl;
        }

        toast.success("Settings saved! Reload the page to apply changes.");
        setIsSaving(false);
    };

    // Reset to default
    const handleReset = () => {
        setPiUrl(DEFAULT_PI_URL);
        localStorage.setItem("cobot_pi_url", DEFAULT_PI_URL);
        setConnectionStatus(null);
        toast.info("Reset to default settings");
    };

    return (
        <DashboardLayout>
            <ToastContainer />
            <div className="min-h-screen p-8">
                <motion.div
                    className="max-w-2xl mx-auto"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <SettingsIcon className="w-6 h-6 text-teal-600" />
                            System Settings
                        </h1>
                        <p className="text-slate-500 text-sm ml-8">Configure connection and preferences</p>
                    </div>

                    {/* PI Connection Settings */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                📡 Raspberry Pi Connection
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Pi Backend URL
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={piUrl}
                                            onChange={(e) => setPiUrl(e.target.value)}
                                            placeholder="http://192.168.x.x:5000"
                                            className="flex-1 px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-400 focus:outline-none"
                                        />
                                        <button
                                            onClick={handleTestConnection}
                                            disabled={isTestingConnection}
                                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {isTestingConnection ? (
                                                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                            ) : connectionStatus === "online" ? (
                                                <Wifi className="w-4 h-4 text-emerald-500" />
                                            ) : connectionStatus === "offline" ? (
                                                <WifiOff className="w-4 h-4 text-rose-500" />
                                            ) : (
                                                <Wifi className="w-4 h-4" />
                                            )}
                                            Test
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">
                                        Enter the IP address and port of your Raspberry Pi running the face recognition backend.
                                    </p>
                                </div>

                                {connectionStatus && (
                                    <div
                                        className={`p-3 rounded-lg text-sm ${connectionStatus === "online"
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                            : "bg-rose-50 text-rose-700 border border-rose-200"
                                            }`}
                                    >
                                        {connectionStatus === "online" ? (
                                            <span>✓ Connected to Raspberry Pi successfully</span>
                                        ) : (
                                            <span>✗ Unable to connect. Check if the Pi is running and on the same network.</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <hr className="border-slate-200" />

                        {/* Recognition Settings (Future) */}
                        <div className="opacity-50">
                            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                🎯 Recognition Settings
                                <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full">Coming Soon</span>
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Recognition Threshold
                                    </label>
                                    <input
                                        type="range"
                                        min="0.4"
                                        max="0.9"
                                        step="0.05"
                                        defaultValue="0.6"
                                        disabled
                                        className="w-full"
                                    />
                                    <div className="flex justify-between text-xs text-slate-500">
                                        <span>More Lenient</span>
                                        <span>More Strict</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr className="border-slate-200" />

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={handleReset}
                                className="px-4 py-2 flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                            >
                                <RotateCcw className="w-4 h-4" />
                                Reset to Default
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-6 py-2 flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl hover:scale-[1.02] transition disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                Save Settings
                            </button>
                        </div>
                    </div>

                    {/* System Info */}
                    <div className="mt-6 text-center text-sm text-slate-500">
                        <p>CObot+ Attendance System v1.0</p>
                        <p className="text-xs">Settings are stored locally in your browser.</p>
                    </div>
                </motion.div>
            </div>
        </DashboardLayout>
    );
}

export default withRole(Settings, ["admin"]);
