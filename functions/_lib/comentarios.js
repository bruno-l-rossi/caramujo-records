// Comentários das pastas de artista (10/10/2026, item 7 do Bruno). O artista comenta num
// segundo da faixa ("em 1:23, sobe a voz") ou na faixa toda, e aprova a versão de uma
// música. O @rideblan33 recebe um e-mail, vê tudo no painel, responde e marca como feito.
// Só na pasta de artista: tape é pública, e os links avulsos (/f/, /p/) vão pra terceiros.
// Cada comentário guarda a versão do arquivo (tracks.src_modified): subiu arquivo novo, o
// comentário aparece como de uma versão anterior e a aprovação deixa de valer.

// 11/10/2026: o Bruno pediu pra tirar os comentários por enquanto ("revisitamos depois").
// Desligado: a pasta não lê nem mostra, a API recusa e o painel esconde a linha. O código
// e a tabela ficam; religar = ligado: true aqui (a pasta, a API e o painel seguem essa chave;
// o teste44 liga pra conferir o sistema parado).
export const COMENTARIOS = { ligado: false };

import { now, pessoaDe } from './db.js';

export const MAX_TEXTO = 1000;
const MAX_NOME = 40;
const POR_HORA = 40;             // teto por pasta (robô ou dedo nervoso)
const AVISO_A_CADA = 15 * 60;    // um e-mail de comentário por pasta a cada 15 min (aprovação sempre)
const SITE = 'https://caramujorecords.com.br';

