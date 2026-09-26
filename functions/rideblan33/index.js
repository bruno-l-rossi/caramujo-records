// O perfil do @rideblan33: caramujorecords.com.br/rideblan33 (26/09/2026).
// Página montada no servidor (o Google lê o HTML pronto). A lista de tapes vem de
// _lib/perfil.js, que guarda cópia de 1 min no isolate e 5 min na região.

import { tapesDoPerfil, paginaPerfil } from '../_lib/perfil.js';

export async function onRequestGet({ request, env }) {
  const tapes = await tapesDoPerfil(request, env);
  const html = paginaPerfil(tapes, { url: request.url });
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // o navegador sempre pergunta de novo (tape nova aparece na hora);
      // quem segura o banco é a cópia da região
      'cache-control': 'no-cache'
    }
  });
}
