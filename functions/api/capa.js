// O artista troca a capa do próprio catálogo pelo site.
// Quem tem o link tem a chave: o código do catálogo precisa bater.
// A imagem já chega recortada em quadrado e reduzida pelo navegador.

import { db, now, who, json } from '../_lib/db.js';

const LIMITE = 3 * 1024 * 1024; // 3 MB já é muito pra um quadrado de 1000px

export async function onRequestPost({ request, env }) {
  if (!env.AUDIO) return json({ erro: 'prateleira desligada' }, 500);

  const url = new URL(request.url);
  const slug = String(url.searchParams.get('a') || '').toLowerCase();
  const codigo = String(url.searchParams.get('c') || '').toLowerCase();
  if (!slug || !codigo) return json({ erro: 'link incompleto' }, 400);

  const d = await db(env);
  const artist = await d.prepare('SELECT * FROM artists WHERE slug = ?').bind(slug).first();
  if (!artist || artist.code !== codigo) return json({ erro: 'link nao confere' }, 403);

  const tipo = request.headers.get('content-type') || '';
  if (!/^image\/(jpeg|png|webp)$/i.test(tipo)) return json({ erro: 'manda uma imagem' }, 415);

  const body = await request.arrayBuffer();
  if (!body.byteLength) return json({ erro: 'imagem vazia' }, 400);
  if (body.byteLength > LIMITE) return json({ erro: 'imagem muito pesada' }, 413);

  const chave = `art-${artist.id}-${Date.now().toString(36)}`;
  await env.AUDIO.put(`capa/${chave}.jpg`, body, {
    httpMetadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=31536000, immutable' }
  });

  if (artist.cover_key) {
    await env.AUDIO.delete([`capa/${artist.cover_key}.jpg`, `capa/${artist.cover_key}-p.jpg`]).catch(() => {});
  }
  await d.prepare(
    "UPDATE artists SET cover_key = ?, cover_origem = 'artista' WHERE id = ?"
  ).bind(chave, artist.id).run();

  await d.prepare(
    'INSERT INTO events (artist_id, track_id, kind, link_code, who, at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(artist.id, null, 'capa', artist.code, await who(request), now()).run();

  return json({ ok: true, capa: `/capa/${chave}` });
}

// O painel apaga a capa que o artista subiu.
export async function onRequestDelete({ request, env }) {
  const url = new URL(request.url);
  const d = await db(env);

  // dois donos dessa ação: o painel (por id) e o artista (pelo link)
  const slug = String(url.searchParams.get('a') || '').toLowerCase();
  const codigo = String(url.searchParams.get('c') || '').toLowerCase();
  const id = Number(url.searchParams.get('id'));

  let artist = null;
  if (slug && codigo) {
    artist = await d.prepare('SELECT * FROM artists WHERE slug = ?').bind(slug).first();
    if (!artist || artist.code !== codigo) return json({ erro: 'link nao confere' }, 403);
    if (artist.cover_origem !== 'artista') return json({ erro: 'essa capa vem do estudio' }, 403);
  } else {
    const { autenticado } = await import('../_lib/sessao.js');
    if (!(await autenticado(request, env))) return json({ erro: 'entra no painel primeiro' }, 401);
    if (!id) return json({ erro: 'sem artista' }, 400);
    artist = await d.prepare('SELECT * FROM artists WHERE id = ?').bind(id).first();
  }
  if (!artist) return json({ erro: 'artista nao encontrado' }, 404);

  if (artist.cover_key) await env.AUDIO.delete([`capa/${artist.cover_key}.jpg`, `capa/${artist.cover_key}-p.jpg`]).catch(() => {});
  await d.prepare('UPDATE artists SET cover_key = NULL, cover_origem = NULL WHERE id = ?')
    .bind(artist.id).run();

  await d.prepare(
    'INSERT INTO events (artist_id, track_id, kind, link_code, who, at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(artist.id, null, 'capa-removida', artist.code, await who(request), now()).run();

  return json({ ok: true });
}
