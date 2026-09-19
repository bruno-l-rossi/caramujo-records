// Cookie assinado do painel. A senha do painel é a chave da assinatura.

export const COOKIE = 'caramujo_painel';
export const DIAS = 30;

export async function assinar(env, exp) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(env.PAINEL_SENHA),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('painel:' + exp));
  const hex = [...new Uint8Array(sig)].map((n) => n.toString(16).padStart(2, '0')).join('');
  return btoa(String(exp)) + '.' + hex.slice(0, 32);
}

export function igual(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function autenticado(request, env) {
  if (!env.PAINEL_SENHA) return false;
  const raw = request.headers.get('cookie') || '';
  const m = raw.match(new RegExp(COOKIE + '=([^;]+)'));
  if (!m) return false;
  const pedaco = m[1].split('.');
  if (pedaco.length !== 2) return false;
  let exp;
  try { exp = Number(atob(pedaco[0])); } catch { return false; }
  if (!exp || Date.now() > exp) return false;
  return igual(m[1], await assinar(env, exp));
}
