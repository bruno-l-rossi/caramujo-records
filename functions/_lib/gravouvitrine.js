// Quem já gravou na vitrine (17/10/2026, opção B do Bruno, sem a contagem de músicas): seção
// própria entre o catálogo de beats e "Produção completa", fotos redondas que deslizam e
// "Ver os N ›" pra página /rideblan33/artistas. Só aparece com o Quem já gravou no ar.
// O servidor põe a seção no lugar do marcador <!--QUEM-GRAVOU--> do index.html (functions/index.js).
import { gravouDeTexto, montarGravou, imgPequena } from './gravou.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const MARCADOR = '<!--QUEM-GRAVOU-->';
const MOSTRA = 12;
// rodada Q (18/10/2026): a fileira mostra que desliza, como a do perfil (degradê, empurrãozinho, setas no computador; vitrine.js)

// o pedaço da meta que a vitrine precisa (vai junto da lista de beats na cópia de 1 minuto)
export function resumoVitrine(valor) {
  try {
    const g = gravouDeTexto(valor);
    if (!g.noAr) return null;
    const m = montarGravou(g);
    if (!m.artistas.length) return null;
    const fora = m.artistas.slice(MOSTRA).filter((a) => a.foto).slice(0, 4).map((a) => imgPequena(a.foto));   // rodada R: grade do "Ver todos"
    return { n: m.artistas.length, a: m.artistas.slice(0, MOSTRA).map((a) => ({ n: a.nome, s: a.slug, f: a.foto ? imgPequena(a.foto) : '' })), x: fora };
  } catch (_) { return null; }
}

const ini = (n) => String(n || '').replace(/^@/, '').split(/[\s_.-]+/).filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';

export function secaoVitrine(r) {
  if (!r || !r.a || !r.a.length) return '';
  const cards = r.a.map((a) => `<a class="qg-card" href="/rideblan33/artistas#${esc(a.s)}" data-de="vitrine-gravou">${a.f
    ? `<img src="${esc(a.f)}" alt="" width="140" height="140" loading="lazy" decoding="async">`
    : `<span class="qg-ini" aria-hidden="true">${esc(ini(a.n))}</span>`}<b>${esc(a.n)}</b></a>`).join('');
  const resto = r.n - r.a.length;
  // rodada R (18/10/2026): o "Ver todos" com a cara do "Portfólio completo" das tapes (4 fotos de quem
  // não apareceu na fileira, numa grade redonda, e o +N por cima)
  const fotos = (r.x || []).concat(r.a.filter((a) => a.f).map((a) => a.f).reverse()).slice(0, 4);
  const mais = resto > 0 ? `<a class="qg-card qg-todos" href="/rideblan33/artistas" data-de="vitrine-gravou" aria-label="Ver todos os ${r.n} artistas"><span class="qg-mais"><span class="qg-mos" aria-hidden="true">${fotos.map((u) => `<img src="${esc(u)}" alt="" width="70" height="70" loading="lazy" decoding="async">`).join('')}</span><span class="qg-veu" aria-hidden="true">+${resto}</span></span><b>Ver todos</b><i class="qg-n">${r.n} artistas</i></a>` : '';
  return `<section id="quemGravou" class="s s-earth qg-vit" aria-labelledby="qgTit">
  <div class="s-head qg-head"><div><span class="s-kicker">Portfólio</span><h2 class="s-title" id="qgTit">Quem já <span class="r">gravou</span></h2></div><span class="qg-dir"><a class="qg-ver" href="/rideblan33/artistas" data-de="vitrine-gravou">Ver os ${r.n} ›</a><span class="qg-setas" hidden><button type="button" id="qgvAnt" aria-label="Artistas anteriores"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg></button><button type="button" id="qgvProx" aria-label="Mais artistas"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button></span></span></div>
  <div class="qg-tr-w"><div class="qg-trilho" id="qgvTr">${cards}${mais}</div></div>
</section>
<div class="hr"></div>`;
}

export function injetarGravou(html, r) {
  return html.includes(MARCADOR) ? html.replace(MARCADOR, secaoVitrine(r)) : html;
}
