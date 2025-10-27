const ALLOWED_ORIGINS = [
  "https://www.geoconsultants.eu",
  "https://geoconsultants.eu",
  "https://geoconsultants.pages.dev" // remove later if you want
];
const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

function cors(origin) {
  return ALLOWED_ORIGINS.includes(origin || "")
    ? { "Access-Control-Allow-Origin": origin, "Vary": "Origin",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type" }
    : {};
}

export const onRequestOptions = async ({ request }) =>
  new Response(null, { status: 204, headers: cors(request.headers.get("Origin")) });

export const onRequestPost = async ({ request, env }) => {
  const origin = request.headers.get("Origin") || "";

  // Parse
  let body; try { body = await request.json(); }
  catch { return respond(400, { error: "Invalid JSON" }, origin); }

  const name = s(body.name);
  const email = s(body.email);
  const subject = s(body.subject) || (s(body.service) ? `Enquiry: ${s(body.service)}` : "Website contact");
  const message = s(body.message);
  const phone = s(body.phone);
  const token = s(body.token) || s(body.turnstileToken);

  if (!name || !email || !message || !token) {
    return respond(400, { error: "Missing required fields (name, email, message, token)" }, origin);
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return respond(400, { error: "Invalid email" }, origin);
  }
  if (!env.TURNSTILE_SECRET || !env.MAIL_FROM || !env.MAIL_TO) {
    return respond(500, { error: "Server misconfiguration: missing env vars" }, origin);
  }

  // Verify Turnstile
  const ip = request.headers.get("CF-Connecting-IP") || "";
  const vRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip })
  });
  const verify = await vRes.json().catch(() => ({}));

  if (!verify.success) {
    return respond(403, {
      error: "Turnstile verification failed",
      codes: verify["error-codes"] || [],
      hostname: verify.hostname || null
    }, origin);
  }

  // Build mail
  const lines = [
    "New website enquiry", "",
    `Name: ${name}`, `Email: ${email}`, phone ? `Phone: ${phone}` : null,
    `IP: ${ip}`, "", "Message:", message
  ].filter(Boolean).join("\n");

  const mailPayload = {
    personalizations: [{ to: [{ email: env.MAIL_TO }] }],
    from: { email: env.MAIL_FROM, name: "GeoConsultants Website" },
    subject: (`Contact Form: ${subject}`).slice(0, 200),
    content: [{ type: "text/plain", value: lines }],
    reply_to: { email, name }
  };

  const m = await fetch("https://api.mailchannels.net/tx/v1/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mailPayload)
  });

  if (!m.ok) {
    const detail = await m.text();
    return respond(502, { error: "Mail provider error", details: detail.slice(0, 400) }, origin);
  }

  return respond(200, { ok: true }, origin);
};

// helpers
const s = v => (typeof v === "string" ? v.trim() : "");
function respond(status, obj, origin) {
  return new Response(JSON.strin
