// Perfil do @rideblan33 (26/09/2026): caramujorecords.com.br/rideblan33
// A porta de entrada das beat tapes. Toda tape aparece sozinha (tape nova entra no
// topo); o painel esconde e reordena. A lista também alimenta o bloco "Mais do
// @rideblan33" no fim de cada tape e o sitemap.
//
// Leitura barata: UMA consulta (contagem de beats agrupada, nada por faixa), guardada
// 60 s no isolate e 5 min na cópia da região. O painel derruba as duas quando muda
// alguma coisa (esquecerPerfil).

import { db } from './db.js';

const VALIDADE = 60 * 1000;
const REGIAO = '/__cache/perfil';
let cache = { at: 0, tapes: null };

const regiao = () => (typeof caches !== 'undefined' && caches.default ? caches.default : null);

export async function esquecerPerfil(request) {
  cache = { at: 0, tapes: null };
  const c = regiao();
  if (c && request) { try { await c.delete(new URL(REGIAO, request.url)); } catch (_) { /* bônus */ } }
}

// Tapes do perfil, na ordem da tela: [{ id, name, slug, code, capa, n }]
// Tape sem beat pronto (ainda não convertida) não aparece: capa sem som não serve.
export async function tapesDoPerfil(request, env) {
  if (cache.tapes && Date.now() - cache.at < VALIDADE) return cache.tapes;
  const c = regiao();
  const chave = request ? new URL(REGIAO, request.url) : null;
  if (c && chave) {
    try {
      const r = await c.match(chave);
      if (r) { const t = await r.json(); cache = { at: Date.now(), tapes: t }; return t; }
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
  cache = { at: Date.now(), tapes };
  if (c && chave) {
    try {
      await c.put(chave, new Response(JSON.stringify(tapes), {
        headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=300' }
      }));
    } catch (_) { /* cópia é bônus */ }
  }
  return tapes;
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

const ICONES = {
  spotify: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M7 9.3c3.4-1 7.2-.7 10.2 1"/><path d="M7.6 12.4c2.8-.8 5.7-.5 8.2.9"/><path d="M8.2 15.3c2.1-.5 4.2-.3 6 .7"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="2.5" y="5.5" width="19" height="13" rx="3.5"/><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor" stroke="none"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/></svg>'
};

function grade(tapes) {
  return tapes.map((t, i) => {
    const href = `/${t.slug}/${t.code}?de=perfil`;
    const img = t.capa
      ? `<img src="/capa/${esc(t.capa)}" srcset="/capa/${esc(t.capa)}?p 200w, /capa/${esc(t.capa)} 1000w" sizes="(max-width:820px) 46vw, 222px" alt="Capa da beat tape ${esc(t.name)}" width="1000" height="1000"${i < 6 ? '' : ' loading="lazy"'} decoding="async">`
      : `<img class="semcapa" src="/assets/brand/caramujo-v.webp" alt="Beat tape ${esc(t.name)}" width="300" height="300"${i < 6 ? '' : ' loading="lazy"'}>`;
    return `<a class="tape" href="${esc(href)}" data-id="${t.id}"><span class="capa">${img}<span class="sobre" aria-hidden="true"><b>${esc(t.name)}</b><i>${beats(t.n)}</i></span></span><span class="leg"><b>${esc(t.name)}</b><i>${beats(t.n)}</i></span></a>`;
  }).join('\n');
}

export function paginaPerfil(tapes, { url }) {
  const titulo = '@rideblan33 · Portfólio';
  const descricaoGoogle = `Portfólio do @rideblan33, produtor e beatmaker de rap em São Carlos, SP. ${tapes.length} beat tapes pra ouvir, beats exclusivos e produção completa na Caramujo Records.`;
  const descricaoPrevia = 'Produtor & beatmaker. 33 memórias distantes. 40+ artistas · 200+ faixas · 2,5 mi de streams.';
  const og = SITE + '/assets/perfil/rideblan33-og.jpg';
  const pessoa = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: '@rideblan33',
    alternateName: ['rideblan33', 'rideblan'],
    jobTitle: 'Produtor musical e beatmaker',
    description: 'Produtor & beatmaker de rap. 40+ artistas, 200+ faixas, 2,5 milhões de streams.',
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
<link rel="icon" type="image/png" sizes="180x180" href="/assets/brand/icone-180.png">
<link rel="apple-touch-icon" href="/assets/brand/icone-180.png">
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
  --fire:#b98f5e;--amber:#c3a074;--cream:#f2ecdf;--bone:#E8E0CF;--read:#b89e72;--label:#9e7c48;--wire:#332c22;
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
.topo{position:relative;z-index:2;display:flex;justify-content:center;padding:22px 0 26px}
.topo a{display:grid;place-items:center;width:64px;height:64px;border:1px solid var(--wire);border-radius:50%;background:var(--deep);transition:border-color .2s}
.topo a:hover{border-color:var(--fire)}
.topo img{width:40px;height:40px}
.palco{position:relative;z-index:1;max-width:1180px;margin:0 auto;min-height:520px;display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);align-items:end;border:1px solid var(--wire);background:linear-gradient(180deg,var(--dark),var(--deep))}
.texto{padding:56px 0 56px 56px;align-self:center}
.kicker{font:700 11px/1 var(--sans);letter-spacing:.28em;text-transform:uppercase;color:var(--label);margin:0 0 22px}
h1{font:600 clamp(56px,8.6vw,124px)/.9 var(--serif);color:var(--cream);margin:0;letter-spacing:-.01em;overflow-wrap:anywhere}
.bio{font:italic 500 clamp(24px,2.4vw,32px)/1.18 var(--serif);color:var(--bone);margin:22px 0 0}
.numeros{font:400 13px/1.6 var(--mono);color:var(--read);margin:26px 0 0;letter-spacing:.02em}
.numeros b{font-weight:400;color:var(--cream)}
.numeros span{white-space:nowrap}
.botoes{display:flex;flex-wrap:wrap;gap:12px;margin-top:32px}
.botoes a{display:grid;place-items:center;width:48px;height:48px;border:1px solid var(--wire);border-radius:50%;color:var(--cream);background:rgba(20,17,13,.55);transition:border-color .2s,color .2s}
.botoes a:hover{border-color:var(--fire);color:var(--fire)}
.botoes svg{width:20px;height:20px}
.botoes .casa{border-color:var(--fire)}
.botoes .casa img{width:26px;height:26px}
.foto{position:relative;align-self:stretch;min-height:520px}
.num33{position:absolute;right:-2%;top:50%;transform:translateY(-54%);font:600 clamp(260px,34vw,470px)/1 var(--serif);color:transparent;-webkit-text-stroke:1.5px rgba(185,143,94,.55);letter-spacing:-.04em;user-select:none;pointer-events:none}
.foto img{position:absolute;bottom:-1px;left:50%;transform:translateX(-38%);height:114%;max-height:640px;width:auto;filter:drop-shadow(0 18px 30px rgba(0,0,0,.55))}
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
@media (hover:hover){.tape:hover .sobre,.tape:focus-visible .sobre{opacity:1}.tape:hover img:not(.semcapa){transform:scale(1.035);filter:saturate(.85)}}
@media (hover:none){.sobre{display:none}.leg{display:flex;flex-direction:column;gap:5px;padding-top:10px}.leg b{font:500 15px/1.2 var(--grot);color:var(--branco);overflow-wrap:anywhere}.leg i{font:500 13px/1 var(--grot);font-style:normal;color:var(--meta)}}
footer{background:var(--preto);border-top:1px solid var(--div);padding:28px 16px calc(40px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;align-items:center;gap:14px;font-family:var(--grot)}
footer img{width:148px;height:auto}
footer p{margin:0;font:500 12px/1.5 var(--grot);color:var(--apagado);letter-spacing:.04em;text-align:center}
footer p a{color:var(--meta)}
@media (max-width:1100px){.grade{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media (max-width:820px){
  .topo{padding:16px 0 18px}.topo a{width:52px;height:52px}.topo img{width:32px;height:32px}
  .terra{padding-bottom:40px}
  .palco{grid-template-columns:1fr;min-height:0;margin-top:64px}
  .foto{order:-1;min-height:330px}
  .foto img{height:auto;width:min(70%,300px);bottom:-1px;left:50%;transform:translateX(-50%)}
  .num33{font-size:min(84vw,420px);right:auto;left:50%;transform:translate(-50%,-58%)}
  .texto{padding:28px 20px 32px;text-align:center}
  .kicker{margin-bottom:16px}.bio{margin-top:16px}
  .botoes{justify-content:center;margin-top:26px}
  .preto{padding:40px 16px 56px}
  .moldura{padding:0;background:none;border:0}
  .grade{grid-template-columns:repeat(2,minmax(0,1fr));gap:22px 12px}
  .sobre{display:none}
  .leg{display:flex;flex-direction:column;gap:5px;padding-top:10px}
  .leg b{font:500 15px/1.2 var(--grot);color:var(--branco);overflow-wrap:anywhere}
  .leg i{font:500 13px/1 var(--grot);font-style:normal;color:var(--meta)}
}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
</style>
</head>
<body>
<header class="terra">
  <nav class="topo" aria-label="Caramujo Records"><a href="/" aria-label="Caramujo Records, página inicial"><img src="/assets/brand/selo-creme.svg" alt="" width="40" height="40"></a></nav>
  <section class="palco">
    <div class="texto">
      <p class="kicker">Caramujo Records</p>
      <h1>@rideblan33</h1>
      <p class="bio">Produtor &amp; beatmaker.<br>33 memórias distantes.</p>
      <p class="numeros"><span><b>40+</b> artistas</span> · <span><b>200+</b> faixas</span> · <span><b>2,5 mi</b> de streams</span></p>
      <div class="botoes">
        <a class="casa" href="/?de=perfil#beats" aria-label="Beats à venda na Caramujo Records" title="Beats à venda" data-rede="vitrine"><img src="/assets/brand/selo-creme.svg" alt="" width="26" height="26"></a>
        <a href="${REDES.spotify}" target="_blank" rel="noopener" aria-label="Spotify" title="Spotify" data-rede="spotify">${ICONES.spotify}</a>
        <a href="${REDES.youtube}" target="_blank" rel="noopener" aria-label="YouTube" title="YouTube" data-rede="youtube">${ICONES.youtube}</a>
        <a href="${REDES.instagram}" target="_blank" rel="noopener" aria-label="Instagram" title="Instagram" data-rede="instagram">${ICONES.instagram}</a>
      </div>
    </div>
    <div class="foto" aria-hidden="true">
      <span class="num33">33</span>
      <img src="/assets/perfil/rideblan33.webp" srcset="/assets/perfil/rideblan33-480.webp 480w, /assets/perfil/rideblan33.webp 720w" sizes="(max-width:820px) 300px, 420px" alt="" width="720" height="1200" fetchpriority="high">
    </div>
  </section>
</header>

<main class="preto" id="tapes">
  <div class="cab"><h2>Beat tapes</h2><span>${tapes.length} ${tapes.length === 1 ? 'tape' : 'tapes'}</span></div>
  <div class="moldura"><div class="grade">
${grade(tapes)}
  </div></div>
</main>

<footer>
  <a href="/" aria-label="Caramujo Records"><img src="/assets/brand/caramujo-h.webp" alt="Caramujo Records" width="296" height="54"></a>
  <p>© Caramujo Records · São Carlos, SP · <a href="/?de=perfil#beats">beats à venda</a></p>
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
})();
</script>
</body></html>`;
}
