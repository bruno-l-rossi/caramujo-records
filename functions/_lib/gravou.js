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
const FOTO_EU = '/assets/perfil/rideblan33-480.webp'; // a foto do perfil do site (cartão das faixas solo)
const UA = 'Mozilla/5.0 (compatible; CaramujoRecords/1.0; +https://caramujorecords.com.br)';
const RE_ID = /^[A-Za-z0-9]{22}$/;
const ehEu = (id, nome) => id === EU || id === '5z5vPFiQeDagCbYiVAysa3' || /^@?rideblan(33)?$/i.test(String(nome || '').trim());

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
    ouvintes: ouvintesDe(meta1(html, 'og:description') || meta1(html, 'description')),
    foto: ok ? img : null,
    fotoP: ok && tipo === 'foto' ? img.replace('ab6761610000e5eb', 'ab67616100005174') : ok && tipo === 'capa' ? img.replace('ab67616d0000b273', 'ab67616d00001e02') : null,
    tipo
  };
}

// "Artist · 67K monthly listeners." / "Artista · 67 mil ouvintes mensais." / "1,234 monthly listeners"
// (17/10/2026: a página pública do Spotify mostra ouvintes mensais; seguidores só logado)
export function ouvintesDe(txt) {
  const m = String(txt || '').match(/([\d][\d.,\s]*)\s*(K|M|mil|mi|milhões|milhão)?\s*(?:monthly listeners|ouvintes mensais|ouvinte mensal|monthly listener)/i);
  if (!m) return null;
  const suf = (m[2] || '').toLowerCase();
  const bruto = m[1].trim().replace(/\s+/g, '');
  if (!suf) { const n = Number(bruto.replace(/[.,]/g, '')); return Number.isFinite(n) ? n : null; }
  const n = Number(bruto.replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * (suf === 'k' || suf === 'mil' ? 1e3 : 1e6));
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
import { capaUrl } from './midia.js';

export const CHAVE_GRAVOU = 'gravou';
const RE_IMG = /^https:\/\/i\.scdn\.co\/image\/[a-f0-9]{40}$/;
const soIds = (l) => (Array.isArray(l) ? l.filter((x) => RE_ID.test(String(x))).slice(0, 500) : []);
function soImgs(o) {
  const r = {};
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) if (RE_ID.test(k) && (v === '' || RE_IMG.test(String(v)))) r[k] = String(v);
  return r;
}

// 17/10/2026: as fotos e capas também ficam guardadas no nosso R2 (capa/grv-<artista>-<8 do
// arquivo>.jpg e capa/gra-<álbum>-<8>.jpg, com -m e -p): o endereço do Spotify some quando o
// artista troca a foto. guardadas = {<id>: chave no R2}. O nome leva um pedaço do arquivo do
// Spotify: foto nova = chave nova (a CDN guarda a antiga por 1 semana sem confundir).
// ouvintes = {<id>: ouvintes mensais} (ordem da página). conferido = {<id>: minuto da última
// leitura}; refazer = minuto em que o Bruno pediu "Atualizar" (quem foi lido antes disso lê de novo).
const RE_KEY = /^gr[va]-[A-Za-z0-9]{22}-[a-f0-9]{8}$/;
const soNums = (o, ok) => {
  const r = {};
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) if (RE_ID.test(k) && Number.isFinite(Number(v)) && ok(Number(v))) r[k] = Math.round(Number(v));
  return r;
};
export const agoraMin = () => Math.floor(Date.now() / 6e4);   // minutos desde 1970
export function gravouLimpar(o) {
  o = o && typeof o === 'object' ? o : {};
  const tipos = {}, guardadas = {};
  if (o.tipos && typeof o.tipos === 'object') for (const [k, v] of Object.entries(o.tipos)) if (RE_ID.test(k) && (v === 'foto' || v === 'capa')) tipos[k] = v;
  if (o.guardadas && typeof o.guardadas === 'object') for (const [k, v] of Object.entries(o.guardadas)) if (RE_ID.test(k) && RE_KEY.test(String(v))) guardadas[k] = String(v);
  return {
    noAr: !!o.noAr, escondidos: soIds(o.escondidos), faixasFora: soIds(o.faixasFora), fotos: soImgs(o.fotos), tipos, capas: soImgs(o.capas),
    guardadas, manuais: soIds(o.manuais), ordem: soIds(o.ordem), ordemManual: !!o.ordemManual, ouvintes: soNums(o.ouvintes, (n) => n >= 0 && n < 1e10), conferido: soNums(o.conferido, (n) => n > 0 && n < 1e9),
    refazer: Number.isFinite(Number(o.refazer)) && Number(o.refazer) > 0 ? Math.round(Number(o.refazer)) : 0,
    at: typeof o.at === 'string' ? o.at.slice(0, 30) : null
  };
}
export function gravouDeTexto(v) { try { return gravouLimpar(JSON.parse(v)); } catch (_) { return gravouLimpar({}); } }

