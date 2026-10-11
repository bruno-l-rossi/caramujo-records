/* Vitrine (caramujorecords.com.br): o código da página, fora do index.html desde 10/10/2026
   pra ficar guardado no navegador (?v= no index.html = hash deste arquivo). Cada bloco aqui
   era um script separado da página, na mesma ordem. O que o servidor lê ou escreve (BEATS,
   PRICE_BEAT, PRICE_STEMS, GENRE_LABELS, FEATURED_OVERRIDE_*) segue no index.html. Mexeu
   aqui: node testes/vitrine-versao.mjs (troca o ?v=). */
/* ── MERCADO PAGO ─────────────────────────────────── */
const MP_PUBLIC_KEY = 'APP_USR-31288966-8cae-422f-abe4-09ef24baaeb6';
let mp, brickController, contractPdfData = null;

// O SDK do Mercado Pago só baixa quando a pessoa abre o checkout. Quem entra
// só pra ouvir beat não paga esse peso. Abrir o checkout já dispara o
// download; o CONTINUAR espera ele terminar. Se falhar, o catch do
// goToPayment mostra o PIX manual, como sempre mostrou.
let mpPronto=null;
function carregarMP(){
  if(window.MercadoPago) return Promise.resolve();
  if(!mpPronto) mpPronto=new Promise(function(ok,falha){
    var s=document.createElement('script');
    s.src='https://sdk.mercadopago.com/js/v2';
    s.onload=function(){ window.MercadoPago?ok():(mpPronto=null,falha(new Error('SDK do Mercado Pago veio vazio'))); };
    s.onerror=function(){ mpPronto=null; falha(new Error('SDK do Mercado Pago nao carregou')); };
    document.head.appendChild(s);
  });
  return mpPronto;
}

function downloadContract() {
  if (!contractPdfData) return;
  const name = (document.getElementById('mpName').value.trim() || 'comprador').replace(/\s+/g, '-');
  const html = decodeURIComponent(escape(atob(contractPdfData)));

  // Download direto via Blob: sem pop-up, sem diálogo de impressão.
  // Funciona no celular, onde window.open costumava ser bloqueado.
  try {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contrato-caramujo-${name}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    showToast('Contrato baixado. Ele também está no seu email.', 5000);
  } catch (e) {
    showToast('Não deu pra baixar por aqui, mas o contrato foi enviado no seu email.', 5000);
  }
}

/* cursor: o cursor próprio saiu no redesenho (CSS esconde .cur), mas o código
   seguia mexendo em dois elementos invisíveis a cada movimento do mouse. Saiu (03/10/2026). */

/* beats data: BEATS, PRICE_BEAT e PRICE_STEMS ficam no index.html (o servidor lê e escreve lá) */
let cart=[], curFilt='todos', showAvailOnly=false; // vendidos visíveis por padrão (prova social)
let sortMode='padrao', shuffleOrder=null;
function toggleAvail(btn){
  showAvailOnly=!showAvailOnly;
  btn.classList.toggle('on',showAvailOnly);
  btn.textContent=showAvailOnly?'Mostrar vendidos':'Esconder vendidos';
  curPage=1; renderCards();
}
function sortBeats(v){
  sortMode=v;
  if(v==='aleatorio'){ // embaralha de novo a cada seleção
    shuffleOrder=BEATS.map(b=>b.id);
    for(let i=shuffleOrder.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [shuffleOrder[i],shuffleOrder[j]]=[shuffleOrder[j],shuffleOrder[i]];
    }
  }
  curPage=1; renderCards();
}
let relogioLic=null;
const noCelular=()=>{ try{ return window.matchMedia('(max-width:860px)').matches; }catch(_){ return false; } };

// No celular o balão é position:fixed: sem isso ele nasceria no canto da tela.
// Mede o botão, encaixa embaixo dele e trava dentro da janela.
function posicionarLic(){
  const box=document.getElementById('licBox'), bt=document.querySelector('.lic-toggle');
  if(!box||!bt) return;
  if(!noCelular()){ box.style.cssText=''; return; }
  const r=bt.getBoundingClientRect();
  const larg=Math.min(window.innerWidth-16,360);
  const esq=Math.min(Math.max(8,r.left+r.width/2-larg/2),window.innerWidth-larg-8);
  box.style.width=larg+'px';
  box.style.left=esq+'px';
  box.style.top=(r.bottom+10)+'px';
}
function fecharLic(){
  const box=document.getElementById('licBox');
  if(box) box.classList.remove('open');
  clearTimeout(relogioLic);
}
function contarLic(){                     // some sozinho, mas com tempo de ler
  clearTimeout(relogioLic);
  relogioLic=setTimeout(fecharLic,9000);
}
function toggleLic(e){
  e.stopPropagation();
  const box=document.getElementById('licBox');
  if(!box) return;
  if(box.classList.contains('open')){ fecharLic(); return; }
  posicionarLic();
  box.classList.add('open');
  contarLic();
}
document.addEventListener('click',ev=>{
  const box=document.getElementById('licBox');
  if(!box||!box.classList.contains('open')) return;
  if(ev.target.closest('.lic-wrap')) { contarLic(); return; }   // leu de novo, ganha mais tempo
  fecharLic();
});
window.addEventListener('scroll',()=>{
  const box=document.getElementById('licBox');
  if(box&&box.classList.contains('open')) fecharLic();
},{passive:true});
window.addEventListener('resize',()=>{
  const box=document.getElementById('licBox');
  if(box&&box.classList.contains('open')) posicionarLic();
});
document.addEventListener('keydown',ev=>{ if(ev.key==='Escape') fecharLic(); });
/* GENRE_LABELS fica no index.html (o servidor lê os rótulos de lá) */

/* ── FILTER & RENDER ─────────────────────────────── */
// pílula de gênero é link da página do gênero (pro Google e pra abrir em outra aba);
// o clique normal continua filtrando aqui mesmo (04/10/2026)
function filtLink(e,g,el){ if(e&&(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button)) return true; filt(g,el); return false; }
// "Todos os beats" do menu BEATS: volta o filtro e deixa o link descer até a lista
function filtTodos(){ var b=document.querySelector('.ftabs .ft'); if(b&&curFilt!=='todos') filt('todos',b); return true; }
function filt(g,btn){
  document.querySelectorAll('.ft:not(#filtAvail)').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on'); curFilt=g; curPage=1; beatQuery='';
  // limpa busca ao trocar filtro
  const st=document.getElementById('beatSearchTop');
  const sb=document.getElementById('beatSearchBottom');
  if(st) st.value='';
  if(sb) sb.value='';
  renderCards();
}


