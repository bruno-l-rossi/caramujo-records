// De onde veio quem comprou (17/10/2026, pedido do Bruno: saber qual canal vende).
// O navegador manda duas origens junto do pagamento:
//   visita   = de onde veio a visita em que a compra aconteceu (o mesmo rótulo do funil:
//              instagram, google, story, tape-<artista>, direto…)
//   primeira = de onde veio a 1ª visita daquele aparelho (guardada 90 dias no navegador):
//              é por onde a pessoa conheceu a Caramujo.
// Vão no metadata do Mercado Pago (origem_visita, origem_primeira) e, quando o pagamento é
// aprovado (cartão na hora, PIX pelo webhook), entram numa linha da meta 'vendas-origem'
// (últimas 300 vendas, sem dado pessoal: id do pagamento, valor, método, as duas origens, data).
// Sem tabela nova: a migração do banco segue no mesmo número de comandos.
export const CHAVE_ORIGEM = 'vendas-origem';
const MAX = 300;
export const rotuloOrigem = (v) => {
  const s = String(v || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
  return s || null;
};

function ler(valor) {
  try { const l = JSON.parse(valor); return Array.isArray(l) ? l.filter((x) => x && x.p) : []; } catch (_) { return []; }
}

// idempotente pelo id do pagamento (o webhook do Mercado Pago chega mais de uma vez)
export async function registrarOrigem(d, { pagamento, valor, metodo, visita, primeira }) {
  if (!pagamento) return false;
  const r = await d.prepare('SELECT valor FROM meta WHERE chave = ?').bind(CHAVE_ORIGEM).first();
  const l = ler(r && r.valor);
  if (l.some((x) => String(x.p) === String(pagamento))) return false;
  l.unshift({ p: String(pagamento), v: Math.round(Number(valor || 0) * 100) / 100, m: metodo === 'pix' ? 'pix' : 'cartao',
    o: rotuloOrigem(visita) || 'sem-origem', f: rotuloOrigem(primeira) || rotuloOrigem(visita) || 'sem-origem', em: new Date().toISOString() });
  await d.prepare('INSERT OR REPLACE INTO meta (chave, valor) VALUES (?, ?)').bind(CHAVE_ORIGEM, JSON.stringify(l.slice(0, MAX))).run();
  return true;
}

// Resumo pro painel: por onde conheceu (primeira) e de onde veio na compra (visita)
export async function resumoOrigem(d, dias = 90) {
  const r = await d.prepare('SELECT valor FROM meta WHERE chave = ?').bind(CHAVE_ORIGEM).first();
  const desde = Date.now() - dias * 864e5;
  const l = ler(r && r.valor).filter((x) => new Date(x.em).getTime() >= desde);
  const agrupa = (k) => {
    const m = new Map();
    for (const x of l) { const a = m.get(x[k]) || { origem: x[k], n: 0, valor: 0 }; a.n++; a.valor = Math.round((a.valor + (x.v || 0)) * 100) / 100; m.set(x[k], a); }
    return [...m.values()].sort((a, b) => b.valor - a.valor || b.n - a.n);
  };
  return { dias, vendas: l.length, conheceu: agrupa('f'), comprou: agrupa('o') };
}
