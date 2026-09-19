// Registra que alguém abriu ou tocou algo. Uma linha por audição.
// O cliente só chama uma vez por faixa, pra não gastar escrita à toa.

import { db, now, who, json } from '../_lib/db.js';

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ erro: 'json' }, 400); }

  const kind = body.kind === 'open' ? 'open' : 'play';
  const d = await db(env);

  await d.prepare(
    'INSERT INTO events (artist_id, track_id, kind, link_code, who, at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(
    Number(body.artistId) || null,
    body.trackId ? String(body.trackId).slice(0, 80) : null,
    kind,
    body.code ? String(body.code).slice(0, 16) : null,
    await who(request),
    now()
  ).run();

  return json({ ok: true });
}
