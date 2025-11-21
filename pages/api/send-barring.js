import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    const { data: students, error } = await supabase
      .from("student_course_attendance")
      .select(`
        id, absence_count, student_id, course_id, barring_sent,
        students (email, name),
        courses (name)
      `)
      .gte("absence_count", 6)
      .eq("barring_sent", false);

    if (error) throw error;

    for (const s of students) {
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_FUNCTION_URL}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: s.students.email,
          subject: "Barring Notice – Excessive Absences",
          text: `Dear ${s.students.name},

You have been absent 6 times in ${s.courses.name}.
As per attendance policy, you are hereby barred from final examinations.

Please contact your course lecturer immediately.

Regards,
Academic Affairs Office`,
        }),
      });

      await supabase
        .from("student_course_attendance")
        .update({ barring_sent: true })
        .eq("id", s.id);
    }

    res.status(200).json({ success: true, count: students.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
