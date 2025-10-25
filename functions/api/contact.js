// /functions/api/contact.js
export const onRequestPost = async ({ request }) => {
  try {
    const data = await request.json();

    // Basic validation/sanitization
    const nonEmpty = (v) => typeof v === 'string' && v.trim().length > 0;
    if (!nonEmpty(data.name) || !nonEmpty(data.email) || !nonEmpty(data.message)) {
      return json({ error: 'Missing required fields' }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return json({ error: 'Invalid email' }, 400);
    }

    const html = `
      <div style="font-family:Segoe UI,Arial,sans-serif">
        <h2>New Website Inquiry — GeoConsultants</h2>
        <p><strong>Name:</strong> ${esc(data.name)}</p>
        <p><strong>Email:</strong> ${esc(data.email)}</p>
        ${data.phone ? `<p><strong>Phone:</strong> ${esc(data.phone)}</p>` : ''}
        ${data.service ? `<p><strong>Service:</strong> ${esc(data.service)}</p>` : ''}
        <hr style="border:none;border-top:1px solid #ddd;margin:12px 0;" />
        <p><strong>Message:</strong></p>
        <pre style="white-space:pre-wrap; font-family:inherit;">${esc(data.message)}</pre>
      </div>`.trim();

    // Send with MailChannels
    const r = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: 'info@geoconsultants.eu', name: 'GeoConsultants' }] }],
        from: { email: 'noreply@geoconsultants.eu', name: 'Website Form' },
        reply_to: [{ email: data.email, name: data.name }],
        subject: `Website contact from ${data.name}`,
        content: [{ type: 'text/html', value: html }]
      })
    });

    if (!r.ok) {
      const t = await r.text();
      return json({ error: 'MailChannels error', details: t.slice(0, 200) }, 502);
    }

    return json({ ok: true });
  } catch {
    return json({ error: 'Bad request' }, 400);
  }
};

function json(obj, status=200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}
function esc(s='') {
  return s.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#039;'}[ch]));
}
