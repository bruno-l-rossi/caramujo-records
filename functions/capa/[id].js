// Serve a capa do catálogo guardada na prateleira.

export async function onRequestGet({ params, request, env }) {
  if (!env.AUDIO) return new Response('prateleira desligada', { status: 500 });

  const id = String(params.id || '').replace(/\.jpg$/i, '');
  if (!/^[A-Za-z0-9_-]{6,80}$/.test(id)) return new Response('nao encontrado', { status: 404 });

  const obj = await env.AUDIO.get(`capa/${id}.jpg`);
  if (!obj) return new Response('nao encontrado', { status: 404 });

  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set('content-type', 'image/jpeg');
  h.set('cache-control', 'public, max-age=31536000, immutable');
  h.set('content-length', String(obj.size));
  h.set('etag', obj.httpEtag);
  return new Response(obj.body, { headers: h });
}
