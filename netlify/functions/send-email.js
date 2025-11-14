// File: netlify/functions/send-email.js
import nodemailer from "nodemailer";

function stripHtml(html = "") {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<\/(p|div|br|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    // { subject, text, html?, to?, replyTo? }
    const payload = JSON.parse(event.body || "{}");

    const toList = (payload.to || process.env.SMTP_TO || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const fromEmail = process.env.SMTP_FROM || user;
    const fromName = process.env.SMTP_FROM_NAME || "Momentum Financial";
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = port === 465;

    if (!host || !user || !pass || toList.length === 0) {
      console.log("[send-email] Skipping (missing SMTP env or recipients)", {
        hasHost: !!host,
        hasUser: !!user,
        hasPass: !!pass,
        toList,
      });
      return { statusCode: 200, body: "ok (email skipped)" };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    const fromHeader = `"${(fromName || "Momentum Financial")
      .replace(/"/g, "'")}" <${fromEmail}>`;

    await transporter.sendMail({
      from: fromHeader,
      to: toList,
      subject: payload.subject || "Notification",
      text: payload.text || (payload.html ? stripHtml(payload.html) : ""),
      html: payload.html || undefined,
      replyTo: payload.replyTo || fromEmail,
      headers: {
        "X-MJ-TrackOpen": "0",
        "X-MJ-TrackClick": "0",
        "List-Unsubscribe":
          "<mailto:support@logantharris.com>, <https://logantharris.com/unsubscribe>",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
      }
    });

    return { statusCode: 200, body: "ok" };
  } catch (e) {
    console.error(e);
    return { statusCode: 200, body: "ok (email skipped due to error)" };
  }
};
