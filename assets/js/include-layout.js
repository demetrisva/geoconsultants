// /assets/js/include-layout.js
// Dynamically includes header/footer and highlights the active nav item
(async function () {
  const includeTargets = document.querySelectorAll('[data-include]');
  await Promise.all([...includeTargets].map(async (el) => {
    const url = el.getAttribute('data-include');
    const res = await fetch(url, { cache: 'no-cache' });
    el.innerHTML = await res.text();
  }));

  // Highlight active menu link
  const path = location.pathname.replace(/\/+$/, '') || '/index.html';
  const current = path.endsWith('/contact.html') ? 'contact' : 'home';
  document.querySelectorAll('[data-nav]').forEach((a) => {
    if (a.dataset.nav === current) a.classList.add('active');
  });
})();
