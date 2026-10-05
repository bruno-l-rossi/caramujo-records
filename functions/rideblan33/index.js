// O perfil do @rideblan33: caramujorecords.com.br/rideblan33 (26/09/2026).
// Página montada no servidor (o Google lê o HTML pronto). A lista de tapes, os beats
// da tape mais nova e as músicas vêm de _lib/perfil.js (1 min no isolate, 5 min na região).
//
// Aba Músicas (05/10/2026): o bloco preto abre em Músicas ou em Beat tapes conforme de
// onde a pessoa veio (o mapa do Bruno fica em _lib/musicas.js, ABRE_TAPES). Enquanto o
// "No ar" estiver desligado no painel, a aba só aparece pra quem está logado no painel.

import { lerPerfil, paginaPerfil } from '../_lib/perfil.js';
import { origem, abaInicial } from '../_lib/musicas.js';
import { autenticado } from '../_lib/sessao.js';

// A barra fina com a foto e o @ que aparece presa no topo ao descer pras capas.
// Desligar = false (decisão do Bruno depois de ver com e sem).
const BARRA_FIXA = false;   // 26/09/2026: o Bruno escolheu SEM a barra

export async function onRequestGet({ request, env }) {
  const dados = await lerPerfil(request, env);
  const m = dados.musicas;
  // só confere o login quando existe prévia pra mostrar (lista com música e fora do ar)
  const previa = !!(m && m.lista && m.lista.length && !m.noAr) && await autenticado(request, env);
  const html = paginaPerfil(dados, { url: request.url, barraFixa: BARRA_FIXA, aba: abaInicial(origem(request)), previa });
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // o navegador sempre pergunta de novo (tape nova aparece na hora);
      // quem segura o banco é a cópia da região. A prévia é só de quem está logado.
      'cache-control': previa ? 'private, no-store' : 'no-cache'
    }
  });
}
