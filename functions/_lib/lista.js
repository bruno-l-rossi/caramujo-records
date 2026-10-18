// Lista de e-mails com cupom (11/10/2026, item 9 do Bruno; 15% desde 17/10, era 25%). Quem deixa o e-mail na
// vitrine ganha um cupom só dele (LISTA-XXXX): PCT% nos beats do catálogo, uso único, válido por
// 15 dias. O cupom mora na tabela cupons e a pessoa (com o prazo do cupom) na tabela lista.
// Mesmo e-mail de novo: nada de cupom novo (reenvia o mesmo, se ainda vale). Sair da lista: o
// link do e-mail (/api/lista?sair=<token>).

import { now } from './db.js';
import { hojeSP } from './loja.js';
import { SITE } from './perfil.js';

// 17/10/2026: 25% → 15% (pedido do Bruno). Cupom já mandado segue com o % que saiu no e-mail (fica no banco).
export const PCT = 15;
export const DIAS = 15;
export const POR_HORA = 5;            // cadastros por aparelho/rede por hora (robô não esvazia o caixa)

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const emailLimpo = (v) => {
  const e = String(v || '').trim().toLowerCase().slice(0, 120);
  return RE_EMAIL.test(e) ? e : null;
};
const origemLimpa = (v) => (/^[a-z][a-z0-9-]{0,24}$/.test(String(v || '')) ? String(v) : 'vitrine');

// sem 0/O/1/I pra ninguém errar digitando
const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function aleatorio(n, letras = LETRAS) {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return [...b].map((x) => letras[x % letras.length]).join('');
}
const tokenNovo = () => aleatorio(24, 'abcdefghijkmnpqrstuvwxyz23456789');

