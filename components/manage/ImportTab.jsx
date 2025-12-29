/**
 * @file ImportTab.jsx
 * @location cobot-plus-fyp/components/manage/ImportTab.jsx
 * 
 * @description
 * Tab component for importing KICT course schedule data.
 * Supports: Fetch from IIUM URL or paste schedule text.
 * Features: venue filtering, bulk import.
 */

import { useState, useMemo, useCallback } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { toast } from "react-toastify";
import { Upload, Filter, Check, X, RefreshCw, Link, FileText } from "lucide-react";

export default function ImportTab() {
    const supabase = useSupabaseClient();

    const [inputMode, setInputMode] = useState("url"); // "url" or "paste"
    const [urlInput, setUrlInput] = useState("https://myapps.iium.edu.my/StudentOnline/schedule1.php?action=view&view=50&kuly=KICT&tot_pages=5&ctype=%3C&course=&sem=1&ses=2025/2026");
    const [rawInput, setRawInput] = useState("");
    const [parsedData, setParsedData] = useState([]);
    const [venues, setVenues] = useState([]);
    const [selectedVenues, setSelectedVenues] = useState(new Set());
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [importing, setImporting] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [parseError, setParseError] = useState("");

    // Parse time string like "8.30 - 9.50 AM" to 24hr format
    const parseTime = (timeStr) => {
        if (!timeStr || timeStr === "-") return { start: null, end: null };

        const match = timeStr.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)\s*(AM|PM)/i);
        if (!match) return { start: null, end: null };

        const [, startRaw, endRaw, period] = match;
        const isPM = period.toUpperCase() === "PM";

        const convertTo24Hr = (timeVal, isPM) => {
            let [hours, minutes] = timeVal.includes(".")
                ? timeVal.split(".").map(Number)
                : [Number(timeVal), 0];

            if (isPM && hours !== 12) hours += 12;
            if (!isPM && hours === 12) hours = 0;

            return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
        };

        let startIsPM = isPM;
        const startHour = parseFloat(startRaw);
        const endHour = parseFloat(endRaw);

        if (startHour > endHour && isPM) {
            startIsPM = false;
        }

        return {
            start: convertTo24Hr(startRaw, startIsPM),
            end: convertTo24Hr(endRaw, isPM),
        };
    };

    // Map day abbreviations to full names
    const mapDays = (dayStr) => {
        if (!dayStr) return [];
        const d = dayStr.toUpperCase().trim();

        if (d === "M-W") return ["Monday", "Wednesday"];
        if (d === "T-TH") return ["Tuesday", "Thursday"];
        if (d === "M-W-F") return ["Monday", "Wednesday", "Friday"];
        if (d === "MON" || d === "M") return ["Monday"];
        if (d === "TUE" || d === "T") return ["Tuesday"];
        if (d === "WED" || d === "W") return ["Wednesday"];
        if (d === "THUR" || d === "THU" || d === "TH") return ["Thursday"];
        if (d === "FRI" || d === "F") return ["Friday"];
        if (d === "SAT") return ["Saturday"];
        if (d === "SUN") return ["Sunday"];

        return [d];
    };

    // Parse HTML table from fetched URL content
    const parseHtmlTable = (html) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        // Find the schedule table (contains "Code" and "Sect")
        const tables = doc.querySelectorAll("table");
        let scheduleTable = null;
        for (const table of tables) {
            if (table.innerText.includes("Code") && table.innerText.includes("Sect")) {
                scheduleTable = table;
                break;
            }
        }

        if (!scheduleTable) {
            throw new Error("Could not find schedule table in the HTML");
        }

        const parsed = [];
        const rows = scheduleTable.querySelectorAll("tr");

        // Skip header rows (first 2 rows typically)
        for (let i = 2; i < rows.length; i++) {
            const row = rows[i];
            const cells = row.querySelectorAll("td");

            if (cells.length < 5) continue;

            const code = cells[0]?.innerText?.trim();
            const section = cells[1]?.innerText?.trim();
            const title = cells[2]?.innerText?.trim();
            const creditHour = parseInt(cells[3]?.innerText?.trim()) || 3;

            // Skip if not a valid course row
            if (!code || !/^[A-Z]{2,4}\s?\d{4}$/i.test(code)) continue;

            // The 5th cell contains a nested table with schedule info
            const nestedTable = cells[4]?.querySelector("table");

            if (nestedTable) {
                const scheduleRows = nestedTable.querySelectorAll("tr");
                let primaryLecturer = "";

                for (const scheduleRow of scheduleRows) {
                    const scheduleCells = scheduleRow.querySelectorAll("td");
                    if (scheduleCells.length < 4) continue;

                    const dayStr = scheduleCells[0]?.innerText?.trim();
                    const timeStr = scheduleCells[1]?.innerText?.trim();
                    const venue = scheduleCells[2]?.innerText?.trim() || "";
                    const lecturer = scheduleCells[3]?.innerText?.trim() || "";

                    if (lecturer) primaryLecturer = lecturer;

                    const days = mapDays(dayStr);
                    const { start, end } = parseTime(timeStr);

                    if (!start || days.length === 0) continue;

                    for (const day of days) {
                        parsed.push({
                            code: code.replace(/\s+/g, " "),
                            section,
                            title,
                            creditHour,
                            days: [day],
                            startTime: start,
                            endTime: end,
                            venue: venue !== "-" ? venue : "",
                            lecturer: lecturer || primaryLecturer,
                        });
                    }
                }
            }
        }

        return parsed;
    };

    // Parse pasted text (tab-separated format)
    const parseText = (text) => {
        const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
        const parsed = [];
        let currentCourse = null;

        for (const line of lines) {
            // Skip headers
            if (line.startsWith("Code") || line.includes("PREV") || line.includes("NEXT") ||
                line.includes("INTERNATIONAL") || line.startsWith("Day")) {
                continue;
            }

            // Split by tabs
            const parts = line.split(/\t+/).map(p => p.trim()).filter(Boolean);

            // Check if course header (Code, Section, Title, Credit)
            if (parts.length >= 4 && /^[A-Z]{2,4}\s?\d{4}$/i.test(parts[0]) && /^\d+$/.test(parts[1])) {
                // Save previous course
                if (currentCourse && currentCourse.schedules.length > 0) {
                    const primaryLecturer = currentCourse.schedules.find(s => s.lecturer)?.lecturer || "";
                    for (const sch of currentCourse.schedules) {
                        for (const day of sch.days) {
                            parsed.push({
                                code: currentCourse.code,
                                section: currentCourse.section,
                                title: currentCourse.title,
                                creditHour: currentCourse.creditHour,
                                days: [day],
                                startTime: sch.startTime,
                                endTime: sch.endTime,
                                venue: sch.venue,
                                lecturer: sch.lecturer || primaryLecturer,
                            });
                        }
                    }
                }

                currentCourse = {
                    code: parts[0],
                    section: parts[1],
                    title: parts.slice(2, -1).join(" "),
                    creditHour: parseInt(parts[parts.length - 1]) || 3,
                    schedules: [],
                };
                continue;
            }

            // Check if schedule line
            const dayPatterns = ["M-W", "T-TH", "M-W-F", "MON", "TUE", "WED", "THUR", "THU", "FRI", "SAT", "SUN", "M", "T", "W", "F"];
            if (parts.length >= 2 && currentCourse && dayPatterns.includes(parts[0].toUpperCase())) {
                const timeIdx = parts.findIndex(p => /AM|PM/i.test(p));
                if (timeIdx > 0) {
                    const { start, end } = parseTime(parts[timeIdx]);
                    currentCourse.schedules.push({
                        days: mapDays(parts[0]),
                        startTime: start,
                        endTime: end,
                        venue: parts[timeIdx + 1] || "",
                        lecturer: parts[timeIdx + 2] || "",
                    });
                }
            }
        }

        // Don't forget last course
        if (currentCourse && currentCourse.schedules.length > 0) {
            const primaryLecturer = currentCourse.schedules.find(s => s.lecturer)?.lecturer || "";
            for (const sch of currentCourse.schedules) {
                for (const day of sch.days) {
                    parsed.push({
                        code: currentCourse.code,
                        section: currentCourse.section,
                        title: currentCourse.title,
                        creditHour: currentCourse.creditHour,
                        days: [day],
                        startTime: sch.startTime,
                        endTime: sch.endTime,
                        venue: sch.venue,
                        lecturer: sch.lecturer || primaryLecturer,
                    });
                }
            }
        }

        return parsed;
    };

    // Fetch and parse from URL
    const handleFetchUrl = async () => {
        if (!urlInput.trim()) {
            setParseError("Please enter a URL.");
            return;
        }

        setFetching(true);
        setParseError("");
        setParsedData([]);

        try {
            // Use server-side proxy to bypass CORS
            const response = await fetch("/api/fetch-schedule", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: urlInput }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to fetch URL");

            const parsed = parseHtmlTable(data.html);

            if (parsed.length === 0) {
                setParseError("No courses found. The page structure may have changed.");
                return;
            }

            // Deduplicate
            const seen = new Set();
            const deduped = parsed.filter(p => {
                const key = `${p.code}-${p.section}-${p.days[0]}-${p.startTime}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });

            const uniqueVenues = [...new Set(deduped.map(c => c.venue).filter(v => v))];
            setVenues(uniqueVenues.sort());
            setSelectedVenues(new Set(uniqueVenues));
            setParsedData(deduped);
            setSelectedRows(new Set(deduped.map((_, i) => i)));

            toast.success(`Fetched ${deduped.length} schedule entries from ${uniqueVenues.length} venues!`);
        } catch (err) {
            setParseError("Error fetching URL: " + err.message + ". Try using the Paste mode instead.");
        } finally {
            setFetching(false);
        }
    };

    // Parse pasted text
    const handleParseText = () => {
        if (!rawInput.trim()) {
            setParseError("Please paste the schedule data first.");
            return;
        }

        setParseError("");

        try {
            const parsed = parseText(rawInput);

            if (parsed.length === 0) {
                setParseError("Could not parse any data. Please check the format.");
                return;
            }

            const seen = new Set();
            const deduped = parsed.filter(p => {
                const key = `${p.code}-${p.section}-${p.days[0]}-${p.startTime}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });

            const uniqueVenues = [...new Set(deduped.map(c => c.venue).filter(v => v))];
            setVenues(uniqueVenues.sort());
            setSelectedVenues(new Set(uniqueVenues));
            setParsedData(deduped);
            setSelectedRows(new Set(deduped.map((_, i) => i)));

            toast.success(`Parsed ${deduped.length} schedule entries from ${uniqueVenues.length} venues!`);
        } catch (err) {
            setParseError("Error parsing: " + err.message);
        }
    };

    // Filter data by selected venues
    const filteredData = useMemo(() => {
        if (selectedVenues.size === 0) return [];
        return parsedData.filter(course => selectedVenues.has(course.venue));
    }, [parsedData, selectedVenues]);

    // Venue toggle helpers
    const toggleVenue = (venue) => {
        setSelectedVenues(prev => {
            const next = new Set(prev);
            next.has(venue) ? next.delete(venue) : next.add(venue);
            return next;
        });
    };
    const selectAllVenues = () => setSelectedVenues(new Set(venues));
    const deselectAllVenues = () => setSelectedVenues(new Set());

    // Row toggle helpers  
    const toggleRow = (index) => {
        setSelectedRows(prev => {
            const next = new Set(prev);
            next.has(index) ? next.delete(index) : next.add(index);
            return next;
        });
    };
    const selectAllRows = () => setSelectedRows(new Set(filteredData.map((_, i) => parsedData.indexOf(filteredData[i]))));
    const deselectAllRows = () => setSelectedRows(new Set());

    // Import selected courses to database
    const handleImport = async () => {
        const toImport = filteredData.filter((_, i) => {
            const idx = parsedData.indexOf(filteredData[i]);
            return selectedRows.has(idx);
        });

        if (toImport.length === 0) {
            toast.error("No courses selected for import.");
            return;
        }

        setImporting(true);
        let imported = 0;
        let lecturersCreated = 0;

        try {
            for (const course of toImport) {
                // 1. Create/get lecturer
                let lecturerId = null;
                if (course.lecturer && course.lecturer.trim()) {
                    const lecturerName = course.lecturer.trim();
                    // Create a cleaner email from lecturer name
                    const emailBase = lecturerName.toLowerCase()
                        .replace(/\s+/g, ".")
                        .replace(/[^a-z.]/g, "")
                        .substring(0, 30);
                    const email = emailBase + "@iium.edu.my";

                    // Check if lecturer exists by email
                    const { data: existingByEmail } = await supabase
                        .from("lecturers")
                        .select("id")
                        .eq("email", email)
                        .maybeSingle();

                    if (existingByEmail) {
                        lecturerId = existingByEmail.id;
                    } else {
                        // Generate staff_id from lecturer name
                        const staffIdBase = lecturerName
                            .split(" ")
                            .map(w => w.charAt(0))
                            .join("")
                            .toUpperCase();
                        const staffId = `STAFF-${staffIdBase}${Date.now().toString().slice(-4)}`;

                        // Insert new lecturer - let UUID auto-generate, staff_id is separate
                        const { data: newLec, error: lecError } = await supabase
                            .from("lecturers")
                            .insert([{
                                staff_id: staffId,
                                name: lecturerName,
                                email: email,
                                department: "KICT"
                            }])
                            .select()
                            .single();

                        if (lecError) {
                            console.error("Failed to create lecturer:", lecturerName, lecError);
                            // Try to find if it was created despite error (duplicate key)
                            const { data: retryFind } = await supabase
                                .from("lecturers")
                                .select("id")
                                .eq("email", email)
                                .maybeSingle();
                            if (retryFind) lecturerId = retryFind.id;
                        } else if (newLec) {
                            lecturerId = newLec.id;
                            lecturersCreated++;
                            console.log("Created lecturer:", lecturerName, "->", lecturerId);
                        }
                    }
                }

                // 2. Create/get course
                const courseCode = course.code.replace(/\s/g, "");
                let courseId = `COURSE-${courseCode}`;
                const { data: existingCourse } = await supabase.from("courses").select("id").eq("code", courseCode).maybeSingle();

                if (!existingCourse) {
                    const { error: courseError } = await supabase.from("courses").insert([{
                        id: courseId,
                        code: courseCode,
                        name: course.title,
                        credit_hour: course.creditHour,
                        lecturer_id: lecturerId
                    }]);
                    if (courseError) console.error("Failed to create course:", courseCode, courseError);
                } else {
                    courseId = existingCourse.id;
                }

                // 3. Create section
                const sectionId = `${courseCode}-${course.section}`;
                const { data: existingSection } = await supabase.from("sections").select("id, lecturer_id").eq("id", sectionId).maybeSingle();

                if (!existingSection) {
                    const { error: sectionError } = await supabase.from("sections").insert([{
                        id: sectionId,
                        course_id: courseId,
                        name: course.section,
                        lecturer_id: lecturerId
                    }]);
                    if (sectionError) console.error("Failed to create section:", sectionId, sectionError);
                } else if (!existingSection.lecturer_id && lecturerId) {
                    // Update section with lecturer if it didn't have one
                    await supabase.from("sections").update({ lecturer_id: lecturerId }).eq("id", sectionId);
                }

                // 4. Create schedule
                for (const day of course.days) {
                    if (!course.startTime) continue;
                    const { data: existingSch } = await supabase.from("section_schedules").select("id").eq("section_id", sectionId).eq("day_of_week", day).eq("start_time", course.startTime).maybeSingle();
                    if (!existingSch) {
                        const { error: schError } = await supabase.from("section_schedules").insert([{
                            section_id: sectionId,
                            day_of_week: day,
                            start_time: course.startTime,
                            end_time: course.endTime
                        }]);
                        if (schError) console.error("Failed to create schedule:", sectionId, day, schError);
                    }
                }

                imported++;
            }

            toast.success(`Imported ${imported} courses${lecturersCreated > 0 ? ` and created ${lecturersCreated} lecturers` : ""}!`);
        } catch (err) {
            console.error("Import error:", err);
            toast.error("Import failed: " + err.message);
        } finally {
            setImporting(false);
        }
    };

    // Reset
    const handleReset = () => {
        setRawInput("");
        setParsedData([]);
        setVenues([]);
        setSelectedVenues(new Set());
        setSelectedRows(new Set());
        setParseError("");
    };

    return (
        <div className="space-y-4">
            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
                <strong>📋 How to use:</strong> Enter the IIUM schedule URL or paste the schedule text.
                Filter by venue and import selected courses to your database.
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-2">
                <button
                    onClick={() => setInputMode("url")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${inputMode === "url" ? "bg-teal-500 text-white" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                        }`}
                >
                    <Link className="w-4 h-4" />
                    Fetch from URL
                </button>
                <button
                    onClick={() => setInputMode("paste")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${inputMode === "paste" ? "bg-teal-500 text-white" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                        }`}
                >
                    <FileText className="w-4 h-4" />
                    Paste Text
                </button>
            </div>

            {/* Input Section */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                {inputMode === "url" ? (
                    <>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            IIUM Schedule URL
                        </label>
                        <input
                            type="url"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            placeholder="https://myapps.iium.edu.my/StudentOnline/schedule1.php?..."
                            className="w-full rounded-xl px-3 py-2 bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-teal-400 text-sm transition"
                        />
                        <button
                            onClick={handleFetchUrl}
                            disabled={fetching}
                            className="flex items-center gap-2 px-4 py-2 mt-3 rounded-xl text-white bg-gradient-to-r from-teal-500 to-cyan-500 hover:scale-[1.02] text-sm font-medium transition disabled:opacity-50"
                        >
                            {fetching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            {fetching ? "Fetching..." : "Fetch & Parse"}
                        </button>
                    </>
                ) : (
                    <>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Paste Schedule Data
                        </label>
                        <textarea
                            value={rawInput}
                            onChange={(e) => setRawInput(e.target.value)}
                            placeholder="Copy and paste the schedule table here..."
                            className="w-full h-40 rounded-xl px-3 py-2 bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-teal-400 text-sm font-mono resize-y transition"
                        />
                        <div className="flex gap-2 mt-3">
                            <button onClick={handleParseText} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white bg-gradient-to-r from-teal-500 to-cyan-500 hover:scale-[1.02] text-sm font-medium transition">
                                <Upload className="w-4 h-4" /> Parse Data
                            </button>
                            <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-sm font-medium transition">
                                <RefreshCw className="w-4 h-4" /> Reset
                            </button>
                        </div>
                    </>
                )}
                {parseError && <p className="text-red-500 text-sm mt-2">{parseError}</p>}
            </div>

            {/* Venue Filter */}
            {venues.length > 0 && (
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-slate-500" />
                            <span className="text-sm font-medium text-slate-700">Filter by Venue ({selectedVenues.size}/{venues.length})</span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={selectAllVenues} className="text-xs px-2 py-1 rounded-lg bg-teal-100 text-teal-700 hover:bg-teal-200 transition">Select All</button>
                            <button onClick={deselectAllVenues} className="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition">Deselect All</button>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                        {venues.map((venue) => (
                            <label key={venue} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition ${selectedVenues.has(venue) ? "bg-teal-100 text-teal-700 border border-teal-300" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                                <input type="checkbox" checked={selectedVenues.has(venue)} onChange={() => toggleVenue(venue)} className="sr-only" />
                                {selectedVenues.has(venue) ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                {venue}
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {/* Data Table */}
            {filteredData.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between p-4 border-b border-slate-100">
                        <span className="text-sm font-medium text-slate-700">
                            {filteredData.length} entries ({selectedRows.size} selected)
                        </span>
                        <div className="flex gap-2">
                            <button onClick={selectAllRows} className="text-xs px-2 py-1 rounded-lg bg-teal-100 text-teal-700 hover:bg-teal-200 transition">Select All</button>
                            <button onClick={deselectAllRows} className="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition">Deselect All</button>
                        </div>
                    </div>

                    <div className="overflow-x-auto max-h-96">
                        <table className="min-w-full border-collapse text-sm">
                            <thead className="sticky top-0 bg-slate-100/95">
                                <tr className="text-slate-600 uppercase tracking-wide text-xs">
                                    <th className="px-3 py-2 text-center w-8">✓</th>
                                    <th className="px-3 py-2 text-left">Code</th>
                                    <th className="px-3 py-2 text-center">Sect</th>
                                    <th className="px-3 py-2 text-left">Title</th>
                                    <th className="px-3 py-2 text-center">Day</th>
                                    <th className="px-3 py-2 text-center">Time</th>
                                    <th className="px-3 py-2 text-left">Venue</th>
                                    <th className="px-3 py-2 text-left">Lecturer</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((course, i) => {
                                    const idx = parsedData.indexOf(course);
                                    const isSelected = selectedRows.has(idx);
                                    return (
                                        <tr key={i} onClick={() => toggleRow(idx)} className={`border-b border-slate-100 cursor-pointer transition ${isSelected ? "bg-teal-50 hover:bg-teal-100" : "hover:bg-slate-50"}`}>
                                            <td className="px-3 py-2 text-center">
                                                <input type="checkbox" checked={isSelected} onChange={() => toggleRow(idx)} className="rounded border-slate-300 text-teal-500" />
                                            </td>
                                            <td className="px-3 py-2 font-semibold">{course.code}</td>
                                            <td className="px-3 py-2 text-center"><span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs">{course.section}</span></td>
                                            <td className="px-3 py-2 max-w-[200px] truncate" title={course.title}>{course.title}</td>
                                            <td className="px-3 py-2 text-center text-xs">{course.days[0]}</td>
                                            <td className="px-3 py-2 text-center font-mono text-xs">{course.startTime} - {course.endTime}</td>
                                            <td className="px-3 py-2 text-xs max-w-[150px] truncate" title={course.venue}>{course.venue || "-"}</td>
                                            <td className="px-3 py-2 text-xs max-w-[180px] truncate" title={course.lecturer}>{course.lecturer || "-"}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-4 border-t border-slate-100">
                        <button onClick={handleImport} disabled={importing || selectedRows.size === 0} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-medium transition ${importing || selectedRows.size === 0 ? "bg-slate-400 cursor-not-allowed" : "bg-gradient-to-r from-green-500 to-emerald-500 hover:scale-[1.02]"}`}>
                            {importing ? <><RefreshCw className="w-4 h-4 animate-spin" /> Importing...</> : <><Check className="w-4 h-4" /> Import Selected ({selectedRows.size})</>}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
