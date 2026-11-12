// A vitrine é a lista de beats à venda do site. Desde 24/09/2026 ela mora no D1
// (tabela beats, ver _lib/loja.js); antes era const BEATS escrito no index.html.
// Aqui ela ganha slug e rótulo de gênero, e casa com o que já está convertido no R2.
// Serve o botão de carrinho do catálogo, a pastilha de vendido das tapes, o
// relatório do painel e a /api/vitrine.

import { mesma, limpo, slug, tituloCasa } from './casar.js';
import { db } from './db.js';
import { lerEstatico } from './loja.js';

const VALIDADE = 60 * 1000;        // venda e edição no painel aparecem em até 1 minuto
let cache = { at: 0, beats: null };

// Cópia da região (03/10/2026), igual à da loja: servidor que acabou de acordar pega a
// lista daqui em vez de ir ao banco. Mesmo prazo de 1 minuto, então nada fica mais
// velho do que já ficava na memória de cada servidor.
const REGIAO = '/__cache/vitrine-lista';
const temCache = () => typeof caches !== 'undefined' && caches.default;
const chaveRegiao = (request) => { try { return new URL(REGIAO, request.url); } catch (_) { return null; } };

// Sem request (webhook) cai só a memória deste servidor, como sempre foi; com request
// (painel) cai também a cópia da região.
export async function esquecerVitrine(request) {
  cache = { at: 0, beats: null };
  emVoo = null;
  const k = request && temCache() ? chaveRegiao(request) : null;
  if (k) { try { await caches.default.delete(k); } catch (_) { /* bônus */ } }
}

async function lerRegiao(request) {
  const k = request && temCache() ? chaveRegiao(request) : null;
  if (!k) return null;
  try { const r = await caches.default.match(k); return r ? await r.json() : null; } catch (_) { return null; }
}

async function guardarRegiao(request, dados) {
  const k = request && temCache() ? chaveRegiao(request) : null;
  if (!k) return;
  try {
    await caches.default.put(k, new Response(JSON.stringify(dados), {
      headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=60' }
    }));
  } catch (_) { /* bônus */ }
}

const ultimaMudanca = (b) => [b.criado_em, b.mexido_em, b.sold_at, b.unsold_at].filter((x) => x && /^\d{4}-\d\d-\d\d/.test(String(x))).map((x) => String(x).slice(0, 10)).sort().pop() || null;

// Rodada AG (06/11/2026): uma leitura por vez (quem chega junto espera a mesma resposta)
// e um jeito de saber, sem custo, se a lista já está na memória.
let emVoo = null;
// 12/11/2026: a lista que já está na memória deste servidor, mesmo vencida (ou null). Nunca vai ao banco:
// serve pro rodapé esconder gênero sem beat à venda sem custar leitura (lição da rodada AG).
export const vitrineNaMemoria = () => cache.beats || null;

export const vitrinePronta = () => !!(cache.beats && Date.now() - cache.at < VALIDADE);

export async function vitrine(request, env) {
  if (cache.beats && Date.now() - cache.at < VALIDADE) return cache.beats;
  if (emVoo) return emVoo;
  const p = vitrineAgora(request, env);
  emVoo = p;
  try { return await p; } finally { if (emVoo === p) emVoo = null; }
}

async function vitrineAgora(request, env) {
  const regiao = await lerRegiao(request);
  if (regiao && regiao.at && Date.now() - regiao.at < VALIDADE && Array.isArray(regiao.beats) && regiao.beats.length) {
    cache = { at: regiao.at, beats: regiao.beats };
    return cache.beats;
  }
  try {
    const d = await db(env);
    // Beat tirado do site some da vitrine, MENOS se foi vendido: aí ele continua
    // aqui pra tape seguir com pastilha de vendido e a Fila não oferecer de novo.
    const { results } = await d.prepare(
      `SELECT id, name, bpm, mkey AS key, genre, sold, removido_em, casa, criado_em, mexido_em, sold_at, unsold_at FROM beats
        WHERE removido_em IS NULL OR sold = 1 ORDER BY ordem, id`
    ).all();
    const linhas = results || [];
    let rotulos = {};
    try {
      const est = await lerEstatico(request, env);
      rotulos = est.generos;
    } catch (_) { /* sem rótulo, mostra o código do gênero */ }
    const beats = linhas.map((b) => ({
      id: b.id,
      name: b.name,
      title: b.name,                  // mesma() compara por .title
      slug: slug(b.name),             // o mesmo slug do deep-link do site
      bpm: b.bpm,
      key: b.key,
      genre: b.genre,
      generoLabel: rotulos[b.genre] || b.genre || '',
      sold: !!b.sold,
      ...(b.casa ? { casa: b.casa } : {}),
      // rodada AF (04/11/2026): a última mudança do beat (criado, editado, vendido, voltou) = <lastmod> do sitemap
      ...(ultimaMudanca(b) ? { em: ultimaMudanca(b) } : {}),
      ...(b.removido_em ? { removido: true } : {})
    }));
    if (beats.length) { cache = { at: Date.now(), beats }; await guardarRegiao(request, cache); }
    return beats.length ? beats : (cache.beats || []);
  } catch (e) {
    console.error('vitrine sem banco', e && e.message);
    return cache.beats || [];      // vitrine fora do ar não pode derrubar o catálogo
  }
}

// Índice por título limpo: achar é direto, e BPM/tom só desempatam nomes repetidos.
export function indexar(beats) {
  const mapa = new Map();
  for (const b of beats) {
    const k = tituloCasa(b);
    if (!mapa.has(k)) mapa.set(k, []);
    mapa.get(k).push(b);
  }
  return mapa;
}

// faixa = { title, bpm, key }
export function achar(mapa, faixa) {
  const lista = mapa.get(limpo(faixa.title));
  if (!lista) return null;
  return lista.find((b) => mesma(b, faixa)) || null;
}
