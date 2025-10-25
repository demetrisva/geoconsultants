// /assets/js/include-layout.js
(async function () {
  // Inject header/footer partials
  const includeTargets = document.querySelectorAll('[data-include]');
  await Promise.all([...includeTargets].map(async (el) => {
    const url = el.getAttribute('data-include');
    const res = await fetch(url, { cache: 'no-cache' });
    el.innerHTML = await res.text();
  }));

  // Highlight active navigation link
  const path = location.pathname.replace(/\/+$/, '') || '/index.html';
  const current = path.endsWith('/contact.html') ? 'contact' : 'home';
  document.querySelectorAll('[data-nav]').forEach((a) => {
    if (a.dataset.nav === current) a.classList.add('active');
  });
})();
