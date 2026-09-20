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
  if (op === 'eventos') return eventos(d, url.searchParams.get('id'), url.searchParams.get('p'));
  if (request.method !== 'POST') return json({ erro: 'op desconhecida' }, 400);

  const body = await request.json().catch(() => ({}));
  if (op === 'perm') return perm(d, body);
  if (op === 'descricao') return descricao(d, body);
  if (op === 'sync') return sync(env, d, body);
  return json({ erro: 'op desconhecida' }, 400);
}

async function artistas(d) {
  const { results } = await d.prepare(
    `SELECT a.id, a.slug, a.name, a.code, a.dl_beats, a.dl_sons, a.synced_at,
            a.job_estado, a.job_total, a.job_feitos, a.job_at, a.cover_origem, a.descricao,
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

async function eventos(d, id, pagina) {
  const artistId = Number(id);
  if (!artistId) return json({ erro: 'sem artista' }, 400);

  const POR_PAGINA = 10;
  const p = Math.max(0, Number(pagina) || 0);

  // mês e ano contados no horário de São Paulo
  const sp = new Date(Date.now() - 3 * 3600e3);
  const inicioMes = new Date(Date.UTC(sp.getUTCFullYear(), sp.getUTCMonth(), 1) + 3 * 3600e3).toISOString();
  const inicioAno = new Date(Date.UTC(sp.getUTCFullYear(), 0, 1) + 3 * 3600e3).toISOString();

  const resumo = await d.prepare(
    `SELECT MAX(at) AS ultima,
            SUM(CASE WHEN kind = 'open' AND at >= ? THEN 1 ELSE 0 END) AS mes,
            SUM(CASE WHEN kind = 'open' AND at >= ? THEN 1 ELSE 0 END) AS ano,
            COUNT(*) AS total
     FROM events WHERE artist_id = ?`
  ).bind(inicioMes, inicioAno, artistId).first();

  const { results } = await d.prepare(
    `SELECT e.kind, e.at, t.title AS titulo
     FROM events e LEFT JOIN tracks t ON t.id = e.track_id
     WHERE e.artist_id = ? ORDER BY e.at DESC LIMIT ? OFFSET ?`
  ).bind(artistId, POR_PAGINA, p * POR_PAGINA).all();

  const total = Number(resumo?.total || 0);
  return json({
    eventos: results || [],
    resumo: {
      ultima: resumo?.ultima || null,
      mes: Number(resumo?.mes || 0),
      ano: Number(resumo?.ano || 0)
    },
    pagina: p,
    paginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
    total
  });
}

async function perm(d, body) {
  const id = Number(body.id);
  const campo = body.campo === 'beats' ? 'dl_beats' : body.campo === 'sons' ? 'dl_sons' : null;
  if (!id || !campo) return json({ erro: 'pedido incompleto' }, 400);
  await d.prepare(`UPDATE artists SET ${campo} = ? WHERE id = ?`).bind(body.valor ? 1 : 0, id).run();
  return json({ ok: true });
}

async function descricao(d, body) {
  const id = Number(body.id);
  if (!id) return json({ erro: 'sem artista' }, 400);
  const texto = String(body.texto || '').trim().slice(0, 280);
  await d.prepare('UPDATE artists SET descricao = ? WHERE id = ?')
    .bind(texto || null, id).run();
  return json({ ok: true, texto: texto || null });
}

async function sync(env, d, body) {
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

  if (r.status === 204) {
    const marca = new Date().toISOString();
    if (body.artista) {
      await d.prepare(
        "UPDATE artists SET job_estado = 'na fila', job_total = 0, job_feitos = 0, job_at = ? WHERE name = ?"
      ).bind(marca, String(body.artista)).run();
    } else {
      await d.prepare(
        "UPDATE artists SET job_estado = 'na fila', job_total = 0, job_feitos = 0, job_at = ?"
      ).bind(marca).run();
    }
    return json({ ok: true });
  }
  if (r.status === 403 || r.status === 404) {
    return json({ erro: 'a chave do GitHub precisa de permissão em Actions' }, 403);
  }
  return json({ erro: 'GitHub respondeu ' + r.status }, 502);
}
