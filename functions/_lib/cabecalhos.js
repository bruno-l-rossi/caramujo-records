// Os mesmos cabeçalhos do bloco /* do _headers. O _headers não vale pra resposta
// de função, então repito aqui (teste14 confere que os dois batem).
export const CABECALHOS = {
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://sdk.mercadopago.com https://http2.mlstatic.com https://cdn.jsdelivr.net https://cdn.emailjs.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://http2.mlstatic.com; font-src 'self' data: https://http2.mlstatic.com; img-src 'self' data: https:; frame-src https://*.mercadopago.com https://*.mercadolibre.com; media-src 'self' https://som.caramujorecords.com.br; connect-src 'self' https://som.caramujorecords.com.br https://api.mercadopago.com https://*.mercadopago.com https://*.mercadolibre.com https://www.mercadolibre.com https://http2.mlstatic.com https://api.emailjs.com https://cloudflareinsights.com; worker-src blob:; frame-ancestors 'none';"
};
