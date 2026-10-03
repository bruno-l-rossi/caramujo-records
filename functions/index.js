// A página inicial (caramujorecords.com.br/). Desde 24/09/2026 a lista de beats
// mora no banco: a cada visita eu pego o index.html estático e troco o bloco
// const BEATS pela lista do banco (e o destaque do hero pelo que o painel marcou).
// Todo o resto da página é o arquivo de sempre.
//
// Nunca pode quebrar: banco fora do ar = última lista boa guardada; sem cópia
// nenhuma = lista vazia e o aviso de fora do ar (lista velha pode anunciar beat
// já vendido). Qualquer erro aqui dentro devolve o arquivo com a lista zerada.

import { lojaParaPagina, injetar, lerEstatico } from './_lib/loja.js';
import { injetarNumeros } from './_lib/numeros.js';

// Os mesmos cabeçalhos do bloco /* do _headers (moram em _lib/cabecalhos.js desde
// 03/10/2026: as páginas de beat e de gênero usam os mesmos).
export { CABECALHOS } from './_lib/cabecalhos.js';
import { CABECALHOS } from './_lib/cabecalhos.js';

export async function onRequest({ request, env }) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return env.ASSETS.fetch(request);

  // o arquivo muda só a cada deploy (e deploy novo = isolate novo): guardo 10 min
  const { html } = await lerEstatico(request, env);
  let saida;
  try {
    const dados = await lojaParaPagina(request, env);
    saida = injetar(html, dados);
    // os números do hero (artistas, faixas, streams) vêm do painel; sem eles, os do arquivo
    if (dados && dados.numeros) saida = injetarNumeros(saida, dados.numeros);
  } catch (e) {
    console.error('index sem loja', e && e.message);
    saida = injetar(html, null);
  }

  const headers = new Headers({ 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' });
  for (const [k, v] of Object.entries(CABECALHOS)) headers.set(k, v);
  return new Response(request.method === 'HEAD' ? null : saida, { status: 200, headers });
}
