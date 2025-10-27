export const onRequestPost = async (context) => {
  const { request, env } = context;

  // CORS (optional: restrict to your domain)
  const cors = {
    'Access-Control-Allow-Origin': 'https://www.geoconsultants.eu',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400, cors);
  }

  const { name = '', email = '', subject = 'Website contact', message = '', token = '' } = data;

  if (!name || !email || !message || !token) {
    return json({ error: 'Missing required fields' }, 400, cors);
  }

  // 1) Verify Turnstile
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({
      secret: env.TURNSTILE_SECRET,
      response: token,
      remoteip: ip
    })
  });
  const verify = await verifyRes.json();
  if (!verify.success) {
    return json({ error: 'Turnstile verification failed' }, 403, cors);
  }

  // 2) Send mail via MailChannels
  const toEmail = env.MAIL_TO;         // e.g., "info@geoconsultants.eu"
  const fromEmail = env.MAIL_FROM;     // e.g., "noreply@geoconsultants.eu"
  const bodyText =
`New website enquiry:

Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}

IP: ${ip}`;

  const mail = {
    personalizations: [{ to: [{ email: toEmail }] }],
    from: { email: fromEmail, name: 'GeoConsultants Website' },
    subject: `Contact Form: ${subject}`.slice(0, 200),
    content: [
      { type: 'text/plain', value: bodyText }
    ],
    reply_to: { email, name }
  };

  const mailRes = await fetch('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mail)
  });

  if (!mailRes.ok) {
    const errTxt = await mailRes.text();
    return json({ error: 'Mail provider error', details: errTxt }, 502, cors);
  }

  return json({ ok: true }, 200, cors);
};

function json(obj, status = 200, headers = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  });
}
