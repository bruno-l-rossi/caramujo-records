// Serve o MP3 leve guardado no R2, com suporte a pular pedaço da faixa (Range).
// Cache de um ano no navegador e no CDN: o arquivo nunca muda de nome.

export async function onRequestGet({ params, request, env }) {
  if (!env.AUDIO) return new Response('prateleira desligada', { status: 500 });

  const id = String(params.id || '').replace(/\.mp3$/i, '');
  if (!/^[A-Za-z0-9_-]{10,80}$/.test(id)) return new Response('nao encontrado', { status: 404 });

  const key = `mp3/${id}.mp3`;
  const range = request.headers.get('range');

  const obj = await env.AUDIO.get(key, range ? { range: request.headers } : undefined);
  if (!obj) return new Response('nao encontrado', { status: 404 });

  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set('content-type', 'audio/mpeg');
  h.set('cache-control', 'public, max-age=31536000, immutable');
  h.set('accept-ranges', 'bytes');
  h.set('etag', obj.httpEtag);

  if (obj.range && 'offset' in obj.range) {
    const start = obj.range.offset || 0;
    const end = start + (obj.range.length || obj.size - start) - 1;
    h.set('content-range', `bytes ${start}-${end}/${obj.size}`);
    h.set('content-length', String(end - start + 1));
    return new Response(obj.body, { status: 206, headers: h });
  }

  h.set('content-length', String(obj.size));
  return new Response(obj.body, { headers: h });
}
