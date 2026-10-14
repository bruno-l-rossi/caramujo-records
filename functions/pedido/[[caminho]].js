// O pedido com a entrega na hora dos beats (10/10/2026, _lib/pedidos.js).
//   /pedido/<token>               a página (arquivos, contrato, ajuda)
//   /pedido/<token>/wav/<beat>    o WAV direto do Drive (o mesmo arquivo da tape)
//   /pedido/<token>/mp3/<beat>    o MP3 da prateleira (R2)
//   /pedido/<token>/contrato      o contrato, refeito com os dados do Mercado Pago
//   /pedido/<token>/estado        { status } (a página do PIX pendente pergunta)
//   POST /pedido/<token>/envio/<k> o material do serviço k (vozes, faixa ou referência; 12/10/2026)
// O token (24 letras) é a chave: sem ele, 404. Pedido pendente não entrega arquivo.

import { db, json } from '../_lib/db.js';
import { paginaErro } from '../_lib/erro.js';
import { CABECALHOS } from '../_lib/cabecalhos.js';
import { driveFile } from '../_lib/drive.js';
import { contratoHtml } from '../_lib/emails.js';
import { lerPedido, marcarPago, contarDownload, TETO_DOWNLOADS, limparEnvio, salvarEnvio } from '../_lib/pedidos.js';
import { avisarEnvio } from '../_lib/servicoemails.js';
import { paginaPedido, paginaAviso } from '../_lib/pedidopagina.js';

const PRIVADO = { 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex, nofollow', 'referrer-policy': 'no-referrer' };
const html = (corpo, status = 200) => new Response(corpo, { status, headers: { ...CABECALHOS, ...PRIVADO, 'content-type': 'text/html; charset=utf-8' } });

// "COTIDIANO Gm 169bpm (prod. @rideblan33).wav", igual ao download das pastas
function nomeArquivo(b, fmt) {
  const bits = [b.nome];
  if (b.key) bits.push(b.key);
  if (b.bpm) bits.push(b.bpm + 'bpm');
  return `${bits.join(' ')} (prod. @rideblan33).${fmt}`.replace(/[\\/:*?"<>|]/g, '-');
}
const anexo = (nome) => `attachment; filename*=UTF-8''${encodeURIComponent(nome)}`;

// Confere no Mercado Pago (pedido pendente). Pagou = vira 'pago' aqui mesmo.
async function conferirPagamento(env, d, p) {
  if (p.status !== 'pendente' || !p.pagamento || !env.MP_ACCESS_TOKEN) return p.status;
  try {
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(p.pagamento)}`, { headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}` } });
    if (!r.ok) return p.status;
    const pay = await r.json();
    if (pay.status === 'approved') { await marcarPago(d, p.pagamento); return 'pago'; }
  } catch (_) { /* fica pendente, a página pergunta de novo */ }
  return p.status;
}

// O contrato do pedido: o mesmo do e-mail, refeito com o que foi salvo no Mercado Pago na
// compra (nome, CPF, aceite). Pedido de teste: contrato de exemplo.
async function contrato(env, p) {
  const beats = (p.itens || []).filter((i) => i.t === 'beat').map((i) => i.nome).join(', ');
  if (p.status === 'teste') {
    return contratoHtml({ name: 'Pedido de teste', cpf: '00000000000', email: '-', items: beats, category: 'Catálogo de beats',
      amount: 0, paymentId: 'TESTE', termsTimestamp: p.criado_em, artistName: '@rideblan33', naHora: true });
  }
  if (!env.MP_ACCESS_TOKEN || !p.pagamento) return null;
  const r = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(p.pagamento)}`, { headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}` } });
  if (!r.ok) return null;
  const pay = await r.json();
  const meta = pay.metadata || {}, payer = pay.payer || {};
  const name = meta.buyer_name || p.nome || [payer.first_name, payer.last_name].filter(Boolean).join(' ');
  const cpf = String(meta.buyer_cpf || (payer.identification && payer.identification.number) || '').replace(/\D/g, '');
  if (!name || !cpf) return null;
  const itens = meta.items_display || beats;
  return contratoHtml({ name, cpf, email: meta.buyer_email || p.email || payer.email || '', items: itens, category: meta.category_label || itens,
    amount: pay.transaction_amount, paymentId: pay.id, termsTimestamp: meta.terms_ts || pay.date_approved || pay.date_created,
    artistName: meta.buyer_artist || p.artista || name, naHora: true });
}

