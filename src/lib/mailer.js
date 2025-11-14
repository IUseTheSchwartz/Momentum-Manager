// Simple helper to call the Netlify send-email function from the client.
// Usage: sendMail({ to, subject, html, text, replyTo, fromName })

export async function sendMail({ to, subject, html, text, replyTo, fromName }) {
  try {
    const res = await fetch("/.netlify/functions/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, html, text, replyTo, fromName }),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("[mailer] send-email failed:", res.status, t);
    }
  } catch (err) {
    console.error("[mailer] send-email error:", err);
  }
}
