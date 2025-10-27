// functions/api/contact.js

export async function onRequest(context) {
  const { request, env } = context;
  
  // Handle OPTIONS (CORS preflight)
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
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
  
  // Check env vars
  if (!env.MAIL_FROM || !env.MAIL_TO) {
    console.error("Missing environment variables");
    return jsonResponse({ error: "Server configuration error" }, 500);
  }
  
  console.log("Preparing email for MailChannels");
  
  // Build email
  const mailData = {
    personalizations: [{
      to: [{ email: env.MAIL_TO }]
    }],
    from: {
      email: env.MAIL_FROM,
      name: "GeoConsultants Contact Form"
    },
    subject: `Contact Form: ${subject}`,
    content: [{
      type: "text/plain",
      value: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
    }],
    reply_to: {
      email: email,
      name: name
    }
  };
  
  // Send via MailChannels
  try {
    console.log("Calling MailChannels API");
    
    const mailResponse = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(mailData)
    });
    
    console.log("MailChannels response status:", mailResponse.status);
    
    if (!mailResponse.ok) {
      const errorText = await mailResponse.text();
      console.error("MailChannels error:", errorText);
      return jsonResponse({
        error: "Failed to send email",
        details: errorText.substring(0, 200)
      }, 502);
    }
    
    console.log("Email sent successfully");
    return jsonResponse({ success: true, message: "Email sent successfully" }, 200);
    
  } catch (err) {
    console.error("MailChannels fetch error:", err.message);
    return jsonResponse({
      error: "Network error",
      message: err.message
    }, 502);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
