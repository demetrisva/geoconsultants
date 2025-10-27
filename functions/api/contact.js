// functions/api/contact.js
// Cloudflare Pages Function: verifies Turnstile + sends mail via MailChannels

const ALLOWED_ORIGINS = [
  "https://www.geoconsultants.eu",
  "https://geoconsultants.eu" // in case you preview without www
];

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

function corsHeaders(origin) {
  return origin && ALLOWED_ORIGINS.includes(origin)
    ? {
        "Access-Control-Allow-Origin": origin,
        "Vary": "Origin",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    : {};
}

export const onRequestOptions = async ({ request }) => {
  const origin = request.headers.get("Origin") || "";
  return new Response(null, {
    status: 204,
    headers: { ...corsHeaders(origin) }
  });
};

export const onRequestPost = async ({ request, env }) => {
  const origin = request.headers.get("Origin") || "";

  // --- 1) Parse JSON body safely
  let body;
  try {
    body = await request.json();
  } catch {
    return respond(400, { error: "Invalid JSON" }, origin);
  }

  // Accept both payload shapes from your index.html
  const name = str(body.name);
  const email = str(body.email);
  const subject =
    str(body.subject) ||
    (str(body.service) ? `Enquiry: ${str(body.service)}` : "Website contact");
  const message = str(body.message);
  const phone = str(body.phone);
  // Turnstile token may arrive as `token` or `turnstileToken`
  const tsToken = str(body.token) || str(body.turnstileToken);

  // --- 2) Validate required fields
  if (!name || !email || !message || !tsToken) {
    return respond(
      400,
      { error: "Missing required fields (name, email, message, token)" },
      origin
    );
  }

  // Very light email sanity check
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return respond(400, { error: "Invalid email" }, origin);
  }

  // --- 3) Verify Turnstile
  const ip = request.headers.get("CF-Connecting-IP") || "";
  try {
    const verifyRes = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: new URLSearchParams({
          secret: env.TURNSTILE_SECRET,
          response: tsToken,
          remoteip: ip
        })
      }
    );
    const verify = await verifyRes.json();

    if (!verify.success) {
      return respond(403, { error: "Turnstile verification failed" }, origin);
    }
  } catch (e) {
    return respond(502, { error: "Turnstile verification error" }, origin);
  }

  // --- 4) Build email (plain-text)
  const to = env.MAIL_TO;
  const from = env.MAIL_FROM; // must be your domain, e.g., noreply@geoconsultants.eu

  if (!to || !from || !env.TURNSTILE_SECRET) {
    return respond(
      500,
      { error: "Server misconfiguration: missing env vars" },
      origin
    );
  }

  const cleanSubject = clip(`Contact Form: ${subject}`, 200);
  const lines = [
    "New website enquiry",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    phone ? `Phone: ${phone}` : null,
    `IP: ${ip}`,
    "",
    "Message:",
    message
  ]
    .filter(Boolean)
    .join("\n");

  const mailPayload = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: from, name: "GeoConsultants Website" },
    subject: cleanSubject,
    content: [{ type: "text/plain", value: lines }],
    reply_to: { email, name }
  };

  // --- 5) Send via MailChannels
  try {
    const m = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mailPayload)
    });

    if (!m.ok) {
      const detail = await m.text();
      return respond(
        502,
        { error: "Mail provider error", details: clip(detail, 300) },
        origin
      );
    }
  } catch (e) {
    return respond(502, { error: "Mail send error" }, origin);
  }

  // --- 6) Done
  return respond(200, { ok: true }, origin);
};

// ---------- helpers ----------
function str(v) {
  return typeof v === "string" ? v.trim() : "";
}
function clip(s, n) {
  return s.length > n ? s.slice(0, n) : s;
}
function respond(status, obj, origin) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...JSON_HEADERS, ...corsHeaders(origin) }
  });
}
