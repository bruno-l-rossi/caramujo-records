// Rodada Y (27/10/2026): o aviso do PIX que ficou pra trás (_lib/avisos.js, passarLembretes).
//   POST /api/lembretes   com o cabeçalho x-ingest-token (o mesmo do conversor)
// Quem chama: o GitHub Actions de hora em hora (.github/workflows/lembretes.yml). As Functions do
// Cloudflare Pages não têm relógio próprio no plano grátis.
// 04/11/2026: a mesma passada também
//   - reenvia o aviso de venda que não saiu ou falhou (_lib/avisovenda.js, reavisarVendas)
//   - manda o e-mail do mês no dia 1º, a partir das 9h (_lib/resumomes.js, passarResumo)
// Cada parte roda separada: uma que quebra não segura as outras.
import { db, json } from '../_lib/db.js';
import { montarVitrine } from './vitrine.js';
import { lerEstatico } from '../_lib/loja.js';
import { passarLembretes } from '../_lib/avisos.js';
import { reavisarVendas } from '../_lib/avisovenda.js';
import { passarResumo } from '../_lib/resumomes.js';

const tenta = async (fn) => { try { return await fn(); } catch (e) { console.error('[lembretes]', e && e.message); return { erro: String((e && e.message) || e).slice(0, 160) }; } };

export async function onRequestPost({ request, env }) {
  if (!env.INGEST_TOKEN || request.headers.get('x-ingest-token') !== env.INGEST_TOKEN) return json({ erro: 'sem permissão' }, 401);
  const d = await db(env);
  let preco = null; try { preco = (await lerEstatico(request, env)).precos.beat; } catch (_) { preco = null; }
  const r = await passarLembretes(d, env, { vitrine: () => montarVitrine(request, env), preco });
  const vendas = await tenta(() => reavisarVendas(d, env));
  const resumo = await tenta(() => passarResumo(d, env));
  return json({ ok: true, ...r, vendas, resumo });
}