export const slugArtista = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/\$/g, 's').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'artista';
// miniatura (300 px) da capa ou da foto, pra lista e grade
export const imgPequena = (u) => String(u || '').replace('ab67616d0000b273', 'ab67616d00001e02').replace('ab6761610000e5eb', 'ab67616100005174')
  .replace(/(\/capa\/gr[va]-[A-Za-z0-9_-]+?)(?:-m)?\.jpg$/, '$1-p.jpg');
// a imagem que a página usa: a guardada no R2 (pela CDN do som.caramujorecords.com.br) ou,
// enquanto o painel não guardou, a do Spotify
const imgDe = (g, id, url) => (g.guardadas[id] ? capaUrl(g.guardadas[id]) : url || null);
// foto do artista: a que o Bruno subiu no painel (manual) ou a do Spotify
const fotoDe = (g, id) => (g.manuais.includes(id) && g.guardadas[id] ? capaUrl(g.guardadas[id]) : g.fotos[id] ? imgDe(g, id, g.fotos[id]) : null);
// Ordem da página (17/10/2026, pedido do Bruno): mais ouvintes mensais primeiro; diferença
// pequena (menos de 35%, ex.: 67 mil x 80 mil) conta como empate e quem tem mais faixas vence.
// Faixas de 35% em escala log: comparar a faixa de cada um é transitivo (a ordem não pula).
export const faixaDeOuvintes = (n) => (n > 0 ? Math.floor(Math.log(n) / Math.log(1.35)) : -1);
// Plays das faixas (17/10/2026): o Spotify só mostra a partir de 1.000; abaixo disso fica 0 e vale a data
export const faixaDePlays = (n) => (n >= 1000 ? Math.floor(Math.log(n) / Math.log(1.3)) : -1);
// capa da faixa: a guardada no R2 (pelo álbum), a lida da página do álbum, ou a anotada na lista
// (17/10/2026: álbum cuja página não deu a imagem ficava sem capa)
const capaLista = (img) => (/^[a-f0-9]{40}$/.test(String(img || '')) ? 'https://i.scdn.co/image/' + img : null);
const capaDaFaixa = (g, alb, img) => (alb && (g.guardadas[alb] || g.capas[alb]) ? imgDe(g, alb, g.capas[alb]) : capaLista(img));
const imgDoAlbum = (alb) => { const f = FAIXAS.find((x) => x[2] === alb && x[6]); return f ? capaLista(f[6]) : null; };

