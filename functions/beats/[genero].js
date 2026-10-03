// Página de cada gênero: caramujorecords.com.br/beats/<genero> (03/10/2026), como
// /beats/boom-bap e /beats/trap. É a página que aparece na busca "beat boom bap".
// Montagem e desenho em _lib/beatpagina.js.

import { dadosLoja, paginaGenero, resposta } from '../_lib/beatpagina.js';
import { paginaErro } from '../_lib/erro.js';

export async function onRequestGet({ params, request, env }) {
  const pedido = String(params.genero || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
  let loja;
  try {
    loja = await dadosLoja(request, env);
  } catch (e) {
    console.error('pagina de genero sem loja', e && e.message);
    return paginaErro(request, env, 503);
  }
  if (!loja.beats.length) return paginaErro(request, env, 503);
  const html = pedido ? paginaGenero(pedido, loja) : null;
  if (!html) {
    return paginaErro(request, env, 404, {
      titulo: 'Esse gênero não está na loja',
      texto: 'O link veio cortado ou o gênero mudou de nome. Procure no {perfil} ou chame o {direct}.'
    });
  }
  return resposta(html);
}
