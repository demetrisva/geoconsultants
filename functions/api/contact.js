// functions/api/contact.js
const ALLOWED_ORIGINS = [
  "https://www.geoconsultants.eu",
  "https://geoconsultants.eu",
  "https://geoconsultants.pages.dev"
];

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

function corsHeaders(origin) {
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Vary": "Origin",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };
  }
  return {};
}

export const onRequestOptions = async ({ request }) => {
  const origin = request.headers.get("Origin") || "";
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
};

export const onRequestPost = async ({ request, env }) => {
  const origin = request.headers.get("Origin") || "";
  
  let body;
  try { 
    body = await request.json(); 
  } catch { 
    return respond(400, { error: "Invalid JSON" }, origin); 
  }
  
  const name = trim(body.name);
  const email = trim(body.email);
  const subject = trim(body.subject) || "Website contact";
  const message = trim(body.message);
  
  if (!name || !email || !message) {
    return respond(400, { error: "Missing required fields" }, origin);
  }
  
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return respond(400, { error: "Invalid email" }, origin);
  }
  
  if (!env.MAIL_FROM || !env.MAIL_TO) {
    return respond(500, { error: "Server configuration error" }, origin);
  }
  
  const ip = request.headers.get("CF-Connecting-IP") || "";
  const textBody = [
    "New website enquiry",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `IP: ${ip}`,
    "",
    "Message:",
    message
  ].join("\n");
  
  const mailPayload = {
    personalizations: [{ to: [{ email: env.MAIL_TO }] }],
    from: { email: env.MAIL_FROM, name: "GeoConsultants Website" },
    subject: subject,
    content: [{ type: "text/plain", value: textBody }],
    reply_to: { email: email, name: name }
  };
  
  try {
    const res = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mailPayload)
    });
    
    if (!res.ok) {
      const errorText = await res.text().catch(() => "Unknown error");
      return respond(502, { 
        error: "Failed to send email", 
        status: res.status,
        details: errorText.substring(0, 500)
      }, origin);
    }
  } catch (err) {
    return respond(502, { error: "Network error", message: String(err) }, origin);
  }
  
  return respond(200, { ok: true, message: "Email sent successfully" }, origin);
};

function trim(val) {
  return typeof val === "string" ? val.trim() : "";
}

function respond(status, obj, origin) {
  return new Response(JSON.stringify(obj), { 
    status: status,
    headers: { ...JSON_HEADERS, ...corsHeaders(origin) }
  });
}
