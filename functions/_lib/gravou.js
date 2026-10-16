// Quem já gravou (16/10/2026): quem canta nas músicas da aba Músicas do perfil, com a foto
// do Spotify. Sem app de desenvolvedor do Spotify (desde fev/2026 ele exige Premium do dono e
// limita a 5 usuários): tudo sai das páginas públicas, as mesmas que geram a prévia de link.
//
// - Faixa: a página de embed (open.spotify.com/embed/track/<id>) lista cada artista com nome e
//   link /artist/<id>. Reserva: a página da faixa tem um <meta name="music:musician"> por
//   artista, na mesma ordem dos nomes de music:musician_description.
// - Álbum/single: a página do álbum aponta a 1ª faixa (music:song); os artistas saem dela.
// - Artista: og:title (nome) e og:image (foto 640 px). Artista sem foto no Spotify devolve a
//   capa de um lançamento (ab67616d…) ou nada: fica marcado pra o site usar outra imagem.
// O @rideblan33 sai da lista (a página já é dele). Só entra quem está nas músicas da lista,
// ou seja, só música lançada (regra do Bruno). Nunca link de pasta privada.
// Conferido à mão em 16/10/2026 nas 12 músicas do perfil: 16 artistas; 10 com foto, 5 com capa
// no lugar da foto, 1 sem imagem.

export const EU = '15K9QWM2Q6Zyxb6RsAn9RZ';          // o @rideblan33 no Spotify
const UA = 'Mozilla/5.0 (compatible; CaramujoRecords/1.0; +https://caramujorecords.com.br)';
const RE_ID = /^[A-Za-z0-9]{22}$/;
const ehEu = (id, nome) => id === EU || /^@?rideblan(33)?$/i.test(String(nome || '').trim());

const desfaz = (s) => String(s || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
const texto = (s, n = 80) => desfaz(String(s || '').replace(/<[^>]*>/g, ' ')).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

// todos os valores de uma meta (music:musician aparece uma vez por artista)
export function metasTodas(html, nome) {
  const out = [];
  for (const m of String(html || '').matchAll(/<meta\s+[^>]*>/gi)) {
    const tag = m[0];
    const k = (tag.match(/\b(?:name|property)\s*=\s*"([^"]+)"/i) || [])[1];
    const v = (tag.match(/\bcontent\s*=\s*"([^"]*)"/i) || [])[1];
    if (k && k.toLowerCase() === nome && v !== undefined) out.push(desfaz(v));
  }
  return out;
}
const meta1 = (html, nome) => metasTodas(html, nome)[0] || '';
const idDe = (url) => { const m = String(url || '').match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?artist\/([A-Za-z0-9]{22})/); return m ? m[1] : null; };

// Embed da faixa: <a href="https://open.spotify.com/artist/<id>?go=1…">Nome</a> (e, se vier,
// o JSON com "uri":"spotify:artist:<id>" e "name")
export function artistasDoEmbed(html) {
  const s = String(html || ''), vistos = new Map();
  for (const m of s.matchAll(/<a\b[^>]*href="(?:https:\/\/open\.spotify\.com)?\/(?:intl-[a-z-]+\/)?artist\/([A-Za-z0-9]{22})[^"]*"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const nome = texto(m[2]);
    if (nome && !vistos.has(m[1])) vistos.set(m[1], nome);
  }
  for (const m of s.matchAll(/"name"\s*:\s*"([^"]{1,120})"\s*,\s*"uri"\s*:\s*"spotify:artist:([A-Za-z0-9]{22})"/g)) if (!vistos.has(m[2])) vistos.set(m[2], texto(m[1]));
  for (const m of s.matchAll(/"uri"\s*:\s*"spotify:artist:([A-Za-z0-9]{22})"\s*,\s*"name"\s*:\s*"([^"]{1,120})"/g)) if (!vistos.has(m[1])) vistos.set(m[1], texto(m[2]));
  return [...vistos].map(([id, nome]) => ({ id, nome }));
}

// Página da faixa: music:musician (ids) + music:musician_description (nomes, mesma ordem)
export function artistasDaFaixa(html) {
  const ids = metasTodas(html, 'music:musician').map(idDe).filter(Boolean);
  const nomes = meta1(html, 'music:musician_description').split(/\s*,\s*/).map((x) => texto(x)).filter(Boolean);
  const out = [], vistos = new Set();
  ids.forEach((id, i) => { if (!vistos.has(id)) { vistos.add(id); out.push({ id, nome: ids.length === nomes.length ? nomes[i] : '' }); } });
  return out;
}

