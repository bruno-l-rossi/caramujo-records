/* Painel privado do rideblan33: o script da página (as telas Hoje, Vendas, Catálogo, Perfil, Números e
   Ajustes, a navegação e as folhas). Até 03/11/2026 ele vinha embutido no HTML do functions/painel/index.js,
   a cada abertura e sem cache; desde 04/11/2026 (revisão do painel, item 16) é arquivo à parte, com ?v= do
   próprio conteúdo (node testes/painel-versao.mjs) e guardado 1 ano no aparelho. Roda no fim do <body>,
   antes dos módulos com defer (analytics, vitrine, musicas e gravou), como rodava embutido.
   Os dados vêm de /api/painel, que exige o login. */
(function(){
  var $=function(i){return document.getElementById(i)};
  var artistas=[], tapes=[], revisar=[], revisarErro=false, vista='hoje', filtro='', ordem='atividade', perfilVisto=null;
  var lojaResumo=null, lojaPedida=false, consumoHoje=null, consumoPedido=false, numerosSite=null, numerosPedido=false;
  var musicasResumo=null, musicasPedido=false, entrega=null, entregaPedida=false;
  // e-mail do mês (04/11/2026): o estado vem de op=resumo quando Ajustes abre
  var resumoMes=null, resumoPedido=false;
  var ordemDe={artistas:'atividade',tapes:'modificado'};
  var ORDENS={modificado:'Modificação', atividade:'Atividade', az:'A a Z', faixas:'Mais faixas', perfil:'Ordem do perfil'};
  // Perfil do @rideblan33 (26/09/2026): a mesma conta da página (tape sem ordem = nova = topo)
  function chavePerfil(a){ return a.perfil_ordem!=null ? Number(a.perfil_ordem) : -1000000000 - a.id; }
  function noPerfil(){
    return tapes.filter(function(t){ return t.perfil!==0 && (t.nb||0)>0 })
      .sort(function(x,y){ return chavePerfil(x)-chavePerfil(y) || x.id-y.id });
  }
  function posicaoPerfil(a){
    if(a.perfil===0) return 'Fora do perfil';
    if(!(a.nb>0)) return 'Aparece quando tiver beat pronto';
    var l=noPerfil(), i=l.indexOf(a);
    return (i+1)+'ª de '+l.length+' no perfil';
  }

  function tempo(iso){
    if(!iso) return 'nunca abriu';
    var q=new Date(iso), agora=new Date();
    if((agora.getTime()-q.getTime())/1000 < 3600) return 'aberto agora há pouco';
    // o que conta é a virada do dia: 23h50 de ontem é ONTEM, não "hoje há 24h"
    var zero=function(x){return new Date(x.getFullYear(),x.getMonth(),x.getDate()).getTime()};
    var dias=Math.round((zero(agora)-zero(q))/86400000);
    if(dias<=0) return 'aberto hoje';
    if(dias===1) return 'aberto ontem';
    if(dias<30) return 'aberto há '+dias+' dias';
    var m=Math.floor(dias/30);
    return 'aberto há '+m+(m===1?' mês':' meses');
  }
  function gb(b){
    if(b < 1073741824) return Math.round(b/1048576)+' MB';
    return (b/1073741824).toFixed(1).replace('.',',')+' GB';
  }
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]})}

  // Conversão rodando: a cada 5 s pergunto SÓ o andamento (umas 100 linhas do banco),
  // e só com a aba à vista. A lista completa recarrega uma vez, quando alguém termina.
  // (24/09/2026: recarregar tudo a cada 3 s com o painel aberto estourou o limite
  // diário de leitura do D1 durante a conversão total.)
  var relogio=null;
  function acompanhar(){
    var ativo = artistas.concat(tapes).some(rodando);
    if(ativo && !relogio) relogio=setInterval(espiar, 5000);
    if(!ativo && relogio){ clearInterval(relogio); relogio=null; }
  }
  function espiar(){
    if(document.hidden) return;
    fetch('/api/painel?op=andamento').then(function(r){return r.json()}).then(function(j){
      if(!j||!Array.isArray(j.rodando)) return;
      var agora={}; j.rodando.forEach(function(x){ agora[x.id]=x; });
      var terminou=false;
      artistas.concat(tapes).forEach(function(a){
        var x=agora[a.id];
        if(x){ a.job_estado=x.job_estado; a.job_total=x.job_total; a.job_feitos=x.job_feitos; a.job_at=x.job_at; }
        else if(rodando(a)){ terminou=true; a.job_estado='pronto'; }
      });
      if(terminou) carregar(true);
      else if(vista==='artistas'||vista==='tapes') desenhar();
      acompanhar();
    }).catch(function(){});
  }

  function carregar(silencioso){
    fetch('/api/painel?op=artistas').then(function(r){return r.json()}).then(function(j){
      var antes=artistas.filter(rodando).length;
      var todos=j.artistas||[];
      artistas=todos.filter(function(a){return a.tipo==='artista'});   // 'vitrine' é interno, não aparece
      tapes=todos.filter(function(a){return a.tipo==='tape'});
      perfilVisto=j.perfilVisto||null;
      pintarResumo(j.prateleira.usado);
      desenhar();
      acompanhar();
      fetch('/api/painel?op=revisar').then(function(r){return r.json()}).then(function(x){
        // lista vazia é resposta; resposta torta não pode virar "nada pra revisar"
        revisarErro = !x || !Array.isArray(x.faixas);
        revisar = revisarErro ? [] : x.faixas;
        pintarResumo(j.prateleira.usado); desenhar();
      }).catch(function(){
        revisarErro=true; revisar=[]; pintarResumo(j.prateleira.usado); desenhar();
      });
      if(silencioso && antes && !artistas.filter(rodando).length) flash('Conversão terminou.');
    }).catch(function(){
      if(!silencioso) $('lista').innerHTML='<div class="vazio">Não consegui carregar. Recarrega a página.</div>';
    });
  }

  var TITULOS={hoje:'Hoje',pedidos:'Vendas',cupons:'Vendas',lista:'Vendas',vitrine:'Catálogo',fila:'Catálogo',tapes:'Catálogo',artistas:'Catálogo',perfil:'Perfil',musicas:'Músicas do perfil',gravou:'Quem já gravou',analytics:'Números',ajustes:'Ajustes'};
  var VITRINE_ABA={vitrine:'beats',fila:'fila',cupons:'cupons'};
  /* Voltar (16/10/2026): o histórico do navegador segue o caminho Hoje > seção > parte. Numa
     parte (Músicas, Cupons, Fila…), voltar cai na página da seção (Perfil, Vendas, Catálogo…);
     na página da seção, cai no Hoje. Trocar de parte ou de seção troca a entrada, não empilha. */
  var pilha=[], pendente=null;
  function caminhoDe(v){
    if(v==='hoje') return ['hoje'];
    var g=GRUPO[v]||'hoje', e=ENTRADA[g];
    return (g==='hoje'||v===e)?['hoje',v]:['hoje',e,v];
  }
  function endereco(v){ return location.pathname+(v==='hoje'?'':'#'+v); }
  function poe(v){ history.pushState({painel:v},'',endereco(v)); pilha.push(v); }
  function historico(v){
    var c=caminhoDe(v), k=0;
    while(k<pilha.length&&k<c.length&&pilha[k]===c[k]) k++;
    var tira=pilha.length-k, falta=c.slice(k);
    if(!tira){ falta.forEach(poe); return; }
    if(tira===1&&falta.length===1){ history.replaceState({painel:falta[0]},'',endereco(falta[0])); pilha[pilha.length-1]=falta[0]; return; }
    pilha.length=k; pendente=falta;            // volta o que sobra e, quando o navegador voltar, empilha o resto
    history.go(-tira);
  }
  function iniciarHistorico(v){
    try{ history.replaceState({painel:'hoje'},'',endereco('hoje')); pilha=['hoje']; if(v&&v!=='hoje') caminhoDe(v).slice(1).forEach(poe); }catch(_){ }
  }
  window.addEventListener('popstate',function(e){
    if(pendente){ var f=pendente; pendente=null; try{ f.forEach(poe); }catch(_){ } return; }
    var v=(e.state&&e.state.painel)||((location.hash||'').replace('#',''))||'hoje';
    pilha=caminhoDe(TITULOS[v]?v:'hoje');
    if(!$('veil').hidden){ $('veil').hidden=true; $('card').innerHTML=''; }   // folha aberta fecha junto
    irPara(v,true);
  });
  function irPara(v,semHistorico){
    if(v==='home') v='hoje';
    if(!TITULOS[v]) v='hoje';
    if(v==='hoje'){ lojaPedida=false; consumoPedido=false; numerosPedido=false; musicasPedido=false; entregaPedida=false; listaPedida=false; filaPedida=false; semanaPedida=false; }   // volta com os números novos
    // o endereço guarda a seção (recarregar volta pra ela); Hoje = /painel
    if(!semHistorico && v!==vista){ try{ historico(v); }catch(_){ } }
    vista=v; filtro=''; $('q').value='';
    if(ordemDe[v]){ ordem=ordemDe[v]; $('ordemLabel').textContent=ORDENS[ordem]; }
    $('q').placeholder = v==='tapes' ? 'Buscar beat tape' : 'Buscar artista';
    desenhar(); window.scrollTo(0,0);
  }
  window.__painelIr=irPara;

  /* ---------- painel novo (12/10/2026): Hoje, Vendas, Catálogo, Perfil, Números e Ajustes ----------
     As telas de antes viraram partes das seções: Vitrine e Fila (vitrine.js), Beat tapes e Artistas
     (listas daqui), Cupons (vitrine.js), Pedidos (entrega na hora + serviços), Lista, Músicas
     (musicas.js), Analytics. Barra embaixo no celular, menu do lado no computador. */
  var IC={
    hoje:'<path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"/>',
    vendas:'<path d="M6 6h15l-1.5 9h-12z"/><path d="M6 6L5 3H2"/><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/>',
    catalogo:'<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="8.5" cy="12" r="2"/><circle cx="15.5" cy="12" r="2"/><path d="M8.5 14h7"/>',
    perfil:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>',
    numeros:'<path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 15l4-4 3 3 5-6"/>',
    ajustes:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    site:'<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v6H4V6h6"/>'
  };
  function svg(k,t){ return '<svg width="'+(t||20)+'" height="'+(t||20)+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+IC[k]+'</svg>'; }
  var GRUPO={hoje:'hoje',pedidos:'vendas',cupons:'vendas',lista:'vendas',vitrine:'catalogo',fila:'catalogo',tapes:'catalogo',artistas:'catalogo',perfil:'perfil',musicas:'perfil',gravou:'perfil',analytics:'numeros',ajustes:'ajustes'};
  var ENTRADA={hoje:'hoje',vendas:'pedidos',catalogo:'vitrine',perfil:'perfil',numeros:'analytics',ajustes:'ajustes'};
  // 04/11/2026 (revisão do painel, item 5): as abas com o nome do que guardam (eram Vitrine, Fila e Beat tapes)
  var SUB={vendas:[['pedidos','Pedidos'],['cupons','Cupons'],['lista','Lista']],catalogo:[['vitrine','No site'],['fila','Pra publicar'],['tapes','Tapes'],['artistas','Artistas']]};
  var NAV=[['hoje','Hoje'],['vendas','Vendas'],['catalogo','Catálogo'],['perfil','Perfil'],['numeros','Números']];
  var filaN=null, filaPedida=false, prateleira=null;
  // a Fila vem do relatório da vitrine (lê as faixas todas): o Hoje guarda a conta por 30 min
  function pedirFila(){
    if(filaPedida) return; filaPedida=true;
    try{ var g=JSON.parse(localStorage.getItem('painel-fila')||'null'); if(g&&Date.now()-g.at<30*60e3){ filaN=g.n; return; } }catch(_){ }
    fetch('/api/painel?op=vitrine').then(function(r){return r.json()}).then(function(j){
      filaN=(j&&j.semBotao)?j.semBotao.length:null;
      try{ if(filaN!=null) localStorage.setItem('painel-fila',JSON.stringify({n:filaN,at:Date.now()})); }catch(_){ }
      pintarNav(); refazer(['hoje']);
    }).catch(function(){});
  }
  function refazer(vs){ if((vs||['hoje','pedidos','lista','perfil','ajustes']).indexOf(vista)>-1 && $('veil').hidden) desenhar(); }
  function pendServicos(){ return servicosAbertos().filter(function(x){ return x.s.envio && x.p.status!=='teste'; }); }
  function contaVendas(){ return pendServicos().length; }
  // 16/10/2026: no computador o menu do lado abre as partes da seção embaixo do pai (Vendas,
  // Catálogo, Perfil). Clicar no pai segue abrindo a seção; dá pra ir direto numa parte.
  var FILHOS={vendas:SUB.vendas,catalogo:SUB.catalogo,perfil:[['musicas','Músicas'],['gravou','Quem já gravou'],['@ordem','Ordem das beat tapes'],['@numeros','Números do site']]};
  function pintarNav(){
    var g=GRUPO[vista]||'hoje', n=$('navP'); if(!n) return;
    var bolha={vendas:contaVendas(), catalogo:(filaN||0)+(revisar.length||0)};
    n.innerHTML='<a class="np-marca" href="/" aria-label="Voltar pro site"></a><button type="button" class="np-busca" data-busca>'+LUPA+'<span>Buscar</span><kbd>⌘K</kbd></button>'+NAV.map(function(it){
      var b=bolha[it[0]], f=FILHOS[it[0]], aberto=g===it[0];
      var sub=f&&aberto?'<div class="np-sub">'+f.map(function(x){
        var c=contaAba(x[0]), nn=c&&c.n;
        return '<button type="button" data-filho="'+x[0]+'"'+(vista===x[0]?' aria-current="true"':'')+'>'+x[1]+(nn?'<em'+(c.cinza?' class="cz"':'')+'>'+nn+'</em>':'')+'</button>';
      }).join('')+'</div>':'';
      return '<button type="button" data-sec="'+it[0]+'"'+(f?' class="np-pai" aria-expanded="'+aberto+'"':'')+(aberto?' aria-current="page"':'')+'>'+svg(it[0])+'<span>'+it[1]+'</span>'+(b?'<em>'+b+'</em>':'')+(f?'<span class="np-seta" aria-hidden="true">›</span>':'')+'</button>'+sub;
    }).join('')+'<i class="np-sep"></i><button type="button" class="np-lado" data-sec="ajustes"'+(g==='ajustes'?' aria-current="page"':'')+'>'+svg('ajustes')+'<span>Ajustes</span></button>'+
      '<a class="np-lado" href="/" target="_blank" rel="noopener">'+svg('site')+'<span>Ver o site</span></a>';
    n.querySelectorAll('[data-sec]').forEach(function(b){ b.addEventListener('click',function(){ irPara(ENTRADA[b.dataset.sec]); }); });
    var nb=n.querySelector('[data-busca]'); if(nb) nb.addEventListener('click',function(){ abrirBusca(); });
    n.querySelectorAll('[data-filho]').forEach(function(b){ b.addEventListener('click',function(){
      var v=b.dataset.filho;
      if(v==='@ordem'){ irPara('perfil'); abrirPerfil(); return; }
      if(v==='@numeros'){ irPara('perfil'); abrirNumeros(); return; }
      irPara(v);
    }); });
  }
  function pintarSecoes(){
    var g=GRUPO[vista], s=$('secoes'), l=SUB[g];
    if(!l){ s.hidden=true; s.innerHTML=''; return; }
    s.hidden=false;
    s.innerHTML=l.map(function(it){
      var n=contaAba(it[0]);
      return '<button type="button" data-v="'+it[0]+'" aria-pressed="'+(vista===it[0])+'">'+it[1]+(n&&n.n?'<i'+(n.cinza?' class="cz"':'')+'>'+n.n+'</i>':'')+'</button>';
    }).join('');
    s.querySelectorAll('[data-v]').forEach(function(b){ b.addEventListener('click',function(){ irPara(b.dataset.v); }); });
  }
  // o número de cada aba (04/11/2026): âmbar quando é coisa pra você fazer, cinza quando é só a conta
  function contaAba(k){
    if(k==='pedidos') return {n:contaVendas()};
    if(k==='fila') return {n:filaN};
    if(k==='tapes') return {n:revisar.length};
    if(k==='artistas') return {n:artistas.length,cinza:true};
    if(k==='lista') return {n:lista&&lista.total,cinza:true};
    return null;
  }
  function hojeData(){ var d=new Date(); return d.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'}); }
  function linhaAcao(ic,t,sub,fn,quente){
    var b=document.createElement('button'); b.type='button'; b.className='ac'+(quente?' quente':'');
    b.innerHTML='<span class="ico">'+ic+'</span><span class="t"><b>'+t+'</b><small>'+sub+'</small></span><span class="seta" aria-hidden="true">›</span>';
    b.addEventListener('click',fn); return b;
  }
  /* ---------- Hoje (04/11/2026, revisão do painel, itens 1 a 4) ----------
     A semana com o dinheiro (R$ dos 7 dias, a comparação com os 7 de antes, vendas, visitas, quanto
     comprou e as barras por dia), o "Precisa de você" com o botão da ação no próprio cartão, as últimas
     vendas e 4 atalhos. No computador vira 2 colunas (tarefas e vendas à esquerda, semana e atalhos à
     direita). O contador do banco saiu do topo: só aparece aqui quando passa de 80% do dia. */
  var semanaJ=null, semanaPedida=false;
  function pedirSemana(){
    if(semanaPedida) return; semanaPedida=true;
    fetch('/api/painel?op=semana').then(function(r){return r.json()}).then(function(j){
      semanaJ=(j&&j.ok&&Array.isArray(j.dias))?j:{erro:true}; refazer(['hoje','pedidos','lista']);
    }).catch(function(){ semanaJ={erro:true}; refazer(['hoje']); });
  }
  function reaisInt(n){ return 'R$ '+Math.round(Number(n)||0).toLocaleString('pt-BR'); }
  var DSEM=['dom','seg','ter','qua','qui','sex','sáb'];
  function textoSemana(){
    var j=semanaJ; if(!j||j.erro) return '';
    var v=j.semana.vendas;
    return reaisInt(j.semana.valor)+' nos últimos 7 dias · '+v+(v===1?' venda':' vendas');
  }
  function cartaoSemana(){
    var j=semanaJ, el=document.createElement('button'); el.type='button'; el.className='sem'; el.id='hjSemana';
    el.addEventListener('click',function(){ irPara('analytics'); });
    if(!j){ el.innerHTML='<span class="sem-k">Últimos 7 dias</span><span class="esq" aria-hidden="true"><i></i><i></i><i></i></span><span class="so-leitor">carregando…</span>'; return el; }
    if(j.erro){ el.innerHTML='<span class="sem-k">Últimos 7 dias<span class="sem-ir">Números ›</span></span><span class="sem-l">não consegui somar a semana agora</span>'; return el; }
    var s=j.semana, a=j.anterior, pct=a.valor>0?Math.round((s.valor-a.valor)/a.valor*100):null;
    var pill=pct===null?'':'<span class="sobe'+(pct<0?' desce':'')+'">'+(pct>0?'+':pct<0?'−':'')+Math.abs(pct)+'%</span>';
    var conv=s.visitas?Math.round(s.vendas/s.visitas*1000)/10:0;
    var max=Math.max.apply(null,j.dias.map(function(d){ return d.valor; }).concat([1]));
    el.innerHTML='<span class="sem-k">Últimos 7 dias<span class="sem-ir">Números ›</span></span>'+
      '<span class="sem-v">'+reaisInt(s.valor)+pill+'</span>'+
      '<span class="sem-l"><span><b>'+s.vendas+'</b> '+(s.vendas===1?'venda':'vendas')+'</span><span><b>'+s.visitas+'</b> '+(s.visitas===1?'visita':'visitas')+'</span><span><b>'+String(conv).replace('.',',')+'%</b> compraram</span></span>'+
      '<span class="barras" aria-hidden="true">'+j.dias.map(function(d){ return '<i class="'+(d.valor?'':'z')+'" style="height:'+(d.valor?Math.max(6,Math.round(d.valor/max*58)):3)+'px" title="'+reaisInt(d.valor)+'"></i>'; }).join('')+'</span>'+
      '<span class="barras-l" aria-hidden="true">'+j.dias.map(function(d,i){ return '<span'+(i===6?' class="h"':'')+'>'+DSEM[new Date(d.dia+'T12:00:00').getDay()]+'</span>'; }).join('')+'</span>'+
      '<span class="so-leitor">'+(pct===null?'':(pct>=0?'mais ':'menos ')+Math.abs(pct)+'% que os 7 dias de antes')+'</span>';
    return el;
  }
  // uma linha de tarefa: ícone, texto e o botão da ação (o texto também abre)
  function linhaTarefa(ic,t,sub,bt,fn,quente){
    var d=document.createElement('div'); d.className='lin'+(quente?' quente':'');
    d.innerHTML='<span class="ico">'+ic+'</span><span class="t"><b>'+t+'</b><small>'+sub+'</small></span><button type="button" class="btn'+(quente?' solid':'')+'">'+bt+'</button>';
    d.querySelector('.t').addEventListener('click',fn); d.querySelector('.btn').addEventListener('click',fn);
    return d;
  }
  function quandoRel(iso){
    var d=new Date(iso); if(isNaN(d)) return '';
    var zero=function(x){ return new Date(x.getFullYear(),x.getMonth(),x.getDate()).getTime(); };
    var n=Math.round((zero(new Date())-zero(d))/864e5);
    return n<=0?'hoje':n===1?'ontem':n<7?'há '+n+' dias':dm(iso);
  }
  // o estado do pedido em chip (âmbar = espera algo, branco = sua vez) e o botão quando é pra entregar
  function fimPedido(p){
    var e=estadoPedido(p);
    if(e[1]==='faz') return '<button type="button" class="btn solid" data-ent="'+esc(p.token)+'">Entregar</button>';
    return '<span class="chip'+(p.status==='pendente'?' at':'')+'">'+esc(e[0].replace(/^baixou (\d+)$/,'baixou $1'))+'</span>';
  }
  function linhaPedido(p){
    var itens=p.beats.concat((p.servicos||[]).map(function(x){return x.nome})).join(', ');
    return '<div class="lin ped" data-t="'+esc(p.token)+'"><span class="av">'+esc(iniciais(p.quem))+'</span><span class="t"><b>'+esc((p.quem?p.quem+' · ':'')+itens)+'</b><small>'+quandoRel(p.em)+(p.valor?' · '+reaisInt(p.valor):'')+(p.status==='teste'?' · teste':'')+'</small></span>'+fimPedido(p)+'</div>';
  }
  function ligarPedidos(box,todos){
    box.querySelectorAll('.ped').forEach(function(b){ b.addEventListener('click',function(){ var p=todos.filter(function(x){ return x.token===b.dataset.t; })[0]; if(p) abrirPedido(p); }); });
  }
  function hoje(){
    var box=document.createElement('div'); box.className='hoje hoje-grade';
    var esq=document.createElement('div'), dir=document.createElement('div'); esq.className='hoje-col'; dir.className='hoje-col';
    box.appendChild(esq); box.appendChild(dir);
    var rot=function(onde,t,n,ir,ordem){ var r=document.createElement('div'); r.className='rot2'; r.style.order=ordem; r.innerHTML=t+(n?'<i class="n-at">'+n+'</i>':'')+(ir?'<button type="button" class="rot-ir">'+ir[0]+' ›</button>':''); if(ir) r.querySelector('.rot-ir').addEventListener('click',ir[1]); onde.appendChild(r); return r; };
    // a semana (em cima no celular, à direita no computador)
    var sem=cartaoSemana(); sem.style.order=1; dir.appendChild(sem);
    // precisa de você
    var tarefas=document.createElement('div'); tarefas.className='cx'; var n=0;
    var add=function(el){ tarefas.appendChild(el); n++; };
    var IC_DESCE='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/></svg>';
    var IC_ALERTA='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 4l9 16H3z"/><path d="M12 10v4.5"/><path d="M12 17.5v.01"/></svg>';
    var IC_MAIL='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 7l9 6 9-6"/></svg>';
    pendServicos().forEach(function(x){
      add(linhaTarefa(IC_DESCE,'Entregar '+esc(x.s.nome),esc(x.p.quem||'Quem comprou')+' mandou o material '+quandoRel(x.s.envio.em),'Entregar',function(){ abrirPedido(x.p); },true));
    });
    if(filaN) add(linhaTarefa(svg('catalogo'),filaN+(filaN===1?' beat pra publicar':' beats pra publicar'),'escolher o gênero e pôr no site','Publicar',function(){ irPara('fila'); }));
    if(revisarErro) add(linhaTarefa(svg('catalogo'),'Não consegui conferir os pendentes','a revisão das tapes não respondeu','Tentar',function(){ carregar(true); }));
    if(revisar.length) add(linhaTarefa(IC_ALERTA,revisar.length+(revisar.length===1?' beat pra revisar':' beats pra revisar'),'tapes: marcar disponível ou vendido','Revisar',function(){ irPara('tapes'); var b=document.querySelector('.revisar'); if(b) b.scrollIntoView({block:'start'}); }));
    var env=lista&&lista.envios&&lista.envios[0];
    if(env&&env.ok&&(env.status==='bounced'||env.status==='complained')) add(linhaTarefa(IC_MAIL,env.status==='bounced'?'E-mail do cupom voltou':'E-mail do cupom marcado como spam','pra '+esc(env.email),'Ver',function(){ irPara('lista'); }));
    if(env&&!env.ok) add(linhaTarefa(IC_MAIL,'E-mail do cupom não saiu','pra '+esc(env.email)+' · ver o motivo','Ver',function(){ irPara('lista'); }));
    // 04/11/2026: venda aprovada cujo aviso não chegou no e-mail (a passada diária tenta de novo, até 4 vezes).
    // Tocar abre Vendas; "Já vi" tira daqui e para de tentar.
    ((entrega&&entrega.avisos)||[]).slice(0,3).forEach(function(f){
      var t=linhaTarefa(IC_MAIL,'Aviso de venda não chegou',(f.v?reaisInt(f.v)+' · ':'')+esc(f.itens||'pagamento '+f.p)+' · '+quandoRel(f.em)+((f.n||1)<4?' · tento de novo 1x por dia':' · parei de tentar'),'Já vi',function(){ irPara('pedidos'); },true);
      t.classList.add('aviso-falhou'); t.dataset.p=f.p;
      var b=t.querySelector('.btn'), nb=b.cloneNode(true); b.parentNode.replaceChild(nb,b);
      nb.addEventListener('click',function(e){
        e.stopPropagation(); nb.disabled=true;
        acao('aviso-visto',{p:f.p}).then(function(j){
          if(!j||!j.ok){ nb.disabled=false; flash((j&&j.erro)||'Não salvou. Tenta de novo.'); return; }
          entrega.avisos=j.avisos||[]; desenhar();
        });
      });
      add(t);
    });
    if(consumoHoje&&consumoHoje.hoje/consumoHoje.teto>=0.8) add(linhaTarefa(svg('ajustes'),'Banco passou de 80% hoje',milhar(consumoHoje.hoje)+' de '+milhar(consumoHoje.teto)+' leituras · zera às 21h','Ver',abrirConsumo));
    rot(esq,'Precisa de você',n,null,2);
    if(!n){ var v=document.createElement('p'); v.className='nada'; v.textContent=(entrega&&filaN!==null)?'Nada pendente agora.':'conferindo…'; tarefas.appendChild(v); }
    tarefas.style.order=3; esq.appendChild(tarefas);
    // últimas vendas (os 4 pedidos mais novos, sem os de teste)
    rot(esq,'Últimas vendas',0,['Ver todas',function(){ irPara('pedidos'); }],4);
    var vendas=document.createElement('div'); vendas.className='cx'; vendas.style.order=5;
    var reais=((entrega&&entrega.pedidos)||[]).filter(function(p){ return p.status!=='teste'; });
    vendas.innerHTML=!entrega?'<div class="esq" aria-hidden="true"><i></i><i></i><i></i></div><span class="so-leitor">carregando…</span>':reais.length?reais.slice(0,4).map(linhaPedido).join(''):'<p class="nada">Nenhuma venda com link ainda.</p>';
    ligarPedidos(vendas,reais); vendas.querySelectorAll('[data-ent]').forEach(function(b){ b.addEventListener('click',function(e){ e.stopPropagation(); var p=reais.filter(function(x){ return x.token===b.dataset.ent; })[0]; if(p) abrirPedido(p); }); });
    esq.appendChild(vendas);
    // atalhos
    rot(dir,'Atalhos',0,null,6);
    var at=document.createElement('div'); at.className='atalhos'; at.style.order=7;
    var IC_AT={cupom:'<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.4"/>',vendido:'<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',link:'<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',site:IC.site};
    [['cupom','Novo cupom',function(){ irPara('cupons'); espera('CaramujoVitrine',function(V){ if(V.novoCupom) V.novoCupom(); }); }],
     ['vendido','Marcar vendido',function(){ abrirBusca('vender'); }],
     ['link','Link de artista',function(){ abrirBusca('link'); }],
     ['site','Ver o site',function(){ window.open('/','_blank','noopener'); }]].forEach(function(a){
      var b=document.createElement('button'); b.type='button'; b.className='atl'; b.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+IC_AT[a[0]]+'</svg>'+a[1]; b.addEventListener('click',a[2]); at.appendChild(b);
    });
    dir.appendChild(at);
    return box;
  }
  // espera um módulo à parte (defer) chegar e chama a função com ele
  function espera(nome,fn,t){ t=t||0; if(window[nome]) return fn(window[nome]); if(t>60) return; setTimeout(function(){ espera(nome,fn,t+1); },50); }
  // Vendas > Pedidos: a lista com filtro, e cada pedido abre numa folha
  var filtroPed='fazer';
  function estadoPedido(p){
    var sv=p.servicos||[];
    if(p.status==='teste') return ['teste',''];
    if(p.status==='pendente') return ['PIX pendente',''];
    if(sv.some(function(s){ return s.envio&&!s.entrega; })) return ['Entregar','faz'];
    if(sv.some(function(s){ return !s.envio; })) return ['esperando o material',''];
    if(sv.length&&sv.every(function(s){ return s.entrega; })&&!p.beats.length) return ['entregue',''];
    return [p.baixou?'baixou '+p.baixou:'não baixou ainda',''];
  }
  function iniciais(q){ var s=String(q||'?').replace(/^@/,'').trim(); return (s.slice(0,2)||'?').toUpperCase(); }
  // 04/11/2026 (revisão do painel, item 8): valor e "ontem/há 3 dias" na linha, o estado com cor, o total
  // da semana no topo (desenhar); o pedido de teste foi pro ⋯ e "De onde vêm as vendas" foi pra Números
  function paginaPedidos(){
    var box=document.createElement('div');
    if(!entrega){ box.innerHTML='<div class="esq" aria-hidden="true"><i></i><i></i><i></i></div><span class="so-leitor">carregando…</span>'; return box; }
    var todos=entrega.pedidos||[];
    var fazer=todos.filter(function(p){ return estadoPedido(p)[1]==='faz'; });
    var testes=todos.filter(function(p){ return p.status==='teste'; });
    var reais=todos.filter(function(p){ return p.status!=='teste'; });
    if(!fazer.length&&filtroPed==='fazer') filtroPed='todos';
    var mostra=filtroPed==='fazer'?fazer:filtroPed==='testes'?testes:reais;
    var h='<div class="linha-f"><div class="seg" role="group" aria-label="Filtro dos pedidos">'+[['fazer','Pra fazer',fazer.length],['todos','Todos',reais.length],['testes','Testes',testes.length]].map(function(f){
      return '<button type="button" data-f="'+f[0]+'" aria-pressed="'+(filtroPed===f[0])+'">'+f[1]+(f[2]?' <i>'+f[2]+'</i>':'')+'</button>';
    }).join('')+'</div><button type="button" class="icb" id="pedMais" aria-label="Mais: pedido de teste">'+PONTOS+'</button></div>';
    h+=mostra.length?'<div class="cx">'+mostra.map(linhaPedido).join('')+'</div>':'<p class="nada">'+(filtroPed==='testes'?'Nenhum pedido de teste.':'Nenhum pedido com link ainda.')+'</p>';
    box.innerHTML=h;
    box.querySelectorAll('[data-f]').forEach(function(b){ b.addEventListener('click',function(){ filtroPed=b.dataset.f; desenhar(); }); });
    ligarPedidos(box,todos);
    box.querySelectorAll('[data-ent]').forEach(function(b){ b.addEventListener('click',function(e){ e.stopPropagation(); var p=todos.filter(function(x){ return x.token===b.dataset.ent; })[0]; if(p) abrirPedido(p); }); });
    box.querySelector('#pedMais').addEventListener('click',abrirTestePedido);
    return box;
  }
  var PONTOS='<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>';
  // o ⋯ dos Pedidos: os 2 pedidos de teste, com a explicação e a confirmação (nada é vendido)
  function abrirTestePedido(){
    var c=$('card');
    c.innerHTML=cabFolha('Pedido de teste','cria um pedido de mentira e abre a página que o comprador vê')+
      '<p>Nada é vendido e o beat segue na vitrine. O pedido aparece no filtro Testes.</p>'+
      '<div class="acoes" style="flex-wrap:wrap"><button type="button" class="pill solid" id="enTeste">Criar pedido de teste</button><button type="button" class="pill" id="enTesteSv">Criar pedido de teste de serviço</button></div><div id="enTesteLink" class="sub" style="margin-top:12px"></div>';
    $('veil').hidden=false; ligarFecha(c);
    var teste=function(id,op,rot,msg){ c.querySelector('#'+id).addEventListener('click',function(){
      var b=this; b.disabled=true; b.textContent='Criando…';
      acao(op,{}).then(function(j){
        b.disabled=false; b.textContent=rot;
        if(!j||!j.ok){ flash((j&&j.erro)||'Não criou. Tenta de novo.'); return; }
        entrega.pedidos=j.pedidos||entrega.pedidos; filtroPed='testes';
        var l=$('enTesteLink'); if(l) l.innerHTML=msg(j)+': <a href="'+esc(j.caminho)+'" target="_blank" rel="noopener">abrir a página do pedido</a>';
      });
    }); };
    teste('enTeste','pedido-teste','Criar pedido de teste',function(j){ return 'Pedido de teste com '+esc(j.beat); });
    teste('enTesteSv','pedido-teste-servico','Criar pedido de teste de serviço',function(){ return 'Pedido de teste com Mix + Master e Beat personalizado'; });
  }
  // o topo de toda folha (04/11/2026): título, uma linha de apoio e o ✕ (data-close, como o Fechar de antes)
  function cabFolha(t,sub){ return '<div class="f-cab"><span class="t"><h2>'+esc(t)+'</h2>'+(sub?'<p>'+sub+'</p>':'')+'</span><button type="button" class="f-x" data-close aria-label="Fechar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>'; }
  function ligarFecha(c){ c.querySelectorAll('[data-close]').forEach(function(b){ b.addEventListener('click',fechar); }); }
  // um pedido aberto: o que comprou, o material de cada serviço e a entrega por link (SERVIÇOS DOS PEDIDOS)
  function abrirPedido(p){
    var card=$('card'), ROT={ref:'referência',guia:'guia das vozes',link:'link',musica:'música',recado:'recado'};
    var pinta=function(){
      var h=cabFolha((p.quem||'Pedido')+(p.status==='teste'?' · teste':''),quandoRel(p.em)+(p.valor?' · '+reaisInt(p.valor):'')+' · '+esc(estadoPedido(p)[0]));
      if(p.beats.length) h+='<div class="bloco"><div class="rot">BEATS</div><p>'+esc(p.beats.join(', '))+' · '+(p.baixou?'baixou '+p.baixou+(p.baixou===1?' arquivo':' arquivos'):'ainda não baixou')+'</p></div>';
      (p.servicos||[]).forEach(function(sv){
        var e=sv.envio, en=sv.entrega;
        h+='<div class="bloco"><div class="rot">'+esc(sv.nome.toUpperCase())+' · '+(en?'ENTREGUE '+dm(en.em):e?'MATERIAL CHEGOU '+dm(e.em):'ESPERANDO O MATERIAL')+'</div>'+
          (e?Object.keys(ROT).filter(function(k){ return e[k]; }).map(function(k){ var v=String(e[k]); return '<p class="mat"><span>'+ROT[k]+':</span> '+(/^https?:/.test(v)?'<a href="'+esc(v)+'" target="_blank" rel="noopener">'+esc(v)+'</a>':esc(v))+'</p>'; }).join(''):'<p>Quem comprou ainda não mandou. A página do pedido pede o material.</p>')+
          '<div class="entrega"><input type="url" class="sv-link" data-k="'+sv.k+'" placeholder="Link do arquivo final (Drive, WeTransfer…)" value="'+(en?esc(en.link):'')+'">'+
          '<button type="button" class="pill solid sv-ent" data-k="'+sv.k+'">'+(en?'Trocar o link':'Entregar')+'</button></div>'+
          '<p class="sub" style="margin-top:6px">Quem comprou recebe um e-mail e o botão de baixar aparece no pedido.</p></div>';
      });
      h+='<div class="acoes"><a class="pill" href="/pedido/'+esc(p.token)+'" target="_blank" rel="noopener">Abrir a página</a></div>';
      card.innerHTML=h;
      ligarFecha(card);
      card.querySelectorAll('.sv-ent').forEach(function(b){ b.addEventListener('click',function(){
        var k=Number(b.dataset.k), inp=card.querySelector('.sv-link[data-k="'+k+'"]'), link=(inp&&inp.value||'').trim();
        if(!link){ flash('Cola o link do arquivo final primeiro.'); if(inp) inp.focus(); return; }
        b.disabled=true; b.textContent='Entregando…';
        acao('pedido-entregar',{token:p.token,k:k,link:link}).then(function(j){
          b.disabled=false;
          if(!j||!j.ok){ b.textContent='Entregar'; flash((j&&j.erro)||'Não salvou. Tenta de novo.'); return; }
          entrega.pedidos=j.pedidos||entrega.pedidos;
          p=(entrega.pedidos.filter(function(x){ return x.token===p.token; })[0])||p; pinta(); pintarNav();
          flash(j.avisou?'Entregue. Quem comprou recebeu o e-mail.':'Entregue. O botão já aparece na página do pedido.');
        });
      }); });
    };
    $('veil').hidden=false; pinta();
  }
  // Vendas > Lista: o que era a folha "Lista de e-mails", agora na página
  function paginaLista(){
    var box=document.createElement('div'), l=lista;
    if(!l){ box.innerHTML='<div class="vazio">carregando…</div>'; return box; }
    box.innerHTML='<details class="como"><summary>Como funciona</summary><p class="sub">Quem se cadastrou no "Fique por dentro" da vitrine e das tapes. Cada pessoa ganha um cupom só dela: 15% nos beats do catálogo, uso único, 15 dias. Os cupons da lista não aparecem em Cupons.</p></details>'+
      '<div class="bloco"><div class="rot">NA LISTA</div><p>'+textoLista()+(l.sairam?' · '+l.sairam+(l.sairam===1?' saiu':' saíram'):'')+'</p>'+
      (l.emails&&l.emails.length?'<div class="acoes" style="margin-top:12px"><button type="button" class="pill solid" id="liCopia">Copiar os e-mails</button></div>':'')+'</div>'+
      '<div class="bloco"><div class="rot">ÚLTIMOS CADASTROS</div>'+((l.ultimos||[]).length?l.ultimos.map(function(u){
        return '<div class="ev"><span>'+dm(u.em)+'</span><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(u.email)+(u.usou?' · usou o cupom':'')+'</span></div>';
      }).join(''):'<p>Ninguém ainda.</p>')+'</div>'+
      '<div class="bloco"><div class="rot">E-MAILS DO CUPOM</div>'+((l.envios||[]).length?l.envios.map(function(u){
        var d=new Date(u.em), hh=isNaN(d)?'':' '+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);
        return '<div class="ev"><span>'+dm(u.em)+hh+'</span><span style="min-width:0">'+esc(u.email)+' · '+situEnvio(u)+'</span></div>';
      }).join(''):'<p>Nenhum envio registrado ainda (o registro começou em 12/10).</p>')+'</div>';
    var cp=box.querySelector('#liCopia');
    if(cp) cp.addEventListener('click',function(){
      var txt=(l.emails||[]).join(', ');
      (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(function(){ flash(l.emails.length+' e-mails copiados.'); }).catch(function(){ prompt('Copie os e-mails:',txt); });
    });
    return box;
  }
  // Perfil: tudo que mexe no /rideblan33
  function paginaPerfil(){
    var box=document.createElement('div'); box.className='hoje'; box.style.paddingTop='14px';
    var lm=linhaAcao('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>','Músicas',textoMusicas()+' · destaques e recentes',function(){ irPara('musicas'); }); lm.id='musPerfil'; box.appendChild(lm);
    box.appendChild(linhaAcao('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.2c3 .3 5.5 2.7 5.5 5.8"/></svg>','Quem já gravou','os artistas das suas músicas no Spotify · página /rideblan33/artistas',function(){ irPara('gravou'); }));
    var noP=noPerfil().length;
    box.appendChild(linhaAcao(svg('catalogo'),'Ordem das beat tapes',noP+(noP===1?' tape no perfil':' tapes no perfil')+' · arrastar pra ordenar',abrirPerfil));
    var ln=linhaAcao('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"/></svg>','Números do site',numerosSite?esc(textoNumeros(numerosSite,'curto')):'artistas, faixas e streams',abrirNumeros); ln.id='numSite'; box.appendChild(ln);
    box.appendChild(linhaAcao('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>','Ver o perfil','abre /rideblan33 com a prévia do que está desligado',function(){ window.open('/rideblan33?de=painel','_blank','noopener'); }));
    return box;
  }
  // Ajustes: as chaves do site e o consumo do plano grátis
  function paginaAjustes(){
    var box=document.createElement('div');
    var lig=!!(entrega&&entrega.ligada), mus=musicasResumo;
    var c=consumoHoje, pct=c?Math.min(100,Math.round(c.hoje/c.teto*100)):0;
    box.innerHTML='<div class="rot" style="margin-top:22px">CHAVES</div>'+
      '<div class="sw"><div><b>Entrega na hora</b><small>'+(lig?'Ligada: beat sai no link na hora; serviço ganha a página pra mandar o material.':'Desligada: o checkout fica como era, sem link.')+'</small></div>'+
        '<button type="button" class="toggle" id="ajEntrega" aria-pressed="'+lig+'" aria-label="Entrega na hora"'+(entrega?'':' disabled')+'><i></i></button></div>'+
      '<div class="sw"><div><b>Músicas no perfil</b><small>'+(mus?(mus.noAr?'No ar: a aba Músicas aparece pra todo mundo.':'Fora do ar: a prévia aparece só pra quem entra no painel.'):'carregando…')+'</small></div>'+
        '<button type="button" class="toggle" id="ajMusicas" aria-pressed="'+!!(mus&&mus.noAr)+'" aria-label="Músicas no perfil"'+(mus?'':' disabled')+'><i></i></button></div>'+
      '<div class="sw" id="ajResumoL"><div><b>E-mail do mês</b><small>'+textoResumo()+'</small>'+
        '<button type="button" class="btn" id="ajResumoAgora" style="margin-top:10px;height:32px"'+(resumoMes?'':' disabled')+'>Mandar um agora</button></div>'+
        '<button type="button" class="toggle" id="ajResumo" aria-pressed="'+!!(resumoMes&&resumoMes.ligado)+'" aria-label="E-mail do mês"'+(resumoMes?'':' disabled')+'><i></i></button></div>'+
      '<div class="rot" style="margin-top:26px">CONSUMO HOJE</div>'+
      '<button type="button" class="sw sw-b" id="ajBanco"><div style="flex:1"><b>Banco</b><small>'+(c?milhar(c.hoje)+' de '+milhar(c.teto)+' leituras · zera às 21h':'carregando…')+'</small><div class="barra-c"><i style="width:'+pct+'%"></i></div></div><span class="seta" aria-hidden="true">›</span></button>'+
      '<div class="sw"><div style="flex:1"><b>Prateleira de arquivos</b><small>'+(prateleira!=null?gb(prateleira)+' de 8 GB':'carregando…')+'</small><div class="barra-c"><i style="width:'+(prateleira!=null?Math.min(100,Math.round(prateleira/(8*1073741824)*100)):0)+'%"></i></div></div></div>';
    var be=box.querySelector('#ajEntrega');
    be.addEventListener('click',function(){
      var quer=be.getAttribute('aria-pressed')!=='true'; be.disabled=true;
      acao('entrega',{ligada:quer}).then(function(j){
        be.disabled=false;
        if(!j||!j.ok){ flash((j&&j.erro)||'Não salvou. Tenta de novo.'); return; }
        entrega=j; desenhar(); flash(quer?'Entrega na hora ligada.':'Entrega na hora desligada.');
      });
    });
    var bm=box.querySelector('#ajMusicas');
    bm.addEventListener('click',function(){
      var quer=bm.getAttribute('aria-pressed')!=='true'; bm.disabled=true;
      acao('musicas-no-ar',{noAr:quer}).then(function(j){
        bm.disabled=false;
        if(!j||j.erro){ flash((j&&j.erro)||'Não salvou. Tenta de novo.'); return; }
        musicasResumo={n:musicasResumo?musicasResumo.n:0,noAr:quer}; desenhar(); flash(quer?'Músicas no ar.':'Músicas fora do ar (só a prévia).');
      });
    });
    var br=box.querySelector('#ajResumo');
    br.addEventListener('click',function(){
      var quer=br.getAttribute('aria-pressed')!=='true'; br.disabled=true;
      acao('resumo-ligar',{ligado:quer}).then(function(j){
        br.disabled=false;
        if(!j||!j.ok){ flash((j&&j.erro)||'Não salvou. Tenta de novo.'); return; }
        resumoMes=j; desenhar(); flash(quer?'E-mail do mês ligado.':'E-mail do mês desligado.');
      });
    });
    var ba=box.querySelector('#ajResumoAgora');
    ba.addEventListener('click',function(){
      ba.disabled=true; ba.textContent='Mandando…';
      acao('resumo-agora',{}).then(function(j){
        ba.disabled=false; ba.textContent='Mandar um agora';
        if(!j||!j.ok){ flash((j&&j.erro)||'Não saiu. Tenta de novo.'); return; }
        flash('Mandei pra '+j.para+'. Assunto: '+j.assunto);
      });
    });
    box.querySelector('#ajBanco').addEventListener('click',abrirConsumo);
    return box;
  }
  // o texto do e-mail do mês em Ajustes: pra onde vai, quando sai e o último
  function textoResumo(){
    var r=resumoMes;
    if(!r) return 'carregando…';
    var MES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    var u=r.ultimo, ult='';
    if(u&&u.mes) ult=' · '+(u.ok?'o de '+MES[Number(u.mes.slice(5,7))-1]+' saiu '+dm(u.em):'o de '+MES[Number(u.mes.slice(5,7))-1]+' falhou ('+esc(u.erro||'Resend')+'), tento de novo');
    return (r.ligado?'Todo dia 1º às 9h, o resumo do mês que fechou em '+esc(r.para):'Desligado: o resumo do mês não sai.')+ult;
  }
  function pedirResumo(){
    if(resumoPedido) return; resumoPedido=true;
    fetch('/api/painel?op=resumo').then(function(r){return r.json()}).then(function(j){
      if(!j||!j.ok) return; resumoMes=j; refazer(['ajustes']);
    }).catch(function(){});
  }

  function textoEntrega(){
    if(!entrega) return 'o beat sai num link na hora em que o pagamento cai';
    var n=(entrega.pedidos||[]).filter(function(p){ return p.status!=='teste'; }).length;
    var fila=servicosAbertos().filter(function(x){ return x.s.envio; }).length;
    return (entrega.ligada?'ligada':'<em>desligada</em> · faça um pedido de teste e ligue')+(entrega.ligada&&n?' · '+n+(n===1?' pedido com link':' pedidos com link'):'')+(fila?' · <em>'+fila+(fila===1?' serviço esperando a entrega':' serviços esperando a entrega')+'</em>':'');
  }
  function pedirEntrega(){
    if(entregaPedida) return; entregaPedida=true;
    fetch('/api/painel?op=entrega').then(function(r){return r.json()}).then(function(j){
      if(!j||!j.ok||!Array.isArray(j.pedidos)) return; entrega=j;
      pintarNav(); refazer();
    }).catch(function(){});
  }
  function listaPedidos(){
    var l=(entrega&&entrega.pedidos)||[];
    if(!l.length) return '<p style="margin-top:6px">Nenhum pedido com link ainda.</p>';
    return '<div style="margin-top:6px">'+l.slice(0,12).map(function(p){
      var d=new Date(p.em), dd=isNaN(d)?'':('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2);
      return '<div class="ev"><span>'+dd+(p.status==='teste'?' · teste':p.status==='pendente'?' · PIX':'')+'</span><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+
        esc((p.quem?p.quem+' · ':'')+p.beats.concat((p.servicos||[]).map(function(x){return x.nome})).join(', '))+' · '+(p.baixou?'baixou '+p.baixou+(p.baixou===1?' arquivo':' arquivos'):'ainda não baixou')+
        ' · <a href="/pedido/'+esc(p.token)+'" target="_blank" rel="noopener">abrir</a></span></div>';
    }).join('')+'</div>';
  }
  // serviços dos pedidos (12/10/2026): quem comprou manda o material pela página do pedido; você
  // entrega colando o link aqui (quem comprou recebe um e-mail e o botão aparece na página)
  function servicosAbertos(){
    var out=[];
    ((entrega&&entrega.pedidos)||[]).forEach(function(p){ (p.servicos||[]).forEach(function(sv){ if(!sv.entrega) out.push({p:p,s:sv}); }); });
    return out;
  }
  // 24/10/2026: o que o Resend diz depois de aceitar (conferido ao abrir a Lista)
  function situEnvio(u){
    if(!u.ok) return '<em>não saiu</em> ('+esc(u.erro||'erro')+')';
    var m={delivered:'entregue',opened:'entregue · abriu',clicked:'entregue · clicou',bounced:'<em>voltou</em> (o endereço recusou)',complained:'<em>marcado como spam</em>',delivery_delayed:'<em>atrasado</em> (o e-mail dela ainda não aceitou)',sent:'saiu · esperando a entrega'};
    return u.status?(m[u.status]||esc(u.status)):(u.id?'saiu · conferindo':'saiu (sem rastreio)');
  }
  function dm(iso){ var d=new Date(iso); return isNaN(d)?'':('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2); }
  function listaServicos(){
    var todos=[];
    ((entrega&&entrega.pedidos)||[]).forEach(function(p){ (p.servicos||[]).forEach(function(sv){ todos.push({p:p,s:sv}); }); });
    if(!todos.length) return '<p style="margin-top:6px">Nenhum pedido de serviço ainda.</p>';
    var ROT={ref:'referência',guia:'guia das vozes',link:'link',musica:'música',recado:'recado'};
    return todos.slice(0,12).map(function(x,i){
      var p=x.p, sv=x.s, e=sv.envio, en=sv.entrega;
      var estado=en?'entregue '+dm(en.em):e?'material chegou '+dm(e.em):'esperando o material';
      var mat=e?Object.keys(ROT).filter(function(k){ return e[k]; }).map(function(k){
        var v=String(e[k]); return '<div style="margin-top:4px;font-size:13px;overflow-wrap:anywhere"><span style="opacity:.6">'+ROT[k]+':</span> '+(/^https?:/.test(v)?'<a href="'+esc(v)+'" target="_blank" rel="noopener">'+esc(v)+'</a>':esc(v))+'</div>';
      }).join(''):'';
      return '<div class="bloco" style="margin-top:10px;padding:12px 14px">'+
        '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><b>'+esc(sv.nome)+'</b><span style="font-size:13px;opacity:.75">'+esc((p.quem||'')+(p.status==='teste'?' · teste':''))+' · '+estado+'</span></div>'+mat+
        '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><input type="url" class="sv-link" data-i="'+i+'" placeholder="Link da entrega (Drive, WeTransfer…)" value="'+(en?esc(en.link):'')+'" style="flex:1 1 220px;min-width:0;padding:10px 12px;border:1px solid #333;border-radius:10px;background:transparent;color:inherit;font:inherit;font-size:14px">'+
        '<button type="button" class="pill solid sv-ent" data-i="'+i+'">'+(en?'Trocar o link':'Entregar')+'</button>'+
        '<a class="pill" href="/pedido/'+esc(p.token)+'#sv'+sv.k+'" target="_blank" rel="noopener">Abrir o pedido</a></div></div>';
    }).join('');
  }
  function abrirEntrega(){
    var card=$('card');
    var pinta=function(){
      var lig=!!(entrega&&entrega.ligada);
      card.innerHTML='<h2>Entrega na hora</h2><p>Pagou, o beat sai num link com o WAV, o MP3 e o contrato: o botão aparece no PEDIDO CONFIRMADO e o link vai no e-mail do comprador. Nos serviços, quem comprou manda o material pela página do pedido e você entrega por aqui.</p>'+
        '<div class="sw"><div><b>Entrega na hora dos beats</b><small>'+(lig?'Ligada: venda com beat já sai com o link.':'Desligada: o checkout fica como era.')+'</small></div>'+
          '<button type="button" class="toggle" id="enLiga" aria-pressed="'+lig+'" aria-label="Entrega na hora dos beats"><i></i></button></div>'+
        '<div class="bloco"><div class="rot">TESTAR ANTES</div><p>Cria um pedido de mentira com o primeiro beat à venda e abre a página que o comprador vê. Nada é vendido e o beat segue na vitrine.</p>'+
          '<div class="acoes" style="margin-top:12px"><button type="button" class="pill solid" id="enTeste">Criar pedido de teste</button></div><div id="enTesteLink" style="margin-top:10px;font-size:13.5px"></div></div>'+
        '<div class="bloco"><div class="rot">SERVIÇOS DOS PEDIDOS</div><p>Quem comprou mix, master ou beat personalizado manda o material pela página do pedido (chega um e-mail pra você). Terminou, cola o link do arquivo final e toca em Entregar: quem comprou recebe um e-mail e o botão de baixar aparece no pedido.</p>'+
          '<div id="svLista">'+listaServicos()+'</div>'+
          '<div class="acoes" style="margin-top:12px"><button type="button" class="pill" id="enTesteSv">Criar pedido de teste de serviço</button></div><div id="enTesteSvLink" style="margin-top:10px;font-size:13.5px"></div></div>'+
        '<div class="bloco"><div class="rot">ÚLTIMOS PEDIDOS COM LINK</div>'+listaPedidos()+'</div>'+
        '<div class="acoes"><button type="button" class="pill" data-close>Fechar</button></div>';
      card.querySelector('[data-close]').addEventListener('click',fechar);
      $('enLiga').addEventListener('click',function(){
        var b=this, quer=b.getAttribute('aria-pressed')!=='true'; b.disabled=true;
        acao('entrega',{ligada:quer}).then(function(j){
          b.disabled=false;
          if(!j||!j.ok){ flash((j&&j.erro)||'Não salvou. Tenta de novo.'); return; }
          entrega=j; pinta(); flash(quer?'Entrega na hora ligada.':'Entrega na hora desligada.');
        });
      });
      card.querySelectorAll('.sv-ent').forEach(function(b){ b.addEventListener('click',function(){
        var todos=[]; ((entrega&&entrega.pedidos)||[]).forEach(function(p){ (p.servicos||[]).forEach(function(sv){ todos.push({p:p,s:sv}); }); });
        var x=todos[Number(b.getAttribute('data-i'))]; if(!x) return;
        var inp=card.querySelector('.sv-link[data-i="'+b.getAttribute('data-i')+'"]'), link=(inp&&inp.value||'').trim();
        if(!link){ flash('Cola o link do arquivo final primeiro.'); if(inp) inp.focus(); return; }
        b.disabled=true; b.textContent='Entregando…';
        acao('pedido-entregar',{token:x.p.token,k:x.s.k,link:link}).then(function(j){
          b.disabled=false;
          if(!j||!j.ok){ b.textContent='Entregar'; flash((j&&j.erro)||'Não salvou. Tenta de novo.'); return; }
          entrega.pedidos=j.pedidos||entrega.pedidos; pinta();
          flash(j.avisou?'Entregue. Quem comprou recebeu o e-mail.':'Entregue. O botão já aparece na página do pedido.');
        });
      }); });
      $('enTesteSv').addEventListener('click',function(){
        var b=this; b.disabled=true; b.textContent='Criando…';
        acao('pedido-teste-servico',{}).then(function(j){
          b.disabled=false; b.textContent='Criar pedido de teste de serviço';
          if(!j||!j.ok){ flash((j&&j.erro)||'Não criou. Tenta de novo.'); return; }
          entrega.pedidos=j.pedidos||entrega.pedidos; pinta();
          var l=$('enTesteSvLink'); if(l) l.innerHTML='Pedido de teste com Mix + Master e Beat personalizado: <a href="'+esc(j.caminho)+'" target="_blank" rel="noopener">abrir a página do pedido</a>';
        });
      });
      $('enTeste').addEventListener('click',function(){
        var b=this; b.disabled=true; b.textContent='Criando…';
        acao('pedido-teste',{}).then(function(j){
          b.disabled=false; b.textContent='Criar pedido de teste';
          if(!j||!j.ok){ flash((j&&j.erro)||'Não criou. Tenta de novo.'); return; }
          entrega.pedidos=j.pedidos||entrega.pedidos;
          var l=$('enTesteLink'); l.innerHTML='Pedido de teste com '+esc(j.beat)+': <a href="'+esc(j.caminho)+'" target="_blank" rel="noopener">abrir a página do pedido</a>';
        });
      });
    };
    $('veil').hidden=false;
    if(entrega) pinta(); else { card.innerHTML='<h2>Entrega na hora</h2><p>carregando…</p>'; }
    fetch('/api/painel?op=entrega').then(function(r){return r.json()}).then(function(j){ if(j&&j.ok){ entrega=j; if(!$('veil').hidden) pinta(); } }).catch(function(){});
  }
  var lista=null, listaPedida=false;
  function textoLista(){
    if(!lista) return 'quem se cadastrou pra receber o cupom de 15%';
    if(!lista.total) return 'ninguém ainda';
    var falhou=(lista.envios||[])[0]&&!lista.envios[0].ok;
    return lista.total+(lista.total===1?' pessoa':' pessoas')+' · '+lista.usaram+(lista.usaram===1?' usou o cupom':' usaram o cupom')+(falhou?' · <em>o último e-mail não saiu</em>':'');
  }
  function pedirLista(){
    if(listaPedida) return; listaPedida=true;
    fetch('/api/painel?op=lista').then(function(r){return r.json()}).then(function(j){
      if(!j||!j.ok) return; lista=j;
      refazer(['hoje','lista']);
    }).catch(function(){});
  }
  function abrirLista(){
    var card=$('card');
    var pinta=function(){
      var l=lista||{total:0,ultimos:[],emails:[]};
      card.innerHTML='<h2>Lista de e-mails</h2><p>Quem se cadastrou no "Fique por dentro" da vitrine. Cada pessoa ganha um cupom só dela: 15% nos beats do catálogo, uso único, 15 dias. Os cupons da lista não aparecem na tela de Cupons.</p>'+
        '<div class="bloco"><div class="rot">NA LISTA</div><p>'+esc(textoLista())+(l.sairam?' · '+l.sairam+(l.sairam===1?' saiu':' saíram'):'')+'</p>'+
        (l.emails&&l.emails.length?'<div class="acoes" style="margin-top:12px"><button type="button" class="pill solid" id="liCopia">Copiar os e-mails</button></div>':'')+'</div>'+
        '<div class="bloco"><div class="rot">ÚLTIMOS CADASTROS</div>'+((l.ultimos||[]).length?'<div style="margin-top:6px">'+l.ultimos.map(function(u){
          var d=new Date(u.em), dd=isNaN(d)?'':('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2);
          return '<div class="ev"><span>'+dd+'</span><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(u.email)+(u.usou?' · usou o cupom':'')+'</span></div>';
        }).join('')+'</div>':'<p style="margin-top:6px">Ninguém ainda.</p>')+'</div>'+
        '<div class="bloco"><div class="rot">E-MAILS DO CUPOM</div>'+((l.envios||[]).length?'<div style="margin-top:6px">'+l.envios.map(function(u){
          var d=new Date(u.em), dd=isNaN(d)?'':('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2)+' '+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);
          return '<div class="ev"><span>'+dd+'</span><span style="min-width:0">'+esc(u.email)+' · '+situEnvio(u)+'</span></div>';
        }).join('')+'</div>':'<p style="margin-top:6px">Nenhum envio registrado ainda (o registro começou em 12/10).</p>')+'</div>'+
        '<div class="acoes"><button type="button" class="pill" data-close>Fechar</button></div>';
      card.querySelector('[data-close]').addEventListener('click',fechar);
      var cp=$('liCopia');
      if(cp) cp.addEventListener('click',function(){
        var txt=(l.emails||[]).join(', ');
        (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(function(){ flash(l.emails.length+' e-mails copiados.'); }).catch(function(){ prompt('Copie os e-mails:',txt); });
      });
    };
    $('veil').hidden=false; pinta();
    fetch('/api/painel?op=lista').then(function(r){return r.json()}).then(function(j){ if(j&&j.ok){ lista=j; if(!$('veil').hidden) pinta(); } }).catch(function(){});
  }
  function textoMusicas(){
    var r=musicasResumo;
    if(!r) return 'destaques, recentes e o trecho de cada uma';
    return r.n+(r.n===1?' música':' músicas')+' · '+(r.noAr?'no ar':'<em>fora do ar (prévia)</em>');
  }
  function pedirMusicas(){
    if(musicasPedido) return; musicasPedido=true;
    fetch('/api/painel?op=musicas').then(function(r){return r.json()}).then(function(j){
      if(!j||!j.ok) return;
      musicasResumo={ n:j.destaques.length+j.recentes.length, noAr:!!j.noAr };
      refazer(['perfil','ajustes']);
    }).catch(function(){});
  }
  function milharPonto(n){ return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,'.'); }
  function streamsCurto(n){ return n>=1e6?(Math.floor(n/1e5)/10).toString().replace('.',',')+' mi':n>=1e3?Math.floor(n/1e3)+' mil':String(n); }
  function textoNumeros(n,modo){
    return modo==='curto' ? n.artistas+'+ artistas · '+n.faixas+'+ faixas · '+streamsCurto(n.streams)+' de streams'
      : milharPonto(n.artistas)+'+ artistas · '+milharPonto(n.faixas)+'+ faixas lançadas · '+milharPonto(n.streams)+'+ streams';
  }
  function pedirNumeros(){
    if(numerosPedido) return; numerosPedido=true;
    fetch('/api/painel?op=numeros').then(function(r){return r.json()}).then(function(j){
      if(j&&j.numeros){ numerosSite=j.numeros; refazer(['perfil']); }
    }).catch(function(){});
  }
  function abrirNumeros(){
    var n=numerosSite||{artistas:40,faixas:200,streams:2500000};
    var card=$('card');
    card.innerHTML='<h2>Números do site</h2><p>Aparecem no topo da vitrine, no topo do perfil e na prévia do perfil quando o link é compartilhado. Sempre com o "+" na frente.</p>'+
      '<div class="bloco"><div class="nums">'+
        '<label for="nArt">Artistas<input id="nArt" inputmode="numeric" autocomplete="off" value="'+n.artistas+'"></label>'+
        '<label for="nFx">Faixas lançadas<input id="nFx" inputmode="numeric" autocomplete="off" value="'+n.faixas+'"></label>'+
        '<label for="nSt">Streams<input id="nSt" inputmode="numeric" autocomplete="off" value="'+milharPonto(n.streams)+'"></label>'+
      '</div><div class="nums-prev" id="nPrev"></div></div>'+
      '<div class="acoes"><button class="pill" data-close type="button">Cancelar</button><button class="pill solid" id="nSalvar" type="button">Salvar</button></div>';
    $('veil').hidden=false;
    var ler=function(){ var v={}, ok=true; [['artistas','nArt'],['faixas','nFx'],['streams','nSt']].forEach(function(p){ var x=Number(String($(p[1]).value).replace(/\D/g,'')); if(!(x>0)) ok=false; v[p[0]]=x; }); return ok?v:null; };
    var prev=function(){ var v=ler(); $('nPrev').innerHTML=v?'Vitrine: <b>'+esc(textoNumeros(v,'cheio'))+'</b><br>Perfil: <b>'+esc(textoNumeros(v,'curto'))+'</b>':'Só algarismos, maior que zero.'; $('nSalvar').disabled=!v; };
    ['nArt','nFx','nSt'].forEach(function(i){ $(i).addEventListener('input',prev); });
    $('nSt').addEventListener('blur',function(){ var x=Number(String(this.value).replace(/\D/g,'')); if(x>0) this.value=milharPonto(x); });
    prev();
    card.querySelector('[data-close]').addEventListener('click',fechar);
    $('nSalvar').addEventListener('click',function(){
      var v=ler(); if(!v) return;
      var b=this; b.disabled=true; b.textContent='Salvando…';
      fetch('/api/painel?op=numeros',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(v)})
        .then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j}})}).then(function(x){
          if(!x.ok){ flash((x.j&&x.j.erro)||'Não salvou. Tenta de novo.'); b.disabled=false; b.textContent='Salvar'; return; }
          numerosSite=x.j.numeros; fechar(); flash('Números salvos. O site mostra em até 1 minuto.');
        }).catch(function(){ flash('Não salvou. Tenta de novo.'); b.disabled=false; b.textContent='Salvar'; });
    });
  }
  // o selo do topo: numa subpágina volta pra home do painel; na home, leva pro site
  document.querySelector('.topo .marca').addEventListener('click',function(e){
    if(vista!=='hoje'){ e.preventDefault(); irPara('hoje'); }
  });
  $('engBtn').addEventListener('click',function(){ irPara('ajustes'); });

  function desenhar(){
    $('titulo').textContent=TITULOS[vista];
    document.querySelector('.topo .marca').setAttribute('aria-label', vista==='hoje' ? 'Voltar pro site' : 'Voltar pro Hoje');
    if(vista==='ajustes') $('engBtn').setAttribute('aria-current','page'); else $('engBtn').removeAttribute('aria-current');
    var vit=!!VITRINE_ABA[vista];
    $('barra').hidden = !(vista==='artistas'||vista==='tapes');
    $('resumo').hidden = vista==='analytics';
    var vcons=$('consumo'); if(vcons&&vista!=='hoje') vcons.remove();   // o contador de consumo é só do Hoje
    $('lista').hidden = vista==='analytics'||vit||vista==='musicas'||vista==='gravou';
    $('analytics').hidden = vista!=='analytics';
    $('vitrine').hidden = !vit;
    $('musicas').hidden = vista!=='musicas';
    $('gravou').hidden = vista!=='gravou';
    pintarNav(); pintarSecoes();
    if(vista==='hoje'){
      pedirSemana(); pedirConsumo(); pedirMusicas(); pedirEntrega(); pedirLista(); pedirFila();
      $('resumo').textContent=hojeData(); pintarConsumo();
      $('lista').innerHTML=''; $('lista').appendChild(hoje()); return;
    }
    // 04/11/2026: Vendas abre com o total da semana (o mesmo do Hoje)
    if(vista==='pedidos'){ pedirEntrega(); pedirSemana(); $('resumo').textContent=textoSemana()||'pedidos com link, cupons e a lista de e-mails'; $('lista').innerHTML=''; $('lista').appendChild(paginaPedidos()); return; }
    if(vista==='lista'){ pedirLista(); pedirSemana(); $('resumo').textContent=textoSemana()||'pedidos com link, cupons e a lista de e-mails'; $('lista').innerHTML=''; $('lista').appendChild(paginaLista()); return; }
    if(vista==='perfil'){ pedirMusicas(); pedirNumeros(); $('resumo').textContent='o que aparece em /rideblan33'; $('lista').innerHTML=''; $('lista').appendChild(paginaPerfil()); return; }
    if(vista==='ajustes'){ pedirEntrega(); pedirMusicas(); pedirConsumo(); pedirResumo(); $('resumo').textContent='chaves do site, o e-mail do mês e o consumo do plano grátis'; $('lista').innerHTML=''; $('lista').appendChild(paginaAjustes()); return; }
    if(vista==='musicas'){
      // monta uma vez só; depois só redesenha (a lista de artistas recarrega sozinha)
      if(!$('musicas').dataset.montado && window.CaramujoMusicas){
        $('musicas').dataset.montado='1';
        window.CaramujoMusicas.abrir($('musicas'));
      } else if(window.CaramujoMusicas) window.CaramujoMusicas.pintar();
      if(!window.CaramujoMusicas) $('musicas').innerHTML='<div class="vazio">carregando…</div>';
      return;
    }
    if(vista==='gravou'){
      if(!$('gravou').dataset.montado && window.CaramujoGravou){
        $('gravou').dataset.montado='1';
        window.CaramujoGravou.abrir($('gravou'));
      } else if(window.CaramujoGravou) window.CaramujoGravou.carregar();
      if(!window.CaramujoGravou) $('gravou').innerHTML='<div class="vazio">carregando…</div>';
      return;
    }
    if(vit){
      // monta uma vez só (igual ao analytics): a lista de artistas recarrega sozinha
      // durante conversão e não pode apagar o que você está digitando aqui
      if(!$('vitrine').dataset.montado && window.CaramujoVitrine){
        $('vitrine').dataset.montado='1';
        window.CaramujoVitrine.abrir($('vitrine'),{semAbas:true,aba:VITRINE_ABA[vista]});
      } else if(window.CaramujoVitrine) window.CaramujoVitrine.aba(VITRINE_ABA[vista]);
      if(!window.CaramujoVitrine) $('vitrine').innerHTML='<div class="vazio">carregando…</div>';
      return;
    }
    if(vista==='analytics'){
      // monta uma vez só: a lista recarrega sozinha durante conversão e não pode
      // derrubar o período nem a aba que você escolheu
      if(!$('analytics').dataset.montado && window.CaramujoAnalytics){
        $('analytics').dataset.montado='1';
        window.CaramujoAnalytics.abrir($('analytics'),function(){ irPara('hoje'); });
      }
      if(!window.CaramujoAnalytics) $('analytics').innerHTML='<div class="vazio">carregando…</div>';
      return;
    }
    if(prateleira!=null) pintarResumo(prateleira);   // a vitrine escreve o resumo dela; aqui volta o das pastas
    var fonte = vista==='tapes' ? tapes : artistas;
    var alvo=fonte.filter(function(a){
      return !filtro || a.name.toLowerCase().indexOf(filtro)>-1;
    });
    alvo.sort(function(a,b){
      if(ordem==='modificado'){
        // faixa mais nova do Drive primeiro; catálogo sem faixa nenhuma vai pro fim
        if(!a.modificado && !b.modificado) return a.name.localeCompare(b.name,'pt-BR',{sensitivity:'base'});
        if(!a.modificado) return 1;
        if(!b.modificado) return -1;
        return a.modificado < b.modificado ? 1 : -1;
      }
      if(ordem==='az') return a.name.localeCompare(b.name,'pt-BR',{sensitivity:'base'});
      if(ordem==='faixas') return ((b.nb||0)+(b.ns||0)) - ((a.nb||0)+(a.ns||0));
      if(ordem==='perfil'){
        // fora do perfil (escondida ou ainda sem beat pronto) vai pro fim, em ordem alfabética
        var fa=a.perfil===0||!(a.nb>0), fb=b.perfil===0||!(b.nb>0);
        if(fa!==fb) return fa ? 1 : -1;
        if(fa) return a.name.localeCompare(b.name,'pt-BR',{sensitivity:'base'});
        return chavePerfil(a)-chavePerfil(b) || a.id-b.id;
      }
      // atividade: quem abriu mais recente primeiro, quem nunca abriu por último
      if(!a.visto && !b.visto) return a.name.localeCompare(b.name,'pt-BR',{sensitivity:'base'});
      if(!a.visto) return 1;
      if(!b.visto) return -1;
      return a.visto < b.visto ? 1 : -1;
    });
    $('lista').innerHTML='';

    if(vista==='tapes') cartaoRevisar();
    if(vista==='tapes') linhaPerfil();   // fixa: primeira linha sempre, com busca ou ordem que for

    if(!alvo.length){
      var v=document.createElement('div'); v.className='vazio';
      if(vista!=='tapes') v.textContent='Nenhum artista com esse nome.';
      else if(filtro) v.textContent='Nenhuma tape com esse nome.';
      else v.innerHTML='Nenhuma beat tape convertida ainda.<br>'+
        '<small>Roda <b>Catálogo — carga geral</b> no GitHub Actions. '+
        'Cada pasta em <b>@rideblan33 / Beat tapes</b> vira um catálogo, e os beats que o '+
        'cruzamento não resolver aparecem aqui pra você marcar na mão.</small>';
      $('lista').appendChild(v);
      return;
    }
    alvo.forEach(function(a){
      var row=document.createElement('div');
      row.className='item';
      var b=document.createElement('button');
      b.type='button';b.className='linha';
      b.innerHTML=capaLista(a)+'<span style="flex:1;min-width:0"><span class="nome">'+esc(a.name)+'</span>'+
        (rodando(a) ? barra(a) : '<span class="meta">'+conta(a)+' · '+tempo(a.visto)+(a.tipo==='tape'&&a.perfil===0?' · fora do perfil':'')+'</span>')+'</span>';
      b.addEventListener('click',function(){abrir(a)});
      var c=document.createElement('button');
      c.type='button';c.className='copiar';c.setAttribute('aria-label','Copiar link de '+a.name);
      c.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b7b7b7" stroke-width="1.7"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a1 1 0 011-1h9"/></svg>';
      c.addEventListener('click',function(e){e.stopPropagation();copiar(a)});
      row.appendChild(b);row.appendChild(c);
      $('lista').appendChild(row);
    });
  }
  function pintarResumo(usado){
    prateleira=usado;
    if(vista!=='tapes'&&vista!=='artistas') return;            // 12/10/2026: o resumo das pastas só nas listas (o resto tem o seu)
    var r=$('resumo');
    r.textContent = artistas.length+(artistas.length===1?' artista no ar':' artistas no ar')+
      (tapes.length?' · '+tapes.length+(tapes.length===1?' beat tape':' beat tapes'):'')+
      ' · prateleira '+gb(usado)+' de 8 GB';
    if(revisarErro){
      var e=document.createElement('button');
      e.type='button'; e.className='aviso';
      e.textContent='não consegui conferir os pendentes';
      e.addEventListener('click',function(){carregar(true)});
      r.appendChild(document.createTextNode(' · '));
      r.appendChild(e);
      return;
    }
    if(!revisar.length) return;
    var a=document.createElement('button');
    a.type='button'; a.className='aviso';
    a.textContent=revisar.length+(revisar.length===1?' beat pra revisar':' beats pra revisar');
    a.addEventListener('click',function(){
      irPara('tapes');
      var b=document.querySelector('.revisar'); if(b) b.scrollIntoView({block:'center'});
    });
    r.appendChild(document.createTextNode(' · '));
    r.appendChild(a);
  }

  /* ---------- funil de venda do site ---------- */
  var funilResumo=null, funilPedido=false;
  function pedirResumoFunil(){
    if(funilPedido) return; funilPedido=true;
    fetch('/api/painel?op=funil&dias=7').then(function(r){return r.json()}).then(function(j){
      funilResumo=(j&&j.etapas)?j:{erro:true}; refazer(['hoje']);
    }).catch(function(){ funilResumo={erro:true}; refazer(['hoje']); });
  }
  function nEtapa(j,e){ var x=(j.etapas||[]).filter(function(t){return t.etapa===e})[0]; return x?x.total:0; }
  // Quanto o banco já leu hoje (o limite gratuito é 5 milhões por dia, zera às 21h).
  function pedirConsumo(){
    if(consumoPedido) return; consumoPedido=true;
    fetch('/api/painel?op=consumo').then(function(r){return r.json()}).then(function(j){
      consumoHoje=(j&&typeof j.hoje==='number')?j:null; refazer(['hoje','ajustes']);
    }).catch(function(){});
  }
  function milhar(n){
    if(n>=1e6) return (n/1e6).toFixed(1).replace('.',',').replace(',0','')+' mi';
    if(n>=1e3) return Math.round(n/1e3)+' mil';
    return String(n);
  }
  // 04/11/2026 (revisão do painel, item 2): a linha do banco saiu do topo do Hoje. O número segue em
  // Ajustes (Consumo hoje) e vira tarefa no "Precisa de você" quando passa de 80% do dia.
  function pintarConsumo(){
    var velho=$('consumo'); if(velho) velho.remove();
  }
  function abrirConsumo(){
    var c=consumoHoje; if(!c) return;
    var card=$('card');
    card.innerHTML='<h2>Banco hoje</h2><p>'+milhar(c.hoje)+' de '+milhar(c.teto)+' linhas lidas (ontem: '+milhar(c.ontem)+'). '+
      'O limite gratuito zera às 21h. Passou dele, o banco trava até lá: site na lista guardada, painel e cupom fora.</p>'+
      '<div class="bloco"><div class="rot">O QUE MAIS LEU HOJE</div>'+
      (c.top&&c.top.length ? c.top.map(function(t){
        return '<div class="ev"><span>'+milhar(t.linhas)+'</span><span style="word-break:break-all">'+esc(t.rotulo)+' <i style="font-style:normal;color:var(--ink4)">('+t.chamadas+'x)</i></span></div>';
      }).join('') : '<div class="vazio" style="padding:10px 0">Nada anotado ainda hoje.</div>')+
      '</div><p style="margin-top:12px;font-size:12px">Conta aproximada, anotada pelo próprio site a cada minuto. Pra conferir: Cloudflare, D1, caramujo, Metrics.</p>'+
      '<div class="acoes"><button class="pill" data-close type="button">Fechar</button></div>';
    $('veil').hidden=false;
    card.querySelector('[data-close]').addEventListener('click',fechar);
  }

  // resumo da loja pro botão da home (a tela Vitrine mora em /assets/painel/vitrine.js)
  function pedirResumoLoja(){
    if(lojaPedida) return; lojaPedida=true;
    fetch('/api/painel?op=loja').then(function(r){return r.json()}).then(function(j){
      if(!j||!Array.isArray(j.beats)){ lojaResumo={erro:true}; }
      else lojaResumo={
        aVenda:j.beats.filter(function(b){return !b.sold}).length,
        cupons:(j.cupons||[]).filter(function(c){return c.ativo && !(c.max_usos!==null && c.usos>=c.max_usos)}).length
      };
      refazer(['hoje']);
    }).catch(function(){ lojaResumo={erro:true}; });
  }

  function cartaoRevisar(){
    if(revisarErro){
      var ruim=document.createElement('div');
      ruim.className='revisar';
      ruim.innerHTML='<b>Não consegui conferir os pendentes</b><small>A lista de revisão não '+
        'respondeu agora. Recarrega a página. Até lá, não confia na contagem: pode ter beat '+
        'sem pastilha esperando resposta.</small>';
      $('lista').appendChild(ruim);
      return;
    }
    if(!revisar.length){
      if(!tapes.length) return;
      var ok=document.createElement('div');
      ok.className='revisar limpo';
      ok.innerHTML='<b>Nada pra revisar</b><small>Todo beat das tapes está classificado como '+
        'disponível ou vendido. Quando o cruzamento não decidir, o beat aparece aqui com os '+
        'botões pra você marcar.</small>';
      $('lista').appendChild(ok);
      return;
    }
    var porTape={};
    revisar.forEach(function(f){ (porTape[f.tape]=porTape[f.tape]||{id:f.tape_id,itens:[]}).itens.push(f) });

    var d=document.createElement('div');
    d.className='revisar';
    var html='<b>'+revisar.length+(revisar.length===1?' beat pra revisar':' beats pra revisar')+'</b>'+
      '<details class="como"><summary>Como funciona</summary><small>O Drive não resolveu: caíram em Exclusivos e na pasta de um artista ao mesmo tempo, '+
      'ou em nenhum dos dois. Saem sem pastilha no catálogo até você responder aqui. '+
      'O que você marcar vence a pasta e não volta atrás.</small></details>';

    Object.keys(porTape).forEach(function(tape){
      var g=porTape[tape];
      html+='<div class="rev-tape"><div class="rev-topo"><b>'+esc(tape)+'</b>'+
        (g.itens.length>1
          ? '<span class="rev-tudo">todos: <button type="button" data-tape="'+g.id+'" data-v="disponivel">disponível</button>'+
            '<button type="button" data-tape="'+g.id+'" data-v="vendido">vendido</button></span>'
          : '')+'</div><ul>'+
        g.itens.map(function(f){
          var ficha=[f.mkey,f.bpm?f.bpm+'bpm':''].filter(Boolean).join(' · ');
          return '<li><span class="rev-nome">'+esc(f.title)+(ficha?' <i>'+esc(ficha)+'</i>':'')+'</span>'+
            '<small>'+esc(f.revisar)+'</small>'+
            '<span class="rev-acoes">'+
              '<button type="button" data-id="'+esc(f.id)+'" data-v="disponivel">disponível</button>'+
              '<button type="button" data-id="'+esc(f.id)+'" data-v="vendido">vendido</button>'+
            '</span></li>';
        }).join('')+'</ul></div>';
    });
    d.innerHTML=html;

    d.querySelectorAll('[data-v]').forEach(function(b){
      b.addEventListener('click',function(){
        var corpo={ valor:b.dataset.v };
        if(b.dataset.tape) corpo.tapeId=Number(b.dataset.tape); else corpo.ids=[b.dataset.id];
        d.querySelectorAll('[data-v]').forEach(function(x){x.disabled=true});
        acao('venda',corpo).then(function(j){
          if(j.ok){ flash('Marcado como '+b.dataset.v+'.'); carregar(true); }
          else { flash(j.erro||'Não consegui marcar.'); d.querySelectorAll('[data-v]').forEach(function(x){x.disabled=false}); }
        });
      });
    });
    $('lista').appendChild(d);
  }

  function conta(a){
    var p=[];
    if(a.nb) p.push(a.nb+(a.nb===1?' beat':' beats'));
    if(a.ns) p.push(a.ns+(a.ns===1?' música':' músicas'));
    return p.join(', ')||'sem faixa pronta';
  }
  function link(a){ return location.origin+'/'+a.slug+'/'+a.code }

  // primeira linha da lista de tapes, sempre: o perfil público. Toca = abre o card do
  // perfil (atividade + a ordem das tapes); o botão ao lado copia o link.
  // ícone do @rideblan33 no painel: o 33 da camisa (escolha B, 26/09/2026)
  var AVATAR='/assets/perfil/rideblan33-camisa.webp';
  function linhaPerfil(){
    var u=location.origin+'/rideblan33';
    var row=document.createElement('div'); row.className='item item-perfil';
    var b=document.createElement('button'); b.type='button'; b.className='linha';
    var n=noPerfil().length;
    b.innerHTML='<span class="capa-lista perfil"><img src="'+AVATAR+'" alt="" loading="lazy"></span>'+
      '<span style="flex:1;min-width:0"><span class="nome">@rideblan33</span>'+
      '<span class="meta">'+n+(n===1?' beat tape':' beat tapes')+' no perfil · '+tempo(perfilVisto)+'</span></span>';
    b.addEventListener('click',abrirPerfil);
    var c=document.createElement('button'); c.type='button'; c.className='copiar'; c.setAttribute('aria-label','Copiar link do perfil');
    c.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b7b7b7" stroke-width="1.7"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a1 1 0 011-1h9"/></svg>';
    c.addEventListener('click',function(e){ e.stopPropagation(); if(navigator.clipboard) navigator.clipboard.writeText(u); flash('Link do perfil copiado.') });
    row.appendChild(b); row.appendChild(c);
    $('lista').appendChild(row);
  }

  var ALCA='<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>';

  // Card do @rideblan33: link, atividade (igual às tapes) e a ordem das capas numa
  // lista numerada. Segura a alça e arrasta (no teclado: foca a alça e usa as setas);
  // salva sozinho. Tape nova sempre entra como 1ª.
  var pfPlays=null;
  function abrirPerfil(){
    var u=location.origin+'/rideblan33', c=$('card');
    c.innerHTML=
      '<div class="cab"><div class="capa-mini perfil"><img src="'+AVATAR+'" alt="@rideblan33"></div><div class="cab-txt">'+
        '<h2>@rideblan33</h2><div class="end">caramujorecords.com.br/rideblan33</div></div></div>'+
      '<div class="acoes">'+
        '<button class="pill solid" data-act="copiar" type="button">Copiar link</button>'+
        '<button class="pill" data-act="abrir" type="button">Abrir</button>'+
      '</div>'+
      '<div class="bloco"><div class="rot">ATIVIDADE</div>'+
        '<div class="numeros">'+
          '<div><b id="pfUltima">—</b><span>última<br>visita</span></div>'+
          '<div><b id="pfMes">—</b><span>visitas<br>no mês</span></div>'+
          '<div><b id="pfAno">—</b><span>visitas<br>no ano</span></div>'+
        '</div></div>'+
      '<div class="bloco"><div class="rot">ORDEM NO PERFIL</div>'+
        '<p class="pf-dica">Segura a alça e arrasta. Salva sozinho. Tape nova entra sempre como 1ª.</p>'+
        '<ol class="pf-lista" id="pfLista"></ol></div>'+
      '<div class="bloco" id="pfForaBloco" hidden><div class="rot">FORA DO PERFIL</div><ul class="pf-lista pf-fora" id="pfFora"></ul></div>'+
      '<div class="acoes"><button class="pill" data-close type="button">Fechar</button></div>';
    $('veil').hidden=false;
    c.querySelector('[data-close]').addEventListener('click',fechar);
    c.querySelector('[data-act=copiar]').addEventListener('click',function(){ if(navigator.clipboard) navigator.clipboard.writeText(u); flash('Link do perfil copiado.') });
    c.querySelector('[data-act=abrir]').addEventListener('click',function(){ window.open(u,'_blank','noopener') });
    fetch('/api/painel?op=perfil-resumo').then(function(x){return x.json()}).then(function(j){
      $('pfUltima').textContent=j.ultima?dia(j.ultima):'—'; $('pfMes').textContent=j.mes||0; $('pfAno').textContent=j.ano||0;
      pfPlays=j.plays||{}; pintaPlays();
    }).catch(function(){});
    montarOrdem();
  }
  function capaPf(a){
    return '<span class="pf-capa">'+(a.cover_key?'<img src="/capa/'+esc(a.cover_key)+'?p" alt="" loading="lazy">':'<img class="sem" src="/assets/brand/selo-creme.svg" alt="">')+'</span>';
  }
  function montarOrdem(){
    var ol=$('pfLista'); ol.innerHTML='';
    noPerfil().forEach(function(a){
      var li=document.createElement('li'); li.dataset.id=a.id;
      li.innerHTML='<span class="pf-n"></span>'+capaPf(a)+
        '<span class="pf-txt"><b>'+esc(a.name)+'</b><small>'+(a.nb||0)+((a.nb||0)===1?' beat':' beats')+'<span class="pf-plays"></span></small></span>'+
        '<button class="pf-alca" type="button" aria-label="Mover '+esc(a.name)+' (setas pra cima e pra baixo)">'+ALCA+'</button>';
      ol.appendChild(li);
    });
    renumera(); pintaPlays();
    var fora=tapes.filter(function(t){ return t.perfil===0 && (t.nb||0)>0 });
    $('pfForaBloco').hidden=!fora.length;
    var ul=$('pfFora'); ul.innerHTML='';
    fora.forEach(function(a){
      var li=document.createElement('li');
      li.innerHTML=capaPf(a)+'<span class="pf-txt"><b>'+esc(a.name)+'</b><small>escondida</small></span><button class="pill" type="button">Mostrar</button>';
      li.querySelector('button').addEventListener('click',function(e){
        var bt=e.currentTarget; bt.disabled=true;
        acao('perfil',{id:a.id,valor:1}).then(function(j){
          if(!j.ok){ bt.disabled=false; flash(j.erro||'Não consegui mudar.'); return; }
          a.perfil=1; montarOrdem(); flash('Aparece no perfil.');
        });
      });
      ul.appendChild(li);
    });
    if(!ol.dataset.ligado){ ol.dataset.ligado='1'; ligarOrdem(ol); }
  }
  function renumera(){
    [].slice.call($('pfLista').children).forEach(function(li,i){ li.querySelector('.pf-n').textContent=(i+1) });
  }
  function pintaPlays(){
    if(!pfPlays || !$('pfLista')) return;
    [].slice.call(document.querySelectorAll('#pfLista li')).forEach(function(li){
      var n=pfPlays[li.dataset.id]||0;
      li.querySelector('.pf-plays').textContent=' · '+n.toLocaleString('pt-BR')+(n===1?' play':' plays');
    });
  }
  var salvarOrdemT=null;
  function salvarOrdem(){
    clearTimeout(salvarOrdemT);
    salvarOrdemT=setTimeout(function(){
      var ids=[].slice.call($('pfLista').children).map(function(li){ return Number(li.dataset.id) });
      acao('perfil-ordem',{ids:ids}).then(function(j){
        if(!j.ok){ flash(j.erro||'Não consegui salvar a ordem.'); return; }
        ids.forEach(function(id,i){ var t=tapes.filter(function(x){return x.id===id})[0]; if(t) t.perfil_ordem=i+1; });
        flash('Ordem do perfil salva.');
      });
    },600);
  }
  // Arrastar suave: a tape pega segue o dedo (sem pular de linha em linha) e as outras
  // deslizam pro lugar novo (FLIP: mede antes, troca no DOM, anima a diferença).
  function ligarOrdem(ol,renum,salvar){
    renum=renum||renumera; salvar=salvar||salvarOrdem;
    var pego=null, card=$('card'), dy=0, DUR=180;
    function topoLayout(li){ return ol.getBoundingClientRect().top + li.offsetTop; }
    function desliza(mudar){
      var outros=[].slice.call(ol.children).filter(function(li){ return li!==pego });
      var antes=outros.map(function(li){ return li.getBoundingClientRect().top });
      mudar();
      outros.forEach(function(li,i){
        var d=antes[i]-li.getBoundingClientRect().top;
        if(!d) return;
        li.style.transition='none'; li.style.transform='translateY('+d+'px)';
        li.getBoundingClientRect();
        li.style.transition='transform '+DUR+'ms cubic-bezier(.2,.7,.3,1)'; li.style.transform='';
      });
      renum();
    }
    function segue(y){ if(pego) pego.style.transform='translateY('+(y-dy-topoLayout(pego))+'px)'; }
    ol.addEventListener('pointerdown',function(e){
      var h=e.target.closest('.pf-alca'); if(!h) return;
      pego=h.closest('li'); e.preventDefault();
      try{ h.setPointerCapture(e.pointerId); }catch(_){}
      dy=e.clientY-pego.getBoundingClientRect().top;
      pego.style.transition='box-shadow .15s, background .15s';
      pego.classList.add('pego');
    });
    ol.addEventListener('pointermove',function(e){
      if(!pego) return;
      var cr=card.getBoundingClientRect();
      if(e.clientY<cr.top+60) card.scrollTop-=10; else if(e.clientY>cr.bottom-60) card.scrollTop+=10;
      // meio da tape pega x meio das outras (posição de layout, sem a animação)
      var meio=e.clientY-dy+pego.offsetHeight/2;
      var outros=[].slice.call(ol.children).filter(function(li){ return li!==pego });
      var alvo=null;
      for(var i=0;i<outros.length;i++){ if(meio<topoLayout(outros[i])+outros[i].offsetHeight/2){ alvo=outros[i]; break; } }
      if(alvo ? pego.nextElementSibling!==alvo : ol.lastElementChild!==pego){
        desliza(function(){ if(alvo) ol.insertBefore(pego,alvo); else ol.appendChild(pego); });
      }
      segue(e.clientY);
    });
    function solta(){
      if(!pego) return;
      var li=pego; pego=null;
      li.style.transition='transform '+DUR+'ms cubic-bezier(.2,.7,.3,1), box-shadow .2s, background .2s';
      li.style.transform='';
      li.classList.remove('pego');
      setTimeout(function(){ li.style.transition=''; }, DUR+20);
      salvar();
    }
    ol.addEventListener('pointerup',solta); ol.addEventListener('pointercancel',solta);
    // teclado: alça focada + seta pra cima/baixo
    ol.addEventListener('keydown',function(e){
      var h=e.target.closest('.pf-alca'); if(!h) return;
      if(e.key!=='ArrowUp' && e.key!=='ArrowDown') return;
      e.preventDefault();
      var li=h.closest('li'); pego=li;
      desliza(function(){
        if(e.key==='ArrowUp' && li.previousElementSibling) ol.insertBefore(li,li.previousElementSibling);
        if(e.key==='ArrowDown' && li.nextElementSibling) ol.insertBefore(li.nextElementSibling,li);
      });
      pego=null; h.focus(); salvar();
    });
  }

  function rodando(a){
    if(a.job_estado!=='na fila' && a.job_estado!=='convertendo') return false;
    // some sozinho se algo travar no meio do caminho
    return !a.job_at || (Date.now() - new Date(a.job_at).getTime()) < 40*60*1000;
  }
  function barra(a){
    var total=a.job_total||0, feitos=a.job_feitos||0;
    var pct = total ? Math.round(feitos/total*100) : 0;
    var texto = a.job_estado==='na fila' ? 'na fila'
      : (total ? feitos+' de '+total : 'lendo a pasta');
    var indef = (a.job_estado==='na fila' || !total);
    // na fila / lendo a pasta: a barra que vai e volta (.trilho.indef i); a largura fixa por cima
    // escondia ela (achado na faxina de 04/10)
    return '<span class="andamento"><span class="trilho'+(indef?' indef':'')+'"><i'+(indef?'':' style="width:'+pct+'%"')+'></i></span>'+
      '<small>'+texto+'</small></span>';
  }

  function capaLista(a){
    return a.cover_key
      ? '<span class="capa-lista"><img src="/capa/'+esc(a.cover_key)+'?p" alt="" loading="lazy"></span>'
      : '<span class="capa-lista vazia"><img src="/assets/brand/selo-creme.svg" alt="" width="18" height="18"></span>';
  }

  function capaMini(a){
    return a.cover_key
      ? '<div class="capa-mini"><img src="/capa/'+esc(a.cover_key)+'?p" alt="capa de '+esc(a.name)+'" loading="lazy"></div>'
      : '<div class="capa-mini vazia">sem capa</div>';
  }

  function copiar(a){
    var u=link(a);
    if(navigator.clipboard) navigator.clipboard.writeText(u);
    flash('Link do '+a.name+' copiado.');
  }

  function abrir(a){
    var c=$('card');
    c.innerHTML=
      '<div class="cab">'+capaMini(a)+'<div class="cab-txt">'+
        '<h2>'+esc(a.name)+'</h2><div class="end">'+esc(link(a).replace(/^https?:\/\//,''))+'</div>'+
      '</div></div>'+
      '<div class="acoes">'+
        '<button class="pill solid" data-act="copiar" type="button">Copiar link</button>'+
        '<button class="pill" data-act="abrir" type="button">Abrir</button>'+
      '</div>'+
      (a.tipo==='tape'
        ? '<div class="bloco"><div class="rot">PERFIL @RIDEBLAN33</div>'+
          sw('perfil','Mostrar no perfil','a capa aparece em caramujorecords.com.br/rideblan33',a.perfil!==0)+
          '<div class="sw"><span><b id="perfilPos">'+esc(posicaoPerfil(a))+'</b><small>a ordem muda em <b>@rideblan33</b>, no topo da lista das tapes</small></span></div></div>'
        : '')+
      (a.tipo==='tape'
        ? '<div class="bloco"><div class="rot">BEATS DA TAPE</div>'+
          '<div class="sw"><span><b>Ordem, gênero, BPM e esconder</b><small>muda a página da tape; gênero e BPM de beat que está na vitrine mudam lá também</small></span>'+
          '<button class="pill" data-act="beats" type="button">Organizar</button></div></div>'
        : '')+
      '<div class="bloco"><div class="rot">DESCRIÇÃO DO CATÁLOGO</div>'+
        '<label for="desc" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Descrição</label>'+
        '<textarea class="desc" id="desc" maxlength="280" placeholder="Um recado que aparece embaixo da contagem de faixas. Só você escreve — pode quebrar linha.">'+esc(a.descricao||'')+'</textarea>'+
        '<div class="desc-baixo"><small id="descConta"></small>'+
        '<button class="pill" data-act="salvardesc" type="button">Salvar</button></div>'+
      '</div>'+
      '<div class="bloco"><div class="rot">PODE BAIXAR</div>'+
        (a.tipo==='tape'
          ? sw('beats','Beats','os beats desta tape',a.dl_beats)
          : sw('beats','Beats','os beats reservados e os já gravados',a.dl_beats)+
            sw('sons','Músicas','os sons prontos, lançados e as guias',a.dl_sons))+
      '</div>'+
      (a.tipo!=='tape' && a.cover_origem==='artista'
        ? '<div class="bloco"><div class="rot">CAPA</div>'+
          '<div class="sw"><span><b>O artista trocou a capa</b>'+
          '<small>a imagem do Drive não sobrescreve enquanto ela estiver aqui</small></span>'+
          '<button class="pill" data-act="tirarcapa" type="button">Remover</button></div></div>'
        : '')+
      '<div class="bloco"><div class="rot">ATIVIDADE</div>'+
        '<div class="numeros">'+
          '<div><b id="nUltima">—</b><span>última<br>atividade</span></div>'+
          '<div><b id="nMes">—</b><span>aberturas<br>no mês</span></div>'+
          '<div><b id="nAno">—</b><span>aberturas<br>no ano</span></div>'+
        '</div>'+
        '<div id="eventos">carregando…</div>'+
        '<div class="pag" id="pag" hidden>'+
          '<button type="button" data-ir="-1" aria-label="Página anterior">‹</button>'+
          '<small id="pagInfo"></small>'+
          '<button type="button" data-ir="1" aria-label="Próxima página">›</button>'+
        '</div>'+
      '</div>'+
      '<div class="acoes">'+
        '<button class="pill" data-act="sync" type="button">Converter agora</button>'+
        '<button class="pill" data-close type="button">Fechar</button>'+
      '</div>';
    $('veil').hidden=false;
    c.querySelector('[data-close]').addEventListener('click',fechar);
    c.querySelector('[data-act=copiar]').addEventListener('click',function(){copiar(a)});

    var campo=$('desc'), conta=$('descConta'), salvar=c.querySelector('[data-act=salvardesc]');
    var mostrarConta=function(){ conta.textContent=campo.value.length+' de 280' };
    mostrarConta();
    campo.addEventListener('input',mostrarConta);
    salvar.addEventListener('click',function(){
      salvar.disabled=true;salvar.textContent='Salvando…';
      acao('descricao',{id:a.id,texto:campo.value}).then(function(j){
        salvar.disabled=false;salvar.textContent='Salvar';
        if(j.ok){ a.descricao=j.texto||''; flash(j.texto?'Descrição salva.':'Descrição apagada.'); }
        else flash(j.erro||'Não consegui salvar.');
      });
    });
    var tirar=c.querySelector('[data-act=tirarcapa]');
    if(tirar) tirar.addEventListener('click',function(){
      tirar.disabled=true;tirar.textContent='Removendo…';
      fetch('/api/capa?id='+a.id,{method:'DELETE'}).then(function(x){return x.json()}).then(function(j){
        if(j.ok){ a.cover_origem=null; flash('Capa removida. Na próxima conversão volta a do Drive.'); fechar(); carregar(true); }
        else { tirar.disabled=false;tirar.textContent='Remover';flash(j.erro||'Não consegui remover.') }
      });
    });
    c.querySelector('[data-act=abrir]').addEventListener('click',function(){window.open(link(a),'_blank','noopener')});
    var orgB=c.querySelector('[data-act=beats]'); if(orgB) orgB.addEventListener('click',function(){ abrirBeatsTape(a); });
    c.querySelector('[data-act=sync]').addEventListener('click',function(e){
      var b=e.currentTarget;b.disabled=true;b.textContent='Mandando…';
      acao('sync',{artista:a.name}).then(function(j){
        b.disabled=false;b.textContent='Converter agora';
        if(!j.ok){ flash(j.erro||'Não consegui disparar.'); return; }
        flash('Conversão do '+a.name+' começou.');
        a.job_estado='na fila';a.job_total=0;a.job_feitos=0;a.job_at=new Date().toISOString();
        fechar();acompanhar();carregar(true);
      });
    });
    c.querySelectorAll('.toggle').forEach(function(t){
      t.addEventListener('click',function(){
        var on=t.getAttribute('aria-pressed')!=='true';
        t.setAttribute('aria-pressed',String(on));
        if(t.dataset.campo==='perfil'){
          acao('perfil',{id:a.id,valor:on?1:0}).then(function(j){
            if(!j.ok){ t.setAttribute('aria-pressed',String(!on)); flash(j.erro||'Não consegui mudar.'); return; }
            a.perfil=on?1:0;
            $('perfilPos').textContent=posicaoPerfil(a);
            flash(on?'Aparece no perfil.':'Escondida do perfil.');
          });
          return;
        }
        acao('perm',{id:a.id,campo:t.dataset.campo,valor:on?1:0}).then(function(){
          if(t.dataset.campo==='beats')a.dl_beats=on?1:0; else a.dl_sons=on?1:0;
          flash(on?'Liberado pra baixar.':'Agora é só ouvir.');
        });
      });
    });
    var pagina=0;
    function puxar(){
      fetch('/api/painel?op=eventos&id='+a.id+'&p='+pagina).then(function(r){return r.json()}).then(function(j){
        var r=j.resumo||{};
        $('nUltima').textContent = r.ultima ? dia(r.ultima) : '—';
        $('nMes').textContent = r.mes||0;
        $('nAno').textContent = r.ano||0;

        var e=$('eventos');
        if(!j.eventos||!j.eventos.length){
          e.innerHTML='<div class="vazio" style="padding:14px 0">Ninguém abriu ainda.</div>';
          $('pag').hidden=true;return;
        }
        e.innerHTML=j.eventos.map(function(x){
          return '<div class="ev"><span>'+quando(x.at)+'</span><span>'+rotulo(x)+'</span></div>';
        }).join('');

        var pg=$('pag');
        pg.hidden = j.paginas<=1;
        $('pagInfo').textContent = (j.pagina+1)+' de '+j.paginas+' · '+j.total+(j.total===1?' registro':' registros');
        pg.querySelector('[data-ir="-1"]').disabled = j.pagina<=0;
        pg.querySelector('[data-ir="1"]').disabled = j.pagina+1>=j.paginas;
      });
    }
    card.querySelectorAll('[data-ir]').forEach(function(btn){
      btn.addEventListener('click',function(){
        pagina=Math.max(0,pagina+Number(btn.dataset.ir));
        puxar();
        $('eventos').scrollIntoView({block:'nearest'});
      });
    });
    puxar();
  }
  // Beats da tape (24/10/2026): arrastar pela alça (salva sozinho), tocar no nome abre gênero e BPM,
  // o olho esconde da página da tape. Tudo fica na meta 'tapes-ajuste' (a conversão do Drive não apaga).
  var OLHO='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var OLHO_X='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A9.8 9.8 0 0112 5c6.4 0 10 7 10 7a17 17 0 01-3.2 4.2M6.6 6.6C3.9 8.4 2 12 2 12s3.6 7 10 7a9.6 9.6 0 004.4-1"/><path d="M9.9 9.9a3 3 0 004.2 4.2"/></svg>';
  function abrirBeatsTape(a){
    var c=$('card');
    c.innerHTML='<div class="cab">'+capaMini(a)+'<div class="cab-txt"><h2>'+esc(a.name)+'</h2><div class="end">beats da tape</div></div></div>'+
      '<p class="pf-dica">Segura a alça e arrasta pra mudar a ordem (salva sozinho; os beats que estão na vitrine seguem a mesma ordem lá). Toca no nome pra ajustar gênero e BPM. O olho esconde o beat da página da tape.</p>'+
      '<ol class="pf-lista tb-lista" id="tbLista"><li><span class="pf-txt"><small>carregando…</small></span></li></ol>'+
      '<div class="acoes"><button class="pill" data-volta type="button">Voltar</button><button class="pill" data-close type="button">Fechar</button></div>';
    $('veil').hidden=false;
    c.querySelector('[data-close]').addEventListener('click',fechar);
    c.querySelector('[data-volta]').addEventListener('click',function(){ abrir(a); });
    fetch('/api/painel?op=tape-beats&id='+a.id).then(function(r){return r.json()}).then(function(j){
      if(!j.ok){ $('tbLista').innerHTML='<li><span class="pf-txt"><small>'+esc(j.erro||'Não consegui abrir.')+'</small></span></li>'; return; }
      pintarBeatsTape(a,j);
    }).catch(function(){ $('tbLista').innerHTML='<li><span class="pf-txt"><small>Sem conexão agora.</small></span></li>'; });
  }
  function pintarBeatsTape(a,j){
    var ol=$('tbLista'), G=j.generos||[], rot={}; G.forEach(function(g){ rot[g[0]]=g[1]; });
    ol.innerHTML='';
    if(!j.beats.length){ ol.innerHTML='<li><span class="pf-txt"><small>Nenhum beat pronto nessa tape.</small></span></li>'; return; }
    j.beats.forEach(function(b){
      var li=document.createElement('li'); li.dataset.id=b.id;
      function ficha(){ return [b.genero?rot[b.genero]||b.genero:'sem gênero', b.bpm?b.bpm+' BPM':'sem BPM', b.key].filter(Boolean).join(' · ')+(b.vendido?' · vendido':'')+(b.oculto?' · escondido':''); }
      li.innerHTML='<span class="pf-n"></span>'+
        '<button class="tb-nome" type="button" aria-expanded="false"><span class="pf-txt"><b>'+esc(b.title)+'</b><small></small></span></button>'+
        '<button class="tb-olho" type="button" aria-label="Esconder '+esc(b.title)+' da página da tape"></button>'+
        '<button class="pf-alca" type="button" aria-label="Mover '+esc(b.title)+' (setas pra cima e pra baixo)">'+ALCA+'</button>'+
        '<div class="tb-ed" hidden>'+
          '<div><label>Gênero</label><select><option value="">'+(b.naLoja?'(o da vitrine)':'sem gênero')+'</option>'+G.map(function(g){ return '<option value="'+g[0]+'"'+(g[0]===b.genero?' selected':'')+'>'+esc(g[1])+'</option>'; }).join('')+'</select></div>'+
          '<div><label>BPM</label><input type="number" inputmode="numeric" min="40" max="300" value="'+(b.bpm||'')+'"></div>'+
          '<button class="pill solid" type="button">Salvar</button>'+
          '<small>'+(b.naLoja?'Está na vitrine: muda lá e aqui (é o mesmo beat).':'Não está na vitrine: muda só na tape.')+(b.bpmMexido&&b.bpmArquivo?' BPM do arquivo: '+b.bpmArquivo+'.':'')+'</small>'+
        '</div>';
      var sm=li.querySelector('.pf-txt small'), olho=li.querySelector('.tb-olho'), nome=li.querySelector('.tb-nome'), ed=li.querySelector('.tb-ed');
      function pinta(){ sm.textContent=ficha(); olho.innerHTML=b.oculto?OLHO_X:OLHO; olho.setAttribute('aria-pressed',b.oculto?'true':'false'); olho.setAttribute('aria-label',(b.oculto?'Mostrar ':'Esconder ')+b.title+' na página da tape'); li.classList.toggle('oculto',!!b.oculto); }
      pinta();
      nome.addEventListener('click',function(){ ed.hidden=!ed.hidden; nome.setAttribute('aria-expanded',ed.hidden?'false':'true'); });
      olho.addEventListener('click',function(){
        olho.disabled=true;
        acao('tape-beat',{id:a.id,faixa:b.id,oculto:!b.oculto}).then(function(r){
          olho.disabled=false;
          if(!r.ok){ flash(r.erro||'Não consegui mudar.'); return; }
          b.oculto=r.oculto; pinta(); flash(b.oculto?'Escondido da tape.':'Volta a aparecer na tape.');
        });
      });
      var bt=ed.querySelector('.pill'), sel=ed.querySelector('select'), inp=ed.querySelector('input');
      bt.addEventListener('click',function(){
        var corpo={id:a.id,faixa:b.id,genero:sel.value,bpm:inp.value===''?null:Number(inp.value)};
        if(corpo.bpm!=null&&!(corpo.bpm>=40&&corpo.bpm<=300)){ flash('BPM entre 40 e 300.'); inp.focus(); return; }
        bt.disabled=true; bt.textContent='Salvando…';
        acao('tape-beat',corpo).then(function(r){
          bt.disabled=false; bt.textContent='Salvar';
          if(!r.ok){ flash(r.erro||'Não consegui salvar.'); return; }
          b.genero=r.genero; b.bpm=r.bpm; pinta(); ed.hidden=true; nome.setAttribute('aria-expanded','false');
          flash(r.loja?'Salvo na tape e na vitrine.':'Salvo na tape.');
        });
      });
      ol.appendChild(li);
    });
    renumTb();
    ligarOrdem(ol,renumTb,function(){ salvarOrdemTb(a); });
  }
  function renumTb(){ [].slice.call($('tbLista').children).forEach(function(li,i){ var n=li.querySelector('.pf-n'); if(n) n.textContent=(i+1); }); }
  var salvarTbT=null;
  function salvarOrdemTb(a){
    clearTimeout(salvarTbT);
    salvarTbT=setTimeout(function(){
      var ids=[].slice.call($('tbLista').children).map(function(li){ return li.dataset.id; }).filter(Boolean);
      acao('tape-ordem',{id:a.id,ids:ids}).then(function(j){ flash(j.ok?(j.vitrine?'Ordem salva na tape e na vitrine.':'Ordem da tape salva.'):(j.erro||'Não consegui salvar a ordem.')); });
    },600);
  }
  function sw(campo,titulo,desc,valor){
    return '<div class="sw"><span><b>'+titulo+'</b><small>'+desc+'</small></span>'+
      '<button class="toggle" type="button" data-campo="'+campo+'" aria-pressed="'+(valor?'true':'false')+'" aria-label="'+titulo+'"><i></i></button></div>';
  }
  function dia(iso){
    var d=new Date(iso), h=new Date();
    var mesmoDia=function(a,b){return a.toDateString()===b.toDateString()};
    if(mesmoDia(d,h)) return 'hoje';
    var ontem=new Date(h.getTime()-86400e3);
    if(mesmoDia(d,ontem)) return 'ontem';
    return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}).replace('.','');
  }
  function quando(iso){
    var d=new Date(iso);
    return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})+' '+
           d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  }
  function rotulo(x){
    if(x.kind==='open') return 'abriu o catálogo';
    if(x.kind==='perfil-tape') return 'tocou na capa no perfil';
    if(x.kind==='play') return 'ouviu ' + esc(x.titulo||'uma faixa');
    if(x.kind && x.kind.indexOf('download')===0) return 'baixou ' + esc(x.titulo||'uma faixa') + ' em ' + x.kind.split('-')[1].toUpperCase();
    return x.kind;
  }

  function fechar(){ $('veil').hidden=true; $('card').innerHTML=''; desenhar(); }
  $('veil').addEventListener('click',function(e){ if(e.target===$('veil')) fechar() });

  function acao(op,body){
    return fetch('/api/painel?op='+op,{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify(body)}).then(function(r){return r.json()}).catch(function(){return {erro:'falhou'}});
  }

  $('q').addEventListener('input',function(e){filtro=e.target.value.toLowerCase();desenhar()});

  $('ordemBtn').addEventListener('click',function(){
    var c=$('card');
    c.innerHTML='<h2>Ordem</h2><p>Como a lista aparece</p><div class="card-list">'+
      Object.keys(ORDENS).filter(function(k){ return k!=='perfil' || vista==='tapes' }).map(function(k){
        return '<button type="button" data-ordem="'+k+'">'+
          '<span style="width:18px;display:flex">'+(ordem===k?'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4"><path d="M5 12.5l5 5 9-10"/></svg>':'')+'</span>'+
          ORDENS[k]+'</button>';
      }).join('')+
      '</div><button class="pill" data-close type="button" style="width:100%;justify-content:center;margin-top:14px">Fechar</button>';
    $('veil').hidden=false;
    c.querySelector('[data-close]').addEventListener('click',fechar);
    c.querySelectorAll('[data-ordem]').forEach(function(b){
      b.addEventListener('click',function(){
        ordem=b.dataset.ordem; if(ordemDe[vista]) ordemDe[vista]=ordem;
        $('ordemLabel').textContent=ORDENS[ordem];
        fechar();
      });
    });
  });
  // 04/11/2026 (revisão do painel, item 10): o "Converter tudo" mora no ⋯ da lista e pede confirmação
  $('barraMais').addEventListener('click',function(){
    var c=$('card');
    c.innerHTML=cabFolha('Converter tudo','artistas e tapes, do Drive pro site')+
      '<p>Converte de novo todas as pastas do Drive. Leva de minutos a horas e lê bastante o banco. Serve quando uma pasta nova não apareceu na conversão da madrugada.</p>'+
      '<div class="acoes"><button class="pill solid" id="syncTudo" type="button">Converter tudo</button><button class="pill" data-close type="button">Cancelar</button></div>';
    $('veil').hidden=false; ligarFecha(c);
    $('syncTudo').addEventListener('click',function(e){
      var b=e.currentTarget;b.disabled=true;b.textContent='Mandando…';
      acao('sync',{}).then(function(j){
        b.disabled=false;b.textContent='Converter tudo';
        if(!j.ok){ flash(j.erro||'Não consegui disparar.'); return; }
        flash('Conversão de todo mundo começou.');
        artistas.forEach(function(x){ x.job_estado='na fila';x.job_total=0;x.job_feitos=0;x.job_at=new Date().toISOString() });
        fechar();acompanhar();carregar(true);
      });
    });
  });

  /* ---------- busca única (04/11/2026, revisão do painel, item 11) ----------
     A lupa do topo (no computador: o campo do menu e ⌘K / Ctrl+K) acha beats do site e da fila, pedidos,
     cupons, artistas e tapes e e-mails da lista. Cada resultado já traz a ação que você mais usa:
     Vendido (com confirmação), Publicar, copiar o link. Os atalhos do Hoje abrem a busca já no modo
     certo: "Marcar vendido" só com os beats à venda e "Link de artista" só com artistas e tapes. */
  var buscaModo='';
  var LUPA='<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.6-4.6"/></svg>';
  function criaBusca(){
    if($('busca')) return $('busca');
    var o=document.createElement('div'); o.id='busca'; o.className='busca'; o.hidden=true;
    o.setAttribute('role','dialog'); o.setAttribute('aria-modal','true'); o.setAttribute('aria-label','Buscar no painel');
    o.innerHTML='<div class="busca-cx"><div class="busca-topo"><label class="campo">'+LUPA+'<input id="buscaQ" type="search" autocomplete="off" autocapitalize="off" aria-label="Buscar"></label><button type="button" class="busca-x" id="buscaFecha">Cancelar</button></div><div id="buscaRes" class="busca-res" aria-live="polite"></div></div>';
    document.body.appendChild(o);
    o.addEventListener('click',function(e){ if(e.target===o) fecharBusca(); });
    $('buscaFecha').addEventListener('click',fecharBusca);
    $('buscaQ').addEventListener('input',pintarBusca);
    $('buscaQ').addEventListener('keydown',function(e){ if(e.key==='Enter'){ var p=$('buscaRes').querySelector('[data-abre]'); if(p){ e.preventDefault(); p.click(); } } });
    return o;
  }
  function abrirBusca(modo){
    buscaModo=modo||''; var o=criaBusca(); o.hidden=false; document.documentElement.classList.add('busca-aberta');
    var q=$('buscaQ'); q.value='';
    q.placeholder=buscaModo==='vender'?'Qual beat vendeu?':buscaModo==='link'?'De qual artista ou tape?':'Beat, pedido, cupom, artista ou e-mail';
    pedirEntrega(); pedirLista();
    espera('CaramujoVitrine',function(V){ if(V.garantir) V.garantir(pintarBusca); });
    pintarBusca(); setTimeout(function(){ try{ q.focus(); }catch(_){ } },30);
  }
  window.__painelBusca=abrirBusca;
  function fecharBusca(){ var o=$('busca'); if(o) o.hidden=true; document.documentElement.classList.remove('busca-aberta'); }
  function semAcento(s){ return String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase(); }
  function pintarBusca(){
    var o=$('busca'); if(!o||o.hidden) return;
    var bruto=$('buscaQ').value, q=semAcento(bruto).trim(), res=$('buscaRes');
    var V=(window.CaramujoVitrine&&window.CaramujoVitrine.dados)?window.CaramujoVitrine.dados():{};
    var lj=V.loja, rl=V.rel, midia=V.midia||{};
    var tem=function(t){ return semAcento(t).indexOf(q)>-1; };
    var vazioModo=!q&&buscaModo;           // nos atalhos, a lista já aparece antes de digitar
    if(!q&&!buscaModo){ res.innerHTML='<p class="busca-dica">Procura em beats do site e da fila, pedidos, cupons, artistas, tapes e e-mails da lista. No computador, ⌘K (ou Ctrl+K) abre daqui de qualquer tela.</p>'; return; }
    var G=[];
    var thumb=function(id){ var m=midia[id]; return '<span class="bt-th">'+(m&&m.capa?'<img src="'+esc(m.capa)+'" alt="" loading="lazy">':'')+'</span>'; };
    if(buscaModo!=='link'){
      var bs=((lj&&lj.beats)||[]).filter(function(b){ return (buscaModo!=='vender'||!b.sold)&&(vazioModo||tem(b.name)||tem((lj.generos&&lj.generos[b.genre])||'')); });
      if(bs.length) G.push(['No site',bs.slice(0,vazioModo?12:6).map(function(b){
        var f=[(lj.generos&&lj.generos[b.genre])||b.genre,b.bpm?b.bpm+' BPM':'',b.key].filter(Boolean).join(' · ');
        return '<div class="bq-l" data-abre="beat" data-id="'+b.id+'">'+thumb(b.id)+'<span class="t"><b>'+esc(b.name)+'</b><small>'+esc(f)+(b.sold?' · vendido':' · à venda')+'</small></span>'+(b.sold?'':'<button type="button" class="btn" data-vende="'+b.id+'">Vendido</button>')+'</div>';
      }).join(''),bs.length]);
    }
    if(!buscaModo){
      var fl=((rl&&rl.semBotao)||[]).filter(function(t){ return tem(t.title)||tem(t.tape); });
      if(fl.length) G.push(['Pra publicar',fl.slice(0,5).map(function(t){
        return '<div class="bq-l" data-abre="fila" data-id="'+esc(t.id)+'"><span class="bt-th"></span><span class="t"><b>'+esc(t.title)+'</b><small>'+esc([t.tape,t.bpm?t.bpm+' BPM':'',t.key].filter(Boolean).join(' · '))+'</small></span><button type="button" class="btn" data-publica="'+esc(t.id)+'">Publicar</button></div>';
      }).join(''),fl.length]);
      var ps=((entrega&&entrega.pedidos)||[]).filter(function(p){ return tem(p.quem)||tem(p.beats.join(' '))||tem((p.servicos||[]).map(function(x){return x.nome}).join(' ')); });
      if(ps.length) G.push(['Pedidos',ps.slice(0,5).map(function(p){ return linhaPedido(p).replace('class="lin ped"','class="lin ped bq-l" data-abre="pedido"'); }).join(''),ps.length]);
      var cs=((lj&&lj.cupons)||[]).filter(function(c){ return tem(c.codigo); });
      if(cs.length) G.push(['Cupons',cs.slice(0,5).map(function(c){
        var u=c.max_usos==null?c.usos+(c.usos===1?' uso':' usos'):c.usos+' de '+c.max_usos+' usos';
        return '<div class="bq-l" data-abre="cupom" data-cod="'+esc(c.codigo)+'"><span class="t"><b>'+esc(c.codigo)+'</b><small>'+(c.preco_fixo!=null?'R$ '+c.preco_fixo+' no total':c.pct+'% de desconto')+' · '+u+(c.ativo?'':' · pausado')+'</small></span></div>';
      }).join(''),cs.length]);
    }
    if(buscaModo!=='vender'){
      var as=artistas.concat(tapes).filter(function(a){ return vazioModo||tem(a.name); });
      if(as.length) G.push([buscaModo==='link'?'Artistas e tapes':'Artistas e tapes',as.slice(0,vazioModo?20:6).map(function(a){
        return '<div class="bq-l" data-abre="pasta" data-id="'+a.id+'">'+capaLista(a)+'<span class="t"><b>'+esc(a.name)+'</b><small>'+(a.tipo==='tape'?'tape · ':'')+conta(a)+' · '+tempo(a.visto)+'</small></span><button type="button" class="btn" data-link="'+a.id+'">Link</button></div>';
      }).join(''),as.length]);
    }
    if(!buscaModo&&q.length>1){
      var es=((lista&&lista.emails)||[]).filter(function(e){ return tem(e); });
      if(es.length) G.push(['Lista de e-mails',es.slice(0,5).map(function(e){
        return '<div class="bq-l" data-abre="email"><span class="t"><b>'+esc(e)+'</b><small>na lista do cupom</small></span><button type="button" class="btn" data-copia="'+esc(e)+'">Copiar</button></div>';
      }).join(''),es.length]);
    }
    var carregando=(buscaModo!=='link'&&!lj)||(!buscaModo&&!entrega);
    res.innerHTML=G.length?G.map(function(g){ return '<div class="bq-rot">'+g[0]+(g[2]>5?' <i class="n-cz">'+g[2]+'</i>':'')+'</div>'+g[1]; }).join(''):'<p class="busca-dica">'+(carregando?'carregando…':'Nada com "'+esc(bruto)+'".')+'</p>';
    var porId=function(id){ return ((lj&&lj.beats)||[]).filter(function(b){ return b.id===Number(id); })[0]; };
    res.querySelectorAll('[data-abre]').forEach(function(l){ l.addEventListener('click',function(e){
      if(e.target.closest('button')) return;
      var k=l.dataset.abre, Vm=window.CaramujoVitrine;
      if(k==='beat'){ fecharBusca(); irPara('vitrine'); espera('CaramujoVitrine',function(V){ if(V.abrirBeat) V.abrirBeat(Number(l.dataset.id)); }); }
      else if(k==='fila'){ fecharBusca(); irPara('fila'); espera('CaramujoVitrine',function(V){ if(V.abrirPublicar) V.abrirPublicar(l.dataset.id); }); }
      else if(k==='pedido'){ var p=((entrega&&entrega.pedidos)||[]).filter(function(x){ return x.token===l.dataset.t; })[0]; fecharBusca(); if(p) abrirPedido(p); }
      else if(k==='cupom'){ fecharBusca(); irPara('cupons'); espera('CaramujoVitrine',function(V){ if(V.abrirCupom) V.abrirCupom(l.dataset.cod); }); }
      else if(k==='pasta'){ var a=artistas.concat(tapes).filter(function(x){ return x.id===Number(l.dataset.id); })[0]; fecharBusca(); if(a){ irPara(a.tipo==='tape'?'tapes':'artistas'); abrir(a); } }
      else if(k==='email'){ fecharBusca(); irPara('lista'); }
    }); });
    res.querySelectorAll('[data-vende]').forEach(function(b){ b.addEventListener('click',function(){
      var bt=porId(b.dataset.vende); if(!bt) return;
      if(!b.classList.contains('conf')){ b.classList.add('conf'); b.textContent='Confirmar?'; clearTimeout(b._t); b._t=setTimeout(function(){ b.classList.remove('conf'); b.textContent='Vendido'; },4000); return; }
      b.disabled=true; b.textContent='Marcando…';
      acao('beat-vender',{id:bt.id,confirmo:true}).then(function(j){
        if(!j||!j.ok){ b.disabled=false; b.classList.remove('conf'); b.textContent='Vendido'; flash((j&&j.erro)||'Não consegui marcar.'); return; }
        flash(bt.name+' marcado como vendido.'); bt.sold=1;
        var Vm=window.CaramujoVitrine; if(Vm&&Vm.recarregar) Vm.recarregar(); pintarBusca();
      });
    }); });
    res.querySelectorAll('[data-publica]').forEach(function(b){ b.addEventListener('click',function(){
      var id=b.dataset.publica; fecharBusca(); irPara('fila'); espera('CaramujoVitrine',function(V){ if(V.abrirPublicar) V.abrirPublicar(id); });
    }); });
    res.querySelectorAll('[data-link]').forEach(function(b){ b.addEventListener('click',function(){
      var a=artistas.concat(tapes).filter(function(x){ return x.id===Number(b.dataset.link); })[0]; if(a) copiar(a);
    }); });
    res.querySelectorAll('[data-copia]').forEach(function(b){ b.addEventListener('click',function(){
      var t=b.dataset.copia; (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){ flash('E-mail copiado.'); }).catch(function(){ prompt('Copie o e-mail:',t); });
    }); });
  }
  $('buscaBtn').addEventListener('click',function(){ abrirBusca(); });
  document.addEventListener('keydown',function(e){
    if((e.metaKey||e.ctrlKey)&&String(e.key).toLowerCase()==='k'){ e.preventDefault(); var o=$('busca'); if(o&&!o.hidden) fecharBusca(); else abrirBusca(); return; }
    if(e.key==='Escape'){ var b=$('busca'); if(b&&!b.hidden){ fecharBusca(); return; } if(!$('veil').hidden) fechar(); }
  });

  var tid;
  window.__painelFlash=function(m){ flash(m); };
  window.__painelFechar=function(){ fechar(); };
  function flash(m){
    clearTimeout(tid);
    var el=$('toast');el.textContent=m;el.hidden=false;el.style.opacity='1';
    tid=setTimeout(function(){el.style.opacity='0';setTimeout(function(){el.hidden=true},260)},2600);
  }

  carregar();
  // /painel#<seção> abre direto nela; as telas que
  // vêm de arquivo à parte (defer) esperam o arquivo chegar
  (function(){
    // volta do atalho "Plays Caramujo" (rodada N): #gravou&plays=<id>:<n>,... (o gravou.js guarda)
    var hh=location.hash.replace('#','').split('&plays='); if(hh[1]) window.__gvPlays=hh[1];
    var h=hh[0];
    if(!h||!TITULOS[h]){ iniciarHistorico('hoje'); desenhar(); return; }
    iniciarHistorico(h);
    var precisa={musicas:'CaramujoMusicas',gravou:'CaramujoGravou',analytics:'CaramujoAnalytics',vitrine:'CaramujoVitrine',fila:'CaramujoVitrine',cupons:'CaramujoVitrine'}[h];
    var tenta=0;
    (function vai(){ if(!precisa||window[precisa]||tenta++>40){ irPara(h,true); return; } setTimeout(vai,50); })();
  })();
})();
