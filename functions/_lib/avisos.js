// Rodada Y (27/10/2026, pedido do Bruno): três e-mails novos, no molde dos que já saem (emails.js, lista.js).
//  1. Salvos: a lista de beats salvos vira um link que abre em qualquer celular (POST /api/salvos).
//  3. PIX parado: um aviso só, umas 2 horas depois do PIX gerado e não pago, se o beat segue à venda
//     (POST /api/lembretes, chamado de hora em hora pelo GitHub Actions; workflow lembretes.yml).
//  6. "Comprou um beat e perdeu o link?": os links dos pedidos pagos daquele e-mail (POST /api/recuperar).
// Os três respondem só pro próprio e-mail e nada entra na lista de novidades (LGPD: aviso de um pedido
// que a pessoa começou, ou algo que ela pediu na hora). Limite por rede e por e-mail na meta 'limite-envios'
// (sem tabela nova: o deploy segue abaixo de 50 consultas).
import { now } from './db.js';
import { SITE } from './pedidos.js';

export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const reais = (v) => 'R$ ' + (Math.round(Number(v || 0) * 100) / 100).toFixed(2).replace('.', ',').replace(',00', '');
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const emailOk = (v) => { const e = String(v || '').trim().toLowerCase().slice(0, 120); return RE_EMAIL.test(e) ? e : null; };

/* ---------- limite de envios (anti-robô) ---------- */
// regras: [[chave, máximo, janela em ms], ...]. Passou de alguma = false (e não conta). Senão conta em todas.
export async function dentroDoLimite(d, regras) {
  const agora = Date.now();
  let m = {};
  try { const r = await d.prepare("SELECT valor FROM meta WHERE chave = 'limite-envios'").first(); m = JSON.parse((r && r.valor) || '{}') || {}; } catch (_) { m = {}; }
  const DIA = 864e5;
  for (const k of Object.keys(m)) { m[k] = (Array.isArray(m[k]) ? m[k] : []).filter((t) => agora - t < DIA); if (!m[k].length) delete m[k]; }
  for (const [k, max, jan] of regras) if ((m[k] || []).filter((t) => agora - t < jan).length >= max) return false;
  for (const [k] of regras) (m[k] = m[k] || []).push(agora);
  // teto de tamanho: só as 400 chaves mais recentes
  const ks = Object.keys(m);
  if (ks.length > 400) ks.sort((a, b) => Math.max(...m[a]) - Math.max(...m[b])).slice(0, ks.length - 400).forEach((k) => delete m[k]);
  try { await d.prepare("INSERT OR REPLACE INTO meta (chave, valor) VALUES ('limite-envios', ?)").bind(JSON.stringify(m)).run(); } catch (_) { /* segue */ }
  return true;
}

/* ---------- envio (Resend) ---------- */
export async function enviar(env, { para, assunto, html, texto }) {
  const chave = env.RESEND_API_KEY;
  if (!chave) { console.warn('[avisos] RESEND_API_KEY ausente'); return { ok: false, erro: 'sem RESEND_API_KEY' }; }
  const de = env.NOTIFY_FROM || 'rideblan33@caramujorecords.com.br';
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `Caramujo Records <${de}>`, to: [para], reply_to: de, subject: assunto, html, text: texto })
    });
    if (!r.ok) { const t = await r.text().catch(() => ''); console.error('[avisos] Resend', r.status, t.slice(0, 200)); return { ok: false, erro: 'Resend ' + r.status }; }
    return { ok: true };
  } catch (e) { console.error('[avisos] sem resposta do Resend', e && e.message); return { ok: false, erro: 'sem resposta' }; }
}

