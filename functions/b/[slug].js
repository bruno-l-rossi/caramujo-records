// Link de beat com cara de beat: caramujorecords.com.br/b/<nome-do-beat>
//
// Quem cola esse link no Direct, no WhatsApp ou no story vê a prévia com a capa
// da beat tape, o nome e a ficha do beat. Quem toca no link cai no site já com
// o beat na barra do player (/#beat=<slug>), e o ?de=beat marca a origem no funil.
// Os robôs de prévia (Instagram, WhatsApp, iMessage) leem as meta tags e não
// seguem o redirecionamento; gente segue na hora.

import { montarVitrine } from '../api/vitrine.js';
import { precoBeat } from '../_lib/vitrine.js';

const SITE = 'https://caramujorecords.com.br';
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export async function onRequestGet({ params, request, env }) {
  const pedido = String(params.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80);
  const dados = pedido ? await montarVitrine(request, env).catch(() => null) : null;
  const b = dados && dados.find((x) => x.slug === pedido);
  if (!b) return Response.redirect(SITE + '/', 302);

  const destino = '/?de=beat#beat=' + b.slug;
  const preco = precoBeat() || 119;
  const aVenda = dados.filter((x) => !x.sold).length;
  const ficha = [b.genero, b.bpm ? b.bpm + ' BPM' : '', b.key].filter(Boolean).join(' · ');
  const titulo = b.name + ' · beat do Rideblan' + (b.sold ? ' (vendido)' : '');
  const texto = b.sold
    ? `${ficha}. Esse já tem dono. Tem mais ${aVenda} beats exclusivos esperando na Caramujo Records.`
    : `${ficha}. Licença exclusiva por R$${preco}: depois de vendido, ninguém mais usa. Dá o play na Caramujo Records.`;
  const img = b.capa
    ? { url: SITE + b.capa, w: 1000, h: 1000 }
    : { url: SITE + '/og-image.png', w: 1200, h: 630 };

  const html = `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(texto)}">
<meta name="robots" content="noindex">
<link rel="canonical" href="${SITE}/b/${esc(b.slug)}">
<meta property="og:type" content="music.song">
<meta property="og:site_name" content="Caramujo Records">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(texto)}">
<meta property="og:url" content="${SITE}/b/${esc(b.slug)}">
<meta property="og:image" content="${esc(img.url)}">
<meta property="og:image:secure_url" content="${esc(img.url)}">
<meta property="og:image:type" content="image/${b.capa ? 'jpeg' : 'png'}">
<meta property="og:image:width" content="${img.w}">
<meta property="og:image:height" content="${img.h}">
<meta property="og:image:alt" content="Capa da beat tape de ${esc(b.name)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(titulo)}">
<meta name="twitter:description" content="${esc(texto)}">
<meta name="twitter:image" content="${esc(img.url)}">
<meta name="theme-color" content="#14110d">
<meta http-equiv="refresh" content="0;url=${esc(destino)}">
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#14110d;color:#E8E0CF;font:15px 'Helvetica Neue',Helvetica,Arial,sans-serif}a{color:#b98f5e}</style>
</head><body>
<p>Abrindo <a href="${esc(destino)}">${esc(b.name)}</a>…</p>
<script>location.replace(${JSON.stringify(destino)})</script>
</body></html>`;

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300',
      'x-robots-tag': 'noindex'
    }
  });
}
