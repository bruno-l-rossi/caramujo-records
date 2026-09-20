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
  if (op === 'capa') return capa(d, env, url, request);
  if (op === 'done') return done(d, env, url, await request.json());
  if (op === 'fila') return fila(d, await request.json());
  if (op === 'exclusivos') return exclusivos(d, await request.json());
  return json({ erro: 'op desconhecida' }, 400);
}

async function plan(d, body) {
  const { folderId, name, tracks } = body;
  if (!folderId || !name || !Array.isArray(tracks)) return json({ erro: 'faltou dado' }, 400);

  // Beat tape do @rideblan33 nasce com o download desligado nos dois lados.
  const tape = body.tipo === 'tape';
  const tipo = tape ? 'tape' : 'artista';

  let artist = await d.prepare('SELECT * FROM artists WHERE folder_id = ?').bind(folderId).first();

  if (!artist) {
    let slug = slugify(name);
    const taken = await d.prepare('SELECT 1 FROM artists WHERE slug = ?').bind(slug).first();
    if (taken) slug = slug + '-' + code(3);
    await d.prepare(
      'INSERT INTO artists (slug, name, folder_id, code, tipo, dl_beats, dl_sons) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(slug, name, folderId, code(5), tipo, tape ? 0 : 1, tape ? 0 : 1).run();
    artist = await d.prepare('SELECT * FROM artists WHERE folder_id = ?').bind(folderId).first();
  } else if (artist.name !== name || artist.tipo !== tipo) {
    await d.prepare('UPDATE artists SET name = ?, tipo = ? WHERE id = ?').bind(name, tipo, artist.id).run();
  }

  // Numa tape, a tag não vem da pasta: sai do cruzamento com Exclusivos
  // e com o que já está nas pastas dos artistas.
  const venda = tape ? await marcarVenda(d, tracks) : null;

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
        `INSERT INTO tracks (id, artist_id, title, kind, grp, bpm, mkey, tag, wav_bytes, src_modified, ready, revisar, seen_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           artist_id = excluded.artist_id, title = excluded.title, kind = excluded.kind,
           grp = excluded.grp, bpm = excluded.bpm, mkey = excluded.mkey, tag = excluded.tag,
           wav_bytes = excluded.wav_bytes, src_modified = excluded.src_modified,
           ready = CASE WHEN tracks.src_modified = excluded.src_modified THEN tracks.ready ELSE 0 END,
           revisar = excluded.revisar, seen_at = excluded.seen_at`
      ).bind(
        t.id, artist.id, t.title, t.kind, t.grp,
        t.bpm ?? null, t.key ?? null, t.tag ?? null,
        t.wavBytes ?? null, t.modified, fresh ? 1 : 0, t.revisar ?? null, stamp
      )
    );
  }

  if (rows.length) await d.batch(rows);

  await d.prepare(
    "UPDATE artists SET job_estado = 'convertendo', job_total = ?, job_feitos = 0, job_at = ? WHERE id = ?"
  ).bind(need.length, stamp, artist.id).run();

  const usadoBytes = await usado(d);
  return json({
    artistId: artist.id, slug: artist.slug, code: artist.code, need, venda,
    capaAtual: artist.cover_origem === 'artista' ? null : (artist.cover_key || null),
    prateleira: { usado: usadoBytes, teto: TETO_BYTES, folga: TETO_BYTES - usadoBytes }
  });
}

/* ---------- disponível, vendido, ou pra eu revisar ---------- */

// Mesma faixa em lugares diferentes: comparo o título limpo e, quando os dois
// lados têm BPM ou tom, exijo que batam. Isso evita confundir dois "intro".
const limpo = (s) => String(s || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/\s+/g, ' ').trim();

function mesma(a, b) {
  if (limpo(a.title) !== limpo(b.title)) return false;
  if (a.bpm && b.bpm && Number(a.bpm) !== Number(b.bpm)) return false;
  if (a.key && b.key && limpo(a.key) !== limpo(b.key)) return false;
  return true;
}

async function exclusivos(d, body) {
  const beats = Array.isArray(body.beats) ? body.beats : [];
  const lista = beats.map((b) => ({ title: b.title, bpm: b.bpm ?? null, key: b.key ?? null }));
  await d.prepare(
    `INSERT INTO meta (chave, valor) VALUES ('exclusivos', ?)
     ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor`
  ).bind(JSON.stringify({ at: now(), beats: lista })).run();
  return json({ ok: true, total: lista.length });
}

