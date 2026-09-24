// Rede de segurança das páginas (26/09/2026). Se uma função de página quebrar
// (bug num deploy, banco fora do ar), quem abriu o link vê a página de erro com
// a cara da 404 do site, e não a tela crua da Cloudflare.
// API, áudio, capa e download passam direto, sem try: o checkout, o webhook e
// o player continuam respondendo exatamente como antes.
import { paginaErro } from './_lib/erro.js';

const DIRETO = /^\/(api|audio|capa|dl)\//;

export async function onRequest(ctx) {
  const { pathname } = new URL(ctx.request.url);
  if (DIRETO.test(pathname)) return ctx.next();
  try {
    return await ctx.next();
  } catch (e) {
    console.error('pagina quebrou', pathname, e && e.stack || e);
    return paginaErro(ctx.request, ctx.env, 503);
  }
}
