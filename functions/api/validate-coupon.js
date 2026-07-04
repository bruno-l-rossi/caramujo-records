/**
 * Cloudflare Pages Function: validate-coupon
 * POST /api/validate-coupon  { code: "CARAMUJO25" }
 *
 * Valida um cupom lendo functions/coupons.json direto do GitHub (fonte da
 * verdade, sempre fresca mesmo antes do redeploy). Os códigos não aparecem
 * mais no código-fonte da página: o front só envia o que o cliente digitou.
 *
 * Respostas:
 *   { valid: true,  pct: 25 }            — desconto percentual
 *   { valid: true,  fixedPrice: 99 }     — preço final travado
 *   { valid: false, reason: "not_found" | "expired" | "error" }
 *
 * Variáveis de ambiente: GITHUB_TOKEN (Contents: Read)
 */

const GITHUB_OWNER  = 'bruno-l-rossi';
const GITHUB_REPO   = 'caramujo-records';
const COUPONS_FILE  = 'functions/coupons.json';
const GITHUB_BRANCH = 'main';

async function fetchCoupons(githubToken) {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${COUPONS_FILE}?ref=${GITHUB_BRANCH}`,
    {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'caramujo-records-webhook/1.0',
      },
    }
  );
  if (!res.ok) throw new Error(`GitHub GET ${res.status}`);
  const { content } = await res.json();
  return JSON.parse(decodeURIComponent(escape(atob(content.replace(/\n/g, '')))));
}

export async function onRequestPost({ request, env }) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  let body;
  try { body = await request.json(); }
  catch { return Response.json({ valid: false, reason: 'error' }, { status: 400, headers: cors }); }

  const code = String(body?.code ?? '').trim().toUpperCase().slice(0, 30);
  if (!code) return Response.json({ valid: false, reason: 'not_found' }, { status: 200, headers: cors });

  try {
    const coupons = await fetchCoupons(env.GITHUB_TOKEN);
    const c = coupons[code];
    if (!c) return Response.json({ valid: false, reason: 'not_found' }, { status: 200, headers: cors });

    const maxUses = (c.maxUses === null || c.maxUses === undefined) ? Infinity : c.maxUses;
    if ((c.uses || 0) >= maxUses)
      return Response.json({ valid: false, reason: 'expired' }, { status: 200, headers: cors });

    const out = { valid: true };
    if (c.fixedPrice !== undefined && c.fixedPrice !== null) out.fixedPrice = c.fixedPrice;
    else out.pct = c.pct;
    return Response.json(out, { status: 200, headers: cors });
  } catch (e) {
    console.error('[validate-coupon] Erro:', e.message);
    return Response.json({ valid: false, reason: 'error' }, { status: 200, headers: cors });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
