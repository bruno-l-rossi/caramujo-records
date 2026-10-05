// Músicas do perfil (05/10/2026): a aba "Músicas" do /rideblan33. O Bruno cola no painel
// o link do Spotify (ou do YouTube) de uma música que produziu; nome, artistas, data e
// capa vêm do próprio link. Duas seções: DESTAQUES (ordem dele) e RECENTES (a mais nova
// primeiro, pela data de lançamento, ou na ordem dele quando ligar a ordem personalizada).
// A música toca INTEIRA no perfil (06/10/2026; antes eram 30 s) do arquivo que já está na
// pasta do artista no catálogo; sem arquivo, só os botões do Spotify/YouTube.
//
// Tudo numa linha da meta ('musicas'): o perfil já lê a meta numa consulta só, então a
// aba nova não custa consulta a mais. A capa vai pra prateleira (R2) como capa/mus-<id>,
// servida pelo /capa/<id> igual às capas das tapes.

import { slug } from './casar.js';
import { somUrl as somPadrao } from './midia.js';

export const CHAVE = 'musicas';
export const MAX = 60;                 // músicas na lista (destaques + recentes)

/* ---------- de onde a pessoa veio e em que aba o perfil abre ---------- */

// A mesma conta da página (o analytics usa a do navegador): ?de= manda; sem ele, o site
// de onde a pessoa veio; nada = direto.
export function origem(request) {
  let de = '';
  try { de = (new URL(request.url).searchParams.get('de') || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24); } catch (_) { de = ''; }
  if (de) return de;
  let r = '';
  try { r = new URL(request.headers.get('referer') || '').hostname; } catch (_) { r = ''; }
  return /instagram/.test(r) ? 'instagram' : /google\./.test(r) ? 'google' : /youtube|youtu\.be/.test(r) ? 'youtube'
    : /facebook|fb\./.test(r) ? 'facebook' : /whatsapp/.test(r) ? 'whatsapp' : /spotify/.test(r) ? 'spotify'
      : /caramujorecords/.test(r) ? 'site' : r ? 'outro-site' : 'direto';
}

// Escolha do Bruno (05/10/2026): abrem em Beat tapes a página de beat e de gênero (anel e
// "prod. @rideblan33"), as tapes ("@rideblan33", "Ver tudo", "Portfólio completo"), o
// "Ver tudo"/"Portfólio completo" da pasta de artista, a página de erro e o story do
// catálogo de capas. Todo o resto (vitrine, rodapé, @rideblan33 da pasta, story do
// perfil, link enviado, bio, Instagram, Google, redes, direto) abre em Músicas.
export const ABRE_TAPES = new Set(['pagina-beat', 'pagina-genero', 'tape', 'artista-mais', '404', 'story-catalogo']);
export const abaInicial = (de) => (ABRE_TAPES.has(de) ? 'tapes' : 'musicas');

/* ---------- a lista ---------- */

const texto = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const RE_SPOTIFY = /^https:\/\/open\.spotify\.com\/(track|album)\/([A-Za-z0-9]{22})$/;
const RE_YOUTUBE = /^https:\/\/www\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})$/;
const RE_CAPA_FORA = /^https:\/\/(i\.scdn\.co|image-cdn-[a-z]+\.spotifycdn\.com|i\.ytimg\.com)\/[A-Za-z0-9_./-]+$/;

// Link colado do jeito que for (com ?si=, intl-pt, youtu.be, shorts) vira o endereço limpo
export function normalizarLink(v) {
  const s = String(v || '').trim();
  let m = s.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album)\/([A-Za-z0-9]{22})/);
  if (m) return { tipo: 'spotify', url: `https://open.spotify.com/${m[1]}/${m[2]}`, id: 'sp' + m[2], album: m[1] === 'album' };
  m = s.match(/(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/)|youtu\.be\/|music\.youtube\.com\/watch\?v=)([A-Za-z0-9_-]{11})/);
  if (m) return { tipo: 'youtube', url: `https://www.youtube.com/watch?v=${m[1]}`, id: 'yt' + m[1] };
  return null;
}

