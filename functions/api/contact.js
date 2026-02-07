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
    console.error("Missing Zoho Mail configuration:", zohoConfig.validationError);
    return jsonResponse({
      error: "Server configuration error",
      details: zohoConfig.validationError
    }, 500);
  }

  console.log("Preparing email for Zoho Mail");
  try {
    const accessToken = await resolveZohoAccessToken(zohoConfig);
    const payload = new URLSearchParams({
      fromAddress: zohoConfig.fromAddress,
      toAddress: zohoConfig.toAddress,
      subject: `Contact Form: ${subject}`,
      content: buildPlainTextContent({ name, email, subject, message }),
      mailFormat: "plaintext"
    });

    const sendResult = await sendViaZoho({
      config: zohoConfig,
      accessToken,
      payload: payload.toString()
    });
    if (!sendResult.ok) {
      return jsonResponse({
        error: "Failed to send email",
        details: sendResult.details || "Unknown error"
      }, sendResult.status || 502);
    }

    const messageId = sendResult.result?.data?.messageId || null;
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
  const accountId = envValue(env, ["ZOHO_MAIL_ACCOUNT_ID", "ZOHO_ACCOUNT_ID"]);
  const accessToken = envValue(env, ["ZOHO_MAIL_ACCESS_TOKEN", "ZOHO_ACCESS_TOKEN"]);
  const refreshToken = envValue(env, ["ZOHO_MAIL_REFRESH_TOKEN", "ZOHO_REFRESH_TOKEN"]);
  const clientId = envValue(env, ["ZOHO_MAIL_CLIENT_ID", "ZOHO_CLIENT_ID"]);
  const clientSecret = envValue(env, ["ZOHO_MAIL_CLIENT_SECRET", "ZOHO_CLIENT_SECRET"]);
  const fromAddress = envValue(env, ["ZOHO_MAIL_FROM", "ZOHO_FROM_EMAIL", "ZOHO_FROM"]) || "info@geoconsultants.eu";
  const toAddress = envValue(env, ["ZOHO_MAIL_TO", "ZOHO_TO_EMAIL", "ZOHO_TO"]) || "info@geoconsultants.eu";
  const hasDirectToken = Boolean(accessToken);
  const hasRefreshFlow = Boolean(refreshToken && clientId && clientSecret);
  const accountsBases = resolveZohoAccountsBases(env, fromAddress, toAddress);
  const apiBases = resolveZohoApiBases(env, fromAddress, toAddress);
  const validationError = buildConfigValidationError({
    accountId,
    hasDirectToken,
    refreshToken,
    clientId,
    clientSecret
  });

  return {
    accountId,
    accessToken,
    refreshToken,
    clientId,
    clientSecret,
    accountsBases,
    apiBases,
    fromAddress,
    toAddress,
    hasDirectToken,
    hasRefreshFlow,
    validationError,
    isValid: Boolean(
      accountId &&
      fromAddress &&
      toAddress &&
      apiBases.length &&
      accountsBases.length &&
      !validationError
    )
  };
}

async function resolveZohoAccessToken(config) {
  if (config.hasDirectToken) {
    return config.accessToken;
  }

  const errors = [];
  for (const accountsBase of config.accountsBases) {
    const tokenUrl = `${accountsBase}/oauth/v2/token`;
    const body = new URLSearchParams({
      refresh_token: config.refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token"
    });

    try {
      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: body.toString()
      });

      const raw = await response.text();
      const data = safeJsonParse(raw);
      const token = String(data?.access_token || "").trim();
      if (response.ok && token) {
        console.log("Zoho token refresh succeeded using", accountsBase);
        return token;
      }

      const details = extractZohoError(data) || raw || `HTTP ${response.status}`;
      errors.push(`${accountsBase}: ${details}`);
      console.error("Zoho token refresh failed on", accountsBase, details);
    } catch (err) {
      const details = err?.message || "Network error";
      errors.push(`${accountsBase}: ${details}`);
      console.error("Zoho token refresh fetch error on", accountsBase, details);
    }
  }

  throw new Error(errors[0] || "Zoho token refresh failed");
}

