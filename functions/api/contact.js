<form id="contact-form">
  <input type="text" name="name" placeholder="Full name" required />
  <input type="email" name="email" placeholder="Email" required />
  <input type="text" name="subject" placeholder="Subject" />
  <textarea name="message" placeholder="How can we help?" required></textarea>

  <!-- Cloudflare Turnstile widget -->
  <div id="cf-box"
       class="cf-turnstile"
       data-sitekey="0x4AAAAAAB8nNFBp5UdYGwol"
       data-callback="onTurnstileDone">
  </div>

  <button type="submit">Send</button>
  <p id="form-status" hidden></p>
</form>

<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
<script>
  let widgetId = null;
  window.onloadTurnstileCallback = function () {
    // If you want to manually render, but the data-sitekey above auto-renders already.
  };
  function onTurnstileDone() { /* optional: called when token ready */ }

  document.getElementById('contact-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = document.getElementById('form-status');
    status.hidden = false;
    status.textContent = 'Sending…';

    // Grab fields
    const form = e.target;
    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      subject: form.subject.value.trim() || 'Website contact',
      message: form.message.value.trim(),
      token: turnstile.getResponse(document.querySelector('.cf-turnstile')) // Turnstile token
    };

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (res.ok) {
        status.textContent = 'Thank you! Your message has been sent.';
        form.reset();
        turnstile.reset(document.querySelector('.cf-turnstile'));
      } else {
        status.textContent = json.error || 'Could not send message. Please try again.';
        turnstile.reset(document.querySelector('.cf-turnstile'));
      }
    } catch (err) {
      status.textContent = 'Network error. Please try again.';
      turnstile.reset(document.querySelector('.cf-turnstile'));
    }
  });
</script>
