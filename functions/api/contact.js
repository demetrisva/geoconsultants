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
  
  // Check env vars
  if (!env.RESEND_API_KEY) {
    console.error("Missing RESEND_API_KEY");
    return jsonResponse({ error: "Server configuration error" }, 500);
  }
  
  console.log("Preparing email for Resend");
  
  // Build email payload
  const emailData = {
    from: "GeoConsultants <noreply@geoconsultants.eu>",
    to: ["info@geoconsultants.eu"],
    reply_to: email,
    subject: `Contact Form: ${subject}`,
    text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
  };
  
  // Send via Resend
  try {
    console.log("Calling Resend API");
    
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.RESEND_API_KEY}`
      },
      body: JSON.stringify(emailData)
    });
    
    const result = await response.json();
    console.log("Resend response status:", response.status);
    
    if (!response.ok) {
      console.error("Resend error:", result);
      return jsonResponse({
        error: "Failed to send email",
        details: result.message || "Unknown error"
      }, response.status);
    }
    
    console.log("Email sent successfully, ID:", result.id);
    return jsonResponse({ 
      success: true, 
      message: "Email sent successfully",
      id: result.id 
    }, 200);
    
  } catch (err) {
    console.error("Resend fetch error:", err.message);
    return jsonResponse({
      error: "Network error",
      message: err.message
    }, 502);
  }
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
