// Perfil do @rideblan33 (26/09/2026): caramujorecords.com.br/rideblan33
// A porta de entrada das beat tapes. Toda tape aparece sozinha (tape nova entra no
// topo); o painel esconde e reordena. A lista também alimenta o bloco "Mais do
// @rideblan33" no fim de cada tape e o sitemap.
//
// Leitura barata: UMA consulta (contagem de beats agrupada, nada por faixa), guardada
// 60 s no isolate e 5 min na cópia da região. O painel derruba as duas quando muda
// alguma coisa (esquecerPerfil).

import { CHAVE_AJUSTE, ajusteDeTexto, daTape } from './tapeajuste.js';
import { rodape, RODAPE_CSS } from './rodape.js';
import { db } from './db.js';
import { MIDIA, capaUrl, CAPA_VOLTA } from './midia.js';
import { ICONES as ICONES_ABA, SELO_GRANDE } from './icones.js';
import { RODAPE_GENEROS, CSS_RODAPE_GENEROS } from './generos.js';
import { PADRAO as NUM_PADRAO, deTexto as numDeTexto, limpar as numLimpar, curto, longo } from './numeros.js';
import { CHAVE as MUS_CHAVE, deTexto as musDeTexto, separar } from './musicas.js';
import { LEVA_DE, deAttr } from './origem.js';
import { CHAVE_GRAVOU, gravouDeTexto, gravouLimpar, montarGravou, imgPequena } from './gravou.js';
import { fotoArtista } from './gravoupagina.js';
import { topo, TOPO_PAGINA_CSS, TOPO_JS } from './topo.js';
// as fotos de "Por dentro do estúdio" (25/10/2026: saíram da vitrine e moram no cartão "Quer um som assim?")
const FOTOS_ESTUDIO = [['/assets/studio-hero.jpg', 'Onde tudo acontece'], ['/assets/sessao-poster.jpg', 'Sessão de estúdio'], ['/assets/depo-fab-poster.jpg', 'Colaboração fatal, o retorno do Fab'], ['/assets/depo-candy.jpg', 'Parcerias de destaque, o direct do Candy']];

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

// Uma consulta pra meta (ranking do em alta + números do site + músicas do perfil); a
// conta dos plays só quando o ranking guardado passou de 6 h.
// a leitura crua da meta (sai junto com as outras consultas do lerPerfil)
async function lerMetaBruta(d) {
  try {
    const { results } = await d.prepare(
      `SELECT chave, valor FROM meta WHERE chave IN ('${EM_ALTA_CHAVE}', 'numeros', '${MUS_CHAVE}', '${CHAVE_GRAVOU}', '${CHAVE_AJUSTE}')`
    ).all();
    return results || [];
  } catch (_) { return null; }
}

