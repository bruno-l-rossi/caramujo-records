// Perfil do @rideblan33 (26/09/2026): caramujorecords.com.br/rideblan33
// A porta de entrada das beat tapes. Toda tape aparece sozinha (tape nova entra no
// topo); o painel esconde e reordena. A lista também alimenta o bloco "Mais do
// @rideblan33" no fim de cada tape e o sitemap.
//
// Leitura barata: UMA consulta (contagem de beats agrupada, nada por faixa), guardada
// 60 s no isolate e 5 min na cópia da região. O painel derruba as duas quando muda
// alguma coisa (esquecerPerfil).

import { db } from './db.js';
import { MIDIA } from './midia.js';
import { PADRAO as NUM_PADRAO, deTexto as numDeTexto, limpar as numLimpar, curto, longo } from './numeros.js';

const VALIDADE = 60 * 1000;
const REGIAO = '/__cache/perfil-v3';
let cache = { at: 0, dados: null };

const regiao = () => (typeof caches !== 'undefined' && caches.default ? caches.default : null);

export async function esquecerPerfil(request) {
  cache = { at: 0, dados: null };
  const c = regiao();
  if (c && request) { try { await c.delete(new URL(REGIAO, request.url)); } catch (_) { /* bônus */ } }
}

// Pastilhas das capas (27/09/2026). NOVA: a 1ª tape da lista do perfil (a ordem do
// painel manda; tape recriada no Drive ganha id novo sem ser nova, ex. 2021 tape).
// EM ALTA: a tape do perfil com mais plays nos últimos 30 dias; se for a própria NOVA,
// passa pra 2ª mais tocada. A conta passa por todos os plays do mês, então roda no
// máximo a cada 6 h e guarda o ranking (top 5) na meta; quem é a NOVA é decidido na
// hora (2ª rodada de 27/09: o guardado era só um id e, quando ele virava a NOVA,
// nenhuma tape ficava em alta).
export const EM_ALTA_MIN = 1;
const EM_ALTA_CHAVE = 'perfil-emalta-2';
const EM_ALTA_VALIDADE = 6 * 60 * 60 * 1000;
const EM_ALTA_JANELA = 30 * 24 * 60 * 60 * 1000;

export function escolherEmAlta(ranking, nova) {
  const top = (ranking || []).find((r) => r[0] !== nova && r[1] >= EM_ALTA_MIN);
  return top ? top[0] : null;
}

// Uma consulta pra meta (ranking do em alta + números do site); a conta dos plays só
// quando o ranking guardado passou de 6 h.
async function lerMetaPerfil(d, nova) {
  let ranking = null, numeros = { ...NUM_PADRAO };
  try {
    const { results } = await d.prepare(
      `SELECT chave, valor FROM meta WHERE chave IN ('${EM_ALTA_CHAVE}', 'numeros')`
    ).all();
    for (const r of results || []) {
      if (r.chave === 'numeros') numeros = numDeTexto(r.valor);
      else { try { ranking = JSON.parse(r.valor); } catch (_) { ranking = null; } }
    }
  } catch (_) { /* segue com o padrão */ }
  if (!ranking || !Array.isArray(ranking.top) || !(Date.now() - Date.parse(ranking.at) < EM_ALTA_VALIDADE)) {
    try {
      const desde = new Date(Date.now() - EM_ALTA_JANELA).toISOString();
      const { results } = await d.prepare(
        `SELECT e.artist_id AS id, COUNT(*) AS n FROM events e
           JOIN artists a ON a.id = e.artist_id AND a.tipo = 'tape' AND a.perfil = 1
          WHERE e.kind = 'play' AND e.at >= ?
          GROUP BY e.artist_id ORDER BY n DESC, e.artist_id DESC LIMIT 5`
      ).bind(desde).all();
      ranking = { top: (results || []).map((r) => [r.id, r.n]), at: new Date().toISOString() };
      await d.prepare(`INSERT OR REPLACE INTO meta (chave, valor) VALUES ('${EM_ALTA_CHAVE}', ?)`)
        .bind(JSON.stringify(ranking)).run();
    } catch (_) { if (!ranking || !Array.isArray(ranking.top)) ranking = { top: [] }; }
  }
  return { emAlta: escolherEmAlta(ranking.top, nova), numeros };
}

// O perfil inteiro: { tapes: [{ id, name, slug, code, capa, n }], faixas: [...], nova, emAlta }.
// tapes = na ordem da tela; tape sem beat pronto (ainda não convertida) não aparece.
// faixas = os beats da 1ª tape (a mais nova), pro "Ouça a última beat tape" do topo,
// na mesma ordem da página da tape (reservados primeiro, depois o mais novo no Drive).
// Duas consultas, guardadas 60 s na memória e 5 min na região.
export async function lerPerfil(request, env) {
  if (cache.dados && Date.now() - cache.at < VALIDADE) return cache.dados;
  const c = regiao();
  const chave = request ? new URL(REGIAO, request.url) : null;
  if (c && chave) {
    try {
      const r = await c.match(chave);
      if (r) { const dd = await r.json(); cache = { at: Date.now(), dados: dd }; return dd; }
    } catch (_) { /* segue pro banco */ }
  }
  const d = await db(env);
  const { results } = await d.prepare(
    `SELECT a.id, a.name, a.slug, a.code, a.cover_key, COALESCE(c.n, 0) AS n
       FROM artists a
       LEFT JOIN (SELECT artist_id, COUNT(*) AS n FROM tracks
                   WHERE kind = 'beat' AND ready = 1 GROUP BY artist_id) c ON c.artist_id = a.id
      WHERE a.tipo = 'tape' AND a.perfil = 1
      ORDER BY COALESCE(a.perfil_ordem, -1000000000 - a.id), a.id`
  ).all();
  const tapes = (results || []).filter((r) => r.n > 0).map((r) => ({
    id: r.id, name: r.name, slug: r.slug, code: r.code,
    capa: r.cover_key || null, n: r.n
  }));
  let faixas = [];
  if (tapes.length) {
    const { results: f } = await d.prepare(
      `SELECT id, title, dur FROM tracks WHERE artist_id = ? AND kind = 'beat' AND ready = 1
        ORDER BY CASE grp WHEN 'res' THEN 0 ELSE 1 END, src_modified DESC LIMIT 40`
    ).bind(tapes[0].id).all();
    faixas = (f || []).map((x) => ({ id: x.id, t: x.title, d: x.dur || 0 }));
  }
  const nova = tapes.length ? tapes[0].id : null;
  const meta = await lerMetaPerfil(d, nova);
  const emAlta = meta.emAlta;
  const dados = { tapes, faixas, nova, emAlta: tapes.some((t) => t.id === emAlta) ? emAlta : null, numeros: meta.numeros };
  cache = { at: Date.now(), dados };
  if (c && chave) {
    try {
      await c.put(chave, new Response(JSON.stringify(dados), {
        headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=300' }
      }));
    } catch (_) { /* cópia é bônus */ }
  }
  return dados;
}

