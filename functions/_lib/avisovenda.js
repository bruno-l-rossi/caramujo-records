// Avisos de venda pro Bruno (04/11/2026, pedido dele: "garanta que estão funcionais e assertivos pra eu
// não deixar de ver uma compra"). Antes, 2 furos: cartão "em análise" chegava com assunto de PAGO e,
// quando o Mercado Pago aprovava depois, não saía e-mail nenhum (o webhook só avisava PIX); e e-mail
// que falhava (Resend fora, limite) sumia num console.error.
// Agora a meta 'avisos-venda' guarda quem já foi avisado: { ok: [pagamentos avisados pro Bruno],
// c: [avisados pro comprador], falhou: [{ p, v, itens, erro, em, n }] }.
//   - create-payment: cartão aprovado na hora manda o "✅ VENDA" e anota; em análise ou PIX gerado
//     mandam um aviso que diz com todas as letras que ainda não é venda.
//   - webhook: todo pagamento aprovado (PIX ou cartão que saiu da análise) que ainda não foi avisado
//     manda o "✅ VENDA" e o e-mail do comprador.
//   - 1x por dia (/api/lembretes): as vendas aprovadas das últimas 72 h (meta 'vendas-origem') que
//     não foram avisadas, ou cujo aviso falhou, vão de novo. Falhou de vez aparece no Hoje do painel.
// 1ª leitura (a meta ainda não existe): o que foi aprovado há mais de 30 min conta como avisado (pelo caminho
// antigo). O que é mais novo fica de fora: pode ser o pagamento que está chegando agora (o webhook grava a origem
// antes de ler os avisos), e aviso repetido é melhor que venda sem aviso.
import { CHAVE_ORIGEM } from './vendasorigem.js';
import { pedidoDoPagamento } from './pedidos.js';
import { reais } from './avisos.js';

export const CHAVE_AVISOS = 'avisos-venda';
const MAX_OK = 400, MAX_FALHA = 60;
const lerMeta = async (d, k) => { const r = await d.prepare('SELECT valor FROM meta WHERE chave = ?').bind(k).first(); return r && r.valor; };

export async function lerAvisos(d) {
  const v = await lerMeta(d, CHAVE_AVISOS);
  if (v) {
    try { const x = JSON.parse(v); if (x && Array.isArray(x.ok)) return { ok: x.ok.map(String), c: (x.c || []).map(String), falhou: Array.isArray(x.falhou) ? x.falhou : [] }; } catch (_) { /* refaz */ }
  }
  let l = [];
  try { l = JSON.parse((await lerMeta(d, CHAVE_ORIGEM)) || '[]'); } catch (_) { l = []; }
  const corte = Date.now() - 30 * 60e3;
  const ids = (Array.isArray(l) ? l : []).filter((x) => x && x.p && new Date(x.em).getTime() < corte).map((x) => String(x.p));
  return { ok: ids, c: ids.slice(), falhou: [], novo: true };
}
async function gravarAvisos(d, x) {
  const v = JSON.stringify({ ok: x.ok.slice(-MAX_OK), c: x.c.slice(-MAX_OK), falhou: x.falhou.slice(-MAX_FALHA) });
  await d.prepare('INSERT OR REPLACE INTO meta (chave, valor) VALUES (?, ?)').bind(CHAVE_AVISOS, v).run();
}
// quem: 'ok' (o Bruno) ou 'c' (o comprador)
export async function anotarAviso(d, pagamento, quem = 'ok') {
  const x = await lerAvisos(d), s = String(pagamento);
  if (!x[quem].includes(s)) x[quem].push(s);
  if (quem === 'ok') x.falhou = x.falhou.filter((f) => String(f.p) !== s);
  await gravarAvisos(d, x);
}
export async function anotarFalha(d, pagamento, { valor = null, itens = '', erro = '' } = {}) {
  const x = await lerAvisos(d), s = String(pagamento), em = new Date().toISOString();
  const f = x.falhou.find((y) => String(y.p) === s);
  if (f) { f.n = (f.n || 1) + 1; f.erro = String(erro).slice(0, 160); f.em = em; if (valor != null) f.v = valor; if (itens) f.itens = String(itens).slice(0, 160); }
  else x.falhou.push({ p: s, v: valor, itens: String(itens || '').slice(0, 160), erro: String(erro).slice(0, 160), em, n: 1 });
  await gravarAvisos(d, x);
}

