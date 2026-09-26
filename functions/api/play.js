// Registra que alguém abriu ou tocou algo. Uma linha por audição.
// O cliente só chama uma vez por faixa, pra não gastar escrita à toa.

import { db, now, who, json } from '../_lib/db.js';

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ erro: 'json' }, 400); }

  // open = abriu o catálogo, play = ouviu uma faixa, carrinho = clicou no carrinho de um beat da tape
  // perfil = abriu caramujorecords.com.br/rideblan33, perfil-tape = tocou numa capa do perfil,
  // perfil-rede = tocou num botão do perfil (vitrine, spotify, youtube, instagram; vai em track_id)
  const KINDS = ['open', 'play', 'carrinho', 'perfil', 'perfil-tape', 'perfil-rede'];
  const kind = KINDS.includes(body.kind) ? body.kind : 'play';
  // de onde veio (?de= do link ou o site de origem). Só letra minúscula, número e hífen.
  const origem = body.origem ? String(body.origem).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24) || null : null;
  const d = await db(env);

  await d.prepare(
    'INSERT INTO events (artist_id, track_id, kind, link_code, who, at, origem) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    Number(body.artistId) || null,
    body.trackId ? String(body.trackId).slice(0, 80) : null,
    kind,
    body.code ? String(body.code).slice(0, 16) : null,
    await who(request),
    now(),
    origem
  ).run();

  return json({ ok: true });
}
