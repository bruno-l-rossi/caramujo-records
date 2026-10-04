// Ícone da aba, da tela de início e das buscas: UM lugar só (04/10/2026).
// O selo novo (espiral creme) em todas as páginas. Antes o PNG do celular ainda era o
// caramujo antigo, e por isso a aba do celular mostrava o logo velho.
//   favicon.svg  computador (creme; sépia no tema claro)
//   selo-32.png  navegador que não lê SVG
//   selo-180.png iPhone e iPad (aba, favoritos, tela de início)
//   selo-192/512 Android e Google, pelo /site.webmanifest
// Na raiz do site também tem /favicon.ico, /apple-touch-icon.png e /site.webmanifest:
// página sem estas linhas (ou um PDF, ou o Google) cai neles e acha o selo do mesmo jeito.
// Página nova: coloque ${ICONES} no <head>. Página .html fixa: cole o bloco igual
// (o teste33 confere todas as páginas e falha se alguma ficar sem).

export const ICONES = [
  '<link rel="icon" type="image/svg+xml" href="/assets/brand/favicon.svg">',
  '<link rel="icon" type="image/png" sizes="32x32" href="/assets/brand/selo-32.png">',
  '<link rel="apple-touch-icon" sizes="180x180" href="/assets/brand/selo-180.png">',
  '<link rel="manifest" href="/site.webmanifest">'
].join('\n');

// pra tela de bloqueio (mediaSession) e pro Google quando não há capa
export const SELO_GRANDE = '/assets/brand/selo-512.png';
