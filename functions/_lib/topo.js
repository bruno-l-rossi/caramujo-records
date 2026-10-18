// O topo das páginas do servidor igual ao da vitrine (logo, seções, menu de gêneros no mouse,
// anel do @rideblan33, carrinho e o ☰ do celular com o acordeão do BEATS). Saiu do
// beatpagina.js em 11/10/2026 pra página do pedido usar o mesmo. CSS em três partes porque a
// página do beat encaixa cada uma num lugar do CSS dela (a saída ficou igual byte a byte).
import { GENEROS, menuGeneros } from './generos.js';
import { deAttr } from './origem.js';

const CARRINHO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/><path d="M3 4h2l2.4 11.5h11.2L21 7H6"/></svg>';

// Rodada Q (18/10/2026, proposta A do Bruno): o MESMO topo em todas as páginas (vitrine, beat, gênero,
// pedido, perfil, Quem já gravou, beat tape, 404) com o "?" de Ajuda: a folha tem 3 respostas curtas e o
// "Fale conosco" (Direct do Instagram). TOPO_PAGINA_CSS traz as cores e letras do topo presas nele mesmo,
// pra páginas com outra paleta (perfil, artistas, tape) usarem sem mexer no resto. TOPO_JS faz o menu, o
// número do carrinho e a Ajuda (uma vez só por página).
export const DIRECT = 'https://ig.me/m/rideblan33';
const ICO_AJUDA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.2"/><path d="M9.4 9.3a2.7 2.7 0 015.2 1c0 1.8-2.6 2.2-2.6 3.8"/><path d="M12 17.2h.01"/></svg>';
const ICO_IG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none"/></svg>';
// a folha da Ajuda (respostas com o que o site já promete; o resto vai pro Direct)
export const AJUDA_HTML = `<div class="aj-veu js-aj-fecha" hidden></div><div class="aj-folha" id="ajudaFolha" role="dialog" aria-modal="true" aria-labelledby="ajT" hidden><button class="aj-x js-aj-fecha" type="button" aria-label="Fechar">×</button><h2 id="ajT">Ajuda</h2>
<details open><summary>Como funciona a licença?</summary><p>Exclusiva: o beat é vendido uma vez só e sai da loja. Contrato no seu nome, com uso comercial liberado.</p></details>
<details><summary>Quando eu recebo o beat?</summary><p>MP3 + WAV com entrega instantânea, pelo link do pedido.</p></details>
<details><summary>Tem desconto no PIX?</summary><p>Tem: no PIX o total sai 5% mais barato.</p></details>
<a class="aj-dm" href="${DIRECT}" target="_blank" rel="noopener" data-rede="ajuda-direct">${ICO_IG}<span>Fale conosco</span><small>Direct · @rideblan33</small></a>
<a class="aj-pdf" href="/termos-de-licenca.pdf" target="_blank" rel="noopener">Termos da licença (PDF) ›</a></div>`;
export const AJUDA_CSS = `/* Ajuda (rodada Q) */
.aj-bt,.topo .aj-bt{width:auto;gap:8px;padding:0 12px;height:36px;border:1px solid var(--wire);border-radius:999px;margin-right:6px;cursor:pointer;background:none}
.aj-bt svg{width:18px;height:18px}
.aj-bt span{font:700 .66rem var(--sans);letter-spacing:.18em;text-transform:uppercase}
.aj-bt:hover,.topo .aj-bt:hover{border-color:var(--fire)}
.aj-veu{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.55)}
.aj-folha{position:fixed;z-index:61;top:54px;right:2.4rem;width:400px;max-height:calc(100vh - 70px);overflow-y:auto;background:#1b1712;border:1px solid var(--wire);border-top:0;padding:20px 20px 22px;box-shadow:0 20px 40px rgba(0,0,0,.6);color:var(--bone);font-family:var(--sans);text-align:left}
.aj-veu[hidden],.aj-folha[hidden]{display:none}
.aj-folha h2{margin:0 40px 6px 0;font:500 1.7rem/1.1 var(--serif);color:var(--cream);letter-spacing:0;text-transform:none}
.aj-x{position:absolute;top:12px;right:10px;width:40px;height:40px;border:0;background:none;color:var(--read);font-size:1.6rem;line-height:1;cursor:pointer}
.aj-folha details{border-top:1px solid var(--wire);padding:12px 0}
.aj-folha summary{display:flex;justify-content:space-between;gap:12px;cursor:pointer;list-style:none;font-size:.84rem;font-weight:600;color:var(--cream)}
.aj-folha summary::-webkit-details-marker{display:none}
.aj-folha summary::after{content:'+';color:var(--fire);font-weight:400}
.aj-folha details[open] summary::after{content:'–'}
.aj-folha details p{margin:8px 0 0;font-size:.8rem;line-height:1.6;color:var(--read)}
.aj-dm{display:flex;align-items:center;gap:12px;min-height:52px;padding:0 16px;margin-top:14px;background:var(--cream);color:#14110d;font:700 .74rem var(--sans);letter-spacing:.16em;text-transform:uppercase;text-decoration:none}
.aj-dm svg{width:18px;height:18px;flex:none}
.aj-dm small{margin-left:auto;font:400 .68rem var(--mono);letter-spacing:0;text-transform:none;color:#5a4a36}
.aj-dm:hover{background:#fff}
.aj-pdf{display:inline-block;margin-top:14px;font-size:.76rem;color:var(--read);border-bottom:1px solid var(--wire);padding-bottom:2px;text-decoration:none}
.menu-cel .mc-aj{color:var(--fire)}
`;
export const TOPO_CSS = `/* topo igual ao da vitrine */
.topo{position:sticky;top:0;z-index:50;height:54px;display:flex;align-items:center;justify-content:space-between;padding:0 2.4rem;background:rgba(5,4,3,.97);border-bottom:1px solid var(--wire)}
.topo ul{display:flex;list-style:none}
.topo ul a{display:block;font-size:.76rem;font-weight:700;letter-spacing:.22em;text-transform:uppercase;padding:0 1rem;line-height:54px;color:var(--read)}
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
${AJUDA_CSS}`;
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
  .aj-bt,.topo .aj-bt{border:0;padding:0;width:44px;height:44px;margin:0;justify-content:center}.aj-bt span{display:none}.aj-bt svg{width:22px;height:22px}
  .aj-folha{left:0;right:0;width:auto;border-left:0;border-right:0}
