// Mapa do site pro Google (26/09/2026): home, perfil do @rideblan33 e cada beat tape
// que aparece no perfil. Pasta de artista NUNCA entra (é privada). O link de beat
// (/b/...) também não: ele só redireciona pra home, que já lista os beats.
// Mandar no Search Console: https://caramujorecords.com.br/sitemap.xml

import { tapesDoPerfil, SITE } from './_lib/perfil.js';

export async function onRequestGet({ request, env }) {
  let tapes = [];
  try { tapes = await tapesDoPerfil(request, env); } catch (_) { tapes = []; }
  const url = (loc, prioridade) =>
    `  <url><loc>${loc}</loc><changefreq>weekly</changefreq><priority>${prioridade}</priority></url>`;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    url(SITE + '/', '1.0'),
    url(SITE + '/rideblan33', '0.9'),
    ...tapes.map((t) => url(esc(`${SITE}/${t.slug}/${t.code}`), '0.7')),
    '</urlset>'
  ].join('\n');
  return new Response(xml, {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' }
  });
}
