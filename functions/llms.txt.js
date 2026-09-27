// llms.txt (27/09/2026): o resumo da Caramujo pras IAs, com os números do site vindos
// do painel (Números do site), igual à vitrine e ao perfil. O texto continua no arquivo
// /llms.txt do repositório: aqui só troco a frase dos números. Banco fora = o arquivo
// como está.

import { db } from './_lib/db.js';
import { deTexto, PADRAO, cheio } from './_lib/numeros.js';

const VALIDADE = 10 * 60 * 1000;   // robô de IA passa pouco: 10 min de memória basta
let guardado = { at: 0, num: null };

export function trocarNumeros(texto, num) {
  const n = { ...PADRAO, ...(num || {}) };
  return texto.replace(/[\d.]+\+ artistas atendidos, [\d.]+\+ faixas lançadas, [\d.]+\+ streams/,
    `${cheio(n.artistas)}+ artistas atendidos, ${cheio(n.faixas)}+ faixas lançadas, ${cheio(n.streams)}+ streams`);
}

export async function onRequestGet({ request, env }) {
  const r = await env.ASSETS.fetch(new URL('/llms.txt', request.url));
  let texto = r.ok ? await r.text() : '';
  if (texto) {
    try {
      if (!guardado.num || Date.now() - guardado.at > VALIDADE) {
        const d = await db(env);
        const m = await d.prepare("SELECT valor FROM meta WHERE chave = 'numeros'").first();
        guardado = { at: Date.now(), num: m ? deTexto(m.valor) : { ...PADRAO } };
      }
      texto = trocarNumeros(texto, guardado.num);
    } catch (_) { /* banco fora: vai o arquivo */ }
  }
  return new Response(texto, {
    status: r.ok ? 200 : r.status,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' }
  });
}