`;
// pra páginas com outra paleta: as cores, letras e o básico do topo presos nele mesmo
const VARS = '--black:#14110d;--clay:#A87B4A;--amber:#c3a074;--bone:#E8E0CF;--cream:#f2ecdf;--fire:#b98f5e;--dim:#6f6757;--wire:#332c22;--read:#b89e72;--serif:\'Cormorant Garamond\',Georgia,serif;--sans:\'Helvetica Neue\',Helvetica,Arial,sans-serif;--mono:\'IBM Plex Mono\',ui-monospace,monospace';
export const TOPO_PAGINA_CSS = `@font-face{font-family:'Cormorant Garamond';font-weight:500;font-display:swap;src:url(/assets/fonts/cormorant-garamond-latin-500-normal.woff2) format('woff2')}
.topo,.menu-cel,.aj-folha,.aj-veu{${VARS};box-sizing:border-box;font-family:var(--sans);-webkit-font-smoothing:antialiased}
.topo *,.menu-cel *,.aj-folha *{box-sizing:border-box}
.topo a,.menu-cel a{color:var(--bone);text-decoration:none}.topo ul,.menu-cel{margin:0;padding:0}
.topo button{font:inherit;color:var(--bone);background:none;border:0;cursor:pointer}.topo img{display:block}
.topo ul a{color:var(--read)}.topo ul a.ativo,.topo ul a:hover{color:var(--fire)}
.menu-cel .mc-aj{color:var(--fire)}
${TOPO_CSS}${TOPO_CSS_899}@media(max-width:860px){
${TOPO_CSS_CEL}}`;
export const TOPO_JS = `<script>(function(){if(window.__topo)return;window.__topo=1;var $=function(s){return document.querySelector(s)};
try{var c=JSON.parse(localStorage.getItem('caramujo_carrinho_v1')||'null');if(c&&c.itens&&c.itens.length&&Date.now()-(c.em||0)<7*864e5){var n=c.itens.reduce(function(s,x){return s+(x.qty||1)},0),b=$('.js-n');if(b){b.textContent=n;b.hidden=false}}}catch(_){}
var mb=$('.js-menu'),mc=$('#menuCel');function menu(on){if(!mb||!mc)return;mc.classList.toggle('on',on);mb.setAttribute('aria-expanded',on?'true':'false')}
if(mb&&mc)mb.addEventListener('click',function(){menu(!mc.classList.contains('on'))});
var ms=$('.mc-sub>a');if(ms)ms.addEventListener('click',function(e){e.preventDefault();var li=ms.parentNode,on=!li.classList.contains('abre');li.classList.toggle('abre',on);ms.setAttribute('aria-expanded',on?'true':'false')});
var fo=null,veu=null,ab=null;function aj(on,de){fo=fo||$('#ajudaFolha');veu=veu||$('.aj-veu');if(!fo||!veu)return;fo.hidden=!on;veu.hidden=!on;[].forEach.call(document.querySelectorAll('.js-ajuda'),function(b){b.setAttribute('aria-expanded',on?'true':'false')});if(on){menu(false);ab=de||null;var x=fo.querySelector('.aj-x');if(x)x.focus()}else if(ab){ab.focus();ab=null}}
document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('.js-ajuda,.js-aj-fecha');if(!t)return;e.preventDefault();if(t.classList.contains('js-ajuda')){var f=$('#ajudaFolha');aj(!!(f&&f.hidden),t)}else aj(false)});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&fo&&!fo.hidden)aj(false)});
})();</script>`;

export function topo(de, genAtual = '', cont = null, { ativo = 'beats' } = {}) {
  const links = [['/#beats', 'Beats', true], ['/#services', 'Serviços'], ['/#estudio', 'Sobre nós'], ['/#contact', 'Contato']];
  const lis = links.map(([h, t, a]) => `<li><a href="${h}"${a ? ' class="ativo"' : ''}>${t}</a></li>`).join('');
  const semAtivo = (x) => (ativo === 'beats' ? x : x.replace(/ class="ativo"/g, ''));
  // celular (04/10/2026, opção A do Bruno): BEATS abre um acordeão com "Todos os beats" em
  // destaque e os gêneros em duas colunas, com quantos estão à venda
  const n = (x) => (x ? `<i>${x}</i>` : '');
  const acordeao = `<li class="mc-sub"><a href="/#beats" class="ativo" aria-expanded="false" aria-controls="mcGen">Beats</a><div class="mc-gen" id="mcGen"><a class="mc-todos" href="/#beats"${deAttr(de)}><span>Todos os beats</span>${cont && cont.total ? `<i>${cont.total} à venda</i>` : ''}</a><div class="mc-lista">${GENEROS.map(([sl, nm]) => `<a href="/beats/${sl}"${sl === genAtual ? ' aria-current="page"' : ''}>${nm}${n(cont && cont.por.get(sl))}</a>`).join('')}</div></div></li>`;
  const lisCel = lis.replace('<li><a href="/#beats" class="ativo">Beats</a></li>', acordeao);
  // no computador, o mouse em BEATS abre "Todos os beats" e os gêneros (04/10/2026)
  const lisTopo = lis.replace('<li><a href="/#beats" class="ativo">Beats</a></li>', `<li class="tem-sub"><a href="/#beats" class="ativo" aria-haspopup="true">Beats</a>${menuGeneros('/#beats', genAtual)}</li>`);
  return `<header class="topo">
