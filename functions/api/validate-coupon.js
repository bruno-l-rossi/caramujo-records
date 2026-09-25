/**
 * Cloudflare Pages Function: validate-coupon
 * POST /api/validate-coupon  { code: "CARAMUJO25" }
 *
 * Valida um cupom lendo a tabela cupons do D1 (desde 24/09/2026; antes era
 * functions/coupons.json lido do GitHub). Os códigos não aparecem no código da
 * página: o front só envia o que o cliente digitou.
 *
 * Respostas:
 *   { valid: true,  pct: 25 }            — desconto percentual
 *   { valid: true,  fixedPrice: 99 }     — preço final travado
 *   { valid: false, reason: "not_found" | "expired" | "error" }
 * Cupom pausado no painel responde "expired".
 */

import { db } from '../_lib/db.js';
import { lerCupom, situacaoCupom } from '../_lib/loja.js';

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
    const d = await db(env);
    const c = await lerCupom(d, code);
    const situacao = situacaoCupom(c);
    if (situacao !== 'ok') return Response.json({ valid: false, reason: situacao }, { status: 200, headers: cors });

    const out = { valid: true };
    if (c.preco_fixo !== undefined && c.preco_fixo !== null) out.fixedPrice = c.preco_fixo;
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
