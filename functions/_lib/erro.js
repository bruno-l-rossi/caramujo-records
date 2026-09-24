// Página de erro com a cara da 404 do site. Serve pra link que não existe e pra
// função de página que quebrou (bug num deploy, banco fora do ar).
// O molde é o próprio 404.html servido: mudou o 404.html, muda tudo junto.

const IG = '<a href="https://ig.me/m/rideblan33" rel="noopener">@rideblan33</a>';

const PADRAO = {
  404: {
    codigo: 'Erro 404',
    titulo: 'Essa página não existe',
    texto: `Ou o link veio cortado, ou o catálogo mudou de endereço. Pede o link de novo pro ${IG}.`
  },
  503: {
    codigo: 'Fora do ar',
    titulo: 'Volta em alguns minutos',
    texto: `Deu um problema do nosso lado e essa página não carregou. Tenta de novo daqui a pouco ou chama o ${IG} no Instagram.`
  }
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Lê o 404.html do próprio site (sem sair pra internet). O Pages pode responder
// o .html com redirecionamento pro endereço sem extensão: sigo uma vez.
async function molde(request, env) {
  try {
    let r = await env.ASSETS.fetch(new URL('/404.html', request.url));
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) {
      r = await env.ASSETS.fetch(new URL(r.headers.get('location'), request.url));
    }
    const html = r.ok ? await r.text() : '';
    return html.includes('<p class="codigo">') ? html : null;
  } catch (_) {
    return null;
  }
}

// Sem o molde (o próprio site fora do ar), uma versão curta na mesma paleta.
function reserva(t) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(t.titulo)} · Caramujo Records</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#14110d;color:#E8E0CF;
font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;padding:2rem 1.4rem}main{max-width:520px}
.codigo{font-family:monospace;font-size:.7rem;letter-spacing:.24em;text-transform:uppercase;color:#A87B4A;margin:0}
h1{font-family:Georgia,serif;font-weight:500;font-size:2.4rem;line-height:1.05;color:#f2ecdf;margin:.5rem 0 0}
p.texto{font-size:.95rem;line-height:1.6;color:#b89e72;margin:1.1rem 0 0}a{color:#b98f5e}</style></head>
<body><main><p class="codigo">${esc(t.codigo)}</p><h1>${esc(t.titulo)}</h1><p class="texto">${t.texto}</p>
<p class="texto"><a href="/">caramujorecords.com.br</a></p></main></body></html>`;
}

// status: 404 (link que não existe) ou 503 (quebrou do nosso lado).
// sob: { codigo, titulo, texto } pra trocar o texto padrão. `texto` aceita o
// link do Instagram montado aqui (use {ig}); o resto é escapado.
export async function paginaErro(request, env, status = 404, sob = {}) {
  const base = PADRAO[status] || PADRAO[404];
  const t = {
    codigo: sob.codigo || base.codigo,
    titulo: sob.titulo || base.titulo,
    texto: sob.texto ? esc(sob.texto).replace('{ig}', IG) : base.texto
  };
  let html = await molde(request, env);
  if (html) {
    const saidas = status === 503
      ? `<div class="saidas">
    <a class="btn fogo" href="${esc(new URL(request.url).pathname)}">Tentar de novo</a>
    <a class="btn fantasma" href="/">Voltar pro início</a>
  </div>`
      : null;
    html = html
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(t.titulo)} · Caramujo Records</title>`)
      .replace(/<p class="codigo">[^<]*<\/p>/, `<p class="codigo">${esc(t.codigo)}</p>`)
      .replace(/<h1>[^<]*<\/h1>/, `<h1>${esc(t.titulo)}</h1>`)
      .replace(/<p class="texto">[\s\S]*?<\/p>/, `<p class="texto">${t.texto}</p>`);
    if (saidas) html = html.replace(/<div class="saidas">[\s\S]*?<\/div>/, saidas);
  } else {
    html = reserva(t);
  }
  const headers = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' };
  if (status === 503) headers['retry-after'] = '120';
  return new Response(html, { status, headers });
}
