// Cloudflare Pages Function: /api/contact
// Sends email via MailChannels. Optional Turnstile verification if env.TURNSTILE_SECRET is set.

export async function onRequestOptions() {
  return new Response('', {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function onRequestPost({ request, env }) {
  try {
    const { name = '', email = '', message = '', turnstileToken = '' } = await request.json();

    // Basic validation
    if (!name.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !message.trim()) {
      return json({ error: 'Invalid input' }, 400);
    }

    // Optional Turnstile verification (only if you defined TURNSTILE_SECRET in Pages > Settings > Environment Variables)
    if (env.TURNSTILE_SECRET) {
      if (!turnstileToken) return json({ error: 'Missing verification token' }, 400);

      const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: env.TURNSTILE_SECRET,
          response: turnstileToken,
          remoteip: request.headers.get('CF-Connecting-IP') || undefined,
        }),
      }).then(r => r.json());

      if (!verify.success) {
        return json({ error: 'Verification failed', detail: verify['error-codes'] }, 403);
      }
    }

    // Build MailChannels payload
    const text = `New contact form submission:

Name: ${name}
Email: ${email}

Message:
${message}`;

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5">
        <h2 style="margin:0 0 12px">New contact form submission</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <hr style="border:none;border-top:1px solid #ddd;margin:12px 0">
        <pre style="white-space:pre-wrap;font:inherit">${escapeHtml(message)}</pre>
      </div>`;

    const payload = {
      personalizations: [{
        to: [{ email: 'info@geoconsultants.eu', name: 'GeoConsultants' }],
        reply_to: [{ email, name }],
      }],
      from: { email: 'info@geoconsultants.eu', name: 'GeoConsultants Website' },
      subject: `New message from ${name}`,
      content: [
        { type: 'text/plain', value: text },
        { type: 'text/html',  value: html },
      ],
    };

    const mcRes = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const bodyText = await mcRes.text();

    if (!mcRes.ok) {
      // Return MailChannels error to the browser so we can see what's wrong in DevTools
      return json({ error: 'Mail send failed', detail: bodyText }, 502);
    }

    return json({ success: true });
  } catch (e) {
    return json({ error: e.message || String(e) }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