// Página do álbum: a 1ª faixa (music:song) e o artista principal
export function faixaDoAlbum(html) {
  const m = meta1(html, 'music:song').match(/open\.spotify\.com\/track\/([A-Za-z0-9]{22})/);
  return { faixa: m ? m[1] : null, artistas: metasTodas(html, 'music:musician').map(idDe).filter(Boolean) };
}

// Página do artista: nome e foto. tipo 'foto' = foto de perfil; 'capa' = capa de lançamento
// (o Spotify usa quando o artista não tem foto); '' = sem imagem.
export function dadosDoArtista(html) {
  const nome = texto(meta1(html, 'og:title'), 80);
  const img = meta1(html, 'og:image');
  const ok = /^https:\/\/i\.scdn\.co\/image\/[a-f0-9]{40}$/.test(img);
  const tipo = !ok ? '' : /\/ab676161/.test(img) ? 'foto' : /\/ab67616d/.test(img) ? 'capa' : 'foto';
  return {
    nome,
    foto: ok ? img : null,
    fotoP: ok && tipo === 'foto' ? img.replace('ab6761610000e5eb', 'ab67616100005174') : ok && tipo === 'capa' ? img.replace('ab67616d0000b273', 'ab67616d00001e02') : null,
    tipo
  };
}

async function pegarPadrao(url) {
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8' }, redirect: 'follow' });
    return r.ok ? await r.text() : null;
  } catch (_) { return null; }
}

// Quem canta numa música da lista (link do Spotify de faixa ou de álbum)
export async function artistasDaMusica(link, pegar = pegarPadrao) {
  let m = String(link || '').match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album)\/([A-Za-z0-9]{22})/);
  if (!m) return { ok: false, artistas: [], motivo: 'sem link do Spotify' };
  let faixa = m[1] === 'track' ? m[2] : null;
  let doAlbum = [];
  if (!faixa) {
    const a = faixaDoAlbum(await pegar(`https://open.spotify.com/album/${m[2]}`));
    faixa = a.faixa; doAlbum = a.artistas.map((id) => ({ id, nome: '' }));
    if (!faixa && !doAlbum.length) return { ok: false, artistas: [], motivo: 'álbum sem faixa' };
  }
  let lista = faixa ? artistasDoEmbed(await pegar(`https://open.spotify.com/embed/track/${faixa}`)) : [];
  if (!lista.length && faixa) lista = artistasDaFaixa(await pegar(`https://open.spotify.com/track/${faixa}`));
  for (const x of doAlbum) if (!lista.some((y) => y.id === x.id)) lista.push(x);
  const artistas = lista.filter((x) => RE_ID.test(x.id) && !ehEu(x.id, x.nome));
  return { ok: lista.length > 0, artistas, motivo: lista.length ? '' : 'página sem artistas' };
}

// A varredura: músicas da lista → artistas (sem repetir) → nome e foto de cada um.
// conhecidos: o que já foi lido antes (não busca de novo a página de quem já tem foto).
// maxPaginas segura as idas ao Spotify (a função grátis tem teto de 50 por pedido).
export async function varrer(musicas, { pegar = pegarPadrao, conhecidos = {}, maxPaginas = 45 } = {}) {
  let gastas = 0;
  const contar = (f) => async (u) => { gastas++; return f(u); };
  const p = contar(pegar);
  const artistas = {}, porMusica = {}, falhas = [];
  for (const mus of musicas || []) {
    if (!mus || !mus.spotify) continue;
    if (gastas >= maxPaginas - 2) { falhas.push({ musica: mus.id, motivo: 'ficou pra próxima (limite de leituras)' }); continue; }
    const r = await artistasDaMusica(mus.spotify, p);
    if (!r.ok) { falhas.push({ musica: mus.id, motivo: r.motivo }); continue; }
    porMusica[mus.id] = r.artistas.map((a) => a.id);
    for (const a of r.artistas) {
      const x = artistas[a.id] || (artistas[a.id] = { id: a.id, nome: a.nome, musicas: [] });
      if (!x.nome && a.nome) x.nome = a.nome;
      if (!x.musicas.includes(mus.id)) x.musicas.push(mus.id);
    }
  }
  for (const a of Object.values(artistas)) {
    const ja = conhecidos[a.id];
    if (ja && ja.foto && ja.nome) { Object.assign(a, { nome: ja.nome, foto: ja.foto, fotoP: ja.fotoP || null, tipo: ja.tipo || 'foto' }); continue; }
    if (gastas >= maxPaginas) { a.foto = null; a.tipo = ''; a.pendente = true; continue; }
    const d = dadosDoArtista(await p(`https://open.spotify.com/artist/${a.id}`));
    if (d.nome) a.nome = d.nome;
    Object.assign(a, { foto: d.foto, fotoP: d.fotoP, tipo: d.tipo });
  }
  const lista = Object.values(artistas).filter((a) => a.nome && !ehEu(a.id, a.nome))
    .sort((x, y) => y.musicas.length - x.musicas.length || x.nome.localeCompare(y.nome, 'pt'));
  return { artistas: lista, porMusica, falhas, paginas: gastas };
}

