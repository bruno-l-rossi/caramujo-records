// Rodapé único (rodada R, 18/10/2026). O Bruno notou que o rodapé mudava um pouco de página pra
// página (a de beat e gênero tinha outro espaço, selo maior e letra mais fina; a do pedido era uma
// linha só). Agora vitrine, beat, gênero, perfil, Quem já gravou e pedido usam o mesmo desenho:
// gêneros em cima, selo, "© 2026 Caramujo Records — São Carlos, SP" e "@rideblan33 · Todos os
// direitos reservados". O CSS leva as próprias cores e letras (.rod-cr), então cai igual em
// qualquer página. A vitrine (index.html + vitrine.css) tem o mesmo desenho escrito à mão: o
// teste60 mede as duas e reprova se saírem diferentes.
// A página da beat tape/pasta (catalogo/app.html) fica com o logo no fim do painel: é um tocador
// que rola dentro da caixa, sem rodapé de site.
import { RODAPE_GENEROS, CSS_RODAPE_GENEROS } from './generos.js';
import { deAttr } from './origem.js';

const FONTES = `@font-face{font-family:'Cormorant Garamond';font-style:normal;font-weight:500;font-display:swap;src:url(/assets/fonts/cormorant-garamond-latin-500-normal.woff2) format('woff2')}
@font-face{font-family:'IBM Plex Mono';font-style:normal;font-weight:400;font-display:swap;src:url(/assets/fonts/ibm-plex-mono-latin-400-normal.woff2) format('woff2')}`;

export const RODAPE_CSS = `${FONTES}
footer.rod-cr{--black:#14110d;--wire:#332c22;--dim:#6f6757;--fire:#b98f5e;--read:#b89e72;--clay:#A87B4A;--serif:'Cormorant Garamond',Georgia,serif;
  box-sizing:border-box;width:100%;margin:0;padding:1.4rem 2.4rem calc(1.4rem + env(safe-area-inset-bottom,0px));background:var(--black);border-top:1px solid var(--wire);
  display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:16px;line-height:normal;color:#E8E0CF}
footer.rod-cr a{color:inherit;text-decoration:none}
footer.rod-cr>a{display:block;line-height:0}
footer.rod-cr img{height:30px;width:auto;display:block;opacity:1}
footer.rod-cr p{margin:0;font-size:.57rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--dim)}
footer.rod-cr a.foot-perfil{border-bottom:1px solid var(--wire);transition:color .2s,border-color .2s}
@media (hover:hover){footer.rod-cr a.foot-perfil:hover{color:var(--fire);border-bottom-color:var(--fire)}}
@media (max-width:860px){footer.rod-cr{flex-direction:column;align-items:flex-start;padding:1.2rem 1.2rem calc(1.2rem + env(safe-area-inset-bottom,0px))}footer.rod-cr p{font-size:.63rem}}
@media (max-width:480px){footer.rod-cr{gap:.5rem}}
${CSS_RODAPE_GENEROS.replace(/\.foot-generos/g, 'footer.rod-cr .foot-generos')}
body.com-player footer.rod-cr{padding-bottom:calc(110px + env(safe-area-inset-bottom,0px))}`;

// de = origem do clique no selo (vai pra vitrine)
export function rodape(de = '') {
  return `<footer class="rod-cr">
  ${RODAPE_GENEROS}
  <a href="/"${de ? deAttr(de) : ''} aria-label="Caramujo Records"><img loading="lazy" width="400" height="400" src="/assets/brand/selo-creme.svg" alt="Caramujo Records"></a>
  <p><a class="foot-perfil" href="mailto:contato@caramujorecords.com.br">contato@caramujorecords.com.br</a></p>
  <p>© 2026 Caramujo Records — São Carlos, SP</p>
  <p><a class="foot-perfil" href="/rideblan33">@rideblan33</a> · Todos os direitos reservados</p>
</footer>`;
}
