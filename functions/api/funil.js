// Funil de venda: o site avisa em que etapa a visita chegou.
// visita -> play -> carrinho -> checkout -> pagamento -> pago
//
// Nada pessoal entra aqui: sem IP, sem cookie, sem e-mail. A "sessão" é um
// número aleatório que o navegador cria pra aba e esquece quando ela fecha.
// Chega por navigator.sendBeacon, então a resposta não importa pra ninguém.

import { db } from '../_lib/db.js';

export const ETAPAS = ['visita', 'play', 'carrinho', 'checkout', 'pagamento', 'pago'];
const RETENCAO_DIAS = 400;

const vazio = () => new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });

export async function onRequestPost({ request, env }) {
  let b;
  try {
    const txt = await request.text();
    if (txt.length > 600) return vazio();
    b = JSON.parse(txt);
  } catch { return vazio(); }

  const sessao = String(b.s || '');
  const etapa = String(b.e || '');
  if (!/^[a-z0-9]{10,32}$/.test(sessao) || !ETAPAS.includes(etapa)) return vazio();
  const aparelho = b.a === 'celular' ? 'celular' : 'computador';
  const origem = /^[a-z0-9-]{1,40}$/.test(String(b.o || '')) ? String(b.o) : 'direto';
  const beat = Number.isInteger(b.b) && b.b > 0 && b.b < 100000 ? b.b : null;

  // robô declarado não conta
  const ua = request.headers.get('user-agent') || '';
  if (/bot|crawl|spider|headless|lighthouse|pagespeed/i.test(ua)) return vazio();

  try {
    const d = await db(env);
    const agora = new Date();
    const dia = new Date(agora.getTime() - 3 * 3600e3).toISOString().slice(0, 10); // São Paulo
    await d.prepare(
      'INSERT OR IGNORE INTO funil (sessao, etapa, aparelho, origem, beat_id, dia, at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(sessao, etapa, aparelho, origem, beat, dia, agora.toISOString()).run();

    // faxina de vez em quando: guarda ~13 meses
    if (Math.random() < 0.01) {
      const corte = new Date(agora.getTime() - RETENCAO_DIAS * 86400e3).toISOString().slice(0, 10);
      await d.prepare('DELETE FROM funil WHERE dia < ?').bind(corte).run();
    }
  } catch { /* funil fora do ar não atrapalha ninguém */ }
  return vazio();
}