function item(x) {
  if (!x || typeof x !== 'object') return null;
  const nome = texto(x.nome, 120);
  if (!nome) return null;
  const spotify = RE_SPOTIFY.test(x.spotify || '') ? x.spotify : null;
  const youtube = RE_YOUTUBE.test(x.youtube || '') ? x.youtube : null;
  if (!spotify && !youtube) return null;
  const id = String(x.id || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40) || (normalizarLink(spotify || youtube) || {}).id;
  const dur = Number(x.dur);
  return {
    id,
    secao: x.secao === 'destaque' ? 'destaque' : 'recente',
    nome,
    artistas: texto(x.artistas, 200),
    spotify, youtube,
    capa: /^mus-[A-Za-z0-9_-]{6,60}$/.test(x.capa || '') ? x.capa : null,
    capaUrl: RE_CAPA_FORA.test(x.capaUrl || '') ? x.capaUrl : null,
    data: /^\d{4}(-\d{2}(-\d{2})?)?$/.test(x.data || '') ? x.data : null,
    faixa: /^[A-Za-z0-9_-]{1,80}$/.test(x.faixa || '') ? x.faixa : null,
    dur: x.dur != null && x.dur !== '' && Number.isFinite(dur) && dur > 0 ? Math.round(dur) : null,
    buscou: !!x.buscou   // já procurou o arquivo na pasta do artista (não procura de novo sozinho)
  };
}

export function limpar(o) {
  const vistos = new Set();
  const lista = [];
  for (const x of (o && Array.isArray(o.lista) ? o.lista : [])) {
    const it = item(x);
    if (!it || vistos.has(it.id)) continue;
    vistos.add(it.id); lista.push(it);
    if (lista.length >= MAX) break;
  }
  // ordemRecentes: 'data' (padrão, a mais nova primeiro) ou 'manual' (a ordem da lista)
  return { noAr: !!(o && o.noAr), ordemRecentes: o && o.ordemRecentes === 'manual' ? 'manual' : 'data', lista };
}

export function deTexto(valor) {
  try { return limpar(JSON.parse(valor)); } catch (_) { return { noAr: false, ordemRecentes: 'data', lista: [] }; }
}

// recentes da mais nova pra mais velha (sem data vai pro fim; empate fica como estava)
const porData = (l) => l.map((x, i) => [x, i]).sort((a, b) => (b[0].data || '').localeCompare(a[0].data || '') || a[1] - b[1]).map((p) => p[0]);

// Destaques na ordem do Bruno; recentes pela data ou na ordem dele
export function separar(m) {
  const lista = (m && m.lista) || [];
  const destaques = lista.filter((x) => x.secao === 'destaque');
  const soRecentes = lista.filter((x) => x.secao !== 'destaque');
  return { destaques, recentes: m && m.ordemRecentes === 'manual' ? soRecentes : porData(soRecentes) };
}

/* ---------- ler o link (painel) ---------- */

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const desfaz = (s) => String(s || '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') { const c = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(c) ? String.fromCodePoint(c) : m; }
  return ENT[e.toLowerCase()] ?? m;
});

// <meta name|property="x" content="y"> do HTML (as duas ordens de atributo)
export function metas(html) {
  const out = {};
  for (const m of String(html || '').matchAll(/<meta\s+[^>]*>/gi)) {
    const tag = m[0];
    const k = (tag.match(/\b(?:name|property)\s*=\s*"([^"]+)"/i) || [])[1];
    const v = (tag.match(/\bcontent\s*=\s*"([^"]*)"/i) || [])[1];
    if (k && v !== undefined && !(k.toLowerCase() in out)) out[k.toLowerCase()] = desfaz(v);
  }
  const t = String(html || '').match(/<title[^>]*>([^<]*)<\/title>/i);
  if (t) out.__title = desfaz(t[1]);
  return out;
}

// Os artistas sem o próprio @rideblan33 (a página já é dele)
export const semMim = (s) => String(s || '').split(/\s*,\s*|\s+&\s+/).map((x) => x.trim())
  .filter((x) => x && !/^@?rideblan(33)?$/i.test(x)).join(', ');

async function pegar(url, tipo = 'text') {
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8' }, redirect: 'follow' });
    if (!r.ok) return null;
    return tipo === 'json' ? await r.json() : await r.text();
  } catch (_) { return null; }
}