export async function onRequestGet({ params, request, env }) {
  const partes = Array.isArray(params.caminho) ? params.caminho : params.caminho ? [params.caminho] : [];
  const [token, acao, beatId] = partes;
  if (!token || partes.length > 3) return paginaErro(request, env, 404);
  const d = await db(env);
  const p = await lerPedido(d, token);
  if (!p) return paginaErro(request, env, 404, { titulo: 'Esse pedido não abre', texto: 'Ou o link veio cortado, ou ele mudou. Chama o {direct} que a gente resolve.' });
  const base = '/pedido/' + p.token;

  if (acao === 'estado') {
    const status = await conferirPagamento(env, d, p);
    return json({ status }, 200, { 'cache-control': 'no-store' });
  }

  if (!acao) {
    if (p.status === 'pendente') p.status = await conferirPagamento(env, d, p);
    // tamanho dos arquivos (as faixas que ainda existem): uma consulta só
    const ids = [...new Set((p.itens || []).filter((i) => i.t === 'beat' && i.faixa).map((i) => i.faixa))];
    const faixas = new Map();
    if (ids.length) {
      const { results } = await d.prepare(`SELECT id, wav_bytes, mp3_bytes FROM tracks WHERE id IN (${ids.map(() => '?').join(', ')})`).bind(...ids).all();
      for (const r of results || []) faixas.set(r.id, r);
    }
    return html(paginaPedido(p, faixas));
  }

  const pago = p.status === 'pago' || p.status === 'teste';
  if (!pago) return html(paginaAviso('Esperando o pagamento', 'Os arquivos aparecem aqui assim que o PIX cair.', base), 403);

  if (acao === 'contrato') {
    const c = await contrato(env, p).catch(() => null);
    if (!c) return html(paginaAviso('Contrato fora do ar agora', 'Não consegui montar o contrato neste minuto. A via dele também está no seu e-mail de confirmação; se precisar, chama no Direct.', base), 502);
    const nome = 'contrato-caramujo-' + String(p.nome || 'pedido').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) + '.html';
    // A Cloudflare troca e-mail em HTML por "[email protected]" + um script que desfaz na tela;
    // no arquivo baixado o script não roda e o e-mail sumia (11/10/2026). email_off desliga isso.
    const semTroca = c.replace('<body>', '<body><!--email_off-->').replace('</body>', '<!--/email_off--></body>');
    return new Response(semTroca, { headers: { ...PRIVADO, 'content-type': 'text/html; charset=utf-8', 'content-disposition': anexo(nome) } });
  }

  if (acao !== 'wav' && acao !== 'mp3') return paginaErro(request, env, 404);
  const b = (p.itens || []).find((i) => i.t === 'beat' && String(i.id) === String(beatId) && i.faixa);
  if (!b) return paginaErro(request, env, 404);

  // conta o download (só o pedido inteiro, não cada pedaço que o navegador pede de novo)
  const range = request.headers.get('range');
  const inteiro = !range || /^bytes=0-/.test(range);
  if (inteiro) {
    const chave = acao + '-' + b.id;
    const ja = Number((p.baixados || {})[chave] || 0);
    if (ja >= TETO_DOWNLOADS) return html(paginaAviso('Limite de downloads', `Esse arquivo já saiu ${TETO_DOWNLOADS} vezes por este link. Chama no Direct que o @rideblan33 manda de novo.`, base), 429);
    await contarDownload(d, p, chave).catch(() => {});
  }

  if (acao === 'mp3') {
    const obj = env.AUDIO ? await env.AUDIO.get(`mp3/${b.faixa}.mp3`) : null;
    if (!obj) return html(paginaAviso('MP3 fora do ar agora', 'Baixa o WAV, que é o arquivo principal. Se precisar do MP3, chama no Direct.', base), 404);
    return new Response(obj.body, { headers: { ...PRIVADO, 'content-type': 'audio/mpeg', 'content-length': String(obj.size), 'content-disposition': anexo(nomeArquivo(b, 'mp3')) } });
  }

  let r;
  try { r = await driveFile(env, b.faixa, range); } catch (_) { r = null; }
  if (!r || (!r.ok && r.status !== 206)) return html(paginaAviso('WAV fora do ar agora', 'O Drive não entregou o arquivo neste minuto. Tenta de novo daqui a pouco; se continuar, chama no Direct.', base), 502);
  const h = new Headers(PRIVADO);
  h.set('content-type', 'audio/wav');
  h.set('content-disposition', anexo(nomeArquivo(b, 'wav')));
  h.set('accept-ranges', 'bytes');
  const len = r.headers.get('content-length'), cr = r.headers.get('content-range');
  if (len) h.set('content-length', len);
  if (cr) h.set('content-range', cr);
  return new Response(r.body, { status: r.status, headers: h });
}

// O material do serviço (12/10/2026): JSON pelo fetch da página, ou o formulário normal (sem JS)
export async function onRequestPost({ params, request, env, waitUntil }) {
  const partes = Array.isArray(params.caminho) ? params.caminho : params.caminho ? [params.caminho] : [];
  const [token, acao, kTxt] = partes;
  if (acao !== 'envio' || !/^\d{1,2}$/.test(String(kTxt || ''))) return paginaErro(request, env, 404);
  const ehJson = /json/.test(request.headers.get('content-type') || '');
  const responde = (ok, erro, status = 200) => ehJson
    ? json(ok ? { ok: true } : { ok: false, erro }, status, { 'cache-control': 'no-store' })
    : ok ? Response.redirect(new URL('/pedido/' + token + '#sv' + kTxt, request.url).toString(), 303)
      : html(paginaAviso('Não deu pra mandar', erro, '/pedido/' + token), status);
  const txt = await request.text().catch(() => '');
  if (txt.length > 8000) return responde(false, 'Texto grande demais.', 413);
  let corpo = {};
  try { corpo = ehJson ? JSON.parse(txt || '{}') : Object.fromEntries(new URLSearchParams(txt)); } catch (_) { return responde(false, 'Pedido torto.', 400); }
  const d = await db(env);
  const p = await lerPedido(d, token);
  if (!p) return paginaErro(request, env, 404);
  if (!(p.status === 'pago' || p.status === 'teste')) return responde(false, 'O pagamento ainda não caiu.', 403);
  const k = Number(kTxt), it = (p.itens || [])[k];
  if (!it || it.t !== 'servico') return responde(false, 'Esse item não pede envio.', 404);
  if (it.entrega) return responde(false, 'Esse serviço já foi entregue. Pra mudar algo, chama no Direct.', 409);
  const lim = limparEnvio(it.nome, corpo);
  if (lim.erro) return responde(false, lim.erro, 400);
  const editou = !!it.envio;
  const novo = await salvarEnvio(d, p, k, lim.envio);
  if (!novo) return responde(false, 'Não salvou. Tenta de novo.', 500);
  const aviso = avisarEnvio(env, novo, novo.itens[k], editou).catch(() => {});
  if (waitUntil) waitUntil(aviso); else await aviso;
  return responde(true);
}
