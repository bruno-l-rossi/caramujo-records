// Página de cada beat (/beat/<nome>) e de cada gênero (/beats/<genero>), 03/10/2026.
// Pedido do Bruno: o Google achar o beat pelo nome e pela busca do gênero ("beat boom
// bap exclusivo"). Montadas no servidor (o Google lê o HTML pronto), com a lista da
// vitrine, os preços do próprio index.html e as tapes do perfil.
//
// O link que o Bruno compartilha continua o /b/<nome> (abre a vitrine com o beat
// tocando). Estas páginas são pra quem chega pelo Google. Carrinho e pagamento
// moram só na vitrine: o botão leva pra /#add=<nome> (o beat entra no carrinho, que
// abre) e o carrinho do topo pra /#carrinho. Nada do checkout é refeito aqui.
//
// Desenho aprovado no canvas "Página por beat e por gênero" (03/10/2026), com os
// ajustes do Bruno: sem texto descritivo na página do beat, "Beats parecidos",
// pacotes de 2 e 3 com o selo de % off, beat vendido com o preço riscado e "Podem te
// interessar", e o texto do gênero sem "em São Carlos, SP".

import { montarVitrine } from '../api/vitrine.js';
import { lerEstatico } from './loja.js';
import { tapesDoPerfil, SITE } from './perfil.js';
import { ICONES } from './icones.js';
import { RODAPE_GENEROS, menuGeneros, CSS_RODAPE_GENEROS } from './generos.js';
import { slug } from './casar.js';
import { CABECALHOS } from './cabecalhos.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const jsonSeguro = (o) => JSON.stringify(o).replace(/[<>&\u2028\u2029]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
const mmss = (s) => { s = Math.max(0, Math.round(Number(s) || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const real = (v) => 'R$ ' + String(v).replace('.', ',');

/* ---------- dados ---------- */

// Tom em português pro chip e pra descrição do Google: Dm = Ré menor, Abmaj = Lá bemol maior
const NOTA = { C: 'Dó', 'C#': 'Dó sustenido', Db: 'Ré bemol', D: 'Ré', 'D#': 'Ré sustenido', Eb: 'Mi bemol', E: 'Mi', F: 'Fá', 'F#': 'Fá sustenido', Gb: 'Sol bemol', G: 'Sol', 'G#': 'Sol sustenido', Ab: 'Lá bemol', A: 'Lá', 'A#': 'Lá sustenido', Bb: 'Si bemol', B: 'Si' };
export function tomPt(k) {
  const m = String(k || '').trim().match(/^([A-G](?:#|b)?)\s*(maj|major|min|minor|m)?$/i);
  if (!m) return '';
  const nota = NOTA[m[1][0].toUpperCase() + (m[1][1] || '')];
  if (!nota) return '';
  const menor = m[2] && /^m(in(or)?)?$/i.test(m[2]) && m[2] !== 'M';
  return nota + (menor ? ' menor' : ' maior');
}

// Slug do gênero pelo nome que a vitrine mostra: Boom Bap = boom-bap, No Melody = no-melody
export const slugGenero = (rotulo) => slug(rotulo);

// Pacotes da vitrine (addPkg('2 Beats',219)) com o desconto sobre o avulso
export function pacotes(precos) {
  const unit = precos && precos.beat;
  const out = [];
  for (const [nome, preco] of Object.entries((precos && precos.pacotes) || {})) {
    const n = Number((String(nome).match(/^(\d+)\s*beats?$/i) || [])[1]);
    if (!n || !preco || !unit) continue;
    const off = Math.round((1 - preco / (n * unit)) * 100);
    if (off > 0) out.push({ n, preco, off });
  }
  return out.sort((a, b) => a.n - b.n);
}

export async function dadosLoja(request, env) {
  const [vit, est, tapes] = await Promise.all([
    montarVitrine(request, env).catch(() => null),
    lerEstatico(request, env).catch(() => null),
    tapesDoPerfil(request, env).catch(() => [])
  ]);
  const beats = (Array.isArray(vit) ? vit : []).map((b) => ({ ...b, gslug: slugGenero(b.genero || b.genre) }));
  const porCapa = new Map();
  for (const t of tapes || []) if (t.capa && !porCapa.has(t.capa)) porCapa.set(t.capa, t);
  const precos = (est && est.precos) || {};
  return { beats, precos, preco: precos.beat || (est && est.preco) || 119, pacotes: pacotes(precos), porCapa };
}

// A tape do perfil de onde vem a capa do beat (a capa do beat É a capa da tape)
export function tapeDo(b, porCapa) {
  const key = b.capa ? String(b.capa).replace(/^\/capa\//, '') : '';
  return key ? porCapa.get(key) || null : null;
}

// Parecidos: mesmo gênero, à venda, BPM mais perto (mesmo tom desempata); faltou, completa com outros gêneros
export function parecidos(b, beats, n = 4) {
  const dist = (x) => Math.abs((Number(x.bpm) || 0) - (Number(b.bpm) || 0)) + (x.key && x.key === b.key ? -0.5 : 0);
  const ok = (x) => x.id !== b.id && !x.sold && x.mp3;
  const mesmos = beats.filter((x) => ok(x) && x.genre === b.genre).sort((x, y) => dist(x) - dist(y));
  const outros = beats.filter((x) => ok(x) && x.genre !== b.genre).sort((x, y) => dist(x) - dist(y));
  return mesmos.concat(outros).slice(0, n);
}

/* ---------- pedaços de HTML ---------- */

const ICO = {
  cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/><path d="M3 4h2l2.4 11.5h11.2L21 7H6"/></svg>',
  ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  play: '<svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>',
  pause: '<svg class="i-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>',
  prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h2v14H6zM20 5v14L9 12z" fill="currentColor"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 5h2v14h-2zM4 5v14l11-7z" fill="currentColor"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="18" cy="5" r="2.4"/><circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="19" r="2.4"/><path d="M8.2 10.9l7.6-4.4M8.2 13.1l7.6 4.4"/></svg>',
  ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r=".9" fill="currentColor"/></svg>'
};
const PLAYPAUSE = ICO.play + ICO.pause;

const CSS = `
@font-face{font-family:'Cormorant Garamond';font-weight:500;font-display:swap;src:url(/assets/fonts/cormorant-garamond-latin-500-normal.woff2) format('woff2')}
@font-face{font-family:'Cormorant Garamond';font-weight:600;font-display:swap;src:url(/assets/fonts/cormorant-garamond-latin-600-normal.woff2) format('woff2')}
@font-face{font-family:'Cormorant Garamond';font-weight:500;font-style:italic;font-display:swap;src:url(/assets/fonts/cormorant-garamond-latin-500-italic.woff2) format('woff2')}
@font-face{font-family:'IBM Plex Mono';font-weight:400;font-display:swap;src:url(/assets/fonts/ibm-plex-mono-latin-400-normal.woff2) format('woff2')}
:root{--black:#14110d;--deep:#1A1815;--mole:#221e18;--earth:#2a241c;--loam:#3a3127;--clay:#A87B4A;--amber:#c3a074;--bone:#E8E0CF;--cream:#f2ecdf;--blood:#8C3B2E;--fire:#b98f5e;--dim:#6f6757;--wire:#332c22;--read:#b89e72;--label:#9e7c48;
  --serif:'Cormorant Garamond',Georgia,serif;--sans:'Helvetica Neue',Helvetica,Arial,sans-serif;--mono:'IBM Plex Mono',ui-monospace,monospace}
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%}
body{background:var(--black);color:var(--bone);font-family:var(--sans);-webkit-font-smoothing:antialiased;overflow-x:hidden}
a{color:inherit;text-decoration:none}
button{font:inherit;color:inherit;background:none;border:0;cursor:pointer}
img{display:block}
:focus-visible{outline:2px solid var(--fire);outline-offset:2px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
/* topo igual ao da vitrine */
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
.wrap{max-width:1120px;margin:0 auto;padding:0 2.4rem}
.migalha{font:400 .66rem var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--label);padding:22px 0 18px;display:flex;flex-wrap:wrap;gap:.6em}
.migalha a{color:var(--read)}.migalha a:hover{color:var(--fire)}.migalha .bar{color:var(--dim)}
.kicker{font-size:.62rem;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:var(--clay)}
.off{display:inline-block;vertical-align:1px;margin-left:6px;font:700 .56rem/1 var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--black);background:var(--fire);padding:.3rem .42rem}
/* linhas no estilo da vitrine */
.lista{list-style:none;border-top:1px solid var(--wire)}
.item{display:flex;align-items:center;gap:14px;padding:11px 10px;border-bottom:1px solid var(--wire);position:relative;cursor:pointer;transition:background .14s}
.item:hover,.item.tocando{background:var(--deep)}
.item:before{content:'';position:absolute;left:0;top:0;bottom:0;width:2px;background:var(--fire);transform:scaleY(0);transition:transform .16s ease}
.item:hover:before,.item.tocando:before{transform:scaleY(1)}
.item .num{width:30px;height:30px;flex:none;display:flex;align-items:center;justify-content:center;font:400 .72rem var(--mono);color:var(--dim)}
.item .num i{font-style:normal}
.item .num svg{width:13px;height:13px;display:none}
.item:hover .num,.item.tocando .num{background:var(--mole);border:1px solid var(--wire);color:var(--bone)}
.item.tocando .num{background:var(--fire);border-color:var(--fire);color:var(--black)}
.item:hover .num i,.item.tocando .num i{display:none}
.item:hover .num .i-play,.item.tocando:not(.rodando) .num .i-play,.item.tocando.rodando .num .i-pause{display:block}
.item.tocando.rodando:hover .num .i-play{display:none}
.capinha{width:46px;height:46px;flex:none;border:1px solid var(--wire);background:var(--mole);object-fit:cover}
.capinha.vazia{display:flex;align-items:center;justify-content:center}.capinha.vazia img{opacity:.3}
.item .info{flex:1;min-width:0}
.item .nome{display:block;font:600 1.28rem/1.15 var(--serif);color:var(--cream);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.item .nome:hover{color:var(--fire)}
@media(hover:hover) and (pointer:fine){.item:not(.fora) a.nome:hover{text-decoration:underline;text-decoration-color:var(--fire);text-decoration-thickness:1px;text-underline-offset:4px}}
.item .ficha{font:400 .7rem var(--mono);color:var(--read);margin-top:3px;letter-spacing:.02em}
.item .ficha em{font-style:normal;color:var(--clay);text-transform:uppercase;font-size:.64rem;letter-spacing:.1em}
.item .dur{flex:none;font:400 .72rem var(--mono);color:var(--dim)}
.item .corrida{position:absolute;left:0;bottom:-1px;height:2px;background:var(--fire)}
.preco{flex:none;display:inline-flex;align-items:center;gap:7px;background:var(--bone);color:var(--black);border:1px solid var(--bone);font:500 .76rem var(--mono);padding:.52rem .8rem;white-space:nowrap;transition:background .14s,border-color .14s}
.preco svg{width:15px;height:15px}
.preco:hover,.preco.no-carrinho{background:var(--fire);border-color:var(--fire)}
.vendido{flex:none;font-size:.58rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--blood);border:1px solid var(--blood);padding:.52rem .8rem}
.item.fora .nome{color:var(--amber);text-decoration:line-through;text-decoration-color:var(--blood);text-decoration-thickness:1.5px}
.btn{display:flex;align-items:center;justify-content:center;gap:10px;height:52px;padding:0 26px;background:var(--bone);color:var(--black);font-size:.8rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;transition:background .14s}
.btn svg{width:18px;height:18px}
.btn:hover,.btn.no-carrinho{background:var(--fire)}
.secao{margin-top:64px}
.secao .cab{display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin-bottom:16px}
.secao h2{font:500 2.2rem/1.1 var(--serif);color:var(--cream)}
.secao .ver{font-size:.66rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--fire);white-space:nowrap}
.rodape{margin-top:72px;padding:1.4rem 2.4rem;border-top:1px solid var(--wire);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;font-size:.6rem;letter-spacing:.2em;text-transform:uppercase;color:var(--dim)}
.rodape img{opacity:.85}
.rodape a{color:var(--read);text-decoration:underline;text-underline-offset:3px}
${CSS_RODAPE_GENEROS}
.aviso{position:fixed;left:50%;bottom:24px;transform:translate(-50%,20px);opacity:0;pointer-events:none;z-index:80;background:var(--bone);color:var(--black);font:500 .78rem var(--mono);padding:.7rem 1rem;transition:opacity .2s,transform .2s}
.aviso.on{opacity:1;transform:translate(-50%,0)}
body.tocando .aviso{bottom:96px}

/* ===== página do beat ===== */
.beat{display:grid;grid-template-columns:440px minmax(0,1fr);grid-template-areas:'capa info' 'tape info';grid-template-rows:auto 1fr;column-gap:56px;row-gap:18px;align-items:start}
.capa-g{grid-area:capa;position:relative;border:1px solid var(--wire);background:var(--mole);aspect-ratio:1}
.capa-g>img{width:100%;height:100%;object-fit:cover}
.capa-g.vazia{display:flex;align-items:center;justify-content:center}.capa-g.vazia>img{width:30%;height:auto;opacity:.25}
.capa-g .tocar{position:absolute;left:14px;bottom:14px;width:56px;height:56px;background:var(--fire);color:var(--black);display:flex;align-items:center;justify-content:center}
.capa-g .tocar svg{width:22px;height:22px}
.capa-g .selo{position:absolute;left:14px;top:14px;font-size:.6rem;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:var(--cream);background:rgba(20,17,13,.82);border:1px solid var(--blood);padding:.5rem .75rem}
.beat.fora .capa-g>img{filter:grayscale(.5) brightness(.72)}
.js-tocar .i-pause,.js-todos .i-pause{display:none}.js-tocar.rodando .i-play,.js-todos.rodando .i-play{display:none}.js-tocar.rodando .i-pause,.js-todos.rodando .i-pause{display:block}
.beat .info{grid-area:info;min-width:0}
.beat h1{font:500 4.2rem/.95 var(--serif);color:var(--cream);letter-spacing:.005em;margin:14px 0 10px;overflow-wrap:anywhere}
.beat .por{font-size:.86rem;color:var(--read)}
.beat .por a{color:var(--bone);font-weight:700;border-bottom:1px solid var(--clay);padding-bottom:1px}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:22px;list-style:none}
.chips li{font:400 .74rem var(--mono);letter-spacing:.06em;color:var(--amber);border:1px solid var(--wire);padding:.38rem .6rem}
.tocador{display:flex;align-items:center;gap:14px;margin-top:26px;padding:14px;border:1px solid var(--wire);background:var(--deep)}
.tocador .pp{width:48px;height:48px;flex:none;background:var(--fire);color:var(--black);display:flex;align-items:center;justify-content:center}
.tocador .pp svg{width:18px;height:18px}
.tocador .t{font:400 .72rem var(--mono);color:var(--dim);flex:none;min-width:2.6em}
.trilha{flex:1;height:22px;position:relative;cursor:pointer;touch-action:none}
.trilha:before{content:'';position:absolute;left:0;right:0;top:10px;height:2px;background:var(--loam)}
.trilha i{position:absolute;left:0;top:10px;height:2px;background:var(--fire);width:0}
.trilha i:after{content:'';position:absolute;right:-6px;top:-5px;width:12px;height:12px;border-radius:50%;background:var(--fire);opacity:0;transition:opacity .15s}
.trilha:hover i:after,.trilha.ativa i:after{opacity:1}
.tocador .sh{width:44px;height:44px;flex:none;display:flex;align-items:center;justify-content:center;color:var(--read)}
.tocador .sh svg{width:20px;height:20px}.tocador .sh:hover{color:var(--fire)}
.compra{margin-top:26px;padding-top:24px;border-top:1px solid var(--wire)}
.compra .linha{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
.valor{font:500 2.6rem/1 var(--serif);color:var(--cream)}
.valor small{display:block;font:700 .6rem var(--sans);letter-spacing:.22em;text-transform:uppercase;color:var(--label);margin-top:8px}
.valor s{color:var(--amber);text-decoration-color:var(--blood);text-decoration-thickness:2px}
.pacs{list-style:none;font:400 .72rem/1.9 var(--mono);color:var(--read);text-align:right}
.pacs a{color:var(--fire);border-bottom:1px solid var(--clay)}
.compra .btn{width:100%;margin-top:18px}
.inclui{list-style:none;margin-top:16px;display:grid;gap:7px}
.inclui li{font-size:.8rem;color:var(--read);line-height:1.5;padding-left:20px;position:relative}
.inclui li:before{content:'';position:absolute;left:2px;top:.55em;width:8px;height:4px;border-left:1.5px solid var(--fire);border-bottom:1.5px solid var(--fire);transform:rotate(-45deg)}
.inclui b{color:var(--bone);font-weight:400}
.dono{margin-top:22px;padding:20px;border:1px solid var(--wire);border-left:3px solid var(--blood);background:var(--mole)}
.dono p{font:italic 500 1.5rem/1.3 var(--serif);color:var(--cream)}
.dono span{display:block;margin-top:8px;font-size:.84rem;line-height:1.6;color:var(--read)}
.tape{grid-area:tape;display:flex;align-items:center;gap:14px;padding:12px;border:1px solid var(--wire);background:var(--mole);transition:border-color .14s}
.tape:hover{border-color:var(--clay)}
.tape img{flex:none;object-fit:cover;border:1px solid var(--wire)}
.tape .k{font-size:.56rem;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:var(--label)}
.tape .n{font:600 1.1rem/1.2 var(--serif);color:var(--cream);margin-top:4px}
.tape .q{font:400 .68rem var(--mono);color:var(--read);margin-top:3px}
.tape .seta{margin-left:auto;color:var(--fire);font-size:1.2rem;padding-right:4px}

/* ===== página do gênero ===== */
.topo-g{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:48px;align-items:end;padding-bottom:30px}
.topo-g h1{font:500 5rem/.92 var(--serif);color:var(--cream);margin:14px 0 18px}
.topo-g h1 em{font-style:normal;color:var(--clay)}
.topo-g p{font-size:.92rem;line-height:1.75;color:var(--read);max-width:54ch}
.topo-g p b{color:var(--bone);font-weight:400}
.acoes{display:flex;align-items:center;flex-wrap:wrap;gap:14px 20px;margin-top:24px}
.acoes .btn{height:48px}
.acoes .pacs{text-align:left;line-height:1.7}
.mosaico{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.mosaico img{width:100%;aspect-ratio:1;object-fit:cover;border:1px solid var(--wire)}
/* 04/10/2026: com 1, 2 ou 3 tapes as capas também aparecem. 1 = capa inteira; 2 e 3 = capas
   empilhadas em escada (a da tape mais nova na frente), como discos um sobre o outro */
.mosaico.n1{grid-template-columns:1fr}
.mosaico.pilha{display:block;position:relative;width:300px;height:300px}
.mosaico.pilha img{position:absolute;width:220px;box-shadow:0 14px 34px rgba(0,0,0,.5)}
.mosaico.pilha img:nth-child(1){left:0;top:0;z-index:3}
.mosaico.n2 img:nth-child(2){left:80px;top:80px;z-index:2}
.mosaico.n3 img:nth-child(2){left:40px;top:40px;z-index:2}
.mosaico.n3 img:nth-child(3){left:80px;top:80px;z-index:1}
.generos{display:flex;flex-wrap:wrap;gap:8px;padding:18px 0;border-top:1px solid var(--wire);list-style:none}
.generos a{display:block;font-size:.62rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--read);border:1px solid var(--wire);padding:.6rem .85rem;white-space:nowrap}
.generos a:hover{border-color:var(--clay);color:var(--bone)}
.generos a i{font:400 .64rem var(--mono);color:var(--dim);margin-left:6px;font-style:normal}
.generos a[aria-current]{background:var(--fire);color:var(--black);border-color:var(--fire)}.generos a[aria-current] i{color:var(--black)}
.ordem{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:4px 0 12px;font:400 .68rem var(--mono);color:var(--dim)}
.ordem select{font:400 .7rem var(--mono);color:var(--read);background:var(--mole);border:1px solid var(--wire);padding:.4rem .5rem;border-radius:0}
.pacote{margin-top:44px;display:flex;align-items:center;justify-content:space-between;gap:24px;padding:22px 24px;border:1px solid var(--clay);background:var(--mole)}
.pacote .k{font-size:.58rem;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:var(--fire)}
.pacote p{font:500 1.5rem/1.35 var(--serif);color:var(--cream);margin-top:6px}
.pacote p span{white-space:nowrap}
.pacote p .off{font-size:.52rem;vertical-align:4px}
.pacote>a{flex:none;font-size:.7rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;border:1px solid var(--wire);padding:.9rem 1.2rem}
.pacote>a:hover{border-color:var(--clay);color:var(--fire)}
.barra{position:fixed;left:0;right:0;bottom:0;z-index:60;background:var(--deep);border-top:1px solid var(--wire);padding:10px 2.4rem calc(12px + env(safe-area-inset-bottom,0px));display:flex;align-items:center;gap:14px;transform:translateY(110%);transition:transform .25s ease}
body.tocando .barra{transform:none}
body.tocando{padding-bottom:64px}
.barra .t{font:400 .7rem var(--mono);color:var(--dim);flex:none}
.barra .trilha{max-width:420px}
.barra .capinha{width:38px;height:38px}
.barra .quem{display:flex;align-items:center;gap:12px;min-width:0;flex:1}
.barra .nm{font:600 1.05rem var(--serif);color:var(--cream);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.barra .ir{flex:none;font:500 1.4rem/1 var(--serif);color:var(--clay);margin-left:-4px}
.barra .quem:hover .nm,.barra .quem:hover .ir{color:var(--fire)}
.barra .ctl{display:flex;align-items:center;gap:4px;flex:none}
.barra .ctl button{width:40px;height:40px;display:flex;align-items:center;justify-content:center;color:var(--bone)}
.barra .ctl button svg{width:16px;height:16px}
.barra .ctl .pp{background:var(--fire);color:var(--black)}
@media (prefers-reduced-motion:reduce){.barra,.item:before,.aviso{transition:none}}

@media(max-width:899px){.topo .logo img{width:122px;height:22px}}
@media(max-width:860px){
  .topo{padding:0 .7rem 0 1rem}.topo ul{display:none}.burger{display:flex}
  .menu-cel{position:fixed;top:54px;left:0;right:0;z-index:49;background:rgba(5,4,3,.98);border-bottom:1px solid var(--wire);list-style:none;padding:6px 0}
  .menu-cel.on{display:block}
  .menu-cel a{display:block;padding:14px 1rem;font-size:.8rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase}
  .menu-cel a.ativo{color:var(--fire)}
  .topo .dir{gap:2px}
  .wrap{padding:0 16px}
  .rodape{flex-direction:column;align-items:flex-start;padding:1.4rem 16px}
  .beat{grid-template-columns:1fr;grid-template-areas:'capa' 'info' 'tape';row-gap:22px}
  .beat h1{font-size:2.9rem}
  .compra .linha{flex-direction:column;gap:12px}.compra .pacs{text-align:left}
  .secao{margin-top:44px}.secao h2{font-size:1.8rem}
  .item{gap:10px;padding:9px 2px}.item .num{width:24px}.capinha{width:40px;height:40px}.item .dur{display:none}
  .item .nome{font-size:1.05rem}.item .ficha{font-size:.68rem}.preco{padding:.5rem .6rem;font-size:.72rem}
  .item:hover .num{background:none;border:0}.item:hover:not(.tocando) .num i{display:inline}.item:hover:not(.tocando) .num .i-play{display:none}
  .topo-g{grid-template-columns:1fr;gap:22px;padding-bottom:22px}.topo-g h1{font-size:3.2rem}
  .mosaico{display:none}
  .generos{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin:0 -16px;padding-left:16px;padding-right:16px}
  .generos::-webkit-scrollbar{display:none}
  .pacote{flex-direction:column;align-items:flex-start}
  .barra{padding:12px 16px calc(14px + env(safe-area-inset-bottom,0px));gap:12px}
  .barra .t{display:none}
  .barra .trilha{position:absolute;left:0;right:0;top:-11px;max-width:none}
  .barra .ctl .ant,.barra .ctl .prox{display:none}
  body.tocando{padding-bottom:76px}
}
`;

function topo(de, genAtual = '') {
  const links = [['/#beats', 'Beats', true], ['/#packages', 'Pacotes'], ['/#services', 'Serviços'], ['/#estudio', 'Sobre nós'], ['/#contact', 'Contato']];
  const lis = links.map(([h, t, a]) => `<li><a href="${h}"${a ? ' class="ativo"' : ''}>${t}</a></li>`).join('');
  // no computador, o mouse em BEATS abre "Todos os beats" e os gêneros (04/10/2026)
  const lisTopo = lis.replace('<li><a href="/#beats" class="ativo">Beats</a></li>', `<li class="tem-sub"><a href="/#beats" class="ativo" aria-haspopup="true">Beats</a>${menuGeneros('/#beats', genAtual)}</li>`);
  return `<header class="topo">
<a class="logo" href="/?de=${de}" aria-label="Caramujo Records, página inicial"><img src="/assets/brand/caramujo-h.webp" alt="Caramujo Records" width="148" height="27"></a>
<nav aria-label="Seções do site"><ul>${lisTopo}</ul></nav>
<div class="dir">
<a class="anel" href="/rideblan33?de=${de}" aria-label="Portfólio do @rideblan33"><img src="/assets/perfil/rideblan33-camisa.webp" alt="" width="128" height="128"></a>
<a class="ico-btn js-carrinho" href="/?de=${de}#carrinho" aria-label="Abrir o carrinho">${ICO.cart}<b class="js-n" hidden>0</b></a>
<button class="ico-btn burger js-menu" type="button" aria-label="Abrir o menu" aria-expanded="false" aria-controls="menuCel"><span><i></i><i></i><i></i></span></button>
</div>
</header>
<ul class="menu-cel" id="menuCel">${lis}</ul>`;
}

const RODAPE = `<footer class="rodape">${RODAPE_GENEROS}<img src="/assets/brand/selo-creme.svg" alt="" width="34" height="34" loading="lazy"><span>© 2026 Caramujo Records — São Carlos, SP</span><span><a href="/rideblan33">@rideblan33</a> · Todos os direitos reservados</span></footer>
<div class="aviso" role="status" aria-live="polite"></div>`;

const capaP = (b) => (b.capa ? b.capa + '?p' : null);
function capinha(b, cls = 'capinha') {
  return b.capa
    ? `<img class="${cls}" src="${esc(capaP(b))}" alt="" width="46" height="46" loading="lazy">`
    : `<span class="${cls} vazia"><img src="/assets/brand/selo-creme.svg" alt="" width="24" height="24"></span>`;
}
const ficha = (b) => `<em>${esc(b.genero || b.genre)}</em> · ${esc(b.bpm)} BPM${b.key ? ' · ' + esc(b.key) : ''}`;
const linkAdd = (b, de) => `/?de=${de}#add=${encodeURIComponent(b.slug)}`;

function linha(b, i, de, preco) {
  const n = String(i + 1).padStart(2, '0');
  const acao = b.sold
    ? '<span class="vendido">Vendido</span>'
    : `<a class="preco js-add" data-bid="${b.id}" href="${linkAdd(b, de)}" aria-label="Pôr ${esc(b.name)} no carrinho, ${real(preco)}">${ICO.cart}<span>R$${preco}</span></a>`;
  return `<li class="item${b.sold ? ' fora' : ''}" data-bid="${b.id}" data-bpm="${Number(b.bpm) || 0}" data-ordem="${i}">
<button class="num js-tocar" type="button" data-bid="${b.id}" aria-label="Tocar ${esc(b.name)}"${b.mp3 ? '' : ' disabled'}><i>${n}</i>${PLAYPAUSE}</button>
${capinha(b)}
<div class="info"><a class="nome" href="/beat/${esc(b.slug)}">${esc(b.name)}</a><div class="ficha">${ficha(b)}</div></div>
<span class="dur">${b.dur ? mmss(b.dur) : ''}</span>
${acao}
<span class="corrida" aria-hidden="true"></span>
</li>`;
}

function pacotesTexto(pk, { link = true } = {}) {
  if (!pk.length) return '';
  const lis = pk.map((p) => `<li>${p.n} beats por ${real(p.preco)}<span class="off">${p.off}% off</span></li>`).join('');
  return `<ul class="pacs">${lis}${link ? '<li><a href="/#packages">ver pacotes</a></li>' : ''}</ul>`;
}

function cabecalho({ titulo, descricao, url, img, imgAlt, ogTitulo, ogDescricao, ld, preload, tipoOg = 'website' }) {
  return `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descricao)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="${tipoOg}">
<meta property="og:site_name" content="Caramujo Records">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="${esc(ogTitulo || titulo)}">
<meta property="og:description" content="${esc(ogDescricao || descricao)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(img.url)}">
<meta property="og:image:width" content="${img.w}">
<meta property="og:image:height" content="${img.h}">
<meta property="og:image:alt" content="${esc(imgAlt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(ogTitulo || titulo)}">
<meta name="twitter:description" content="${esc(ogDescricao || descricao)}">
<meta name="twitter:image" content="${esc(img.url)}">
<meta name="theme-color" content="#14110d">
${ICONES}
${preload ? `<link rel="preload" as="image" href="${esc(preload)}" fetchpriority="high">` : ''}
<link rel="preload" as="font" type="font/woff2" href="/assets/fonts/cormorant-garamond-latin-500-normal.woff2" crossorigin>
<script type="application/ld+json">${jsonSeguro(ld)}</script>
<style>${CSS}</style>
</head>`;
}

// O que o tocador precisa de cada beat (vai pro navegador)
// Barra do pé (página de gênero, e na do beat quando toca um parecido). Capa, nome e a
// seta levam pra página do beat: é por ela (e não pela lista) que se abre a página (04/10/2026).
const BARRA = `<div class="barra" aria-label="Tocando agora">
<span class="t js-agora">0:00</span><div class="trilha js-trilha" data-bid="" role="slider" tabindex="0" aria-label="Posição na faixa" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div><span class="t js-total">0:00</span>
<a class="quem js-blink" href="#"><img class="capinha js-bcapa" src="/assets/brand/selo-creme.svg" alt="" width="38" height="38"><span class="nm js-bnome">&nbsp;</span><span class="ir" aria-hidden="true">›</span></a>
<div class="ctl"><button class="ant js-ant" type="button" aria-label="Beat anterior">${ICO.prev}</button><button class="pp js-tocar js-bpp" type="button" data-bid="" aria-label="Tocar">${PLAYPAUSE}</button><button class="prox js-prox" type="button" aria-label="Próximo beat">${ICO.next}</button></div>
<span class="js-bacao"></span>
</div>`;

const praTela = (b) => ({ id: b.id, s: b.slug, n: b.name, mp3: b.mp3 || null, capa: b.capa || null, dur: b.dur || 0, sold: !!b.sold });

/* ---------- página do beat ---------- */

export function paginaBeat(b, loja) {
  const { beats, preco, pacotes: pk, porCapa } = loja;
  const de = 'pagina-beat';
  const url = `${SITE}/beat/${b.slug}`;
  const gen = b.genero || b.genre;
  const genUrl = `/beats/${b.gslug}`;
  const tom = tomPt(b.key);
  const tape = tapeDo(b, porCapa);
  const par = parecidos(b, beats);
  const img = b.capa ? { url: SITE + b.capa, w: 1000, h: 1000 } : { url: SITE + '/og-image.png', w: 1200, h: 630 };
  // Textos só pro Google (04/10/2026, aprovados pelo Bruno): a descrição curta (resultado da busca
  // e prévia do link) e a ficha (Product.description). Faltando BPM, tom ou duração, o pedaço some.
  const g = String(gen).toLowerCase();
  const tomTxt = tom ? `${tom} (${b.key})` : b.key || '';
  const bpmTxt = b.bpm ? `${b.bpm} BPM` : '';
  const quem = tape ? `Faz parte da beat tape ${tape.name}, produzida por @rideblan33.` : 'Produzido por @rideblan33.';
  const fichaCab = `${b.name} é um beat de ${g}${b.dur ? ' de ' + mmss(b.dur) : ''}${bpmTxt || tomTxt ? ', ' + [bpmTxt, tomTxt ? 'em ' + tomTxt : ''].filter(Boolean).join(', ') : ''}.`;
  const descricao = b.sold
    ? `${b.name}: beat de ${g} produzido por @rideblan33${bpmTxt || tom || b.key ? ` (${[bpmTxt, tom || b.key].filter(Boolean).join(', ')})` : ''}, já vendido com licença exclusiva. Ouça e descubra beats parecidos à venda.`
    : `${b.name}: beat de ${g} exclusivo produzido por @rideblan33${bpmTxt || tomTxt ? ', ' + [bpmTxt, tomTxt ? 'em ' + tomTxt : ''].filter(Boolean).join(' ') : ''}. Licença exclusiva com contrato, MP3 + WAV, por ${real(preco)}.`;
  const ficha = b.sold
    ? `${fichaCab} ${quem} Já foi vendido com licença exclusiva. Ouça e descubra beats parecidos à venda.`
    : `${fichaCab} ${quem} Licença exclusiva: o beat é vendido uma vez só, com contrato no nome de quem compra e uso comercial liberado, em MP3 e WAV, com entrega em até 1 dia útil.`;
  const ld = [
    {
      '@context': 'https://schema.org', '@type': 'Product', name: b.name, url,
      image: img.url, description: ficha, category: `Beat de ${gen}`,
      brand: { '@type': 'Brand', name: 'Caramujo Records' },
      additionalProperty: [
        b.bpm ? { '@type': 'PropertyValue', name: 'BPM', value: Number(b.bpm) } : null,
        b.key ? { '@type': 'PropertyValue', name: 'Tom', value: tom ? `${b.key} (${tom})` : b.key } : null,
        { '@type': 'PropertyValue', name: 'Gênero', value: gen }
      ].filter(Boolean),
      offers: {
        '@type': 'Offer', url, priceCurrency: 'BRL', price: preco,
        availability: b.sold ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
        seller: { '@type': 'Organization', name: 'Caramujo Records' },
        hasMerchantReturnPolicy: { '@type': 'MerchantReturnPolicy', returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted', applicableCountry: 'BR' },
        shippingDetails: { '@type': 'OfferShippingDetails', shippingRate: { '@type': 'MonetaryAmount', value: '0', currency: 'BRL' }, shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'BR' },
          deliveryTime: { '@type': 'ShippingDeliveryTime', handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 0, unitCode: 'DAY' }, transitTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' } } }
      }
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Beats', item: `${SITE}/#beats` },
        { '@type': 'ListItem', position: 2, name: gen, item: SITE + genUrl },
        { '@type': 'ListItem', position: 3, name: b.name, item: url }
      ]
    }
  ];

  const compra = b.sold
    ? `<div class="compra"><div class="linha"><div class="valor"><s>${real(preco)}</s><small>Vendido · licença exclusiva</small></div></div></div>
<div class="dono"><p>Esse beat já tem dono.</p><span>A licença é exclusiva: quando alguém compra, o beat sai da loja. Os de baixo estão à venda.</span></div>`
    : `<div class="compra"><div class="linha"><div class="valor">${real(preco)}<small>Licença exclusiva</small></div>${pacotesTexto(pk)}</div>
<a class="btn js-add" data-bid="${b.id}" href="${linkAdd(b, de)}">${ICO.cart}<span>Adicionar ao carrinho</span></a>
<ul class="inclui"><li><b>Só seu:</b> depois da compra o beat sai da loja</li><li><b>Contrato no seu nome</b>, com uso comercial liberado</li><li><b>MP3 + WAV</b>, entrega em até 1 dia útil</li></ul></div>`;

  const capaG = b.capa
    ? `<div class="capa-g"><img src="${esc(b.capa)}" alt="Capa da beat tape${tape ? ' ' + esc(tape.name) : ''}" width="1000" height="1000" fetchpriority="high">`
    : '<div class="capa-g vazia"><img src="/assets/brand/selo-creme.svg" alt="" width="120" height="120">';
  const tapeCard = tape
    ? `<a class="tape" href="/${esc(tape.slug)}/${esc(tape.code)}?de=beat"><img src="/capa/${esc(tape.capa)}?p" alt="" width="62" height="62" loading="lazy"><div><div class="k">Da beat tape</div><div class="n">${esc(tape.name)}</div><div class="q">${tape.n ? tape.n + (tape.n === 1 ? ' beat' : ' beats') + ' · ' : ''}ouvir a tape</div></div><span class="seta" aria-hidden="true">›</span></a>`
    : '';

  const lista = [b].concat(par);
  const corpo = `<body class="pg-beat">
${topo(de)}
<main class="wrap">
<nav class="migalha" aria-label="Você está em"><a href="/#beats">Beats</a><span class="bar">/</span><a href="${genUrl}">${esc(gen)}</a><span class="bar">/</span><span aria-current="page">${esc(b.name)}</span></nav>
<article class="beat${b.sold ? ' fora' : ''}" data-bid="${b.id}">
${capaG}${b.sold ? '<span class="selo">Vendido</span>' : ''}${b.mp3 ? `<button class="tocar js-tocar" type="button" data-bid="${b.id}" aria-label="Tocar ${esc(b.name)}">${PLAYPAUSE}</button>` : ''}</div>
<div class="info">
<div class="kicker">${b.sold ? 'Beat vendido' : 'Beat exclusivo'} · ${esc(gen)}</div>
<h1>${esc(b.name)}</h1>
<div class="por">prod. <a href="/rideblan33?de=${de}">@rideblan33 ›</a></div>
<ul class="chips">${b.bpm ? `<li>${esc(b.bpm)} BPM</li>` : ''}${b.key ? `<li>${esc(b.key)}${tom ? ' // ' + esc(tom) : ''}</li>` : ''}${b.dur ? `<li>${mmss(b.dur)}</li>` : ''}</ul>
${b.mp3 ? `<div class="tocador" data-bid="${b.id}"><button class="pp js-tocar" type="button" data-bid="${b.id}" aria-label="Tocar ${esc(b.name)}">${PLAYPAUSE}</button><span class="t js-agora">0:00</span><div class="trilha js-trilha" data-bid="${b.id}" role="slider" tabindex="0" aria-label="Posição na faixa" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div><span class="t">${mmss(b.dur)}</span><button class="sh js-compartilhar" type="button" data-url="${SITE}/b/${esc(b.slug)}" data-titulo="${esc(b.name)} · @rideblan33" aria-label="Compartilhar ${esc(b.name)}">${ICO.share}</button></div>` : ''}
${compra}
</div>
${tapeCard}
</article>
${par.length ? `<section class="secao" aria-labelledby="tParecidos"><div class="cab"><h2 id="tParecidos">${b.sold ? 'Podem te interessar' : 'Beats parecidos'}</h2><a class="ver" href="${genUrl}">Todos de ${esc(gen)} ›</a></div>
<ol class="lista js-lista">${par.map((x, i) => linha(x, i, de, preco)).join('')}</ol></section>` : ''}
</main>
${par.length ? BARRA : ''}
${RODAPE}
<script>window.__PG=${jsonSeguro({ pagina: 'beat', atual: b.id, beats: lista.map(praTela) })}</script>
<script>${JS}</script>
</body></html>`;

  return cabecalho({
    titulo: `${b.name} · Beat de ${gen} · @rideblan33`,
    ogTitulo: `${b.name} · @rideblan33`,
    descricao, url, img, imgAlt: `Capa da beat tape de ${b.name}`, ld, preload: b.capa || null
  }) + '\n' + corpo;
}

/* ---------- página do gênero ---------- */

export function paginaGenero(gslug, loja) {
  const { beats, preco, pacotes: pk } = loja;
  const doGenero = beats.filter((b) => b.gslug === gslug);
  if (!doGenero.length) return null;
  const de = 'pagina-genero';
  const gen = doGenero[0].genero || doGenero[0].genre;
  const url = `${SITE}/beats/${gslug}`;
  const venda = doGenero.filter((b) => !b.sold);
  const vendidos = doGenero.filter((b) => b.sold);
  // na ordem da vitrine, vendidos no lugar deles (04/10/2026, pedido do Bruno; antes iam pro fim)
  const ordem = doGenero;
  const bpms = venda.map((b) => Number(b.bpm)).filter(Boolean);
  const faixaBpm = bpms.length > 1 ? `, de ${Math.min(...bpms)} a ${Math.max(...bpms)} BPM` : bpms.length ? `, ${bpms[0]} BPM` : '';
  const nVenda = venda.length === 1 ? `1 beat de ${String(gen).toLowerCase()} à venda` : `${venda.length} beats de ${String(gen).toLowerCase()} à venda`;
  const intro = venda.length
    ? `<b>${nVenda}</b>${faixaBpm}, produzidos por @rideblan33. Cada beat é vendido uma vez só, com contrato no seu nome, em MP3 e WAV.`
    : `Os beats de ${esc(String(gen).toLowerCase())} do @rideblan33 já foram todos vendidos. Ouça os que saíram e veja os outros gêneros.`;
  const descricao = venda.length
    ? `${nVenda}${faixaBpm}, produzidos por @rideblan33. Licença exclusiva com contrato no seu nome, MP3 e WAV. ${real(preco)} cada.`
    : `Beats de ${String(gen).toLowerCase()} do @rideblan33, todos vendidos. Veja os outros gêneros à venda.`;

  // gêneros com beat na loja, na ordem de quantidade à venda
  const contagem = new Map();
  for (const b of beats) {
    const c = contagem.get(b.gslug) || { slug: b.gslug, nome: b.genero || b.genre, venda: 0, total: 0 };
    c.total++; if (!b.sold) c.venda++;
    contagem.set(b.gslug, c);
  }
  const generos = [...contagem.values()].sort((a, b) => b.venda - a.venda || b.total - a.total);
  const capasTape = [...new Set(doGenero.map((b) => b.capa).filter(Boolean))].slice(0, 4);
  const img = capasTape[0] ? { url: SITE + capasTape[0], w: 1000, h: 1000 } : { url: SITE + '/og-image.png', w: 1200, h: 630 };

  const ld = [
    {
      '@context': 'https://schema.org', '@type': 'CollectionPage', name: `Beats de ${gen}`, url, description: descricao,
      isPartOf: { '@type': 'WebSite', name: 'Caramujo Records', url: SITE },
      mainEntity: { '@type': 'ItemList', numberOfItems: ordem.length,
        itemListElement: ordem.map((b, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/beat/${b.slug}`, name: b.name })) }
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Beats', item: `${SITE}/#beats` },
        { '@type': 'ListItem', position: 2, name: gen, item: url }
      ]
    }
  ];

  const p2 = pk.find((p) => p.n === 2), p3 = pk.find((p) => p.n === 3);
  const pacoteBloco = pk.length
    ? `<div class="pacote"><div><div class="k">Pacotes</div><p>Leva mais de um? ${pk.map((p) => `<span>${p.n} beats por ${real(p.preco)}<span class="off">${p.off}% off</span></span>`).join(', ')}.</p></div><a href="/?de=${de}#packages">Ver pacotes ›</a></div>`
    : '';
  const corpo = `<body class="pg-genero">
${topo(de, gslug)}
<main class="wrap">
<nav class="migalha" aria-label="Você está em"><a href="/#beats">Beats</a><span class="bar">/</span><span aria-current="page">${esc(gen)}</span></nav>
<div class="topo-g"><div>
<div class="kicker">Beats exclusivos · @rideblan33</div>
<h1>Beats de <em>${esc(gen)}</em></h1>
<p>${intro}</p>
<div class="acoes">${venda.some((b) => b.mp3) ? `<button class="btn js-todos" type="button">${PLAYPAUSE}<span>Tocar todos</span></button>` : ''}<ul class="pacs"><li>${real(preco)} cada</li>${p2 || p3 ? [p2, p3].filter(Boolean).map((p) => `<li>${p.n} por ${real(p.preco)}<span class="off">${p.off}% off</span></li>`).join('') : ''}</ul></div>
</div>${capasTape.length ? `<div class="mosaico ${capasTape.length >= 4 ? 'n4' : capasTape.length === 1 ? 'n1' : 'pilha n' + capasTape.length}" aria-hidden="true">${capasTape.map((c) => `<img src="${esc(c)}?m" alt="" width="${capasTape.length >= 4 ? 147 : capasTape.length === 1 ? 300 : 220}" height="${capasTape.length >= 4 ? 147 : capasTape.length === 1 ? 300 : 220}" loading="lazy">`).join('')}</div>` : '<div></div>'}</div>
<nav aria-label="Outros gêneros"><ul class="generos">${generos.map((g) => `<li><a href="/beats/${esc(g.slug)}"${g.slug === gslug ? ' aria-current="page"' : ''}>${esc(g.nome)}<i>${g.venda}</i></a></li>`).join('')}</ul></nav>
<div class="ordem"><span>${venda.length} à venda${vendidos.length ? ` · ${vendidos.length} ${vendidos.length === 1 ? 'vendido' : 'vendidos'}` : ''}</span><label><span class="sr">Ordem da lista</span><select class="js-ordem"><option value="novos">Mais novos</option><option value="bpm-">BPM: do mais lento</option><option value="bpm+">BPM: do mais rápido</option></select></label></div>
<ol class="lista js-lista">${ordem.map((b, i) => linha(b, i, de, preco)).join('')}</ol>
${pacoteBloco}
</main>
${BARRA}
${RODAPE}
<script>window.__PG=${jsonSeguro({ pagina: 'genero', preco, beats: ordem.map(praTela) })}</script>
<script>${JS}</script>
</body></html>`;

  return cabecalho({
    titulo: `Beats de ${gen} exclusivos · @rideblan33`,
    ogTitulo: `Beats de ${gen} · @rideblan33`,
    descricao, url, img, imgAlt: `Capas das beat tapes com beats de ${gen}`, ld
  }) + '\n' + corpo;
}

export function resposta(html, status = 200) {
  const h = new Headers({ 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=120' });
  for (const [k, v] of Object.entries(CABECALHOS)) h.set(k, v);
  return new Response(html, { status, headers: h });
}

/* ---------- o tocador (vai pro navegador, igual nas duas páginas) ---------- */
// Sem crase nem ${ aqui dentro: este texto mora numa template string.
const JS = `(function(){
  var P=window.__PG||{beats:[]}, porId={}, som=new Audio(), atual=null, nada=function(){};
  som.preload='none';
  P.beats.forEach(function(b){ porId[b.id]=b; });
  function $(s,c){ return (c||document).querySelector(s); }
  function $$(s,c){ return Array.prototype.slice.call((c||document).querySelectorAll(s)); }
  function mmss(s){ s=Math.max(0,Math.round(s||0)); return Math.floor(s/60)+':'+(s%60<10?'0':'')+(s%60); }
  function aviso(t){ var a=$('.aviso'); if(!a) return; a.textContent=t; a.classList.add('on'); clearTimeout(aviso.t); aviso.t=setTimeout(function(){ a.classList.remove('on'); },2200); }

  /* de onde veio: quem chegou pelo Google leva isso pra vitrine (?de=google-beat) */
  var veioGoogle=false;
  try{ if(/(^|\\.)google\\./.test(document.referrer?new URL(document.referrer).hostname:'')) sessionStorage.setItem('cr_pg_google','1'); veioGoogle=sessionStorage.getItem('cr_pg_google')==='1'; }catch(_){}
  if(veioGoogle) $$('a[href*="de=pagina-"]').forEach(function(a){ a.setAttribute('href',a.getAttribute('href').replace('de=pagina-','de=google-')); });

  /* funil (04/10/2026): a página conta a visita e o play, como a vitrine (/api/funil).
     A origem fica guardada na aba (cr_origem): quem chegou pelo link do story e foi
     comprar na vitrine continua contando como "story". Nada pessoal: a sessão é um
     número aleatório que morre com a aba. */
  var ss=function(k,v){ try{ if(v===undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k,v); }catch(_){ return null; } };
  var funil=nada, robo=false;
  try{ robo=!!navigator.webdriver; }catch(_){}
  if(!robo){
    var sid=ss('cr_sessao');
    if(!sid){
      try{ var rr=new Uint32Array(3); crypto.getRandomValues(rr); sid=Array.prototype.map.call(rr,function(n){ return n.toString(36); }).join('').slice(0,24); }
      catch(_){ sid=(Date.now().toString(36)+Math.random().toString(36).slice(2)).slice(0,24); }
      if(sid.length<10) sid=(sid+'0000000000').slice(0,10);
      ss('cr_sessao',sid);
    }
    var aparelho='computador'; try{ if(matchMedia('(max-width: 760px)').matches||/Mobi|Android|iPhone/i.test(navigator.userAgent)) aparelho='celular'; }catch(_){}
    var origem=ss('cr_origem');
    if(!origem){
      var de=null; try{ de=new URLSearchParams(location.search).get('de'); }catch(_){}
      var ua=navigator.userAgent||'', ref='', cam=[];
      try{ if(document.referrer){ var ru=new URL(document.referrer); ref=ru.hostname; cam=ru.pathname.split('/').filter(Boolean); } }catch(_){}
      var tipo=P.pagina==='genero'?'genero':'beat';
      if(de) origem=de.toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,40)||'direto';
      else if(/(^|\\.)google\\./.test(ref)) origem='google-'+tipo;
      else if(/Instagram/i.test(ua)||/instagram\\.com$/.test(ref)) origem='instagram';
      else if(/FBAN|FBAV/i.test(ua)||/facebook\\.com$/.test(ref)) origem='facebook';
      else if(/WhatsApp/i.test(ua)||/whatsapp/.test(ref)) origem='whatsapp';
      else if(/TikTok|musical_ly|BytedanceWebview/i.test(ua)||/tiktok\\.com$/.test(ref)) origem='tiktok';
      else if(/youtube\\.com$|youtu\\.be$/.test(ref)) origem='youtube';
      else if(/bing\\.com$|duckduckgo\\.com$/.test(ref)) origem='busca';
      else if(ref&&ref===location.hostname) origem=cam[0]==='rideblan33'?'perfil':(cam.length===2&&['b','beat','beats','f','p'].indexOf(cam[0])<0)?('tape-'+cam[0]).slice(0,40):'pagina-'+tipo;
      else if(ref) origem='outro-site';
      else origem='direto';
      ss('cr_origem',origem);
    }
    var envia=function(corpo){ var txt=JSON.stringify(corpo); try{ if(navigator.sendBeacon&&navigator.sendBeacon('/api/funil',txt)) return; fetch('/api/funil',{method:'POST',body:txt,keepalive:true}).catch(nada); }catch(_){} };
    funil=function(etapa,beatId){
      var n=Number(beatId);
      if(etapa==='toque'){ if(!(n>0)||ss('cr_b_toque_'+n)) return; ss('cr_b_toque_'+n,'1'); envia({s:sid,e:'toque',a:aparelho,o:origem,b:n}); return; }
      if(ss('cr_f_'+etapa)) return; ss('cr_f_'+etapa,'1');
      var corpo={s:sid,e:etapa,a:aparelho,o:origem}; if(n>0) corpo.b=n; envia(corpo);
    };
  }
  /* o ?de= já cumpriu o papel: sai da barra de endereço (quem copiar o link leva ele limpo) */
  try{ if(/[?&]de=/.test(location.search)&&history.replaceState) history.replaceState(null,'',location.pathname+location.hash); }catch(_){}

  /* o carrinho guardado da vitrine: número no topo e "No carrinho" nos beats que já estão lá */
  try{
    var c=JSON.parse(localStorage.getItem('caramujo_carrinho_v1')||'null');
    if(c && c.itens && c.itens.length && Date.now()-(c.em||0)<7*864e5){
      var n=c.itens.reduce(function(s,x){ return s+(x.qty||1); },0), bn=$('.js-n');
      if(bn){ bn.textContent=n; bn.hidden=false; }
      var dentro={}; c.itens.forEach(function(x){ if(x.beatId&&!x.stems) dentro[x.beatId]=1; });
      $$('.js-add').forEach(function(a){
        if(!dentro[a.getAttribute('data-bid')]) return;
        a.classList.add('no-carrinho');
        a.setAttribute('href',a.getAttribute('href').replace(/#add=.*$/,'#carrinho'));
        var t=a.querySelector('span'); if(t) t.textContent=a.classList.contains('btn')?'No carrinho · ver carrinho':'No carrinho';
        a.setAttribute('aria-label','Já está no carrinho: abrir o carrinho');
      });
    }
  }catch(_){}

  /* menu do celular */
  var mb=$('.js-menu'), mc=$('#menuCel');
  if(mb&&mc) mb.addEventListener('click',function(){ var on=!mc.classList.contains('on'); mc.classList.toggle('on',on); mb.setAttribute('aria-expanded',on?'true':'false'); });

  /* tocar */
  function fila(){ return $$('.js-lista .item').map(function(li){ return Number(li.getAttribute('data-bid')); }).filter(function(id){ return porId[id]&&porId[id].mp3; }); }
  // a barra aparece no gênero e, na página do beat, quando toca um dos parecidos
  function naBarra(id){ return id!==null && (P.pagina==='genero' || id!==P.atual); }
  function vizinho(passo){
    if(P.pagina==='beat'&&atual===P.atual) return null;   // o beat da página termina e para
    var f=fila(); if(!f.length) return null;
    var i=f.indexOf(atual); if(i<0) return passo>0?f[0]:null;
    return f[i+passo]!==undefined?f[i+passo]:null;
  }
  function marca(){
    var rodando=atual!==null&&!som.paused;
    $$('[data-bid]').forEach(function(el){
      var id=Number(el.getAttribute('data-bid')), on=id===atual;
      if(el.classList.contains('item')){ el.classList.toggle('tocando',on); el.classList.toggle('rodando',on&&rodando); if(!on){ var cr=el.querySelector('.corrida'); if(cr) cr.style.width='0'; } }
    });
    $$('.js-tocar').forEach(function(bt){
      var id=bt.classList.contains('js-bpp')?atual:Number(bt.getAttribute('data-bid')), b=porId[id], rod=id===atual&&rodando;
      bt.classList.toggle('rodando',rod);
      if(b) bt.setAttribute('aria-label',(rod?'Pausar ':'Tocar ')+b.n);
    });
    var todos=$('.js-todos'); if(todos){ var s=todos.querySelector('span'); if(s) s.textContent=rodando?'Pausar':(atual!==null?'Continuar':'Tocar todos'); todos.classList.toggle('rodando',rodando); }
    document.body.classList.toggle('tocando',naBarra(atual)&&!!$('.barra'));
    var b=porId[atual];
    if(b&&naBarra(atual)){
      var bc=$('.js-bcapa'); if(bc) bc.src=b.capa?b.capa+'?p':'/assets/brand/selo-creme.svg';
      var bn=$('.js-bnome'); if(bn) bn.textContent=b.n;
      var bl=$('.js-blink'); if(bl){ bl.href='/beat/'+b.s; bl.setAttribute('aria-label','Abrir a página de '+b.n); }
      var tt=$('.barra .js-total'); if(tt) tt.textContent=mmss(b.dur);
      var ac=$('.js-bacao'); if(ac&&ac.getAttribute('data-bid')!==String(b.id)){
        ac.setAttribute('data-bid',String(b.id));
        var orig=$('.js-lista .item[data-bid="'+b.id+'"] .preco, .js-lista .item[data-bid="'+b.id+'"] .vendido');
        ac.innerHTML=''; if(orig){ var cp=orig.cloneNode(true); ac.appendChild(cp); }
      }
    }
  }
  function sessao(b){
    try{
      if(!('mediaSession' in navigator)) return;
      var art=b.capa?[{src:location.origin+b.capa,sizes:'1000x1000',type:'image/jpeg'}]:[];
      navigator.mediaSession.metadata=new MediaMetadata({title:b.n,artist:'@rideblan33',album:'Caramujo Records',artwork:art});
      var liga=function(a,fn){ try{ navigator.mediaSession.setActionHandler(a,fn); }catch(_){} };
      liga('play',function(){ som.play().catch(nada); }); liga('pause',function(){ som.pause(); });
      if(naBarra(b.id)){ liga('nexttrack',function(){ var p=vizinho(1); if(p!==null) tocar(p); }); liga('previoustrack',function(){ var p=vizinho(-1); if(p!==null) tocar(p); }); }
    }catch(_){}
  }
  function tocar(id){
    var b=porId[id]; if(!b||!b.mp3) return;
    if(id===atual){ if(som.paused) som.play().catch(nada); else som.pause(); return; }
    atual=id; aquecido=null; som.src=b.mp3; som.play().catch(nada); sessao(b); marca();
  }
  window.__tocarBeat=tocar;
  var comMouse=false; try{ comMouse=matchMedia('(hover:hover) and (pointer:fine)').matches; }catch(_){}
  document.addEventListener('click',function(e){
    var bt=e.target.closest('.js-tocar');
    if(bt){ e.preventDefault(); var id=bt.classList.contains('js-bpp')?atual:Number(bt.getAttribute('data-bid')); if(id!==null) tocar(id); return; }
    // nome do beat: no computador (mouse) abre a página dele, como na vitrine; no dedo toca (04/10/2026)
    var nm=e.target.closest('.item a.nome');
    if(nm){ if(comMouse||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button) return; e.preventDefault(); tocar(Number(nm.closest('.item').getAttribute('data-bid'))); return; }
    if(e.target.closest('a,button,select,label,.trilha')) return;
    var li=e.target.closest('.item'); if(li) tocar(Number(li.getAttribute('data-bid')));
  });
  var todos=$('.js-todos');
  if(todos) todos.addEventListener('click',function(){ if(atual!==null){ tocar(atual); return; } var f=fila(); if(f.length) tocar(f[0]); });
  var ant=$('.js-ant'), prox=$('.js-prox');
  if(ant) ant.addEventListener('click',function(){ if(som.currentTime>3){ som.currentTime=0; return; } var p=vizinho(-1); if(p!==null) tocar(p); });
  if(prox) prox.addEventListener('click',function(){ var p=vizinho(1); if(p!==null) tocar(p); });

  var aquecido=null;
  ['play','pause','ended'].forEach(function(ev){ som.addEventListener(ev,marca); });
  som.addEventListener('playing',function(){ if(atual===null) return; funil('play',atual); funil('toque',atual); });
  som.addEventListener('ended',function(){ var p=vizinho(1); if(p!==null) tocar(p); });
  som.addEventListener('timeupdate',function(){
    var d=som.duration||(porId[atual]||{}).dur||0, pc=d?Math.min(100,som.currentTime/d*100):0;
    $$('.js-trilha').forEach(function(t){ var alvo=t.getAttribute('data-bid'); if(alvo&&Number(alvo)!==atual) return; var i=t.querySelector('i'); if(i) i.style.width=pc+'%'; t.setAttribute('aria-valuenow',String(Math.round(pc))); });
    $$('.js-agora').forEach(function(a){ var tr=a.parentNode.querySelector('.js-trilha'), alvo=tr&&tr.getAttribute('data-bid'); if(alvo&&Number(alvo)!==atual) return; a.textContent=mmss(som.currentTime); });
    var cr=$('.item.tocando .corrida'); if(cr) cr.style.width=pc+'%';
    if(pc>50&&naBarra(atual)&&aquecido!==atual){ aquecido=atual; var p=vizinho(1), b=porId[p]; if(b&&b.mp3) fetch(b.mp3,{headers:{Range:'bytes=0-1'},cache:'no-store'}).catch(nada); }
  });

  /* arrastar na trilha */
  $$('.js-trilha').forEach(function(t){
    function pos(e){ var r=t.getBoundingClientRect(); return Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)); }
    function vai(f){ var alvo=t.getAttribute('data-bid'), id=alvo?Number(alvo):atual; if(id===null||isNaN(id)) return;
      if(id!==atual){ tocar(id); som.addEventListener('loadedmetadata',function um(){ som.removeEventListener('loadedmetadata',um); som.currentTime=f*(som.duration||0); }); return; }
      var d=som.duration||(porId[id]||{}).dur||0; if(d) som.currentTime=f*d; }
    t.addEventListener('pointerdown',function(e){ e.preventDefault(); t.classList.add('ativa'); vai(pos(e)); try{ t.setPointerCapture(e.pointerId); }catch(_){}
      function mexe(ev){ vai(pos(ev)); } function solta(){ t.classList.remove('ativa'); t.removeEventListener('pointermove',mexe); t.removeEventListener('pointerup',solta); t.removeEventListener('pointercancel',solta); }
      t.addEventListener('pointermove',mexe); t.addEventListener('pointerup',solta); t.addEventListener('pointercancel',solta); });
    t.addEventListener('keydown',function(e){ if(atual===null) return; var d=som.duration||0; if(!d) return;
      if(e.key==='ArrowRight'){ som.currentTime=Math.min(d,som.currentTime+5); e.preventDefault(); }
      if(e.key==='ArrowLeft'){ som.currentTime=Math.max(0,som.currentTime-5); e.preventDefault(); } });
  });

  /* ordem da lista (gênero): vendidos no meio, como na vitrine (04/10/2026) */
  var sel=$('.js-ordem'), lista=$('.js-lista');
  if(sel&&lista) sel.addEventListener('change',function(){
    var itens=$$('.item',lista), v=sel.value;
    itens.sort(function(a,b){
      if(v==='novos') return Number(a.getAttribute('data-ordem'))-Number(b.getAttribute('data-ordem'));
      var d=Number(a.getAttribute('data-bpm'))-Number(b.getAttribute('data-bpm')); return v==='bpm+'?-d:d;
    });
    itens.forEach(function(li,i){ lista.appendChild(li); var n=li.querySelector('.num i'); if(n) n.textContent=(i<9?'0':'')+(i+1); });
  });

  /* compartilhar: o mesmo link /b/ que o Bruno usa (prévia com capa; abre esta página) */
  $$('.js-compartilhar').forEach(function(bt){
    bt.addEventListener('click',function(){
      var u=bt.getAttribute('data-url')+'?de=compartilhar', t=bt.getAttribute('data-titulo');
      if(navigator.share){ navigator.share({title:t,url:u}).catch(nada); return; }
      try{ navigator.clipboard.writeText(u).then(function(){ aviso('Link copiado'); },function(){ aviso(u); }); }catch(_){ aviso(u); }
    });
  });
  marca();
  if(document.readyState==='complete') funil('visita'); else window.addEventListener('load',function(){ funil('visita'); });
})();`;
