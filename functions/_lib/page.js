// Monta a página do catálogo: pega o molde em /catalogo/app.html e injeta os dados.

// JSON que entra dentro de <script> precisa fugir de < > & e dos dois
// separadores de linha invisíveis do Unicode, senão a página quebra.
const ESC = { '&': '\\u0026', '<': '\\u003c', '>': '\\u003e' };
const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);

export function dados(obj) {
  return JSON.stringify(obj)
    .replace(/[&<>]/g, (c) => ESC[c])
    .split(LS).join('\\u2028')
    .split(PS).join('\\u2029');
}

// indexar = beat tape (vai pro Google, 26/09/2026). Pasta de artista NUNCA: é privada,
// o link com código só vai pra quem o Bruno manda.
// descricaoGoogle: o texto do resultado de busca; a prévia no Direct/WhatsApp segue
// com a descrição curta de sempre (og:description).
export function metas({ titulo, descricao, url, capa, indexar = false, descricaoGoogle = null }) {
  const t = escapar(titulo);
  const d = escapar(descricao);
  return [
    `<meta name="description" content="${escapar(indexar && descricaoGoogle ? descricaoGoogle : descricao)}">`,
    indexar
      ? `<meta name="robots" content="index, follow, max-image-preview:large">\n<link rel="canonical" href="${escapar(url)}">`
      : `<meta name="robots" content="noindex, nofollow">`,
    `<meta property="og:type" content="music.playlist">`,
    `<meta property="og:title" content="${t}">`,
    `<meta property="og:description" content="${d}">`,
    `<meta property="og:url" content="${escapar(url)}">`,
    capa ? `<meta property="og:image" content="${escapar(capa)}">` : '',
    `<meta name="twitter:card" content="summary_large_image">`
  ].filter(Boolean).join('\n');
}

function escapar(s) {
  return String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

// Dados estruturados da tape (MusicPlaylist): nome, capa, quantos beats e os nomes.
function tapeLd({ titulo, url, capa, cat }) {
  const beats = (cat.tracks || []).filter((t) => t.kind === 'beat');
  const dur = (s) => { s = Math.round(s || 0); return s ? `PT${Math.floor(s / 60)}M${s % 60}S` : undefined; };
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'MusicPlaylist',
    name: cat.artist.name,
    url,
    image: capa || undefined,
    numTracks: beats.length,
    genre: 'Hip hop',
    creator: { '@type': 'Person', name: '@rideblan33', url: new URL('/rideblan33', url).href },
    publisher: { '@type': 'Organization', name: 'Caramujo Records', url: new URL('/', url).href },
    track: beats.slice(0, 60).map((t) => ({ '@type': 'MusicRecording', name: t.title, duration: dur(t.dur),
      byArtist: { '@type': 'Person', name: '@rideblan33' } }))
  };
  return `<script type="application/ld+json">${dados(ld)}</script>`;
}

export async function pagina(request, env, { titulo, descricao, url, capa, cat, indexar = false, descricaoGoogle = null }) {
  const molde = await env.ASSETS.fetch(new URL('/catalogo/app.html', request.url));
  if (!molde.ok) return new Response('molde nao encontrado', { status: 500 });

  const html = (await molde.text())
    .replace('__TITULO__', escapar(titulo))
    .replace('__META__', metas({ titulo, descricao, url, capa, indexar, descricaoGoogle }) +
      (indexar ? '\n' + tapeLd({ titulo, url, capa, cat }) : ''))
    .replace('<!--DADOS-->', `<script>window.__CAT__=${dados(cat)}</script>`);

  const headers = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' };
  if (!indexar) headers['x-robots-tag'] = 'noindex';
  return new Response(html, { headers });
}

// Uma faixa do banco vira o que a página precisa.
export function faixa(r) {
  return {
    id: r.id, title: r.title, kind: r.kind, grp: r.grp,
    bpm: r.bpm || null, key: r.mkey || null, tag: r.tag || null,
    dur: r.dur || 0, mp3: r.mp3_bytes || 0, wav: r.wav_bytes || 0,
    mod: r.src_modified || ''
  };
}
