// O topo das páginas do servidor igual ao da vitrine (logo, seções, menu de gêneros no mouse,
// anel do @rideblan33, carrinho e o ☰ do celular com o acordeão do BEATS). Saiu do
// beatpagina.js em 11/10/2026 pra página do pedido usar o mesmo. CSS em três partes porque a
// página do beat encaixa cada uma num lugar do CSS dela (a saída ficou igual byte a byte).
import { GENEROS, menuGeneros } from './generos.js';
import { deAttr } from './origem.js';

const CARRINHO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/><path d="M3 4h2l2.4 11.5h11.2L21 7H6"/></svg>';

export const TOPO_CSS = `/* topo igual ao da vitrine */
.topo{position:sticky;top:0;z-index:50;height:54px;display:flex;align-items:center;justify-content:space-between;padding:0 2.4rem;background:rgba(5,4,3,.97);border-bottom:1px solid var(--wire)}
.topo ul{display:flex;list-style:none}
.topo ul a{display:block;font-size:.76rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;padding:0 1rem;line-height:54px}
.topo ul a:hover,.topo ul a.ativo{color:var(--fire)}
.topo .dir{display:flex;align-items:center;gap:14px}
.topo li.tem-sub{position:relative}
.sub-gen{display:none;position:absolute;top:100%;left:0;min-width:340px;background:rgba(5,4,3,.98);border:1px solid var(--wire);border-top:0;padding:14px 20px 16px;z-index:51}
@media(hover:hover) and (pointer:fine){.tem-sub:hover>.sub-gen,.tem-sub:focus-within>.sub-gen{display:block}}
.topo .sub-gen a{line-height:1.2;padding:7px 0;font:500 1.05rem var(--serif);letter-spacing:0;text-transform:none;color:var(--read)}
.topo .sub-gen a:hover,.topo .sub-gen a[aria-current]{color:var(--fire)}
.topo .sub-gen a.sg-todos{font:700 .66rem var(--sans);letter-spacing:.2em;text-transform:uppercase;color:var(--bone);padding:4px 0 12px;margin-bottom:8px;border-bottom:1px solid var(--wire)}
.topo .sub-gen a.sg-todos:hover{color:var(--fire)}
.sg-lista{display:grid;grid-template-columns:1fr 1fr;column-gap:28px}
.anel{width:32px;height:32px;border-radius:50%;border:1px solid var(--clay);overflow:hidden}
.anel img{width:100%;height:100%;object-fit:cover}
.ico-btn{position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--bone)}
.ico-btn svg{width:22px;height:22px}
.ico-btn:hover{color:var(--fire)}
.ico-btn b{position:absolute;top:5px;right:0;font:400 .66rem/1.3 var(--mono);color:var(--black);background:var(--bone);padding:0 .28rem;min-width:16px;text-align:center}
.ico-btn b[hidden]{display:none}
.burger{display:none}
.burger i{display:block;width:22px;height:1.6px;background:var(--bone);margin:5px 0}
.menu-cel{display:none}
`;
export const TOPO_CSS_899 = `@media(max-width:899px){.topo .logo img{width:122px;height:22px}}
`;
export const TOPO_CSS_CEL = `  .topo{padding:0 .7rem 0 1rem}.topo ul{display:none}.burger{display:flex}
  .menu-cel{position:fixed;top:54px;left:0;right:0;z-index:49;background:rgba(5,4,3,.98);border-bottom:1px solid var(--wire);list-style:none;padding:6px 0}
  .menu-cel.on{display:block}
  .menu-cel a{display:block;padding:14px 1rem;font-size:.8rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase}
  .menu-cel a.ativo{color:var(--fire)}
  /* acordeão do BEATS (04/10/2026): "Todos os beats" em destaque + gêneros com quantos à venda */
  .menu-cel{max-height:calc(100vh - 54px);max-height:calc(100dvh - 54px);overflow-y:auto;overscroll-behavior:contain}
  .mc-sub>a{position:relative}
  .mc-sub>a::after{content:'';position:absolute;right:1.2rem;top:50%;width:8px;height:8px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:translateY(-70%) rotate(45deg)}
  .mc-sub.abre>a::after{transform:translateY(-25%) rotate(-135deg)}
  .mc-gen{display:none;padding:2px 1rem 16px;border-bottom:1px solid var(--wire);background:rgba(20,17,13,.6)}
  .mc-sub.abre>.mc-gen{display:block}
  .menu-cel .mc-todos{display:flex;align-items:center;gap:10px;margin:6px 0 10px;padding:15px 16px;border:1px solid var(--clay);background:rgba(185,143,94,.1);color:var(--fire);font-size:.76rem}
  .mc-todos span{flex:1}
  .mc-todos i{font:400 .68rem var(--mono);letter-spacing:.02em;text-transform:none;font-style:normal;color:var(--bone)}
  .mc-todos::after{content:'›';font:500 1.5rem/1 var(--serif);color:var(--fire)}
  .mc-lista{display:grid;grid-template-columns:1fr 1fr;column-gap:24px}
  .menu-cel .mc-lista a{padding:9px 0;font:500 1.12rem/1.2 var(--serif);letter-spacing:0;text-transform:none;color:var(--read)}
  .menu-cel .mc-lista a[aria-current]{color:var(--cream);text-decoration:underline;text-decoration-color:var(--fire);text-decoration-thickness:1px;text-underline-offset:4px}
  .mc-lista a i{font:400 .68rem var(--mono);font-style:normal;color:var(--dim);margin-left:7px}
  .topo .dir{gap:2px}
`;

