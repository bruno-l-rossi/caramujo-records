// As ações do painel: lista de artistas, permissão por pasta,
// atividade e o disparo da conversão. Tudo atrás do mesmo cookie do painel.

import { db, json } from '../_lib/db.js';
import { autenticado } from '../_lib/sessao.js';

const TETO_BYTES = 8 * 1024 * 1024 * 1024;

export async function onRequest({ request, env }) {
  if (!(await autenticado(request, env))) return json({ erro: 'entra no painel primeiro' }, 401);

  const url = new URL(request.url);
  const op = url.searchParams.get('op');
  const d = await db(env);

  if (op === 'artistas') return artistas(d);
  if (op === 'eventos') return eventos(d, url.searchParams.get('id'));
  if (request.method !== 'POST') return json({ erro: 'op desconhecida' }, 400);

  const body = await request.json().catch(() => ({}));
  if (op === 'perm') return perm(d, body);
  if (op === 'sync') return sync(env, body);
  return json({ erro: 'op desconhecida' }, 400);
}

async function artistas(d) {
  const { results } = await d.prepare(
    `SELECT a.id, a.slug, a.name, a.code, a.dl_beats, a.dl_sons, a.synced_at,
            (SELECT COUNT(*) FROM tracks t WHERE t.artist_id = a.id AND t.ready = 1 AND t.kind = 'beat') AS nb,
            (SELECT COUNT(*) FROM tracks t WHERE t.artist_id = a.id AND t.ready = 1 AND t.kind = 'son') AS ns,
            (SELECT MAX(at) FROM events e WHERE e.artist_id = a.id) AS visto
     FROM artists a ORDER BY a.name COLLATE NOCASE`
  ).all();

  const soma = await d.prepare(
    'SELECT COALESCE(SUM(mp3_bytes), 0) AS n FROM tracks WHERE ready = 1'
  ).first();

  return json({
    artistas: results || [],
    prateleira: { usado: Number(soma?.n || 0), teto: TETO_BYTES }
  });
}

async function eventos(d, id) {
  const artistId = Number(id);
  if (!artistId) return json({ erro: 'sem artista' }, 400);
  const { results } = await d.prepare(
    `SELECT e.kind, e.at, t.title AS titulo
     FROM events e LEFT JOIN tracks t ON t.id = e.track_id
     WHERE e.artist_id = ? ORDER BY e.at DESC LIMIT 40`
  ).bind(artistId).all();
  return json({ eventos: results || [] });
}

async function perm(d, body) {
  const id = Number(body.id);
  const campo = body.campo === 'beats' ? 'dl_beats' : body.campo === 'sons' ? 'dl_sons' : null;
  if (!id || !campo) return json({ erro: 'pedido incompleto' }, 400);
  await d.prepare(`UPDATE artists SET ${campo} = ? WHERE id = ?`).bind(body.valor ? 1 : 0, id).run();
  return json({ ok: true });
}

async function sync(env, body) {
  if (!env.GITHUB_TOKEN) return json({ erro: 'falta a chave do GitHub' }, 500);

  const r = await fetch(
    'https://api.github.com/repos/bruno-l-rossi/caramujo-records/actions/workflows/catalogo.yml/dispatches',
    {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + env.GITHUB_TOKEN,
        accept: 'application/vnd.github+json',
        'user-agent': 'caramujo-painel',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ ref: 'main', inputs: { artistas: String(body.artista || '') } })
    }
  );

  if (r.status === 204) return json({ ok: true });
  if (r.status === 403 || r.status === 404) {
    return json({ erro: 'a chave do GitHub precisa de permissão em Actions' }, 403);
  }
  return json({ erro: 'GitHub respondeu ' + r.status }, 502);
}
