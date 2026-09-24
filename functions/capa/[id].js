// Serve a capa do catálogo guardada na prateleira.
//   /capa/<id>     a arte inteira, 1000x1000 (página da tape, tela de bloqueio do celular)
//   /capa/<id>?p   a miniatura de 200x200 (lista do site, barra do player, destaque, painel)
// Miniatura que ainda não foi gerada cai na arte inteira com cache de 1 hora,
// pra ninguém ficar preso na grande depois que o conversor fizer a pequena.
// A resposta fica guardada na borda do Cloudflare: da segunda visita em diante
// nem a function nem o R2 são chamados.

export async function onRequestGet(context) {
  const { params, request, env } = context;
  if (!env.AUDIO) return new Response('prateleira desligada', { status: 500 });

  const id = String(params.id || '').replace(/\.jpg$/i, '');
  if (!/^[A-Za-z0-9_-]{6,80}$/.test(id)) return new Response('nao encontrado', { status: 404 });

  const url = new URL(request.url);
  const mini = url.searchParams.has('p');
  const chave = new Request(url.origin + url.pathname + (mini ? '?p' : ''), { method: 'GET' });
  const borda = typeof caches !== 'undefined' && caches.default ? caches.default : null;

  if (borda) {
    const guardada = await borda.match(chave).catch(() => null);
    if (guardada) return guardada;
  }

  let obj = mini ? await env.AUDIO.get(`capa/${id}-p.jpg`) : null;
  const provisoria = mini && !obj;
  if (!obj) obj = await env.AUDIO.get(`capa/${id}.jpg`);
  if (!obj) return new Response('nao encontrado', { status: 404 });

  const h = new Headers();
  h.set('content-type', 'image/jpeg');
  h.set('cache-control', provisoria ? 'public, max-age=3600' : 'public, max-age=31536000, immutable');
  h.set('content-length', String(obj.size));
  h.set('etag', obj.httpEtag);

  const resposta = new Response(obj.body, { headers: h });
  if (borda && context.waitUntil) context.waitUntil(borda.put(chave, resposta.clone()).catch(() => {}));
  return resposta;
}
