// Rodada Y (27/10/2026): o aviso do PIX que ficou pra trás (_lib/avisos.js, passarLembretes).
//   POST /api/lembretes   com o cabeçalho x-ingest-token (o mesmo do conversor)
// Quem chama: o GitHub Actions de hora em hora (.github/workflows/lembretes.yml). As Functions do
// Cloudflare Pages não têm relógio próprio no plano grátis.
import { db, json } from '../_lib/db.js';
import { montarVitrine } from './vitrine.js';
import { lerEstatico } from '../_lib/loja.js';
import { passarLembretes } from '../_lib/avisos.js';

export async function onRequestPost({ request, env }) {
  if (!env.INGEST_TOKEN || request.headers.get('x-ingest-token') !== env.INGEST_TOKEN) return json({ erro: 'sem permissão' }, 401);
  const d = await db(env);
  let preco = null; try { preco = (await lerEstatico(request, env)).precos.beat; } catch (_) { preco = null; }
  const r = await passarLembretes(d, env, { vitrine: () => montarVitrine(request, env), preco });
  return json({ ok: true, ...r });
}