// texto limpo: sem caractere de controle, no máximo uma linha em branco seguida
export function limpar(s, max) {
  return String(s == null ? '' : s)
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);
}

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// "2026-10-09T..." -> "09/10/2026"
const dataBr = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; };
export const mmss = (s) => { s = Math.max(0, Math.round(Number(s) || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

// A pasta lê os comentários junto com as faixas, na mesma ida ao banco ([codigo].js).
// Código errado = lista vazia (a subconsulta não acha a pasta).
export const SQL_PASTA = `SELECT id, track_id, versao, seg, texto, tipo, autor, nome, resposta_de, feito_em, at
   FROM comentarios
  WHERE artist_id = (SELECT id FROM artists WHERE slug = ? AND code = ? AND tipo = 'artista')
  ORDER BY id DESC LIMIT 300`;

// O que vai pra página: só das faixas que ainda estão na pasta, do mais velho pro mais novo.
// Nada de "quem" (o número do aparelho) sai daqui.
export function praPagina(rows, tracks) {
  const ids = new Set((tracks || []).map((t) => t.id));
  return (rows || []).filter((c) => ids.has(c.track_id)).reverse().map((c) => ({
    id: c.id, f: c.track_id, s: c.seg == null ? null : Number(c.seg), x: c.texto, t: c.tipo, a: c.autor,
    n: c.nome || null, r: c.resposta_de || null, v: c.versao || null, ok: !!c.feito_em, at: c.at
  }));
}

// A faixa de uma pasta de artista (slug + código batendo), ou nada
async function faixaDaPasta(d, slug, code, f) {
  return d.prepare(
    `SELECT t.id, t.title, t.kind, t.src_modified, t.dur, a.id AS aid, a.name AS artista, a.slug, a.code
       FROM tracks t JOIN artists a ON a.id = t.artist_id
      WHERE t.id = ? AND t.ready = 1 AND a.slug = ? AND a.code = ? AND a.tipo = 'artista'`
  ).bind(String(f || '').slice(0, 80), String(slug || '').toLowerCase().slice(0, 60), String(code || '').toLowerCase().slice(0, 16)).first();
}

// Comentário novo (artista, ou o Bruno logado comentando na própria pasta).
// Volta { c } (o comentário como a página usa, + dados pro e-mail) ou { erro, status }.
export async function criar(d, { slug, code, f, s, x, n, tipo, pessoa, bruno = false }) {
  const aprovou = tipo === 'aprovou';
  const texto = limpar(x, MAX_TEXTO);
  if (!aprovou && !texto) return { erro: 'Escreve o comentário.', status: 400 };
  const faixa = await faixaDaPasta(d, slug, code, f);
  if (!faixa) return { erro: 'Essa faixa não está mais na pasta.', status: 404 };
  if (aprovou && faixa.kind !== 'son') return { erro: 'Só dá pra aprovar música.', status: 400 };
  const hora = new Date(Date.now() - 3600e3).toISOString();
  const ja = await d.prepare('SELECT COUNT(*) AS n FROM comentarios WHERE artist_id = ? AND at > ?').bind(faixa.aid, hora).first();
  if (ja && Number(ja.n) >= POR_HORA) return { erro: 'Muitos comentários de uma vez. Tenta daqui a pouco.', status: 429 };
  let seg = s === null || s === undefined || s === '' ? null : Math.round(Number(s));
  if (aprovou || !Number.isFinite(seg) || seg < 0) seg = null;
  if (seg !== null && faixa.dur && seg > faixa.dur) seg = Math.round(faixa.dur);
  const nome = bruno ? '@rideblan33' : (limpar(n, MAX_NOME).replace(/\n/g, ' ') || null);
  const linha = {
    track_id: faixa.id, versao: faixa.src_modified || null, seg,
    texto: texto || 'Aprovou essa versão', tipo: aprovou ? 'aprovou' : 'nota',
    autor: bruno ? 'bruno' : 'artista', nome, at: now()
  };
  const r = await d.prepare(
    `INSERT INTO comentarios (artist_id, track_id, titulo, versao, seg, texto, tipo, autor, nome, quem, at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
  ).bind(faixa.aid, linha.track_id, faixa.title, linha.versao, linha.seg, linha.texto, linha.tipo, linha.autor, linha.nome, pessoaDe(pessoa), linha.at).first();
  const c = { id: r ? r.id : null, f: linha.track_id, s: linha.seg, x: linha.texto, t: linha.tipo, a: linha.autor, n: linha.nome, r: null, v: linha.versao, ok: false, at: linha.at };
  return { c, faixa };
}

// Apagar: o aparelho que escreveu (ou o Bruno). Some junto a resposta do Bruno.
export async function apagar(d, { slug, code, id, pessoa, bruno = false }) {
  const c = await d.prepare(
    `SELECT c.id, c.quem FROM comentarios c JOIN artists a ON a.id = c.artist_id
      WHERE c.id = ? AND a.slug = ? AND a.code = ? AND a.tipo = 'artista'`
  ).bind(Number(id) || 0, String(slug || '').toLowerCase().slice(0, 60), String(code || '').toLowerCase().slice(0, 16)).first();
  if (!c) return { erro: 'Esse comentário já saiu.', status: 404 };
  const meu = pessoaDe(pessoa);
  if (!bruno && !(c.quem && meu && c.quem === meu)) return { erro: 'Só quem escreveu pode apagar.', status: 403 };
  await d.prepare('DELETE FROM comentarios WHERE id = ? OR resposta_de = ?').bind(c.id, c.id).run();
  return { ok: true };
}

/* ---------- e-mail pro Bruno ---------- */

// Link que abre a pasta já na faixa (e no segundo, quando tem). Vai só pro e-mail e pro
// painel do Bruno: a pasta é privada.
export const linkDaFaixa = (slug, code, trackId, seg) =>
  `${SITE}/${slug}/${code}?id=${encodeURIComponent(trackId)}${seg != null ? '&t=' + seg : ''}`;

export function emailDoComentario({ c, faixa }) {
  const quem = c.n || 'Alguém da pasta';
  const aprovou = c.t === 'aprovou';
  const onde = c.s != null ? ` em ${mmss(c.s)}` : '';
  const assunto = aprovou
    ? `🐌 ${quem} aprovou ${faixa.title} (${faixa.artista})`
    : `🐌 ${quem} comentou${onde} em ${faixa.title} (${faixa.artista})`;
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:24px 0;background:#14110d;font-family:'Courier New',monospace;color:#E8E0CF">
<div style="max-width:560px;margin:0 auto">
  <div style="background:#b98f5e;height:4px;font-size:0;line-height:0">&nbsp;</div>
  <div style="background:#1A1815;padding:24px;border:1px solid #332c22;border-bottom:none">
    <div style="font-size:.58rem;letter-spacing:.34em;text-transform:uppercase;color:#b98f5e;margin-bottom:8px">// Pasta de ${esc(faixa.artista)}</div>
    <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:1.4rem;letter-spacing:.03em;color:#f2ecdf;text-transform:uppercase">${aprovou ? 'Versão aprovada' : 'Comentário novo'}</h1>
    <p style="margin:6px 0 0;font-size:.75rem;color:#c3a074">${esc(faixa.title)}${onde ? ' · ' + mmss(c.s) : aprovou ? '' : ' · faixa toda'}</p>
  </div>
  <div style="background:#221e18;padding:24px;border:1px solid #332c22;border-top:none">
    <div style="font-size:1rem;line-height:1.6;padding:12px 14px;background:#1A1815;border-left:3px solid #b98f5e;color:#f2ecdf;white-space:pre-line">${aprovou ? esc(quem) + ' aprovou a versão de ' + esc(faixa.title) + '.' : esc(c.x)}</div>
    <p style="margin:14px 0 0;font-size:.78rem;color:#c3a074">${esc(quem)}${c.v ? ' · versão do arquivo de ' + esc(dataBr(c.v)) : ''}</p>
    <p style="margin:22px 0 0">
      <a href="${linkDaFaixa(faixa.slug, faixa.code, c.f, c.s)}" style="display:inline-block;background:#b98f5e;color:#14110d;font:700 11px 'Helvetica Neue',Arial,sans-serif;letter-spacing:.16em;padding:12px 16px;text-transform:uppercase;text-decoration:none">Ouvir ${onde ? 'no ponto' : 'a faixa'}</a>
      <a href="${SITE}/painel#comentarios" style="display:inline-block;margin-left:8px;color:#E8E0CF;font:700 11px 'Helvetica Neue',Arial,sans-serif;letter-spacing:.16em;padding:12px 4px;text-transform:uppercase">Responder no painel</a>
    </p>
  </div>
  <div style="margin-top:20px;font-size:.68rem;color:#9e7c48;text-align:center">Caramujo Records · São Carlos, SP · @rideblan33</div>
</div></body></html>`;
  return { assunto, html };
}

// Manda o e-mail sem segurar a resposta (waitUntil). Comentário: um por pasta a cada
// 15 minutos (a trava fica na cópia da região, sem escrever no banco); o resto espera no
// painel. Aprovação vai sempre.
export async function avisarBruno(env, request, criado) {
  if (!env || !env.RESEND_API_KEY || !criado || !criado.c || criado.c.a === 'bruno') return false;
  const cache = typeof caches !== 'undefined' && caches.default ? caches.default : null;
  if (cache && criado.c.t !== 'aprovou') {
    const chave = new URL('/__cache/aviso-comentario-' + criado.faixa.aid, request.url);
    try {
      if (await cache.match(chave)) return false;
      await cache.put(chave, new Response('1', { headers: { 'cache-control': 'public, max-age=' + AVISO_A_CADA } }));
    } catch (_) { /* sem trava: manda assim mesmo */ }
  }
  const { assunto, html } = emailDoComentario(criado);
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `Caramujo Records <${env.NOTIFY_FROM || 'rideblan33@caramujorecords.com.br'}>`,
      to: [env.NOTIFY_EMAIL || 'rideblan33@gmail.com'],
      subject: assunto,
      html
    })
  });
  if (!r.ok) console.error('[comentario] e-mail falhou', r.status);
  return r.ok;
}

