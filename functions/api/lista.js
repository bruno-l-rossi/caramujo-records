// Lista de e-mails com cupom de 15% (11/10/2026; era 25% até 17/10, _lib/lista.js).
//   POST /api/lista { email, de }   entra na lista; o cupom vai pro e-mail
//   GET  /api/lista?sair=<token>     sai da lista (o link do rodapé do e-mail)
import { db, json } from '../_lib/db.js';
import { entrar, sair, enviarCupom, ipDe, esperaReenvio, REENVIO_S, PCT } from '../_lib/lista.js';
import { paginaAviso } from '../_lib/pedidopagina.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const txt = await request.text().catch(() => '');
  if (!txt || txt.length > 1000) return json({ erro: 'pedido torto' }, 400);
  let b = null;
  try { b = JSON.parse(txt); } catch (_) { /* segue nulo */ }
  if (!b || typeof b !== 'object') return json({ erro: 'pedido torto' }, 400);
  const d = await db(env);
  const ip = await ipDe(request, env.PAINEL_SENHA || '');
  const r = await entrar(d, { email: b.email, origem: b.de, ip });
  if (r.erro) return json({ erro: r.erro }, r.http || 400);
  // cupom novo, ou o mesmo de novo (pediu outra vez e o cupom ainda vale): manda o e-mail.
  // Espera o Resend responder (12/10/2026) pra quem se cadastrou saber se o e-mail saiu.
  // rodada R: devolve também até quando o cupom vale (o lembrete da página da tape) e quantos
  // segundos faltam pro próximo reenvio (a contagem do botão)
  let enviado = null, espera = 0;
  if (r.cupom) {
    espera = r.status === 'novo' ? 0 : await esperaReenvio(d, r.email);
    if (!espera) { enviado = (await enviarCupom(env, r, d)).ok; espera = enviado ? REENVIO_S : 0; }
    else enviado = 'recente';
  }
  return json({ ok: true, status: r.status, enviado, valeAte: r.cupom ? r.valeAte || null : null, pct: PCT, espera });
}

export async function onRequestGet({ request, env }) {
  const token = new URL(request.url).searchParams.get('sair');
  let ok = false;
  try { ok = await sair(await db(env), token); } catch (_) { ok = false; }
  const html = ok
    ? paginaAviso('Pronto, você saiu da lista', 'Não chega mais e-mail da Caramujo pra você. Se mudar de ideia, é só se cadastrar de novo no site.', null, 'Lista')
    : paginaAviso('Link de saída inválido', 'Esse link não bate com nenhum cadastro. Se ainda chega e-mail, responde ele que a gente tira na mão.', null, 'Lista');
  return new Response(html, { status: ok ? 200 : 404, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
}
