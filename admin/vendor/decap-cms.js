export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1) Start OAuth
    if (url.pathname === '/auth' && request.method === 'GET') {
      const redirect_uri = `${url.origin}/callback`;
      const state = crypto.randomUUID();
      const authUrl = new URL('https://github.com/login/oauth/authorize');
      authUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', redirect_uri);
      authUrl.searchParams.set('scope', 'repo');
      authUrl.searchParams.set('state', state);
      return Response.redirect(authUrl.toString(), 302);
    }

    // 2) GitHub -> back here with ?code=...
    if (url.pathname === '/callback' && request.method === 'GET') {
      const code = url.searchParams.get('code');
      if (!code) return new Response('Missing code', { status: 400 });

      const body = new URLSearchParams();
      body.set('client_id', env.GITHUB_CLIENT_ID);
      body.set('client_secret', env.GITHUB_CLIENT_SECRET);
      body.set('code', code);

      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body
      });
      const tokenData = await tokenRes.json();
      const token = tokenData.access_token || '';

      // 3) Post back to the opener using ALL known Decap/Netlify CMS formats
      const html = `<!doctype html>
<html><body>
<script>
(function(){
  var token = ${JSON.stringify(token)};
  function sendAll(){
    try {
      if (window.opener) {
        // New Decap format seen in the wild
        window.opener.postMessage({ type: 'authorization_response', provider: 'github', token: token }, '*');
        // Common object format
        window.opener.postMessage({ token: token, provider: 'github' }, '*');
        // Legacy string format used by some examples
        window.opener.postMessage('authorization:github:success:' + token, '*');
      }
    } catch (e) {}
  }
  sendAll();
  setTimeout(sendAll, 200);
  setTimeout(function(){ window.close(); }, 400);
})();
</script>
</body></html>`;
      return new Response(html, { headers: { 'Content-Type': 'text/html' } });
    }

    return new Response('Not found', { status: 404 });
  }
}
