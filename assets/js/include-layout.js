/* Base */
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: "Segoe UI", Arial, sans-serif;
  background: linear-gradient(135deg, #111, #1c1c1c);
  color: #fff;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Header */
.site-header {
  position: sticky; top: 0;
  background: rgba(0,0,0,.8);
  backdrop-filter: blur(6px);
  border-bottom: 1px solid rgba(255,255,255,.08);
  z-index: 10;
}
.site-header .container {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 0;
}
.brand {
  color: #ffd66b; text-decoration: none; font-weight: 700; letter-spacing: .5px;
}
.nav a {
  color: #fff; text-decoration: none; margin-left: 22px; font-weight: 500; transition: .25s;
}
.nav a:hover { color: #ffd66b; }
.nav a.active { color: #ffd66b; border-bottom: 2px solid #ffd66b; padding-bottom: 2px; }

/* Footer */
.site-footer {
  margin-top: auto;
  background: #0e0e0e; color: #aaa; text-align: center; padding: 26px 0;
}
.site-footer a { color: #ffd66b; text-decoration: none; }

/* Hero (index) */
.hero {
  min-height: calc(100vh - 140px);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; padding: 20px; position: relative; overflow: hidden;
}
.hero::before {
  content: ""; position: absolute; inset: -50%;
  background: radial-gradient(circle at center, rgba(198,161,54,0.25) 0%, transparent 60%);
  animation: glow 9s linear infinite alternate;
}
@keyframes glow {
  from { transform: translate(-6%, -6%) scale(1); }
  to   { transform: translate(6%, 6%) scale(1.15); }
}
.hero img {
  width: 220px; max-width: 60%; margin-bottom: 28px; animation: float 5s ease-in-out infinite;
}
@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
.hero h2 { font-size: 2rem; color: #ffd66b; margin-bottom: 10px; }
.hero p { max-width: 680px; color: #ddd; }

/* Contact form */
.form-card {
  background: rgba(255,255,255,.08);
  padding: 32px; border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0,0,0,.3);
  width: min(520px, 92%);
  margin: 60px auto;
}
.form-card h2 { color: #ffd66b; margin: 0 0 16px; text-align: center; }
.form-card input, .form-card textarea {
  width: 100%; padding: 12px; margin: 8px 0 12px;
  border: none; border-radius: 6px; background: #222; color: #fff;
}
.form-card button {
  width: 100%; background: #c6a136; color: #fff; border: none;
  padding: 12px 20px; border-radius: 6px; cursor: pointer; transition: .25s; font-size: 16px;
}
.form-card button:hover { background: #e0b649; }
.form-card #formMessage { margin-top: 12px; text-align: center; font-weight: 600; }
main.page { padding-top: 70px; } /* spacing below sticky header */
