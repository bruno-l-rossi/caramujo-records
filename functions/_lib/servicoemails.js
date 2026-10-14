// E-mails dos serviços do pedido (12/10/2026, _lib/servicos.js):
//   avisarEnvio    quem comprou mandou as vozes / a faixa / a referência  -> e-mail pro Bruno
//   avisarEntrega  o Bruno colou o link da entrega no painel              -> e-mail pra quem comprou
// Mesmo desenho dos outros e-mails (cartão escuro, faixa fire, selo transparente do site).
// Falhou o envio = só log: a página do pedido segue certa.

import { servicoDe } from './servicos.js';

const SITE = 'https://caramujorecords.com.br';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function casca(titulo, corpo) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${esc(titulo)}</title></head>
<body style="margin:0;padding:0;background:#14110d;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#14110d;"><tr><td align="center" style="padding:36px 16px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#1A1815;border:1px solid #332c22;">
<tr><td style="background:#b98f5e;padding:3px 0;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:30px 32px 22px;border-bottom:1px solid #332c22;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td valign="top">
    <div style="font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.4em;text-transform:uppercase;color:#b98f5e;margin-bottom:10px;">// CARAMUJO RECORDS</div>
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:bold;color:#f2ecdf;letter-spacing:0.04em;text-transform:uppercase;line-height:1.15;">${titulo}</div>
  </td><td align="right" valign="top" style="width:64px;"><img src="${SITE}/assets/brand/selo-email.png" width="56" height="56" alt="Caramujo Records" style="display:block;border:0;"/></td></tr></table>
</td></tr>
<tr><td style="padding:26px 32px 30px;">${corpo}</td></tr>
<tr><td style="background:#b98f5e;padding:2px 0;font-size:0;line-height:0;">&nbsp;</td></tr>
</table></td></tr></table></body></html>`;
}
const P = (t) => `<p style="font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#b89e72;line-height:1.8;margin:0 0 18px;">${t}</p>`;
const BOTAO = (href, rot) => `<table cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 22px;"><tr><td style="background:#E8E0CF;"><a href="${esc(href)}" style="display:inline-block;padding:14px 22px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;font-weight:bold;letter-spacing:0.2em;color:#14110d;text-decoration:none;text-transform:uppercase;">${rot}</a></td></tr></table>`;

async function mandar(env, { to, subject, html, text, replyTo }) {
  if (!env.RESEND_API_KEY) { console.warn('[servico] RESEND_API_KEY ausente'); return false; }
  const de = env.NOTIFY_FROM || 'rideblan33@caramujorecords.com.br';
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `Caramujo Records <${de}>`, to: [to], subject, html, text, ...(replyTo ? { reply_to: replyTo } : {}) })
    });
    if (!r.ok) console.error('[servico] Resend respondeu', r.status, (await r.text().catch(() => '')).slice(0, 200));
    return r.ok;
  } catch (e) { console.error('[servico] e-mail', e && e.message); return false; }
}

export function htmlEnvio(p, it) {
  const sv = servicoDe(it.nome), env = it.envio || {};
  const quem = p.artista || p.nome || 'Quem comprou';
  const linhas = (sv ? sv.campos : []).filter((c) => env[c.k]).map((c) =>
    `<tr><td style="padding:8px 0;border-top:1px solid #332c22;font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#9e7c48;vertical-align:top;width:120px;">${esc(c.rot)}</td>` +
    `<td style="padding:8px 0;border-top:1px solid #332c22;font-family:Georgia,'Times New Roman',serif;font-size:14px;color:#f2ecdf;line-height:1.6;word-break:break-word;">${c.link ? `<a href="${esc(env[c.k])}" style="color:#b98f5e;">${esc(env[c.k])}</a>` : esc(env[c.k]).replace(/\n/g, '<br/>')}</td></tr>`).join('');
  return casca(sv && sv.tipo === 'encomenda' ? 'Chegou a<br/><span style="color:#b98f5e;">referência.</span>' : 'Chegou o<br/><span style="color:#b98f5e;">material.</span>',
    P(`<strong style="color:#f2ecdf;">${esc(quem)}</strong> mandou o que precisa pro <strong style="color:#f2ecdf;">${esc(sv ? sv.curto : it.nome)}</strong>${p.email ? ` (${esc(p.email)})` : ''}.`) +
    `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px;">${linhas}</table>` +
    BOTAO(`${SITE}/pedido/${p.token}`, 'Abrir o pedido &rarr;') +
    P('Quando terminar, cola o link da entrega no painel (Entrega na hora &gt; o pedido). Quem comprou recebe um e-mail e o botão aparece na página do pedido.'));
}

export function htmlEntrega(p, it, k = null) {
  const sv = servicoDe(it.nome);
  const quem = p.artista || (p.nome || '').split(' ')[0] || '';
  const o = sv && sv.tipo === 'encomenda' ? 'seu beat' : 'sua faixa';
  return casca(sv && sv.tipo === 'encomenda' ? 'Seu beat<br/><span style="color:#b98f5e;">tá pronto.</span>' : 'Sua faixa<br/><span style="color:#b98f5e;">tá pronta.</span>',
    P(`Valeu${quem ? ', ' + esc(quem) : ''}. O @rideblan33 terminou ${o} (${esc(sv ? sv.curto : it.nome)}). Tá na página do seu pedido, pronto pra baixar.`) +
    BOTAO(`${SITE}/pedido/${p.token}${k != null ? '#sv' + k : ''}`, 'Baixar agora &rarr;') +
    P('Quer mexer em alguma coisa? Responde este e-mail ou chama no Direct do @rideblan33.'));
}

export async function avisarEnvio(env, p, it, editou = false) {
  const sv = servicoDe(it.nome);
  return mandar(env, {
    to: env.NOTIFY_EMAIL || 'rideblan33@gmail.com',
    subject: `${editou ? 'Material atualizado' : sv && sv.tipo === 'encomenda' ? 'Referência chegou' : 'Material chegou'} · ${sv ? sv.curto : it.nome} · ${p.artista || p.nome || 'pedido'}`,
    html: htmlEnvio(p, it), replyTo: p.email || undefined,
    text: `${p.artista || p.nome || 'Quem comprou'} mandou o material do ${sv ? sv.curto : it.nome}. Pedido: ${SITE}/pedido/${p.token}`
  });
}

export async function avisarEntrega(env, p, it, k = null) {
  if (!p.email) return false;
  const sv = servicoDe(it.nome);
  return mandar(env, {
    to: p.email,
    subject: `${sv && sv.tipo === 'encomenda' ? 'Seu beat tá pronto' : 'Sua faixa tá pronta'} · Caramujo Records`,
    html: htmlEntrega(p, it, k),
    text: `O @rideblan33 terminou o seu pedido (${sv ? sv.curto : it.nome}). Baixe na página do pedido: ${SITE}/pedido/${p.token}`
  });
}
