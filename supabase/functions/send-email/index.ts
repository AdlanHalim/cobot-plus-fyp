// supabase/functions/send-email/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import "https://deno.land/x/dotenv@v3.2.2/load.ts";
import { SmtpClient } from "https://deno.land/x/smtp/mod.ts";

serve(async (req) => {
  try {
    const { to, subject, body } = await req.json();

    if (!to || !subject || !body) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
      });
    }

    const client = new SmtpClient();

    // Get Gmail credentials from Supabase secrets
    const EMAIL_USER = Deno.env.get("EMAIL_USER");
    const EMAIL_PASS = Deno.env.get("EMAIL_PASS");

    if (!EMAIL_USER || !EMAIL_PASS) {
      throw new Error("Email credentials not configured in Supabase secrets");
    }

    // Connect to Gmail SMTP
    await client.connectTLS({
      hostname: "smtp.gmail.com",
      port: 465,
      username: EMAIL_USER,
      password: EMAIL_PASS,
    });

    // Send the email
    await client.send({
      from: EMAIL_USER,
      to,
      subject,
      content: body,
    });

    await client.close();

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error("Error sending email:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
