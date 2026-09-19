// Acesso de leitura ao Drive a partir do site, com a conta de serviço.
// Serve pra entregar o WAV original sem copiar nada pra prateleira.

let cache = { token: null, exp: 0 };

function b64url(buf) {
  let s = '';
  const b = new Uint8Array(buf);
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pkcs8(pem) {
  const corpo = pem.replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '');
  const raw = atob(corpo);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out.buffer;
}

export async function driveToken(env) {
  if (cache.token && Date.now() < cache.exp - 60000) return cache.token;
  if (!env.GDRIVE_SA_JSON) throw new Error('chave do Drive nao configurada');

  const sa = JSON.parse(env.GDRIVE_SA_JSON);
  const iat = Math.floor(Date.now() / 1000);
  const enc = (o) => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const head = enc({ alg: 'RS256', typ: 'JWT' });
  const body = enc({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat, exp: iat + 3600
  });

  const key = await crypto.subtle.importKey(
    'pkcs8', pkcs8(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${head}.${body}`)
  );

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${head}.${body}.${b64url(sig)}`
    })
  });
  if (!r.ok) throw new Error('Google recusou a chave');
  const j = await r.json();
  cache = { token: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return cache.token;
}

export async function driveFile(env, id, range) {
  const h = { authorization: 'Bearer ' + (await driveToken(env)) };
  if (range) h.range = range;
  return fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media&supportsAllDrives=true`, { headers: h });
}