async function sendViaZoho({ config, accessToken, payload }) {
  const errors = [];

  for (const apiBase of config.apiBases) {
    const endpoint = `${apiBase}/api/accounts/${encodeURIComponent(config.accountId)}/messages`;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "Authorization": `Zoho-oauthtoken ${accessToken}`
        },
        body: payload
      });

      const raw = await response.text();
      const result = safeJsonParse(raw);
      console.log("Zoho response status:", response.status, "Host:", apiBase);

      if (!response.ok) {
        const details = extractZohoError(result) || raw || "Unknown error";
        errors.push({ status: response.status, details });
        console.error("Zoho API HTTP error on", apiBase, details);
        continue;
      }

      const zohoCode = Number(result?.status?.code || 200);
      if (zohoCode !== 200) {
        const details = extractZohoError(result) || "Unknown error";
        errors.push({ status: 502, details });
        console.error("Zoho API payload error on", apiBase, details);
        continue;
      }

      return { ok: true, result };
    } catch (err) {
      const details = err?.message || "Network error";
      errors.push({ status: 502, details });
      console.error("Zoho API fetch error on", apiBase, details);
    }
  }

  return {
    ok: false,
    status: errors[0]?.status || 502,
    details: errors[0]?.details || "Unknown error"
  };
}

function resolveZohoApiBases(env, fromAddress, toAddress) {
  const configured = normalizeBaseUrl(envValue(env, ["ZOHO_MAIL_API_BASE", "ZOHO_API_BASE"]));
  const defaults = inferPreferEuZoho(env, fromAddress, toAddress)
    ? ["https://mail.zoho.eu", "https://mail.zoho.com"]
    : ["https://mail.zoho.com", "https://mail.zoho.eu"];

  return uniqueNonEmpty([configured, ...defaults]);
}

function resolveZohoAccountsBases(env, fromAddress, toAddress) {
  const configured = normalizeBaseUrl(envValue(env, ["ZOHO_ACCOUNTS_BASE", "ZOHO_ACCOUNT_BASE"]));
  const defaults = inferPreferEuZoho(env, fromAddress, toAddress)
    ? ["https://accounts.zoho.eu", "https://accounts.zoho.com"]
    : ["https://accounts.zoho.com", "https://accounts.zoho.eu"];

  return uniqueNonEmpty([configured, ...defaults]);
}

function inferPreferEuZoho(env, fromAddress, toAddress) {
  const regionHint = String(envValue(env, ["ZOHO_REGION"]) || "").trim().toLowerCase();
  if (regionHint === "eu") return true;
  if (regionHint === "com" || regionHint === "us") return false;

  const addressHint = `${fromAddress} ${toAddress}`;
  return /@[^@\s]+\.eu\b/i.test(addressHint);
}

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function uniqueNonEmpty(values) {
  return [...new Set(values.filter(Boolean))];
}

function envValue(env, names) {
  for (const name of names) {
    const value = String(env?.[name] || "").trim();
    if (value) return value;
  }
  return "";
}

function buildConfigValidationError({ accountId, hasDirectToken, refreshToken, clientId, clientSecret }) {
  if (!accountId) {
    return "Missing account ID. Set ZOHO_MAIL_ACCOUNT_ID (or ZOHO_ACCOUNT_ID).";
  }

  if (hasDirectToken) {
    return "";
  }

  const refreshParts = {
    refreshToken: Boolean(refreshToken),
    clientId: Boolean(clientId),
    clientSecret: Boolean(clientSecret)
  };

  if (refreshParts.refreshToken && refreshParts.clientId && refreshParts.clientSecret) {
    return "";
  }

  if (refreshParts.refreshToken || refreshParts.clientId || refreshParts.clientSecret) {
    const missing = [];
    if (!refreshParts.refreshToken) missing.push("ZOHO_MAIL_REFRESH_TOKEN (or ZOHO_REFRESH_TOKEN)");
    if (!refreshParts.clientId) missing.push("ZOHO_MAIL_CLIENT_ID (or ZOHO_CLIENT_ID)");
    if (!refreshParts.clientSecret) missing.push("ZOHO_MAIL_CLIENT_SECRET (or ZOHO_CLIENT_SECRET)");
    return `Incomplete refresh-token auth. Missing: ${missing.join(", ")}.`;
  }

  return "Missing auth. Set ZOHO_MAIL_ACCESS_TOKEN (or ZOHO_ACCESS_TOKEN), or set all of ZOHO_MAIL_REFRESH_TOKEN, ZOHO_MAIL_CLIENT_ID, ZOHO_MAIL_CLIENT_SECRET.";
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