/* ---------- o molde ---------- */
const mono = (t, c = '#b98f5e', m = 10) => `<div style="font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.3em;color:${c};text-transform:uppercase;margin-bottom:${m}px;">${t}</div>`;
export const par = (t, m = 16, s = 15, c = '#b89e72') => `<p style="font-family:Georgia,'Times New Roman',serif;font-size:${s}px;color:${c};line-height:1.8;margin:0 0 ${m}px;">${t}</p>`;
export const botao = (t, href) => `<table cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 26px;"><tr><td style="background:#f2ecdf;"><a href="${esc(href)}" style="display:inline-block;padding:16px 26px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;font-weight:bold;letter-spacing:0.18em;color:#14110d;text-decoration:none;text-transform:uppercase;">${t}</a></td></tr></table>`;
export const linhaBeat = (nome, ficha, dir) => `<tr><td style="padding:12px 0;border-top:1px solid #332c22;"><div style="font-family:Georgia,'Times New Roman',serif;font-size:16px;font-weight:bold;color:#f2ecdf;letter-spacing:0.04em;">${nome}</div>${ficha ? `<div style="font-family:'Courier New',Courier,monospace;font-size:11px;color:#9e7c48;margin-top:3px;">${ficha}</div>` : ''}</td><td align="right" valign="middle" style="padding:12px 0 12px 12px;border-top:1px solid #332c22;font-family:'Courier New',Courier,monospace;font-size:12px;color:#c3a074;white-space:nowrap;">${dir}</td></tr>`;
export const tabela = (linhas) => `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px;">${linhas}</table>`;
export function molde({ titulo, h1, h2, corpo, rodape }) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${esc(titulo)}</title></head>
<body style="margin:0;padding:0;background:#14110d;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#14110d;"><tr><td align="center" style="padding:32px 12px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#1A1815;border:1px solid #332c22;">
<tr><td style="background:#b98f5e;padding:4px 0;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:32px 28px 24px;border-bottom:1px solid #332c22;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td valign="top">
${mono('// CARAMUJO RECORDS')}
<div style="font-family:Georgia,'Times New Roman',serif;font-size:27px;font-weight:bold;color:#f2ecdf;letter-spacing:0.05em;text-transform:uppercase;line-height:1.1;">${h1}<br/><span style="color:#b98f5e;">${h2}</span></div>
</td><td align="right" valign="top" style="width:68px;"><img src="${SITE}/assets/brand/selo-email.png" width="60" height="60" alt="Caramujo Records" style="display:block;border:0;"/></td></tr></table></td></tr>
<tr><td style="padding:28px 28px 24px;">${corpo}
<div style="margin-top:26px;padding-top:20px;border-top:1px solid #332c22;">${mono('// DE', '#9e7c48', 8)}
<div style="font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:bold;color:#f2ecdf;letter-spacing:0.08em;text-transform:uppercase;">Caramujo Records</div>
<div style="font-family:'Courier New',Courier,monospace;font-size:10px;color:#6f6757;letter-spacing:0.2em;">@rideblan33</div></div>
${rodape ? `<p style="font-family:'Courier New',Courier,monospace;font-size:10px;color:#6f6757;line-height:1.7;margin:20px 0 0;">${rodape}</p>` : ''}
</td></tr>
<tr><td style="background:#b98f5e;padding:3px 0;font-size:0;line-height:0;">&nbsp;</td></tr>
</table></td></tr></table></body></html>`;
}
const ficha = (b) => [b.genero || '', b.bpm ? b.bpm + ' BPM' : '', b.key || ''].filter(Boolean).join(' · ');

/* ---------- 1. salvos ---------- */
export const linkSalvos = (ids) => `${SITE}/?de=salvos-email#salvos=${ids.join('.')}`;
// beats = os da vitrine (montarVitrine), na ordem dos ids salvos
export function emailSalvos(beats, ids, preco) {
  const porId = new Map((beats || []).map((b) => [Number(b.id), b]));
  const lista = ids.map((i) => porId.get(Number(i))).filter(Boolean);
  if (!lista.length) return null;
  const n = lista.length, vendidos = lista.filter((b) => b.sold);
  const linhas = lista.map((b) => linhaBeat(b.sold ? `<s style="color:#8C3B2E;">${esc(b.name)}</s>` : esc(b.name), esc(ficha(b)), b.sold ? 'vendido' : preco ? reais(preco) : 'à venda')).join('');
  const link = linkSalvos(lista.map((b) => b.id));
  const vend = vendidos.length === 1 ? `O ${esc(vendidos[0].name)} já foi vendido. Na lista tem os parecidos com ele.` : vendidos.length ? `${vendidos.length} deles já foram vendidos. Na lista tem os parecidos com cada um.` : '';
  const assunto = n === 1 ? 'Seu beat salvo · Caramujo Records' : `Seus ${n} beats salvos · Caramujo Records`;
  const html = molde({
    titulo: assunto, h1: 'Seus beats', h2: 'salvos.',
    corpo: par('Essa é a sua playlist de beats salvos da Caramujo. O botão abre a lista em qualquer celular ou navegador.', 18) +
      tabela(linhas) + botao('Abrir meus salvos &rarr;', link) + (vend ? par(vend, 0, 13) : ''),
    rodape: 'Você recebeu porque pediu a lista no site. Esse e-mail não te coloca na lista de novidades.'
  });
  const texto = ['Seus beats salvos na Caramujo Records:', '', ...lista.map((b) => `- ${b.name}${b.sold ? ' (vendido)' : ''}`), '', `Abrir meus salvos: ${link}`].join('\n');
  return { assunto, html, texto, n };
}

