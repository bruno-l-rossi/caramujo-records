// O perfil do @rideblan33: caramujorecords.com.br/rideblan33 (26/09/2026).
// Página montada no servidor (o Google lê o HTML pronto). A lista de tapes e os beats
// da tape mais nova vêm de _lib/perfil.js (1 min no isolate, 5 min na região).

import { lerPerfil, paginaPerfil } from '../_lib/perfil.js';

// A barra fina com a foto e o @ que aparece presa no topo ao descer pras capas.
// Desligar = false (decisão do Bruno depois de ver com e sem).
const BARRA_FIXA = true;

export async function onRequestGet({ request, env }) {
  const dados = await lerPerfil(request, env);
  const html = paginaPerfil(dados, { url: request.url, barraFixa: BARRA_FIXA });
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // o navegador sempre pergunta de novo (tape nova aparece na hora);
      // quem segura o banco é a cópia da região
      'cache-control': 'no-cache'
    }
  });
}