// ---------------------------------------------------------------------------------------
// A página "Quem já gravou" (16/10/2026, rodada K). A lista conferida à mão mora em
// _lib/gravou-lista.js; o que o Bruno muda pelo painel fica na meta 'gravou' (uma linha
// de JSON, sem tabela nova):
//   { noAr:false, escondidos:[ids de artista], faixasFora:[ids de faixa],
//     fotos:{<id do artista>: url | ''}, tipos:{<id>: 'foto'|'capa'},
//     capas:{<id do álbum>: url | ''}, at }
// '' = já tentou e o Spotify não tem imagem (não busca de novo).
// Fotos e capas são o endereço do próprio Spotify (i.scdn.co); o site aceita imagem https.
import { ARTISTAS, FAIXAS } from './gravou-lista.js';

export const CHAVE_GRAVOU = 'gravou';
const RE_IMG = /^https:\/\/i\.scdn\.co\/image\/[a-f0-9]{40}$/;
const soIds = (l) => (Array.isArray(l) ? l.filter((x) => RE_ID.test(String(x))).slice(0, 500) : []);
function soImgs(o) {
  const r = {};
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) if (RE_ID.test(k) && (v === '' || RE_IMG.test(String(v)))) r[k] = String(v);
  return r;
}

export function gravouLimpar(o) {
  o = o && typeof o === 'object' ? o : {};
  const tipos = {};
  if (o.tipos && typeof o.tipos === 'object') for (const [k, v] of Object.entries(o.tipos)) if (RE_ID.test(k) && (v === 'foto' || v === 'capa')) tipos[k] = v;
  return { noAr: !!o.noAr, escondidos: soIds(o.escondidos), faixasFora: soIds(o.faixasFora), fotos: soImgs(o.fotos), tipos, capas: soImgs(o.capas), at: typeof o.at === 'string' ? o.at.slice(0, 30) : null };
}
export function gravouDeTexto(v) { try { return gravouLimpar(JSON.parse(v)); } catch (_) { return gravouLimpar({}); } }

export const slugArtista = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/\$/g, 's').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'artista';
// miniatura (300 px) da capa ou da foto, pra lista e grade
export const imgPequena = (u) => String(u || '').replace('ab67616d0000b273', 'ab67616d00001e02').replace('ab6761610000e5eb', 'ab67616100005174');

// O que a página mostra: artistas visíveis com as faixas (só as que sobram depois do que o
// Bruno escondeu), em ordem de mais faixas; cada faixa com os nomes de quem canta.
export function montarGravou(g) {
  g = gravouLimpar(g);
  const fora = new Set(g.escondidos), ff = new Set(g.faixasFora);
  const nomes = Object.fromEntries(ARTISTAS.map((a) => [a[0], a[1]]));
  const faixas = FAIXAS.filter((f) => !ff.has(f[0])).map(([id, nome, alb, ars]) => ({
    id, nome, alb, ars: ars.filter((a) => !fora.has(a)), capa: g.capas[alb] || null
  })).filter((f) => f.ars.length);
  const usados = new Set();
  const slugs = new Set();
  const artistas = ARTISTAS.filter((a) => !fora.has(a[0])).map(([id, nome, pasta]) => {
    const fs = faixas.filter((f) => f.ars.includes(id));
    fs.forEach((f) => usados.add(f.id));
    let s = slugArtista(nome), n = 2;
    while (slugs.has(s)) s = slugArtista(nome) + '-' + n++;
    slugs.add(s);
    return { id, nome, slug: s, pasta: !!pasta, foto: g.fotos[id] || null, tipo: g.tipos[id] || '', faixas: fs.map((f) => f.id) };
  }).filter((a) => a.faixas.length)
    .sort((x, y) => y.faixas.length - x.faixas.length || x.nome.localeCompare(y.nome, 'pt', { sensitivity: 'base' }));
  const porId = Object.fromEntries(faixas.map((f) => [f.id, { id: f.id, nome: f.nome, capa: f.capa, com: f.ars.map((a) => nomes[a]).filter(Boolean) }]));
  return { noAr: g.noAr, artistas, faixas: porId, nFaixas: usados.size };
}