/* ---------- 6. recuperar os links ---------- */
const dataBR = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }); };
const codigo = (p) => String(p.pagamento || p.token || '').slice(-6).toUpperCase();
export async function pedidosDoEmail(d, email) {
  const { results } = await d.prepare(
    "SELECT token, pagamento, itens, criado_em, pago_em FROM pedidos WHERE lower(email) = ? AND status = 'pago' ORDER BY criado_em DESC LIMIT 10"
  ).bind(email).all();
  return (results || []).map((r) => { let itens = []; try { itens = JSON.parse(r.itens) || []; } catch (_) { itens = []; } return { ...r, itens }; });
}
export function emailPedidos(pedidos) {
  if (!pedidos || !pedidos.length) return null;
  const linhas = pedidos.map((p) => {
    const nomes = p.itens.map((i) => i.nome).filter(Boolean).join(', ') || 'Pedido';
    const soServico = p.itens.length && p.itens.every((i) => i.t === 'servico');
    return `<tr><td style="padding:14px 0;border-top:1px solid #332c22;">${mono('Pedido #' + esc(codigo(p)) + ' · ' + esc(dataBR(p.pago_em || p.criado_em)), '#9e7c48', 6)}<div style="font-family:Georgia,'Times New Roman',serif;font-size:15px;font-weight:bold;color:#f2ecdf;">${esc(nomes)}</div><a href="${SITE}/pedido/${esc(p.token)}" style="display:inline-block;margin-top:8px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;font-weight:bold;letter-spacing:0.16em;text-transform:uppercase;color:#b98f5e;">${soServico ? 'Abrir pedido' : 'Baixar arquivos'} &rarr;</a></td></tr>`;
  }).join('');
  const assunto = 'Seus pedidos na Caramujo Records';
  const html = molde({
    titulo: assunto, h1: 'Seus', h2: 'pedidos.',
    corpo: par('Alguém pediu no site os links das compras feitas com este e-mail. Tá aqui:', 18) + tabela(linhas) +
      par('Cada arquivo baixa até 20 vezes. Não foi você que pediu? Pode ignorar: os links só chegam neste e-mail.', 0, 13)
  });
  const texto = ['Seus pedidos na Caramujo Records:', '', ...pedidos.map((p) => `#${codigo(p)} · ${dataBR(p.pago_em || p.criado_em)} · ${p.itens.map((i) => i.nome).join(', ')}\n${SITE}/pedido/${p.token}`)].join('\n');
  return { assunto, html, texto };
}