// Só a lista (bloco "Mais de @rideblan33" das tapes e o sitemap)
export async function tapesDoPerfil(request, env) {
  return (await lerPerfil(request, env)).tapes;
}

export const SITE = 'https://caramujorecords.com.br';
export const REDES = {
  spotify: 'https://open.spotify.com/artist/15K9QWM2Q6Zyxb6RsAn9RZ',
  youtube: 'https://www.youtube.com/@rideblan33',
  instagram: 'https://www.instagram.com/rideblan33',
  soundcloud: 'https://soundcloud.com/rideblan33'
};

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// JSON dentro de <script>: foge de < > & e dos separadores de linha do Unicode
const jsonSeguro = (o) => JSON.stringify(o).replace(/[<>&\u2028\u2029]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
const beats = (n) => n + (n === 1 ? ' beat' : ' beats');
const ICONE_TOCA = '<svg class="i-toca" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 3l15 9-15 9z"/></svg>';
const ICONE_PAUSA = '<svg class="i-pausa" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="4" width="5" height="16"/><rect x="14" y="4" width="5" height="16"/></svg>';

const ICONES = {
  spotify: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M7 9.3c3.4-1 7.2-.7 10.2 1"/><path d="M7.6 12.4c2.8-.8 5.7-.5 8.2.9"/><path d="M8.2 15.3c2.1-.5 4.2-.3 6 .7"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="2.5" y="5.5" width="19" height="13" rx="3.5"/><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor" stroke="none"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/></svg>',
  compartilhar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="M8.3 13.3l7.4 4.4"/><path d="M15.7 6.3l-7.4 4.4"/></svg>'
};
// o mesmo ?v das outras páginas: trocar junto com index.html e catalogo/app.html
export const STORY_JS = '/assets/story.js?v=2026-10-03a';

const ICONE_FOGO = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c1 4-3 5-3 9a3 3 0 006 0c0-1.5-.6-2.4-1-3 2.5 1 4 3.6 4 6.5A6 6 0 016 14.5C6 9 11 7 12 2z"/></svg>';
function pastilha(t, nova, emAlta) {
  if (t.id === nova) return '<span class="pst nova">Nova</span>';
  if (t.id === emAlta) return `<span class="pst alta">${ICONE_FOGO}Em alta</span>`;
  return '';
}

function grade(tapes, nova = null, emAlta = null) {
  return tapes.map((t, i) => {
    const href = `/${t.slug}/${t.code}?de=perfil`;
    const img = t.capa
      ? `<img src="/capa/${esc(t.capa)}" srcset="/capa/${esc(t.capa)}?p 200w, /capa/${esc(t.capa)}?m 480w, /capa/${esc(t.capa)} 1000w" sizes="(max-width:600px) 31vw, (max-width:820px) 24vw, 222px" alt="Capa da beat tape ${esc(t.name)}" width="1000" height="1000"${i < 6 ? '' : ' loading="lazy"'} decoding="async">`
      : `<img class="semcapa" src="/assets/brand/caramujo-v.webp" alt="Beat tape ${esc(t.name)}" width="300" height="300"${i < 6 ? '' : ' loading="lazy"'}>`;
    return `<a class="tape" href="${esc(href)}" data-id="${t.id}"><span class="capa">${img}<span class="sobre" aria-hidden="true"><b>${esc(t.name)}</b><i>${beats(t.n)}</i></span>${pastilha(t, nova, emAlta)}</span><span class="leg"><b>${esc(t.name)}</b><i>${beats(t.n)}</i></span></a>`;
  }).join('\n');
}

// Ícones da aba do navegador: o padrão de TODAS as páginas do site (selo em SVG,
// PNG de 180 pro iPhone). Página nova usa esse mesmo bloco.
export const FAVICON = '<link rel="icon" type="image/svg+xml" href="/assets/brand/selo-creme.svg">\n' +
  '<link rel="icon" type="image/png" sizes="180x180" href="/assets/brand/icone-180.png">\n' +
  '<link rel="apple-touch-icon" href="/assets/brand/icone-180.png">';

// barraFixa: a barra fina com a foto e o @ que aparece presa no topo quando a pessoa
// desce pras capas (o Bruno decide se fica; 26/09/2026).
export function paginaPerfil(dados, { url, barraFixa = true } = {}) {
  const tapes = Array.isArray(dados) ? dados : dados.tapes;
  const faixas = Array.isArray(dados) ? [] : (dados.faixas || []);
  const idNova = !Array.isArray(dados) && dados.nova != null ? dados.nova : (tapes.length ? tapes[0].id : null);
  const idEmAlta = Array.isArray(dados) ? null : (dados.emAlta ?? null);
  const nova = tapes[0] || null;
  const tocador = nova && faixas.length ? {
    tape: { id: nova.id, name: nova.name, url: `/${nova.slug}/${nova.code}?de=perfil`, capa: nova.capa ? `/capa/${nova.capa}?p` : '/assets/brand/caramujo-v.webp',
      // a tela de bloqueio usa a arte inteira, igual à página da tape
      arte: nova.capa ? `/capa/${nova.capa}` : '/assets/brand/Caramujo_Records.png' },
    faixas
  } : null;
  const titulo = '@rideblan33 · Portfólio';
  const descricaoGoogle = `Portfólio do @rideblan33, produtor e beatmaker de rap em São Carlos, SP. ${tapes.length} beat tapes pra ouvir, beats exclusivos e produção completa na Caramujo Records.`;
  // os números grandes vêm do painel (Números do site); sem eles, os de sempre
  const num = numLimpar(!Array.isArray(dados) && dados.numeros ? dados.numeros : NUM_PADRAO);
  const descricaoPrevia = `Produtor & beatmaker. 33 memórias distantes. ${num.artistas}+ artistas · ${num.faixas}+ faixas · ${curto(num.streams)} de streams.`;
  // sem os números desenhados (27/09/2026): eles mudam no painel e ficam só no texto da prévia
  const og = SITE + '/assets/perfil/rideblan33-og-2.jpg';
  const pessoa = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    // o mesmo @id do founder no JSON-LD da home: o Google junta as duas páginas na mesma pessoa
    '@id': SITE + '/rideblan33#pessoa',
    name: '@rideblan33',
    alternateName: ['rideblan33', 'rideblan'],
    jobTitle: 'Produtor musical e beatmaker',
    description: `Produtor & beatmaker de rap. ${num.artistas}+ artistas, ${num.faixas}+ faixas, ${longo(num.streams)} de streams.`,
    url: SITE + '/rideblan33',
    image: SITE + '/assets/perfil/rideblan33.webp',
    homeLocation: { '@type': 'Place', name: 'São Carlos, SP', address: { '@type': 'PostalAddress', addressLocality: 'São Carlos', addressRegion: 'SP', addressCountry: 'BR' } },
    worksFor: { '@type': 'Organization', name: 'Caramujo Records', url: SITE },
    knowsAbout: ['beats', 'produção musical', 'rap', 'hip hop', 'trap', 'boom bap', 'mixagem', 'masterização'],
    sameAs: [REDES.instagram, REDES.youtube, REDES.spotify, REDES.soundcloud]
  };
  const lista = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Beat tapes do @rideblan33',
    numberOfItems: tapes.length,
    itemListElement: tapes.map((t, i) => ({
      '@type': 'ListItem', position: i + 1,
      item: { '@type': 'MusicPlaylist', name: t.name, url: `${SITE}/${t.slug}/${t.code}`, numTracks: t.n }
    }))
  };

  return `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descricaoGoogle)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${SITE}/rideblan33">
<meta property="og:type" content="profile">
<meta property="og:site_name" content="Caramujo Records">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descricaoPrevia)}">
<meta property="og:url" content="${SITE}/rideblan33">
<meta property="og:image" content="${og}">
<meta property="og:image:secure_url" content="${og}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="@rideblan33 de costas, com a camisa 33">
<meta property="profile:username" content="rideblan33">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(titulo)}">
<meta name="twitter:description" content="${esc(descricaoPrevia)}">
<meta name="twitter:image" content="${og}">
<meta name="theme-color" content="#14110d">
${FAVICON}
<link rel="preload" as="image" href="/assets/perfil/rideblan33.webp" fetchpriority="high">
<link rel="preload" as="font" type="font/woff2" href="/assets/fonts/cormorant-garamond-latin-600-normal.woff2" crossorigin>
<script type="application/ld+json">${jsonSeguro(pessoa)}</script>
<script type="application/ld+json">${jsonSeguro(lista)}</script>
<style>
@font-face{font-family:'Cormorant Garamond';font-weight:500;font-style:italic;font-display:swap;src:url(/assets/fonts/cormorant-garamond-latin-500-italic.woff2) format('woff2')}
@font-face{font-family:'Cormorant Garamond';font-weight:600;font-style:normal;font-display:swap;src:url(/assets/fonts/cormorant-garamond-latin-600-normal.woff2) format('woff2')}
@font-face{font-family:'Schibsted Grotesk';font-weight:500;font-display:swap;src:url(/assets/fonts/schibsted-grotesk-latin-500-normal.woff2) format('woff2')}
@font-face{font-family:'Schibsted Grotesk';font-weight:700;font-display:swap;src:url(/assets/fonts/schibsted-grotesk-latin-700-normal.woff2) format('woff2')}
@font-face{font-family:'IBM Plex Mono';font-weight:400;font-display:swap;src:url(/assets/fonts/ibm-plex-mono-latin-400-normal.woff2) format('woff2')}
:root{color-scheme:dark;
  --black:#14110d;--deep:#1A1815;--dark:#1e1a15;--mole:#221e18;
  --fire:#b98f5e;--amber:#c3a074;--cream:#f2ecdf;--bone:#E8E0CF;--read:#b89e72;--label:#9e7c48;--wire:#332c22;--dim:#6f6757;
  --preto:#000;--folha:#141414;--div:#1f1f1f;--branco:#fff;--apoio:#b7b7b7;--meta:#8a8a8a;--apagado:#454545;
  --serif:'Cormorant Garamond',Georgia,serif;--sans:'Helvetica Neue',Helvetica,Arial,sans-serif;
  --grot:'Schibsted Grotesk',-apple-system,'Helvetica Neue',Arial,sans-serif;--mono:'IBM Plex Mono',ui-monospace,Menlo,monospace}
*{box-sizing:border-box}
html,body{background:var(--black)}
body{margin:0;color:var(--bone);font-family:var(--sans);-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
a:focus-visible{outline:2px solid var(--fire);outline-offset:3px}
.terra{position:relative;overflow:hidden;padding:0 16px 56px;padding-top:env(safe-area-inset-top,0px);
  background:radial-gradient(ellipse 70% 55% at 72% 38%,rgba(185,143,94,.10),transparent 70%),var(--black)}
.terra::before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.10;mix-blend-mode:screen;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 .95 0 0 0 0 .88 0 0 0 1.4 -.5'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.topo{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:16px;max-width:1180px;margin:0 auto;padding:26px 0 50px}
.topo .logo{display:block;line-height:0}
.topo .logo img{width:168px;height:auto}
.ouca{display:inline-flex;align-items:center;gap:10px;height:44px;padding:0 20px 0 16px;border:1px solid var(--fire);border-radius:999px;background:var(--fire);color:var(--black);font:700 11px/1 var(--sans);letter-spacing:.18em;text-transform:uppercase;cursor:pointer;white-space:nowrap;transition:background .2s,border-color .2s}
.ouca:hover{background:var(--amber);border-color:var(--amber)}
.ouca svg{width:13px;height:13px;flex:none}
.ouca .i-pausa{display:none}
.ouca[aria-pressed="true"] .i-toca{display:none}
.ouca[aria-pressed="true"] .i-pausa{display:block}
/* mini player do "Ouça a última beat tape" */
.tocando{position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:30;width:min(560px,calc(100% - 24px));display:flex;align-items:center;gap:12px;padding:9px 10px 9px 9px;border:1px solid var(--wire);border-radius:16px;background:rgba(20,17,13,.96);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 18px 40px rgba(0,0,0,.5);font-family:var(--grot)}
.tocando[hidden]{display:none}
.tocando .t-capa{width:44px;height:44px;flex:none;border-radius:6px;overflow:hidden;background:#000}
.tocando .t-capa img{width:100%;height:100%;object-fit:cover;display:block}
.tocando .t-txt{flex:1;min-width:0}
.tocando .t-txt b{display:block;font:700 14px/1.2 var(--grot);color:var(--cream);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tocando .t-txt small{display:block;margin-top:3px;font:500 12px/1.2 var(--grot);color:var(--read);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* toque em qualquer lugar do player (fora dos botões) abre a tape: um link cobre a caixa, os botões ficam por cima */
.tocando .t-link{position:absolute;inset:0;z-index:1;border-radius:16px}
.tocando .t-capa,.tocando .t-txt{position:relative;pointer-events:none}
.tocando button{position:relative;z-index:2}
@media(hover:hover){.tocando:hover{border-color:var(--clay)}.tocando:hover .t-txt small{color:var(--amber)}}
.tocando button{flex:none;display:grid;place-items:center;width:40px;height:40px;border-radius:50%;border:0;background:transparent;color:var(--cream);cursor:pointer}
.tocando .t-play{background:var(--cream);color:var(--black)}
.tocando button svg{width:16px;height:16px}
.tocando .t-play .i-pausa{display:none}
.tocando.toca .t-play .i-toca{display:none}
.tocando.toca .t-play .i-pausa{display:block}
.tocando .barra{position:absolute;left:12px;right:12px;bottom:0;height:2px;background:rgba(242,236,223,.12);border-radius:2px;overflow:hidden}
.tocando .barra i{display:block;height:100%;width:0;background:var(--fire)}
/* barra que acompanha (aparece depois do topo) */
.fixa{position:fixed;left:0;right:0;top:0;z-index:25;display:flex;align-items:center;gap:12px;padding:10px 16px;padding-top:calc(10px + env(safe-area-inset-top,0px));background:rgba(20,17,13,.94);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid var(--wire);transform:translateY(-110%);transition:transform .25s ease}
.fixa.on{transform:none}
.fixa img{width:34px;height:34px;border-radius:50%}
.fixa b{flex:1;min-width:0;font:600 22px/1 var(--serif);color:var(--cream)}
.fixa .ouca{height:36px;padding:0 14px 0 12px;font-size:10px}
.palco{position:relative;z-index:1;max-width:1180px;margin:0 auto;min-height:520px;display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);align-items:end;border:1px solid var(--wire);background:linear-gradient(180deg,var(--dark),var(--deep))}
.texto{padding:56px 0 56px 56px;align-self:center}
.kicker{font:700 11px/1 var(--sans);letter-spacing:.28em;text-transform:uppercase;color:var(--label);margin:0 0 22px}
h1{font:600 clamp(56px,8.6vw,124px)/.9 var(--serif);color:var(--cream);margin:0;letter-spacing:-.01em;overflow-wrap:anywhere}
.bio{font:italic 500 clamp(24px,2.4vw,32px)/1.18 var(--serif);color:var(--bone);margin:22px 0 0}
.numeros{font:400 13px/1.6 var(--mono);color:var(--read);margin:26px 0 0;letter-spacing:.02em}
.numeros b{font-weight:400;color:var(--cream)}
.numeros span{white-space:nowrap}
.botoes{display:flex;flex-wrap:wrap;gap:12px;margin-top:32px}
.botoes a,.botoes button{display:grid;place-items:center;width:48px;height:48px;border:1px solid var(--wire);border-radius:50%;color:var(--cream);background:rgba(20,17,13,.55);transition:border-color .2s,color .2s}
.botoes a:hover,.botoes button:hover{border-color:var(--fire);color:var(--fire)}
/* 5º botão (27/09/2026): compartilhar o perfil. Aro claro pra não parecer mais uma rede */
.botoes .comp{padding:0;font:inherit;cursor:pointer;border-color:rgba(242,236,223,.55);background:rgba(242,236,223,.06)}
.aviso{position:fixed;left:50%;bottom:calc(90px + env(safe-area-inset-bottom,0px));transform:translate(-50%,8px);z-index:9500;max-width:calc(100% - 32px);padding:11px 16px;background:#1e1a12;border:1px solid var(--clay);color:var(--bone);font:400 12.5px/1.4 var(--mono);opacity:0;pointer-events:none;transition:opacity .2s,transform .2s}
.aviso.on{opacity:1;transform:translate(-50%,0)}
.botoes svg{width:20px;height:20px}
.botoes .casa{border-color:var(--fire)}
.botoes .casa img{width:26px;height:26px}
.foto{position:relative;align-self:stretch;min-height:520px}
.num33{position:absolute;right:-2%;top:50%;transform:translateY(-54%);font:600 clamp(260px,34vw,470px)/1 var(--serif);color:transparent;-webkit-text-stroke:1.5px rgba(185,143,94,.55);letter-spacing:-.04em;user-select:none;pointer-events:none}
.foto img{position:absolute;bottom:-1px;left:50%;transform:translateX(-38%);height:105%;max-height:590px;width:auto;filter:drop-shadow(0 18px 30px rgba(0,0,0,.55))}
.preto{background:var(--preto);color:var(--branco);font-family:var(--grot);padding:64px 16px 80px}
.cab{max-width:1180px;margin:0 auto 22px;display:flex;align-items:baseline;justify-content:space-between;gap:16px}
.cab h2{margin:0;font:700 13px/1 var(--grot);letter-spacing:.2em;text-transform:uppercase}
.cab span{font:500 13px/1 var(--grot);color:var(--meta);font-variant-numeric:tabular-nums}
.moldura{max-width:1180px;margin:0 auto;background:var(--folha);border:1px solid var(--div);padding:14px}
.grade{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px}
.tape{display:block;min-width:0}
.capa{position:relative;display:block;aspect-ratio:1;overflow:hidden;background:#0a0a0a}
.capa img{display:block;width:100%;height:100%;object-fit:cover;transition:transform .35s ease,filter .35s ease}
.capa img.semcapa{object-fit:contain;padding:22%;background:var(--preto)}
.sobre{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:16px;text-align:center;background:rgba(0,0,0,.62);opacity:0;transition:opacity .25s ease}
.sobre b{font:700 17px/1.15 var(--grot);letter-spacing:-.01em;color:var(--branco);text-wrap:balance;overflow-wrap:anywhere}
.sobre i{font:500 13px/1 var(--grot);font-style:normal;color:var(--apoio);font-variant-numeric:tabular-nums}
.leg{display:none}
/* pastilhas NOVA e EM ALTA (27/09/2026): o mesmo desenho do DISPONÍVEL das tapes */
.pst{position:absolute;left:8px;top:8px;z-index:2;display:inline-flex;align-items:center;gap:5px;padding:5px 8px;border-radius:3px;font:700 10.5px/1 var(--grot);letter-spacing:.12em;text-transform:uppercase;white-space:nowrap;pointer-events:none}
.pst.nova{background:#E4DAC7;color:#000}
.pst.alta{background:rgba(0,0,0,.55);color:var(--branco);box-shadow:inset 0 0 0 1px rgba(255,255,255,.75);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.pst svg{width:10px;height:10px;flex:none}
@media (hover:hover){.tape:hover .sobre,.tape:focus-visible .sobre{opacity:1}.tape:hover img:not(.semcapa){transform:scale(1.035);filter:saturate(.85)}}
@media (hover:none){.sobre{display:none}.leg{display:flex;flex-direction:column;gap:5px;padding-top:10px}.leg b{font:500 15px/1.2 var(--grot);color:var(--branco);overflow-wrap:anywhere}.leg i{font:500 13px/1 var(--grot);font-style:normal;color:var(--meta)}}
/* rodapé igual ao da vitrine (26/09/2026): selo, © e @rideblan33, mesmas letras e disposição */
footer{padding:1.4rem 2.4rem calc(1.4rem + env(safe-area-inset-bottom,0px));background:var(--black);border-top:1px solid var(--wire);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem}
footer img{height:30px;width:auto;display:block}
footer p{margin:0;font-family:var(--sans);font-size:.57rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--dim)}
footer a.foot-perfil{color:inherit;text-decoration:none;border-bottom:1px solid var(--wire);transition:color .2s,border-color .2s}
@media (hover:hover){footer a.foot-perfil:hover{color:var(--fire);border-bottom-color:var(--fire)}}
@media (max-width:860px){footer{flex-direction:column;align-items:flex-start;padding:1.2rem 1.2rem calc(1.2rem + env(safe-area-inset-bottom,0px))}footer p{font-size:.63rem}}
@media (max-width:480px){footer{gap:.5rem}}
body.com-player footer{padding-bottom:calc(110px + env(safe-area-inset-bottom,0px))}
@media (max-width:1100px){.grade{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media (max-width:820px){
  .topo{padding:16px 0 20px;gap:10px}
  .topo .logo img{width:118px}
  .ouca{height:38px;padding:0 13px 0 11px;font-size:9.5px;letter-spacing:.13em;gap:8px}
  .fixa b{font-size:20px}
  .fixa .ouca span{display:none}
  .fixa .ouca{width:36px;padding:0;justify-content:center}
  .terra{padding-bottom:40px}
  .palco{grid-template-columns:1fr;min-height:0;margin-top:44px}
  .foto{order:-1;min-height:330px}
  /* a foto passa só 30px da moldura: nunca encosta no cabeçalho */
  .foto img{height:360px;max-height:none;width:auto;bottom:-1px;left:50%;transform:translateX(-50%)}
  .num33{font-size:min(84vw,420px);right:auto;left:50%;transform:translate(-50%,-58%)}
  .texto{padding:28px 20px 32px;text-align:center}
  .kicker{margin-bottom:16px}.bio{margin-top:16px}
  .botoes{justify-content:center;margin-top:26px}
  .preto{padding:40px 16px 56px}
  .moldura{padding:0;background:none;border:0}
  .grade{grid-template-columns:repeat(4,minmax(0,1fr));gap:20px 10px}
  .sobre{display:none}
  .leg{display:flex;flex-direction:column;gap:5px;padding-top:10px}
  .leg b{font:500 15px/1.2 var(--grot);color:var(--branco);overflow-wrap:anywhere}
  .leg i{font:500 13px/1 var(--grot);font-style:normal;color:var(--meta)}
}
/* celular: 3 capas por linha (26/09/2026) */
@media (max-width:600px){
  .grade{grid-template-columns:repeat(3,minmax(0,1fr));gap:18px 8px}
  .leg{gap:4px;padding-top:8px}
  .leg b{font-size:12.5px;line-height:1.2;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
  .leg i{font-size:11.5px}
  .pst{left:6px;top:6px;padding:4px 6px;font-size:9px;gap:4px}
  .pst svg{width:9px;height:9px}
}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
</style>
</head>
<body>
<header class="terra">
  <nav class="topo" aria-label="Caramujo Records">
    <a class="logo" href="/?de=perfil" aria-label="Caramujo Records, beats à venda"><img src="/assets/brand/caramujo-h.webp" alt="Caramujo Records" width="296" height="54"></a>
    ${tocador ? `<button class="ouca" id="ouca" type="button" aria-pressed="false">${ICONE_TOCA}${ICONE_PAUSA}<span>Ouça a última beat tape</span></button>` : ''}
  </nav>
  <section class="palco">
    <div class="texto">
      <p class="kicker">Caramujo Records</p>
      <h1>@rideblan33</h1>
      <p class="bio">Produtor &amp; beatmaker.<br>33 memórias distantes.</p>
      <p class="numeros"><span><b>${num.artistas}+</b> artistas</span> · <span><b>${num.faixas}+</b> faixas</span> · <span><b>${curto(num.streams)}</b> de streams</span></p>
      <div class="botoes">
        <a class="casa" href="/?de=perfil#beats" aria-label="Beats à venda na Caramujo Records" title="Beats à venda" data-rede="vitrine"><img src="/assets/brand/selo-creme.svg" alt="" width="26" height="26"></a>
        <a href="${REDES.spotify}" target="_blank" rel="noopener" aria-label="Spotify" title="Spotify" data-rede="spotify">${ICONES.spotify}</a>
        <a href="${REDES.youtube}" target="_blank" rel="noopener" aria-label="YouTube" title="YouTube" data-rede="youtube">${ICONES.youtube}</a>
        <a href="${REDES.instagram}" target="_blank" rel="noopener" aria-label="Instagram" title="Instagram" data-rede="instagram">${ICONES.instagram}</a>
        <button class="comp" id="compartilhar" type="button" aria-label="Compartilhar perfil" title="Compartilhar">${ICONES.compartilhar}</button>
      </div>
    </div>
    <div class="foto" aria-hidden="true">
      <span class="num33">33</span>
      <img src="/assets/perfil/rideblan33.webp" srcset="/assets/perfil/rideblan33-480.webp 480w, /assets/perfil/rideblan33.webp 720w" sizes="(max-width:820px) 300px, 420px" alt="" width="720" height="1200" fetchpriority="high">
    </div>
  </section>
</header>
${barraFixa ? `<div class="fixa" id="fixa" aria-hidden="true"><img src="/assets/perfil/rideblan33-avatar.webp" alt="" width="34" height="34"><b>@rideblan33</b>${tocador ? `<button class="ouca" type="button" data-ouca aria-pressed="false" tabindex="-1">${ICONE_TOCA}${ICONE_PAUSA}<span>Ouça a última tape</span></button>` : ''}</div>` : ''}
${tocador ? `<div class="tocando" id="tocando" hidden>
  <a class="t-link" id="tLink" href="${esc(tocador.tape.url)}" aria-label="Abrir a tape ${esc(tocador.tape.name)}"></a>
  <span class="t-capa"><img src="${esc(tocador.tape.capa)}" alt="" width="44" height="44"></span>
  <div class="t-txt"><b id="tNome">—</b><small>${esc(tocador.tape.name)}</small></div>
  <button id="tAnt" type="button" aria-label="Beat anterior"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5v14h2.6V5zM19 5l-9 7 9 7z"/></svg></button>
  <button class="t-play" id="tPlay" type="button" aria-label="Pausar">${ICONE_TOCA}${ICONE_PAUSA}</button>
  <button id="tProx" type="button" aria-label="Próximo beat"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17 5v14h-2.6V5zM5 5l9 7-9 7z"/></svg></button>
  <span class="barra"><i id="tBarra"></i></span>
