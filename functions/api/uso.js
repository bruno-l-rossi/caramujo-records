// Uso dos recursos da vitrine (14/11/2026): quantas visitas usaram a fileira de gêneros, a busca, a ficha
// do beat e o ♡ num período. Só pro painel (precisa estar logado). A contagem entra pelo /api/funil
// (etapa "uso-<recurso>"), uma vez por visita por recurso, sem nada pessoal: a tabela `uso` guarda o
// número aleatório da aba, o recurso, celular|computador e o dia de São Paulo.
import { db } from '../_lib/db.js';
import { autenticado } from '../_lib/sessao.js';

export const RECURSOS = ['fileira', 'busca', 'ficha', 'salvar'];
const DIA = /^\d{4}-\d{2}-\d{2}$/;
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, no-store' } });

export async function onRequestGet({ request, env }) {
  if (!(await autenticado(request, env))) return json({ erro: 'Entre no painel.' }, 401);
  const u = new URL(request.url);
  const ate = DIA.test(u.searchParams.get('ate') || '') ? u.searchParams.get('ate') : '9999-12-31';
  const de = DIA.test(u.searchParams.get('de') || '') ? u.searchParams.get('de') : '0000-01-01';
  const zero = () => ({ total: 0, celular: 0, computador: 0 });
  const uso = Object.fromEntries(RECURSOS.map((r) => [r, zero()]));
  const visitas = zero();
  try {
    const d = await db(env);
    const [v, usos, desde] = await d.batch([
      d.prepare("SELECT aparelho, COUNT(*) n FROM funil WHERE etapa = 'visita' AND dia BETWEEN ? AND ? GROUP BY aparelho").bind(de, ate),
      d.prepare('SELECT recurso, aparelho, COUNT(*) n FROM uso WHERE dia BETWEEN ? AND ? GROUP BY recurso, aparelho').bind(de, ate),
      d.prepare('SELECT MIN(dia) m FROM uso')
    ]);
    for (const r of v.results || []) { const a = r.aparelho === 'celular' ? 'celular' : 'computador'; visitas[a] += r.n; visitas.total += r.n; }
    for (const r of usos.results || []) { if (!uso[r.recurso]) continue; const a = r.aparelho === 'celular' ? 'celular' : 'computador'; uso[r.recurso][a] += r.n; uso[r.recurso].total += r.n; }
    return json({ ok: true, desde: ((desde.results || [])[0] || {}).m || null, visitas, uso });
  } catch (e) {
    return json({ erro: 'banco fora do ar' }, 503);
  }
}