// Do link pro que a lista precisa. Falhou a leitura: devolve o que deu (o painel deixa
// o Bruno digitar o resto).
export async function lerLink(colado) {
  const l = normalizarLink(colado);
  if (!l) return null;
  if (l.tipo === 'spotify') {
    const m = metas(await pegar(l.url));
    let nome = m['og:title'] || '';
    let artistas = m['music:musician_description'] || '';
    let data = m['music:release_date'] || '';
    let capaUrl = m['og:image'] || '';
    const desc = m['og:description'] || m['twitter:description'] || '';
    // "CandyBoiNarco, @rideblan33 · Neymar Skills · Song · 2025" / álbum: "vtzinx · Single · 2026"
    if (!artistas && desc) artistas = desc.split(' · ')[0] || '';
    if (!artistas && m.__title) artistas = ((m.__title.match(/\bby (.+?) \| Spotify/) || [])[1]) || '';
    if (!data) data = (desc.match(/\b(19|20)\d{2}\b/) || [])[0] || '';
    if (!nome) {
      const o = await pegar('https://open.spotify.com/oembed?url=' + encodeURIComponent(l.url), 'json');
      if (o) { nome = o.title || ''; capaUrl = capaUrl || o.thumbnail_url || ''; }
    }
    return { id: l.id, spotify: l.url, youtube: null, album: !!l.album, nome: texto(nome, 120), artistas: texto(semMim(artistas), 200), data: /^\d{4}/.test(data) ? data.slice(0, 10) : null, capaUrl: RE_CAPA_FORA.test(capaUrl) ? capaUrl : null };
  }
  const o = await pegar('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(l.url), 'json');
  const vid = l.id.slice(2);
  return { id: l.id, spotify: null, youtube: l.url, album: false, nome: texto(o && o.title, 120), artistas: texto(semMim(o && o.author_name), 200), data: null, capaUrl: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg` };
}

/* ---------- capa na prateleira ---------- */

// Spotify tem a mesma capa em 640 (b273) e 300 (1e02): a grande vira a inteira e a média,
// a pequena vira a miniatura (?p). YouTube: a mesma imagem nas três.
export async function guardarCapa(env, it) {
  if (!env || !env.AUDIO || !it || !it.capaUrl) return null;
  const id = 'mus-' + it.id;
  const grande = await fetch(it.capaUrl).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null);
  if (!grande || grande.byteLength < 500) return null;
  let pequena = null;
  if (/ab67616d0000b273/.test(it.capaUrl)) {
    pequena = await fetch(it.capaUrl.replace('ab67616d0000b273', 'ab67616d00001e02')).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null);
  }
  const meta = { httpMetadata: { contentType: 'image/jpeg' } };
  await env.AUDIO.put(`capa/${id}.jpg`, grande, meta);
  await env.AUDIO.put(`capa/${id}-m.jpg`, grande, meta);
  await env.AUDIO.put(`capa/${id}-p.jpg`, pequena || grande, meta);
  return id;
}

/* ---------- o áudio (arquivo da pasta do artista) ---------- */

// Faixas do catálogo com o nome parecido (pra ligar o áudio). Uma consulta, só no painel.
// Pontos: nome igual 100; igual sem o parêntese/" - Remix" 90; contém o nome 70; o nome
// contém a faixa 40; música (não beat) +10; pasta com o nome de um dos artistas +20;
// remix/ao vivo/acústico de um lado só -30. Liga sozinho só música com 100 ou mais.
const MARCAS = ['remix', 'acustico', 'ao-vivo', 'live', 'slowed', 'speed', 'sped-up', 'instrumental'];
const base = (nome) => slug(String(nome || '').replace(/\s*[([{].*?[)\]}]/g, ' ').replace(/\s+-\s+.*$/, ''));
export const LIGA_SOZINHO = 100;
export function pontuar(nome, artistas, faixa) {
  const alvo = slug(nome), b = base(nome) || alvo, s = slug(faixa.title);
  if (!s || !alvo) return 0;
  let pts = s === alvo ? 100 : s === b ? 90 : (b.length >= 4 && s.includes(b)) ? 70 : (s.length >= 6 && alvo.includes(s)) ? 40 : 0;
  if (!pts) return 0;
  if (faixa.kind === 'son') pts += 10;
  const p = slug(faixa.pasta);
  if (p && artistas && String(artistas).split(/\s*,\s*/).some((x) => slug(x) === p)) pts += 20;
  for (const m of MARCAS) if (alvo.includes(m) !== s.includes(m)) { pts -= 30; break; }
  return pts;
}
// a palavra que vai no LIKE: o pedaço sem acento mais comprido (o LIKE do banco só
// ignora maiúscula/minúscula nas letras sem acento)
function palavraBusca(nome) {
  let melhor = '';
  for (const w of String(nome || '').split(/[^A-Za-z0-9\u00C0-\u017F]+/)) {
    const p = (w.match(/^[A-Za-z0-9]+/) || [''])[0];
    if (p.length > melhor.length) melhor = p;
  }
  return melhor.length >= 3 ? melhor.slice(0, 24) : '';
}
export async function candidatos(d, nome, artistas = '') {
  const palavra = palavraBusca(base(nome) ? String(nome).replace(/\s*[([{].*?[)\]}]/g, ' ') : nome) || palavraBusca(nome);
  if (!palavra) return [];
  const { results } = await d.prepare(
    `SELECT t.id, t.title, t.kind, t.dur, a.name AS pasta, a.tipo FROM tracks t JOIN artists a ON a.id = t.artist_id
      WHERE t.ready = 1 AND a.tipo IN ('artista', 'tape') AND t.title LIKE ? LIMIT 80`
  ).bind('%' + palavra + '%').all();
  return (results || []).map((r) => {
    const pts = pontuar(nome, artistas, r);
    return pts > 0 ? { id: r.id, titulo: r.title, pasta: r.pasta, tipo: r.tipo, musica: r.kind === 'son', dur: r.dur || 0, pts, som: somPadrao(r.id) } : null;
  }).filter(Boolean).sort((a, b) => b.pts - a.pts).slice(0, 8);
}

/* ---------- painel: Músicas do perfil ---------- */

async function ler(d) {
  const r = await d.prepare(`SELECT valor FROM meta WHERE chave = '${CHAVE}'`).first();
  return r ? deTexto(r.valor) : { noAr: false, ordemRecentes: 'data', lista: [] };
}
async function gravar(d, m) {
  const limpo = limpar(m);
  await d.prepare(`INSERT OR REPLACE INTO meta (chave, valor) VALUES ('${CHAVE}', ?)`).bind(JSON.stringify(limpo)).run();
  return limpo;
}

// liga o áudio: confere que a faixa existe e está pronta
async function ligarAudio(d, it, faixa) {
  if (!faixa) { it.faixa = null; it.dur = null; return true; }
  const t = await d.prepare('SELECT id, dur FROM tracks WHERE id = ? AND ready = 1').bind(String(faixa)).first();
  if (!t) return false;
  it.faixa = t.id; it.dur = t.dur || null;
  return true;
}

// O que a tela do painel mostra: a lista na ordem da página, com o nome do arquivo do
// áudio e o endereço do som pra ouvir ali mesmo. Uma consulta pras faixas ligadas.
async function resposta(d, m, somUrl) {
  const { destaques, recentes } = separar(m);
  const ids = [...new Set(m.lista.map((x) => x.faixa).filter(Boolean))];
  const nomes = {};
  if (ids.length) {
    const { results } = await d.prepare(
      `SELECT t.id, t.title, a.name AS pasta FROM tracks t JOIN artists a ON a.id = t.artist_id WHERE t.id IN (${ids.map(() => '?').join(', ')})`
    ).bind(...ids).all();
    for (const r of results || []) nomes[r.id] = r;
  }
  const mostra = (x) => ({
    ...x,
    capaSrc: x.capa ? `/capa/${x.capa}?p` : x.capaUrl || null,
    audio: x.faixa && nomes[x.faixa] ? { titulo: nomes[x.faixa].title, pasta: nomes[x.faixa].pasta, som: somUrl(x.faixa) } : null
  });
  const faltamCapas = m.lista.filter((x) => !x.capa && x.capaUrl).length;
  return { ok: true, noAr: m.noAr, ordemRecentes: m.ordemRecentes, destaques: destaques.map(mostra), recentes: recentes.map(mostra), max: MAX, faltamCapas };
}

// Abrir a tela: guarda as capas que faltam (até 4 por vez) e procura o áudio de quem
// ainda não procurou. Volta { corpo, mudou }.
export async function painelLer(d, env, somUrl = somPadrao) {
  const m = await ler(d);
  let mudou = false, capas = 0;
  for (const it of m.lista) {
    if (!it.capa && it.capaUrl && capas < 4) {
      capas++;
      const c = await guardarCapa(env, it).catch(() => null);
      if (c) { it.capa = c; mudou = true; }
    }
    if (!it.buscou) {
      it.buscou = true; mudou = true;
      if (!it.faixa) {
        const cs = await candidatos(d, it.nome, it.artistas).catch(() => []);
        if (cs[0] && cs[0].musica && cs[0].pts >= LIGA_SOZINHO) await ligarAudio(d, it, cs[0].id);
      }
    }
  }
  const final = mudou ? await gravar(d, m) : m;
  return { corpo: await resposta(d, final, somUrl), mudou };
}

const erro = (e) => ({ corpo: { erro: e }, status: 400, mudou: false });

// As ações do painel. Toda ação que muda devolve a lista inteira (a tela redesenha) e
// mudou = true (o painel derruba a cópia do perfil).
export async function painelAcao(op, d, env, body, somUrl = somPadrao) {
  body = body || {};
  if (op === 'musica-ler') {
    if (!normalizarLink(body.link)) return erro('Cola o link de uma música do Spotify (open.spotify.com/track/…) ou de um vídeo do YouTube.');
    const lido = await lerLink(body.link);
    const m = await ler(d);
    const ja = m.lista.find((x) => x.id === lido.id || (lido.spotify && x.spotify === lido.spotify) || (lido.youtube && x.youtube === lido.youtube));
    const cs = lido.nome ? await candidatos(d, lido.nome, lido.artistas).catch(() => []) : [];
    return { corpo: { ok: true, musica: lido, ja: ja ? ja.id : null, candidatos: cs }, mudou: false };
  }
  if (op === 'musica-buscar') {
    const q = String(body.q || '').slice(0, 80);
    return { corpo: { ok: true, candidatos: q.trim().length >= 3 ? await candidatos(d, q, body.artistas || '') : [] }, mudou: false };
  }
  const m = await ler(d);
  if (op === 'musicas-no-ar') {
    if (body.noAr && !m.lista.length) return erro('Coloca pelo menos uma música antes de ligar.');
    m.noAr = !!body.noAr;
  } else if (op === 'musica-salvar') {
    const nome = texto(body.nome, 120);
    if (!nome) return erro('Falta o nome da música.');
    const sp = body.spotify ? normalizarLink(body.spotify) : null;
    const yt = body.youtube ? normalizarLink(body.youtube) : null;
    if (body.spotify && (!sp || sp.tipo !== 'spotify')) return erro('O link do Spotify não está certo. Copia de novo pelo "Compartilhar" do app.');
    if (body.youtube && (!yt || yt.tipo !== 'youtube')) return erro('O link do YouTube não está certo.');
    if (!sp && !yt) return erro('Falta o link do Spotify ou do YouTube.');
    if (body.data && !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(body.data)) return erro('A data ficou estranha. Usa dia/mês/ano.');
    let it = body.id ? m.lista.find((x) => x.id === body.id) : null;
    const novo = !it;
    if (novo) {
      const id = (sp || yt).id;
      if (m.lista.some((x) => x.id === id)) return erro('Essa música já está na lista.');
      if (m.lista.length >= MAX) return erro(`A lista já tem ${MAX} músicas. Tira uma antes.`);
      it = { id, buscou: true };
    }
    const secao = body.secao === 'destaque' ? 'destaque' : 'recente';
    const mudouSecao = !novo && it.secao !== secao;
    Object.assign(it, {
      nome, artistas: texto(semMim(body.artistas), 200), secao,
      spotify: sp ? sp.url : null, youtube: yt ? yt.url : null, data: body.data || null, buscou: true
    });
    if (body.capaUrl && RE_CAPA_FORA.test(body.capaUrl) && body.capaUrl !== it.capaUrl) { it.capaUrl = body.capaUrl; it.capa = null; }
    if (!it.capaUrl && yt) it.capaUrl = `https://i.ytimg.com/vi/${yt.id.slice(2)}/hqdefault.jpg`;
    if (!it.capa && it.capaUrl) it.capa = await guardarCapa(env, it).catch(() => null);
    if ('faixa' in body && !(await ligarAudio(d, it, body.faixa || null))) return erro('Não achei esse arquivo de áudio. Escolhe outro.');
    // destaque novo (ou que virou destaque) entra no fim dos destaques; recente nova na
    // ordem personalizada entra em 1º das recentes (na ordem por data, a data decide)
    if (mudouSecao) m.lista.splice(m.lista.indexOf(it), 1);
    if (novo || mudouSecao) {
      if (it.secao === 'destaque') m.lista.push(it);
      else { const k = m.lista.findIndex((x) => x.secao !== 'destaque'); m.lista.splice(k < 0 ? m.lista.length : k, 0, it); }
    }
  } else if (op === 'musica-tirar') {
    const n = m.lista.findIndex((x) => x.id === body.id);
    if (n < 0) return erro('Essa música já não está na lista.');
    m.lista.splice(n, 1);
    if (!m.lista.length) m.noAr = false;
  } else if (op === 'musicas-ordem') {
    // a ordem nova de uma seção inteira (arrastar no painel). Recentes arrastadas = ordem
    // personalizada ligada.
    const secao = body.secao === 'destaque' ? 'destaque' : 'recente';
    const da = m.lista.filter((x) => x.secao === secao);
    const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
    if (ids.length !== da.length || new Set(ids).size !== ids.length || !ids.every((id) => da.some((x) => x.id === id))) return erro('A lista mudou enquanto você arrastava. Recarrega a página.');
    const nova = ids.map((id) => da.find((x) => x.id === id));
    const resto = m.lista.filter((x) => x.secao !== secao);
    m.lista = secao === 'destaque' ? nova.concat(resto) : resto.concat(nova);
    if (secao === 'recente') m.ordemRecentes = 'manual';
  } else if (op === 'musicas-ordem-recentes') {
    // Personalizada começa da ordem que estava na tela (a por data); voltar pra data só troca a chave
    if (body.modo === 'manual') {
      if (m.ordemRecentes !== 'manual') {
        const { recentes } = separar(m);
        m.lista = m.lista.filter((x) => x.secao === 'destaque').concat(recentes);
      }
      m.ordemRecentes = 'manual';
    } else m.ordemRecentes = 'data';
  } else return null;
  const final = await gravar(d, m);
  return { corpo: await resposta(d, final, somUrl), mudou: true };
}

/* ---------- as 9 músicas que o Bruno mandou em 05/10/2026 (entram uma vez) ---------- */

export const INICIAIS = [
  ['destaque', 'Fumei Muito (Isso É um Cone?)', 'FAB GODAMN, CandyBoiNarco, mavyrmldy', 'track/4xpOKJ64c2yia5mzBlHhw9', '2025-10-17', 'e8d95dae780afa88a680f122'],
  ['destaque', 'Fumei do Boldin', 'CandyBoiNarco', 'track/3lBY71THZPROV0SnrfelFk', '2024-04-12', '95341428796687fc861b12e4'],
  ['destaque', 'Levitação', 'mavyrmldy', 'track/64iHldzqJJpjLrENv5Xn4Q', '2025-09-05', 'b390d2b9b242083ad960b7a8'],
  ['destaque', 'Neymar Skills', 'CandyBoiNarco', 'track/2UZLDrBuakJLcrWNMGYdA2', '2025-10-03', '494508254fe82726e0a83de3'],
  ['recente', 'Também Não Vou Ligar (Bb)', 'mavyrmldy', 'track/2066mghzcuSVJjinGa77GI', '2026-07-24', 'b3450539529dd296e79721b8'],
  ['recente', 'Na Minha Lamborghini', 'CandyBoiNarco', 'track/6JjPBMzUJRdANxSAEtXdqk', '2026-07-17', '1de6f2ee98924d5724aa2620'],
  ['recente', 'Paul Walker - Remix (Bonus Track)', 'Young Moreira, Insyde B, vtzinx, SaberOg', 'track/3rylfcrKuHYvPZVFeOQ7zT', '2025-12-25', 'df31882af430ee8453420b5d'],
  ['recente', 'Maybach', 'vtzinx', 'album/3FvrUUJPq6SPvLzbqetjXd', '2026-03-13', '378d4aa377d19900b99236a7'],
  ['recente', 'Só Eu Sei', 'Marrom', 'album/22m1FpdUUb4ZAxodvQPVQk', '2025-10-31', 'cba71af3cbf1ee571f1e9d4e']
].map(([secao, nome, artistas, sp, data, capa]) => ({
  id: 'sp' + sp.split('/')[1], secao, nome, artistas, spotify: 'https://open.spotify.com/' + sp, youtube: null,
  capa: null, capaUrl: 'https://i.scdn.co/image/ab67616d0000b273' + capa, data, faixa: null, dur: null, buscou: false
}));
