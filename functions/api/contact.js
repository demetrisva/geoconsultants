// functions/api/contact.js

export async function onRequest(context) {
  const { request, env } = context;

  // Handle OPTIONS (CORS preflight)
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders()
    });
  }

  // Only allow POST
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  console.log("Contact form submission started");

  // Parse body
  let body;
  try {
    body = await request.json();
  } catch (err) {
    console.error("JSON parse error:", err.message);
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const subject = String(body.subject || "Website contact").trim();
  const message = String(body.message || "").trim();

  console.log("Form data:", { name, email, subject, hasMessage: !!message });

  // Validate
  if (!name || !email || !message) {
    console.log("Validation failed: missing fields");
    return jsonResponse({ error: "Missing required fields" }, 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.log("Validation failed: invalid email");
    return jsonResponse({ error: "Invalid email address" }, 400);
  }

  const zohoConfig = getZohoConfig(env);
  if (!zohoConfig.isValid) {
    console.error("Missing Zoho Mail configuration");
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  console.log("Preparing email for Zoho Mail");
  try {
    console.log("Calling Zoho Mail API");

    const endpoint = `${zohoConfig.apiBase}/api/accounts/${encodeURIComponent(zohoConfig.accountId)}/messages`;
    const accessToken = await resolveZohoAccessToken(zohoConfig);
    const formData = new URLSearchParams({
      fromAddress: zohoConfig.fromAddress,
      toAddress: zohoConfig.toAddress,
      subject: `Contact Form: ${subject}`,
      content: buildPlainTextContent({ name, email, subject, message }),
      mailFormat: "plaintext"
    });

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "Authorization": `Zoho-oauthtoken ${accessToken}`
      },
      body: formData.toString()
    });

    const raw = await response.text();
    const result = safeJsonParse(raw);
    console.log("Zoho response status:", response.status);

    if (!response.ok) {
      console.error("Zoho error:", result || raw);
      return jsonResponse({
        error: "Failed to send email",
        details: extractZohoError(result) || "Unknown error"
      }, response.status);
    }

    const zohoCode = Number(result?.status?.code || 200);
    if (zohoCode !== 200) {
      console.error("Zoho API returned failure payload:", result);
      return jsonResponse({
        error: "Failed to send email",
        details: extractZohoError(result) || "Unknown error"
      }, 502);
    }

    const messageId = result?.data?.messageId || null;
    console.log("Email sent successfully, ID:", messageId);
    return jsonResponse({
      success: true,
      message: "Email sent successfully",
      id: messageId
    }, 200);

  } catch (err) {
    console.error("Zoho fetch error:", err.message);
    return jsonResponse({
      error: "Network error",
      message: err.message
    }, 502);
  }
}

function getZohoConfig(env) {
  const accountId = String(env.ZOHO_MAIL_ACCOUNT_ID || "").trim();
  const accessToken = String(env.ZOHO_MAIL_ACCESS_TOKEN || "").trim();
  const refreshToken = String(env.ZOHO_MAIL_REFRESH_TOKEN || "").trim();
  const clientId = String(env.ZOHO_MAIL_CLIENT_ID || "").trim();
  const clientSecret = String(env.ZOHO_MAIL_CLIENT_SECRET || "").trim();
  const accountsBase = String(env.ZOHO_ACCOUNTS_BASE || "https://accounts.zoho.com").trim().replace(/\/+$/, "");
  const apiBase = String(env.ZOHO_MAIL_API_BASE || "https://mail.zoho.com").trim().replace(/\/+$/, "");
  const fromAddress = String(env.ZOHO_MAIL_FROM || "info@geoconsultants.eu").trim();
  const toAddress = String(env.ZOHO_MAIL_TO || "info@geoconsultants.eu").trim();
  const hasDirectToken = Boolean(accessToken);
  const hasRefreshFlow = Boolean(refreshToken && clientId && clientSecret);

  return {
    accountId,
    accessToken,
    refreshToken,
    clientId,
    clientSecret,
    accountsBase,
    apiBase,
    fromAddress,
    toAddress,
    hasDirectToken,
    hasRefreshFlow,
    isValid: Boolean(accountId && fromAddress && toAddress && (hasDirectToken || hasRefreshFlow))
  };
}

async function resolveZohoAccessToken(config) {
  if (config.hasDirectToken) {
    return config.accessToken;
  }

  const tokenUrl = `${config.accountsBase}/oauth/v2/token`;
  const body = new URLSearchParams({
    refresh_token: config.refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "refresh_token"
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: body.toString()
  });

  const raw = await response.text();
  const data = safeJsonParse(raw);
  const token = String(data?.access_token || "").trim();
  if (!response.ok || !token) {
    console.error("Zoho token refresh failed:", data || raw);
    throw new Error("Zoho token refresh failed");
  }

  return token;
}

function buildPlainTextContent({ name, email, subject, message }) {
  return [
    `Name: ${name}`,
    `Email: ${email}`,
    `Subject: ${subject}`,
    "",
    "Message:",
    message
  ].join("\n");
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractZohoError(payload) {
  if (!payload) return "";
  return String(
    payload?.status?.description ||
    payload?.status?.message ||
    payload?.message ||
    payload?.error ||
    ""
  ).trim();
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders()
    }
  });
}
