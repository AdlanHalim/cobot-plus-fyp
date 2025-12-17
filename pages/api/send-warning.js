import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Verify user is authenticated and has admin role
    const authSupabase = createServerSupabaseClient();
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized - No token provided" });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await authSupabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: "Unauthorized - Invalid token" });
    }

    // Verify admin role
    const { data: profile } = await authSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return res.status(403).json({ error: "Forbidden - Admin access required" });
    }

    // Admin verified, proceed with sending warnings
    const supabase = createServerSupabaseClient();

    const { data: students, error } = await supabase
      .from("student_course_attendance")
      .select(`
        id, absence_count, student_id, course_id, warning_sent,
        students (email, name),
        courses (name)
      `)
      .gte("absence_count", 3)
      .eq("warning_sent", false);

    if (error) throw error;

    let sentCount = 0;
    for (const s of students) {
      if (!s.students?.email) continue;

      try {
        await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_FUNCTION_URL}/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            to: s.students.email,
            subject: "Attendance Warning Notice",
            body: `Dear ${s.students.name},

You have been absent 3 times in ${s.courses.name}.
Please take this as an official warning.

Regards,
Academic Affairs Office`,
          }),
        });

        await supabase
          .from("student_course_attendance")
          .update({ warning_sent: true })
          .eq("id", s.id);

        sentCount++;
      } catch (emailErr) {
        console.error(`Failed to send warning to ${s.students.email}:`, emailErr);
      }
    }

    res.status(200).json({ success: true, count: sentCount, total: students.length });
  } catch (err) {
    console.error("Send warning error:", err);
    res.status(500).json({ error: err.message });
  }
}