/* ---------- 3. PIX parado ---------- */
export const LEMBRETE = { depoisH: 2, ateH: 26, porVez: 5, guarda: 300 };
const slugSvc = (n) => String(n || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
export const linkVolta = (ids, svcs) => `${SITE}/?de=lembrete-pix#volta=${ids.join('.')}${svcs.length ? '&s=' + svcs.map(slugSvc).join('.') : ''}`;
const quando = (iso, agora = Date.now()) => {
  const f = (t) => new Date(t).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const h = new Date(iso).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
  return (f(iso) === f(agora) ? 'hoje' : 'ontem') + ' às ' + h;
};
// p = o pedido (itens já lidos); vit = a vitrine; vencido = o Mercado Pago já deu o PIX por vencido
export function emailPix(p, vit, { vencido, preco, agora = Date.now() }) {
  const porId = new Map((vit || []).map((b) => [Number(b.id), b]));
  const beats = [], svcs = [];
  for (const i of p.itens || []) {
    if (i.t === 'beat' && i.id != null) { const b = porId.get(Number(i.id)); if (b && !b.sold && !beats.some((x) => x.id === b.id)) beats.push(b); }
    else if (i.t === 'servico' && i.nome) svcs.push(i.nome);
  }
  const tinhaBeat = (p.itens || []).some((i) => i.t === 'beat');
  if (!beats.length && (tinhaBeat || !svcs.length)) return null;   // o beat foi vendido (ou nada pra voltar): não sai
  const quem = esc(String(p.artista || p.nome || '').trim().slice(0, 60));
  const nomeAssunto = beats.length === 1 ? `O ${beats[0].name} ainda tá aqui` : beats.length ? 'Seus beats ainda tão aqui' : 'Seu pedido ainda tá aqui';
  const assunto = (vencido ? 'Seu PIX venceu. ' : 'Seu PIX ficou em aberto. ') + nomeAssunto;
  const link = linkVolta(beats.map((b) => b.id), svcs);
  const linhas = beats.map((b) => linhaBeat(esc(b.name), esc(ficha(b)), preco ? reais(preco) : '')).join('') + svcs.map((s) => linhaBeat(esc(s), 'serviço', '')).join('');
  const resto = beats.length ? (beats.length === 1 ? 'O beat continua à venda, por enquanto:' : 'Os beats continuam à venda, por enquanto:') : 'O pedido ainda dá pra fazer:';
  const html = molde({
    titulo: assunto, h1: 'Seu PIX', h2: vencido ? 'venceu.' : 'ficou em aberto.',
    corpo: (quem ? par(`Oi, ${quem}.`, 12) : '') +
      par(`Você gerou um PIX de <strong style="color:#f2ecdf;">${reais(p.valor)}</strong> ${quando(p.criado_em, agora)} e ele ${vencido ? 'venceu sem pagamento' : 'ainda não foi pago'}. ${resto}`, 18) +
      tabela(linhas) +
      (beats.length ? par('Cada beat é vendido uma vez só. Se outra pessoa comprar antes, ele sai da loja.', 22, 13, '#c3a074') : '') +
      botao('Voltar pro carrinho &rarr;', link) +
      par('O carrinho volta montado e você gera um PIX novo (ou paga no cartão em até 12x).', 14, 13) +
      par('Já pagou? Ignora esse e-mail: às vezes o banco demora. Dúvida, chama no Direct do @rideblan33.', 0, 13),
    rodape: 'Esse aviso sai uma vez só, porque você começou esse pedido no site. Não é a lista de novidades.'
  });
  const texto = [assunto, '', `Você gerou um PIX de ${reais(p.valor)} ${quando(p.criado_em, agora)} e ele ${vencido ? 'venceu sem pagamento' : 'ainda não foi pago'}.`, '',
    ...beats.map((b) => `- ${b.name}`), ...svcs.map((s) => `- ${s}`), '', `Voltar pro carrinho: ${link}`, '', 'Já pagou? Ignora esse e-mail.'].join('\n');
  return { assunto, html, texto, link };
}

async function lerMeta(d, chave, padrao) {
  try { const r = await d.prepare('SELECT valor FROM meta WHERE chave = ?').bind(chave).first(); return r ? JSON.parse(r.valor) : padrao; } catch (_) { return padrao; }
}
async function gravarMeta(d, chave, v) { await d.prepare('INSERT OR REPLACE INTO meta (chave, valor) VALUES (?, ?)').bind(chave, JSON.stringify(v)).run(); }

// Uma passada: até LEMBRETE.porVez pedidos com PIX pendente há mais de 2 h (e menos de 26 h) recebem o
// aviso. Cada pagamento recebe uma vez só (meta 'lembrete-pix'.feitos). Confere no Mercado Pago antes:
// pago, recusado ou cartão = não manda. Comprou depois com o mesmo e-mail = não manda.
export async function passarLembretes(d, env, { vitrine, preco, agora = Date.now() }) {
  const ini = new Date(agora - LEMBRETE.ateH * 3600e3).toISOString(), fim = new Date(agora - LEMBRETE.depoisH * 3600e3).toISOString();
  const { results } = await d.prepare(
    "SELECT token, pagamento, email, nome, artista, itens, valor, criado_em FROM pedidos WHERE status = 'pendente' AND criado_em > ? AND criado_em < ? ORDER BY criado_em LIMIT 40"
  ).bind(ini, fim).all();
  const st = await lerMeta(d, 'lembrete-pix', {});
  const feitos = Array.isArray(st.feitos) ? st.feitos : [];
  const envios = Array.isArray(st.envios) ? st.envios : [];
  const out = { vistos: 0, enviados: 0, pulados: [] };
  const marca = (pg) => { if (!feitos.includes(pg)) feitos.unshift(pg); };
  let vit = null;
  for (const r of results || []) {
    if (out.vistos >= LEMBRETE.porVez) break;
    const pg = String(r.pagamento || r.token);
    if (feitos.includes(pg)) continue;
    out.vistos++;
    const email = emailOk(r.email);
    if (!email || !r.pagamento) { marca(pg); out.pulados.push([pg, 'sem e-mail']); continue; }
    const depois = await d.prepare("SELECT 1 AS x FROM pedidos WHERE lower(email) = ? AND status = 'pago' AND criado_em > ? LIMIT 1").bind(email, r.criado_em).first();
    if (depois) { marca(pg); out.pulados.push([pg, 'comprou depois']); continue; }
    let mp = null;
    try {
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(r.pagamento)}`, { headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}` } });
      if (res.ok) mp = await res.json();
    } catch (_) { mp = null; }
    if (!mp) { out.pulados.push([pg, 'sem resposta do Mercado Pago']); continue; }   // tenta na próxima passada
    const ehPix = String(mp.payment_method_id || '') === 'pix';
    const vencido = mp.status === 'cancelled' || (mp.date_of_expiration && Date.parse(mp.date_of_expiration) < agora);
    if (!ehPix || !(mp.status === 'pending' || mp.status === 'cancelled')) { marca(pg); out.pulados.push([pg, 'status ' + mp.status]); continue; }
    if (!vit) vit = await vitrine();
    let itens = []; try { itens = JSON.parse(r.itens) || []; } catch (_) { itens = []; }
    const m = emailPix({ ...r, itens }, vit, { vencido, preco, agora });
    if (!m) { marca(pg); out.pulados.push([pg, 'beat vendido']); continue; }
    const env1 = await enviar(env, { para: email, assunto: m.assunto, html: m.html, texto: m.texto });
    envios.unshift({ em: now(), pg, ok: env1.ok });
    if (env1.ok) { marca(pg); out.enviados++; }
    else out.pulados.push([pg, 'Resend falhou']);
  }
  await gravarMeta(d, 'lembrete-pix', { feitos: feitos.slice(0, LEMBRETE.guarda), envios: envios.slice(0, 20), ultima: now() });
  return out;
}
