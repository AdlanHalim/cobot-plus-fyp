/**
 * @file index.ts
 * @location cobot-plus-fyp/supabase/functions/send-email/index.ts
 * 
 * @description
 * Supabase Edge Function for sending email notifications.
 * Handles warning and barring emails for attendance interventions.
 * 
 * Features:
 * - Sends emails via Gmail SMTP using Nodemailer
 * - Updates database flags (warning_sent, barring_sent)
 * - CORS-enabled for cross-origin requests
 * 
 * Required Secrets:
 * - EMAIL_USER: Gmail address
 * - EMAIL_PASS: Gmail app password
 * - SUPABASE_SERVICE_ROLE_KEY: For DB writes
 * 
 * @method POST
 * @param {Object} body
 * @param {string} body.to - Recipient email
 * @param {string} body.subject - Email subject
 * @param {string} body.content - Email body text
 * @param {string} body.student_id - For DB update
 * @param {string} body.section_id - For DB update
 * @param {string} body.email_type - "warning" or "barring"
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.7";

// CORS headers for cross-origin requests
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Initialize Supabase client with Service Role Key for DB write permissions
// CRITICAL: Use Service Role Key from secrets, NOT the Anon key
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // We now expect more detailed data from the client, including student_id and section_id
    const {
      to,
      subject,
      content, // The email body/text
      student_id,
      section_id,
      email_type,
      pdf_attachment, // Optional: base64 encoded PDF
      pdf_filename,   // Optional: filename for the PDF attachment
    } = await req.json();

    if (!to || !subject || !content || !student_id || !section_id || !email_type) {
      return new Response(JSON.stringify({ error: "Missing required intervention fields." }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const EMAIL_USER = Deno.env.get("EMAIL_USER");
    const EMAIL_PASS = Deno.env.get("EMAIL_PASS");
    let updateColumn = '';

    if (!EMAIL_USER || !EMAIL_PASS) {
      throw new Error("Email credentials not configured in Supabase secrets");
    }

    // 1. Send the Email using Nodemailer
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    // Build email options with optional PDF attachment
    const mailOptions: {
      from: string;
      to: string;
      subject: string;
      text: string;
      attachments?: Array<{ filename: string; content: string; encoding: string }>;
    } = {
      from: EMAIL_USER,
      to,
      subject,
      text: content,
    };

    // Add PDF attachment if provided
    if (pdf_attachment && pdf_filename) {
      mailOptions.attachments = [
        {
          filename: pdf_filename,
          content: pdf_attachment,
          encoding: 'base64',
        },
      ];
    }

    await transporter.sendMail(mailOptions);

    // 2. Determine the DB column to update
    if (email_type === 'warning') {
      updateColumn = 'warning_sent';
    } else if (email_type === 'barring') {
      updateColumn = 'barring_sent';
    } else {
      // Log this error, but still return success if email went out
      console.error("Invalid email_type received:", email_type);
      updateColumn = null;
    }

    // 3. Update the Database Flag (CRITICAL STEP)
    if (updateColumn) {
      const updatePayload: { [key: string]: boolean } = {};
      updatePayload[updateColumn] = true;

      const { error: dbError } = await supabase
        .from('student_course_attendance')
        .update(updatePayload)
        .eq('student_id', student_id)
        .eq('section_id', section_id);

      if (dbError) {
        console.error('Database Update Error:', dbError);
        // We return 500 here if the DB update fails, as the action is not fully complete.
        return new Response(JSON.stringify({ error: `Email sent, but failed to update DB: ${dbError.message}` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ success: true, message: "Email sent and status recorded." }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error("General Edge Function Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});