// Fotos e capas que faltam: lê a página pública do artista e a do álbum (og:image).
// max = idas ao Spotify nesta chamada (a função grátis aguenta 50 por pedido); o painel
// chama de novo até 'faltam' zerar.
export function faltando(g) {
  g = gravouLimpar(g);
  const art = ARTISTAS.map((a) => a[0]).filter((id) => !(id in g.fotos));
  const albs = [...new Set(FAIXAS.map((f) => f[2]).filter((x) => RE_ID.test(x)))].filter((id) => !(id in g.capas));
  return { art, albs };
}
export async function buscarImagens(g, { pegar = pegarPadrao, max = 40 } = {}) {
  g = gravouLimpar(g);
  const { art, albs } = faltando(g);
  let feitas = 0;
  for (const id of art) {
    if (feitas >= max) break;
    feitas++;
    const d = dadosDoArtista(await pegar(`https://open.spotify.com/artist/${id}`));
    g.fotos[id] = d.foto || '';
    if (d.foto) g.tipos[id] = d.tipo || 'foto';
  }
  for (const id of albs) {
    if (feitas >= max) break;
    feitas++;
    const img = meta1(await pegar(`https://open.spotify.com/album/${id}`), 'og:image');
    g.capas[id] = RE_IMG.test(img) ? img : '';
  }
  const f = faltando(g);
  return { g, feitas, faltam: f.art.length + f.albs.length };
}

// Painel (Perfil > Quem já gravou). Lê e grava a meta 'gravou'.
async function lerMeta(d) {
  const r = await d.prepare('SELECT valor FROM meta WHERE chave = ?').bind(CHAVE_GRAVOU).first();
  return gravouDeTexto(r && r.valor);
}
async function gravarMeta(d, g) {
  g.at = new Date().toISOString();
  await d.prepare('INSERT OR REPLACE INTO meta (chave, valor) VALUES (?, ?)').bind(CHAVE_GRAVOU, JSON.stringify(gravouLimpar(g))).run();
}
function corpoPainel(g) {
  const fora = new Set(g.escondidos), ff = new Set(g.faixasFora);
  const f = faltando(g);
  return {
    ok: true, noAr: g.noAr, atualizado: g.at,
    faltam: f.art.length + f.albs.length,
    artistas: ARTISTAS.map(([id, nome, pasta, provavel]) => ({
      id, nome, pasta: pasta || '', provavel: !!provavel, fora: fora.has(id),
      foto: g.fotos[id] || null, tipo: g.tipos[id] || '',
      faixas: FAIXAS.filter((x) => x[3].includes(id)).map((x) => x[0])
    })),
    faixas: Object.fromEntries(FAIXAS.map(([id, nome, alb, ars]) => [id, { nome, ars, capa: g.capas[alb] || null, fora: ff.has(id) }]))
  };
}
// op: 'gravou' (GET), 'gravou-no-ar', 'gravou-esconder', 'gravou-imagens'
// devolve { corpo, status, mudou }
export async function painelGravou(op, d, body = {}, { pegar = pegarPadrao } = {}) {
  const g = await lerMeta(d);
  if (op === 'gravou') return { corpo: corpoPainel(g), mudou: false };
  if (op === 'gravou-no-ar') { g.noAr = !!body.noAr; await gravarMeta(d, g); return { corpo: corpoPainel(g), mudou: true }; }
  if (op === 'gravou-esconder') {
    const id = String(body.id || '');
    const lista = body.tipo === 'faixa' ? 'faixasFora' : body.tipo === 'artista' ? 'escondidos' : null;
    const existe = body.tipo === 'faixa' ? FAIXAS.some((f) => f[0] === id) : ARTISTAS.some((a) => a[0] === id);
    if (!lista || !existe) return { corpo: { erro: 'item não encontrado' }, status: 400, mudou: false };
    const s = new Set(g[lista]);
    if (body.esconder) s.add(id); else s.delete(id);
    g[lista] = [...s];
    await gravarMeta(d, g);
    return { corpo: corpoPainel(g), mudou: true };
  }
  if (op === 'gravou-imagens') {
    const r = await buscarImagens(g, { pegar, max: 40 });
    if (r.feitas) await gravarMeta(d, r.g);
    return { corpo: { ...corpoPainel(r.g), feitas: r.feitas }, mudou: r.feitas > 0 };
  }
  return null;
}
