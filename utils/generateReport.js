/**
 * @file generateReport.js
 * @location cobot-plus-fyp/utils/generateReport.js
 * 
 * @description
 * PDF report generation utilities for the CObot+ Attendance System.
 * Uses jsPDF and jspdf-autotable to create formatted attendance reports
 * with CObot+ branding, summary statistics, and detailed student tables.
 * 
 * @example
 * // Generate and download a report
 * import { generateAndDownloadReport } from "@/utils/generateReport";
 * 
 * generateAndDownloadReport({
 *   title: "Weekly Attendance Report",
 *   sectionName: "Section A",
 *   courseName: "Introduction to Programming",
 *   dateRange: "Dec 1-7, 2024",
 *   summary: { totalStudents: 30, averageAttendance: 85 },
 *   students: [{ matric_no: "A123", name: "John", present: 5, absent: 1 }],
 *   fileName: "week1_report.pdf"
 * });
 */

import { jsPDF } from "jspdf";
import "jspdf-autotable"; // Extends jsPDF with autoTable method

/**
 * Generate a PDF attendance report document.
 * 
 * Creates a professionally formatted PDF with:
 * - CObot+ branded header
 * - Course and section information
 * - Date range and generation timestamp
 * - Summary statistics box
 * - Student attendance table with Present/Absent/Late columns
 * - Page numbers in footer
 * 
 * @param {Object} options - Report configuration options
 * @param {string} [options.title="Attendance Report"] - Report title
 * @param {string} [options.sectionName=""] - Section name (e.g., "Section A")
 * @param {string} [options.courseName=""] - Course name
 * @param {string} [options.dateRange=""] - Date range for the report
 * @param {Object} [options.summary={}] - Summary statistics
 * @param {number} [options.summary.totalStudents] - Total enrolled students
 * @param {number} [options.summary.averageAttendance] - Average attendance %
 * @param {number} [options.summary.totalClasses] - Number of classes
 * @param {number} [options.summary.atRisk] - Students at risk count
 * @param {Array<Object>} [options.students=[]] - Student attendance data
 * @param {string} [options.fileName="attendance_report.pdf"] - Output filename
 * 
 * @returns {{doc: jsPDF, fileName: string}} PDF document and filename
 */
export function generateAttendanceReport({
    title = "Attendance Report",
    sectionName = "",
    courseName = "",
    dateRange = "",
    summary = {},
    students = [],
    fileName = "attendance_report.pdf",
}) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229); // Indigo
    doc.text("CObot+ Attendance System", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text(title, pageWidth / 2, 32, { align: "center" });

    // Course/Section Info
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105); // Slate-600
    if (courseName) {
        doc.text(`Course: ${courseName}`, 14, 45);
    }
    if (sectionName) {
        doc.text(`Section: ${sectionName}`, 14, 52);
    }
    if (dateRange) {
        doc.text(`Period: ${dateRange}`, 14, 59);
    }
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 66);

    // Summary Box
    let yPos = 78;

    if (Object.keys(summary).length > 0) {
        doc.setFillColor(241, 245, 249); // Slate-100
        doc.roundedRect(14, yPos - 5, pageWidth - 28, 35, 3, 3, "F");

        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text("Summary", 20, yPos + 5);

        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);

        const summaryItems = [
            [`Total Students: ${summary.totalStudents || 0}`, `Average Attendance: ${summary.averageAttendance || 0}%`],
            [`Total Classes: ${summary.totalClasses || 0}`, `Students at Risk: ${summary.atRisk || 0}`],
        ];

        summaryItems.forEach((row, i) => {
            row.forEach((text, j) => {
                doc.text(text, 20 + (j * 80), yPos + 15 + (i * 8));
            });
        });

        yPos += 45;
    }

    // Student Attendance Table
    if (students.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text("Student Attendance Details", 14, yPos);

        const tableData = students.map((s, i) => [
            i + 1,
            s.matric_no || "-",
            s.name || "-",
            s.present || 0,
            s.absent || 0,
            s.late || 0,
            `${s.percentage || 0}%`,
        ]);

        doc.autoTable({
            startY: yPos + 5,
            head: [["#", "Matric No", "Name", "Present", "Absent", "Late", "Attendance %"]],
            body: tableData,
            theme: "striped",
            styles: {
                fontSize: 9,
                cellPadding: 3,
            },
            headStyles: {
                fillColor: [79, 70, 229], // Indigo
                textColor: [255, 255, 255],
                fontStyle: "bold",
            },
            alternateRowStyles: {
                fillColor: [241, 245, 249], // Slate-100
            },
            columnStyles: {
                0: { cellWidth: 10 },
                1: { cellWidth: 25 },
                2: { cellWidth: 45 },
                3: { cellWidth: 18, halign: "center" },
                4: { cellWidth: 18, halign: "center" },
                5: { cellWidth: 15, halign: "center" },
                6: { cellWidth: 25, halign: "center" },
            },
        });
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // Slate-400
        doc.text(
            `Page ${i} of ${pageCount}`,
            pageWidth / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: "center" }
        );
    }

    return { doc, fileName };
}

/**
 * Download a PDF report
 */
export function downloadReport(doc, fileName) {
    doc.save(fileName);
}

/**
 * Generate and download attendance report
 */
export function generateAndDownloadReport(options) {
    const { doc, fileName } = generateAttendanceReport(options);
    downloadReport(doc, fileName);
}
