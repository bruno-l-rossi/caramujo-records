import { topo, TOPO_PAGINA_CSS, TOPO_JS } from './topo.js';
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
export function metas({ titulo, descricao, url, capa, indexar = false, descricaoGoogle = null, ogUrl = null }) {
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
    `<meta property="og:url" content="${escapar(ogUrl || url)}">`,
    capa ? `<meta property="og:image" content="${escapar(capa)}">` : '',
    `<meta name="twitter:card" content="summary_large_image">`
  ].filter(Boolean).join('\n');
}

function escapar(s) {
  return String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

// Os gêneros da tape, do mais comum pro menos (só os que vieram da loja: beat sem par
// fica sem gênero, nunca adivinhado)
export function generosDaTape(tracks) {
  const cont = new Map();
  for (const t of tracks || []) if (t.kind === 'beat' && t.genero) cont.set(t.genero, (cont.get(t.genero) || 0) + 1);
  return [...cont.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([g]) => g);
}

// Texto do Google de cada tape (10/10/2026, como o dos beats): sai dos dados da própria
// tape, nada aparece na tela. Faltou gênero, BPM ou beat à venda: o pedaço some.
// "TUDO MUDA E NADA MUDA: beat tape do @rideblan33 com 15 beats de trap e boom bap, de 113
// a 188 BPM. 13 à venda com licença exclusiva por R$ 119. Beats exclusivos e produção
// completa na Caramujo Records, São Carlos, SP."
export function textoGoogleTape(nome, tracks, { preco = null, gratis = false } = {}) {
  const beats = (tracks || []).filter((t) => t.kind === 'beat');
  const n = beats.length;
  const gens = generosDaTape(beats).slice(0, 2).map((g) => g.toLowerCase());
  const bpms = beats.map((t) => Number(t.bpm)).filter((x) => x > 0);
  const min = bpms.length ? Math.min(...bpms) : 0, max = bpms.length ? Math.max(...bpms) : 0;
  const faixaBpm = !bpms.length ? '' : min === max ? `${min} BPM` : `de ${min} a ${max} BPM`;
  const aVenda = beats.filter((t) => t.buy).length;
  let txt = `${nome}: beat tape do @rideblan33 com ${n} ${n === 1 ? 'beat' : 'beats'} de ${gens.length ? gens.join(' e ') : 'rap'}${faixaBpm ? ', ' + faixaBpm : ''}.`;
  if (gratis) txt += ' Pra ouvir e baixar.';
  else if (aVenda) txt += ` ${aVenda} à venda com licença exclusiva${preco ? ` por R$ ${preco}` : ''}.`;
  return txt + ' Beats exclusivos e produção completa na Caramujo Records, São Carlos, SP.';
}

// Dados estruturados da tape (MusicPlaylist): nome, capa, quantos beats e os nomes.
// Desde 10/10/2026: os gêneros de verdade (os da loja) e o link da página de cada beat
// que existe na loja, pro Google ligar a tape aos beats.
function tapeLd({ titulo, url, capa, cat }) {
  const beats = (cat.tracks || []).filter((t) => t.kind === 'beat');
  const dur = (s) => { s = Math.round(s || 0); return s ? `PT${Math.floor(s / 60)}M${s % 60}S` : undefined; };
  const gens = generosDaTape(beats);
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'MusicPlaylist',
    name: cat.artist.name,
    url,
    image: capa || undefined,
    numTracks: beats.length,
    genre: gens.length ? gens : 'Hip hop',
    creator: { '@type': 'Person', name: '@rideblan33', url: new URL('/rideblan33', url).href },
    publisher: { '@type': 'Organization', name: 'Caramujo Records', url: new URL('/', url).href },
    track: beats.slice(0, 60).map((t) => ({ '@type': 'MusicRecording', name: t.title, duration: dur(t.dur),
      ...(t.pagina ? { url: new URL('/beat/' + t.pagina, url).href } : {}),
      ...(t.genero ? { genre: t.genero } : {}),
      byArtist: { '@type': 'Person', name: '@rideblan33' } }))
  };
  return `<script type="application/ld+json">${dados(ld)}</script>`;
}

// /capa/<id> → <midia>/capa/<id>.jpg (igual ao capaURL do app.html); capa trocada pelo
// artista (com ?v=) e página sem domínio de mídia seguem pela função
export function capaDoR2(c, midia) {
  const m = /^\/capa\/([A-Za-z0-9_-]+)$/.exec(String(c || ''));
  return m && midia ? `${midia}/capa/${m[1]}.jpg` : c;
}

export async function pagina(request, env, { titulo, descricao, url, capa, cat, indexar = false, descricaoGoogle = null, ogUrl = null }) {
  const molde = await env.ASSETS.fetch(new URL('/catalogo/app.html', request.url));
  if (!molde.ok) return new Response('molde nao encontrado', { status: 500 });

  // A capa é a maior coisa da tela e entra por CSS, que o navegador só descobre
  // depois de ler o script do fim da página. O aviso no <head> adianta o download
  // dela (e do fundo desfocado, que é a mesma imagem). 03/10/2026.
  // Desde 10/10/2026 a capa sai do R2 (o mesmo endereço que o app.html monta no capaURL).
  const capaCedo = cat && cat.artist && cat.artist.cover
    ? `\n<link rel="preload" as="image" href="${escapar(capaDoR2(cat.artist.cover, cat.midia))}" fetchpriority="high">` : '';

  const html = (await molde.text())
    .replace('__TITULO__', escapar(titulo))
    .replace('__META__', metas({ titulo, descricao, url, capa, indexar, descricaoGoogle, ogUrl }) + capaCedo +
      (indexar ? '\n' + tapeLd({ titulo, url, capa, cat }) : ''))
    .replace('<!--DADOS-->', `<script>window.__CAT__=${dados(cat)}</script>`)
    // rodada Q (18/10/2026): o topo do site (o mesmo da vitrine e das outras páginas), fixo no alto
    .replace('<!--TOPO-->', () => topo(cat && cat.artist && cat.artist.tape ? 'tape' : 'pasta', '', null, { ativo: '' }))
    .replace('<!--TOPO_CSS-->', () => `<style>${TOPO_PAGINA_CSS}
body>.topo{position:fixed;left:0;right:0;top:0}
.stage{padding-top:54px;box-sizing:border-box}
.navwrap{top:54px}
</style>`)
    .replace('<!--TOPO_JS-->', () => TOPO_JS);

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
