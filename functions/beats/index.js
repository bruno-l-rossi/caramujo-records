// /beats sem gênero: a lista completa mora na vitrine (03/10/2026)
export function onRequestGet({ request }) {
  return Response.redirect(new URL('/#beats', request.url).href, 302);
}
