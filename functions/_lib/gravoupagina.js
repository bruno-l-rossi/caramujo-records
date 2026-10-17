// Página "Quem já gravou" do @rideblan33 (16/10/2026, rodada K): caramujorecords.com.br/rideblan33/artistas
// Mockup aprovado pelo Bruno: canvas linha M ("a página de quem já gravou está ótima").
// Topo com busca, o artista aberto (foto, nome, faixas com link pro Spotify) e a grade de
// todos (mais ouvintes mensais primeiro; diferença pequena = mais faixas, desde 17/10/2026). Dados: _lib/gravou.js (montarGravou) sobre a lista conferida
// em _lib/gravou-lista.js. Nunca link de pasta privada: só Spotify e páginas do site.
// Fora do ar: só quem está logado no painel vê (prévia, noindex).

import { ICONES as ICONES_ABA } from './icones.js';
import { RODAPE_GENEROS, CSS_RODAPE_GENEROS } from './generos.js';
import { LEVA_DE, deAttr } from './origem.js';
import { imgPequena } from './gravou.js';
import { CAPA_VOLTA } from './midia.js';

const SITE = 'https://caramujorecords.com.br';
const SPOTIFY_EU = 'https://open.spotify.com/artist/15K9QWM2Q6Zyxb6RsAn9RZ';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const jsonSeguro = (o) => JSON.stringify(o).replace(/[<>&\u2028\u2029]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
export const iniciais = (nome) => String(nome || '').replace(/^@/, '').split(/[\s_.-]+/).filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';
const nMus = (n) => n + (n === 1 ? ' música' : ' músicas');
// o cartão das faixas solo do @rideblan33 (rodada M) fala "N músicas solo" em vez de "com @rideblan33"
const linhaQtd = (a) => (a.eu ? nMus(a.faixas.length) + ' solo' : nMus(a.faixas.length) + ' com @rideblan33');
const ICONE_SP = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm4.6 14.4a.62.62 0 01-.86.2c-2.35-1.44-5.3-1.76-8.79-.96a.62.62 0 11-.28-1.22c3.81-.87 7.08-.5 9.72 1.12.3.18.39.57.2.86zm1.22-2.73a.78.78 0 01-1.07.26c-2.69-1.65-6.8-2.13-9.98-1.17a.78.78 0 11-.45-1.5c3.64-1.1 8.16-.57 11.24 1.33.37.22.48.71.26 1.08zm.1-2.84C14.7 8.92 9.38 8.74 6.3 9.68a.94.94 0 11-.54-1.8c3.53-1.07 9.4-.86 13.1 1.33a.94.94 0 01-.95 1.62z"/></svg>';
const ICONE_BUSCA = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.6-4.6"/></svg>';
const SETA = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7"/><path d="M8 7h9v9"/></svg>';

// foto redonda (ou as iniciais, quando o Spotify não tem imagem)
export function fotoArtista(a, cls = '', grande = false) {
  return a.foto
    ? `<img class="${cls}" src="${esc(grande ? a.foto : imgPequena(a.foto))}" alt="" loading="lazy" decoding="async" width="${grande ? 320 : 160}" height="${grande ? 320 : 160}">`
    : `<span class="${cls} qg-ini" aria-hidden="true">${esc(iniciais(a.nome))}</span>`;
}

function faixaLi(f) {
  const capa = f.capa ? `<img src="${esc(imgPequena(f.capa))}" alt="" loading="lazy" decoding="async" width="48" height="48">` : '<span class="qg-sem" aria-hidden="true"></span>';
  return `<li><a href="https://open.spotify.com/track/${esc(f.id)}" target="_blank" rel="noopener" data-rede="gravou-faixa" aria-label="Ouvir ${esc(f.nome)} no Spotify">${capa}<div><b>${esc(f.nome)}</b><small>${esc(f.com.join(', '))}</small></div><i>${SETA}</i></a></li>`;
}

// artista com muitas faixas (Mk jr tem 31) abre com as primeiras e um botão pras outras:
// 6 no celular, 8 no computador (2 colunas). As outras já vêm no HTML (o Google lê).
const CURTA = 6;
function cartao(a, faixas) {
  return `<div class="qg-foto">${fotoArtista(a, '', true)}</div><div class="qg-cab2"><div class="q">${a.eu ? 'Produtor e artista' : 'Artista'}</div><h2 id="qgNome">${esc(a.nome)}</h2><div class="q">${linhaQtd(a)}</div>` +
    `<div class="qg-bts"><a class="cheio" href="https://open.spotify.com/artist/${esc(a.id)}" target="_blank" rel="noopener" data-rede="gravou-spotify">${ICONE_SP}<span>Spotify</span></a></div></div>` +
    `<ul class="qg-fx${a.faixas.length > CURTA ? ' curta' : ''}">${a.faixas.map((id) => faixaLi(faixas[id])).join('')}</ul>` +
    (a.faixas.length > CURTA ? `<button class="qg-todas" type="button" data-todas>Ver as ${a.faixas.length} músicas</button>` : '');
}

export function paginaGravou(dados, { previa = false } = {}) {
  const { artistas, faixas, nFaixas } = dados;
  const n = artistas.length;
  const todos = (dados.eu ? [dados.eu] : []).concat(artistas);   // o cartão solo vem antes; os números contam só os artistas
  const primeiro = todos[0];
  const titulo = 'Quem já gravou · Portfólio do @rideblan33';
  const nomes3 = artistas.slice(0, 3).map((a) => a.nome);
  const descricao = `${n} artistas cantaram em ${nFaixas} músicas produzidas pelo @rideblan33: ${nomes3.join(', ')} e mais. Ouça no Spotify.`;
  const lista = {
    '@context': 'https://schema.org', '@type': 'ItemList', name: 'Artistas que gravaram com o @rideblan33', numberOfItems: n,
    itemListElement: artistas.map((a, i) => ({ '@type': 'ListItem', position: i + 1, item: { '@type': 'MusicGroup', name: a.nome, sameAs: `https://open.spotify.com/artist/${a.id}` } }))
  };
  const json = { artistas: todos.map((a) => Object.assign({ id: a.id, n: a.nome, s: a.slug, f: a.foto, fx: a.faixas }, a.eu ? { e: 1 } : {})), faixas };
  return `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descricao)}">
<meta name="robots" content="${previa ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'}">
<link rel="canonical" href="${SITE}/rideblan33/artistas">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Caramujo Records">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descricao)}">
<meta property="og:url" content="${SITE}/rideblan33/artistas">
<meta property="og:image" content="${SITE}/assets/perfil/rideblan33-og-2.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#14110d">
${ICONES_ABA}
<script type="application/ld+json">${jsonSeguro(lista)}</script>
<style>
@font-face{font-family:'Schibsted Grotesk';font-weight:400 900;font-display:swap;src:url(/assets/fonts/schibsted-grotesk-latin-wght-normal.woff2) format('woff2')}
:root{color-scheme:dark;
  --black:#14110d;--fire:#b98f5e;--amber:#c3a074;--cream:#f2ecdf;--bone:#E8E0CF;--label:#9e7c48;--wire:#332c22;--dim:#6f6757;
  --preto:#000;--folha:#141414;--div:#1f1f1f;--branco:#fff;--apoio:#b7b7b7;--meta:#8a8a8a;
  --sans:'Helvetica Neue',Helvetica,Arial,sans-serif;--grot:'Schibsted Grotesk',-apple-system,'Helvetica Neue',Arial,sans-serif}
*{box-sizing:border-box}
html,body{background:var(--preto)}
body{margin:0;color:var(--branco);font-family:var(--grot);-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
a:focus-visible,button:focus-visible,input:focus-visible{outline:2px solid var(--fire);outline-offset:3px}
.so-leitor{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.topo{display:flex;align-items:center;justify-content:space-between;gap:16px;max-width:1180px;margin:0 auto;padding:22px 16px 18px;padding-top:calc(22px + env(safe-area-inset-top,0px))}
.topo .logo{line-height:0}
.topo .logo img{width:132px;height:auto}
.volta{display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 16px;border:1px solid #333;border-radius:999px;font:600 13.5px var(--grot);color:var(--branco);white-space:nowrap}
.volta:hover{border-color:var(--branco)}
.previa{max-width:1180px;margin:0 auto 10px;padding:0 16px;font:500 13px/1.5 var(--grot);color:#e0b155}
.qg{max-width:1180px;margin:0 auto;padding:6px 16px 64px}
.qg .k{font:700 11px var(--grot);letter-spacing:.24em;text-transform:uppercase;color:var(--meta)}
.qg h1{margin:8px 0 6px;font:800 40px/1 var(--grot);letter-spacing:-.02em}
.qg .sub{margin:0 0 20px;font:400 15px/1.5 var(--grot);color:var(--apoio)}
.qg-busca{display:flex;align-items:center;gap:10px;height:48px;padding:0 16px;border:1px solid var(--div);border-radius:999px;background:var(--folha);color:var(--meta);margin-bottom:22px}
.qg-busca input{flex:1;min-width:0;height:100%;border:0;background:transparent;color:var(--branco);font:400 16px var(--grot);outline:none}
.qg-busca input::placeholder{color:var(--meta)}
.qg-aberto{display:grid;grid-template-columns:96px minmax(0,1fr);gap:14px 16px;align-items:center;padding:16px;border:1px solid var(--div);border-radius:20px;background:var(--folha);margin-bottom:30px;scroll-margin-top:12px}
.qg-foto img,.qg-foto .qg-ini{width:96px;height:96px;border-radius:50%;object-fit:cover;display:flex}
.qg-aberto h2{margin:4px 0 2px;font:800 24px/1.1 var(--grot);overflow-wrap:anywhere}
.qg-aberto .q{font-size:13.5px;color:var(--meta)}
.qg-bts{display:flex;gap:8px;margin-top:12px}
.qg-bts a{display:inline-flex;align-items:center;gap:7px;height:36px;padding:0 14px;border-radius:999px;font-weight:700;font-size:13.5px}
.qg-bts a.cheio{background:var(--branco);color:var(--preto)}
.qg-fx{grid-column:1/-1;list-style:none;margin:4px 0 0;padding:0;display:grid;grid-template-columns:minmax(0,1fr)}
.qg-fx li{min-width:0}
.qg-fx.curta li:nth-child(n+7){display:none}
.qg-todas{grid-column:1/-1;justify-self:start;height:40px;padding:0 18px;border:1px solid #333;border-radius:999px;background:none;color:var(--branco);font:600 13.5px var(--grot);cursor:pointer}
.qg-todas:hover{border-color:var(--branco)}
.qg-fx a{display:flex;align-items:center;gap:12px;padding:8px 0;border-top:1px solid var(--div)}
.qg-fx img,.qg-fx .qg-sem{width:48px;height:48px;border-radius:6px;object-fit:cover;flex:none;background:#1c1c1c}
.qg-fx div{min-width:0;flex:1}
.qg-fx b{display:block;font:600 15px var(--grot);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.qg-fx small{display:block;font-size:12.5px;color:var(--meta);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.qg-fx i{flex:none;color:var(--apoio);display:flex}
@media(hover:hover){.qg-fx a:hover b{text-decoration:underline;text-underline-offset:3px}}
.qg-cab{display:flex;justify-content:space-between;align-items:baseline;margin:0 0 14px}
.qg-cab b{font:700 11px var(--grot);letter-spacing:.24em;text-transform:uppercase}
.qg-cab span{font-size:13px;color:var(--meta)}
.qg-grade{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:20px 12px}
.qg-grade button{display:block;width:100%;padding:0;border:0;background:none;color:inherit;font:inherit;cursor:pointer;text-align:center}
.qg-grade img,.qg-grade .qg-ini{display:flex;width:100%;height:auto;aspect-ratio:1;border-radius:50%;object-fit:cover}
.qg-grade b{display:block;margin-top:8px;font:700 14px/1.25 var(--grot);overflow-wrap:anywhere}
.qg-grade small{font-size:12px;color:var(--meta)}
.qg-grade button[aria-pressed="true"] img,.qg-grade button[aria-pressed="true"] .qg-ini{outline:3px solid var(--branco);outline-offset:3px}
.qg-grade li[hidden]{display:none}
.qg-ini{align-items:center;justify-content:center;background:#1c1c1c;color:var(--apoio);font:800 22px var(--grot);letter-spacing:.02em}
.qg-nada{color:var(--meta);font-size:14px;margin:8px 0 0}
.qg-nada[hidden]{display:none}
@media(min-width:600px){.qg-grade{grid-template-columns:repeat(4,1fr);gap:26px 18px}}
@media(min-width:900px){.topo .logo img{width:168px}.qg{padding-top:20px}.qg h1{font-size:56px}.qg-topo{display:grid;grid-template-columns:1fr 420px;align-items:end;gap:30px}
  .qg-grade{grid-template-columns:repeat(6,1fr);gap:30px 22px}.qg-aberto{grid-template-columns:180px 1fr;padding:22px;align-items:start}
  .qg-foto{grid-row:1/3}.qg-foto img,.qg-foto .qg-ini{width:180px;height:180px}.qg-fx{grid-column:2;grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:24px}
  .qg-fx.curta li:nth-child(n+7){display:block}.qg-fx.curta li:nth-child(n+9){display:none}.qg-todas{grid-column:2}}
footer{padding:1.4rem 2.4rem calc(1.4rem + env(safe-area-inset-bottom,0px));background:var(--black);border-top:1px solid var(--wire);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem}
footer img{height:30px;width:auto;display:block}
footer p{margin:0;font-size:.57rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--dim);font-family:var(--sans)}
footer a.foot-perfil{border-bottom:1px solid var(--wire)}
${CSS_RODAPE_GENEROS}
@media (max-width:860px){footer{flex-direction:column;align-items:flex-start;padding:1.2rem 1.2rem calc(1.2rem + env(safe-area-inset-bottom,0px))}footer p{font-size:.63rem}}
</style>
</head>
<body>
${CAPA_VOLTA}
<nav class="topo" aria-label="Caramujo Records">
  <a class="logo" href="/"${deAttr('artistas')} aria-label="Caramujo Records, beats à venda"><img src="/assets/brand/caramujo-h.webp" srcset="/assets/brand/caramujo-h-244.webp 244w, /assets/brand/caramujo-h-366.webp 366w, /assets/brand/caramujo-h.webp 504w" sizes="(max-width:899px) 132px, 168px" alt="Caramujo Records" width="296" height="54"></a>
  <a class="volta" href="/rideblan33"${deAttr('artistas')}>@rideblan33</a>
</nav>
${previa ? '<p class="previa">Prévia: só você vê esta página, porque está logado no painel. Ela aparece pra todo mundo quando você ligar "No ar" em Perfil &gt; Quem já gravou.</p>\n' : ''}<main class="qg">
  <div class="qg-topo"><div><div class="k">Portfólio do @rideblan33</div><h1>Quem já gravou</h1><p class="sub">${n} artistas cantaram em ${nFaixas} músicas produzidas pelo @rideblan33.</p></div>
  <label class="qg-busca">${ICONE_BUSCA}<span class="so-leitor">Buscar artista</span><input id="qgBusca" type="search" placeholder="Buscar artista" autocomplete="off" enterkeyhint="search"></label></div>
  ${primeiro ? `<section class="qg-aberto" id="qgAberto" aria-live="polite" aria-labelledby="qgNome">${cartao(primeiro, faixas)}</section>` : ''}
  <div class="qg-cab"><b>Todos</b><span>${n} artistas</span></div>
  <ul class="qg-grade" id="qgGrade">
${todos.map((a, i) => `    <li${a.eu ? ' class="qg-eu"' : ''} data-busca="${esc(a.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase())}"><button type="button" data-i="${i}" aria-pressed="${i === 0}">${fotoArtista(a)}<b>${esc(a.nome)}</b><small>${nMus(a.faixas.length)}${a.eu ? ' solo' : ''}</small></button></li>`).join('\n')}
  </ul>
  <p class="qg-nada" id="qgNada" hidden>Nenhum artista com esse nome.</p>
</main>
<script type="application/json" id="qgDados">${jsonSeguro(json)}</script>
<footer>
  ${RODAPE_GENEROS}
  <a href="/"${deAttr('artistas')} aria-label="Caramujo Records"><img loading="lazy" width="400" height="400" src="/assets/brand/selo-creme.svg" alt="Caramujo Records"></a>
  <p>© 2026 Caramujo Records — São Carlos, SP</p>
  <p><a class="foot-perfil" href="/rideblan33"${deAttr('artistas')}>@rideblan33</a> · Todos os direitos reservados</p>
</footer>
<script>
(function(){
  var D; try{ D=JSON.parse(document.getElementById('qgDados').textContent); }catch(e){ return; }
  var A=D.artistas, F=D.faixas, ab=document.getElementById('qgAberto'), grade=document.getElementById('qgGrade');
  function pessoa(){try{return localStorage.getItem('cr_pessoa')||'';}catch(e){return '';}}
  function manda(id){try{var o={kind:'perfil-rede',trackId:id,origem:'artistas'},p=pessoa();if(p)o.pessoa=p;var s=JSON.stringify(o);if(navigator.sendBeacon)navigator.sendBeacon('/api/play',new Blob([s],{type:'application/json'}));}catch(e){}}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function peq(u){return String(u||'').replace('ab67616d0000b273','ab67616d00001e02').replace('ab6761610000e5eb','ab67616100005174').replace(/(\\/capa\\/gr[va]-[A-Za-z0-9_-]+?)(?:-m)?\\.jpg$/,'$1-p.jpg');}
  function ini(n){return String(n||'').replace(/^@/,'').split(/[\\s_.-]+/).filter(Boolean).map(function(p){return p[0];}).join('').slice(0,2).toUpperCase()||'?';}
  var SP=${JSON.stringify(ICONE_SP)}, SETA=${JSON.stringify(SETA)};
  function nm(n){return n+(n===1?' música':' músicas');}
  function abrir(i,rolar){
    var a=A[i]; if(!a||!ab) return;
    var foto=a.f?'<img src="'+esc(a.f)+'" alt="" width="320" height="320">':'<span class="qg-ini" aria-hidden="true">'+esc(ini(a.n))+'</span>';
    ab.innerHTML='<div class="qg-foto">'+foto+'</div><div class="qg-cab2"><div class="q">'+(a.e?'Produtor e artista':'Artista')+'</div><h2 id="qgNome">'+esc(a.n)+'</h2><div class="q">'+nm(a.fx.length)+(a.e?' solo':' com @rideblan33')+'</div>'+
      '<div class="qg-bts"><a class="cheio" href="https://open.spotify.com/artist/'+esc(a.id)+'" target="_blank" rel="noopener" data-rede="gravou-spotify">'+SP+'<span>Spotify</span></a></div></div>'+
      '<ul class="qg-fx'+(a.fx.length>6?' curta':'')+'">'+a.fx.map(function(id){var f=F[id];if(!f)return '';return '<li><a href="https://open.spotify.com/track/'+esc(f.id)+'" target="_blank" rel="noopener" data-rede="gravou-faixa" aria-label="Ouvir '+esc(f.nome)+' no Spotify">'+(f.capa?'<img src="'+esc(peq(f.capa))+'" alt="" loading="lazy" width="48" height="48">':'<span class="qg-sem" aria-hidden="true"></span>')+'<div><b>'+esc(f.nome)+'</b><small>'+esc(f.com.join(', '))+'</small></div><i>'+SETA+'</i></a></li>';}).join('')+'</ul>'+(a.fx.length>6?'<button class="qg-todas" type="button" data-todas>Ver as '+a.fx.length+' músicas</button>':'');
    [].forEach.call(grade.querySelectorAll('button[data-i]'),function(b){b.setAttribute('aria-pressed',String(+b.dataset.i===i));});
    if(rolar){ try{ab.scrollIntoView({behavior:'smooth',block:'start'});}catch(e){ab.scrollIntoView();} }
  }
  if(ab) ab.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('[data-todas]'); if(!b) return;
    var ul=ab.querySelector('.qg-fx'); if(ul) ul.classList.remove('curta'); b.remove(); manda('gravou-todas');
  });
  grade.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('button[data-i]'); if(!b) return;
    var i=+b.dataset.i; abrir(i,true);
    try{history.replaceState(null,'','#'+A[i].s);}catch(_){}
    manda('gravou-abre');
  });
  document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[data-rede]');if(a)manda(a.dataset.rede);});
  var busca=document.getElementById('qgBusca'), nada=document.getElementById('qgNada');
  busca.addEventListener('input',function(){
    var q=busca.value.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().trim(), vis=0;
    [].forEach.call(grade.children,function(li){var ok=!q||li.dataset.busca.indexOf(q)>-1; li.hidden=!ok; if(ok)vis++;});
    nada.hidden=vis>0;
  });
  var h=decodeURIComponent((location.hash||'').slice(1));
  if(h){ for(var i=0;i<A.length;i++) if(A[i].s===h){ abrir(i,true); break; } }
})();
</script>
${LEVA_DE}
</body></html>`;
}
