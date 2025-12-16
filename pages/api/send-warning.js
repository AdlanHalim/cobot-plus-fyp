import { createServerSupabaseClient } from "@/lib/supabase-server";

const supabase = createServerSupabaseClient();

export default async function handler(req, res) {
  try {
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

    for (const s of students) {
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
    }

    res.status(200).json({ success: true, count: students.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
