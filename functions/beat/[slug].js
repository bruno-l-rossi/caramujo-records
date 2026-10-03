// Página de cada beat: caramujorecords.com.br/beat/<nome-do-beat> (03/10/2026).
// Feita pro Google (indexável, com preço e disponibilidade). O link que o Bruno
// compartilha segue o /b/<nome> (abre a vitrine com o beat tocando).
// Montagem e desenho em _lib/beatpagina.js.

import { dadosLoja, paginaBeat, resposta } from '../_lib/beatpagina.js';
import { paginaErro } from '../_lib/erro.js';

export async function onRequestGet({ params, request, env }) {
  const pedido = String(params.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80);
  let loja;
  try {
    loja = await dadosLoja(request, env);
  } catch (e) {
    console.error('pagina de beat sem loja', e && e.message);
    return paginaErro(request, env, 503);
  }
  if (!loja.beats.length) return paginaErro(request, env, 503);
  const b = pedido && loja.beats.find((x) => x.slug === pedido);
  if (!b) {
    return paginaErro(request, env, 404, {
      titulo: 'Esse beat não está na loja',
      texto: 'Ele pode ter saído do catálogo ou o link veio cortado. Procure no {perfil} ou chame o {direct}.'
    });
  }
  return resposta(paginaBeat(b, loja));
}
