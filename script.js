// ===== Geonique Consultants Main Script =====

// Mobile menu toggle (Reverted to original logic)
const toggle = document.querySelector('.menu-toggle');
const menu = document.querySelector('.menu');
if (toggle && menu) {
  toggle.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', isOpen);
  });

  // Add click listener to all menu links to close the menu
  document.querySelectorAll('.menu a').forEach(link => {
    link.addEventListener('click', () => {
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id && id.length > 1) {
      const el = document.querySelector(id);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (menu) menu.classList.remove('open'); // Close menu on click
      }
    }
  });
});

// Reveal on scroll
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.transform = 'translateY(0)';
      entry.target.style.opacity = '1';
    }
  });
}, { threshold: .12, rootMargin: '0px 0px -80px 0px' });

document.querySelectorAll('.card,.step,.quote').forEach(el => {
  if (el) { // Check if element exists
    el.style.transform = 'translateY(14px)';
    el.style.opacity = '0';
    el.style.transition = 'transform 0.5s ease, opacity 0.5s ease';
    observer.observe(el);
  }
});

// Back to top visibility
const toTop = document.getElementById('toTop');
if (toTop) {
  window.addEventListener('scroll', () => {
    // This line was broken before. It is now fixed.
    toTop.style.display = window.scrollY > 600 ? 'flex' : 'none';
  });
  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// Year
const yearEl = document.getElementById('year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

// Contact form handler
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");
  const btn = document.getElementById("submitBtn");
  const statusEl = document.getElementById("form-status");
  const widget = document.getElementById("turnstile-widget");

  function showStatus(msg, isError = false) {
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.textContent = msg;
      // Re-themed status colors
      statusEl.style.color = isError ? '#D9534F' : '#3D8B6C'; // Red / Green
      statusEl.style.background = isError ? 'rgba(217, 83, 79, 0.1)' : 'rgba(61, 139, 108, 0.1)';
      statusEl.style.border = isError ? '1px solid #D9534F' : '1px solid #3D8B6C';
      statusEl.style.borderRadius = '8px'; // Back to rounded
    }
  }

  async function handleSubmit(e) {
    if (!form || !btn || !statusEl) return; // Safety check

    e.preventDefault(); // This is the line that was not running

    btn.disabled = true;
    showStatus("Sending…");

    const token = (window.turnstile && widget) ? turnstile.getResponse(widget) : "";

    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      subject: form.subject.value.trim() || "Website contact",
      message: form.message.value.trim(),
      token
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        showStatus("✅ Thank you! Your message has been sent.");
        form.reset();
      } else {
        const errText = [data.error, data.details].filter(Boolean).join(": ");
        showStatus(`⚠️ ${errText || "Message failed. Please try again."}`, true);
      }
    } catch {
      showStatus("⚠️ Network error. Please try again.", true);
    } finally {
      try {
        if (window.turnstile) turnstile.reset(widget);
      } catch { }
      btn.disabled = false;
    }
  }

  if (form) form.addEventListener("submit", handleSubmit);
});

// ===== COOKIE BANNER SCRIPT =====
document.addEventListener("DOMContentLoaded", () => {
  const consentBanner = document.getElementById("cookie-consent-banner");
  const acceptBtn = document.getElementById("cookie-accept");
  const declineBtn = document.getElementById("cookie-decline");

  if (!consentBanner || !acceptBtn || !declineBtn) return; // Safety check

  // Helper functions for cookies
  function setCookie(name, value, days) {
    let expires = "";
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
  }

  function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) == ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  // Check if consent was already given
  if (!getCookie("cookie_consent")) {
    // Show the banner
    consentBanner.style.display = "flex";
    setTimeout(() => {
      consentBanner.classList.add("show");
    }, 100); // Small delay to ensure transition works
  }

  // Accept cookies
  acceptBtn.addEventListener("click", () => {
    setCookie("cookie_consent", "accepted", 365);
    consentBanner.classList.remove("show");
    setTimeout(() => {
      consentBanner.style.display = "none";
    }, 500);
  });

  // Decline cookies
  declineBtn.addEventListener("click", () => {
    setCookie("cookie_consent", "declined", 365); // Remember the choice
    consentBanner.classList.remove("show");
    setTimeout(() => {
      consentBanner.style.display = "none";
    }, 500);
  });
});