// AAAA-MM-DD daqui a N dias (São Paulo); o cupom vale até o fim desse dia
export function valeAte(dias = DIAS, hoje = hojeSP()) {
  const d = new Date(hoje + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
export const dataBR = (iso) => String(iso || '').split('-').reverse().join('/');

export async function ipDe(request, segredo = '') {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '';
  if (!ip) return null;
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(segredo + '|' + ip));
  return [...new Uint8Array(h)].slice(0, 8).map((x) => x.toString(16).padStart(2, '0')).join('');
}

// { status: 'novo' | 'ja' | 'volta' | 'sem-cupom', email, cupom, valeAte, token } ou { erro, http }
export async function entrar(d, { email, origem, ip }) {
  const e = emailLimpo(email);
  if (!e) return { erro: 'Esse e-mail não parece certo. Confere e tenta de novo.', http: 400 };
  const ja = await d.prepare('SELECT l.email, l.cupom, l.token, l.saiu_em, l.vale_ate, c.usos, c.ativo FROM lista l LEFT JOIN cupons c ON c.codigo = l.cupom WHERE l.email = ?').bind(e).first();
  if (ja) {
    if (ja.saiu_em) await d.prepare('UPDATE lista SET saiu_em = NULL WHERE email = ?').bind(e).run();
    const vale = ja.cupom && ja.ativo && !Number(ja.usos || 0) && (!ja.vale_ate || hojeSP() <= ja.vale_ate);
    return { status: vale ? (ja.saiu_em ? 'volta' : 'ja') : 'sem-cupom', email: e, cupom: vale ? ja.cupom : null, valeAte: vale ? ja.vale_ate : null, token: ja.token };
  }
  if (ip) {
    const desde = new Date(Date.now() - 3600e3).toISOString();
    const r = await d.prepare('SELECT COUNT(*) AS n FROM lista WHERE ip = ? AND criado_em > ?').bind(ip, desde).first();
    if (r && Number(r.n) >= POR_HORA) return { erro: 'Muitos cadastros daqui agora. Tenta de novo daqui a pouco.', http: 429 };
  }
  const ate = valeAte();
  let cupom = null;
  for (let i = 0; i < 5 && !cupom; i++) {
    const c = 'LISTA-' + aleatorio(4);
    const r = await d.prepare(
      'INSERT OR IGNORE INTO cupons (codigo, pct, preco_fixo, max_usos, usos, ativo, criado_em) VALUES (?, ?, NULL, 1, 0, 1, ?)'
    ).bind(c, PCT, now()).run();
    if (Number((r && r.meta && r.meta.changes) || 0) > 0) cupom = c;
  }
  if (!cupom) return { erro: 'Não deu pra gerar o cupom agora. Tenta de novo em instantes.', http: 503 };
  const token = tokenNovo();
  await d.prepare('INSERT INTO lista (email, origem, cupom, vale_ate, token, ip, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(e, origemLimpa(origem), cupom, ate, token, ip, now()).run();
  return { status: 'novo', email: e, cupom, valeAte: ate, token };
}

export async function sair(d, token) {
  if (!/^[a-z0-9]{24}$/.test(String(token || ''))) return false;
  const r = await d.prepare('UPDATE lista SET saiu_em = ? WHERE token = ? AND saiu_em IS NULL').bind(now(), token).run();
  const mudou = Number((r && r.meta && r.meta.changes) || 0) > 0;
  if (mudou) return true;
  const ja = await d.prepare('SELECT 1 AS x FROM lista WHERE token = ?').bind(token).first();
  return !!ja;
}

// painel: quantos, quantos usaram o cupom e os e-mails (pra copiar)
export async function painelLista(d) {
  const envios = await lerEnvios(d);
  const { results } = await d.prepare(
    'SELECT l.email, l.origem, l.criado_em, l.saiu_em, c.usos FROM lista l LEFT JOIN cupons c ON c.codigo = l.cupom ORDER BY l.criado_em DESC LIMIT 2000'
  ).all();
  const todos = results || [];
  const ativos = todos.filter((r) => !r.saiu_em);
  return {
    total: ativos.length,
    sairam: todos.length - ativos.length,
    usaram: todos.filter((r) => Number(r.usos || 0) > 0).length,
    emails: ativos.map((r) => r.email),
    ultimos: ativos.slice(0, 10).map((r) => ({ email: r.email, em: r.criado_em, origem: r.origem, usou: Number(r.usos || 0) > 0 })),
    envios
  };
}

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// O e-mail com o cupom (o desenho do mockup 9-email, aprovado com o texto novo)
export function htmlCupom({ cupom, valeAte: ate, token }) {
  const sairUrl = `${SITE}/api/lista?sair=${token}`;
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Seu cupom de ${PCT}%</title></head>
<body style="margin:0;padding:0;background:#14110d;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#14110d;"><tr><td align="center" style="padding:36px 16px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#1A1815;border:1px solid #332c22;">
<tr><td style="background:#b98f5e;padding:3px 0;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:34px 36px 26px;border-bottom:1px solid #332c22;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td valign="top">
    <div style="font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.4em;text-transform:uppercase;color:#b98f5e;margin-bottom:10px;">// CARAMUJO RECORDS</div>
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:bold;color:#f2ecdf;letter-spacing:0.05em;text-transform:uppercase;line-height:1.1;">Seu cupom<br/><span style="color:#b98f5e;">de ${PCT}%.</span></div>
  </td><td align="right" valign="top" style="width:72px;"><img src="${SITE}/assets/brand/selo-email.png" width="60" height="60" alt="Caramujo Records" style="display:block;border:0;"/></td></tr></table>
</td></tr>
<tr><td style="padding:30px 36px 8px;">
  <p style="font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#b89e72;line-height:1.8;margin:0 0 22px;">Valeu por entrar na lista da Caramujo. Esse é o cupom da sua primeira compra:</p>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px dashed #b98f5e;"><tr><td align="center" style="padding:22px 12px;">
    <div style="font-family:'Courier New',Courier,monospace;font-size:26px;letter-spacing:0.25em;color:#f2ecdf;">${esc(cupom)}</div>
    <div style="font-family:'Courier New',Courier,monospace;font-size:11px;color:#b89e72;margin-top:10px;">${PCT}% nos beats do catálogo · vale até ${dataBR(ate)}</div>
  </td></tr></table>
  <table cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 26px;"><tr><td style="background:#E8E0CF;"><a href="${SITE}/?de=lista#beats" style="display:inline-block;padding:14px 22px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;font-weight:bold;letter-spacing:0.2em;color:#14110d;text-decoration:none;text-transform:uppercase;">Escolher meu beat &rarr;</a></td></tr></table>
  <p style="font-family:Georgia,'Times New Roman',serif;font-size:13px;color:#b89e72;line-height:1.8;margin:0 0 30px;">É só colar o código no carrinho, no campo de cupom.</p>
</td></tr>
<tr><td style="padding:18px 36px;border-top:1px solid #332c22;">
  <div style="font-family:'Courier New',Courier,monospace;font-size:10px;line-height:1.7;color:#6f6757;">Você recebeu esse e-mail porque entrou na lista em caramujorecords.com.br. <a href="${sairUrl}" style="color:#9e7c48;">Sair da lista</a></div>
</td></tr>
<tr><td style="background:#b98f5e;padding:2px 0;font-size:0;line-height:0;">&nbsp;</td></tr>
</table></td></tr></table></body></html>`;
}

// Texto puro junto do HTML: e-mail só com HTML tem mais chance de cair no spam
export function textoCupom({ cupom, valeAte: ate, token }) {
  return [
    `Seu cupom de ${PCT}% chegou.`,
    '',
    'Valeu por entrar na lista da Caramujo. Esse é o cupom da sua primeira compra:',
    '',
    `   ${cupom}`,
    `   ${PCT}% nos beats do catálogo · vale até ${dataBR(ate)}`,
    '',
    `Escolher meu beat: ${SITE}/?de=lista#beats`,
    'É só colar o código no carrinho, no campo de cupom.',
    '',
    `Sair da lista: ${SITE}/api/lista?sair=${token}`
  ].join('\n');
}

// 12/10/2026: o 1º cadastro do Bruno não recebeu o e-mail e não havia como saber por quê.
// Agora o envio espera a resposta do Resend e guarda o resultado (meta 'lista-envio', os
// últimos 10) pro painel mostrar: saiu, ou o erro que o Resend devolveu.
// rodada R (18/10/2026): 2 min entre um envio e outro (era 10). A página da tape mostra a contagem
// no botão Reenviar com o mesmo tempo, então ninguém fica clicando à toa.
export const REENVIO_S = 120;

// segundos que faltam pro mesmo e-mail poder receber o cupom de novo (0 = pode)
export async function esperaReenvio(d, email) {
  const r = await d.prepare("SELECT valor FROM meta WHERE chave = 'lista-envio'").first().catch(() => null);
  let l = []; try { l = JSON.parse((r && r.valor) || '[]'); } catch (_) { l = []; }
  const ult = l.find((x) => x.email === email && x.ok);
  if (!ult) return 0;
  return Math.max(0, Math.ceil(REENVIO_S - (Date.now() - Date.parse(ult.em)) / 1000));
}
export async function podeReenviar(d, email) { return (await esperaReenvio(d, email)) === 0; }

async function guardarEnvio(d, item) {
  if (!d) return;
  try {
    const r = await d.prepare("SELECT valor FROM meta WHERE chave = 'lista-envio'").first();
    let l = []; try { l = JSON.parse((r && r.valor) || '[]'); } catch (_) { l = []; }
    l.unshift(item);
    await d.prepare("INSERT OR REPLACE INTO meta (chave, valor) VALUES ('lista-envio', ?)").bind(JSON.stringify(l.slice(0, 10))).run();
  } catch (e) { console.error('[lista] não guardou o envio', e && e.message); }
}

export async function lerEnvios(d) {
  const r = await d.prepare("SELECT valor FROM meta WHERE chave = 'lista-envio'").first().catch(() => null);
  try { return JSON.parse((r && r.valor) || '[]'); } catch (_) { return []; }
}

// { ok, erro } — erro em português pro painel
export async function enviarCupom(env, { email, cupom, valeAte: ate, token }, d = null) {
  const em = new Date().toISOString();
  const chave = env.RESEND_API_KEY;
  if (!chave) {
    console.warn('[lista] RESEND_API_KEY ausente: e-mail do cupom não saiu');
    await guardarEnvio(d, { email, em, ok: false, erro: 'RESEND_API_KEY não está configurada no Cloudflare' });
    return { ok: false };
  }
  const de = env.NOTIFY_FROM || 'rideblan33@caramujorecords.com.br';
  let ok = false, erro = '';
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Caramujo Records <${de}>`, to: [email], reply_to: de,
        subject: `Seu cupom de ${PCT}% chegou · Caramujo Records`,
        html: htmlCupom({ cupom, valeAte: ate, token }),
        text: textoCupom({ cupom, valeAte: ate, token }),
        headers: { 'List-Unsubscribe': `<${SITE}/api/lista?sair=${token}>` }
      })
    });
    ok = r.ok;
    if (!ok) {
      const corpo = await r.text().catch(() => '');
      let msg = corpo; try { const j = JSON.parse(corpo); msg = j.message || j.error || corpo; } catch (_) { /* texto mesmo */ }
      erro = `Resend respondeu ${r.status}: ${String(msg).slice(0, 200)}`;
      console.error('[lista]', erro);
    }
  } catch (e) {
    erro = 'sem resposta do Resend: ' + String((e && e.message) || e).slice(0, 120);
    console.error('[lista]', erro);
  }
  await guardarEnvio(d, ok ? { email, em, ok: true } : { email, em, ok: false, erro });
  return { ok, erro };
}