</div>
<script type="application/json" id="tocadorDados">${jsonSeguro(tocador)}</script>` : ''}

<script type="application/json" id="compDados">${jsonSeguro({ total: tapes.length, capas: tapes.slice(0, 9).map((t) => (t.capa ? '/capa/' + t.capa : null)) })}</script>
<div class="aviso" id="aviso" role="status" aria-live="polite"></div>

<main class="preto" id="tapes">
  <div class="cab"><h2>Beat tapes</h2><span>${tapes.length} ${tapes.length === 1 ? 'tape' : 'tapes'}</span></div>
  <div class="moldura"><div class="grade">
${grade(tapes, idNova, idEmAlta)}
  </div></div>
</main>

<footer>
  <a href="/?de=perfil" aria-label="Caramujo Records"><img loading="lazy" width="400" height="400" src="/assets/brand/selo-creme.svg" alt="Caramujo Records"></a>
  <p>© 2026 Caramujo Records — São Carlos, SP</p>
  <p><a class="foot-perfil" href="/rideblan33">@rideblan33</a> · Todos os direitos reservados</p>
</footer>
<script>
(function(){
  // visitas e cliques do perfil pro analytics do painel (nada pessoal: o servidor
  // guarda só um hash curto de IP + navegador, igual às tapes)
  function manda(o){try{var s=JSON.stringify(o);if(navigator.sendBeacon)navigator.sendBeacon('/api/play',new Blob([s],{type:'application/json'}));else fetch('/api/play',{method:'POST',body:s,headers:{'content-type':'application/json'},keepalive:true});}catch(e){}}
  var de='';try{de=(new URLSearchParams(location.search).get('de')||'').toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,24);}catch(e){}
  if(!de){var r='';try{r=new URL(document.referrer).hostname;}catch(e){}
    de=/instagram/.test(r)?'instagram':/google\\./.test(r)?'google':/youtube|youtu\\.be/.test(r)?'youtube':/facebook|fb\\./.test(r)?'facebook':/whatsapp/.test(r)?'whatsapp':/spotify/.test(r)?'spotify':/caramujorecords/.test(r)?'site':r?'outro-site':'direto';}
  manda({kind:'perfil',origem:de});
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a[data-id],a[data-rede]');if(!a)return;
    if(a.dataset.id)manda({kind:'perfil-tape',artistId:+a.dataset.id,origem:de});
    else manda({kind:'perfil-rede',trackId:a.dataset.rede,origem:de});
  });

  // "Ouça a última beat tape": toca os beats da tape mais nova aqui mesmo, um atrás
  // do outro, sem sair da página. Cada beat conta como play da tape (origem perfil).
  var dadosEl=document.getElementById('tocadorDados'), T=null;
  try{ T=dadosEl?JSON.parse(dadosEl.textContent):null; }catch(e){ T=null; }
  var botoes=[].slice.call(document.querySelectorAll('#ouca,[data-ouca]'));
  var caixa=document.getElementById('tocando');
  if(T && T.faixas && T.faixas.length && caixa){
    var som=new Audio(); som.preload='none';
    var i=-1, contados={};
    // de onde sai o MP3 (03/10/2026): o domínio próprio do armazenamento, quando ligado
    var MIDIA=${JSON.stringify(MIDIA)};
    function somDe(id){ return MIDIA ? MIDIA+'/mp3/'+id+'.mp3' : '/audio/'+id; }
    // sempre em ordem aleatória (27/09/2026): embaralha no 1º play e de novo a cada volta
    // completa, sem repetir o beat que acabou de tocar
    function embaralha(){
      var a=T.faixas, atual=i>=0?a[i]:null, k, j, x;
      for(k=a.length-1;k>0;k--){ j=Math.floor(Math.random()*(k+1)); x=a[k]; a[k]=a[j]; a[j]=x; }
      if(atual && a.length>1 && a[0]===atual){ x=a[0]; a[0]=a[1]; a[1]=x; }
    }
    function proxima(){ if(i+1>=T.faixas.length){ embaralha(); vai(0); } else vai(i+1); }
    var nome=document.getElementById('tNome'), barra=document.getElementById('tBarra');
    function marca(){
      var toca=!som.paused;
      botoes.forEach(function(b){ b.setAttribute('aria-pressed',toca?'true':'false'); b.setAttribute('aria-label',toca?'Pausar a última beat tape':'Ouça a última beat tape'); });
      caixa.classList.toggle('toca',toca);
      document.getElementById('tPlay').setAttribute('aria-label',toca?'Pausar':'Tocar');
    }
    function vai(n){
      i=(n+T.faixas.length)%T.faixas.length;
      var f=T.faixas[i];
      som.src=somDe(f.id); nome.textContent=f.t;
      caixa.hidden=false; document.body.classList.add('com-player');
      som.play().catch(function(){ marca(); });
      if(!contados[f.id]){ contados[f.id]=1; manda({kind:'play',trackId:f.id,artistId:T.tape.id,origem:'perfil'}); }
      tarja(f);
    }
    // Tela de bloqueio e notificação no padrão da vitrine (e das tapes): nome do beat,
    // @rideblan33, Caramujo Records, capa inteira, e os mesmos botões.
    function tarja(f){
      if(!('mediaSession' in navigator)) return;
      var url=location.origin+T.tape.arte, tipo=/\\.png$/i.test(url)?'image/png':'image/jpeg';
      // igual à vitrine do site: nome do beat, @rideblan33, Caramujo Records, capa inteira
      try{ navigator.mediaSession.metadata=new MediaMetadata({ title:f.t, artist:'@rideblan33', album:'Caramujo Records',
        artwork:[{src:url,sizes:'1000x1000',type:tipo}] }); }catch(e){}
      var liga=function(a,fn){ try{ navigator.mediaSession.setActionHandler(a,fn) }catch(e){} };
      liga('play',function(){ som.play().catch(function(){}) });
      liga('pause',function(){ som.pause() });
      liga('previoustrack',function(){ if(som.currentTime>4){ som.currentTime=0; return; } vai(i-1); });
      liga('nexttrack',function(){ proxima(); });
      liga('seekbackward',function(d){ som.currentTime=Math.max(0,som.currentTime-(d&&d.seekOffset||15)); });
      liga('seekforward',function(d){ som.currentTime=Math.min(som.duration||1e9,som.currentTime+(d&&d.seekOffset||15)); });
      liga('seekto',function(d){ if(d&&d.seekTime!=null) som.currentTime=d.seekTime; });
      liga('stop',function(){ som.pause(); som.currentTime=0; });
    }
    function posicao(){
      if(!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
      var dur=som.duration; if(!dur||!isFinite(dur)) return;
      try{ navigator.mediaSession.setPositionState({ duration:dur, position:Math.min(som.currentTime,dur), playbackRate:som.playbackRate||1 }); }catch(e){}
    }
    function alterna(){ if(i<0){ embaralha(); return vai(0); } if(som.paused) som.play().catch(function(){}); else som.pause(); }
    botoes.forEach(function(b){ b.addEventListener('click',alterna); });
    document.getElementById('tPlay').addEventListener('click',alterna);
    document.getElementById('tProx').addEventListener('click',function(){ proxima(); });
    // anterior: no começo do beat volta pro anterior; passou de 4 s, volta pro começo dele
    document.getElementById('tAnt').addEventListener('click',function(){ if(som.currentTime>4){ som.currentTime=0; if(som.paused) som.play().catch(function(){}); } else vai(i-1); });
    som.addEventListener('play',function(){ marca(); if('mediaSession' in navigator) navigator.mediaSession.playbackState='playing'; });
    som.addEventListener('pause',function(){ marca(); if('mediaSession' in navigator) navigator.mediaSession.playbackState='paused'; });
    som.addEventListener('loadedmetadata',posicao); som.addEventListener('seeked',posicao);
    som.addEventListener('ended',function(){ proxima(); });
    som.addEventListener('timeupdate',function(){ barra.style.width=(som.duration?som.currentTime/som.duration*100:0)+'%'; });
    // o próximo beat já fica pronto na borda (03/10/2026): passou da metade, um pedido de
    // 2 bytes faz o servidor guardar o próximo inteiro, e ele começa sem espera
    var aquecidos={};
    som.addEventListener('timeupdate',function(){
      try{
        if(i<0||!som.duration||som.currentTime/som.duration<0.5) return;
        var f=T.faixas[i+1]; if(!f||aquecidos[f.id]) return;
        aquecidos[f.id]=1;
        fetch(somDe(f.id),{headers:{Range:'bytes=0-1'},cache:'no-store'}).catch(function(){});
      }catch(e){}
    });
  }

  // compartilhar o perfil (27/09/2026): a folha do story.js com as duas artes (Perfil e
  // Catálogo, só imagem) e o Enviar o link. O story.js desce quieto uns segundos depois.
  var comp=document.getElementById('compartilhar'), carregando=null;
  function storyJs(){
    if(window.CaramujoStory) return Promise.resolve();
    if(carregando) return carregando;
    carregando=new Promise(function(ok,falha){ var s=document.createElement('script'); s.src='${STORY_JS}'; s.onload=ok; s.onerror=function(){ carregando=null; falha(); }; document.head.appendChild(s); });
    return carregando;
  }
  var tAviso=null;
  function avisar(msg){ var a=document.getElementById('aviso'); if(!a) return; a.textContent=msg; a.classList.add('on'); clearTimeout(tAviso); tAviso=setTimeout(function(){ a.classList.remove('on'); },3200); }
  if(comp){
    var CD={}; try{ CD=JSON.parse(document.getElementById('compDados').textContent); }catch(e){}
    comp.addEventListener('click',function(){
      manda({kind:'perfil-rede',trackId:'compartilhar',origem:de});
      storyJs().then(function(){
        window.CaramujoStory.abrirPerfil({
          url: location.origin+'/rideblan33?de=link',
          urlStory: { perfil: location.origin+'/rideblan33?de=story', catalogo: location.origin+'/rideblan33?de=story-catalogo#tapes' },
          foto: '/assets/perfil/rideblan33.webp', capas: CD.capas||[], total: CD.total||0, nova: true,
          avisar: avisar,
          evento: function(t){ manda({kind:'perfil-rede',trackId:t,origem:de}); }
        });
      }).catch(function(){ avisar('Não carregou. Tenta de novo.'); });
    });
    (window.requestIdleCallback||function(f){ setTimeout(f,1) })(function(){ setTimeout(function(){ storyJs().catch(function(){}); },4000); });
  }

  // barra que acompanha: aparece quando o topo sai da tela
  var fixa=document.getElementById('fixa'), palco=document.querySelector('.palco');
  if(fixa && palco && 'IntersectionObserver' in window){
    new IntersectionObserver(function(l){
      var on=!l[0].isIntersecting && l[0].boundingClientRect.top<0;
      fixa.classList.toggle('on',on); fixa.setAttribute('aria-hidden',on?'false':'true');
      fixa.querySelectorAll('button').forEach(function(b){ b.tabIndex=on?0:-1; });
    }).observe(palco);
  }

  // voltar do celular fecha a folha de compartilhar (03/10/2026), em vez de sair do perfil.
  // Fechou pelo botão: a entrada extra do histórico sai junto.
  if(window.history && history.pushState && window.MutationObserver){
    var empilhado=false, proprio=false, lenTopo=0;
    var aberta=function(){ var v=document.querySelector('.cs-veu'); return !!(v && !v.hidden); };
    new MutationObserver(function(){
      if(aberta() && !empilhado){ empilhado=true; history.pushState({folha:1},'',location.href); lenTopo=history.length; return; }
      if(!aberta() && empilhado){
        empilhado=false;
        setTimeout(function(){ if(!empilhado && history.state && history.state.folha){ proprio=true; history.back(); } },0);
      }
    }).observe(document.body,{subtree:true,attributes:true,attributeFilter:['hidden']});
    window.addEventListener('popstate',function(){
      if(proprio){ proprio=false; return; }
      if(!empilhado) return;
      empilhado=false;
      if(history.length>lenTopo) return;            // foi pra frente (link #), não voltou
      if(aberta()){ try{ window.CaramujoStory.fechar(); }catch(e){} }
    });
  }
})();
</script>
</body></html>`;
}