/* ---------- painel ---------- */

// A lista do painel: os 400 mais novos, com o nome da pasta e se a versão ainda é a mesma
export async function painelLer(d) {
  const { results } = await d.prepare(
    `SELECT c.id, c.artist_id, c.track_id, c.titulo, c.versao, c.seg, c.texto, c.tipo, c.autor, c.nome,
            c.resposta_de, c.feito_em, c.at, a.name AS artista, a.slug, a.code,
            t.src_modified AS versao_atual, t.title AS titulo_atual, t.kind
       FROM comentarios c JOIN artists a ON a.id = c.artist_id
       LEFT JOIN tracks t ON t.id = c.track_id
      ORDER BY c.id DESC LIMIT 400`
  ).all();
  const lista = (results || []).map((c) => ({
    id: c.id, artistId: c.artist_id, artista: c.artista, faixa: c.titulo_atual || c.titulo || 'faixa', kind: c.kind || null,
    trackId: c.track_id, noAr: !!c.titulo_atual, seg: c.seg == null ? null : Number(c.seg), texto: c.texto, tipo: c.tipo,
    autor: c.autor, nome: c.nome, respostaDe: c.resposta_de, feito: c.feito_em, at: c.at,
    antiga: !!(c.versao_atual && c.versao && c.versao !== c.versao_atual),
    link: linkDaFaixa(c.slug, c.code, c.track_id, c.seg)
  }));
  return { ok: true, lista, ...resumoDe(lista) };
}

