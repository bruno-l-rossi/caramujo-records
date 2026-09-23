// A vitrine pro navegador: os beats à venda do site com o endereço do MP3 que já está
// guardado no R2. É o que vai deixar o site tocar do Drive, no lugar do SoundCloud.
// Público e de leitura: o áudio já é público nos catálogos.

import { db, json } from '../_lib/db.js';
import { vitrine } from '../_lib/vitrine.js';
import { mesma, limpo } from '../_lib/casar.js';

const VALIDADE = 5 * 60 * 1000;
let cache = { at: 0, dados: null };

export async function onRequestGet({ request, env }) {
  if (cache.dados && Date.now() - cache.at < VALIDADE) return resposta(cache.dados);

  const beats = await vitrine(request, env);
  if (!beats.length) return json({ erro: 'nao consegui ler a lista de beats do site' }, 502);

  const d = await db(env);
  const { results } = await d.prepare(
    `SELECT t.id, t.title, t.bpm, t.mkey AS key, t.dur FROM tracks t
       JOIN artists a ON a.id = t.artist_id
      WHERE t.kind = 'beat' AND t.ready = 1`
  ).all();

  const porTitulo = new Map();
  for (const f of results || []) {
    const k = limpo(f.title);
    if (!porTitulo.has(k)) porTitulo.set(k, []);
    porTitulo.get(k).push(f);
  }

  const dados = beats.map((b) => {
    const f = (porTitulo.get(limpo(b.name)) || []).find((x) => mesma(b, x)) || null;
    return {
      id: b.id, name: b.name, slug: b.slug, bpm: b.bpm, key: b.key,
      genre: b.genre, sold: b.sold,
      mp3: f ? '/audio/' + f.id : null,
      dur: f ? (f.dur || 0) : 0
    };
  });

  cache = { at: Date.now(), dados };
  return resposta(dados);
}

function resposta(dados) {
  return json(
    { beats: dados, comAudio: dados.filter((b) => b.mp3).length, total: dados.length },
    200,
    { 'cache-control': 'public, max-age=300' }
  );
}
