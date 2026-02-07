# GEONIQUE CONSULTANTS Website

Single-page static site for GEONIQUE CONSULTANTS (Nicosia, Cyprus).

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

## Contact Form Email (Zoho Mail)
- The contact form posts to `/api/contact` (Cloudflare Pages Function).
- Configure these environment variables in Cloudflare Pages:
- `ZOHO_MAIL_ACCOUNT_ID` (optional but recommended; if omitted, the function will try to resolve it from Zoho API)
- `ZOHO_MAIL_FROM` (recommended: `info@geoconsultants.eu`)
- `ZOHO_MAIL_TO` (recommended: `info@geoconsultants.eu`)
- Optional: `ZOHO_MAIL_API_BASE` (`https://mail.zoho.com` or region-specific host like `https://mail.zoho.eu`)
- Token option A (quick test): `ZOHO_MAIL_ACCESS_TOKEN`
- Token option B (recommended auto-refresh):
- `ZOHO_MAIL_REFRESH_TOKEN`
- `ZOHO_MAIL_CLIENT_ID`
- `ZOHO_MAIL_CLIENT_SECRET`
- Optional for token refresh region: `ZOHO_ACCOUNTS_BASE` (`https://accounts.zoho.com` or `https://accounts.zoho.eu`)
- Optional for explicit region preference: `ZOHO_REGION` (`eu` or `com`)
- Alias env names also supported: `ZOHO_ACCOUNT_ID`, `ZOHO_ACCESS_TOKEN`, `ZOHO_REFRESH_TOKEN`, `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`

### Zoho region behavior
- If you do not set `ZOHO_MAIL_API_BASE` / `ZOHO_ACCOUNTS_BASE`, the function auto-picks Zoho EU first for `.eu` mailboxes, then falls back to `.com`.
- This helps avoid failed sends when Zoho resources were created in the EU data center.

### Troubleshooting
- If the form shows `Server configuration error`, check the response details shown under the button. It now tells you exactly which env key is missing.
- If account auto-resolution fails, set `ZOHO_MAIL_ACCOUNT_ID` explicitly.

## Customization
- Colors and typography in `:root` (style.css).
- Logo is inline SVG in `<head>` (symbols `logo-wordmark` and `logo-mark`).