async function lerMetaPerfil(d, nova, linhas) {
  let ranking = null, numeros = { ...NUM_PADRAO }, musicas = { noAr: false, lista: [] }, gravou = gravouLimpar({});
  try {
    const results = linhas === undefined ? await lerMetaBruta(d) : linhas;
    for (const r of results || []) {
      if (r.chave === 'numeros') numeros = numDeTexto(r.valor);
      else if (r.chave === MUS_CHAVE) musicas = musDeTexto(r.valor);
      else if (r.chave === CHAVE_GRAVOU) gravou = gravouDeTexto(r.valor);
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
  return { emAlta: escolherEmAlta(ranking.top, nova), numeros, musicas, gravou };
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
  // As três leituras saem juntas (10/10/2026; eram uma atrás da outra, ~150 ms cada no
  // servidor frio): a lista, os beats da 1ª tape (achada na própria consulta, mesma
  // ordem da lista) e a meta. O ranking do EM ALTA só é refeito a cada 6 horas.
  const pTapes = d.prepare(
    `SELECT a.id, a.name, a.slug, a.code, a.cover_key, COALESCE(c.n, 0) AS n
       FROM artists a
       LEFT JOIN (SELECT artist_id, COUNT(*) AS n FROM tracks
                   WHERE kind = 'beat' AND ready = 1 GROUP BY artist_id) c ON c.artist_id = a.id
      WHERE a.tipo = 'tape' AND a.perfil = 1
      ORDER BY COALESCE(a.perfil_ordem, -1000000000 - a.id), a.id`
  ).all();
  // 18/10/2026 (rodada Q): INDEXED BY porque o banco chegou a varrer os beats todos aqui (~19 mil
  // linhas por abertura, 341 mil num dia): com estatística velha ele achava a varredura mais barata.
  // Sem o índice (banco que ainda não migrou), cai na mesma consulta sem a ordem do índice.
  const sqlFaixas = (ix) => `SELECT id, title, dur, artist_id FROM tracks${ix} WHERE kind = 'beat' AND ready = 1 AND artist_id = (
       SELECT a.id FROM artists a WHERE a.tipo = 'tape' AND a.perfil = 1
          AND EXISTS (SELECT 1 FROM tracks t${ix} WHERE t.artist_id = a.id AND t.kind = 'beat' AND t.ready = 1)
        ORDER BY COALESCE(a.perfil_ordem, -1000000000 - a.id), a.id LIMIT 1)
      ORDER BY CASE grp WHEN 'res' THEN 0 ELSE 1 END, src_modified DESC LIMIT 40`;
  const pFaixas = d.prepare(sqlFaixas(' INDEXED BY tracks_beat_tape')).all()
    .catch((e) => (/no such index/i.test(String(e && e.message)) ? d.prepare(sqlFaixas('')).all() : Promise.reject(e)));
  const pMeta = lerMetaBruta(d);
  [pTapes, pFaixas, pMeta].forEach((p) => p.catch(() => {}));
  const { results } = await pTapes;
  // beats escondidos no painel (24/10/2026) saem da contagem e do "Ouça a última beat tape"
  let ajuste = {};
  try { const lm = await pMeta; const r = (lm || []).find((x) => x.chave === CHAVE_AJUSTE); ajuste = r ? ajusteDeTexto(r.valor) : {}; } catch (_) { ajuste = {}; }
  for (const r of results || []) { const x = daTape(ajuste, r.id).x.length; if (x) r.n = Math.max(0, r.n - x); }
  const tapes = (results || []).filter((r) => r.n > 0).map((r) => ({
    id: r.id, name: r.name, slug: r.slug, code: r.code,
    capa: r.cover_key || null, n: r.n
  }));
  let faixas = [];
  if (tapes.length) {
    const { results: f } = await pFaixas;
    // a consulta acha a 1ª tape sozinha; confere se é a mesma da lista
    const fora = new Set(daTape(ajuste, tapes[0].id).x);
    faixas = (f || []).filter((x) => x.artist_id === tapes[0].id && !fora.has(x.id)).map((x) => ({ id: x.id, t: x.title, d: x.dur || 0 }));
  }
  const nova = tapes.length ? tapes[0].id : null;
  const meta = await lerMetaPerfil(d, nova, await pMeta);
  const emAlta = meta.emAlta;
  const dados = { tapes, faixas, nova, emAlta: tapes.some((t) => t.id === emAlta) ? emAlta : null, numeros: meta.numeros, musicas: meta.musicas, gravou: meta.gravou };
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
export const STORY_JS = '/assets/story.js?v=2026-10-10a';

const ICONE_FOGO = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c1 4-3 5-3 9a3 3 0 006 0c0-1.5-.6-2.4-1-3 2.5 1 4 3.6 4 6.5A6 6 0 016 14.5C6 9 11 7 12 2z"/></svg>';
function pastilha(t, nova, emAlta) {
  if (t.id === nova) return '<span class="pst nova">Nova</span>';
  if (t.id === emAlta) return `<span class="pst alta">${ICONE_FOGO}Em alta</span>`;
  return '';
}

function grade(tapes, nova = null, emAlta = null) {
  return tapes.map((t, i) => {
    // endereço limpo pro Google; a origem vai no data-de (_lib/origem.js, 08/10/2026)
    const href = `/${t.slug}/${t.code}`;
    const img = t.capa
      ? `<img src="${esc(capaUrl(t.capa, 'm'))}" srcset="${esc(capaUrl(t.capa, 'p'))} 200w, ${esc(capaUrl(t.capa, 'm'))} 480w, ${esc(capaUrl(t.capa))} 1000w" sizes="(max-width:600px) 31vw, (max-width:820px) 24vw, 222px" alt="Capa da beat tape ${esc(t.name)}" width="1000" height="1000"${i < 6 ? '' : ' loading="lazy"'} decoding="async">`
      : `<img class="semcapa" src="/assets/brand/caramujo-v.webp" alt="Beat tape ${esc(t.name)}" width="300" height="300"${i < 6 ? '' : ' loading="lazy"'}>`;
    return `<a class="tape" href="${esc(href)}"${deAttr('perfil')} data-id="${t.id}"><span class="capa">${img}<span class="sobre" aria-hidden="true"><b>${esc(t.name)}</b><i>${beats(t.n)}</i></span>${pastilha(t, nova, emAlta)}</span><span class="leg"><b>${esc(t.name)}</b><i>${beats(t.n)}</i></span></a>`;
  }).join('\n');
}

/* ---------- aba Músicas (05/10/2026, direção A) ----------
   Destaques: fileira de capas grandes que desliza (ordem do Bruno). Recentes: lista em
   caixa, a mais nova primeiro (ou a ordem dele). No fim, a chamada pro portfólio inteiro
   no Spotify. Música com arquivo na pasta do artista ganha o play (toca INTEIRA no mini
   player desde 06/10/2026); sem arquivo, a capa leva pro Spotify/YouTube. */
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const mesAno = (d) => {
  const m = String(d || '').match(/^(\d{4})(?:-(\d{2}))?/);
  if (!m) return '';
  return m[2] && +m[2] >= 1 && +m[2] <= 12 ? `${MESES[+m[2] - 1]} ${m[1]}` : m[1];
};
const SP_PEQUENA = (u) => (/ab67616d0000b273/.test(u) ? u.replace('ab67616d0000b273', 'ab67616d00001e02') : u);
// capa guardada na prateleira (/capa/mus-…); enquanto o painel não guardou, a do próprio Spotify/YouTube
function capaMus(m) {
  if (m.capa) return { src: capaUrl(m.capa, 'p'), grande: capaUrl(m.capa), srcset: `${capaUrl(m.capa, 'p')} 300w, ${capaUrl(m.capa)} 640w` };
  if (m.capaUrl) return { src: SP_PEQUENA(m.capaUrl), grande: m.capaUrl, srcset: SP_PEQUENA(m.capaUrl) !== m.capaUrl ? `${SP_PEQUENA(m.capaUrl)} 300w, ${m.capaUrl} 640w` : '' };
  return { src: '/assets/brand/caramujo-v.webp', grande: SELO_GRANDE, srcset: '', sem: true };
}
const linkMus = (m) => m.spotify || m.youtube;
const temAudio = (m) => !!m.faixa;

function redesMus(m) {
  return `<span class="mx-redes">${m.spotify ? `<a href="${esc(m.spotify)}" target="_blank" rel="noopener" aria-label="Ouvir ${esc(m.nome)} no Spotify" title="Spotify" data-rede="musica-spotify">${ICONES.spotify}</a>` : ''}${m.youtube ? `<a href="${esc(m.youtube)}" target="_blank" rel="noopener" aria-label="Ver ${esc(m.nome)} no YouTube" title="YouTube" data-rede="musica-youtube">${ICONES.youtube}</a>` : ''}</span>`;
}
const playMus = (m, k) => `<button class="mx-play" type="button" data-m="${k}" data-nome="${esc(m.nome)}" aria-label="Ouvir ${esc(m.nome)}">${ICONE_TOCA}${ICONE_PAUSA}</button>`;

function cardDestaque(m, k) {
  const c = capaMus(m);
  const img = `<img class="mx-img${c.sem ? ' sem' : ''}" src="${esc(c.src)}"${c.srcset ? ` srcset="${esc(c.srcset)}" sizes="(max-width:600px) 76vw, 280px"` : ''} alt="Capa de ${esc(m.nome)}" width="640" height="640"${k < 2 ? '' : ' loading="lazy"'} decoding="async">`;
  const capa = temAudio(m)
    ? `<div class="mx-c">${img}${playMus(m, k)}</div>`
    : `<a class="mx-c" href="${esc(linkMus(m))}" target="_blank" rel="noopener" data-rede="${m.spotify ? 'musica-spotify' : 'musica-youtube'}" aria-label="Ouvir ${esc(m.nome)} ${m.spotify ? 'no Spotify' : 'no YouTube'}">${img}</a>`;
  return `<article class="mx-card" data-m="${k}">${capa}<div class="mx-txt"><div class="mx-info"><b class="mx-n">${esc(m.nome)}</b>${m.artistas ? `<span class="mx-a">${esc(m.artistas)}</span>` : ''}</div>${redesMus(m)}</div>${temAudio(m) ? '<span class="mx-barra" aria-hidden="true"><i></i></span>' : ''}</article>`;
}

function linhaRecente(m, k, vaga) {
  const c = capaMus(m);
  const quando = mesAno(m.data);
  return `<li class="mx-row" data-m="${k}"><img class="mx-mini${c.sem ? ' sem' : ''}" src="${esc(c.src)}" alt="" width="52" height="52" loading="lazy" decoding="async"><div class="mx-info"><b class="mx-n">${esc(m.nome)}</b>${m.artistas ? `<span class="mx-a">${esc(m.artistas)}</span>` : ''}</div>${quando ? `<time class="mx-data" datetime="${esc(m.data)}">${quando}</time>` : ''}${redesMus(m)}${temAudio(m) ? playMus(m, k) : vaga ? '<span class="mx-vaga" aria-hidden="true"></span>' : ''}</li>`;
}

// Linha "Quem já gravou" no fim da aba Músicas (16/10/2026, rodada K; entrou no lugar do
// "Ouvir o portfólio completo", que o Bruno tirou: a página de artistas faz o mesmo papel).
// Só aparece com a página no ar (ou na prévia de quem está logado).
export function linhaGravou(gv, origem = 'perfil-gravou') {
  if (!gv || !gv.artistas || !gv.artistas.length) return '';
  // Opção D (17/10/2026, rodada N): fileira de fotos grandes que desliza (até 20 artistas desde a rodada O); cada foto abre o artista na
  // página e o último cartão é o "Ver todos" (como na opção C). O próprio @rideblan33 fica fora da
  // fileira (a página é dele); quem tem foto vem antes.
  const lista = gv.artistas.filter((a) => !a.eu);
  const mostra = lista.filter((a) => a.foto).concat(lista.filter((a) => !a.foto)).slice(0, 20);   // até 20 (pedido do Bruno, rodada O)
  const resto = gv.artistas.length - mostra.length;
  const de = deAttr(origem) + ` data-de-musicas="${DE_FIM.musicas.gravou}" data-de-tapes="${DE_FIM.tapes.gravou}"`;
  return `<section class="qg-ent" aria-labelledby="qgEntT"><div class="qg-ent-cab"><h3 id="qgEntT">Quem já gravou</h3><span class="mx-direita"><a class="qg-ver" href="/rideblan33/artistas"${de} data-rede="aba-gravou">Ver todos ›</a><span class="mx-setas" hidden><button type="button" id="qgAnt" aria-label="Artistas anteriores"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg></button><button type="button" id="qgProx" aria-label="Mais artistas"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button></span></span></div>` +
    `<div class="qg-tr-w"><div class="qg-tr" id="qgTr">${mostra.map((a) => `<a class="qg-c" href="/rideblan33/artistas#${esc(a.slug)}"${de} data-rede="aba-gravou-artista">${fotoArtista(a)}<b>${esc(a.nome)}</b></a>`).join('')}` +
    `<a class="qg-c qg-c-fim" href="/rideblan33/artistas"${de} data-rede="aba-gravou" aria-label="Ver todos os ${gv.artistas.length} artistas"><span class="qg-fim">${mosaicoGravou(lista, mostra)}<span class="qg-veu">${resto > 0 ? `+${resto}` : 'Todos'}</span></span><b>Ver todos</b><i class="qg-n">${gv.artistas.length} artistas</i></a></div></div></section>`;
}

// rodada R (18/10/2026): o "Ver todos" ganhou a cara do "Portfólio completo" das tapes: as fotos de
// quem ainda não apareceu na fileira, 4 numa grade redonda, com o "+N" por cima
export function mosaicoGravou(lista, mostra) {
  const fora = lista.filter((a) => a.foto && !mostra.includes(a));
  const fotos = fora.concat(mostra.filter((a) => a.foto).reverse()).slice(0, 4);
  return `<span class="qg-mos" aria-hidden="true">${fotos.map((a) => `<img src="${esc(imgPequena(a.foto))}" alt="" loading="lazy" decoding="async" width="80" height="80">`).join('')}</span>`;
}

// A lista Recentes saiu do perfil (teste de 17/10/2026, confirmado em 25/10/2026: a chave
// RECENTES_NO_PERFIL foi apagada). A página de artistas faz o papel de "ver tudo"; os dados seguem
// no painel. Sem nenhum destaque, as recentes aparecem (senão a aba fica vazia).
// (globalThis.__CR_RECENTES = true só nos testes antigos, que conferem o desenho da lista)
function separarNaPagina(mus) {
  const { destaques, recentes } = separar(mus);
  return globalThis.__CR_RECENTES === true || !destaques.length ? { destaques, recentes } : { destaques, recentes: [] };
}

export function abaMusicas(mus, { previa = false } = {}) {
  const { destaques, recentes } = separarNaPagina(mus);
  const n = destaques.length + recentes.length;
  let h = '';
  if (previa && !mus.noAr) h += '<p class="mx-previa">Prévia: só você vê esta aba, porque está logado no painel. Ela aparece pra todo mundo quando você ligar "No ar" em Músicas do perfil.</p>';
  h += `<h2 class="so-leitor">Músicas produzidas pelo @rideblan33</h2>`;
  if (destaques.length) {
    h += `<section class="mx-sec" aria-labelledby="mxDest"><div class="cab"><h3 id="mxDest">Destaques</h3><span class="mx-direita"><span>${destaques.length} ${destaques.length === 1 ? 'música' : 'músicas'}</span><span class="mx-setas" hidden><button type="button" id="mxAnt" aria-label="Destaques anteriores"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg></button><button type="button" id="mxProx" aria-label="Mais destaques"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button></span></span></div>` +
      `<div class="mx-trilho" id="mxTrilho">${destaques.map((m, k) => cardDestaque(m, k)).join('')}</div></section>`;
  }
  const vaga = recentes.some(temAudio);
  // 26/10/2026: o Quem já gravou e o "Quer um som assim?" saíram daqui e moram no fim do perfil,
  // embaixo das duas abas (fimPerfil)
  if (recentes.length) {
    h += `<section class="mx-sec" aria-labelledby="mxRec"><div class="cab"><h3 id="mxRec">${destaques.length ? 'Recentes' : 'Músicas'}</h3><span>mais novas primeiro</span></div>` +
      `<ul class="mx-lista">${recentes.map((m, k) => linhaRecente(m, destaques.length + k, vaga)).join('')}</ul></section>`;
  }
  return { html: h, n };
}

// Fim do perfil (26/10/2026, pedido do Bruno): o Quem já gravou e o "Quer um som assim?" valem pras duas
// abas. Antes moravam só no fim da aba Músicas; quem abria em Beat tapes (vindo do cartão da vitrine, de
// uma tape, do Google) chegava no fim da grade sem eles. A origem dos cliques segue a aba aberta
// (data-de-musicas / data-de-tapes; o script do perfil troca o data-de quando a aba muda).
// 4b (11/10/2026): quem ouviu e quer um som assim vai direto pros serviços da vitrine.
// 12/10/2026: opção D (cartão com a foto do estúdio). 25/10/2026 (de-para final, item 7, opção B): as
// fotos do estúdio deslizam no fundo com pontinhos; o texto deixa o dedo passar pra galeria.
export const DE_FIM = { musicas: { som: 'perfil-musicas', gravou: 'perfil-gravou' }, tapes: { som: 'perfil-tapes', gravou: 'perfil-gravou-tapes' } };
export function fimPerfil(gravou, aba = 'musicas') {
  const de = DE_FIM[aba] || DE_FIM.musicas;
  const deSom = ` data-de="${de.som}" data-de-musicas="${DE_FIM.musicas.som}" data-de-tapes="${DE_FIM.tapes.som}"`;
  const som = `<div class="mx-som"><div class="mx-gal" id="mxGal">${FOTOS_ESTUDIO.map(([f, t], i) => `<img src="${f}" alt="${t}" width="768" height="960"${i ? ' loading="lazy"' : ''}>`).join('')}</div><span class="mx-pts" aria-hidden="true">${FOTOS_ESTUDIO.map((_, i) => `<i${i ? '' : ' class="on"'}></i>`).join('')}</span><p>Quer um som assim?</p><div class="mx-bts"><a class="cheio" href="/#services"${deSom} data-rede="servico-mix">Mix &amp; Master</a><a href="/#services"${deSom} data-rede="servico-beat">Beat personalizado</a></div></div>`;
  return `<section class="fim-perfil" id="fimPerfil" aria-label="Quem já gravou e serviços">${linhaGravou(gravou, de.gravou)}${som}</section>`;
}

// O que o mini player precisa pra tocar as músicas (inteiras), na ordem da página:
// destaques e depois as recentes
export function musicasDoPerfil(mus) {
  const { destaques, recentes } = separarNaPagina(mus);
  return destaques.concat(recentes).map((m, k) => (temAudio(m) ? {
    k, n: m.nome, a: m.artistas || '', f: m.faixa, url: linkMus(m), sp: !!m.spotify,
    capa: capaMus(m).src, arte: capaMus(m).grande
  } : null)).filter(Boolean);
}

// Pro Google: cada música é uma gravação produzida pelo @rideblan33 (a mesma pessoa do topo)
function jsonMusicas(mus) {
  const { destaques, recentes } = separarNaPagina(mus);
  const todas = destaques.concat(recentes);
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Músicas produzidas pelo @rideblan33',
    numberOfItems: todas.length,
    itemListElement: todas.map((m, i) => {
      const c = capaMus(m);
      const item = {
        '@type': 'MusicRecording', name: m.nome, url: linkMus(m),
        producer: { '@id': SITE + '/rideblan33#pessoa' }
      };
      if (m.artistas) item.byArtist = m.artistas.split(/\s*,\s*/).filter(Boolean).map((a) => ({ '@type': 'MusicGroup', name: a }));
      if (m.data) item.datePublished = m.data;
      // capa guardada: pro Google vai o endereço do próprio site (/capa/<id>), não o do R2
      if (!c.sem) item.image = m.capa ? SITE + '/capa/' + m.capa : c.grande.startsWith('/') ? SITE + c.grande : c.grande;
      const mesmo = [m.spotify, m.youtube].filter(Boolean);
      if (mesmo.length > 1) item.sameAs = mesmo;
      return { '@type': 'ListItem', position: i + 1, item };
    })
  };
}

// Ícones da aba do navegador: o padrão de TODAS as páginas do site (selo em SVG,
// PNG de 180 pro iPhone). Página nova usa esse mesmo bloco.
// ícones: um lugar só, em _lib/icones.js (04/10/2026); o nome FAVICON fica pra quem já usa
export const FAVICON = ICONES_ABA;

// (a barra fixa com a foto e o @, desligada desde 26/09/2026, saiu do código em 25/10/2026)
// aba: em que aba o bloco preto abre ('musicas' ou 'tapes'; vem da origem, _lib/musicas.js).
// previa: a aba Músicas fora do ar aparece mesmo assim (quem está logado no painel).
// previaGravou: a linha "Quem já gravou" aparece mesmo fora do ar (quem está logado no painel).
export function paginaPerfil(dados, { url, aba = 'musicas', previa = false, previaGravou = false } = {}) {
  const tapes = Array.isArray(dados) ? dados : dados.tapes;
  const faixas = Array.isArray(dados) ? [] : (dados.faixas || []);
  const idNova = !Array.isArray(dados) && dados.nova != null ? dados.nova : (tapes.length ? tapes[0].id : null);
  const idEmAlta = Array.isArray(dados) ? null : (dados.emAlta ?? null);
  const nova = tapes[0] || null;
  const tocador = nova && faixas.length ? {
    tape: { id: nova.id, name: nova.name, url: `/${nova.slug}/${nova.code}`, capa: nova.capa ? capaUrl(nova.capa, 'p') : '/assets/brand/caramujo-v.webp',
      // a tela de bloqueio usa a arte inteira, igual à página da tape
      arte: nova.capa ? capaUrl(nova.capa) : SELO_GRANDE },
    faixas
  } : null;
  // aba Músicas (05/10/2026): só com música na lista e com o "No ar" ligado (ou na prévia)
  const mus = !Array.isArray(dados) && dados.musicas && Array.isArray(dados.musicas.lista) && dados.musicas.lista.length ? dados.musicas : null;
  const comMusicas = !!(mus && (mus.noAr || previa));
  const gvMeta = !Array.isArray(dados) && dados.gravou ? dados.gravou : null;
  const gravou = gvMeta && (gvMeta.noAr || previaGravou) ? montarGravou(gvMeta) : null;
  const abaMus = comMusicas ? abaMusicas(mus, { previa }) : null;
  const tocaveis = comMusicas ? musicasDoPerfil(mus) : [];
  const abaIni = comMusicas && aba === 'tapes' ? 'tapes' : 'musicas';
  const tocaAlgo = !!(tocador || tocaveis.length);
  // o botão do topo muda com a aba (06/10/2026): em Músicas toca o último lançamento (o 1º
  // destaque e segue em ordem até as recentes); em Beat tapes, a última beat tape
  const ROT_TAPE = 'Ouça a última beat tape', ROT_MUS = 'Ouça o último lançamento';
  const rotOuca = tocaveis.length && (abaIni === 'musicas' || !tocador) ? ROT_MUS : ROT_TAPE;
  const titulo = '@rideblan33 · Portfólio';
  // com as músicas no ar, o Google lê os artistas que ele produziu (os 3 primeiros da lista)
  const parceiros = comMusicas ? [...new Set(mus.lista.flatMap((m) => String(m.artistas || '').split(/\s*,\s*/)).filter(Boolean))].slice(0, 3) : [];
  const descricaoGoogle = parceiros.length
    ? `Portfólio do @rideblan33, produtor e beatmaker de rap em São Carlos, SP. Produções com ${parceiros.join(', ')}, ${tapes.length} beat tapes pra ouvir e beats exclusivos na Caramujo Records.`
    : `Portfólio do @rideblan33, produtor e beatmaker de rap em São Carlos, SP. ${tapes.length} beat tapes pra ouvir, beats exclusivos e produção completa na Caramujo Records.`;
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
<link rel="preload" as="image" href="/assets/perfil/rideblan33.webp" imagesrcset="/assets/perfil/rideblan33-432.webp 432w, /assets/perfil/rideblan33-480.webp 480w, /assets/perfil/rideblan33-648.webp 648w, /assets/perfil/rideblan33.webp 720w" imagesizes="(max-width:820px) 216px, 354px" fetchpriority="high">
${CAPA_VOLTA}
<link rel="preload" as="font" type="font/woff2" href="/assets/fonts/cormorant-garamond-latin-600-normal.woff2" crossorigin>
<script type="application/ld+json">${jsonSeguro(pessoa)}</script>
<script type="application/ld+json">${jsonSeguro(lista)}</script>
${comMusicas ? `<script type="application/ld+json">${jsonSeguro(jsonMusicas(mus))}</script>\n` : ''}<style>
@font-face{font-family:'Cormorant Garamond';font-weight:500;font-style:italic;font-display:swap;src:url(/assets/fonts/cormorant-garamond-latin-500-italic.woff2) format('woff2')}
@font-face{font-family:'Cormorant Garamond';font-weight:600;font-style:normal;font-display:swap;src:url(/assets/fonts/cormorant-garamond-latin-600-normal.woff2) format('woff2')}
@font-face{font-family:'Schibsted Grotesk';font-weight:400 900;font-display:swap;src:url(/assets/fonts/schibsted-grotesk-latin-wght-normal.woff2) format('woff2')}
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
/* rodada Q (18/10/2026): o topo é o do site inteiro (topo.js, TOPO_PAGINA_CSS); o "Ouça" desceu pro bloco */
.terra{padding-top:44px}
.ouca-w{margin-top:22px}
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
.palco{position:relative;z-index:1;max-width:1180px;margin:0 auto;min-height:520px;display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);align-items:end;border:1px solid var(--wire);background:linear-gradient(180deg,var(--dark),var(--deep))}
.texto{padding:56px 0 56px 56px;align-self:center}
.kicker{font:700 11px/1 var(--sans);letter-spacing:.28em;text-transform:uppercase;color:var(--label);margin:0 0 22px}
h1{font:600 clamp(56px,8.6vw,124px)/.9 var(--serif);color:var(--cream);margin:0;letter-spacing:-.01em;overflow-wrap:anywhere}
.bio{font:italic 500 clamp(24px,2.4vw,32px)/1.18 var(--serif);margin:22px 0 0}
.numeros{font:400 13px/1.6 var(--mono);color:var(--read);margin:26px 0 0;letter-spacing:.02em}
.numeros b{font-weight:400;color:var(--cream)}
.numeros span{white-space:nowrap}
.botoes{display:flex;flex-wrap:wrap;gap:12px;margin-top:32px}
.botoes a,.botoes button{display:grid;place-items:center;width:48px;height:48px;border:1px solid var(--wire);border-radius:50%;color:var(--cream);background:rgba(20,17,13,.55);transition:border-color .2s,color .2s}
.botoes a:hover,.botoes button:hover{border-color:var(--fire);color:var(--fire)}
/* 5º botão (27/09/2026): compartilhar o perfil. Aro claro pra não parecer mais uma rede */
.botoes .comp{padding:0;font:inherit;cursor:pointer;border-color:rgba(242,236,223,.55);background:rgba(242,236,223,.06)}
.aviso{position:fixed;left:50%;bottom:calc(90px + env(safe-area-inset-bottom,0px));transform:translate(-50%,8px);z-index:9500;max-width:calc(100% - 32px);padding:11px 16px;background:#1e1a12;border:1px solid var(--clay);font:400 12.5px/1.4 var(--mono);opacity:0;pointer-events:none;transition:opacity .2s,transform .2s}
.aviso.on{opacity:1;transform:translate(-50%,0)}
.botoes svg{width:20px;height:20px}
.foto{position:relative;align-self:stretch;min-height:520px}
.num33{position:absolute;right:-2%;top:50%;transform:translateY(-54%);font:600 clamp(260px,34vw,470px)/1 var(--serif);color:transparent;-webkit-text-stroke:1.5px rgba(185,143,94,.55);letter-spacing:-.04em;user-select:none;pointer-events:none}
.foto img{position:absolute;bottom:-1px;left:50%;transform:translateX(-38%);height:105%;max-height:590px;width:auto;filter:drop-shadow(0 18px 30px rgba(0,0,0,.55))}
.preto{background:var(--preto);color:var(--branco);font-family:var(--grot);padding:64px 16px 80px}
.cab{max-width:1180px;margin:0 auto 22px;display:flex;align-items:baseline;justify-content:space-between;gap:16px}
.cab h2{margin:0;font:700 13px/1 var(--grot);letter-spacing:.2em;text-transform:uppercase}
.cab span{font:500 13px/1 var(--grot);color:var(--meta);font-variant-numeric:tabular-nums}
.moldura{max-width:1180px;margin:0 auto;background:var(--folha);border:1px solid var(--div);padding:14px}
.grade{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px}
.tape{min-width:0}
.capa{position:relative;display:block;aspect-ratio:1;overflow:hidden;background:#0a0a0a}
.capa img{display:block;width:100%;height:100%;object-fit:cover;transition:transform .35s ease,filter .35s ease}
.capa img.semcapa{object-fit:contain;padding:22%;background:var(--preto)}
.sobre{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:16px;text-align:center;background:rgba(0,0,0,.62);opacity:0;transition:opacity .25s ease}
.sobre b{font:700 17px/1.15 var(--grot);letter-spacing:-.01em;text-wrap:balance;overflow-wrap:anywhere}
.sobre i{font:500 13px/1 var(--grot);font-style:normal;color:var(--apoio);font-variant-numeric:tabular-nums}
.leg{display:none}
/* pastilhas NOVA e EM ALTA (27/09/2026): o mesmo desenho do DISPONÍVEL das tapes */
.pst{position:absolute;left:8px;top:8px;z-index:2;display:inline-flex;align-items:center;gap:5px;padding:5px 8px;border-radius:3px;font:700 10.5px/1 var(--grot);letter-spacing:.12em;text-transform:uppercase;white-space:nowrap;pointer-events:none}
.pst.nova{background:#E4DAC7;color:#000}
.pst.alta{background:rgba(0,0,0,.55);box-shadow:inset 0 0 0 1px rgba(255,255,255,.75);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.pst svg{width:10px;height:10px;flex:none}
@media (hover:hover){.tape:hover .sobre,.tape:focus-visible .sobre{opacity:1}.tape:hover img:not(.semcapa){transform:scale(1.035);filter:saturate(.85)}}
@media (hover:none){.sobre{display:none}.leg{display:flex;flex-direction:column;gap:5px;padding-top:10px}.leg b{font:500 15px/1.2 var(--grot);overflow-wrap:anywhere}.leg i{font:500 13px/1 var(--grot);font-style:normal;color:var(--meta)}}
/* abas Músicas | Beat tapes e a aba Músicas (05/10/2026, direção A) */
.abas{max-width:1180px;margin:0 auto 34px;display:flex;gap:30px;border-bottom:1px solid var(--div)}
.abas button{background:none;border:0;padding:0 0 14px;margin:0 0 -1px;font:700 13px/1 var(--grot);letter-spacing:.2em;text-transform:uppercase;color:var(--meta);border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap}
.abas button[aria-selected="true"]{color:var(--branco);border-bottom-color:var(--branco)}
.abas button i{font-style:normal;font-weight:500;letter-spacing:0;color:var(--meta);margin-left:6px;font-variant-numeric:tabular-nums}
@media (hover:hover){.abas button:hover{color:var(--branco)}}
.so-leitor{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.mx-previa{max-width:1180px;margin:-12px auto 28px;padding:11px 14px;border:1px dashed #3a3a3a;font:400 12.5px/1.5 var(--mono);color:var(--apoio)}
.mx-sec{max-width:1180px;margin:0 auto 46px}
.mx-sec:last-child{margin-bottom:0}
.cab h3{margin:0;font:700 13px/1 var(--grot);letter-spacing:.2em;text-transform:uppercase}
.mx-direita{display:flex;align-items:center;gap:14px}
.mx-setas{display:flex;gap:6px}
.mx-setas[hidden]{display:none}
.mx-setas button{display:grid;place-items:center;width:34px;height:34px;padding:0;border:1px solid #2a2a2a;border-radius:50%;background:none;color:var(--branco);cursor:pointer;transition:border-color .2s,opacity .2s}
.mx-setas button:disabled{opacity:.3;cursor:default}
.mx-setas svg{width:16px;height:16px}
@media (hover:hover){.mx-setas button:not(:disabled):hover{border-color:var(--branco)}}
@media (hover:none){.mx-setas{display:none}}
.mx-trilho{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding-bottom:4px}
.mx-trilho::-webkit-scrollbar{display:none}
.mx-card{flex:0 0 calc((100% - 48px)/4);min-width:0;scroll-snap-align:start}
.mx-c{position:relative;display:block;aspect-ratio:1;overflow:hidden;border:1px solid var(--div);background:#0a0a0a}
.mx-img{display:block;width:100%;height:100%;object-fit:cover}
.mx-img.sem,.mx-mini.sem{object-fit:contain;padding:22%;background:var(--preto)}
a.mx-c .mx-img{transition:transform .35s ease}
@media (hover:hover){a.mx-c:hover .mx-img{transform:scale(1.035)}}
.mx-play{display:grid;place-items:center;flex:none;width:44px;height:44px;padding:0;border:0;border-radius:50%;background:var(--branco);color:var(--preto);cursor:pointer}
.mx-play svg{width:16px;height:16px}
.mx-play .i-pausa,.mx-play.toca .i-toca{display:none}
.mx-play.toca .i-pausa{display:block}
.mx-c .mx-play{position:absolute;right:12px;bottom:12px;box-shadow:0 8px 20px rgba(0,0,0,.5)}
.mx-txt{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-top:12px}
.mx-info{min-width:0}
.mx-n{display:block;font:700 16px/1.25 var(--grot);color:var(--branco);overflow-wrap:anywhere}
.mx-a{display:block;margin-top:3px;font:500 13px/1.35 var(--grot);color:var(--meta)}
.mx-redes{display:inline-flex;gap:6px;flex:none}
.mx-redes a{display:grid;place-items:center;width:36px;height:36px;border:1px solid #2a2a2a;border-radius:50%;color:#cfcfcf;transition:border-color .2s,color .2s}
.mx-redes svg{width:17px;height:17px}
@media (hover:hover){.mx-redes a:hover{border-color:var(--branco);color:var(--branco)}}
.mx-barra{display:block;height:3px;margin-top:12px;background:#2a2a2a;visibility:hidden}
.mx-barra i{display:block;width:0;height:100%;background:var(--branco)}
.mx-card.atual .mx-barra{visibility:visible}
.mx-lista{list-style:none;margin:0;padding:0;background:var(--folha);border:1px solid var(--div)}
.mx-row{display:flex;align-items:center;gap:14px;padding:12px 14px;border-bottom:1px solid var(--div)}
.mx-row:last-child{border-bottom:0}
.mx-mini{display:block;flex:none;width:52px;height:52px;object-fit:cover;background:#0a0a0a}
.mx-row .mx-info{flex:1}
.mx-row .mx-n{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mx-row .mx-a{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mx-row.atual .mx-n{text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:4px}
.mx-data{margin-right:6px;font:400 12px/1 var(--mono);color:#6a6a6a;white-space:nowrap}
.mx-row .mx-play,.mx-vaga{width:38px;height:38px;flex:none}
/* a chamada pro portfólio inteiro no Spotify, no fim das recentes */
.mx-som{position:relative;margin-top:26px;overflow:hidden;border-radius:16px;padding:150px 18px 18px;background:#000}
.mx-gal{position:absolute;inset:0;display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;overscroll-behavior-x:contain}
.mx-gal::-webkit-scrollbar{display:none}
.mx-gal img{flex:0 0 100%;width:100%;height:100%;object-fit:cover;object-position:center 30%;scroll-snap-align:start}
.mx-som::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 0%,rgba(0,0,0,.85) 62%,#000 100%);pointer-events:none}
.mx-pts{position:absolute;top:14px;right:14px;z-index:2;display:flex;gap:5px;pointer-events:none}
.mx-pts i{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.4);transition:background .2s}
.mx-pts i.on{background:#fff}
.mx-som p,.mx-som .mx-bts{position:relative;z-index:2;pointer-events:none}
.mx-som p{font:800 28px/1.1 var(--grot);color:var(--branco);margin:0 0 16px;letter-spacing:-.01em}
.mx-som .mx-bts{display:flex;flex-wrap:wrap;gap:10px}
.mx-som .mx-bts a{pointer-events:auto}
.mx-som a{flex:1 1 150px;display:flex;align-items:center;justify-content:center;min-height:48px;padding:0 18px;border:1px solid rgba(255,255,255,.5);border-radius:999px;background:rgba(0,0,0,.35);font:700 12px/1.2 var(--grot);letter-spacing:.16em;text-transform:uppercase;color:var(--branco);text-align:center;transition:border-color .2s,background .2s}
.mx-som a.cheio{background:var(--branco);border-color:var(--branco);color:#000}
@media (hover:hover){.mx-som a:hover{border-color:var(--branco)}.mx-som a.cheio:hover{background:#d9d9d9;border-color:#d9d9d9}}
@media (min-width:900px){.mx-som{padding-top:190px}}
.fim-perfil{max-width:1180px;margin:46px auto 0}
.qg-ent{margin-top:22px;padding-top:18px;border-top:1px solid var(--div);color:var(--branco)}
.qg-ent-cab{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:14px}
.qg-ent-cab h3{margin:0;font:700 20px/1.2 var(--grot)}
.qg-ver{font:600 13.5px var(--grot);color:var(--branco);white-space:nowrap;border-bottom:1px solid rgba(255,255,255,.4);padding-bottom:2px;transition:border-color .2s}
.qg-tr{display:flex;gap:14px;overflow-x:auto;scrollbar-width:none;padding-bottom:4px;margin:0 -2px;-webkit-overflow-scrolling:touch}
.qg-tr::-webkit-scrollbar{display:none}
/* rodada P (18/10/2026): dá pra ver que desliza. Celular: as fotos somem num degradê na borda direita
   (some quando chega no fim) e a fileira dá um empurrãozinho quando aparece. Computador: setas no título,
   iguais às dos Destaques. */
.qg-tr-w{position:relative}
.qg-tr-w::after{content:'';position:absolute;top:0;right:-2px;bottom:4px;width:56px;pointer-events:none;background:linear-gradient(90deg,rgba(0,0,0,0),var(--preto));transition:opacity .25s}
.qg-tr-w.fim::after{opacity:0}
.qg-ent .mx-direita{display:flex;align-items:center;gap:14px}
.qg-c{flex:none;width:96px;text-align:center;color:var(--branco)}
.qg-c img,.qg-c .qg-ini,.qg-fim{width:96px;height:96px;border-radius:50%;object-fit:cover;display:flex}
.qg-c .qg-ini{align-items:center;justify-content:center;background:#1c1c1c;color:var(--apoio);font:800 22px var(--grot)}
.qg-c b{display:block;margin-top:8px;font:600 12.5px var(--grot);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.qg-fim{position:relative;overflow:hidden;background:#000;border:1px solid #2c2c2c}
.qg-mos{position:absolute;inset:0;display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:1fr;gap:2px}
.qg-c .qg-mos img{width:100%;height:100%;border-radius:0;object-fit:cover;display:block}
.qg-veu{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.58);color:#fff;font:800 22px/1 var(--grot);letter-spacing:-.01em;transition:background .2s}
.qg-c .qg-n{display:block;font-style:normal;font-size:11px;color:#9a9a9a;margin-top:2px}
@media (min-width:900px){.qg-c{width:128px}.qg-c img,.qg-c .qg-ini,.qg-fim{width:128px;height:128px}.qg-tr{gap:22px}}
@media (hover:hover){.qg-ver:hover{border-bottom-color:var(--branco)}.qg-c:hover img{opacity:.85}.qg-c:hover .qg-veu{background:rgba(0,0,0,.38)}}
/* rodapé único (rodada R): _lib/rodape.js, o mesmo da vitrine em todas as páginas */
${RODAPE_CSS}
@media (max-width:1100px){.grade{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media (max-width:820px){
  .terra{padding-top:20px}
  .ouca-w{display:flex;justify-content:center}
  .ouca{height:38px;padding:0 13px 0 11px;font-size:9.5px;letter-spacing:.13em;gap:8px}
  .terra{padding-bottom:40px}
  .palco{grid-template-columns:1fr;min-height:0;margin-top:44px}
  .foto{order:-1;min-height:330px}
  /* a foto passa só 30px da moldura: nunca encosta no cabeçalho */
  .foto img{height:360px;max-height:none;bottom:-1px;transform:translateX(-50%)}
  .num33{font-size:min(84vw,420px);right:auto;left:50%;transform:translate(-50%,-58%)}
  .texto{padding:28px 20px 32px;text-align:center}
  .kicker{margin-bottom:16px}.bio{margin-top:16px}
  .botoes{justify-content:center;margin-top:26px}
  .preto{padding:40px 16px 56px}
  .moldura{padding:0;background:none;border:0}
  .grade{gap:20px 10px}
  .sobre{display:none}
  .leg{display:flex;flex-direction:column;gap:5px;padding-top:10px}
  .leg b{font:500 15px/1.2 var(--grot);overflow-wrap:anywhere}
  .leg i{font:500 13px/1 var(--grot);font-style:normal;color:var(--meta)}
}
/* celular estreito (06/10/2026): "Ouça o último lançamento" cabe do lado do logo em 360px */
@media (max-width:380px){.ouca-w .ouca{letter-spacing:.08em;padding:0 14px 0 12px;gap:8px}}
/* celular: 3 capas por linha (26/09/2026) */
@media (max-width:600px){
  .abas{gap:26px;margin-bottom:28px}
  .abas button{font-size:12px;letter-spacing:.16em}
  .mx-card{flex-basis:76%}
  .mx-data{display:none}
  .mx-row{gap:11px;padding:11px 10px}
  .mx-redes a{width:32px;height:32px}
  .grade{grid-template-columns:repeat(3,minmax(0,1fr));gap:18px 8px}
  .leg{gap:4px;padding-top:8px}
  .leg b{font-size:12.5px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
  .leg i{font-size:11.5px}
  .pst{left:6px;top:6px;padding:4px 6px;font-size:9px;gap:4px}
  .pst svg{width:9px;height:9px}
}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
${TOPO_PAGINA_CSS}
</style>
</head>
<body>
${topo('perfil', '', null, { ativo: 'estudio' })}
<header class="terra">
  <section class="palco">
    <div class="texto">
      <h1>@rideblan33</h1>
      <p class="bio">Produtor &amp; beatmaker.<br>33 memórias distantes.</p>
      <p class="numeros"><span><b>${num.artistas}+</b> artistas</span> · <span><b>${num.faixas}+</b> faixas</span> · <span><b>${curto(num.streams)}</b> de streams</span></p>
      <!-- 26/10/2026 (rodada W, corte 4): o botão do Caramujo saiu; os beats seguem no Beats do topo, no logo e no "Quer um som assim?" -->
      <div class="botoes">
        <a href="${REDES.spotify}" target="_blank" rel="noopener" aria-label="Spotify" title="Spotify" data-rede="spotify">${ICONES.spotify}</a>
        <a href="${REDES.youtube}" target="_blank" rel="noopener" aria-label="YouTube" title="YouTube" data-rede="youtube">${ICONES.youtube}</a>
        <a href="${REDES.instagram}" target="_blank" rel="noopener" aria-label="Instagram" title="Instagram" data-rede="instagram">${ICONES.instagram}</a>
        <button class="comp" id="compartilhar" type="button" aria-label="Compartilhar perfil" title="Compartilhar">${ICONES.compartilhar}</button>
      </div>
      ${tocaAlgo ? `<div class="ouca-w"><button class="ouca" id="ouca" type="button" aria-pressed="false" aria-label="${rotOuca}">${ICONE_TOCA}${ICONE_PAUSA}<span>${rotOuca}</span></button></div>` : ''}
    </div>
    <div class="foto" aria-hidden="true">
      <span class="num33">33</span>
      <img src="/assets/perfil/rideblan33.webp" srcset="/assets/perfil/rideblan33-432.webp 432w, /assets/perfil/rideblan33-480.webp 480w, /assets/perfil/rideblan33-648.webp 648w, /assets/perfil/rideblan33.webp 720w" sizes="(max-width:820px) 216px, 354px" alt="" width="720" height="1200" fetchpriority="high">
    </div>
  </section>
</header>
${tocaAlgo ? `<div class="tocando" id="tocando" hidden>
  <a class="t-link" id="tLink"${deAttr('perfil')} href="${esc(tocador ? tocador.tape.url : tocaveis[0].url)}" aria-label="${tocador ? `Abrir a tape ${esc(tocador.tape.name)}` : `Abrir ${esc(tocaveis[0].n)} no Spotify`}"></a>
  <span class="t-capa"><img src="${esc(tocador ? tocador.tape.capa : tocaveis[0].capa)}" alt="" width="44" height="44"></span>
  <div class="t-txt"><b id="tNome">—</b><small id="tSub">${esc(tocador ? tocador.tape.name : '')}</small></div>
  <button id="tAnt" type="button" aria-label="Beat anterior"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5v14h2.6V5zM19 5l-9 7 9 7z"/></svg></button>
  <button class="t-play" id="tPlay" type="button" aria-label="Pausar">${ICONE_TOCA}${ICONE_PAUSA}</button>
  <button id="tProx" type="button" aria-label="Próximo beat"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17 5v14h-2.6V5zM5 5l9 7-9 7z"/></svg></button>
  <span class="barra"><i id="tBarra"></i></span>
</div>` : ''}
${tocador ? `<script type="application/json" id="tocadorDados">${jsonSeguro(tocador)}</script>` : ''}
${tocaveis.length ? `<script type="application/json" id="musicasDados">${jsonSeguro({ lista: tocaveis, rotulos: { tape: ROT_TAPE, mus: ROT_MUS } })}</script>` : ''}

<script type="application/json" id="compDados">${jsonSeguro({ total: tapes.length, capas: tapes.slice(0, 9).map((t) => (t.capa ? '/capa/' + t.capa + '?m' : null)) })}</script>
<div class="aviso" id="aviso" role="status" aria-live="polite"></div>

<main class="preto" id="tapes">
${comMusicas ? `  <div class="abas" role="tablist" aria-label="Portfólio do @rideblan33">
    <button type="button" role="tab" id="abaMusicas" data-aba="musicas" aria-controls="pMusicas" aria-selected="${abaIni === 'musicas'}" tabindex="${abaIni === 'musicas' ? 0 : -1}">Músicas<i>${abaMus.n}</i></button>
    <button type="button" role="tab" id="abaTapes" data-aba="tapes" aria-controls="pTapes" aria-selected="${abaIni === 'tapes'}" tabindex="${abaIni === 'tapes' ? 0 : -1}">Beat tapes<i>${tapes.length}</i></button>
  </div>
  <div class="aba-corpo" id="pMusicas" role="tabpanel" aria-labelledby="abaMusicas"${abaIni === 'musicas' ? '' : ' hidden'}>
${abaMus.html}
  </div>
  <div class="aba-corpo" id="pTapes" role="tabpanel" aria-labelledby="abaTapes"${abaIni === 'tapes' ? '' : ' hidden'}>
  <h2 class="so-leitor">Beat tapes</h2>` : `  <div class="cab"><h2>Beat tapes</h2><span>${tapes.length} ${tapes.length === 1 ? 'tape' : 'tapes'}</span></div>`}
  <div class="moldura"><div class="grade">
${grade(tapes, idNova, idEmAlta)}
  </div></div>
${comMusicas ? '  </div>\n' : ''}${fimPerfil(gravou, comMusicas ? abaIni : 'tapes')}
</main>

${rodape('perfil')}
<script>
(function(){
  // visitas e cliques do perfil pro analytics do painel. Desde 10/10/2026 vai junto um
  // número aleatório guardado neste navegador (cr_pessoa, o mesmo das tapes): o mesmo
  // aparelho conta uma pessoa só. Não carrega IP nem nome.
  function pessoa(){try{var v=localStorage.getItem('cr_pessoa');if(!v||!/^[a-z0-9]{12,32}$/.test(v)){var a=new Uint8Array(12);if(window.crypto&&crypto.getRandomValues)crypto.getRandomValues(a);else for(var i=0;i<12;i++)a[i]=Math.random()*256|0;v='';for(var j=0;j<12;j++)v+=(a[j]%36).toString(36);localStorage.setItem('cr_pessoa',v);}return v;}catch(e){return '';}}
  function manda(o){try{if(!o.pessoa){var pe=pessoa();if(pe)o.pessoa=pe;}var s=JSON.stringify(o);if(navigator.sendBeacon)navigator.sendBeacon('/api/play',new Blob([s],{type:'application/json'}));else fetch('/api/play',{method:'POST',body:s,headers:{'content-type':'application/json'},keepalive:true});}catch(e){}}
  var de='';try{de=(new URLSearchParams(location.search).get('de')||'').toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,24);}catch(e){}
  if(!de){var r='';try{r=new URL(document.referrer).hostname;}catch(e){}
    de=/instagram/.test(r)?'instagram':/google\\./.test(r)?'google':/youtube|youtu\\.be/.test(r)?'youtube':/facebook|fb\\./.test(r)?'facebook':/whatsapp/.test(r)?'whatsapp':/spotify/.test(r)?'spotify':/caramujorecords/.test(r)?'site':r?'outro-site':'direto';}
  manda({kind:'perfil',origem:de});
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a[data-id],a[data-rede]');if(!a)return;
    if(a.dataset.id)manda({kind:'perfil-tape',artistId:+a.dataset.id,origem:de});
    else manda({kind:'perfil-rede',trackId:a.dataset.rede,origem:de});
  });

  // O player do perfil: um som só pra duas coisas.
  // - A última beat tape: os beats da tape mais nova, um atrás do outro, em ordem
  //   aleatória. Cada beat conta como play da tape (origem perfil).
  // - As músicas (06/10/2026: inteiras, antes eram 30 s), do arquivo da pasta do artista,
  //   na ordem da página: destaques e depois recentes. Acabou uma, vai pra próxima; depois
  //   da última, para. Tocar no player abre a música no Spotify.
  // O botão do topo muda com a aba: em Músicas é "Ouça o último lançamento" (começa no 1º
  // destaque); em Beat tapes, "Ouça a última beat tape".
  var T=null, MD=null, M=null, aoTrocarAba=function(){};
  try{ var te=document.getElementById('tocadorDados'); T=te?JSON.parse(te.textContent):null; }catch(e){ T=null; }
  try{ var me=document.getElementById('musicasDados'); MD=me?JSON.parse(me.textContent):null; }catch(e){ MD=null; }
  M=MD&&MD.lista&&MD.lista.length?MD.lista:null;
  var temTape=!!(T && T.faixas && T.faixas.length), temMus=!!M;
  var botoes=[].slice.call(document.querySelectorAll('#ouca,[data-ouca]'));
  var caixa=document.getElementById('tocando');
  if(caixa && (temTape||temMus)){
    var som=new Audio(); som.preload='none';
    var modo='', i=-1, j=-1, contados={}, ouvidos={}, acabou=false;
    var ROT=(MD&&MD.rotulos)||{tape:'Ouça a última beat tape',mus:'Ouça o último lançamento'};
    // de onde sai o MP3 (03/10/2026): o domínio próprio do armazenamento, quando ligado
    var MIDIA=${JSON.stringify(MIDIA)};
    function somDe(id){ return MIDIA ? MIDIA+'/mp3/'+id+'.mp3' : '/audio/'+id; }
    var nome=document.getElementById('tNome'), sub=document.getElementById('tSub'), barra=document.getElementById('tBarra');
    var link=document.getElementById('tLink'), capa=caixa.querySelector('.t-capa img');
    var bAnt=document.getElementById('tAnt'), bProx=document.getElementById('tProx'), bPlay=document.getElementById('tPlay');
    // o que o botão do topo faz agora: 'musica' (aba Músicas aberta) ou 'tape'
    function abaAberta(){ var a=document.querySelector('.abas [aria-selected="true"]'); return a?a.dataset.aba:'tapes'; }
    function modoBotao(){ return temMus && (abaAberta()==='musicas' || !temTape) ? 'musica' : 'tape'; }
    // sempre em ordem aleatória (27/09/2026): embaralha no 1º play e de novo a cada volta
    // completa, sem repetir o beat que acabou de tocar
    function embaralha(){
      var a=T.faixas, atual=i>=0?a[i]:null, k, x, y;
      for(k=a.length-1;k>0;k--){ y=Math.floor(Math.random()*(k+1)); x=a[k]; a[k]=a[y]; a[y]=x; }
      if(atual && a.length>1 && a[0]===atual){ x=a[0]; a[0]=a[1]; a[1]=x; }
    }
    function proxima(){ if(i+1>=T.faixas.length){ embaralha(); vaiTape(0); } else vaiTape(i+1); }
    function marca(){
      var toca=!som.paused, atual=modo==='musica'&&j>=0?M[j].k:-1, mb=modoBotao();
      botoes.forEach(function(b){
        var on=toca&&modo===mb, r=mb==='musica'?ROT.mus:ROT.tape;
        b.setAttribute('aria-pressed',on?'true':'false');
        b.setAttribute('aria-label',on?(mb==='musica'?'Pausar a música':'Pausar a última beat tape'):r);
        var sp=b.querySelector('span'); if(sp && sp.textContent!==r) sp.textContent=r;
      });
      caixa.classList.toggle('toca',toca);
      bPlay.setAttribute('aria-label',toca?'Pausar':'Tocar');
      [].forEach.call(document.querySelectorAll('.mx-play[data-m]'),function(b){
        var on=toca && +b.dataset.m===atual;
        b.classList.toggle('toca',on);
        b.setAttribute('aria-label',(on?'Pausar ':'Ouvir ')+b.dataset.nome);
      });
      [].forEach.call(document.querySelectorAll('.mx-card[data-m],.mx-row[data-m]'),function(el){ el.classList.toggle('atual',+el.dataset.m===atual); });
    }
    aoTrocarAba=marca;
    function mostra(src,titulo,subt,href,fora,rotulo){
      capa.src=src; nome.textContent=titulo; sub.textContent=subt; barra.style.width='0%';
      link.href=href; link.setAttribute('aria-label',rotulo);
      if(fora){ link.target='_blank'; link.rel='noopener'; } else { link.removeAttribute('target'); link.removeAttribute('rel'); }
      caixa.hidden=false; document.body.classList.add('com-player');
    }
    function vaiTape(n){
      modo='tape'; acabou=false; i=(n+T.faixas.length)%T.faixas.length;
      var f=T.faixas[i];
      som.src=somDe(f.id);
      mostra(T.tape.capa,f.t,T.tape.name,T.tape.url,false,'Abrir a tape '+T.tape.name);
      bAnt.setAttribute('aria-label','Beat anterior'); bProx.setAttribute('aria-label','Próximo beat');
      som.play().catch(function(){ marca(); });
      if(!contados[f.id]){ contados[f.id]=1; manda({kind:'play',trackId:f.id,artistId:T.tape.id,origem:'perfil'}); }
      tarja(f.t,'@rideblan33','Caramujo Records',T.tape.arte,'1000x1000');
      marca();
    }
    function vaiMusica(n){
      modo='musica'; acabou=false; j=(n+M.length)%M.length;
      var m=M[j];
      som.src=somDe(m.f);
      mostra(m.capa,m.n,m.a||'@rideblan33',m.url,true,'Abrir '+m.n+(m.sp?' no Spotify':' no YouTube'));
      bAnt.setAttribute('aria-label','Música anterior'); bProx.setAttribute('aria-label','Próxima música');
      som.play().catch(function(){ marca(); });
      if(!ouvidos[m.k]){ ouvidos[m.k]=1; manda({kind:'perfil-rede',trackId:'musica-play',origem:de}); }
      // tela de bloqueio igual à aba Músicas das pastas: "artistas & @rideblan33"
      tarja(m.n,m.a?m.a+' & @rideblan33':'@rideblan33','Caramujo Records',m.arte,'640x640');
      marca();
    }
    // acabou a música: vai pra próxima da página; depois da última, para (o play recomeça do 1º)
    function fimMusica(){
      if(j+1<M.length) return vaiMusica(j+1);
      acabou=true; som.pause(); barra.style.width='0%';
      var bc=document.querySelector('.mx-card.atual .mx-barra i'); if(bc) bc.style.width='0%';
      marca();
    }
    // Tela de bloqueio e notificação no padrão da vitrine (e das tapes): nome, artista,
    // álbum, capa inteira, e os mesmos botões.
    function tarja(titulo,artista,album,arte,tam){
      if(!('mediaSession' in navigator)) return;
      var url=/^https?:/.test(arte)?arte:location.origin+arte, tipo=/\\.png$/i.test(url)?'image/png':'image/jpeg';
      try{ navigator.mediaSession.metadata=new MediaMetadata({ title:titulo, artist:artista, album:album,
        artwork:[{src:url,sizes:tam,type:tipo}] }); }catch(e){}
      var liga=function(a,fn){ try{ navigator.mediaSession.setActionHandler(a,fn) }catch(e){} };
      liga('play',function(){ som.play().catch(function(){}) });
      liga('pause',function(){ som.pause() });
      liga('previoustrack',function(){ anterior(); });
      liga('nexttrack',function(){ seguinte(); });
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
    // anterior: no começo volta pra anterior; passou de 4 s, volta pro começo dela
    function anterior(){
      if(som.currentTime>4){ som.currentTime=0; if(som.paused) som.play().catch(function(){}); return; }
      if(modo==='musica') vaiMusica(j-1); else vaiTape(i-1);
    }
    function seguinte(){ if(modo==='musica') vaiMusica(j+1); else proxima(); }
    function alterna(){
      if(acabou) return modo==='musica' ? vaiMusica(0) : proxima();
      if(som.paused) som.play().catch(function(){}); else som.pause();
    }
    // o botão do topo: o mesmo modo pausa/continua; o outro começa (música = do 1º destaque)
    botoes.forEach(function(b){ b.addEventListener('click',function(){
      var mb=modoBotao();
      if(modo===mb && !acabou) return alterna();
      if(mb==='musica') return vaiMusica(0);
      if(i<0) embaralha();
      vaiTape(i<0?0:i);
    }); });
    bPlay.addEventListener('click',function(){ if(modo) alterna(); });
    bProx.addEventListener('click',seguinte);
    bAnt.addEventListener('click',anterior);
    // o play de cada música: a mesma toca/pausa; outra começa ela (e segue a fila da página)
    if(temMus) document.addEventListener('click',function(e){
      var b=e.target.closest&&e.target.closest('.mx-play[data-m]'); if(!b) return;
      var k=+b.dataset.m, n=-1;
      for(var x=0;x<M.length;x++) if(M[x].k===k){ n=x; break; }
      if(n<0) return;
      if(modo==='musica' && j===n && !acabou){ if(som.paused) som.play().catch(function(){}); else som.pause(); return; }
      vaiMusica(n);
    });
    som.addEventListener('play',function(){ marca(); if('mediaSession' in navigator) navigator.mediaSession.playbackState='playing'; });
    som.addEventListener('pause',function(){ marca(); if('mediaSession' in navigator) navigator.mediaSession.playbackState='paused'; });
    som.addEventListener('loadedmetadata',posicao); som.addEventListener('seeked',posicao);
    som.addEventListener('ended',function(){ if(modo==='musica') fimMusica(); else proxima(); });
    som.addEventListener('timeupdate',function(){
      var pct=(som.duration?som.currentTime/som.duration*100:0)+'%';
      barra.style.width=pct;
      if(modo==='musica'){ var bc=document.querySelector('.mx-card.atual .mx-barra i'); if(bc) bc.style.width=pct; }
    });
    // a próxima já fica pronta na borda (03/10/2026): passou da metade, um pedido de
    // 2 bytes faz o servidor guardar a próxima inteira, e ela começa sem espera
    var aquecidos={};
    som.addEventListener('timeupdate',function(){
      try{
        if(!som.duration||som.currentTime/som.duration<0.5) return;
        var id=modo==='tape'?(T.faixas[i+1]||{}).id:modo==='musica'?(M[j+1]||{}).f:null;
        if(!id||aquecidos[id]) return;
        aquecidos[id]=1;
        fetch(somDe(id),{headers:{Range:'bytes=0-1'},cache:'no-store'}).catch(function(){});
      }catch(e){}
    });
  }

  // abas Músicas | Beat tapes (05/10/2026): o servidor já abre a certa pela origem; o
  // #musicas / #tapes do endereço manda (e guarda a escolha pra quem volta pra página)
  var abas=[].slice.call(document.querySelectorAll('.abas [role=tab]'));
  var trilho=document.getElementById('mxTrilho'), sAnt=document.getElementById('mxAnt'), sProx=document.getElementById('mxProx');
  function setas(){
    if(!trilho||!sAnt) return;
    var sobra=trilho.scrollWidth-trilho.clientWidth;
    sAnt.parentNode.hidden=!(sobra>4);
    sAnt.disabled=trilho.scrollLeft<4; sProx.disabled=trilho.scrollLeft>=sobra-4;
  }
  function abre(qual,foco,conta){
    abas.forEach(function(b){
      var on=b.dataset.aba===qual;
      b.setAttribute('aria-selected',on?'true':'false'); b.tabIndex=on?0:-1;
      document.getElementById(b.getAttribute('aria-controls')).hidden=!on;
      if(on&&foco) b.focus();
    });
    try{ history.replaceState(history.state,'',location.pathname+location.search+'#'+qual); }catch(e){}
    if(conta) manda({kind:'perfil-rede',trackId:'aba-'+qual,origem:de});
    // o fim do perfil (Quem já gravou e Quer um som assim?) conta de que aba veio o clique
    document.querySelectorAll('#fimPerfil [data-de-'+qual+']').forEach(function(a){ a.setAttribute('data-de',a.getAttribute('data-de-'+qual)); try{ var u=new URL(a.getAttribute('href'),location.href); if(u.searchParams.has('de')){ u.searchParams.delete('de'); a.setAttribute('href',u.pathname+u.search+u.hash); } }catch(e){} });
    setas(); aoTrocarAba();
  }
  if(abas.length){
    abas.forEach(function(b,k){
      b.addEventListener('click',function(){ if(b.getAttribute('aria-selected')!=='true') abre(b.dataset.aba,false,true); });
      b.addEventListener('keydown',function(e){
        var d=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0; if(!d) return;
        e.preventDefault(); abre(abas[(k+d+abas.length)%abas.length].dataset.aba,true,true);
      });
    });
    var h=(location.hash||'').slice(1);
    if(h==='musicas'||h==='tapes'){ var sel=document.querySelector('.abas [aria-selected="true"]'); if(sel && sel.dataset.aba!==h) abre(h,false,false); }
  }
  if(trilho&&sAnt){
    trilho.addEventListener('scroll',setas,{passive:true});
    window.addEventListener('resize',setas);
    sAnt.addEventListener('click',function(){ trilho.scrollBy({left:-trilho.clientWidth,behavior:'smooth'}); });
    sProx.addEventListener('click',function(){ trilho.scrollBy({left:trilho.clientWidth,behavior:'smooth'}); });
    setas();
  }
  // Quem já gravou (rodada P): setas no computador, degradê na borda e o empurrãozinho que mostra que desliza
  (function(){
    var tr=document.getElementById('qgTr'), ant=document.getElementById('qgAnt'), prox=document.getElementById('qgProx');
    if(!tr||!ant) return;
    var w=tr.parentNode;
    function marca(){
      var sobra=tr.scrollWidth-tr.clientWidth;
      ant.parentNode.hidden=!(sobra>4);
      ant.disabled=tr.scrollLeft<4; prox.disabled=tr.scrollLeft>=sobra-4;
      w.classList.toggle('fim',tr.scrollLeft>=sobra-4);
    }
    tr.addEventListener('scroll',marca,{passive:true});
    window.addEventListener('resize',marca);
    ant.addEventListener('click',function(){ tr.scrollBy({left:-tr.clientWidth*0.8,behavior:'smooth'}); });
    prox.addEventListener('click',function(){ tr.scrollBy({left:tr.clientWidth*0.8,behavior:'smooth'}); });
    marca();
    var calmo=false; try{ calmo=matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){}
    if(calmo||!('IntersectionObserver' in window)) return;
    var mexeu=false; ['pointerdown','wheel','touchstart','keydown'].forEach(function(t){ tr.addEventListener(t,function(){ mexeu=true; },{passive:true,once:true}); });
    var io=new IntersectionObserver(function(es){
      if(!es[0].isIntersecting) return; io.disconnect();
      if(tr.scrollLeft>4||tr.scrollWidth-tr.clientWidth<40) return;
      setTimeout(function(){ if(mexeu) return; var sn=tr.style.scrollSnapType; tr.style.scrollSnapType='none'; tr.scrollTo({left:72,behavior:'smooth'}); setTimeout(function(){ if(!mexeu) tr.scrollTo({left:0,behavior:'smooth'}); setTimeout(function(){ tr.style.scrollSnapType=sn; },700); },650); },350);
    },{threshold:0.6});
    io.observe(tr);
  })();

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
  // os pontinhos da galeria do "Quer um som assim?" (25/10/2026)
  var gal=document.getElementById('mxGal');
  if(gal){ var pts=gal.parentNode.querySelectorAll('.mx-pts i'); gal.addEventListener('scroll',function(){ var k=Math.round(gal.scrollLeft/Math.max(1,gal.clientWidth)); for(var i=0;i<pts.length;i++) pts[i].classList.toggle('on',i===k); },{passive:true}); }
})();
</script>
${LEVA_DE}
${TOPO_JS}
</body></html>`;
}
