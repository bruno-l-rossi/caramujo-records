// Mapa do site pro Google (26/09/2026): home, perfil do @rideblan33 e cada beat tape
// que aparece no perfil. Pasta de artista NUNCA entra (é privada). O link de beat
// (/b/...) também não: ele só redireciona pra home.
// 03/10/2026: entram as páginas de gênero (/beats/<genero>) e a de cada beat
// (/beat/<nome>), vendidos inclusive (a página deles mostra os parecidos à venda).
// Mandar no Search Console: https://caramujorecords.com.br/sitemap.xml

import { tapesDoPerfil, SITE } from './_lib/perfil.js';
import { dadosLoja } from './_lib/beatpagina.js';

export async function onRequestGet({ request, env }) {
  const [tapes, loja] = await Promise.all([
    tapesDoPerfil(request, env).catch(() => []),
    dadosLoja(request, env).catch(() => ({ beats: [] }))
  ]);
  const url = (loc, prioridade) =>
    `  <url><loc>${loc}</loc><changefreq>weekly</changefreq><priority>${prioridade}</priority></url>`;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const beats = (loja && loja.beats) || [];
  const generos = [...new Set(beats.map((b) => b.gslug).filter(Boolean))];
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    url(SITE + '/', '1.0'),
    url(SITE + '/rideblan33', '0.9'),
    ...generos.map((g) => url(esc(`${SITE}/beats/${g}`), '0.8')),
    ...(tapes || []).map((t) => url(esc(`${SITE}/${t.slug}/${t.code}`), '0.7')),
    ...beats.filter((b) => b.slug).map((b) => url(esc(`${SITE}/beat/${b.slug}`), b.sold ? '0.4' : '0.6')),
    '</urlset>'
  ].join('\n');
  return new Response(xml, {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' }
  });
}
