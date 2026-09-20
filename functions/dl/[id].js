// Download de uma faixa. MP3 sai da prateleira, WAV sai direto do Drive.
// Só entrega se a pasta daquela faixa estiver liberada pra baixar.

import { db, now, who } from '../_lib/db.js';
import { driveFile } from '../_lib/drive.js';

export async function onRequestGet({ params, request, env }) {
  const id = String(params.id || '');
  const url = new URL(request.url);
  const fmt = url.searchParams.get('f') === 'wav' ? 'wav' : 'mp3';

  const d = await db(env);
  const t = await d.prepare(
    `SELECT t.*, a.dl_beats, a.dl_sons, a.code, a.id AS aid, a.name AS artista
     FROM tracks t JOIN artists a ON a.id = t.artist_id
     WHERE t.id = ? AND t.ready = 1`
  ).bind(id).first();

  if (!t) return new Response('faixa nao encontrada', { status: 404 });

  const liberado = t.kind === 'beat' ? t.dl_beats : t.dl_sons;
  if (!liberado) return new Response('essa pasta esta so pra ouvir', { status: 403 });

  const nome = nomeArquivo(t, fmt).replace(/[\\/:*?"<>|]/g, '-');
  const disp = `attachment; filename*=UTF-8''${encodeURIComponent(nome)}`;

  await d.prepare(
    'INSERT INTO events (artist_id, track_id, kind, link_code, who, at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(t.aid, t.id, 'download-' + fmt, t.code, await who(request), now()).run();

  if (fmt === 'mp3') {
    const obj = await env.AUDIO.get(`mp3/${id}.mp3`);
    if (!obj) return new Response('arquivo ainda nao esta pronto', { status: 404 });
    return new Response(obj.body, {
      headers: {
        'content-type': 'audio/mpeg',
        'content-length': String(obj.size),
        'content-disposition': disp,
        'cache-control': 'private, max-age=0'
      }
    });
  }

  const r = await driveFile(env, id, request.headers.get('range'));
  if (!r.ok && r.status !== 206) return new Response('o Drive recusou o arquivo', { status: 502 });

  const h = new Headers();
  h.set('content-type', 'audio/wav');
  h.set('content-disposition', disp);
  h.set('accept-ranges', 'bytes');
  const len = r.headers.get('content-length');
  const cr = r.headers.get('content-range');
  if (len) h.set('content-length', len);
  if (cr) h.set('content-range', cr);
  return new Response(r.body, { status: r.status, headers: h });
}

// Como o arquivo chega no computador de quem baixa:
//   beat   → buraco negro Abm 150bpm (prod. @rideblan33).wav
//   som    → ice candy (mastered) prod. @rideblan33.wav
//   guia   → ice candy (demo) prod. @rideblan33.wav
function nomeArquivo(t, fmt) {
  if (t.kind === 'beat') {
    const bits = [t.title];
    if (t.mkey) bits.push(t.mkey);
    if (t.bpm) bits.push(t.bpm + 'bpm');
    return `${bits.join(' ')} (prod. @rideblan33).${fmt}`;
  }
  const tag = t.tag === 'demo' ? '(demo)' : '(mastered)';
  return `${t.title} ${tag} prod. @rideblan33.${fmt}`;
}
