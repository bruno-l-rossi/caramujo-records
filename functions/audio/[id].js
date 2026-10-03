// Serve o MP3 leve guardado no R2, com suporte a pular pedaço da faixa (Range),
// e a onda (volume por meio segundo) em /audio/<id>.onda.
// Cache de um ano no navegador e no CDN: o arquivo nunca muda de nome.
//
// Cópia na borda (03/10/2026), igual à das capas: o primeiro play de uma faixa numa
// região busca no R2 (0,5 a 1 s até o primeiro byte) e, depois da resposta, guarda a
// faixa inteira no cache da Cloudflare. Daí em diante qualquer pedaço dela (o play,
// o arrasto da barra, o trecho do story) sai da cópia: o próprio cache corta o pedaço
// pedido e responde 206 com o Content-Range certo. O R2 só é lido de novo se a cópia
// sumir.

const guardando = new Set();     // faixas que este servidor já está copiando pra borda

export async function onRequestGet(context) {
  const { params, request, env } = context;
  if (!env.AUDIO) return new Response('prateleira desligada', { status: 500 });

  const bruto = String(params.id || '');
  // /audio/<id>.onda: o volume da faixa pro compartilhar (scripts/onda.mjs), ~1KB
  if (/\.onda$/i.test(bruto)) return onda(bruto.slice(0, -5), env);
  const id = bruto.replace(/\.mp3$/i, '');
  if (!/^[A-Za-z0-9_-]{10,80}$/.test(id)) return new Response('nao encontrado', { status: 404 });

  const key = `mp3/${id}.mp3`;
  const range = request.headers.get('range');

  // /audio/<id> e /audio/<id>.mp3 são a mesma faixa: uma cópia só
  const borda = typeof caches !== 'undefined' && caches.default ? caches.default : null;
  const origem = new URL(request.url).origin;
  const chave = origem + '/audio/' + id + '.mp3';
  if (borda) {
    const pedido = new Request(chave, { method: 'GET', headers: range ? { range } : {} });
    const guardada = await borda.match(pedido).catch(() => null);
    if (guardada) return guardada;
  }

  const obj = await env.AUDIO.get(key, range ? { range: request.headers } : undefined);
  if (!obj) return new Response('nao encontrado', { status: 404 });

  if (borda && typeof context.waitUntil === 'function' && !guardando.has(id)) {
    guardando.add(id);
    context.waitUntil(copiarPraBorda(borda, chave, key, env).finally(() => guardando.delete(id)));
  }

  const h = cabecalhos(obj);
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

function cabecalhos(obj) {
  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set('content-type', 'audio/mpeg');
  h.set('cache-control', 'public, max-age=31536000, immutable');
  h.set('accept-ranges', 'bytes');
  h.set('etag', obj.httpEtag);
  return h;
}

// A faixa inteira (200, com Content-Length), que é o que o cache aceita guardar.
// Falhou = fica sem cópia e o próximo play busca no R2, como era antes.
async function copiarPraBorda(borda, chave, key, env) {
  try {
    const inteiro = await env.AUDIO.get(key);
    if (!inteiro) return;
    const h = cabecalhos(inteiro);
    h.set('content-length', String(inteiro.size));
    await borda.put(new Request(chave, { method: 'GET' }), new Response(inteiro.body, { status: 200, headers: h }));
  } catch (_) { /* cópia é bônus */ }
}

async function onda(id, env) {
  if (!/^[A-Za-z0-9_-]{10,80}$/.test(id)) return new Response('nao encontrado', { status: 404 });
  const obj = await env.AUDIO.get(`onda/${id}.json`);
  // sem onda ainda: o compartilhar segue sem ela (e pergunta de novo em 1 hora)
  if (!obj) return new Response('{}', { status: 404, headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=3600' } });
  return new Response(obj.body, { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=86400' } });
}
