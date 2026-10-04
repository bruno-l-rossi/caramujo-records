// Gêneros do site em um lugar só (04/10/2026): o rodapé "Beats por gênero" e o menu do
// BEATS (passar o mouse) das páginas montadas aqui (perfil, beat, gênero). A vitrine
// (index.html, página fixa) leva o mesmo HTML colado: o teste35 confere que bate.
// Ordem = a das pílulas da vitrine. Gênero novo na loja: entra aqui E nas pílulas do
// index.html (a página do gênero e o sitemap já aparecem sozinhos).

export const GENEROS = [
  ['trap', 'Trap'], ['boom-bap', 'Boom Bap'], ['plug', 'Plug'], ['hood-trap', 'Hood Trap'],
  ['experimental', 'Experimental'], ['hard', 'Hard'], ['detroit', 'Detroit'], ['drumless', 'Drumless'],
  ['funk', 'Funk'], ['pluggnb', 'Pluggnb'], ['bounce', 'Bounce'], ['no-melody', 'No Melody'], ['drill', 'Drill']
];

const links = (atual) => GENEROS.map(([s, n]) => `<a href="/beats/${s}"${s === atual ? ' aria-current="page"' : ''}>${n}</a>`).join('');

// Rodapé: a linha de gêneros em cima do selo e do copyright
export const RODAPE_GENEROS = `<div class="foot-generos" role="navigation" aria-label="Beats por gênero"><span class="fg-k">Beats por gênero</span>${links()}</div>`;

// Menu do BEATS no computador: "Todos os beats" + os gêneros em duas colunas
export const menuGeneros = (todos = '/#beats', atual = '') =>
  `<div class="sub-gen"><a class="sg-todos" href="${todos}">Todos os beats</a><div class="sg-lista">${links(atual)}</div></div>`;

// O estilo do rodapé (o do menu depende do topo de cada página e mora lá)
export const CSS_RODAPE_GENEROS = `.foot-generos{flex-basis:100%;align-self:stretch;display:flex;flex-wrap:wrap;align-items:baseline;gap:.4rem 1.15rem;padding:0 0 1.15rem;border-bottom:1px solid var(--wire)}
.foot-generos .fg-k{font-family:'IBM Plex Mono',monospace;font-size:.62rem;letter-spacing:.22em;text-transform:uppercase;color:var(--clay,#A87B4A);margin-right:.5rem}
.foot-generos a{font-family:var(--serif);font-size:1.05rem;font-weight:500;letter-spacing:0;text-transform:none;color:var(--read);text-decoration:none;transition:color .2s}
.foot-generos a:hover,.foot-generos a[aria-current]{color:var(--fire)}
@media(max-width:760px){.foot-generos{gap:.35rem .95rem}.foot-generos .fg-k{flex-basis:100%;margin:0 0 .2rem}}`;