const ICO_PLAY='<svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M7 4.5v15l13-7.5z"/></svg>';
const ICO_PAUSE='<svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><rect x="6" y="4.5" width="4" height="15"/><rect x="14" y="4.5" width="4" height="15"/></svg>';
// carrinho com + (Bruno, 27/09): o botão pede a ação, não parece etiqueta de preço
const ICO_CART='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><circle cx="9.5" cy="20" r="1.3"/><circle cx="18" cy="20" r="1.3"/><path d="M2.5 3.5h2.3l2.4 11.1a1.8 1.8 0 001.8 1.4h7.6a1.8 1.8 0 001.8-1.4L21.5 7.4H5.6"/><path d="M14.5 .8v5.4M11.8 3.5h5.4" stroke-width="2"/></svg>';
const ICO_OK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M5 12.5l4.2 4.2L19 7"/></svg>';
function fmtDur(s){s=Math.max(0,Math.round(s||0));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
// endereço da página de cada beat (04/10/2026): o mesmo slug do servidor (functions/_lib/casar.js)
function paginaDoBeat(nome){return '/beat/'+String(nome||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}

const BEATS_PER_PAGE = 10;
let curPage = 1;
let beatQuery = '';

function renderCards(){
  const wrap=document.getElementById('beatCards');
  let src=curFilt==='todos'?BEATS.slice():BEATS.filter(b=>b.genre===curFilt);
  // beat sem MP3 guardado não aparece. Se a vitrine não respondeu, mostro todos:
  // loja no ar vale mais que player perfeito.
  if(window.__VIT_OK) src=src.filter(b=>(window.__VIT[String(b.id)]||{}).mp3);
  if(showAvailOnly) src=src.filter(b=>!b.sold);
  if(beatQuery) src=src.filter(b=>normalizeStr(b.name).includes(beatQuery));
  if(sortMode==='aleatorio'&&shuffleOrder) src.sort((a,b)=>shuffleOrder.indexOf(a.id)-shuffleOrder.indexOf(b.id));
  if(src.length===0){
    wrap.innerHTML=`<div style="padding:2.5rem;text-align:center;color:var(--dim);font-size:.78rem;">Nenhum beat disponível neste filtro no momento.</div>`;
    document.getElementById('pagination').style.display='flex';
    document.getElementById('paginationTop').style.display='flex';
    ['pgPrev','pgNext','pgPrevTop','pgNextTop'].forEach(id=>{
      const el=document.getElementById(id); if(el) el.style.visibility='hidden';
    });
    document.getElementById('pgInfo').style.display='none';
    document.getElementById('pgInfoTop').style.display='none';
    document.getElementById('pgNums').innerHTML='';
    document.getElementById('pgNumsTop').innerHTML='';
    return;
  }
  const totalPages=Math.ceil(src.length/BEATS_PER_PAGE);
  if(curPage>totalPages) curPage=totalPages;
  const start=(curPage-1)*BEATS_PER_PAGE;
  const pageSrc=src.slice(start,start+BEATS_PER_PAGE);

  wrap.innerHTML=pageSrc.map((b,i)=>{
    const globalIdx=start+i;
    const inBeat=cart.some(c=>c.beatId===b.id&&c.stems===false);
    const f=(window.__VIT||{})[String(b.id)]||{};
    const genreLabel=GENRE_LABELS[b.genre]||b.genre;
    const resto=[b.bpm?b.bpm+' BPM':'',b.key||''].filter(Boolean).join('  ·  ');
    const capa=f.capa
      ? `<img class="capa" src="${f.capa}" alt="" loading="lazy" decoding="async">`
      : `<div class="capa vazia"><img src="assets/brand/selo-creme.svg" alt="" width="26" height="26"></div>`;
    return `<div class="item${b.sold?' fora':''}" data-bid="${b.id}">
      <div class="cel-num"><i>${String(globalIdx+1).padStart(2,'0')}</i><b>${ICO_PLAY}</b><span class="eq3"><s></s><s></s><s></s></span></div>
      ${capa}
      <div class="info">
        <a class="nome" href="${paginaDoBeat(b.name)}">${b.name}</a>
        <div class="ficha"><em>${genreLabel}</em>${resto?'  ·  '+resto:''}</div>
      </div>
      <span class="dur">${f.dur?fmtDur(f.dur):''}</span>
      ${b.sold
        ? `<span class="vendido">Vendido</span>`
        : `<button class="preco${inBeat?' on':''}" id="bb${b.id}" type="button" onclick="event.stopPropagation();botaoBeat(${b.id})" aria-label="${inBeat?escA(b.name)+' está no carrinho: abrir o carrinho':'Pôr '+escA(b.name)+' no carrinho'}">${rotuloBotao(inBeat)}</button>`}
      <i class="corrida"></i>
    </div>`;
  }).join('');

  // Barras sempre visíveis (contêm a busca); apenas botões somem com 1 página
  document.getElementById('pagination').style.display = 'flex';
  document.getElementById('paginationTop').style.display = 'flex';
  const hideNav = totalPages <= 1;
  ['pgPrev','pgNext','pgPrevTop','pgNextTop'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.style.visibility = hideNav ? 'hidden' : 'visible';
  });
  document.getElementById('pgInfo').style.display    = hideNav ? 'none' : '';
  document.getElementById('pgInfoTop').style.display = hideNav ? 'none' : '';
  const infoText = `${src.length} BEAT${src.length!==1?'S':''}`;
  document.getElementById('pgInfo').textContent = infoText;
  document.getElementById('pgInfoTop').textContent = infoText;
  renderPageNums(totalPages);
  document.getElementById('pgPrev').disabled    = (curPage===1);
  document.getElementById('pgNext').disabled    = (curPage===totalPages);
  document.getElementById('pgPrevTop').disabled = (curPage===1);
  document.getElementById('pgNextTop').disabled = (curPage===totalPages);
  setTimeout(bindPlayers,30);
}

// Paginação numerada: 1 … 6 [7] 8 … 14 — acesso direto a qualquer página
function renderPageNums(totalPages){
  const build=()=>{
    if(totalPages<=1) return '';
    let pages=[];
    if(totalPages<=7){ pages=Array.from({length:totalPages},(_,i)=>i+1); }
    else{
      pages=[1];
      if(curPage>3) pages.push('…');
      for(let p=Math.max(2,curPage-1);p<=Math.min(totalPages-1,curPage+1);p++) pages.push(p);
      if(curPage<totalPages-2) pages.push('…');
      pages.push(totalPages);
    }
    return pages.map(p=>p==='…'
      ?`<span class="pg-dots">…</span>`
      :`<button class="pg-num${p===curPage?' pg-cur':''}" onclick="gotoPage(${p})" aria-label="Página ${p}">${p}</button>`
    ).join('');
  };
  const html=build();
  document.getElementById('pgNums').innerHTML=html;
  document.getElementById('pgNumsTop').innerHTML=html;
}

function gotoPage(p){
  if(p===curPage) return;
  curPage=p;
  renderCards();
  document.getElementById('beats').scrollIntoView({behavior:'smooth',block:'start'});
}

// Sincroniza os botões dos cards sem re-render: adicionar/tirar do carrinho
// não recria os iframes, então o beat que estiver tocando segue tocando.
function syncBeatButtons(){
  if(typeof window.pintarPrecoPe==='function') window.pintarPrecoPe();
  if(typeof window.pintarHeroAdd==='function') window.pintarHeroAdd();
  document.querySelectorAll('#beatCards .preco').forEach(btn=>{
    const m=(btn.id||'').match(/^bb(\d+)$/); if(!m) return;
    const id=Number(m[1]);
    const inBeat=cart.some(c=>c.beatId===id&&c.stems===false);
    btn.classList.toggle('on',inBeat);
    btn.innerHTML=rotuloBotao(inBeat);
    const b=BEATS.find(x=>x.id===id);
    if(b) btn.setAttribute('aria-label',inBeat?b.name+' está no carrinho: abrir o carrinho':'Pôr '+b.name+' no carrinho');
  });
}

// Botão do beat na lista (11/10/2026): igual ao do player do rodapé. 1º toque põe no
// carrinho; já no carrinho, o toque abre o carrinho. Tirar fica só dentro do carrinho.
const escA=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
function rotuloBotao(no){
  return (no?ICO_OK:ICO_CART)+'<span class="rotulo">'+(no?'No carrinho':'R$'+PRICE_BEAT)+'</span>'+(no?'<span class="ir" aria-hidden="true">›</span>':'');
}
function botaoBeat(id){
  if(cart.some(c=>c.beatId===id&&c.stems===false)){ openCart(); return; }
  toggleBeat(id,false);
}

// Player contínuo: pausa os outros ao dar play; ao terminar, toca o próximo.
// No fim da página, avança pra próxima e segue tocando (modo rádio).
// O scroll automático só acontece se o catálogo estiver visível: se o usuário
// estiver lendo outra seção (ou digitando no formulário), a página não pula.
function catalogVisible(){
  const el=document.getElementById('beats');
  if(!el) return false;
  const r=el.getBoundingClientRect();
  return r.top<window.innerHeight && r.bottom>0;
}
let autoPlayFirst=false;
let luckyPlayId=null; // beat sorteado pelo "Estou com sorte"
function bindPlayers(){
  // Não existe mais iframe pra ligar. Depois de cada render eu só repinto o
  // estado do player e resolvo o que ficou pendente: página nova em modo rádio
  // e o beat sorteado no "Estou com sorte".
  if(typeof window.repintarPlayer==='function') window.repintarPlayer();
  if(autoPlayFirst){
    autoPlayFirst=false;
    var primeiro=document.querySelector('#beatCards .item');
    if(primeiro){
      if(catalogVisible()) primeiro.scrollIntoView({behavior:'smooth',block:'center'});
      setTimeout(function(){ window.tocarBeat(primeiro.dataset.bid); },300);
    }
  }
  if(luckyPlayId!==null){
    var alvo=luckyPlayId; luckyPlayId=null;
    setTimeout(function(){ window.tocarBeat(alvo); },200);
  }
}

// Sorteia um beat disponível (respeita o filtro de gênero ativo) e toca
function feelingLucky(){
  const pool=(curFilt==='todos'?BEATS:BEATS.filter(b=>b.genre===curFilt)).filter(b=>!b.sold);
  if(pool.length===0){ showToast('Nenhum beat disponível neste filtro.'); return; }
  const pick=pool[Math.floor(Math.random()*pool.length)];
  // limpa a busca pra garantir que o sorteado esteja na lista
  beatQuery='';
  const st=document.getElementById('beatSearchTop');
  const sb=document.getElementById('beatSearchBottom');
  if(st) st.value=''; if(sb) sb.value='';
  // recalcula a lista na mesma ordem do renderCards pra achar a página do sorteado
  let src=curFilt==='todos'?BEATS.slice():BEATS.filter(b=>b.genre===curFilt);
  if(showAvailOnly) src=src.filter(b=>!b.sold);
  if(sortMode==='aleatorio'&&shuffleOrder) src.sort((a,b)=>shuffleOrder.indexOf(a.id)-shuffleOrder.indexOf(b.id));
  const idx=src.findIndex(b=>b.id===pick.id);
  curPage=Math.floor(idx/BEATS_PER_PAGE)+1;
  luckyPlayId=pick.id;
  renderCards();
  // Scroll + destaque imediatos (independem do player carregar; o play vem no bindPlayers)
  setTimeout(()=>{
    const card=document.querySelector(`#beatCards .item[data-bid="${pick.id}"]`);
    if(card){
      card.scrollIntoView({behavior:'smooth',block:'center'});
      card.classList.add('lucky-hit');
      setTimeout(()=>card.classList.remove('lucky-hit'),2800);
    }
  },120);
  showToast(`✦ Na sorte: "${pick.name}"`);
}

// Schema.org: catálogo como lista de produtos (SEO). Desde 03/10/2026 cada beat leva a
// capa da beat tape dele (quando a vitrine responde, a lista é refeita com as capas).
window.__ldCatalogo=(function(){
  const SITE_IMAGE="https://caramujorecords.com.br/og-image.png";
  const GENRE_LABEL={trap:'trap',boombap:'boom bap',plug:'plug',hoodtrap:'hood trap',experimental:'experimental',hard:'hard',detroit:'detroit',drumless:'drumless',funk:'funk',pluggnb:'plugg&b',bounce:'bounce',nomelody:'no melody',drill:'drill'};
  const imagem=(b)=>{ const f=(window.__VIT||{})[String(b.id)]; const c=f&&(f.capaF||f.capaG); return c ? (/^https?:/.test(c)?c:'https://caramujorecords.com.br'+c) : SITE_IMAGE; };
  // cada beat tem a página dele desde 03/10/2026 (/beat/<nome>): o Google liga o item a ela
  const pagina=(b)=>'https://caramujorecords.com.br/beat/'+String(b.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  let tag=null;
  return function monta(){
  const ld={"@context":"https://schema.org","@type":"ItemList","name":"Catálogo de beats — Caramujo Records",
    "itemListElement":BEATS.map((b,i)=>({"@type":"ListItem","position":i+1,
      "item":{"@type":"Product","name":b.name,"url":pagina(b),
        "image":imagem(b),
        "description":`Beat ${GENRE_LABEL[b.genre]||b.genre}, ${b.bpm} BPM, tom ${b.key}. Produzido por @rideblan33 (Caramujo Records). Licença exclusiva: a faixa sai do catálogo assim que é vendida.`,
        "brand":{"@type":"Brand","name":"Caramujo Records"},
        "offers":{"@type":"Offer","priceCurrency":"BRL","price":PRICE_BEAT,
          "availability":b.sold?"https://schema.org/SoldOut":"https://schema.org/InStock",
          "hasMerchantReturnPolicy":{"@type":"MerchantReturnPolicy",
            "returnPolicyCategory":"https://schema.org/MerchantReturnNotPermitted",
            "applicableCountry":"BR"},
          "shippingDetails":{"@type":"OfferShippingDetails",
            "shippingRate":{"@type":"MonetaryAmount","value":"0","currency":"BRL"},
            "shippingDestination":{"@type":"DefinedRegion","addressCountry":"BR"},
            "deliveryTime":{"@type":"ShippingDeliveryTime",
              "handlingTime":{"@type":"QuantitativeValue","minValue":0,"maxValue":0,"unitCode":"DAY"},
              "transitTime":{"@type":"QuantitativeValue","minValue":0,"maxValue":1,"unitCode":"DAY"}}}}}}))};
  if(!tag){ tag=document.createElement('script'); tag.type='application/ld+json'; tag.id='ldCatalogo'; document.head.appendChild(tag); }
  tag.textContent=JSON.stringify(ld);
  };
})();
// as duas chamadas que rodam na abertura ficam protegidas (10/10/2026): antes este bloco era um
// script separado; se uma delas quebrar, o resto do arquivo (menu, carrinho, checkout) segue rodando
try{ window.__ldCatalogo(); }catch(e){ setTimeout(function(){ throw e; }); }

function changePage(dir,doScroll=true){
  curPage+=dir;
  renderCards();
  if(doScroll) document.getElementById('beats').scrollIntoView({behavior:'smooth',block:'start'});
}

function normalizeStr(s){ return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }
function searchBeats(query){
  beatQuery = normalizeStr(query.trim());
  curPage = 1;
  // sincroniza os dois campos
  const top=document.getElementById('beatSearchTop');
  const bot=document.getElementById('beatSearchBottom');
  if(top && top.value!==query) top.value=query;
  if(bot && bot.value!==query) bot.value=query;
  renderCards();
}

/* ── CART ────────────────────────────────────────── */
let cartOpenedOnce=false; // abre o painel só na 1ª adição; depois, toast

function openCart(){
  document.getElementById('cartPanel').classList.add('open');
  document.getElementById('overlay').classList.add('on');
}

// 1ª adição: abre o carrinho (confirma que funcionou e mostra o upsell).
// Das seguintes em diante: toast + pulso no botão, sem sequestrar a tela.
function confirmAdd(label){
  if(!cartOpenedOnce){ cartOpenedOnce=true; openCart(); }
  else showToast(`✓ ${label} no carrinho`);
}

function toggleBeat(beatId,stems){
  const beat=BEATS.find(b=>b.id===beatId);
  const existing=cart.findIndex(c=>c.beatId===beatId&&c.stems===stems);
  if(existing===-1){
    // Verifica se o beat já está reservado em algum pacote no carrinho
    const inPkg=cart
      .filter(c=>c.type==='Pacote'&&c.pkgBeats)
      .flatMap(c=>c.pkgBeats.flat())
      .some(b=>Number(b.id)===Number(beatId));
    if(inPkg){
      showToast(`"${beat.name}" já está reservado em um pacote no carrinho.`);
      return;
    }
    const otherIdx=cart.findIndex(c=>c.beatId===beatId&&c.stems!==stems);
    if(otherIdx!==-1) cart.splice(otherIdx,1);
    cart.push({id:Date.now(),beatId:beat.id,name:stems?`${beat.name} + Stems`:beat.name,price:stems?PRICE_STEMS:PRICE_BEAT,orig:stems?PRICE_STEMS:PRICE_BEAT,type:'Beat',stems});
    updateCart(); syncBeatButtons();
    piscar(document.getElementById('bb'+beat.id));
    piscar(document.getElementById('navCart'));
    confirmAdd(`"${beat.name}"`);
  } else {
    cart.splice(existing,1);
    updateCart(); syncBeatButtons();
  }
  const cb=document.querySelector('.cart-btn');
  cb.style.transform='scale(1.07)';setTimeout(()=>{cb.style.transform='';},200);
}

// ── PKG BEAT SELECTOR ────────────────────────────────
let _pkgPending = null; // { name, price, unitPrice, stems, qty, required }

function addPkg(name, price) {
  const stems = name.includes('Stems');
  const qty = name.startsWith('1') ? 1 : name.startsWith('2') ? 2 : 3;
  _pkgPending = { name, price, unitPrice: price, stems, qty, required: qty, selectedBeats: [] };
  openPkgModal();
}

let _pkgAvailable = []; // beats disponíveis para o modal atual

function openPkgModal() {
  // IDs e nomes já ocupados: beats em pacotes + beats avulsos no carrinho
  const cartBeatIds = cart
    .filter(c => c.type === 'Beat' && c.beatId != null)
    .map(c => Number(c.beatId));
  const pkgBeatIds = cart
    .filter(c => c.type === 'Pacote' && c.pkgBeats)
    .flatMap(c => c.pkgBeats.flat().map(b => Number(b.id)));
  const reservedIds = new Set([...cartBeatIds, ...pkgBeatIds]);

  // Fallback por nome: nomes de beats avulsos no carrinho
  const cartBeatNames = new Set(
    cart
      .filter(c => c.type === 'Beat')
      .map(c => c.name.replace(' + Stems', '').trim().toUpperCase())
  );

  _pkgAvailable = BEATS.filter(b =>
    !b.sold &&
    !reservedIds.has(Number(b.id)) &&
    !cartBeatNames.has(b.name.toUpperCase())
  );
  const p = _pkgPending;

  document.getElementById('pkgModalTitle').textContent =
    `Escolha ${p.required} beat${p.required > 1 ? 's' : ''}`;
  const reservedCount = reservedIds.size;
  document.getElementById('pkgModalSub').textContent =
    `Selecione exatamente ${p.required} beat${p.required > 1 ? 's' : ''} do catálogo.`;
  document.getElementById('pkgRequired').textContent = p.required;
  document.getElementById('pkgSelectedCount').textContent = '0';
  document.getElementById('pkgConfirmBtn').disabled = true;
  document.getElementById('pkgSearchInput').value = '';
  p.selectedBeats = [];

  renderPkgBeatList(_pkgAvailable);

  document.getElementById('pkgModal').classList.add('open');
  document.getElementById('overlay').classList.add('on');
  // foco na busca após abertura
  setTimeout(() => document.getElementById('pkgSearchInput').focus(), 80);
}

function renderPkgBeatList(beats) {
  const list = document.getElementById('pkgBeatList');
  if (beats.length === 0) {
    list.innerHTML = '<div class="pkg-no-results">Nenhum beat encontrado.</div>';
    return;
  }
  const p = _pkgPending;
  list.innerHTML = beats.map(b => {
    const sel = p.selectedBeats.some(s => s.id === b.id);
    return `
    <div class="pkg-beat-item${sel ? ' selected' : ''}" id="pbi-${b.id}" onclick="togglePkgBeat(${b.id}, '${b.name.replace(/'/g, "\\'")}')">
      ${(window.__VIT&&(window.__VIT[String(b.id)]||{}).mp3) ? `<button class="pkg-play" type="button" data-bid="${b.id}" aria-label="Ouvir ${b.name.replace(/"/g,'&quot;')}" onclick="event.stopPropagation();window.tocarBeat(${b.id})"></button>` : ''}
      <div class="pkg-beat-info">
        <div class="pkg-beat-name">${b.name}</div>
        <div class="pkg-beat-meta">${b.bpm} BPM · ${b.key} · ${GENRE_LABELS[b.genre] || b.genre}</div>
      </div>
      <div class="pkg-beat-cb" id="pbc-${b.id}">${sel ? '✓' : ''}</div>
      <i class="pkg-corrida"></i>
    </div>`;
  }).join('');
  if (typeof window.repintarPlayer === 'function') window.repintarPlayer();
}

function filterPkgBeats(query) {
  const q = normalizeStr(query.trim());
  const filtered = q
    ? _pkgAvailable.filter(b => normalizeStr(b.name).includes(q) || normalizeStr(GENRE_LABELS[b.genre]||b.genre).includes(q))
    : _pkgAvailable;
  renderPkgBeatList(filtered);
}

function togglePkgBeat(id, name) {
  const p = _pkgPending;
  const idx = p.selectedBeats.findIndex(b => b.id === id);
  if (idx >= 0) {
    p.selectedBeats.splice(idx, 1);
    const el = document.getElementById(`pbi-${id}`);
    if (el) { el.classList.remove('selected'); document.getElementById(`pbc-${id}`).textContent = ''; }
  } else {
    if (p.selectedBeats.length >= p.required) {
      showToast(`Selecione apenas ${p.required} beat${p.required > 1 ? 's' : ''}.`);
      return;
    }
    p.selectedBeats.push({ id, name });
    const el = document.getElementById(`pbi-${id}`);
    if (el) { el.classList.add('selected'); document.getElementById(`pbc-${id}`).textContent = '✓'; }
  }
  const count = p.selectedBeats.length;
  document.getElementById('pkgSelectedCount').textContent = count;
  document.getElementById('pkgConfirmBtn').disabled = count !== p.required;
}

function closePkgModal() {
  document.getElementById('pkgModal').classList.remove('open');
  document.getElementById('overlay').classList.remove('on');
  _pkgPending = null;
}

function confirmPkgSelection() {
  const p = _pkgPending;
  if (!p || p.selectedBeats.length !== p.required) return;

  const beatNames = p.selectedBeats.map(b => b.name).join(', ');
  const label = `${p.name} (${beatNames})`;

  // 11/10/2026: o desconto é por quantidade de beats no carrinho, então o pacote vira os beats
  // escolhidos, um por um (tirar um deles do carrinho funciona como qualquer beat)
  p.selectedBeats.forEach((sb,i)=>{
    const b=BEATS.find(x=>Number(x.id)===Number(sb.id));
    if(!b||cart.some(c=>c.beatId===b.id&&!c.stems)) return;
    cart.push({id:Date.now()+i,beatId:b.id,name:b.name,price:PRICE_BEAT,orig:PRICE_BEAT,type:'Beat',stems:false});
  });
  if(typeof syncBeatButtons==='function') syncBeatButtons();

  document.getElementById('pkgModal').classList.remove('open');
  document.getElementById('overlay').classList.remove('on');
  const pkgLabel=p.name;
  _pkgPending = null;
  updateCart();
  cartOpenedOnce=true;
  openCart(); // pacote: fluxo terminou num modal, mostrar o carrinho é o passo natural
}

function addSvc(name,unitPrice){
  const existing=cart.find(c=>c.name===name&&c.type==='Servico');
  if(existing){
    existing.qty++;
    existing.price=existing.unitPrice*existing.qty;
  } else {
    cart.push({id:Date.now(),name,price:unitPrice,unitPrice,type:'Servico',qty:1,beatId:null,stems:false});
  }
  updateCart();
  confirmAdd(name);
}

function changeQty(id,delta){
  const item=cart.find(c=>c.id===id);
  if(!item) return;
  item.qty=Math.max(1,item.qty+delta);
  item.price=item.unitPrice*item.qty;
  updateCart();
}

function removeItem(id){
  cart=cart.filter(c=>c.id!==id);
  updateCart();renderCards();
}

function clearCart(){
  cart=[];
  // Limpa cupom aplicado
  activeCoupon=null;
  const inp=document.getElementById('cpCouponInput');
  if(inp) inp.value='';
  showCouponMsg('','');
  updateCart();renderCards();
}

/* ── COUPON SYSTEM ───────────────────────────────── */
// Os códigos e limites vivem no servidor (functions/coupons.json).
// O front só envia o código digitado pra /api/validate-coupon.
let activeCoupon = null; // { code, pct?, fixedPrice? }

/* ── LEVE MAIS, PAGUE MENOS (11/10/2026) ─────────────────────────────────
   Desconto por quantidade de beats, sozinho no carrinho: 1 = R$119, 2 = R$219, 3 = R$299,
   4 = R$90 cada, 5 ou mais = R$80 cada (LEVE_MAIS no index.html; o servidor refaz a mesma conta
   com a mesma tabela). No carrinho, cada beat mostra o preço cheio riscado e o novo ao lado:
   até 3 beats, o 2º sai por R$100 e o 3º por R$80; com 4 ou mais, todos saem pelo preço do degrau. */
function totalDosBeats(n){
  if(n<=0) return 0;
  if(n===1) return PRICE_BEAT;
  const t=(typeof LEVE_MAIS==='object'&&LEVE_MAIS)||{};
  if(t[String(n)]) return t[String(n)];
  let cada=0, desde=0;
  Object.keys(t).forEach(k=>{ const m=k.match(/^(\d+)\+$/); if(m&&n>=Number(m[1])&&Number(m[1])>desde){ desde=Number(m[1]); cada=t[k]; } });
  return cada ? cada*n : PRICE_BEAT*n;
}
function precosDosBeats(n){
  const out=[];
  if(n<=3){ for(let i=1;i<=n;i++) out.push(totalDosBeats(i)-totalDosBeats(i-1)); return out; }
  const tot=totalDosBeats(n), cada=Math.floor(tot/n);
  for(let i=0;i<n;i++) out.push(i<n-1?cada:tot-cada*(n-1));
  return out;
}
function aplicarLeveMais(){
  const beats=cart.filter(c=>c.type==='Beat'&&!c.stems);
  const p=precosDosBeats(beats.length);
  beats.forEach((c,i)=>{ c.orig=PRICE_BEAT; c.price=p[i]; });
}
function descontoLeveMais(){
  const beats=cart.filter(c=>c.type==='Beat'&&!c.stems);
  return beats.length*PRICE_BEAT-totalDosBeats(beats.length);
}

function calcDiscount(subtotal) {
  if (!activeCoupon) return 0;
  if (activeCoupon.fixedPrice !== undefined && activeCoupon.fixedPrice !== null) return Math.max(0, subtotal - activeCoupon.fixedPrice);
  // cupom só dos beats (o da lista, 11/10/2026): a % sobre os beats, já com o Leve mais
  if (activeCoupon.escopo === 'beats') return Math.round(totalDosBeats(cart.filter(c=>c.type==='Beat'&&!c.stems).length) * activeCoupon.pct / 100);
  return Math.round(subtotal * activeCoupon.pct / 100);
}

async function applyCoupon() {
  const input = document.getElementById('cpCouponInput');
  const btn = document.getElementById('cpCouponBtn');
  const code = input.value.trim().toUpperCase();
  if (!code) { showCouponMsg('Digite um cupom.', false); return; }
  btn.disabled = true; btn.textContent = '...';
  try {
    const r = await fetch('/api/validate-coupon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const d = await r.json();
    if (!d.valid) {
      activeCoupon = null;
      showCouponMsg(d.reason === 'expired' ? 'Cupom expirado.' : 'Cupom inválido.', false);
      updateCart();
      return;
    }
    activeCoupon = { code, pct: d.pct, fixedPrice: d.fixedPrice, escopo: d.escopo || null };
    const label = (d.fixedPrice !== undefined && d.fixedPrice !== null) ? `preço fixo R$${d.fixedPrice}!` : d.escopo === 'beats' ? `${d.pct}% nos beats do catálogo!` : `${d.pct}% de desconto!`;
    showCouponMsg(`✓ ${code} aplicado — ${label}`, true);
    updateCart();
  } catch (e) {
    showCouponMsg('Não deu pra validar agora. Tenta de novo em instantes.', false);
  } finally {
    btn.disabled = false; btn.textContent = 'APLICAR';
  }
}

function removeCoupon() {
  activeCoupon = null;
  document.getElementById('cpCouponInput').value = '';
  document.getElementById('cpCouponMsg').textContent = '';
  document.getElementById('cpCouponMsg').className = 'cp-coupon-msg';
  updateCart();
}

function showCouponMsg(text, ok) {
  const msg = document.getElementById('cpCouponMsg');
  msg.textContent = text;
  msg.className = 'cp-coupon-msg ' + (ok ? 'ok' : 'err');
}

// piscada curta: no celular o carrinho fica lá em cima, então o item tem que
// dar um sinal de que entrou.
function piscar(el){
  if(!el) return;
  el.classList.remove('piscou');
  void el.offsetWidth;                 // reinicia a animação se clicar de novo
  el.classList.add('piscou');
  setTimeout(function(){ el.classList.remove('piscou'); }, 700);
}

function updateCart(){
  // Badge conta unidades (pacote de 3 + 2 mixagens = 5), não linhas do carrinho
  const units=cart.reduce((s,c)=>s+(c.qty||1),0);
  document.getElementById('cartN').textContent=units;
  document.getElementById('cartBtn').classList.toggle('has-items',cart.length>0);
  // no celular o carrinho mora no topo: a bolha flutuante tapava os botões de preço
  var nc=document.getElementById('navCart'), nn=document.getElementById('cartNTopo');
  if(nn) nn.textContent=units;
  if(nc) nc.classList.toggle('has-items',cart.length>0);
  aplicarLeveMais(); const subtotal=cart.reduce((s,c)=>s+c.price,0);
  const discount=calcDiscount(subtotal);
  const total=subtotal - discount;
  const totEl=document.getElementById('cpTot');
  // a conta embaixo (11/10/2026): preço cheio, desconto dos beats, cupom e o total
  const qtdOff=descontoLeveMais(), nBeats=cart.filter(c=>c.type==='Beat'&&!c.stems).length;
  const conta=document.getElementById('cpConta');
  if(conta){
    const linhas=[];
    if(qtdOff>0||discount>0) linhas.push(`<div class="cp-l"><span>Total sem desconto</span><span>R$${subtotal+qtdOff}</span></div>`);
    if(qtdOff>0) linhas.push(`<div class="cp-l off"><span>Desconto · ${nBeats} beats</span><span>−R$${qtdOff}</span></div>`);
    if(discount>0) linhas.push(`<div class="cp-l off"><span>Cupom ${activeCoupon&&activeCoupon.code?activeCoupon.code:''}</span><span>−R$${discount}</span></div>`);
    conta.innerHTML=linhas.join('');
    conta.hidden=!linhas.length;
  }
  totEl.textContent=`R$ ${total}`;
  const pb=document.getElementById('cpBody');
  if(cart.length===0){
    pb.innerHTML='<div class="cp-empty">Nenhum item adicionado.</div>';
    return;
  }
  pb.innerHTML=cart.map(c=>`
    <div class="ci">
      <div style="flex:1;min-width:0;">
        <div class="ci-n">${(c.type==='Servico'||c.type==='Pacote')&&c.qty>1?`${c.name} ×${c.qty}`:c.name}</div>
        ${c.type==='Pacote'&&c.pkgBeats?`<div class="ci-t" style="line-height:1.6;">${c.pkgBeats.map((g,i)=>g.map(b=>b.name).join(', ')).join(' · ')}</div>`:`<div class="ci-t">${c.type}${c.stems?' · Com Stems':''}</div>`}
      </div>
      <div style="display:flex;align-items:center">
        ${c.type==='Servico'?`
          <div class="ci-qty">
            <button class="ci-qty-btn" onclick="changeQty(${c.id},-1)">−</button>
            <div class="ci-qty-n">${c.qty}</div>
            <button class="ci-qty-btn" onclick="changeQty(${c.id},1)">+</button>
          </div>`:''
        }
        <span class="ci-p">${c.type==='Beat'&&c.orig&&c.orig>c.price?`<s>R$${c.orig}</s> `:''}R$${c.price}</span>
        <button class="ci-rm" onclick="removeItem(${c.id})">✕</button>
      </div>
    </div>`).join('');

  // Upsell: sempre mostrar o próximo degrau de custo-benefício
  const ups=[];

  // — beats: o próximo degrau do Leve mais, pague menos (11/10/2026) —
  const prox=nBeats+1;
  if(nBeats>=1&&totalDosBeats(prox)<PRICE_BEAT*prox&&totalDosBeats(prox)/prox<totalDosBeats(nBeats)/nBeats){
    const mais=totalDosBeats(prox)-totalDosBeats(nBeats);
    ups.push({msg:prox>=4&&totalDosBeats(prox)%prox===0
      ?`Com ${prox} beats, cada um sai por R$${totalDosBeats(prox)/prox}: ${prox} por R$${totalDosBeats(prox)}.`
      :`Põe mais um e ele sai por R$${mais}: ${prox} beats por R$${totalDosBeats(prox)}.`,href:'#beats',cta:`Escolher o ${prox}º beat →`});
  }

  // — mix / master / combo —
  const hasMix=cart.some(c=>c.type==='Servico'&&c.name==='Mixagem');
  const hasMaster=cart.some(c=>c.type==='Servico'&&c.name==='Masterização');
  const hasCombo=cart.some(c=>c.type==='Servico'&&c.name==='Mix + Master');
  if(!hasCombo){
    if(hasMix&&hasMaster) ups.push({msg:`Mix + Master junto sai por R$199 em vez de R$228 — <span class="cp-save">economize R$29</span>`,href:'#services',cta:'Ver Mix + Master →'});
    else if(hasMix)       ups.push({msg:`Leve o Mix + Master por R$199: o master sai por R$50 em vez de R$79 — <span class="cp-save">economize R$29</span>`,href:'#services',cta:'Ver Mix + Master →'});
    else if(hasMaster)    ups.push({msg:`Leve o Mix + Master por R$199: a mix sai por R$120 em vez de R$149 — <span class="cp-save">economize R$29</span>`,href:'#services',cta:'Ver Mix + Master →'});
  }

  ups.forEach(u=>{
    pb.innerHTML+=`<div class="cp-upsell"><span class="cp-upsell-tag">melhor custo-benefício</span>${u.msg}<a class="cp-upsell-link" href="${u.href}" onclick="closeAll()">${u.cta}</a></div>`;
  });
}


function addMoreItems(){ toggleCart(); }

function toggleCart(){
  const panel=document.getElementById('cartPanel');
  const ov=document.getElementById('overlay');
  panel.classList.toggle('open');
  ov.classList.toggle('on');
}

function closeAll(){
  document.getElementById('cartPanel').classList.remove('open');
  document.getElementById('overlay').classList.remove('on');
  if(document.getElementById('pkgModal').classList.contains('open')){
    closePkgModal();
  }
}

/* ── CHECKOUT FLOW ───────────────────────────────── */
function openCheckout(){
  carregarMP().catch(function(){});
  if(cart.length===0){
    showToast('Adicione pelo menos um item ao carrinho.');
    return;
  }
  aplicarLeveMais(); const subtotal=cart.reduce((s,c)=>s+c.price,0);
  const discount=calcDiscount(subtotal);
  const total=subtotal - discount;
  const unitsCk=cart.reduce((s,c)=>s+(c.qty||1),0);
  const items=cart.map(c=>c.qty&&c.qty>1?`${c.name} x${c.qty}`:c.name).join(', ');
  const discountStr=discount>0?` (${activeCoupon.code} ${(activeCoupon.fixedPrice!==undefined&&activeCoupon.fixedPrice!==null)?`→ R$${activeCoupon.fixedPrice}`:`-${activeCoupon.pct}%`})`:'';
  document.getElementById('mpModalSub').textContent=`${unitsCk} ite${unitsCk===1?'m':'ns'} · R$ ${total}${discountStr}`;
  document.getElementById('mpStep1').style.display='block';
  document.getElementById('mpStep2').style.display='none';
  document.getElementById('mpStep3').style.display='none';
  document.getElementById('mpEmail').value='';
  document.getElementById('mpArtist').value='';
  document.getElementById('mpName').value='';
  document.getElementById('mpCpf').value='';
  document.getElementById('mpEmailErr').textContent='';
  document.getElementById('mpArtistErr').textContent='';
  document.getElementById('mpCpfErr').textContent='';
  document.getElementById('mpTermsCheck').checked=false;
  document.getElementById('mpTermsErr').textContent='';
  document.querySelector('.mp-terms-box').classList.remove('error');
  contractPdfData = null;
  document.getElementById('mpContractDownload').style.display='none';
  document.getElementById('mpPixPending').style.display='none';
  document.getElementById('mpPixConfirmed').style.display='none';
  document.getElementById('mpPixStatusText').textContent='Aguardando pagamento…';
  document.getElementById('mpPixStatusDot').style.background='var(--rust)';
  if(pixPollingTimer){clearTimeout(pixPollingTimer);pixPollingTimer=null;}
  const errBox = document.getElementById('mpBrickError');
  if(errBox) errBox.style.display='none';
  document.getElementById('overlay').classList.add('on');
  document.getElementById('mpModal').classList.add('open');
  closeAll();
}

function closeCheckout(){
  document.getElementById('mpModal').classList.remove('open');
  document.getElementById('overlay').classList.remove('on');
  if(brickController){try{brickController.unmount();}catch(e){}brickController=null;}
  if(pixPollingTimer){clearTimeout(pixPollingTimer);pixPollingTimer=null;}
}

function mpValidateEmail(){
  const v=document.getElementById('mpEmail').value;
  const ok=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  document.getElementById('mpEmailErr').textContent=v&&!ok?'Email inválido':'';
  return ok;
}

function mpMaskCpf(el){
  let v=el.value.replace(/\D/g,'').slice(0,11);
  if(v.length>9) v=v.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/,'$1.$2.$3-$4');
  else if(v.length>6) v=v.replace(/(\d{3})(\d{3})(\d{0,3})/,'$1.$2.$3');
  else if(v.length>3) v=v.replace(/(\d{3})(\d{0,3})/,'$1.$2');
  el.value=v;
}

function mpValidateCpf(){
  const raw=document.getElementById('mpCpf').value.replace(/\D/g,'');
  const ok=raw.length===11;
  document.getElementById('mpCpfErr').textContent=raw.length>0&&!ok?'CPF incompleto':'';
  return ok;
}

function mpToggleTerms(){
  if(document.getElementById('mpTermsCheck').checked){
    document.querySelector('.mp-terms-box').classList.remove('error');
    document.getElementById('mpTermsErr').textContent='';
  }
}

// Recado do servidor no pagamento (25/09/2026), na mesma caixa dos erros do cartão.
function avisoPagamento(msg){
  try{
    let box=document.getElementById('mpBrickError');
    if(!box){
      box=document.createElement('div'); box.id='mpBrickError';
      box.style.cssText='margin:-.5rem 0 .8rem;padding:.7rem 1rem;background:var(--mole);border:1px solid var(--wire);border-left:3px solid var(--blood);color:var(--bone);font-size:.74rem;font-family:"IBM Plex Mono",monospace;line-height:1.5;';
      const c=document.getElementById('mpBrickContainer'); if(!c) return; c.before(box);
    }
    box.textContent=msg; box.style.display='block';
    clearTimeout(box._t); box._t=setTimeout(()=>{ box.style.display='none'; },12000);
  }catch(_){}
}

async function goToPayment(){
  const emailOk=mpValidateEmail();
  const cpfOk=mpValidateCpf();
  const name=document.getElementById('mpName').value.trim();
  const artistName=document.getElementById('mpArtist').value.trim();
  const termsChecked=document.getElementById('mpTermsCheck').checked;

  if(!emailOk){document.getElementById('mpEmailErr').textContent='Informe um email válido.';return;}
  if(!artistName){document.getElementById('mpArtist').focus();document.getElementById('mpArtist').style.borderColor='var(--fire)';setTimeout(()=>{document.getElementById('mpArtist').style.borderColor='';},2000);document.getElementById('mpArtistErr').textContent='Informe seu nome artístico.';return;}
  if(!name){document.getElementById('mpName').focus();document.getElementById('mpName').style.borderColor='var(--fire)';setTimeout(()=>{document.getElementById('mpName').style.borderColor='';},2000);showModalErr('Informe seu nome completo.');return;}
  if(!cpfOk){document.getElementById('mpCpfErr').textContent='Informe o CPF completo.';return;}
  if(!termsChecked){
    const box=document.querySelector('.mp-terms-box');
    box.classList.add('error');
    // 11/10/2026: o aviso diz o que fazer (antes: "Você precisa aceitar os termos", pequeno e solto)
    document.getElementById('mpTermsErr').textContent='Falta um passo: marque a caixa acima pra confirmar que você leu e aceita os Termos de Licença. Aí é só tocar em CONTINUAR de novo.';
    box.scrollIntoView({behavior:'smooth',block:'center'});
    try{ document.getElementById('mpTermsCheck').focus({preventScroll:true}); }catch(_){}
    return;
  }
  const btn=document.getElementById('mpStep1Btn');
  btn.disabled=true;btn.textContent='CARREGANDO...';

  try{
    // init MP SDK
    if(!mp){ await carregarMP(); mp=new MercadoPago(MP_PUBLIC_KEY,{locale:'pt-BR'}); }

    document.getElementById('mpStep1').style.display='none';
    document.getElementById('mpStep2').style.display='block';

    // Limpar container e remover controller anterior se existir
    if(brickController){
      try{ await brickController.unmount(); }catch(e){}
      brickController=null;
    }
    const container=document.getElementById('mpBrickContainer');
    container.innerHTML='<div style="padding:2rem;text-align:center;color:var(--dim);font-size:.75rem;letter-spacing:.1em;">CARREGANDO PAGAMENTO…</div>';

    // Aguardar container estar visível no DOM
    await new Promise(r=>setTimeout(r,300));

    aplicarLeveMais(); const subtotalPay=cart.reduce((s,c)=>s+c.price,0);
    const discountPay=calcDiscount(subtotalPay);
    const total=subtotalPay - discountPay;
    const itemsDesc=cart.map(c=>c.qty&&c.qty>1?`${c.name} x${c.qty}`:c.name).join(' + ');
    const email=document.getElementById('mpEmail').value.trim();
    const cpf=document.getElementById('mpCpf').value.replace(/\D/g,'');

    // Limpar container antes de montar o Brick
    container.innerHTML='';

    const bricksBuilder=mp.bricks();
    brickController=await bricksBuilder.create('payment','mpBrickContainer',{
      initialization:{
        amount:total,
        payer:{email,firstName:name.split(' ')[0],lastName:name.split(' ').slice(1).join(' ')||'-',identification:{type:'CPF',number:cpf}},
      },
      customization:{
        paymentMethods:{
          bankTransfer:'all',
          creditCard:'all',
          maxInstallments:12,
          defaultPaymentTypeId:'bank_transfer',
        },
        texts:{
          emailSectionTitle:'Confirme seu e-mail',
          email:{label:'E-mail', placeholder:'seu@email.com'},
          cardholderName:{label:'Nome do titular como aparece no cartão', placeholder:'Nome Sobrenome'},
          bankTransfer:{
            emailSectionTitle:'Confirme seu e-mail',
            emailSectionDescription:' ',
            emailInputLabel:' ',
          },
        },
        visual:{
          style:{
            theme:'dark',
            customVariables:{
              // paleta da casa (03/10/2026; antes vermelho/laranja da paleta antiga).
              // errorColor fica o do Mercado Pago: o blood some no fundo escuro.
              baseColor:'#b98f5e',
              baseColorFirstVariant:'#c3a074',
              baseColorSecondVariant:'#A87B4A',
              outlinePrimaryColor:'#b98f5e',
              outlineSecondaryColor:'#332c22',
              buttonTextColor:'#14110d',
              textPrimaryColor:'#E8E0CF',
              textSecondaryColor:'#b89e72',
              inputBackgroundColor:'#221e18',
              formBackgroundColor:'#1A1815',
              fontSizeExtraSmall:'11px',
              fontSizeSmall:'13px',
              fontSizeMedium:'14px',
              borderRadiusSmall:'0px',
              borderRadiusMedium:'0px',
              borderRadiusLarge:'0px',
            }
          },
          hideFormTitle:true,
          hidePaymentButton:false,
        },
      },
      callbacks:{
        onReady:()=>{btn.disabled=false;btn.textContent='CONTINUAR → PAGAMENTO';},
        onSubmit:({selectedPaymentMethod,formData})=>{
          return new Promise(async (resolve,reject)=>{
            const termsAcceptance = {
              accepted: true,
              version: 'caramujo-termos-v1-2026',
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent,
              pageUrl: window.location.href,
            };
            try {
              const res = await fetch('/api/create-payment',{
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body: JSON.stringify({
                  formData, selectedPaymentMethod,
                  amount: total,
                  description: itemsDesc,
                  email, name, artistName,
                  cpf: document.getElementById('mpCpf').value.replace(/\D/g,''),
                  items: cart.map(c=>({name:c.qty&&c.qty>1?`${c.name} x${c.qty}`:c.name,price:c.price,type:c.type,pkgBeats:c.pkgBeats||null})),
                  termsAcceptance,
                  couponCode: activeCoupon ? activeCoupon.code : null,
                }),
              });
              const data = await res.json();
              if (!res.ok || !data.success) {
                // mostra o motivo (beat que saiu, valor que mudou, cupom): o Brick só diz "erro"
                avisoPagamento(data.error || 'Erro ao processar pagamento.');
                reject(data.error || 'Erro ao processar pagamento.');
                return;
              }
              resolve();
              // armazena PDF do contrato para download
              if (data.contractPdf) {
                contractPdfData = data.contractPdf;
              }
              if(brickController){try{brickController.unmount();}catch(e){}brickController=null;}
              document.getElementById('mpStep2').style.display='none';
              document.getElementById('mpStep3').style.display='block';

              if (data.pix && data.pix.qrCodeBase64) {
                // Mostra tela PIX com QR code
                document.getElementById('mpPixPending').style.display='block';
                document.getElementById('mpPixConfirmed').style.display='none';
                document.getElementById('mpPixQrImg').src = 'data:image/png;base64,' + data.pix.qrCodeBase64;
                document.getElementById('mpPixCode').value = data.pix.qrCode || '';
                startPixPolling(data.paymentId);
              } else {
                // Pagamento já aprovado (cartão) — vai direto para confirmado
                showPixConfirmed();
              }
            } catch(err) {
              reject('Erro de conexão. Tente novamente.');
            }
          });
        },
        onError:(err)=>{
          console.error('MP Brick error:', JSON.stringify(err));
          // Mapeia erros comuns do MP para mensagens amigáveis
          const cause = err?.cause?.[0]?.code || '';
          const friendlyErrors = {
            'E301': 'Número do cartão inválido. Verifique e tente novamente.',
            'E302': 'Data de vencimento inválida. Use o formato MM/AA.',
            'E303': 'Código de segurança (CVV) inválido.',
            'E304': 'Nome do titular inválido. Digite como aparece no cartão.',
            'E305': 'Documento (CPF) inválido.',
            'E401': 'Cartão recusado. Verifique os dados ou tente outro cartão.',
            'E501': 'E-mail inválido. Verifique e tente novamente.',
            '205':  'Preencha o número do cartão.',
            '208':  'Preencha o mês de vencimento.',
            '209':  'Preencha o ano de vencimento.',
            '212':  'Preencha o CPF do titular.',
            '213':  'CPF inválido.',
            '214':  'Preencha o nome do titular.',
            '220':  'Preencha o banco emissor.',
            '221':  'Preencha o nome como está no cartão.',
            '224':  'Preencha o código de segurança (CVV).',
          };
          const msg = friendlyErrors[cause]
            || (err?.message ? err.message : null)
            || (err?.cause?.[0]?.description ? err.cause[0].description : null)
            || 'Verifique os dados do cartão e tente novamente.';
          // Mostra mensagem inline no Brick em vez de alert
          let errBox = document.getElementById('mpBrickError');
          if (!errBox) {
            errBox = document.createElement('div');
            errBox.id = 'mpBrickError';
            errBox.style.cssText = 'margin:-.5rem 0 .8rem;padding:.7rem 1rem;background:var(--mole);border:1px solid var(--wire);border-left:3px solid var(--blood);color:var(--bone);font-size:.74rem;font-family:"IBM Plex Mono",monospace;line-height:1.5;';
            document.getElementById('mpBrickContainer').before(errBox);
          }
          errBox.textContent = msg;
          errBox.style.display = 'block';
          // Some automaticamente após 6s
          clearTimeout(errBox._t);
          errBox._t = setTimeout(() => { errBox.style.display = 'none'; }, 6000);
        },
      },
    });
  } catch(err){
    console.error('MP init error:',err);
    btn.disabled=false;btn.textContent='CONTINUAR → PAGAMENTO';
    aplicarLeveMais(); const subtotalFallback=cart.reduce((s,c)=>s+c.price,0);
    const discountFallback=calcDiscount(subtotalFallback);
    const totalFallback=subtotalFallback - discountFallback;
    // Fallback: show manual payment instructions
    document.getElementById('mpStep1').style.display='none';
    document.getElementById('mpStep2').style.display='block';
    document.getElementById('mpBrickContainer').innerHTML=`
      <div style="padding:1.5rem;border:1px solid var(--wire);background:var(--mole);">
        <p style="font-family:'Cormorant Garamond',sans-serif;font-size:1rem;color:var(--cream);letter-spacing:.1em;margin-bottom:.5rem;">PAGAMENTO VIA PIX</p>
        <p style="font-size:.66rem;color:var(--amber);margin-bottom:1rem;">O módulo de cartão não carregou. Use PIX abaixo ou recarregue a página.</p>
        <p style="font-size:.76rem;color:var(--dim);line-height:1.8;">
          Envie <strong style="color:var(--cream)">R$ ${totalFallback}</strong> via PIX para:<br/>
          <strong style="color:var(--bone);font-size:.9rem;">contato@caramujorecords.com.br</strong><br/><br/>
          Itens: ${cart.map(c=>c.name).join(', ')}<br/>
          Email para entrega: <strong style="color:var(--bone)">${document.getElementById('mpEmail').value}</strong><br/><br/>
          Após o pagamento, envie o comprovante para <strong style="color:var(--bone)">@rideblan33</strong> no Instagram.
        </p>
        <button class="mp-btn-primary" style="margin-top:1.2rem;" onclick="document.getElementById('mpStep2').style.display='none';document.getElementById('mpStep3').style.display='block';">CONFIRMAR PEDIDO</button>
      </div>`;
  }
}

let pixPollingTimer = null;

function copyPixCode() {
  const code = document.getElementById('mpPixCode').value;
  if (!code) return;
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById('mpPixCopyBtn');
    btn.textContent = '✓ COPIADO!';
    setTimeout(() => { btn.textContent = 'COPIAR'; }, 2500);
  }).catch(() => {
    // fallback para browsers antigos
    document.getElementById('mpPixCode').select();
    document.execCommand('copy');
    const btn = document.getElementById('mpPixCopyBtn');
    btn.textContent = '✓ COPIADO!';
    setTimeout(() => { btn.textContent = 'COPIAR'; }, 2500);
  });
}

function showPixConfirmed() {
  if (pixPollingTimer) { clearTimeout(pixPollingTimer); pixPollingTimer = null; }
  // O incremento de uso do cupom é feito no servidor (payment-webhook)
  // Zera carrinho e cupom automaticamente ao confirmar pagamento
  clearCart();
  document.getElementById('mpPixPending').style.display = 'none';
  document.getElementById('mpPixConfirmed').style.display = 'block';
  if (contractPdfData) {
    document.getElementById('mpContractDownload').style.display = 'block';
  }
}

function startPixPolling(paymentId) {
  if (!paymentId) return;
  let attempts = 0;
  let consecutiveErrors = 0;
  const MAX_ATTEMPTS = 72; // ~10 min com backoff
  function getDelay(n) { return n < 6 ? 5000 : n < 20 ? 8000 : 12000; }
  function schedule() {
    if (attempts >= MAX_ATTEMPTS) {
      document.getElementById('mpPixStatusText').textContent = 'Tempo esgotado. Se o pagamento foi feito, aguarde o email de confirmação.';
      return;
    }
    pixPollingTimer = setTimeout(poll, getDelay(attempts));
  }
  async function poll() {
    attempts++;
    try {
      const res = await fetch(`/api/check-payment?id=${paymentId}`);
      if (!res.ok) { consecutiveErrors++; if (consecutiveErrors < 5) schedule(); return; }
      consecutiveErrors = 0;
      const data = await res.json();
      if (data.status === 'approved') { showPixConfirmed(); return; }
      if (data.status === 'rejected' || data.status === 'cancelled') {
        document.getElementById('mpPixStatusText').textContent = 'Pagamento não aprovado. Feche e tente novamente.';
        document.getElementById('mpPixStatusDot').style.background = 'var(--blood)';
        return;
      }
      schedule();
    } catch(e) { consecutiveErrors++; if (consecutiveErrors < 5) schedule(); }
  }
  schedule();
}

function backToStep1(){
  if(brickController){try{brickController.unmount();}catch(e){}brickController=null;}
  document.getElementById('mpStep2').style.display='none';
  document.getElementById('mpStep1').style.display='block';
  const btn=document.getElementById('mpStep1Btn');
  btn.disabled=false;btn.textContent='CONTINUAR → PAGAMENTO';
}

function sendForm(btn){
  const name    = document.getElementById('cfName').value.trim();
  const email   = document.getElementById('cfEmail').value.trim();
  const subject = document.getElementById('cfSubject').value;
  const message = document.getElementById('cfMessage').value.trim();
  const status  = document.getElementById('cfStatus');

  if(!name || !email || !message){
    status.className='msg-err';
    status.textContent='Preencha nome, email e mensagem antes de enviar.';
    return;
  }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    status.className='msg-err';
    status.textContent='Email inválido.';
    return;
  }

  btn.disabled=true; btn.textContent='ENVIANDO...';
  status.className=''; status.textContent='';

  carregarEmailJS().then(()=>emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    from_name:  name,
    from_email: email,
    subject:    subject,
    message:    message,
  })).then(()=>{
    btn.disabled=false; btn.textContent='ENVIAR MENSAGEM →';
    status.className='msg-ok';
    status.textContent='✓ Mensagem enviada! Fique atento no seu e-mail pois em breve retornaremos seu contato.';
    document.getElementById('cfName').value='';
    document.getElementById('cfEmail').value='';
    document.getElementById('cfMessage').value='';
    document.getElementById('cfSubject').selectedIndex=0;
    setTimeout(()=>{status.textContent='';},12000);
  }).catch((err)=>{
    btn.disabled=false; btn.textContent='ENVIAR MENSAGEM →';
    status.className='msg-err';
    // Se as chaves ainda são placeholder, mostra instrução útil
    if(EMAILJS_PUBLIC_KEY==='SEU_PUBLIC_KEY_AQUI'){
      status.textContent='Configure o EmailJS no código (ver comentários no <head>).';
    } else {
      status.textContent='Erro ao enviar. Tente pelo email direto: contato@caramujorecords.com.br';
    }
    console.error('EmailJS error:', err);
  });
}

/* ── TOAST & MODAL ERROR ─────────────────────────── */
function showToast(msg, duration=3500) {
  let t = document.getElementById('siteToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'siteToast';
    t.style.cssText = 'position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%) translateY(20px);background:#1e1a12;border:1px solid var(--ember);color:var(--bone);font-family:"IBM Plex Mono",monospace;font-size:.74rem;padding:.65rem 1.4rem;z-index:10000;opacity:0;transition:opacity .2s,transform .2s;pointer-events:none;max-width:90vw;text-align:center;';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  // o aviso não pode cair em cima de botão: com o carrinho aberto ele sobe pro
  // topo, com o player tocando ele senta em cima da barra.
  var painel = document.getElementById('cartPanel');
  var barra = document.getElementById('npBar');
  if (painel && painel.classList.contains('open')) {
    t.style.top = '70px'; t.style.bottom = 'auto';
  } else {
    t.style.top = 'auto';
    t.style.bottom = (barra && barra.classList.contains('on'))
      ? (barra.offsetHeight + 14) + 'px' : '1.5rem';
  }
  t.style.opacity = '1'; t.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(-50%) translateY(20px)'; }, duration);
}

function showModalErr(msg) {
  let e = document.getElementById('mpStep1Err');
  if (!e) {
    e = document.createElement('div');
    e.id = 'mpStep1Err';
    e.style.cssText = 'margin-bottom:.8rem;padding:.6rem 1rem;background:var(--mole);border:1px solid var(--wire);border-left:3px solid var(--blood);color:var(--bone);font-size:.72rem;font-family:"IBM Plex Mono",monospace;';
    const btn = document.getElementById('mpStep1Btn');
    btn.parentNode.insertBefore(e, btn);
  }
  e.textContent = msg;
  e.style.display = 'block';
  clearTimeout(e._t);
  e._t = setTimeout(() => { e.style.display = 'none'; }, 4000);
}

/* ── SCROLL REVEAL ───────────────────────────────── */
// navegador sem IntersectionObserver (10/10/2026): mostra tudo de uma vez em vez de parar o
// resto do código da página (que agora mora no mesmo arquivo)
const ro=('IntersectionObserver' in window) ? new IntersectionObserver(entries=>{
  entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('in');});
},{threshold:.08}) : { observe:function(el){ el.classList.add('in'); } };
document.querySelectorAll('.rv').forEach(el=>ro.observe(el));
try{ renderCards(); }catch(e){ setTimeout(function(){ throw e; }); }
setTimeout(()=>document.querySelectorAll('.rv').forEach(el=>ro.observe(el)),200);

/* ─────────────────────────────────────────────────────────────── */
try{
(function(){
  /* ── BEAT EM DESTAQUE ─────────────────────────────────────────────
     Rodízio automático: 1 beat por semana, do catálogo inteiro (pula vendidos).
     Destaque manual: painel > Vitrine > beat > Pôr no destaque. O servidor
     escreve os dois valores abaixo a cada visita. Vencido o prazo, sem destaque
     ou com o beat vendido, o rodízio volta sozinho. */
  /* FEATURED_OVERRIDE_ID e FEATURED_OVERRIDE_ATE ficam no index.html (o servidor escreve lá) */
  const FEATURED_BEAT_ID=(function(){
    if(FEATURED_OVERRIDE_ID){
      var ob=BEATS.find(function(x){return x.id===FEATURED_OVERRIDE_ID;});
      var noPrazo=!FEATURED_OVERRIDE_ATE||new Date()<=new Date(FEATURED_OVERRIDE_ATE+'T23:59:59');
      if(ob&&!ob.sold&&noPrazo) return FEATURED_OVERRIDE_ID;
    }
    var pool=BEATS.filter(function(b){return !b.sold;}).map(function(b){return b.id;});
    if(!pool.length && BEATS.length) pool=[BEATS[0].id];
    if(!pool.length) return null;          // loja fora do ar: lista vazia
    var wk=Math.floor(Date.now()/6048e5); // nº da semana; troca 1x por semana
    return pool[wk%pool.length];
  })();

  /* ── O PLAYER ──────────────────────────────────────────────────────
     Um <audio> só pra página inteira, tocando o MP3 que o conversor guardou
     no R2 a partir do meu Drive. Zero SoundCloud, zero iframe. O endereço de
     cada MP3, a capa da beat tape e a duração vêm de /api/vitrine. */
  var $=function(i){return document.getElementById(i);};
  var som=new Audio(); som.preload='none';
  window.__npSom=function(){ return som; };   // o compartilhar pega o trecho que está tocando
  var atual=null;
  var nada=function(){};
  window.__VIT={}; window.__VIT_OK=false;
  window.__npCurrent={widget:null,bid:null};
  if(typeof window.__npVol!=='number') window.__npVol=100;

  var ICO_P='<svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M7 4.5v15l13-7.5z"/></svg>';
  var ICO_PA='<svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><rect x="6" y="4.5" width="4" height="15"/><rect x="14" y="4.5" width="4" height="15"/></svg>';

  function beat(id){for(var i=0;i<BEATS.length;i++){if(String(BEATS[i].id)===String(id))return BEATS[i];}return null;}
  function fonte(id){return window.__VIT[String(id)]||null;}
  function glab(b){return (typeof GENRE_LABELS!=='undefined'&&GENRE_LABELS[b.genre])||b.genre||'';}
  function mm(s){s=Math.max(0,Math.round(s||0));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
  function capaHTML(f,id){
    return (f&&f.capa)
      ? '<img class="capa" id="'+id+'" src="'+f.capa+'" alt="">'
      : '<div class="capa vazia" id="'+id+'"><img src="assets/brand/selo-creme.svg" alt="" width="26" height="26"></div>';
  }

  window.tocarBeat=function(id){
    var b=beat(id), f=fonte(id);
    if(!b||!f||!f.mp3) return;                    // beat vendido TOCA: é prova social
    if(String(atual)===String(id)){ if(som.paused) som.play().catch(nada); else som.pause(); return; }
    atual=b.id;
    som.src=f.mp3;
    if(window.__csPreparar) window.__csPreparar();
    som.volume=Math.max(0,Math.min(1,window.__npVol/100));
    som.play().catch(nada);
    window.__npCurrent={widget:null,bid:b.id};
    var bar=$('npBar'); if(bar){ bar.dataset.bid=String(b.id); bar.classList.add('on'); }
    document.body.classList.add('tocando');   // abre espaço embaixo pra barra não cobrir faixa
    if($('npName')){ var nm=$('npName'); nm.textContent=''; var sp=document.createElement('span'); sp.textContent=b.name; nm.appendChild(sp); rolaNome(); }
    if($('npMeta')) $('npMeta').innerHTML='<span class="quem">@rideblan33  ·  </span>'+
      glab(b)+(b.bpm?'  ·  '+b.bpm+' BPM':'')+(b.key?'  ·  '+b.key:'');
    var c=$('npCapa'); if(c) c.outerHTML=capaHTML(f,'npCapa');
    var lk=$('npLink'); if(lk){ lk.href=paginaDoBeat(b.name); lk.setAttribute('aria-label','Abrir a página de '+b.name); }
    if($('npTime')) $('npTime').textContent=mm(f.dur);
    window.pintarPrecoPe();
    sistema(b,f);
    try{ if(typeof window.npSet==='function') window.npSet(null,b.id); }catch(_){}
    repintar();
  };

  // nome e capa na tela de bloqueio do celular
  function sistema(b,f){
    try{
      if(!('mediaSession' in navigator)) return;
      navigator.mediaSession.metadata=new MediaMetadata({
        title:b.name, artist:'@rideblan33', album:'Caramujo Records',
        artwork:f.capa?[{src:f.capaG||f.capa,sizes:'1000x1000',type:'image/jpeg'}]:[]
      });
      navigator.mediaSession.setActionHandler('play',function(){som.play().catch(nada);});
      navigator.mediaSession.setActionHandler('pause',function(){som.pause();});
      navigator.mediaSession.setActionHandler('previoustrack',function(){window.npPrev();});
      navigator.mediaSession.setActionHandler('nexttrack',function(){window.npNext();});
    }catch(_){}
  }

  // O relógio do áudio chama o repintar ~4 vezes por segundo. Trocar o ícone só
  // quando ele muda poupa refazer o SVG de cada linha a cada tique (com a lista
  // do pacote aberta eram mais de 100 botões por tique). 03/10/2026.
  function ico(el,h){ if(el.__ico!==h||!el.firstChild){ el.innerHTML=h; el.__ico=h; } }
  function repintar(){
    var f=som.duration?som.currentTime/som.duration:0;
    var tocando=atual!==null && !som.paused;
    if($('npSeekFill')) $('npSeekFill').style.width=(f*100)+'%';
    if($('npSeek')) $('npSeek').setAttribute('aria-valuenow',String(Math.round(f*100)));
    if($('npSeek')) $('npSeek').classList.toggle('zerada',!(f>0.004));
    if($('npTAgora')) $('npTAgora').textContent=mm(som.currentTime);
    if(som.duration && $('npTime')) $('npTime').textContent=mm(som.duration);
    if($('npPlay')){ ico($('npPlay'),tocando?ICO_PA:ICO_P);
      $('npPlay').setAttribute('aria-label',tocando?'Pausar':'Tocar'); }
    var linhas=document.querySelectorAll('#beatCards .item');
    for(var i=0;i<linhas.length;i++){
      var el=linhas[i], meu=String(el.dataset.bid)===String(atual);
      el.classList.toggle('tocando',meu);
      el.classList.toggle('rodando',meu&&tocando);
      var b=el.querySelector('.cel-num b'); if(b) ico(b,(meu&&tocando)?ICO_PAUSE:ICO_PLAY);
      var c=el.querySelector('.corrida'); if(c) c.style.width=meu?(f*100)+'%':'0';
    }
    pintarHero(f,tocando);
    // modal do pacote: play/pause em cada beat e a linha de progresso embaixo
    var pk=document.querySelectorAll('#pkgBeatList .pkg-play');
    for(var k=0;k<pk.length;k++){
      var meu2=String(pk[k].dataset.bid)===String(atual), item=pk[k].parentNode;
      ico(pk[k],(meu2&&tocando)?ICO_PA:ICO_P);
      pk[k].setAttribute('aria-pressed',meu2&&tocando?'true':'false');
      item.classList.toggle('tocando',meu2);
      var cr=item.querySelector('.pkg-corrida'); if(cr) cr.style.width=meu2?(f*100)+'%':'0';
    }
  }
  window.repintarPlayer=repintar;

  function pintarHero(f,tocando){
    var meu=String(atual)===String(FEATURED_BEAT_ID);
    var bt=$('hwBtn'); if(!bt) return;
    ico(bt,(meu&&tocando)?ICO_PA:ICO_P);
    if($('hwFill')) $('hwFill').style.width=meu?(f*100)+'%':'0';
    if($('hwSeek')) $('hwSeek').classList.toggle('zerada',!(meu&&f>0.004));
    if($('hwTempo')){
      var d=fonte(FEATURED_BEAT_ID);
      $('hwTempo').textContent=meu?mm(som.currentTime):mm(d?d.dur:0);
    }
  }

  function ordem(){
    var out=[], linhas=document.querySelectorAll('#beatCards .item');
    for(var i=0;i<linhas.length;i++) out.push(linhas[i].dataset.bid);
    return out;
  }
  function rolarPara(id){
    var el=document.querySelector('#beatCards .item[data-bid="'+id+'"]');
    if(el && typeof catalogVisible==='function' && catalogVisible()) el.scrollIntoView({behavior:'smooth',block:'center'});
  }
  function anda(d,auto){
    var lista=ordem();
    if(!lista.length) return;
    var i=lista.indexOf(String(atual));
    var prox=i>-1 ? lista[i+d] : lista[0];
    if(prox!=null){ if(auto) rolarPara(prox); return window.tocarBeat(prox); }
    // acabou a página: em modo rádio, vira a página e toca a primeira
    var bt=$(d>0?'pgNext':'pgPrev');
    if(auto && bt && !bt.disabled){ autoPlayFirst=true; changePage(d,catalogVisible()); return; }
    window.tocarBeat(d>0?lista[0]:lista[lista.length-1]);
  }
  window.npNext=function(){anda(1,false);};
  window.npPrev=function(){anda(-1,false);};
  window.npToggle=function(){
    if(atual===null) return anda(1,false);
    if(som.paused) som.play().catch(nada); else som.pause();
  };
  window.npSet=function(_,bid){ window.__npCurrent={widget:null,bid:bid}; };
  window.pausarBeat=function(){ if(!som.paused){ window.__npResume=true; som.pause(); } };
  window.retomarBeat=function(){ if(window.__npResume){ window.__npResume=false; som.play().catch(nada); } };
  window.npSetVolume=function(v){
    v=Math.max(0,Math.min(100,Math.round(Number(v)||0)));
    window.__npVol=v; som.volume=v/100;
    var sl=$('npVol'); if(sl&&String(sl.value)!==String(v)) sl.value=v;
  };
  // 3,5s parado e o volume se recolhe sozinho. Qualquer mexida reinicia a conta.
  var relogioVol=null, abriuVolEm=0, abriuVolY=0;
  function contarVol(){
    clearTimeout(relogioVol);
    relogioVol=setTimeout(function(){ window.npVolFechar(); }, 3500);
  }
  function marcarVol(aberto){
    document.body.classList.toggle('vol-aberto', !!aberto);   // tira o carrinho da frente
    if(aberto){ abriuVolEm=Date.now(); abriuVolY=window.pageYOffset||0; contarVol(); }
    else clearTimeout(relogioVol);
  }
  window.npVolToggle=function(e){ var w=$('npVolWrap'); if(w) w.classList.toggle('open');
    var pop=$('npVolPop'); if(pop) pop.classList.toggle('on');
    marcarVol(pop && pop.classList.contains('on'));
    if(e) e.stopPropagation(); };
  // no celular não tem hover pra fechar: some no toque fora, no Esc, ao rolar a
  // página e sozinho depois de 3,5s parado.
  window.npVolFechar=function(){ var w=$('npVolWrap'), p=$('npVolPop');
    if(w) w.classList.remove('open'); if(p) p.classList.remove('on');
    document.body.classList.remove('vol-aberto'); clearTimeout(relogioVol); };
  document.addEventListener('click',function(e){
    var p=$('npVolPop'); if(!p||!p.classList.contains('on')) return;
    if(e.target&&e.target.closest&&e.target.closest('#npVolWrap')) return;
    window.npVolFechar();
  });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape') window.npVolFechar(); });
  window.addEventListener('scroll',function(){
    var p=$('npVolPop'); if(!p || !p.classList.contains('on')) return;
    if(Date.now()-abriuVolEm < 450) return;                 // rolagem que já vinha correndo
    if(Math.abs((window.pageYOffset||0)-abriuVolY) < 30) return;   // tremidinha não conta
    window.npVolFechar();
  },{passive:true});
  (function(){
    var w=$('npVolWrap'); if(!w) return;
    // mexer no slider (dedo, mouse ou teclado) segura o popup aberto
    ['pointerdown','input','keydown','touchstart'].forEach(function(ev){
      w.addEventListener(ev,function(){ if($('npVolPop').classList.contains('on')) contarVol(); },{passive:true});
    });
    // no computador quem manda é o mouse: entrou, o carrinho sai da frente
    w.addEventListener('pointerenter',function(e){ if(e.pointerType==='mouse') marcarVol(true); });
    w.addEventListener('pointerleave',function(e){
      if(e.pointerType!=='mouse') return;
      clearTimeout(relogioVol);
      if(!$('npVolPop').classList.contains('on')) document.body.classList.remove('vol-aberto');
    });
  })();
  // Caminho A (04/10/2026, escolha do Bruno): o 1º toque põe no carrinho; com o beat
  // lá dentro, o toque abre o carrinho (tirar fica no carrinho). Antes era liga/desliga,
  // e o ícone de carrinho fazia parecer que abria o carrinho.
  window.npAddCurrent=function(){
    var bid=$('npBar').dataset.bid; if(!bid) return;
    var no=false; try{ no=cart.some(function(c){return c.beatId===Number(bid)&&c.stems===false;}); }catch(_){}
    if(no){ try{ openCart(); }catch(_){} return; }
    try{ toggleBeat(Number(bid),false); }catch(_){}
    window.pintarPrecoPe();
  };
  var ICO_MAIS='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" width="13" height="13" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  // "+ R$119" antes; "No carrinho ›" (aceso) depois, que abre o carrinho.
  window.pintarPrecoPe=function(){
    var pr=$('npPreco'), bid=$('npBar')&&$('npBar').dataset.bid; if(!pr) return;
    var b=bid?beat(bid):null;
    if(!b||b.sold){ pr.style.display='none'; return; }
    pr.style.display='';
    var no=false; try{ no=cart.some(function(c){return c.beatId===b.id&&c.stems===false;}); }catch(_){}
    pr.classList.toggle('on',no);
    pr.setAttribute('aria-label',no?b.name+' está no carrinho: abrir o carrinho':'Pôr '+b.name+' no carrinho');
    pr.innerHTML=(no?ICO_OK:ICO_MAIS)+'<span class="rotulo">'+(no?'No carrinho':'R$'+PRICE_BEAT)+'</span>'+(no?'<span class="ir" aria-hidden="true">›</span>':'');
  };
  window.npAddFeatured=function(){ try{botaoBeat(FEATURED_BEAT_ID);}catch(_){} };
  // o botão do destaque segue a mesma regra: no carrinho, vira "No carrinho ›" e abre o carrinho
  window.pintarHeroAdd=function(){
    var ad=$('hwAdd'); if(!ad) return;
    var no=false; try{ no=cart.some(function(c){return c.beatId===FEATURED_BEAT_ID&&c.stems===false;}); }catch(_){}
    ad.textContent=no?'No carrinho ›':'Adicionar ao carrinho · R$'+PRICE_BEAT;
  };

  /* seek: clique e arrasto, no pé e no destaque */
  function ligarSeek(el){
    if(!el) return;
    var arrastando=false;
    function em(x){
      var r=el.getBoundingClientRect();
      var f=Math.max(0,Math.min(1,(x-r.left)/r.width));
      if(som.duration){ som.currentTime=f*som.duration; }
      repintar();
    }
    el.addEventListener('pointerdown',function(e){arrastando=true;try{el.setPointerCapture(e.pointerId);}catch(_){}em(e.clientX);e.preventDefault();});
    el.addEventListener('pointermove',function(e){if(arrastando)em(e.clientX);});
    el.addEventListener('pointerup',function(e){if(arrastando){arrastando=false;em(e.clientX);}});
    el.addEventListener('pointercancel',function(){arrastando=false;});
  }

  /* a barra engorda quando o mouse chega perto, antes de encostar */
  document.addEventListener('mousemove',function(e){
    var sk=$('npSeek'), bar=$('npBar');
    if(!sk||!bar||!bar.classList.contains('on')) return;
    var r=sk.getBoundingClientRect();
    sk.classList.toggle('perto', e.clientY>r.top-30 && e.clientY<r.bottom+30);
  });
  document.addEventListener('click',function(e){
    var w=$('npVolWrap'); if(w&&!w.contains(e.target)){ w.classList.remove('open'); var p=$('npVolPop'); if(p)p.classList.remove('on'); }
  });

  /* teclado: espaço toca, setas andam e mexem no volume */
  document.addEventListener('keydown',function(e){
    var t=(e.target&&e.target.tagName)||'';
    if(t==='INPUT'||t==='TEXTAREA'||t==='SELECT'||e.target.isContentEditable) return;
    // espaço num botão ou link focado é do botão (teclado): antes ele tocava o beat
    // em vez de, por exemplo, pôr no carrinho (03/10/2026)
    if(e.code==='Space' && (t==='BUTTON'||t==='A'||(e.target.getAttribute&&e.target.getAttribute('role')==='button'))) return;
    if(e.code==='Space'){ e.preventDefault(); window.npToggle(); }
    else if(e.key==='ArrowRight'&&atual!==null){ som.currentTime=Math.min(som.duration||0,som.currentTime+5); repintar(); }
    else if(e.key==='ArrowLeft'&&atual!==null){ som.currentTime=Math.max(0,som.currentTime-5); repintar(); }
    else if(e.key==='ArrowUp'){ e.preventDefault(); window.npSetVolume(window.__npVol+10); }
    else if(e.key==='ArrowDown'){ e.preventDefault(); window.npSetVolume(window.__npVol-10); }
  });

  som.addEventListener('timeupdate',repintar);
  // A próxima da lista já fica pronta (03/10/2026): passou da metade da faixa, um pedido
  // de 2 bytes faz o servidor guardar a próxima inteira na borda. No modo rádio, e pra
  // quem toca em "próxima", ela começa sem a espera de ir buscar no armazenamento.
  var aquecidos={};
  som.addEventListener('timeupdate',function(){
    try{
      if(atual===null||!som.duration||som.currentTime/som.duration<0.5) return;
      var lista=ordem(), i=lista.indexOf(String(atual)); if(i<0) return;
      var prox=lista[i+1]; if(prox==null||aquecidos[prox]) return;
      var fx=fonte(prox); if(!fx||!fx.mp3) return;
      aquecidos[prox]=1;
      fetch(fx.mp3,{headers:{Range:'bytes=0-1'},cache:'no-store'}).catch(nada);
    }catch(_){}
  });
  som.addEventListener('play',repintar);
  som.addEventListener('pause',repintar);
  som.addEventListener('ended',function(){ anda(1,true); });

  /* clique na linha do catálogo (vale pra qualquer render) */
  document.addEventListener('click',function(e){
    var alvo=e.target;
    if(alvo.closest && alvo.closest('.preco')) return;
    if(alvo.closest && alvo.closest('#beatCards a.nome')) return;   // computador: o nome abre a página do beat
    var linha=alvo.closest?alvo.closest('#beatCards .item'):null;
    if(linha) window.tocarBeat(linha.dataset.bid);
  });

  /* ── beat em destaque ── */
  function renderFeatured(){
    try{
      var b=BEATS.find(function(x){return x.id===FEATURED_BEAT_ID;});
      if(!b){ var hw=document.querySelector('.hero-week'); if(hw) hw.style.display='none'; return; }
      var gl=glab(b);
      var nm=$('hwName'); if(nm) nm.textContent=b.name;
      var ch=$('hwChips');
      if(ch) ch.innerHTML='<span class="hw-chip">'+gl+'</span><span class="hw-chip">'+b.bpm+' BPM</span><span class="hw-chip">'+b.key+'</span>';
      if(window.pintarHeroAdd) window.pintarHeroAdd();
      var f=fonte(FEATURED_BEAT_ID);
      var cp=$('hwCapa');
      if(cp){
        if(f&&f.capa){ cp.className='hw-capa'; cp.innerHTML='<img src="'+f.capa+'" alt="">'; }
        else { cp.className='hw-capa vazia'; cp.innerHTML='<img src="assets/brand/selo-creme.svg" alt="" width="34" height="34">'; }
      }
      var bloco=$('hwPlay'); if(bloco) bloco.style.display=(f&&f.mp3)?'':'none';
      pintarHero(0,false);
    }catch(_){}
  }
  // "Ouvir o catálogo": desce pro começo do catálogo e já toca a 1ª faixa da
  // lista, do jeito que ela estiver (filtro, ordem). O play sai dentro do
  // toque, senão o celular bloqueia o som. Sem vitrine (sem MP3), só desce.
  window.ouvirCatalogo=function(ev){
    try{
      var sec=$('beats'); if(!sec) return true;
      if(ev&&ev.preventDefault) ev.preventDefault();
      var linha=document.querySelector('#beatCards .item');
      if(linha && String(atual)!==String(linha.dataset.bid)) window.tocarBeat(linha.dataset.bid);
      else if(linha && som.paused) som.play().catch(nada);
      sec.scrollIntoView({behavior:'smooth',block:'start'});
      return false;
    }catch(_){ return true; }
  };

  function initHero(){
    var bt=$('hwBtn');
    if(bt&&!bt.__ligado){ bt.__ligado=true; bt.addEventListener('click',function(){ window.tocarBeat(FEATURED_BEAT_ID); }); }
    ligarSeek($('hwSeek'));
  }

  // O loop mudo da sessão só baixa e roda quando aparece na tela, e para
  // quando sai. Antes ele baixava 143 KB no load, lá do fim da página.
  function initStudioVideos(){
    var vs=document.querySelectorAll('#estudio video[data-loop]');
    if(!vs.length) return;
    var quieto=false;
    try{ quieto=matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(_){}
    if(quieto) return;                        // fica o poster parado
    function roda(v){ var p=v.play(); if(p&&p.catch) p.catch(nada); }
    // navegador sem IntersectionObserver: volta o autoplay de antes
    if(!('IntersectionObserver' in window)){ vs.forEach(function(v){ v.preload='auto'; v.autoplay=true; try{ v.load(); }catch(_){} }); return; }
    var io=new IntersectionObserver(function(ents){
      ents.forEach(function(en){ if(en.isIntersecting) roda(en.target); else if(!en.target.paused) en.target.pause(); });
    },{rootMargin:'200px 0px',threshold:0.01});
    vs.forEach(function(v){ io.observe(v); });
  }

  window.toggleFilters=function(){var p=document.getElementById('filtersPanel'),b=document.getElementById('filtersToggle');if(!p)return;var open=p.classList.toggle('open');if(b)b.setAttribute('aria-expanded',open?'true':'false');};
  window.studioScroll=function(dir){var st=document.querySelector('.studio-strip');if(!st)return;var it=st.querySelector('.studio-ph');var w=it?it.getBoundingClientRect().width+16:st.clientWidth*0.8;st.scrollBy({left:dir*w,behavior:'smooth'});};
  (function(){var st=document.querySelector('.studio-strip');if(!st||!('IntersectionObserver'in window))return;var figs=st.querySelectorAll('.studio-ph');if(figs.length<2)return;var first=figs[0],last=figs[figs.length-1];var pv=document.querySelector('.studio-nav.prev'),nx=document.querySelector('.studio-nav.next');var io=new IntersectionObserver(function(ents){ents.forEach(function(en){if(en.target===first&&pv)pv.style.display=en.isIntersecting?'none':'';if(en.target===last&&nx)nx.style.display=en.isIntersecting?'none':'';});},{root:st,threshold:0.6});io.observe(first);io.observe(last);})();

  /* ── a lista de beats com o endereço do MP3 ── */
  // Plano B (26/09/2026): a última lista boa fica guardada no navegador. Se a
  // API falhar (bug num deploy, banco fora do ar, limite do dia), quem já
  // visitou continua ouvindo com essa cópia. Quem nunca visitou vê o aviso.
  var GUARDA_VIT='caramujo-vitrine';
  function aplicaVitrine(beats){
    var m={};
    // capaP/capaG vêm prontas do R2 (10/10/2026); capaF = /capa/<id> do site (lista do Google)
    beats.forEach(function(b){ m[String(b.id)]={mp3:b.mp3,capa:b.capaP||(b.capa?b.capa+'?p':null),capaG:b.capaG||b.capa,capaF:b.capa,dur:b.dur}; });
    window.__VIT=m; window.__VIT_OK=true;
    try{ if(window.__ldCatalogo) window.__ldCatalogo(); }catch(_){}    // lista do Google com as capas
    var av=$('foraAr'); if(av && !av.dataset.lista) av.remove();
    if(typeof renderCards==='function') renderCards();
    renderFeatured();
    repintar();
  }
  function avisoForaDoAr(){
    if($('foraAr')) return;
    var lista=$('beatCards'); if(!lista||!lista.parentNode) return;
    // sem lista (o banco caiu e não tinha cópia guardada) o texto muda
    var semLista=!!window.__LOJA_FORA;
    var d=document.createElement('div'); d.className='fora-ar'; d.id='foraAr'; d.setAttribute('role','status');
    if(semLista) d.dataset.lista='1';
    d.innerHTML='<img src="/assets/brand/selo-creme.svg" alt="" width="62" height="70">'
      +'<div><p class="codigo">Fora do ar</p><h3>'+(semLista?'Os beats voltam em instantes':'O player volta em instantes')+'</h3>'
      +'<p class="texto">'+(semLista?'A lista de beats não carregou agora.':'Os beats estão aqui embaixo, mas o áudio não carregou agora.')+' Tenta de novo daqui a pouco ou chama o @rideblan33 no Instagram.</p>'
      +'<div class="saidas"><button class="fogo" type="button" id="foraArDeNovo">Tentar de novo</button>'
      +'<a class="fantasma" href="https://ig.me/m/rideblan33" target="_blank" rel="noopener">Instagram</a></div></div>';
    lista.parentNode.insertBefore(d,lista);
    var b=$('foraArDeNovo'); if(b) b.addEventListener('click',function(){
      b.textContent='Carregando…';
      if(semLista){ location.reload(); return; }
      carregarVitrine(function(){ b.textContent='Tentar de novo'; });
    });
  }
  function carregarVitrine(depoisDeFalhar){
    if(typeof fetch!=='function') return;      // navegador muito velho: loja segue de pé
    var ctl=null; try{ ctl=new AbortController(); setTimeout(function(){ try{ctl.abort();}catch(_){} },9000); }catch(_){ ctl=null; }
    fetch('/api/vitrine',ctl?{signal:ctl.signal}:undefined).then(function(r){ if(!r.ok) throw new Error('vitrine '+r.status); return r.json(); }).then(function(j){
      if(!j||!j.beats||!j.beats.length) throw new Error('vitrine vazia');
      try{ localStorage.setItem(GUARDA_VIT,JSON.stringify({at:Date.now(),beats:j.beats})); }catch(_){}
      aplicaVitrine(j.beats);
    }).catch(function(){
      var c=null; try{ c=JSON.parse(localStorage.getItem(GUARDA_VIT)||'null'); }catch(_){}
      if(c&&c.beats&&c.beats.length){ aplicaVitrine(c.beats); return; }
      window.__VIT_OK=false;
      // a lista só desenhava depois da API; sem ela, ficava vazia. Agora desenha
      // todos os beats (loja de pé, dá pra comprar) com o aviso em cima.
      if(typeof renderCards==='function') renderCards();
      avisoForaDoAr();
      if(typeof depoisDeFalhar==='function') depoisDeFalhar();
    });
  }


  // iPhone não deixa mexer no volume por software. Testo de verdade: se o
  // aparelho ignorar, o slider some e o carrinho fica no lugar dele no celular.
  function ehIOS(){
    try{
      var ua=navigator.userAgent||'';
      if(/iPad|iPhone|iPod/.test(ua)) return true;
      // iPad moderno se apresenta como Mac; o toque entrega
      return navigator.platform==='MacIntel' && navigator.maxTouchPoints>1;
    }catch(_){ return false; }
  }
  function volumeMexe(){
    // iPhone/iPad aceitam escrever em som.volume e ignoram o valor: só o
    // botão físico manda. Não adianta testar, tem que reconhecer o aparelho.
    if(ehIOS()) return false;
    try{
      var v=som.volume;
      som.volume=0.42;
      var ok=Math.abs(som.volume-0.42)<0.01;
      som.volume=v;
      return ok;
    }catch(_){ return false; }
  }

  // nome grande na barra do pé: mede quanto sobra e liga o deslizar (CSS v32)
  function rolaNome(){
    var nm=$('npName'); if(!nm) return;
    var ajusta=function(){
      nm.classList.remove('rola');
      var sobra=nm.scrollWidth-nm.clientWidth;
      if(sobra>2){
        nm.style.setProperty('--d',-(sobra+6)+'px');
        // ~30px por segundo em cada ida (30% do ciclo), no mínimo 7s
        nm.style.setProperty('--dur',Math.max(7,(sobra+6)/30/0.3).toFixed(1)+'s');
        nm.classList.add('rola');
      }
    };
    if(window.requestAnimationFrame) requestAnimationFrame(ajusta); else ajusta();
  }
  window.rolaNome=rolaNome;
  (function(){
    var t; window.addEventListener('resize',function(){ clearTimeout(t); t=setTimeout(rolaNome,150); });
    try{ if(document.fonts&&document.fonts.ready) document.fonts.ready.then(rolaNome); }catch(_){}
  })();

  // altura real do menu fixo vira o recuo das âncoras (ver CSS v28)
  function medirMenu(){
    try{
      var n=document.querySelector('nav');
      if(n) document.documentElement.style.setProperty('--nav-h',Math.round(n.getBoundingClientRect().height)+'px');
      var f=document.querySelector('footer');
      if(f) document.documentElement.style.setProperty('--rodape-h',Math.floor(f.getBoundingClientRect().height)+'px');
    }catch(_){}
  }

  // No computador o volume fica colado nos controles (ponta direita) e o
  // compartilhar vai pra direita, do lado do preço. No celular o HTML original
  // vale: compartilhar no fim dos controles, volume no canto do nome.
  function arrumaBarra(){
    var tr=document.querySelector('.np-bar .transporte'), dir=document.querySelector('.np-bar .pe-dir');
    var vol=$('npVolWrap'), sh=$('npShare');
    if(!tr||!dir||!vol||!sh) return;
    var cel=false; try{ cel=matchMedia('(max-width: 600px)').matches; }catch(_){}
    if(cel){ if(sh.parentNode!==tr) tr.appendChild(sh); if(vol.parentNode!==dir) dir.insertBefore(vol,dir.firstChild); }
    else { if(vol.parentNode!==tr) tr.appendChild(vol); if(sh.parentNode!==dir) dir.insertBefore(sh,dir.firstChild); }
  }

  function boot(){
    medirMenu();
    arrumaBarra();
    window.addEventListener('resize',arrumaBarra);
    window.addEventListener('resize',medirMenu);
    document.body.classList.toggle('sem-volume',!volumeMexe());
    renderFeatured();
    initHero();
    initStudioVideos();
    ligarSeek($('npSeek'));
    if($('npPlay')) $('npPlay').innerHTML=ICO_P;
    if(window.__LOJA_FORA) avisoForaDoAr();
    carregarVitrine();
  }
  if(document.readyState!=='loading')boot();else document.addEventListener('DOMContentLoaded',boot);
})();
}catch(e){ setTimeout(function(){ throw e; }); }

/* ─────────────────────────────────────────────────────────────── */
function toggleMenu(){var b=document.getElementById('navBurger');var l=document.querySelector('.nav-links');if(!b||!l)return;var open=l.classList.toggle('open');b.classList.toggle('open',open);}
document.querySelectorAll('.nav-links a').forEach(function(a){a.addEventListener('click',function(e){
  // celular: BEATS abre e fecha os gêneros (acordeão, 04/10/2026) em vez de descer pra lista
  if(a.parentNode.classList.contains('tem-sub')&&window.matchMedia&&matchMedia('(max-width:600px)').matches){ e.preventDefault(); var li=a.parentNode, on=!li.classList.contains('abre'); li.classList.toggle('abre',on); a.setAttribute('aria-expanded',on?'true':'false'); return; }
  var l=document.querySelector('.nav-links');var b=document.getElementById('navBurger');if(l)l.classList.remove('open');if(b)b.classList.remove('open');});});
// quantos à venda: no total ("Todos os beats") e por gênero, pelo slug das pílulas
(function(){ try{
  var chave={}; document.querySelectorAll('.ftabs a.ft[href^="/beats/"]').forEach(function(p){ var m=(p.getAttribute('onclick')||'').match(/filtLink\(event,'([^']+)'/); if(m) chave[p.getAttribute('href')]=m[1]; });
  var venda=BEATS.filter(function(b){ return !b.sold; });
  var td=document.querySelector('.nav-links .sub-gen a.sg-todos');
  if(td){ td.innerHTML='<span>'+td.textContent+'</span>'+(venda.length?'<i>'+venda.length+' à venda</i>':''); }
  document.querySelectorAll('.nav-links .sub-gen .sg-lista a').forEach(function(a){ var k=chave[a.getAttribute('href')]; var n=k?venda.filter(function(b){ return b.genre===k; }).length:0; if(n) a.insertAdjacentHTML('beforeend','<i>'+n+'</i>'); });
}catch(_){} })();

/* ─────────────────────────────────────────────────────────────── */
try{
/* ── CARRINHO QUE NÃO SOME ────────────────────────────────────────
   O carrinho vivia só na memória da aba: recarregou, fechou ou abriu
   noutra aba, zerava. Agora ele volta do navegador, conferido contra os
   beats e os preços de hoje. Roda ANTES do deep-link, pra um #add= somar
   ao que já estava lá em vez de começar do zero. */
(function(){
  var CHAVE='caramujo_carrinho_v1', VALIDADE=7*864e5;

  function guardar(){
    try{
      if(!cart.length){ localStorage.removeItem(CHAVE); return; }
      localStorage.setItem(CHAVE, JSON.stringify({ em:Date.now(), itens:cart }));
    }catch(_){}
  }

  // Os preços de hoje moram no próprio HTML (onclick="addSvc('Mixagem',149)").
  // Leio de lá na volta: carrinho velho nunca fecha num preço que não está mais
  // na página. Nome com dois preços diferentes é ambíguo, e aí eu não decido: cai.
  function tabela(fn){
    var achados={};
    try{
      document.querySelectorAll('[onclick*="'+fn+'("]').forEach(function(el){
        var m=(el.getAttribute('onclick')||'').match(new RegExp(fn+"\\(\\s*'([^']*)'\\s*,\\s*(\\d+(?:\\.\\d+)?)"));
        if(!m) return;
        (achados[m[1]]=achados[m[1]]||[]).push(Number(m[2]));
      });
    }catch(_){}
    var mapa={};
    Object.keys(achados).forEach(function(k){
      var unicos=achados[k].filter(function(v,i,a){return a.indexOf(v)===i});
      mapa[k]= unicos.length===1 ? unicos[0] : null;
    });
    return mapa;
  }

  function beatVivo(id){
    var b=BEATS.find(function(x){return Number(x.id)===Number(id)});
    return (b && !b.sold) ? b : null;
  }

  function restaurar(){
    // loja fora do ar (lista vazia): o carrinho salvo fica guardado pra depois
    if(!BEATS.length) return;
    var bruto=null;
    try{ bruto=localStorage.getItem(CHAVE); }catch(_){ return; }
    if(!bruto) return;
    var dados=null;
    try{ dados=JSON.parse(bruto); }catch(_){}
    if(!dados || !Array.isArray(dados.itens) || !dados.em || Date.now()-dados.em>VALIDADE){
      try{ localStorage.removeItem(CHAVE); }catch(_){}
      return;
    }

    var svc=tabela('addSvc'), pkg=tabela('addPkg'), caiu=0, mexidos=0, bons=[];
    var marca=Date.now();

    dados.itens.forEach(function(it,i){
      if(!it || !it.type){ caiu++; return; }

      if(it.type==='Beat'){
        var b=beatVivo(it.beatId);
        if(!b){ caiu++; return; }                       // vendido ou sumiu do catálogo
        var hoje=it.stems ? PRICE_STEMS : PRICE_BEAT;
        if(Number(it.orig!=null?it.orig:it.price)!==hoje) mexidos++;   // 11/10: price já vem com o desconto
        bons.push({ id:it.id||marca+i, beatId:b.id,
          name: it.stems ? b.name+' + Stems' : b.name,
          price: it.stems ? PRICE_STEMS : PRICE_BEAT,   // preço de hoje, não o guardado
          type:'Beat', stems:!!it.stems });
        return;
      }

      if(it.type==='Servico'){
        var ps=svc[it.name];
        if(ps==null){ caiu++; return; }                 // serviço saiu da página, ou preço ambíguo
        if(Number(it.unitPrice)!==ps) mexidos++;
        var q=Math.max(1, Number(it.qty)||1);
        bons.push({ id:it.id||marca+i, name:it.name, price:ps*q, unitPrice:ps,
          type:'Servico', qty:q, beatId:null, stems:false });
        return;
      }

      if(it.type==='Pacote'){
        var pp=pkg[it.name];
        var grupos=Array.isArray(it.pkgBeats)?it.pkgBeats:[];
        if(pp==null || !grupos.length){ caiu++; return; }
        var inteiro=grupos.every(function(g){
          return Array.isArray(g) && g.length && g.every(function(x){ return !!beatVivo(x && x.id); });
        });
        if(!inteiro){ caiu++; return; }                 // um beat do pacote foi vendido
        // 11/10/2026: pacote guardado volta como os beats dele (o desconto é por quantidade)
        grupos.forEach(function(g){ g.forEach(function(x,k){
          var bb=beatVivo(x.id); if(!bb||bons.some(function(o){return o.beatId===bb.id;})) return;
          bons.push({ id:marca+i*100+k, beatId:bb.id, name:bb.name, price:PRICE_BEAT, orig:PRICE_BEAT, type:'Beat', stems:false });
        }); });
        return;
      }

      caiu++;
    });

    if(!bons.length && !caiu) return;
    cart.length=0;
    bons.forEach(function(x){ cart.push(x); });
    if(typeof updateCart==='function') updateCart();
    if(typeof syncBeatButtons==='function') syncBeatButtons();
    var avisos=[];
    if(caiu) avisos.push(caiu===1 ? '1 item saiu do carrinho' : caiu+' itens saíram do carrinho');
    if(mexidos) avisos.push(mexidos===1 ? '1 mudou de preço' : mexidos+' mudaram de preço');
    if(avisos.length && typeof showToast==='function') showToast(avisos.join(' e ')+'.');
  }

  // Toda mudança do carrinho passa por updateCart. É o único lugar que precisa saber.
  var _updateCart=window.updateCart;
  if(typeof _updateCart==='function'){
    window.updateCart=function(){ var r=_updateCart.apply(this,arguments); guardar(); return r; };
  }

  if(document.readyState!=='loading') restaurar();
  else document.addEventListener('DOMContentLoaded',restaurar);
})();
}catch(e){ setTimeout(function(){ throw e; }); }

/* ─────────────────────────────────────────────────────────────── */
try{
/* ── DEEP-LINK POR BEAT (#beat=slug e #add=slug) ──────────────────
   Abre o site direto num beat: acha pelo nome, mostra, rola e toca.
   #add faz o mesmo e ainda joga o beat no carrinho, já aberto: é o link
   do botão de carrinho das beat tapes.
   Ao tocar qualquer beat, atualiza a URL (link compartilhável). */
(function(){
  function slugify(s){return (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
  function beatSlug(b){return slugify(b&&b.name);}

  // espera a linha do beat existir na página e o MP3 dele estar conhecido, aí toca
  function deepLinkPlay(id){
    var start=Date.now();
    (function espera(){
      var pronto=window.__VIT_OK && (window.__VIT[String(id)]||{}).mp3;
      if(pronto && document.querySelector('#beatCards .item[data-bid="'+id+'"]')){
        try{ window.tocarBeat(id); }catch(_){}
        return;
      }
      if(Date.now()-start<15000) setTimeout(espera,250);
    })();
  }

  // Veio do catálogo de uma beat tape: joga no carrinho e abre o carrinho,
  // pronto pro checkout. Beat que já estava lá dentro não é tirado.
  function paraOCarrinho(b){
    try{
      if(b.sold) return;
      var ja = typeof cart!=='undefined' && cart.some(function(c){return c.beatId===b.id&&!c.stems;});
      if(!ja && typeof toggleBeat==='function') toggleBeat(b.id,false);
      if(typeof openCart==='function') openCart();
      if(history.replaceState) history.replaceState(null,'','#beat='+beatSlug(b));
    }catch(_){}
  }

  function openBeatFromHash(){
    var m=(location.hash||'').match(/^#(beat|add)=(.+)$/i);
    if(!m) return;
    var modo=m[1].toLowerCase();
    var target=slugify(decodeURIComponent(m[2]));
    if(!target) return;
    var b=BEATS.find(function(x){return beatSlug(x)===target;});
    if(!b) return;
    // reseta filtros pra garantir que o beat apareça
    curFilt='todos'; showAvailOnly=false; beatQuery='';
    var st=document.getElementById('beatSearchTop'); if(st)st.value='';
    var sb=document.getElementById('beatSearchBottom'); if(sb)sb.value='';
    document.querySelectorAll('.ft:not(#filtAvail)').forEach(function(x){var oc=x.getAttribute('onclick')||'';x.classList.toggle('on',oc.indexOf("'todos'")>-1);});
    var fa=document.getElementById('filtAvail'); if(fa){fa.classList.remove('on');fa.textContent='Esconder vendidos';}
    // acha a página na mesma ordenação do renderCards
    var src=BEATS.slice();
    if(typeof sortMode!=='undefined'&&sortMode==='aleatorio'&&typeof shuffleOrder!=='undefined'&&shuffleOrder) src.sort(function(a,c){return shuffleOrder.indexOf(a.id)-shuffleOrder.indexOf(c.id);});
    var idx=src.findIndex(function(x){return x.id===b.id;});
    if(idx>=0) curPage=Math.floor(idx/BEATS_PER_PAGE)+1;
    renderCards();
    // rola até o card e destaca
    setTimeout(function(){
      var card=document.querySelector('#beatCards .item[data-bid="'+b.id+'"]');
      if(card){card.scrollIntoView({behavior:'smooth',block:'center'});card.classList.add('lucky-hit');setTimeout(function(){card.classList.remove('lucky-hit');},2800);}
    },220);
    if(modo==='add') paraOCarrinho(b);
    deepLinkPlay(b.id);   // beat vendido também toca: prova social
  }

  // ao tocar um beat, grava #beat=slug na URL (sem recarregar nem re-disparar o deep-link)
  var _npSet=window.npSet;
  if(typeof _npSet==='function'){
    window.npSet=function(w,bid){
      _npSet(w,bid);
      try{var b=BEATS.find(function(x){return String(x.id)===String(bid);});if(b&&history.replaceState)history.replaceState(null,'','#beat='+beatSlug(b));}catch(_){}
    };
  }

  // o voltar que só fechou uma folha (carrinho, checkout...) não reabre o beat do endereço (03/10/2026)
  window.addEventListener('hashchange',function(){ if(Date.now()-(window.__folhaVolta||0)<800) return; if(/^#(beat|add)=/i.test(location.hash)) openBeatFromHash(); });
  if(/^#(beat|add)=/i.test(location.hash)){
    if(document.readyState!=='loading') openBeatFromHash();
    else document.addEventListener('DOMContentLoaded',openBeatFromHash);
  }

  // #carrinho (03/10/2026): o carrinho do topo das páginas de beat e de gênero abre o
  // carrinho daqui, com o que a pessoa já tinha guardado. O endereço volta limpo.
  function abreCarrinhoDoLink(){
    try{
      if(typeof openCart==='function') openCart();
      if(history.replaceState) history.replaceState(null,'',location.pathname+location.search);
    }catch(_){}
  }
  if(location.hash==='#carrinho'){
    if(document.readyState!=='loading') setTimeout(abreCarrinhoDoLink,300);
    else document.addEventListener('DOMContentLoaded',function(){ setTimeout(abreCarrinhoDoLink,300); });
  }
})();
}catch(e){ setTimeout(function(){ throw e; }); }

/* ─────────────────────────────────────────────────────────────── */
try{
(function(){
  window.openLB=function(kind,src){
    var lb=document.getElementById('mediaLB'), inner=document.getElementById('lbInner');
    if(!lb||!inner)return;
    inner.innerHTML='';
    if(kind==='img'){
      var im=document.createElement('img'); im.src=src; im.alt=''; inner.appendChild(im);
    } else {
      var v=document.createElement('video'); v.src=src; v.setAttribute('playsinline',''); v.playsInline=true; v.controls=true; v.autoplay=true;
      if(kind==='video-loop'){ v.loop=true; v.muted=true; }
      else {
        try{ window.pausarBeat(); }catch(_){}
      }
      inner.appendChild(v);
      try{ v.play(); }catch(_){}
    }
    lb.classList.add('on'); lb.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
  };
  window.closeLB=function(){
    var lb=document.getElementById('mediaLB'), inner=document.getElementById('lbInner');
    if(!lb||!inner)return;
    var vid=inner.querySelector('video'); if(vid){ try{vid.pause();}catch(_){} }
    inner.innerHTML='';
    lb.classList.remove('on'); lb.setAttribute('aria-hidden','true');
    document.body.style.overflow='';
    try{ window.retomarBeat(); }catch(_){}
  };
  var lb=document.getElementById('mediaLB');
  if(lb) lb.addEventListener('click',function(e){ if(e.target===lb) window.closeLB(); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape') window.closeLB(); });
})();
}catch(e){ setTimeout(function(){ throw e; }); }

/* ─────────────────────────────────────────────────────────────── */
try{
/* ── LINK DE BEAT + FUNIL DE VENDA (24/09/2026) ───────────────────────
   1) Compartilhar: o botão da barra do pé manda caramujorecords.com.br/b/<slug>,
      que abre com prévia (capa, nome, ficha) no Direct, no WhatsApp e no story.
   2) Funil: avisa /api/funil em que etapa a visita chegou (visita, play,
      carrinho, checkout, pagamento, pago), uma vez por etapa por aba.
      Nada pessoal: a sessão é um número aleatório que morre com a aba.
      As funções do checkout NÃO foram editadas: eu só envelopo por fora. */
(function(){
  function slugify(s){return (s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
  function beatAtual(){
    try{
      var bar=document.getElementById('npBar'); var id=bar&&bar.dataset.bid;
      return id?BEATS.find(function(b){return String(b.id)===String(id);}):null;
    }catch(_){ return null; }
  }

  /* ---------- compartilhar ---------- */
  // Folha do assets/story.js: prévia, texto do cupom, "Postar no story" (vídeo de 15s
  // com o trecho que está tocando, ou a arte) e "Enviar o link". O link do story leva
  // ?de=story pro funil saber de onde veio. O arquivo vem uns segundos depois do
  // primeiro play (20KB), pra folha abrir na hora quando a pessoa tocar em compartilhar.
  var storyJs=null;
  function carregarStory(){
    if(window.CaramujoStory) return Promise.resolve();
    if(storyJs) return storyJs;
    storyJs=new Promise(function(ok,falha){
      var s=document.createElement('script'); s.src='/assets/story.js?v=2026-10-10a';
      s.onload=ok; s.onerror=function(){ storyJs=null; falha(); };
      document.head.appendChild(s);
    });
    return storyJs;
  }
  // Safari antigo só grava o som do vídeo com o áudio destravado NESTE toque
  function destravarSom(){
    try{
      if(window.AudioEncoder||!window.MediaRecorder) return;
      var AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
      if(!window.__csAC) window.__csAC=new AC();
      if(window.__csAC.state==='suspended') window.__csAC.resume();
    }catch(_){}
  }
  // a prévia do trecho toca num player da folha; o celular só deixa tocar depois de um
  // toque, então ele nasce aqui, no toque de compartilhar (mudo até a folha achar o trecho)
  function destravarPrevia(src){
    try{
      var a=window.__csPrevia||(window.__csPrevia=new Audio());
      a.preload='auto';
      if(a.__src!==src){ a.src=src; a.__src=src; }
      a.muted=true;
      var p=a.play(); if(p&&p.catch) p.catch(function(){});
    }catch(_){}
  }
  function soltarPrevia(){ try{ if(window.__csPrevia) window.__csPrevia.pause(); }catch(_){} }
  function soLink(url){
    var computador=false; try{ computador=matchMedia('(hover: hover) and (pointer: fine)').matches; }catch(_){}
    if(navigator.share && !computador){ navigator.share({url:url}).catch(function(){}); return; }
    var aviso=function(){ try{ showToast('Link do beat copiado'); }catch(_){} };
    if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(aviso,function(){ prompt('Copia o link do beat:',url); });
    else prompt('Copia o link do beat:',url);
  }
  window.__csPreparar=function(){
    var ocioso=window.requestIdleCallback||function(f){ setTimeout(f,1500); };
    setTimeout(function(){ ocioso(function(){ carregarStory().catch(function(){}); }); },3000);
    window.__csPreparar=function(){};
  };
  window.npCompartilhar=function(){
    var b=beatAtual(); if(!b) return;
    destravarSom();
    var sl=slugify(b.name);
    var url=location.origin+'/b/'+sl;
    var f=(window.__VIT||{})[String(b.id)]||{};
    var som=window.__npSom&&window.__npSom();
    // o beat do site para e a folha toca o trecho que vai pro story
    if(som&&!som.paused) som.pause();
    if(f.mp3) destravarPrevia(f.mp3);
    carregarStory().then(function(){
      window.CaramujoStory.abrir({
        tema:'site', titulo:b.name,
        url:url, urlStory:url+'?de=story', nomeArquivo:'caramujo-'+sl,
        arte:{ capa:f.capaG||null, titulo:b.name,
          ficha:[(typeof GENRE_LABELS!=='undefined'&&GENRE_LABELS[b.genre])||b.genre, b.bpm?b.bpm+' BPM':'', b.key] },
        // o trecho sai dos 15s mais fortes do beat (onda); sem onda, de onde está tocando
        audio:f.mp3?{ src:f.mp3, inicio:(som&&som.currentTime)||0, dur:f.dur||(som&&som.duration)||0 }:null,
        pausar:function(){ if(som&&!som.paused) som.pause(); },   // não toca junto com o Instagram nem com a prévia do trecho
        avisar:function(m){ try{ showToast(m); }catch(_){} }
      });
    }).catch(function(){ soltarPrevia(); soLink(url); });   // sem a folha, o compartilhar de sempre
  };

  /* ---------- funil ---------- */
  var ls=function(k,v){ try{ if(v===undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k,v); }catch(_){ return null; } };
  try{ if(navigator.webdriver) return; }catch(_){}

  var sessao=ls('cr_sessao');
  if(!sessao){
    try{ var r=new Uint32Array(3); crypto.getRandomValues(r); sessao=Array.prototype.map.call(r,function(n){return n.toString(36);}).join('').slice(0,24); }
    catch(_){ sessao=(Date.now().toString(36)+Math.random().toString(36).slice(2)).slice(0,24); }
    if(sessao.length<10) sessao=(sessao+'0000000000').slice(0,10);
    ls('cr_sessao',sessao);
  }
  var aparelho=(function(){ try{ return (matchMedia('(max-width: 760px)').matches||/Mobi|Android|iPhone/i.test(navigator.userAgent))?'celular':'computador'; }catch(_){ return 'computador'; } })();

  // De onde veio: ?de=<rótulo> manda (bio do Instagram, link de beat, story);
  // senão, o app que abriu o link ou o site anterior. Guardado na aba.
  var origem=ls('cr_origem');
  if(!origem){
    var de=null; try{ de=new URLSearchParams(location.search).get('de'); }catch(_){}
    var ua=navigator.userAgent||'', ref=''; try{ ref=document.referrer?new URL(document.referrer).hostname:''; }catch(_){}
    if(de) origem=de.toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,40)||'direto';
    else if(/^#add=/i.test(location.hash)) origem='beat-tape';
    else if(/Instagram/i.test(ua)||/instagram\.com$/.test(ref)) origem='instagram';
    else if(/FBAN|FBAV/i.test(ua)||/facebook\.com$/.test(ref)) origem='facebook';
    else if(/WhatsApp/i.test(ua)||/whatsapp/.test(ref)) origem='whatsapp';
    else if(/TikTok|musical_ly|BytedanceWebview/i.test(ua)||/tiktok\.com$/.test(ref)) origem='tiktok';
    else if(/youtube\.com$|youtu\.be$/.test(ref)) origem='youtube';
    else if(/(^|\.)google\./.test(ref)) origem='google';
    else if(/bing\.com$|duckduckgo\.com$/.test(ref)) origem='busca';
    else if(ref && ref===location.hostname){                     // veio de uma página de tape
      var cam=''; try{ cam=new URL(document.referrer).pathname.split('/').filter(Boolean); }catch(_){ cam=[]; }
      origem=cam[0]==='beat' ? 'pagina-beat' : cam[0]==='beats' ? 'pagina-genero'
        : (cam.length===2 && cam[0]!=='b') ? ('tape-'+cam[0]).slice(0,40) : 'beat-tape';
    }
    else if(ref) origem='outro-site';
    else origem='direto';
    ls('cr_origem',origem);
  }
  // o ?de= já cumpriu o papel: sai da barra de endereço (o #beat= fica)
  try{ if(/[?&]de=/.test(location.search)&&history.replaceState) history.replaceState(null,'',location.pathname+location.hash); }catch(_){}

  // um aviso por beat por visita: quais beats tocaram e quais foram pro carrinho
  function porBeat(tipo,beatId){
    var n=Number(beatId); if(!(n>0)) return;
    if(ls('cr_b_'+tipo+'_'+n)) return;
    ls('cr_b_'+tipo+'_'+n,'1');
    var txt=JSON.stringify({s:sessao,e:tipo,a:aparelho,o:origem,b:n});
    try{
      if(navigator.sendBeacon && navigator.sendBeacon('/api/funil',txt)) return;
      fetch('/api/funil',{method:'POST',body:txt,keepalive:true}).catch(function(){});
    }catch(_){}
  }

  function marca(etapa,beatId){
    if(ls('cr_f_'+etapa)) return;
    ls('cr_f_'+etapa,'1');
    var corpo={s:sessao,e:etapa,a:aparelho,o:origem};
    var n=Number(beatId); if(n>0) corpo.b=n;
    var txt=JSON.stringify(corpo);
    try{
      if(navigator.sendBeacon && navigator.sendBeacon('/api/funil',txt)) return;
      fetch('/api/funil',{method:'POST',body:txt,keepalive:true}).catch(function(){});
    }catch(_){}
  }
  window.__funil=marca;

  function envolve(nome,antes,depois){
    var orig=window[nome]; if(typeof orig!=='function') return;
    window[nome]=function(){
      var ctx=antes?antes.apply(this,arguments):null;
      var r=orig.apply(this,arguments);
      try{ depois&&depois(ctx,arguments,r); }catch(_){}
      return r;
    };
  }
  var qtd=function(){ try{ return cart.reduce(function(s,c){return s+(c.qty||1);},0); }catch(_){ return 0; } };

  // play só conta quando o som sai de verdade: link aberto sem toque (deep-link)
  // pode ter o autoplay barrado pelo celular. O ícone de pause (rect) é a prova.
  var tocandoMesmo=function(){ var b=document.getElementById('npPlay'); return !!(b&&/rect/.test(b.innerHTML)); };
  var confere=function(id){ [700,2500].forEach(function(t){ setTimeout(function(){ if(tocandoMesmo()){ marca('play',id); porBeat('toque',id); } },t); }); };
  envolve('tocarBeat',null,function(_,a){ confere(a[0]); });
  envolve('npToggle',null,function(){ var b=beatAtual(); confere(b&&b.id); });
  ['toggleBeat','addPkg','addSvc'].forEach(function(nome){
    envolve(nome,function(){ return qtd(); },function(antes,a){
      if(qtd()>antes){ marca('carrinho',nome==='toggleBeat'?a[0]:null); if(nome==='toggleBeat') porBeat('adicao',a[0]); }
    });
  });
  envolve('openCheckout',null,function(){ try{ if(cart.length) marca('checkout'); }catch(_){} });
  // goToPayment é async: conta quando a promessa termina com o passo 2 na tela
  // (formulário válido e pagamento montado, ou o PIX manual de reserva)
  var passo2=function(){ try{ return document.getElementById('mpStep2').style.display==='block'; }catch(_){ return false; } };
  envolve('goToPayment',null,function(_,__,r){
    if(passo2()) marca('pagamento');
    if(r&&typeof r.then==='function') r.then(function(){ if(passo2()) marca('pagamento'); },function(){});
  });
  envolve('showPixConfirmed',null,function(){ marca('pago'); });
  envolve('updateCart',null,function(){ if(window.pintarPrecoPe) window.pintarPrecoPe(); });

  if(document.readyState==='complete') marca('visita');
  else window.addEventListener('load',function(){ marca('visita'); });
})();
}catch(e){ setTimeout(function(){ throw e; }); }

/* ─────────────────────────────────────────────────────────────── */
try{
/* ── PIX: VOLTOU DO APP DO BANCO (03/10/2026) ──────────────────────────
   No celular a pessoa copia o código, paga no app do banco e volta pro site.
   1) A conferência automática roda de 5 em 5 (depois 8, 12) segundos; quando a aba
      volta a aparecer, confiro na hora, e o PEDIDO CONFIRMADO aparece sem espera.
   2) O PIX gerado fica guardado no navegador por 2 horas. Se o celular recarregou a
      página na volta do banco (o iPhone faz isso) ou a pessoa fechou no X, aparece a
      faixa "Seu PIX de R$ X tá aguardando" com VER O PIX e DESCARTAR. Pagamento
      aprovado nesse meio tempo: abre o PEDIDO CONFIRMADO de sempre.
   Só envelopo por fora: startPixPolling, showPixConfirmed e closeCheckout seguem iguais. */
(function(){
  var pagamento=null, conferindo=false;
  var CHAVE='caramujo_pix_v1', VALE=2*3600e3;
  var $=function(i){ return document.getElementById(i); };
  var orig=window.startPixPolling;
  if(typeof orig!=='function') return;

  function lerGuardado(){
    try{ var g=JSON.parse(localStorage.getItem(CHAVE)||'null'); if(g&&g.id&&g.at&&Date.now()-g.at<VALE) return g; localStorage.removeItem(CHAVE); }catch(_){}
    return null;
  }
  function esquecer(){ try{ localStorage.removeItem(CHAVE); }catch(_){} }
  function guardar(id){
    try{
      var ant=lerGuardado();
      if(ant&&ant.id===String(id)) return;          // reaberto pela faixa: vale o que foi guardado
      aplicarLeveMais(); var sub=cart.reduce(function(s,c){return s+c.price;},0), total=sub-calcDiscount(sub);
      var itens=cart.map(function(c){ return c.qty&&c.qty>1 ? c.name+' x'+c.qty : c.name; }).join(', ');
      var g={ id:String(id), at:Date.now(), total:total, itens:itens,
        un:cart.reduce(function(s,c){return s+(c.qty||1);},0),
        qr:($('mpPixQrImg')||{}).src||'', code:($('mpPixCode')||{}).value||'' };
      localStorage.setItem(CHAVE,JSON.stringify(g));
    }catch(_){}
  }

  window.startPixPolling=function(id){
    pagamento=id||null;
    if(id) guardar(id);
    esconderFaixa();
    return orig.apply(this,arguments);
  };
  var origOk=window.showPixConfirmed;
  if(typeof origOk==='function') window.showPixConfirmed=function(){ esquecer(); esconderFaixa(); return origOk.apply(this,arguments); };
  var origFecha=window.closeCheckout;
  if(typeof origFecha==='function') window.closeCheckout=function(){
    var r=origFecha.apply(this,arguments);
    // fechou no X com o PIX ainda aberto: a faixa fica como caminho de volta
    try{ var g=lerGuardado(); if(g) mostrarFaixa(g); }catch(_){}
    return r;
  };

  function pendente(){
    var p=$('mpPixPending'), m=$('mpModal');
    return !!(pagamento && p && p.style.display==='block' && m && m.classList.contains('open'));
  }
  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState!=='visible' || conferindo || !pendente()) return;
    conferindo=true;
    fetch('/api/check-payment?id='+encodeURIComponent(pagamento),{cache:'no-store'})
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(d){ if(d && d.status==='approved' && pendente()) showPixConfirmed(); })
      .catch(function(){})
      .then(function(){ conferindo=false; });
  });

  /* ---------- a faixa ---------- */
  function rs(v){ return 'R$ '+String(v); }
  function esconderFaixa(){ var f=$('pixVolta'); if(f) f.hidden=true; }
  function mostrarFaixa(g){
    var f=$('pixVolta'); if(!f) return;
    $('pixVoltaTit').textContent='Seu PIX de '+rs(g.total)+' tá aguardando';
    $('pixVoltaSub').textContent=g.itens||'';
    f.hidden=false;
  }
  function abrirPix(g){
    esconderFaixa();
    try{
      $('mpModalSub').textContent=g.un+' ite'+(g.un===1?'m':'ns')+' · '+rs(g.total);
      $('mpStep1').style.display='none'; $('mpStep2').style.display='none'; $('mpStep3').style.display='block';
      $('mpPixConfirmed').style.display='none'; $('mpPixPending').style.display='block';
      $('mpContractDownload').style.display='none';
      if(g.qr) $('mpPixQrImg').src=g.qr;
      $('mpPixCode').value=g.code||'';
      $('mpPixStatusText').textContent='Aguardando pagamento…';
      $('overlay').classList.add('on'); $('mpModal').classList.add('open');
      startPixPolling(g.id);
    }catch(_){}
  }
  function conferirGuardado(g){
    fetch('/api/check-payment?id='+encodeURIComponent(g.id),{cache:'no-store'})
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(d){
        var st=d&&d.status;
        if(st==='approved'){
          // pagou enquanto a página recarregava: o PEDIDO CONFIRMADO de sempre
          try{
            $('mpModalSub').textContent=g.un+' ite'+(g.un===1?'m':'ns')+' · '+rs(g.total);
            $('mpStep1').style.display='none'; $('mpStep2').style.display='none'; $('mpStep3').style.display='block';
            $('overlay').classList.add('on'); $('mpModal').classList.add('open');
          }catch(_){}
          showPixConfirmed();
        } else if(st==='pending'||st==='in_process'||!st){ mostrarFaixa(g); }   // sem resposta: mostra e confere no VER
        else esquecer();                                                         // recusado, cancelado, vencido
      })
      .catch(function(){ mostrarFaixa(g); });
  }
  function ligarFaixa(){
    var ver=$('pixVoltaVer'), des=$('pixVoltaDescarta');
    if(ver) ver.addEventListener('click',function(){ var g=lerGuardado(); if(g) abrirPix(g); else esconderFaixa(); });
    if(des) des.addEventListener('click',function(){ esquecer(); esconderFaixa(); });
    var g=lerGuardado(); if(g) conferirGuardado(g);
  }
  if(document.readyState!=='loading') ligarFaixa(); else document.addEventListener('DOMContentLoaded',ligarFaixa);
})();
}catch(e){ setTimeout(function(){ throw e; }); }

/* ─────────────────────────────────────────────────────────────── */
try{
/* ── ENTREGA NA HORA (10/10/2026) ──────────────────────────────────────
   Com a chave ligada no painel, o create-payment devolve o link do pedido (/pedido/<token>)
   com o WAV, o MP3 e o contrato do beat. Por fora do checkout: guardo o link quando a resposta
   chega e, no PEDIDO CONFIRMADO, entra o botão BAIXAR SEUS ARQUIVOS e o texto certo. Sem link
   (chave desligada, carrinho sem beat), a tela fica igual. O link fica guardado 2 horas, pra
   quem paga o PIX no app do banco e volta com a página recarregada. */
(function(){
  var CHAVE='caramujo_pedido_v1', VALE=2*3600e3, link=null, tudo=false, nBeats=1;
  var $=function(i){ return document.getElementById(i); };
  var f=window.fetch;
  if(typeof f!=='function'||typeof window.showPixConfirmed!=='function') return;
  window.fetch=function(u){
    var p=f.apply(this,arguments);
    try{
      if(String(u&&u.url||u).indexOf('/api/create-payment')>-1){
        link=null; tudo=false; tirar();
        try{ var corpo=JSON.parse((arguments[1]&&arguments[1].body)||'{}'); nBeats=(corpo.items||[]).filter(function(i){ return i&&i.type==='Beat'; }).length||1; }catch(_){ nBeats=1; }
        try{ localStorage.removeItem(CHAVE); }catch(_){}
        p.then(function(r){
          return r.clone().json().then(function(d){
            if(d&&d.success&&typeof d.pedido==='string'&&/^\/pedido\/[A-Za-z0-9_-]{20,40}$/.test(d.pedido)){
              link=d.pedido; tudo=!!d.pedidoTudo;
              try{ localStorage.setItem(CHAVE,JSON.stringify({ id:String(d.paymentId||''), link:link, tudo:tudo, n:nBeats, at:Date.now() })); }catch(_){}
            }
          });
        }).catch(function(){});
      }
    }catch(_){}
    return p;
  };
  function guardado(){
    try{ var g=JSON.parse(localStorage.getItem(CHAVE)||'null'); if(g&&g.link&&g.at&&Date.now()-g.at<VALE) return g; }catch(_){}
    return null;
  }
  function tirar(){
    ['mpPedidoBtn','mpPedidoNota'].forEach(function(i){ var a=$(i); if(a&&a.parentNode) a.parentNode.removeChild(a); });
    var box=$('mpPixConfirmed'), p=box&&box.querySelector('p');
    if(p&&p.__antes){ p.innerHTML=p.__antes; p.__antes=null; }
    var c=$('mpContractDownload'); if(c&&c.__escondido){ c.__escondido=false; c.style.display=c.__antes||''; }
  }
  function mostrar(tenta){
    var l=link, t=tudo, n=nBeats;
    if(!l){ var g=guardado(); if(g){ l=g.link; t=!!g.tudo; n=g.n||1; } }
    // a resposta do pagamento pode chegar um instante depois da tela: espera um pouco
    if(!l){ if((tenta||0)<15) setTimeout(function(){ mostrar((tenta||0)+1); },120); return; }
    var box=$('mpPixConfirmed'); if(!box) return;
    var p=box.querySelector('p');
    if(p){
      if(!p.__antes) p.__antes=p.innerHTML;
      p.textContent=t?(n>1?'Os beats já são seus. Na página do pedido estão os WAV, os MP3 e o contrato no seu nome.':'O beat já é seu. Na página do pedido estão o WAV, o MP3 e o contrato no seu nome.')
        :'Os beats já estão na página do pedido, com o WAV, o MP3 e o contrato. Os serviços seguem os prazos do contrato, e o @rideblan33 fala com você por e-mail.';
    }
    // o contrato mora na página do pedido: o botão daqui some (11/10/2026)
    var c=$('mpContractDownload');
    if(c&&!c.__escondido){ c.__antes=c.style.display; c.__escondido=true; c.style.display='none'; }
    var a=$('mpPedidoBtn');
    if(!a){
      a=document.createElement('a'); a.id='mpPedidoBtn'; a.className='mp-btn-primary';
      a.target='_blank'; a.rel='noopener';
      a.style.cssText='display:block;box-sizing:border-box;text-align:center;text-decoration:none;';
      a.textContent='↓ BAIXAR SEUS ARQUIVOS';
      box.insertBefore(a,c);
      var n=document.createElement('p'); n.id='mpPedidoNota'; n.className='mp-ok-nota';
      n.textContent='O mesmo link foi pro seu e-mail.';
      box.insertBefore(n,c);
    }
    a.href=l;
  }
  var orig=window.showPixConfirmed;
  window.showPixConfirmed=function(){
    var r=orig.apply(this,arguments);
    try{ mostrar(0); }catch(_){}
    return r;
  };
})();
}catch(e){ setTimeout(function(){ throw e; }); }

/* ─────────────────────────────────────────────────────────────── */
try{
/* ── CHECKOUT QUE LEMBRA (03/10/2026) ──────────────────────────────────
   O openCheckout limpa os campos a cada abertura: quem fechava pra pegar mais um beat
   digitava tudo de novo. Agora e-mail, nome artístico e nome completo ficam guardados
   neste navegador (vêm prontos na próxima compra também). O CPF fica só enquanto a
   página está aberta, nunca guardado. O aceite dos termos segue desmarcado toda vez. */
(function(){
  var CHAVE='caramujo_comprador_v1', GUARDA=['mpEmail','mpArtist','mpName'];
  var cpfDaVez='';
  var orig=window.openCheckout;
  if(typeof orig!=='function') return;
  function ler(){ try{ return JSON.parse(localStorage.getItem(CHAVE)||'null')||{}; }catch(_){ return {}; } }
  function guardar(){
    try{
      var o={};
      GUARDA.forEach(function(id){ var e=document.getElementById(id); if(e&&e.value.trim()) o[id]=e.value.trim().slice(0,120); });
      localStorage.setItem(CHAVE,JSON.stringify(o));
    }catch(_){}
    var c=document.getElementById('mpCpf'); if(c) cpfDaVez=c.value;
  }
  window.openCheckout=function(){
    var r=orig.apply(this,arguments);
    try{
      var o=ler();
      GUARDA.forEach(function(id){ var e=document.getElementById(id); if(e&&!e.value&&o[id]) e.value=o[id]; });
      var c=document.getElementById('mpCpf'); if(c&&!c.value&&cpfDaVez) c.value=cpfDaVez;
    }catch(_){}
    return r;
  };
  GUARDA.concat(['mpCpf']).forEach(function(id){
    var e=document.getElementById(id);
    if(e){ e.addEventListener('change',guardar); e.addEventListener('blur',guardar); }
  });
})();
}catch(e){ setTimeout(function(){ throw e; }); }

/* ─────────────────────────────────────────────────────────────── */
try{
/* ── VOLTAR DO CELULAR FECHA A FOLHA (03/10/2026) ──────────────────────
   Carrinho, escolha do pacote, checkout, mídia ampliada, menu e a folha de compartilhar:
   o voltar do Android (e o gesto de voltar do iPhone) fecha o que está aberto em vez de
   sair do site. Fechou pelo X: a entrada extra do histórico sai junto. Com o PIX na tela,
   o voltar não fecha (pararia a conferência do pagamento): avisa como sair.
   Só observo e chamo as funções de fechar de sempre; nenhuma função do checkout mudou. */
(function(){
  if(!window.history||!history.pushState||!window.MutationObserver) return;
  var $=function(i){ return document.getElementById(i); };
  var tem=function(id,c){ var e=$(id); return !!(e&&e.classList.contains(c)); };
  var folhas=[
    { aberta:function(){ var v=document.querySelector('.cs-veu'); return !!(v&&!v.hidden); },
      fechar:function(){ try{ window.CaramujoStory.fechar(); }catch(_){} } },
    { aberta:function(){ return tem('mediaLB','on'); }, fechar:function(){ closeLB(); } },
    { aberta:function(){ return tem('mpModal','open'); }, fechar:function(){ closeCheckout(); },
      segura:function(){ var p=$('mpPixPending'); return !!(p&&p.style.display==='block'); } },
    { aberta:function(){ return tem('pkgModal','open'); }, fechar:function(){ closePkgModal(); } },
    { aberta:function(){ return tem('cartPanel','open'); }, fechar:function(){ closeAll(); } },
    { aberta:function(){ var l=document.querySelector('.nav-links'); return !!(l&&l.classList.contains('open')); },
      fechar:function(){ toggleMenu(); } }
  ];
  var MARCA={folha:1}, empilhado=false, proprio=false, urlTopo=null, y=null, lenTopo=0, linkEm=0;
  // voltar no histórico devolveria a rolagem de quando a folha abriu: com a folha aberta o
  // navegador não mexe na rolagem (manual) e a página fica onde a pessoa está
  function manual(on){ try{ history.scrollRestoration=on?'manual':'auto'; }catch(_){} }
  window.addEventListener('scroll',function(){ if(empilhado) y=window.pageYOffset; },{passive:true});
  function fica(){ if(y===null) return; var alvo=y; y=null; try{ window.scrollTo({top:alvo,behavior:'instant'}); }catch(_){ window.scrollTo(0,alvo); } }
  // fechou a folha tocando num link (Ver pacotes, item do menu): a navegação é do link
  document.addEventListener('click',function(e){ var a=e.target&&e.target.closest&&e.target.closest('a[href]'); if(a) linkEm=Date.now(); },true);
  // outro código troca o endereço (#beat=) com replaceState: a marca da folha não pode sumir
  var trocaOrig=history.replaceState.bind(history);
  history.replaceState=function(st,t,u){
    if(empilhado&&(st===null||st===undefined)) st=MARCA;
    var r=trocaOrig(st,t,u); if(empilhado) urlTopo=location.href; return r;
  };
  function topo(){ for(var i=0;i<folhas.length;i++){ try{ if(folhas[i].aberta()) return folhas[i]; }catch(_){} } return null; }
  function confere(){
    var f=topo();
    if(f&&!empilhado){ empilhado=true; y=window.pageYOffset; manual(true); history.pushState(MARCA,'',location.href); urlTopo=location.href; lenTopo=history.length; return; }
    if(!f&&empilhado){
      empilhado=false;
      var antes=location.href;
      // fechou pelo X: tira a entrada extra, se ninguém navegou (link #pacotes etc.) no meio tempo
      setTimeout(function(){
        if(!empilhado && location.href===antes && Date.now()-linkEm>400 && history.state && history.state.folha){ proprio=true; y=window.pageYOffset; window.__folhaVolta=Date.now(); history.back(); }
        else if(!empilhado){ y=null; manual(false); }
      },0);
    }
  }
  window.addEventListener('popstate',function(){
    // a entrada de baixo pode ter o #beat= de antes: fica o endereço de agora
    var volta=function(){ if(urlTopo&&urlTopo!==location.href) trocaOrig(null,'',urlTopo); urlTopo=null; };
    if(proprio){ proprio=false; window.__folhaVolta=Date.now(); volta(); fica(); manual(false); return; }
    if(!empilhado) return;
    // link pra uma parte da página (#pacotes, #add= vindo da tape) também dispara popstate,
    // mas cria uma entrada nova: isso é ir pra frente, não voltar. A folha segue como está.
    if(history.length>lenTopo){ empilhado=false; urlTopo=null; y=null; manual(false); return; }
    empilhado=false;
    window.__folhaVolta=Date.now();
    var f=topo(); if(!f){ volta(); fica(); manual(false); return; }
    if(f.segura&&f.segura()){
      var guarda=y;
      empilhado=true; history.pushState(MARCA,'',urlTopo||location.href); lenTopo=history.length; fica(); y=guarda;
      try{ showToast('Seu PIX segue aberto aqui. Pra sair, toque no X.',4000); }catch(_){}
      return;
    }
    volta(); fica(); manual(false);
    try{ f.fechar(); }catch(_){}
  });
  new MutationObserver(confere).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class','hidden']});
})();
}catch(e){ setTimeout(function(){ throw e; }); }

/* ─────────────────────────────────────────────────────────────── */
try{
/* ── FIQUE POR DENTRO (11/10/2026) ───────────────────────────────────
   Cadastro na lista: o servidor (/api/lista) cria o cupom de 25% só dessa pessoa e manda pro
   e-mail. Depois do cadastro, este navegador lembra e a caixa vira o recado de "pronto". */
(function(){
  var CHAVE='caramujo_lista_v1';
  var box=document.getElementById('listaBox'), form=document.getElementById('listaForm');
  if(!box||!form) return;
  var nota=document.getElementById('listaNota'), btn=document.getElementById('listaBtn'), inp=document.getElementById('listaEmail');
  function pronto(email,status){
    box.classList.add('ok');
    form.hidden=true;
    var t=box.querySelector('.lista-t'), p=box.querySelector('.lista-p');
    if(status==='sem-cupom'){ t.textContent='Você já está na lista'; p.textContent='O cupom desse e-mail já foi usado ou venceu, mas os lançamentos e promoções seguem chegando por lá.'; }
    else { t.textContent='Pronto. O cupom chegou no seu e-mail.'; p.textContent='Não achou? Olha no spam e marca a Caramujo como contato, que os próximos e-mails caem na caixa certa.'; }
    nota.textContent=email?'Cadastrado: '+email:'';
  }
  try{ var g=JSON.parse(localStorage.getItem(CHAVE)||'null'); if(g&&g.email) pronto(g.email,g.status); }catch(_){}
  form.addEventListener('submit',function(e){
    e.preventDefault();
    var email=(inp.value||'').trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)){ nota.textContent='Esse e-mail não parece certo. Confere e tenta de novo.'; nota.classList.add('erro'); inp.focus(); return; }
    nota.classList.remove('erro');
    btn.disabled=true; btn.textContent='Enviando…';
    var de='vitrine'; try{ de=sessionStorage.getItem('cr_origem')||'vitrine'; }catch(_){}
    fetch('/api/lista',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:email,de:/^[a-z][a-z0-9-]{0,24}$/.test(de)?de:'vitrine'})})
      .then(function(r){ return r.json().then(function(j){ return {ok:r.ok,j:j}; }); })
      .then(function(x){
        btn.disabled=false; btn.textContent='Quero o cupom';
        if(!x.ok||!x.j||!x.j.ok){ nota.textContent=(x.j&&x.j.erro)||'Não deu pra cadastrar agora. Tenta de novo em instantes.'; nota.classList.add('erro'); return; }
        try{ localStorage.setItem(CHAVE,JSON.stringify({email:email,status:x.j.status,at:Date.now()})); }catch(_){}
        pronto(email,x.j.status);
      })
      .catch(function(){ btn.disabled=false; btn.textContent='Quero o cupom'; nota.textContent='Sem conexão agora. Tenta de novo em instantes.'; nota.classList.add('erro'); });
  });
})();
}catch(e){ setTimeout(function(){ throw e; }); }