// o Bruno viu a venda no painel ("Já vi" na tarefa do Hoje): sai das falhas e conta como avisado
export async function marcarVisto(d, pagamento) {
  const s = String(pagamento || '');
  if (!s) return;
  const x = await lerAvisos(d);
  x.falhou = x.falhou.filter((f) => String(f.p) !== s);
  if (!x.ok.includes(s)) x.ok.push(s);
  await gravarAvisos(d, x);
}

// o que fazer, em 3 palavras, no fim do assunto
export function rotuloEntrega(pedido) {
  if (!pedido) return 'ENVIAR ARQUIVOS';
  if (pedido.tudo) return 'ENTREGUE NO LINK';
  if (pedido.tipo === 'servico') return 'SERVIÇO: ESPERAR O MATERIAL';
  if (pedido.tipo === 'misto') return 'BEATS NO LINK, SERVIÇO PENDENTE';
  return 'ENVIAR ARQUIVOS';
}
// o valor do jeito que se lê no Brasil (R$ 119, R$ 113,05), igual nos 3 assuntos
export const assuntoVenda = ({ amount, itens, metodo, pedido }) => `✅ VENDA ${reais(amount)} · ${itens} · ${metodo} · ${rotuloEntrega(pedido)}`;
export const assuntoPix = ({ amount, itens }) => `⏳ PIX gerado ${reais(amount)} · ${itens} · ainda não pago`;
export const assuntoAnalise = ({ amount, itens }) => `🔄 Cartão em análise ${reais(amount)} · ${itens} · ainda não é venda`;
function acaoHtml(pedido, email, itens) {
  const link = pedido ? `<a href="${pedido.url}" style="color:#c3a074">link do pedido</a>` : '';
  const quem = `<strong style="color:#c3a074">${email}</strong>`;
  const it = `<br/>Itens: <strong style="color:#c3a074">${itens}</strong>`;
  if (pedido && pedido.tudo) return `<div class="action"><strong>Entregue na hora</strong>Os arquivos já estão no ${link}, que foi pro e-mail de ${quem}.${it}</div>`;
  if (pedido && pedido.tipo === 'servico') return `<div class="action"><strong>Esperar o material</strong>Quem comprou manda as vozes ou a referência pela página do pedido (${link}) e chega um e-mail pra você. Aí é entregar pelo painel, em Vendas.${it}</div>`;
  if (pedido && pedido.tipo === 'misto') return `<div class="action"><strong>Beats entregues, serviço pendente</strong>Os beats já foram no ${link}. O serviço espera o material, que chega pela página do pedido; depois é entregar pelo painel.${it}</div>`;
  return `<div class="action"><strong>Ação necessária</strong>Envie os arquivos para ${quem}${it}${pedido ? `<br/>O ${link} já está com ${quem}.` : ''}</div>`;
}

