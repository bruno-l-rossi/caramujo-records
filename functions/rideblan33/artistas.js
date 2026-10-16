// Quem já gravou: caramujorecords.com.br/rideblan33/artistas (16/10/2026, rodada K).
// Lista conferida em _lib/gravou-lista.js + o que o Bruno muda no painel (meta 'gravou',
// lida junto com o perfil, no mesmo cache). Fora do ar: 404 pra todo mundo e prévia
// (noindex, sem cache) pra quem está logado no painel.

import { lerPerfil } from '../_lib/perfil.js';
import { montarGravou } from '../_lib/gravou.js';
import { paginaGravou } from '../_lib/gravoupagina.js';
import { autenticado } from '../_lib/sessao.js';
import { paginaErro } from '../_lib/erro.js';

export async function onRequestGet({ request, env }) {
  const dados = await lerPerfil(request, env);
  const g = dados.gravou || {};
  const previa = !g.noAr && await autenticado(request, env);
  if (!g.noAr && !previa) return paginaErro(request, env, 404);
  const html = paginaGravou(montarGravou(g), { previa });
  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': previa ? 'private, no-store' : 'no-cache' }
  });
}