<a class="logo" href="/"${deAttr(de)} aria-label="Caramujo Records, página inicial"><img src="/assets/brand/caramujo-h.webp" srcset="/assets/brand/caramujo-h-244.webp 244w, /assets/brand/caramujo-h-366.webp 366w, /assets/brand/caramujo-h.webp 504w" sizes="(max-width:899px) 122px, 148px" alt="Caramujo Records" width="148" height="27"></a>
<nav aria-label="Seções do site"><ul>${semAtivo(lisTopo)}</ul></nav>
<div class="dir">
<button class="ico-btn aj-bt js-ajuda" type="button" aria-haspopup="dialog" aria-controls="ajudaFolha" aria-expanded="false" aria-label="Ajuda">${ICO_AJUDA}<span>Ajuda</span></button>
<a class="anel" href="/rideblan33"${deAttr(de)} aria-label="Portfólio do @rideblan33"><img src="/assets/perfil/rideblan33-camisa.webp" alt="" width="128" height="128"></a>
<a class="ico-btn js-carrinho" href="/#carrinho"${deAttr(de)} aria-label="Abrir o carrinho">${CARRINHO}<b class="js-n" hidden>0</b></a>
<button class="ico-btn burger js-menu" type="button" aria-label="Abrir o menu" aria-expanded="false" aria-controls="menuCel"><span><i></i><i></i><i></i></span></button>
</div>
</header>
<ul class="menu-cel" id="menuCel">${semAtivo(lisCel)}<li><a href="#ajuda" class="mc-aj js-ajuda" aria-controls="ajudaFolha">Ajuda</a></li><li><a href="/rideblan33"${deAttr(de)}>@rideblan33</a></li></ul>
${AJUDA_HTML}`;
}
