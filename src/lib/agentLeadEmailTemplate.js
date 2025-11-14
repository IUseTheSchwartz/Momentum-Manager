// Build HTML/text/subject for a new recruiting application email
export function buildAgentLeadNotice({ site, lead }) {
  const agentName = site?.about_name || "Your Mentor";
  const siteName = site?.site_name || "Momentum Financial";
  const leadName = lead.full_name || "Lead";

  const subject = `New application – ${leadName}`;

  const safe = (v) => (v || "").toString();

  const html = `
  <h3 style="margin:0 0 8px;">New recruiting application</h3>
  <p style="margin:0 0 12px;color:#555;">
    ${safe(leadName)} just submitted your ${siteName} recruiting form.
  </p>
  <ul style="margin:0 0 12px 0;padding-left:18px;color:#111;">
    <li><strong>Name:</strong> ${safe(lead.full_name)}</li>
    <li><strong>Phone:</strong> ${safe(lead.phone)}</li>
    <li><strong>Email:</strong> ${safe(lead.email)}</li>
  </ul>
  <p style="margin:0 0 12px;color:#555;">
    Reply directly to this email to follow up with the candidate.
  </p>
  <p style="margin-top:16px;color:#777;font-size:13px;">
    You are receiving this because ${safe(agentName)} has notifications enabled on their Momentum recruiting page.
  </p>
  `;

  const text = `New recruiting application

Name: ${safe(lead.full_name)}
Phone: ${safe(lead.phone)}
Email: ${safe(lead.email)}

Reply to this email to follow up.`;

  return { subject, html, text };
}