// Escreve t.tag ('disponivel' | 'vendido' | null) e t.revisar nas faixas da tape.
async function marcarVenda(d, tracks) {
  const guardado = await d.prepare("SELECT valor FROM meta WHERE chave = 'exclusivos'").first();
  let aVenda = [];
  try { aVenda = JSON.parse(guardado?.valor || '{}').beats || []; } catch { aVenda = []; }

  // Tudo que já está na pasta de algum artista (gravado ou não) conta como vendido.
  // Puxo a lista inteira porque o LOWER do SQLite não tira acento e "dígitos"
  // não bateria com "digitos"; a comparação boa é aqui, com limpo().
  const { results } = await d.prepare(
    `SELECT t.title, t.bpm, t.mkey, a.name AS artista
       FROM tracks t JOIN artists a ON a.id = t.artist_id
      WHERE a.tipo = 'artista'`
  ).all();
  const naMao = (results || []).map((r) => ({
    title: r.title, bpm: r.bpm, key: r.mkey, artista: r.artista
  }));

  const conta = { disponivel: 0, vendido: 0, revisar: 0 };

  for (const t of tracks) {
    const emExclusivos = aVenda.some((b) => mesma(b, t));
    const comArtista = naMao.find((r) => mesma(r, t)) || null;

    if (emExclusivos && !comArtista) { t.tag = 'disponivel'; t.revisar = null; conta.disponivel++; }
    else if (comArtista && !emExclusivos) { t.tag = 'vendido'; t.revisar = null; conta.vendido++; }
    else {
      // nos dois ao mesmo tempo, ou em nenhum: sai sem tag e entra na minha lista
      t.tag = null;
      t.revisar = emExclusivos
        ? 'Está em Exclusivos e na pasta de ' + (comArtista?.artista || 'um artista')
        : 'Não está em Exclusivos nem na pasta de nenhum artista';
      conta.revisar++;
    }
  }

  return conta;
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

  await d.prepare(
    `UPDATE artists SET job_feitos = job_feitos + 1, job_at = ?
     WHERE id = (SELECT artist_id FROM tracks WHERE id = ?)`
  ).bind(now(), id).run();

  return json({ ok: true, bytes: body.byteLength });
}

async function done(d, env, url, body) {
  const folderId = url.searchParams.get('folderId');
  const keep = new Set(body.ids || []);
  const artist = await d.prepare('SELECT * FROM artists WHERE folder_id = ?').bind(folderId).first();
  if (!artist) return json({ erro: 'artista nao encontrado' }, 404);

  // a capa saiu da pasta do Drive: some daqui também, e volta o logo da casa
  const capaAgora = body.capa || null;
  if (!capaAgora && artist.cover_key && artist.cover_origem !== 'artista') {
    await env.AUDIO.delete(`capa/${artist.cover_key}.jpg`).catch(() => {});
    await d.prepare('UPDATE artists SET cover_key = NULL WHERE id = ?').bind(artist.id).run();
  }

  const have = await d.prepare('SELECT id FROM tracks WHERE artist_id = ?').bind(artist.id).all();
  const gone = (have.results || []).map((r) => r.id).filter((id) => !keep.has(id));
  if (gone.length) {
    await d.batch(gone.map((id) => d.prepare('DELETE FROM tracks WHERE id = ?').bind(id)));
  }
  await d.prepare(
    "UPDATE artists SET synced_at = ?, job_estado = 'pronto', job_at = ? WHERE id = ?"
  ).bind(now(), now(), artist.id).run();

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

// A capa do catálogo: a imagem que estiver na pasta do artista.
async function capa(d, env, url, request) {
  const folderId = url.searchParams.get('folderId');
  const chave = url.searchParams.get('chave');
  if (!folderId || !chave) return json({ erro: 'faltou dado' }, 400);

  const artist = await d.prepare(
    'SELECT id, cover_key, cover_origem FROM artists WHERE folder_id = ?'
  ).bind(folderId).first();
  if (!artist) return json({ erro: 'artista nao encontrado' }, 404);

  // o artista trocou a capa pelo site: a imagem do Drive não atropela
  if (artist.cover_origem === 'artista') {
    return json({ ok: true, pulou: 'capa do artista' });
  }

  const body = await request.arrayBuffer();
  if (!body.byteLength) return json({ erro: 'imagem vazia' }, 400);

  await env.AUDIO.put(`capa/${chave}.jpg`, body, {
    httpMetadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=31536000, immutable' }
  });

  if (artist.cover_key && artist.cover_key !== chave) {
    await env.AUDIO.delete(`capa/${artist.cover_key}.jpg`).catch(() => {});
  }
  await d.prepare(
    "UPDATE artists SET cover_key = ?, cover_origem = 'drive' WHERE id = ?"
  ).bind(chave, artist.id).run();

  return json({ ok: true, chave });
}

// O painel marca o artista como "na fila" assim que manda converter.
async function fila(d, body) {
  if (body.artista) {
    await d.prepare(
      "UPDATE artists SET job_estado = 'na fila', job_total = 0, job_feitos = 0, job_at = ? WHERE name = ?"
    ).bind(now(), String(body.artista)).run();
  } else {
    await d.prepare(
      "UPDATE artists SET job_estado = 'na fila', job_total = 0, job_feitos = 0, job_at = ?"
    ).bind(now()).run();
  }
  return json({ ok: true });
}
