// Endereço antigo do PDF de termos (07/10/2026). Até agosto o arquivo morava na raiz
// (/termos-de-licenca.pdf) e o Google guardou esse endereço; desde que foi pra
// /assets/ ele dava 404 e aparecia no Search Console como "Rastreada, mas não
// indexada". Aqui ele aponta de vez (301) pro arquivo atual, que é noindex no _headers:
// é documento de apoio do checkout, não página pra aparecer na busca.
export function onRequest() {
  return new Response(null, {
    status: 301,
    headers: { location: '/assets/termos-de-licenca.pdf', 'cache-control': 'public, max-age=86400' }
  });
}