export function topo(de, genAtual = '', cont = null) {
  const links = [['/#beats', 'Beats', true], ['/#packages', 'Pacotes'], ['/#services', 'Serviços'], ['/#estudio', 'Sobre nós'], ['/#contact', 'Contato']];
  const lis = links.map(([h, t, a]) => `<li><a href="${h}"${a ? ' class="ativo"' : ''}>${t}</a></li>`).join('');
  // celular (04/10/2026, opção A do Bruno): BEATS abre um acordeão com "Todos os beats" em
  // destaque e os gêneros em duas colunas, com quantos estão à venda
  const n = (x) => (x ? `<i>${x}</i>` : '');
  const acordeao = `<li class="mc-sub"><a href="/#beats" class="ativo" aria-expanded="false" aria-controls="mcGen">Beats</a><div class="mc-gen" id="mcGen"><a class="mc-todos" href="/#beats"${deAttr(de)}><span>Todos os beats</span>${cont && cont.total ? `<i>${cont.total} à venda</i>` : ''}</a><div class="mc-lista">${GENEROS.map(([sl, nm]) => `<a href="/beats/${sl}"${sl === genAtual ? ' aria-current="page"' : ''}>${nm}${n(cont && cont.por.get(sl))}</a>`).join('')}</div></div></li>`;
  const lisCel = lis.replace('<li><a href="/#beats" class="ativo">Beats</a></li>', acordeao);
  // no computador, o mouse em BEATS abre "Todos os beats" e os gêneros (04/10/2026)
  const lisTopo = lis.replace('<li><a href="/#beats" class="ativo">Beats</a></li>', `<li class="tem-sub"><a href="/#beats" class="ativo" aria-haspopup="true">Beats</a>${menuGeneros('/#beats', genAtual)}</li>`);
  return `<header class="topo">
<a class="logo" href="/"${deAttr(de)} aria-label="Caramujo Records, página inicial"><img src="/assets/brand/caramujo-h.webp" srcset="/assets/brand/caramujo-h-244.webp 244w, /assets/brand/caramujo-h-366.webp 366w, /assets/brand/caramujo-h.webp 504w" sizes="(max-width:899px) 122px, 148px" alt="Caramujo Records" width="148" height="27"></a>
<nav aria-label="Seções do site"><ul>${lisTopo}</ul></nav>
<div class="dir">
<a class="anel" href="/rideblan33"${deAttr(de)} aria-label="Portfólio do @rideblan33"><img src="/assets/perfil/rideblan33-camisa.webp" alt="" width="128" height="128"></a>
<a class="ico-btn js-carrinho" href="/#carrinho"${deAttr(de)} aria-label="Abrir o carrinho">${CARRINHO}<b class="js-n" hidden>0</b></a>
<button class="ico-btn burger js-menu" type="button" aria-label="Abrir o menu" aria-expanded="false" aria-controls="menuCel"><span><i></i><i></i><i></i></span></button>
</div>
</header>
<ul class="menu-cel" id="menuCel">${lisCel}</ul>`;
}