export async function emailVendaAprovada({ env, payment, pedido = null }) {
  const resendKey   = env.RESEND_API_KEY;
  const notifyEmail = env.NOTIFY_EMAIL || 'rideblan33@gmail.com';
  const fromEmail   = env.NOTIFY_FROM  || 'rideblan33@caramujorecords.com.br';

  // sem a chave o aviso não sai: vira falha (aparece no Hoje do painel) em vez de sumir em silêncio
  if (!resendKey) throw new Error('RESEND_API_KEY não configurado');

  const payer    = payment.payer || {};
  const meta     = payment.metadata || {};
  const name     = meta.buyer_name   || [payer.first_name, payer.last_name].filter(Boolean).join(' ') || '—';
  const artistName = meta.buyer_artist || meta.buyer_name || name;
  const email    = meta.buyer_email  || payer.email || '—';
  const rawCpf   = meta.buyer_cpf    || payer.identification?.number || '—';
  const cpf      = rawCpf.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') || rawCpf;
  const amount   = payment.transaction_amount;
  const methodMap = { bank_transfer: 'PIX', credit_card: 'Cartão de Crédito', debit_card: 'Cartão de Débito' };
  const method   = methodMap[payment.payment_type_id] || payment.payment_type_id || '—';
  const couponCode = meta.coupon_code || null;
  const dataHora = new Date(payment.date_approved || payment.date_last_updated)
    .toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  // Usa items_display e category_label salvos no metadata durante create-payment
  // (fallback para description caso o pagamento seja de versão anterior)
  const rawDesc        = (payment.description || '—').replace('Caramujo Records — ', '');
  const itemsDisplay   = meta.items_display   || rawDesc;
  const categoryDisplay = meta.category_label || rawDesc;

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><style>
  body{font-family:'Courier New',monospace;background:#14110d;color:#E8E0CF;margin:0;padding:24px 0;}
  .wrap{max-width:560px;margin:0 auto;}
  .bar{background:#b98f5e;height:4px;font-size:0;line-height:0;}
  .hd{background:#1A1815;padding:24px;border:1px solid #332c22;border-bottom:none;}
  .kick{font-size:.58rem;letter-spacing:.34em;text-transform:uppercase;color:#b98f5e;margin-bottom:8px;}
  .hd h1{margin:0;font-family:Georgia,'Times New Roman',serif;font-size:1.4rem;letter-spacing:.03em;color:#f2ecdf;text-transform:uppercase;}
  .hd p{margin:6px 0 0;font-size:.7rem;color:#9e7c48;}
  .bdy{background:#221e18;padding:24px;border:1px solid #332c22;border-top:none;}
  .status{font-size:1rem;font-weight:700;margin-bottom:16px;padding:10px 14px;background:#1A1815;border-left:3px solid #b98f5e;color:#f2ecdf;}
  .action{margin:20px 0;padding:14px 16px;background:#221e18;border:1px solid #A87B4A;border-left:4px solid #A87B4A;font-size:.82rem;line-height:1.7;color:#E8E0CF;}
  .action strong{color:#c3a074;display:block;margin-bottom:4px;font-size:.72rem;letter-spacing:.15em;text-transform:uppercase;}
  table{width:100%;border-collapse:collapse;margin-bottom:16px;}
  td{padding:7px 4px;font-size:.8rem;border-bottom:1px solid #2a241c;vertical-align:top;color:#E8E0CF;}
  td:first-child{color:#c3a074;width:38%;white-space:nowrap;font-weight:700;}
  .sect{color:#b98f5e;font-size:.65rem;letter-spacing:.2em;text-transform:uppercase;padding:12px 0 4px;border-top:1px solid #332c22;}
  .ft{margin-top:24px;padding-top:16px;border-top:1px solid #332c22;font-size:.68rem;color:#9e7c48;text-align:center;}
  </style></head><body><div class="wrap">
  <div class="bar">&nbsp;</div>
  <div class="hd"><div class="kick">// Caramujo Records</div><h1>Venda aprovada</h1><p>${dataHora}</p></div>
  <div class="bdy">
    <div class="status">APROVADO · ${reais(amount)}</div>
    ${acaoHtml(pedido, email, itemsDisplay)}
    <table>
      <tr class="sect"><td colspan="2">PEDIDO</td></tr>
      <tr><td>ID Pagamento</td><td>${payment.id}</td></tr>
      <tr><td>Categoria</td><td>${categoryDisplay}</td></tr>
      <tr><td>Itens</td><td>${itemsDisplay}</td></tr>
      <tr><td>Valor Total</td><td>R$ ${amount}</td></tr>
      <tr><td>Método</td><td>${method}</td></tr>
      ${couponCode ? `<tr><td>Cupom</td><td>${couponCode}</td></tr>` : ''}
      <tr class="sect"><td colspan="2">CLIENTE</td></tr>
      <tr><td>Nome artístico</td><td>${artistName || '—'}</td></tr>
      <tr><td>Nome</td><td>${name}</td></tr>
      <tr><td>Email</td><td>${email}</td></tr>
      <tr><td>CPF</td><td>${cpf}</td></tr>
    </table>
  </div>
  <div class="ft">Caramujo Records · São Carlos, SP · @rideblan33</div>
</div></body></html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Caramujo Records <${fromEmail}>`,
      to: [notifyEmail],
      subject: assuntoVenda({ amount, itens: itemsDisplay, metodo: payment.payment_type_id === 'bank_transfer' ? 'PIX' : 'cartão', pedido }),
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${res.status} — ${err}`);
  }
  console.log(`[email] Notificação enviada para ${notifyEmail} via Resend`);
}


// 1x por dia desde 04/11 (/api/lembretes): venda aprovada há mais de 10 min (e menos de 72 h) que não foi
// avisada, ou cujo aviso falhou, vai de novo. Os 10 min dão tempo do create-payment e do webhook
// mandarem o deles. Confere no Mercado Pago antes (só manda se ainda está aprovado). No máximo 5 por vez.
// janela e tentativas pra passada diária (eram 48 h e 24 tentativas de hora em hora)
export const REAVISO = { janelaH: 72, tentativas: 4 };
export async function reavisarVendas(d, env, { agora = Date.now(), max = 5 } = {}) {
  const x = await lerAvisos(d);
  if (x.novo) { await gravarAvisos(d, x); return { semeado: x.ok.length, avisados: 0 }; }
  let l = [];
  try { l = JSON.parse((await lerMeta(d, CHAVE_ORIGEM)) || '[]'); } catch (_) { l = []; }
  const janela = (Array.isArray(l) ? l : []).filter((v) => { const t = new Date(v && v.em).getTime(); return t && t <= agora - 10 * 60e3 && t >= agora - REAVISO.janelaH * 3600e3; });
  const ids = [...new Set(janela.filter((v) => !x.ok.includes(String(v.p))).map((v) => String(v.p))
    .concat(x.falhou.filter((f) => (f.n || 1) < REAVISO.tentativas).map((f) => String(f.p))))].slice(0, max);
  // o valor da venda vai junto na falha (o Hoje mostra "Venda de R$ X sem aviso no e-mail")
  const valorDe = Object.fromEntries(janela.map((v) => [String(v.p), v.v]).concat(x.falhou.map((f) => [String(f.p), f.v])).filter((p) => p[1] != null));
  let avisados = 0;
  for (const id of ids) {
    let payment = null;
    try {
      const r = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, { headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}` } });
      if (r.ok) payment = await r.json();
    } catch (_) { payment = null; }
    if (!payment) { await anotarFalha(d, id, { valor: valorDe[id] ?? null, erro: 'não consegui conferir no Mercado Pago' }); continue; }
    if (payment.status !== 'approved') {
      // não é (mais) venda: sai da lista de falhas sem aviso
      const y = await lerAvisos(d); y.falhou = y.falhou.filter((f) => String(f.p) !== id); y.ok.push(id); await gravarAvisos(d, y);
      continue;
    }
    let pedido = null;
    try { pedido = await pedidoDoPagamento(d, id); } catch (_) { pedido = null; }
    try { await emailVendaAprovada({ env, payment, pedido }); await anotarAviso(d, id, 'ok'); avisados++; }
    catch (e) { await anotarFalha(d, id, { valor: payment.transaction_amount, itens: (payment.metadata && payment.metadata.items_display) || '', erro: e.message }); }
  }
  return { conferidas: ids.length, avisados };
}
