// ===== GeoConsultants Main Script =====

// Mobile menu toggle (Reverted to original logic)
const toggle = document.querySelector('.menu-toggle');
const menu = document.querySelector('.menu');
if (toggle) toggle.addEventListener('click', () => {
    menu.classList.toggle('open');
    // We also need to update the toggle's aria-expanded state
    const isOpen = menu.classList.contains('open');
    toggle.setAttribute('aria-expanded', isOpen);
});

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
  if(el) { // Check if element exists
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
    toTop.style.display = window.scrollY > 600 ? 'flex' : 'none. ';
    });
}

// End of GeoConsultants Main Script