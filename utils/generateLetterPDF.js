/**
 * @file generateLetterPDF.js
 * @location cobot-plus-fyp/utils/generateLetterPDF.js
 * 
 * @description
 * PDF letter generation utilities for warning and barring notices.
 * Uses jsPDF to create official letters with IIUM letterhead header.
 */

import { jsPDF } from "jspdf";

/**
 * Convert image URL to base64
 * @param {string} url - Image URL
 * @returns {Promise<string>} Base64 string
 */
async function loadImageAsBase64(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = reject;
        img.src = url;
    });
}

/**
 * Generate a warning letter PDF
 * @param {Object} data - Student and course data
 * @param {string} data.studentName - Student's full name
 * @param {string} data.matricNo - Student's matric number
 * @param {string} data.courseName - Course name
 * @param {string} data.sectionName - Section name
 * @param {number} data.absenceCount - Number of absences
 * @returns {Promise<string>} Base64 PDF string
 */
export async function generateWarningLetter(data) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    try {
        // Load letterhead header image
        const letterheadBase64 = await loadImageAsBase64("/letterhead/iium_letterhead.png");

        // Add letterhead header at top (scaled to fit page width with small margins)
        // The header image is wide and short, so we scale it appropriately
        doc.addImage(letterheadBase64, "PNG", 10, 10, pageWidth - 20, 20);
    } catch (err) {
        console.error("Failed to load letterhead:", err);
        // Fallback text header if image fails
        doc.setFontSize(14);
        doc.setTextColor(0, 100, 50);
        doc.text("INTERNATIONAL ISLAMIC UNIVERSITY MALAYSIA", pageWidth / 2, 20, { align: "center" });
    }

    let yPos = 45;

    // Date and Reference
    const today = new Date();
    const dateStr = today.toLocaleDateString("en-MY", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
    const refNo = `IIUM/AAD/WRN/${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, "0")}/${Date.now().toString().slice(-6)}`;

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(`Date: ${dateStr}`, margin, yPos);
    yPos += 6;
    doc.text(`Ref: ${refNo}`, margin, yPos);
    yPos += 15;

    // Recipient
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(data.studentName, margin, yPos);
    yPos += 6;
    doc.text(`Matric No: ${data.matricNo}`, margin, yPos);
    yPos += 6;
    doc.text(`${data.courseName}`, margin, yPos);
    yPos += 6;
    if (data.sectionName) {
        doc.text(`Section: ${data.sectionName}`, margin, yPos);
        yPos += 6;
    }
    yPos += 10;

    // Subject Line
    doc.setFont(undefined, "bold");
    doc.setFontSize(12);
    doc.text("SUBJECT: OFFICIAL WARNING - ATTENDANCE VIOLATION", margin, yPos);
    yPos += 12;

    // Greeting
    doc.setFont(undefined, "normal");
    doc.setFontSize(11);
    doc.text("Assalamualaikum Warahmatullahi Wabarakatuh,", margin, yPos);
    yPos += 10;

    // Body paragraph 1
    const body1 = `This letter serves as an OFFICIAL WARNING regarding your attendance record for the above-mentioned course. Our records indicate that you have accumulated ${data.absenceCount} absences as of ${dateStr}.`;

    const splitBody1 = doc.splitTextToSize(body1, pageWidth - (margin * 2));
    doc.text(splitBody1, margin, yPos);
    yPos += splitBody1.length * 6 + 8;

    // Body paragraph 2
    const body2 = `According to the university's attendance policy, students are required to maintain a minimum attendance rate of 80%. Failure to meet this requirement may result in serious academic consequences, including being barred from final examinations.`;

    const splitBody2 = doc.splitTextToSize(body2, pageWidth - (margin * 2));
    doc.text(splitBody2, margin, yPos);
    yPos += splitBody2.length * 6 + 8;

    // Body paragraph 3
    const body3 = `You are hereby advised to:`;
    doc.text(body3, margin, yPos);
    yPos += 8;

    // Bullet points
    const bullets = [
        "Attend all remaining classes without fail",
        "Contact your course lecturer immediately to discuss your situation",
        "Submit any valid medical certificates or official excuse letters if applicable",
        "Improve your attendance immediately to avoid further action"
    ];

    bullets.forEach((bullet, i) => {
        doc.text(`${i + 1}. ${bullet}`, margin + 5, yPos);
        yPos += 7;
    });
    yPos += 8;

    // Warning statement
    doc.setFont(undefined, "bold");
    doc.setTextColor(180, 0, 0);
    const warning = `Please be advised that if you accumulate 6 or more absences, you will be BARRED from sitting for the final examination for this course.`;
    const splitWarning = doc.splitTextToSize(warning, pageWidth - (margin * 2));
    doc.text(splitWarning, margin, yPos);
    yPos += splitWarning.length * 6 + 10;

    // Closing
    doc.setFont(undefined, "normal");
    doc.setTextColor(0, 0, 0);
    doc.text("We hope you take this warning seriously and take immediate corrective action.", margin, yPos);
    yPos += 12;

    doc.text("Wassalam,", margin, yPos);
    yPos += 15;

    // Auto-generated notice
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("This is an auto-generated letter from the CObot+ Attendance System.", margin, yPos);
    yPos += 5;
    doc.text("No signature is required.", margin, yPos);

    // Return as base64
    return doc.output("datauristring").split(",")[1];
}

