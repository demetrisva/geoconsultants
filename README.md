# GEO CONSULTANTS Website

Single-page static site for GEO CONSULTANTS (Nicosia, Cyprus).

## Structure
- index.html — content and inline SVG logo
- style.css — global styles and responsive layout

## Local Development
1. Open index.html in a browser (no build step).
2. Edit text in sections: Home, About, Services, Why Cyprus, Contact.
3. Update phone and address in the Contact card when available.

## Deployment
- GitHub Pages: push to `main`, enable Pages → Source: `main` /root.
- Cloudflare Pages: new project from repo, framework: None (static).
- Any static host: upload index.html and style.css.

## Customization
- Colors and typography in `:root` (style.css).
- Logo is inline SVG in `<head>` (symbols `logo-wordmark` and `logo-mark`).
