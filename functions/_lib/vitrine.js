// A vitrine é a lista de beats à venda do site. Desde 24/09/2026 ela mora no D1
// (tabela beats, ver _lib/loja.js); antes era const BEATS escrito no index.html.
// Aqui ela ganha slug e rótulo de gênero, e casa com o que já está convertido no R2.
// Serve o botão de carrinho do catálogo, a pastilha de vendido das tapes, o
// relatório do painel e a /api/vitrine.

import { mesma, limpo, slug } from './casar.js';
import { db } from './db.js';
import { garantirLoja, lerBeats, lerEstatico } from './loja.js';

const VALIDADE = 60 * 1000;        // venda e edição no painel aparecem em até 1 minuto
let cache = { at: 0, beats: null };
let preco = null;   // PRICE_BEAT do index.html (o preço segue escrito lá)

export function esquecerVitrine() { cache = { at: 0, beats: null }; }

export async function vitrine(request, env) {
  if (cache.beats && Date.now() - cache.at < VALIDADE) return cache.beats;
  try {
    const d = await db(env);
    await garantirLoja(request, env, d);
    const linhas = await lerBeats(d);
    let rotulos = {};
    try {
      const est = await lerEstatico(request, env);
      rotulos = est.generos;
      if (est.preco) preco = est.preco;
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
      sold: !!b.sold
    }));
    if (beats.length) cache = { at: Date.now(), beats };
    return beats.length ? beats : (cache.beats || []);
  } catch (e) {
    console.error('vitrine sem banco', e && e.message);
    return cache.beats || [];      // vitrine fora do ar não pode derrubar o catálogo
  }
}

// Preço do beat avulso como o site mostra (null antes da primeira leitura).
export const precoBeat = () => preco;

// Índice por título limpo: achar é direto, e BPM/tom só desempatam nomes repetidos.
export function indexar(beats) {
  const mapa = new Map();
  for (const b of beats) {
    const k = limpo(b.name);
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
