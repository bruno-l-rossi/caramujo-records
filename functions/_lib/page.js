// Monta a página do catálogo: pega o molde em /catalogo/app.html e injeta os dados.

const ESC = { '&': '\\u0026', '<': '\\u003c', '>': '\\u003e', ' ': '\\u2028', ' ': '\\u2029' };

export function dados(obj) {
  return JSON.stringify(obj).replace(/[&<>  ]/g, (c) => ESC[c]);
}

export function metas({ titulo, descricao, url, capa }) {
  const t = escapar(titulo);
  const d = escapar(descricao);
  return [
    `<meta name="description" content="${d}">`,
    `<meta name="robots" content="noindex, nofollow">`,
    `<meta property="og:type" content="music.playlist">`,
    `<meta property="og:title" content="${t}">`,
    `<meta property="og:description" content="${d}">`,
    `<meta property="og:url" content="${escapar(url)}">`,
    capa ? `<meta property="og:image" content="${escapar(capa)}">` : '',
    `<meta name="twitter:card" content="summary_large_image">`
  ].filter(Boolean).join('\n');
}

function escapar(s) {
  return String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

export async function pagina(request, env, { titulo, descricao, url, capa, cat }) {
  const molde = await env.ASSETS.fetch(new URL('/catalogo/app.html', request.url));
  if (!molde.ok) return new Response('molde nao encontrado', { status: 500 });

  const html = (await molde.text())
    .replace('__TITULO__', escapar(titulo))
    .replace('__META__', metas({ titulo, descricao, url, capa }))
    .replace('<!--DADOS-->', `<script>window.__CAT__=${dados(cat)}</script>`);

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex'
    }
  });
}

// Uma faixa do banco vira o que a página precisa.
export function faixa(r) {
  return {
    id: r.id, title: r.title, kind: r.kind, grp: r.grp,
    bpm: r.bpm || null, key: r.mkey || null, tag: r.tag || null,
    dur: r.dur || 0, mp3: r.mp3_bytes || 0, wav: r.wav_bytes || 0,
    mod: r.src_modified || ''
  };
}
