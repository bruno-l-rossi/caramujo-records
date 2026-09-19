// Cria o link avulso de uma faixa ou de uma seleção. Vale pra sempre.

import { db, now, code, json } from '../lib/db.js';

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ erro: 'json' }, 400); }

  const ids = (body.ids || []).map(String).filter(Boolean).slice(0, 60);
  if (!ids.length) return json({ erro: 'sem faixa' }, 400);

  const d = await db(env);

  // o artista tem que bater com o código do link que a pessoa está usando
  const marcas = ids.map(() => '?').join(',');
  const { results } = await d.prepare(
    `SELECT t.id, t.artist_id, a.code FROM tracks t JOIN artists a ON a.id = t.artist_id
     WHERE t.id IN (${marcas}) AND t.ready = 1`
  ).bind(...ids).all();

  const achadas = results || [];
  if (!achadas.length) return json({ erro: 'faixa nao encontrada' }, 404);

  const artistId = achadas[0].artist_id;
  if (achadas.some((r) => r.artist_id !== artistId)) return json({ erro: 'faixas de artistas diferentes' }, 400);
  if (body.code && achadas[0].code !== String(body.code)) return json({ erro: 'link nao confere' }, 403);

  const validas = achadas.map((r) => r.id);
  const kind = validas.length === 1 ? 'f' : 'p';

  // mesma seleção pedida de novo devolve o mesmo link
  const chave = validas.slice().sort().join(',');
  const antigo = await d.prepare(
    'SELECT code FROM links WHERE kind = ? AND artist_id = ? AND track_ids = ?'
  ).bind(kind, artistId, chave).first();

  let c = antigo?.code;
  if (!c) {
    c = code(6);
    await d.prepare(
      'INSERT INTO links (code, kind, artist_id, track_ids, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(c, kind, artistId, chave, now()).run();
  }

  const origin = new URL(request.url).origin;
  return json({ url: `${origin}/${kind}/${c}`, code: c, kind });
}
