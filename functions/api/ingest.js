// Recebe o que o conversor (GitHub Actions) preparou: cadastra o artista,
// diz quais faixas faltam converter, guarda o MP3 no R2 e fecha a sincronia.
// Protegido pelo token INGEST_TOKEN.

import { db, now, slugify, code, json } from '../_lib/db.js';

// Teto de segurança da prateleira. O plano gratuito do R2 vai até 10 GB;
// paramos em 8 pra nunca virar cobrança. A conta cheia do catálogo dá ~3 GB.
const TETO_BYTES = 8 * 1024 * 1024 * 1024;

async function usado(d) {
  const r = await d.prepare('SELECT COALESCE(SUM(mp3_bytes), 0) AS n FROM tracks WHERE ready = 1').first();
  return Number(r?.n || 0);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.INGEST_TOKEN || request.headers.get('x-ingest-token') !== env.INGEST_TOKEN) {
    return json({ erro: 'token invalido' }, 401);
  }

  const url = new URL(request.url);
  const op = url.searchParams.get('op');
  const d = await db(env);

  if (op === 'plan') return plan(d, await request.json());
  if (op === 'track') return track(d, env, url, request);
  if (op === 'done') return done(d, url, await request.json());
  return json({ erro: 'op desconhecida' }, 400);
}

async function plan(d, body) {
  const { folderId, name, tracks } = body;
  if (!folderId || !name || !Array.isArray(tracks)) return json({ erro: 'faltou dado' }, 400);

  let artist = await d.prepare('SELECT * FROM artists WHERE folder_id = ?').bind(folderId).first();

  if (!artist) {
    let slug = slugify(name);
    const taken = await d.prepare('SELECT 1 FROM artists WHERE slug = ?').bind(slug).first();
    if (taken) slug = slug + '-' + code(3);
    await d.prepare(
      'INSERT INTO artists (slug, name, folder_id, code, dl_beats, dl_sons) VALUES (?, ?, ?, ?, 0, 0)'
    ).bind(slug, name, folderId, code(5)).run();
    artist = await d.prepare('SELECT * FROM artists WHERE folder_id = ?').bind(folderId).first();
  } else if (artist.name !== name) {
    await d.prepare('UPDATE artists SET name = ? WHERE id = ?').bind(name, artist.id).run();
  }

  const have = await d.prepare(
    'SELECT id, src_modified, ready FROM tracks WHERE artist_id = ?'
  ).bind(artist.id).all();
  const byId = new Map((have.results || []).map((r) => [r.id, r]));

  const stamp = now();
  const need = [];
  const rows = [];

  for (const t of tracks) {
    const old = byId.get(t.id);
    const fresh = old && old.ready === 1 && old.src_modified === t.modified;
    if (!fresh) need.push(t.id);
    rows.push(
      d.prepare(
        `INSERT INTO tracks (id, artist_id, title, kind, grp, bpm, mkey, tag, wav_bytes, src_modified, ready, seen_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           artist_id = excluded.artist_id, title = excluded.title, kind = excluded.kind,
           grp = excluded.grp, bpm = excluded.bpm, mkey = excluded.mkey, tag = excluded.tag,
           wav_bytes = excluded.wav_bytes, src_modified = excluded.src_modified,
           ready = CASE WHEN tracks.src_modified = excluded.src_modified THEN tracks.ready ELSE 0 END,
           seen_at = excluded.seen_at`
      ).bind(
        t.id, artist.id, t.title, t.kind, t.grp,
        t.bpm ?? null, t.key ?? null, t.tag ?? null,
        t.wavBytes ?? null, t.modified, fresh ? 1 : 0, stamp
      )
    );
  }

  if (rows.length) await d.batch(rows);

  const usadoBytes = await usado(d);
  return json({
    artistId: artist.id, slug: artist.slug, code: artist.code, need,
    prateleira: { usado: usadoBytes, teto: TETO_BYTES, folga: TETO_BYTES - usadoBytes }
  });
}

async function track(d, env, url, request) {
  if (!env.AUDIO) return json({ erro: 'R2 nao esta ligado (binding AUDIO)' }, 500);

  const id = url.searchParams.get('id');
  const dur = Number(url.searchParams.get('dur') || 0);
  if (!id) return json({ erro: 'faltou id' }, 400);

  const body = await request.arrayBuffer();
  if (!body.byteLength) return json({ erro: 'arquivo vazio' }, 400);

  const usadoBytes = await usado(d);
  if (usadoBytes + body.byteLength > TETO_BYTES) {
    return json({
      erro: 'teto da prateleira atingido',
      usado: usadoBytes, teto: TETO_BYTES
    }, 507);
  }

  await env.AUDIO.put(`mp3/${id}.mp3`, body, {
    httpMetadata: { contentType: 'audio/mpeg', cacheControl: 'public, max-age=31536000, immutable' }
  });

  await d.prepare(
    'UPDATE tracks SET mp3_bytes = ?, dur = ?, ready = 1 WHERE id = ?'
  ).bind(body.byteLength, Math.round(dur), id).run();

  return json({ ok: true, bytes: body.byteLength });
}

async function done(d, url, body) {
  const folderId = url.searchParams.get('folderId');
  const keep = new Set(body.ids || []);
  const artist = await d.prepare('SELECT * FROM artists WHERE folder_id = ?').bind(folderId).first();
  if (!artist) return json({ erro: 'artista nao encontrado' }, 404);

  const have = await d.prepare('SELECT id FROM tracks WHERE artist_id = ?').bind(artist.id).all();
  const gone = (have.results || []).map((r) => r.id).filter((id) => !keep.has(id));
  if (gone.length) {
    await d.batch(gone.map((id) => d.prepare('DELETE FROM tracks WHERE id = ?').bind(id)));
  }
  await d.prepare('UPDATE artists SET synced_at = ? WHERE id = ?').bind(now(), artist.id).run();

  const count = await d.prepare(
    "SELECT kind, COUNT(*) n FROM tracks WHERE artist_id = ? AND ready = 1 GROUP BY kind"
  ).bind(artist.id).all();

  return json({
    ok: true, slug: artist.slug, code: artist.code,
    link: `/${artist.slug}/${artist.code}`,
    removidas: gone.length,
    prontas: count.results || []
  });
}