/**
 * Generate a barring letter PDF
 * @param {Object} data - Student and course data
 * @returns {Promise<string>} Base64 PDF string
 */
export async function generateBarringLetter(data) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    try {
        // Load letterhead header image
        const letterheadBase64 = await loadImageAsBase64("/letterhead/iium_letterhead.png");

        // Add letterhead header at top
        doc.addImage(letterheadBase64, "PNG", 10, 10, pageWidth - 20, 20);
    } catch (err) {
        console.error("Failed to load letterhead:", err);
        doc.setFontSize(14);
        doc.setTextColor(0, 100, 50);
        doc.text("INTERNATIONAL ISLAMIC UNIVERSITY MALAYSIA", pageWidth / 2, 20, { align: "center" });
    }

    let yPos = 45;

    // Date and Reference
    const today = new Date();
    const dateStr = today.toLocaleDateString("en-MY", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
    const refNo = `IIUM/AAD/BAR/${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, "0")}/${Date.now().toString().slice(-6)}`;

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(`Date: ${dateStr}`, margin, yPos);
    yPos += 6;
    doc.text(`Ref: ${refNo}`, margin, yPos);
    yPos += 15;

    // Recipient
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(data.studentName, margin, yPos);
    yPos += 6;
    doc.text(`Matric No: ${data.matricNo}`, margin, yPos);
    yPos += 6;
    doc.text(`${data.courseName}`, margin, yPos);
    yPos += 6;
    if (data.sectionName) {
        doc.text(`Section: ${data.sectionName}`, margin, yPos);
        yPos += 6;
    }
    yPos += 10;

    // Subject Line - Red for barring
    doc.setFont(undefined, "bold");
    doc.setFontSize(12);
    doc.setTextColor(180, 0, 0);
    doc.text("SUBJECT: EXAMINATION BARRING NOTICE - EXCESSIVE ABSENCES", margin, yPos);
    yPos += 12;

    // Greeting
    doc.setFont(undefined, "normal");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text("Assalamualaikum Warahmatullahi Wabarakatuh,", margin, yPos);
    yPos += 10;

    // Body paragraph 1
    const body1 = `With deep regret, we are writing to inform you that you have been BARRED from sitting for the final examination for the above-mentioned course. Our records indicate that you have accumulated ${data.absenceCount} absences as of ${dateStr}, which exceeds the maximum allowable limit.`;

    const splitBody1 = doc.splitTextToSize(body1, pageWidth - (margin * 2));
    doc.text(splitBody1, margin, yPos);
    yPos += splitBody1.length * 6 + 8;

    // Body paragraph 2 - Important notice box
    doc.setFillColor(255, 240, 240);
    doc.roundedRect(margin - 5, yPos - 5, pageWidth - (margin * 2) + 10, 28, 2, 2, "F");

    doc.setFont(undefined, "bold");
    doc.setTextColor(180, 0, 0);
    const notice = `IMPORTANT: This barring decision is final and effective immediately. You are NOT permitted to sit for the final examination for this course in the current semester.`;
    const splitNotice = doc.splitTextToSize(notice, pageWidth - (margin * 2));
    doc.text(splitNotice, margin, yPos + 5);
    yPos += 35;

    // Body paragraph 3
    doc.setFont(undefined, "normal");
    doc.setTextColor(0, 0, 0);
    const body3 = `As a consequence of this barring:`;
    doc.text(body3, margin, yPos);
    yPos += 8;

    // Bullet points
    const bullets = [
        "You will receive a grade of 'X' (Barred) for this course",
        "You must repeat this course in a future semester",
        "This may affect your academic standing and progression",
        "Additional academic counseling may be required"
    ];

    bullets.forEach((bullet, i) => {
        doc.text(`${i + 1}. ${bullet}`, margin + 5, yPos);
        yPos += 7;
    });
    yPos += 8;

    // Appeal information
    doc.setFont(undefined, "bold");
    const appealHeader = "Right to Appeal:";
    doc.text(appealHeader, margin, yPos);
    yPos += 7;

    doc.setFont(undefined, "normal");
    const appeal = `If you believe there are extenuating circumstances that led to your absences, you may submit an appeal to the Academic Affairs Division within 7 working days from the date of this letter. Appeals must be accompanied by supporting documentation.`;
    const splitAppeal = doc.splitTextToSize(appeal, pageWidth - (margin * 2));
    doc.text(splitAppeal, margin, yPos);
    yPos += splitAppeal.length * 6 + 10;

    // Closing
    doc.text("For further inquiries, please contact your course lecturer or the Academic Affairs Division.", margin, yPos);
    yPos += 12;

    doc.text("Wassalam,", margin, yPos);
    yPos += 15;

    // Auto-generated notice
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("This is an auto-generated letter from the CObot+ Attendance System.", margin, yPos);
    yPos += 5;
    doc.text("No signature is required.", margin, yPos);

    // Return as base64
    return doc.output("datauristring").split(",")[1];
}
