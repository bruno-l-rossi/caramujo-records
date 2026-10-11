// Comentário na pasta do artista (10/10/2026, _lib/comentarios.js).
//   POST   { a: slug, c: código, f: faixa, s: segundo|null, x: texto, n: nome, tipo: 'nota'|'aprovou', pessoa }
//   DELETE { a, c, id, pessoa }  (só o aparelho que escreveu, ou o Bruno)
// A pasta é privada: sem o slug e o código certos, nada entra. O Bruno logado (marca do
// painel no aparelho) comenta como @rideblan33 e não recebe e-mail de si mesmo.

import { db, json } from '../_lib/db.js';
import { ehOBruno } from '../_lib/sessao.js';
import { criar, apagar, avisarBruno } from '../_lib/comentarios.js';

async function corpo(request) {
  const txt = await request.text().catch(() => '');
  if (!txt || txt.length > 4000) return null;
  try { const b = JSON.parse(txt); return b && typeof b === 'object' ? b : null; } catch (_) { return null; }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const b = await corpo(request);
  if (!b) return json({ erro: 'pedido torto' }, 400);
  const d = await db(env);
  const bruno = await ehOBruno(request, env);
  const r = await criar(d, { slug: b.a, code: b.c, f: b.f, s: b.s, x: b.x, n: b.n, tipo: b.tipo, pessoa: b.pessoa, bruno });
  if (r.erro) return json({ erro: r.erro }, r.status || 400);
  const aviso = avisarBruno(env, request, r).catch((e) => console.error('[comentario] aviso', e && e.message));
  if (context.waitUntil) context.waitUntil(aviso); else await aviso;
  return json({ ok: true, c: r.c });
}

export async function onRequestDelete({ request, env }) {
  const b = await corpo(request);
  if (!b) return json({ erro: 'pedido torto' }, 400);
  const d = await db(env);
  const r = await apagar(d, { slug: b.a, code: b.c, id: b.id, pessoa: b.pessoa, bruno: await ehOBruno(request, env) });
  if (r.erro) return json({ erro: r.erro }, r.status || 400);
  return json({ ok: true });
}