// O que a página mostra: artistas visíveis com as faixas (só as que sobram depois do que o
// Bruno escondeu), em ordem de mais faixas; cada faixa com os nomes de quem canta.
export function montarGravou(g) {
  g = gravouLimpar(g);
  const fora = new Set(g.escondidos), ff = new Set(g.faixasFora);
  const nomes = Object.fromEntries(ARTISTAS.map((a) => [a[0], a[1]]));
  const faixas = FAIXAS.filter((f) => !ff.has(f[0])).map(([id, nome, alb, ars, plays, data, img]) => ({
    id, nome, alb, ars: ars.filter((a) => !fora.has(a)), capa: capaDaFaixa(g, alb, img), plays: plays || 0, data: data || ''
  })).filter((f) => f.ars.length);
  const usados = new Set();
  const slugs = new Set();
  const artistas = ARTISTAS.filter((a) => !fora.has(a[0])).map(([id, nome, pasta]) => {
    // faixas do artista: as mais tocadas primeiro; plays parecidos (faixas de 30%) = a mais nova antes
    const fs = faixas.filter((f) => f.ars.includes(id)).sort((x, y) => faixaDePlays(y.plays) - faixaDePlays(x.plays) || (y.data > x.data ? 1 : y.data < x.data ? -1 : 0) || y.plays - x.plays);
    fs.forEach((f) => usados.add(f.id));
    let s = slugArtista(nome), n = 2;
    while (slugs.has(s)) s = slugArtista(nome) + '-' + n++;
    slugs.add(s);
    return { id, nome, slug: s, pasta: !!pasta, foto: fotoDe(g, id), tipo: g.manuais.includes(id) ? 'foto' : g.tipos[id] || '', ouvintes: g.ouvintes[id] || 0, faixas: fs.map((f) => f.id) };
  }).filter((a) => a.faixas.length)
    .sort((x, y) => faixaDeOuvintes(y.ouvintes) - faixaDeOuvintes(x.ouvintes) || y.faixas.length - x.faixas.length ||
      y.ouvintes - x.ouvintes || x.nome.localeCompare(y.nome, 'pt', { sensitivity: 'base' }));
  // Ordem do Bruno (17/10/2026, painel: arrastar). Quem não está na lista dele (artista novo)
  // entra depois, na ordem por ouvintes. "Por ouvintes" no painel volta pro padrão.
  if (g.ordemManual && g.ordem.length) {
    const pos = new Map(g.ordem.map((id, i) => [id, i]));
    artistas.sort((x, y) => (pos.has(x.id) ? pos.get(x.id) : 1e6) - (pos.has(y.id) ? pos.get(y.id) : 1e6));
  }
  // Cartão "@rideblan33" (17/10/2026): as faixas solo dele (ars = [EU]); vem antes de todos na
  // página e não conta como artista (os números e a vitrine falam de quem gravou com ele)
  nomes[EU] = '@rideblan33';
  const solo = fora.has(EU) ? [] : faixas.filter((f) => f.ars.length === 1 && f.ars[0] === EU)
    .sort((x, y) => faixaDePlays(y.plays) - faixaDePlays(x.plays) || (y.data > x.data ? 1 : y.data < x.data ? -1 : 0));
  const eu = solo.length ? { id: EU, nome: '@rideblan33', slug: 'rideblan33', eu: true, pasta: false, foto: FOTO_EU, tipo: 'foto', ouvintes: 0, faixas: solo.map((f) => f.id) } : null;
  const porId = Object.fromEntries(faixas.map((f) => [f.id, { id: f.id, nome: f.nome, capa: f.capa, com: f.ars.map((a) => nomes[a]).filter(Boolean) }]));
  return { noAr: g.noAr, artistas, eu, faixas: porId, nFaixas: usados.size };
}