// Abertos = comentário do artista (não resposta, não aprovação) que o Bruno não marcou feito
function resumoDe(lista) {
  const abertos = lista.filter((c) => c.tipo === 'nota' && c.autor === 'artista' && !c.respostaDe && !c.feito).length;
  const ultimo = lista.find((c) => c.autor === 'artista') || null;
  return { abertos, ultimo: ultimo ? { at: ultimo.at, nome: ultimo.nome, artista: ultimo.artista } : null };
}

export async function painelResumo(d) {
  const r = await d.prepare(
    `SELECT SUM(CASE WHEN tipo = 'nota' AND autor = 'artista' AND resposta_de IS NULL AND feito_em IS NULL THEN 1 ELSE 0 END) AS abertos,
            COUNT(*) AS total, MAX(CASE WHEN autor = 'artista' THEN at END) AS ultimo
       FROM comentarios`
  ).first();
  return { ok: true, abertos: Number(r && r.abertos) || 0, total: Number(r && r.total) || 0, ultimo: (r && r.ultimo) || null };
}

// responder, feito/reabrir, apagar. Volta a lista nova (a tela redesenha com ela).
export async function painelAcao(op, d, body) {
  const id = Number(body && body.id) || 0;
  const c = id ? await d.prepare('SELECT id, artist_id, track_id, titulo, tipo FROM comentarios WHERE id = ?').bind(id).first() : null;
  if (!c) return { status: 404, corpo: { erro: 'Esse comentário já saiu.' } };
  if (op === 'comentario-responder') {
    const texto = limpar(body.texto, MAX_TEXTO);
    if (!texto) return { status: 400, corpo: { erro: 'Escreve a resposta.' } };
    const t = await d.prepare('SELECT src_modified FROM tracks WHERE id = ?').bind(c.track_id).first();
    await d.prepare(
      `INSERT INTO comentarios (artist_id, track_id, titulo, versao, seg, texto, tipo, autor, nome, resposta_de, at)
       VALUES (?, ?, ?, ?, NULL, ?, 'nota', 'bruno', '@rideblan33', ?, ?)`
    ).bind(c.artist_id, c.track_id, c.titulo, t ? t.src_modified : null, texto, c.id, now()).run();
  } else if (op === 'comentario-feito') {
    await d.prepare('UPDATE comentarios SET feito_em = ? WHERE id = ?').bind(body.feito === false ? null : now(), c.id).run();
  } else if (op === 'comentario-apagar') {
    await d.prepare('DELETE FROM comentarios WHERE id = ? OR resposta_de = ?').bind(c.id, c.id).run();
  } else {
    return { status: 400, corpo: { erro: 'op desconhecida' } };
  }
  return { status: 200, corpo: await painelLer(d) };
}
