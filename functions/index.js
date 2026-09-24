// A página inicial (caramujorecords.com.br/). Desde 24/09/2026 a lista de beats
// mora no banco: a cada visita eu pego o index.html estático e troco o bloco
// const BEATS pela lista do banco (e o destaque do hero pelo que o painel marcou).
// Todo o resto da página é o arquivo de sempre.
//
// Nunca pode quebrar: banco fora do ar = última lista boa guardada; sem cópia
// nenhuma = lista vazia e o aviso de fora do ar (lista velha pode anunciar beat
// já vendido). Qualquer erro aqui dentro devolve o arquivo com a lista zerada.

import { lojaParaPagina, injetar, lerEstatico } from './_lib/loja.js';

// Os mesmos cabeçalhos do bloco /* do _headers. O _headers não vale pra resposta
// de função, então repito aqui (teste14 confere que os dois batem).
export const CABECALHOS = {
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://sdk.mercadopago.com https://http2.mlstatic.com https://cdn.jsdelivr.net https://cdn.emailjs.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://http2.mlstatic.com; font-src 'self' data: https://http2.mlstatic.com; img-src 'self' data: https:; frame-src https://*.mercadopago.com https://*.mercadolibre.com; connect-src 'self' https://api.mercadopago.com https://*.mercadopago.com https://*.mercadolibre.com https://www.mercadolibre.com https://http2.mlstatic.com https://api.emailjs.com https://cloudflareinsights.com; worker-src blob:; frame-ancestors 'none';"
};

export async function onRequest({ request, env }) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return env.ASSETS.fetch(request);

  // o arquivo muda só a cada deploy (e deploy novo = isolate novo): guardo 10 min
  const { html } = await lerEstatico(request, env);
  let saida;
  try {
    const dados = await lojaParaPagina(request, env);
    saida = injetar(html, dados);
  } catch (e) {
    console.error('index sem loja', e && e.message);
    saida = injetar(html, null);
  }

  const headers = new Headers({ 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' });
  for (const [k, v] of Object.entries(CABECALHOS)) headers.set(k, v);
  return new Response(request.method === 'HEAD' ? null : saida, { status: 200, headers });
}
