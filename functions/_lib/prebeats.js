// Links dos beats no HTML que o servidor manda (04/11/2026, rodada AF, Search Console).
// A lista do catálogo (vitrine) e a das beat tapes nascem no navegador, pelo JS. No HTML cru não tinha
// nenhum <a href="/beat/...">, e o Google achava as 97 páginas de beat só pelo sitemap ("Detectada, mas
// não indexada"). Agora a página já sai com a lista dos beats em links simples, no lugar onde o JS monta
// a lista de verdade. Com JS (quase todo mundo), html.js esconde ela e a lista de sempre aparece; sem JS,
// ela é a lista. O mesmo conteúdo nos dois casos: nome do beat linkando pra página dele.
import { slug } from './casar.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const MARCA = '<!--PRE-BEATS-->';
// a classe js no <html>, antes da 1ª pintura (o mesmo trecho no index.html e no catalogo/app.html)
export const JS_CLASSE = "<script>/* js-classe */document.documentElement.className+=' js'</script>";

// beats = [{ name, slug?, bpm, sold }]; titulo = o rótulo da lista
export function preBeats(beats, titulo = 'Todos os beats') {
  const itens = (beats || []).map((b) => ({ ...b, slug: b.slug || slug(b.name) })).filter((b) => b.slug && b.name);
  if (!itens.length) return '';
  const lis = itens.map((b) => `<li><a href="/beat/${esc(b.slug)}">${esc(b.name)}</a>${b.bpm ? ` <span>${Number(b.bpm)} BPM${b.sold ? ' · vendido' : ''}</span>` : b.sold ? ' <span>vendido</span>' : ''}</li>`).join('');
  return `<nav class="pre-beats" aria-label="${esc(titulo)}"><p>${esc(titulo)}</p><ul>${lis}</ul></nav>`;
}

export const injetarPreBeats = (html, beats, titulo) => html.replace(MARCA, () => preBeats(beats, titulo));