// O que falta ler: artista sem foto lida, sem ouvintes, foto do Spotify ainda não guardada no
// R2, ou lido antes do "Atualizar" do Bruno. Mesma coisa pras capas dos álbuns.
// max = idas ao Spotify nesta chamada (a função grátis aguenta 50 por pedido: página + 2
// tamanhos da imagem); o painel chama de novo até 'faltam' zerar.
const precisa = (g, id, tem) => !tem || !((g.conferido[id] || 0) >= (g.refazer || 0)) || !g.conferido[id];
// comR2 = false (sem o R2 ligado, nos testes): não fica esperando cópia que não vai acontecer
export function faltando(g, { comR2 = true } = {}) {
  g = gravouLimpar(g);
  const art = ARTISTAS.map((a) => a[0]).filter((id) => precisa(g, id, id in g.fotos && id in g.ouvintes) || (comR2 && g.fotos[id] && !g.guardadas[id] && !g.manuais.includes(id)));
  const albs = [...new Set(FAIXAS.map((f) => f[2]).filter((x) => RE_ID.test(x)))].filter((id) => precisa(g, id, id in g.capas) || (comR2 && g.capas[id] && !g.guardadas[id]));
  return { art, albs };
}
const pedacoDe = (url) => (String(url).match(/\/image\/[a-f0-9]{16}([a-f0-9]{8})/) || [])[1] || null;
async function baixarPadrao(url) {
  try { const r = await fetch(url); if (!r.ok) return null; const b = await r.arrayBuffer(); return b.byteLength > 500 ? b : null; } catch (_) { return null; }
}
// guardar(chave, grande, pequena): põe capa/<chave>.jpg, -m e -p no R2
export function guardarNoR2(env) {
  if (!env || !env.AUDIO) return null;
  const meta = { httpMetadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=604800' } };
  return async (chave, grande, pequena) => {
    await env.AUDIO.put(`capa/${chave}.jpg`, grande, meta);
    await env.AUDIO.put(`capa/${chave}-m.jpg`, grande, meta);
    await env.AUDIO.put(`capa/${chave}-p.jpg`, pequena || grande, meta);
  };
}
export async function buscarImagens(g, { pegar = pegarPadrao, baixar = baixarPadrao, guardar = null, max = 45 } = {}) {
  g = gravouLimpar(g);
  const comR2 = !!guardar;
  const { art, albs } = faltando(g, { comR2 });
  const hoje = agoraMin();
  let feitas = 0, idas = 0;
  // copia pro R2 (2 idas: grande e pequena). Sem R2 ligado, fica só o endereço do Spotify.
  async function copiar(id, url, prefixo) {
    if (!guardar || !url) { if (!url) delete g.guardadas[id]; return; }
    const pedaco = pedacoDe(url);
    if (!pedaco) return;
    const chave = `${prefixo}-${id}-${pedaco}`;
    if (g.guardadas[id] === chave) return;
    if (idas + 2 > max) return;
    idas += 2;
    const grande = await baixar(url);
    if (!grande) return;
    const pequena = await baixar(imgPequena(url));
    await guardar(chave, grande, pequena);
    g.guardadas[id] = chave;
  }
  for (const id of art) {
    if (idas + 3 > max) break;
    const leu = (g.conferido[id] || 0) >= (g.refazer || 0) && g.conferido[id] && id in g.fotos && id in g.ouvintes;
    if (!leu) {
      idas++;
      const html = await pegar(`https://open.spotify.com/artist/${id}`);
      if (!html) continue;
      const d = dadosDoArtista(html);
      g.fotos[id] = d.foto || '';
      if (d.foto) g.tipos[id] = d.tipo || 'foto'; else delete g.tipos[id];
      g.ouvintes[id] = d.ouvintes || 0;
      g.conferido[id] = hoje;
    }
    // foto que o Bruno subiu no painel fica (o Spotify só dá os ouvintes)
    if (!g.manuais.includes(id)) await copiar(id, g.fotos[id], 'grv');
    feitas++;
  }
  for (const id of albs) {
    if (idas + 3 > max) break;
    const leu = (g.conferido[id] || 0) >= (g.refazer || 0) && g.conferido[id] && id in g.capas;
    if (!leu) {
      idas++;
      const html = await pegar(`https://open.spotify.com/album/${id}`);
      // página do álbum fora: usa a capa da lista (se tiver) em vez de ficar travado sem capa
      if (!html && !imgDoAlbum(id)) continue;
      const img = html ? meta1(html, 'og:image') : '';
      // sem imagem na página do álbum: a capa anotada na lista (vem do embed da faixa)
      g.capas[id] = RE_IMG.test(img) ? img : imgDoAlbum(id) || '';
      g.conferido[id] = hoje;
    }
    await copiar(id, g.capas[id], 'gra');
    feitas++;
  }
  const f = faltando(g, { comR2 });
  return { g, feitas, idas, faltam: f.art.length + f.albs.length };
}

// Chaves do R2 que a página usa (a faxina do R2 guarda estas e apaga o resto de capa/gr*)
export function chavesGuardadas(valor) {
  const g = gravouDeTexto(valor);
  const out = new Set();
  for (const k of Object.values(g.guardadas)) for (const s of ['', '-m', '-p']) out.add(`capa/${k}${s}.jpg`);
  return out;
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
function corpoPainel(g, comR2 = true) {
  const fora = new Set(g.escondidos), ff = new Set(g.faixasFora);
  const f = faltando(g, { comR2 });
  return {
    ok: true, noAr: g.noAr, atualizado: g.at, ordemManual: g.ordemManual, ordemPagina: montarGravou(g).artistas.map((a) => a.id),
    faltam: f.art.length + f.albs.length,
    artistas: [[EU, '@rideblan33', '', 0, true]].concat(ARTISTAS).filter((a) => !a[4] || FAIXAS.some((f) => f[3].length === 1 && f[3][0] === EU)).map(([id, nome, pasta, provavel, eu]) => ({ eu: !!eu,
      id, nome, pasta: pasta || '', provavel: !!provavel, fora: fora.has(id),
      foto: eu ? FOTO_EU : fotoDe(g, id), tipo: eu ? 'foto' : g.manuais.includes(id) ? 'foto' : g.tipos[id] || '', guardada: !!g.guardadas[id], manual: g.manuais.includes(id),
      ouvintes: id in g.ouvintes ? g.ouvintes[id] : null,
      faixas: FAIXAS.filter((x) => x[3].includes(id)).map((x) => x[0])
    })),
    faixas: Object.fromEntries(FAIXAS.map(([id, nome, alb, ars, plays, data, img]) => [id, { nome, ars, capa: capaDaFaixa(g, alb, img), plays: plays || 0, data: data || '', fora: ff.has(id) }]))
  };
}
// op: 'gravou' (GET), 'gravou-no-ar', 'gravou-esconder', 'gravou-imagens', 'gravou-atualizar'
// devolve { corpo, status, mudou }
export async function painelGravou(op, d, body = {}, { pegar = pegarPadrao, baixar = baixarPadrao, env = null, guardar = null } = {}) {
  const g = await lerMeta(d);
  const gr = guardar || guardarNoR2(env), comR2 = !!gr;
  const corpoPainel2 = (x) => corpoPainel(x, comR2);
  if (op === 'gravou') return { corpo: corpoPainel2(g), mudou: false };
  if (op === 'gravou-no-ar') { g.noAr = !!body.noAr; await gravarMeta(d, g); return { corpo: corpoPainel2(g), mudou: true }; }
  if (op === 'gravou-esconder') {
    const id = String(body.id || '');
    const lista = body.tipo === 'faixa' ? 'faixasFora' : body.tipo === 'artista' ? 'escondidos' : null;
    const existe = body.tipo === 'faixa' ? FAIXAS.some((f) => f[0] === id) : ARTISTAS.some((a) => a[0] === id) || id === EU;
    if (!lista || !existe) return { corpo: { erro: 'item não encontrado' }, status: 400, mudou: false };
    const s = new Set(g[lista]);
    if (body.esconder) s.add(id); else s.delete(id);
    g[lista] = [...s];
    await gravarMeta(d, g);
    return { corpo: corpoPainel2(g), mudou: true };
  }
  if (op === 'gravou-imagens') {
    const r = await buscarImagens(g, { pegar, baixar, guardar: gr, max: 45 });
    if (r.feitas || r.idas) await gravarMeta(d, r.g);
    return { corpo: { ...corpoPainel2(r.g), feitas: r.feitas }, mudou: r.feitas > 0 };
  }
  // Foto do artista enviada pelo Bruno (17/10/2026: artista sem foto no Spotify). O painel manda
  // duas JPEG já reduzidas (640 e 320 px, em base64); a chave leva 8 letras do conteúdo.
  if (op === 'gravou-foto') {
    const id = String(body.id || '');
    if (!ARTISTAS.some((a) => a[0] === id)) return { corpo: { erro: 'artista não encontrado' }, status: 400, mudou: false };
    if (!gr) return { corpo: { erro: 'o R2 não está ligado' }, status: 500, mudou: false };
    const bin = (b) => { try { const s = atob(String(b || '')); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; } catch (_) { return null; } };
    const grande = bin(body.grande), pequena = bin(body.pequena) || grande;
    const jpeg = (u) => u && u.length > 500 && u.length < 900000 && u[0] === 0xff && u[1] === 0xd8;
    if (!jpeg(grande) || !jpeg(pequena)) return { corpo: { erro: 'a imagem precisa ser JPEG de até 900 KB' }, status: 400, mudou: false };
    const h = [...new Uint8Array(await crypto.subtle.digest('SHA-256', grande))].slice(0, 4).map((x) => x.toString(16).padStart(2, '0')).join('');
    const chave = `grv-${id}-${h}`;
    await gr(chave, grande.buffer, pequena.buffer);
    g.guardadas[id] = chave;
    if (!g.manuais.includes(id)) g.manuais.push(id);
    await gravarMeta(d, g);
    return { corpo: corpoPainel2(g), mudou: true };
  }
  // Ordem da página (17/10/2026): arrastar no painel grava a ordem e liga o modo manual;
  // "Por ouvintes" volta pro padrão (a ordem arrastada fica guardada se ele voltar pro manual)
  if (op === 'gravou-ordem') {
    const ok = new Set(ARTISTAS.map((a) => a[0]));
    const ids = (Array.isArray(body.ids) ? body.ids : []).map(String).filter((id) => ok.has(id));
    if (!ids.length) return { corpo: { erro: 'ordem vazia' }, status: 400, mudou: false };
    g.ordem = [...new Set(ids)]; g.ordemManual = true;
    await gravarMeta(d, g);
    return { corpo: corpoPainel2(g), mudou: true };
  }
  if (op === 'gravou-ordem-modo') {
    if (body.manual && !g.ordem.length) g.ordem = montarGravou(g).artistas.map((a) => a.id);
    g.ordemManual = !!body.manual;
    await gravarMeta(d, g);
    return { corpo: corpoPainel2(g), mudou: true };
  }
  // volta pra foto do Spotify (o próximo "Buscar" copia de novo)
  if (op === 'gravou-foto-tirar') {
    const id = String(body.id || '');
    g.manuais = g.manuais.filter((x) => x !== id);
    delete g.guardadas[id];
    await gravarMeta(d, g);
    return { corpo: corpoPainel2(g), mudou: true };
  }
  // "Atualizar fotos e ouvintes": tudo lê de novo (foto trocada vira chave nova no R2)
  if (op === 'gravou-atualizar') {
    g.refazer = agoraMin();
    await gravarMeta(d, g);
    return { corpo: corpoPainel2(g), mudou: false };
  }
  return null;
}
