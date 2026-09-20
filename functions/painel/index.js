// Painel privado do rideblan33. Só abre com a senha guardada em PAINEL_SENHA.
// Mostra os artistas, o link de cada um, a permissão de download e quem ouviu o quê.

import { COOKIE, DIAS, assinar, igual, autenticado } from '../_lib/sessao.js';

/* ---------- entrada ---------- */

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (!env.PAINEL_SENHA) return html(aviso('Falta a senha do painel'), 500);

  if (request.method === 'POST') {
    const form = await request.formData();
    const senha = String(form.get('senha') || '');
    if (!igual(senha, env.PAINEL_SENHA)) {
      return html(telaSenha('Senha errada.'), 401);
    }
    const t = await assinar(env, Date.now() + DIAS * 864e5);
    return new Response(null, {
      status: 303,
      headers: {
        location: url.pathname,
        'set-cookie': `${COOKIE}=${t}; Path=/; Max-Age=${DIAS * 86400}; HttpOnly; Secure; SameSite=Lax`
      }
    });
  }

  if (!(await autenticado(request, env))) return html(telaSenha(), 401);
  return html(pagina());
}

function html(corpo, status = 200) {
  return new Response(corpo, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex'
    }
  });
}

/* ---------- telas ---------- */

const BASE = `
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<link rel="icon" type="image/svg+xml" href="/assets/brand/selo-creme.svg">
<link rel="icon" type="image/png" href="/assets/brand/Caramujo_Records.png">
<meta name="theme-color" content="#0a0a0a">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700&display=swap">
<style>
  :root{--ink:#fff;--ink2:#b7b7b7;--ink3:#8a8a8a;--ink4:#6a6a6a;--linha:#1f1f1f;--campo:#141414;--borda:#252525}
  *{box-sizing:border-box}
  html,body{height:100%}
  body{margin:0;background:#0a0a0a;color:var(--ink);
    font-family:"Schibsted Grotesk",-apple-system,"Helvetica Neue",Helvetica,Arial,sans-serif;
    -webkit-font-smoothing:antialiased}
  button,input,textarea,select{font-family:inherit;color:inherit}
  a{color:#fff}
  :focus-visible{outline:2px solid #fff;outline-offset:2px}
  .wrap{max-width:760px;margin:0 auto;padding:0 18px 120px}
  .topo{display:flex;align-items:center;justify-content:space-between;
    padding:18px 0 6px;padding-top:calc(18px + env(safe-area-inset-top,0px))}
  .marca{width:148px;height:27px;background:url('/assets/brand/caramujo-h.webp') left center/contain no-repeat;opacity:.9}
  .so{font-size:12px;color:var(--ink4)}
  h1{margin:22px 0 4px;font-size:34px;font-weight:700;letter-spacing:-.02em}
  .sub{font-size:14px;color:var(--ink4)}
  .barra{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0 6px}
  .barra .pill{flex:0 0 auto}
  @media (max-width:560px){
    .campo{flex:1 1 100%}
    .barra .pill{margin-left:auto}
    h1{font-size:30px}
    .wrap{padding:0 16px 120px}
  }
  .campo{flex:1;display:flex;align-items:center;gap:10px;background:var(--campo);
    border:1px solid var(--borda);border-radius:12px;padding:11px 14px}
  .campo input{flex:1;min-width:0;background:transparent;border:0;outline:none;font-size:15px}
  .campo input::placeholder{color:#5a5a5a}
  .pill{display:flex;align-items:center;gap:7px;padding:11px 16px;border-radius:999px;
    border:1px solid var(--borda);background:#181818;font-size:14px;font-weight:500;cursor:pointer;white-space:nowrap}
  .pill.solid{background:#fff;color:#000;border-color:#fff}
  .pill:disabled{opacity:.45;cursor:default}
  .linha{display:flex;align-items:center;gap:14px;padding:14px 0;border:0;min-width:0;
    background:transparent;width:100%;text-align:left;cursor:pointer}
  .item{display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--linha)}
  .item .linha{flex:1;min-width:0}
  .nome{display:block;font-size:16px;font-weight:600;line-height:1.25;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .meta{display:block;margin-top:4px;font-size:12.5px;color:var(--ink3);line-height:1.3;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .copiar{width:42px;height:42px;flex-shrink:0;border-radius:11px;border:1px solid var(--borda);
    background:#141414;display:flex;align-items:center;justify-content:center;cursor:pointer}
  .vazio{padding:40px 0;color:#5a5a5a;font-size:14px}
  .andamento{display:flex;align-items:center;gap:10px;margin-top:8px}
  .trilho{flex:1;height:4px;border-radius:3px;background:#242424;overflow:hidden}
  .trilho i{display:block;height:4px;background:#fff;width:0;transition:width .4s ease}
  .trilho.indef i{width:35%;animation:vaivem 1.1s ease-in-out infinite}
  @keyframes vaivem{0%{margin-left:-35%}100%{margin-left:100%}}
  .andamento small{font-size:11.5px;color:var(--ink3);white-space:nowrap;font-variant-numeric:tabular-nums}
  @media (prefers-reduced-motion:reduce){.trilho.indef i{animation:none;width:100%;opacity:.4}}
  .veil{position:fixed;inset:0;z-index:30;background:rgba(0,0,0,.65);display:flex;align-items:flex-end;justify-content:center}
  .veil[hidden]{display:none}
  .card{width:100%;max-width:560px;background:#141414;border:1px solid var(--borda);
    border-radius:20px 20px 0 0;padding:20px 18px calc(24px + env(safe-area-inset-bottom,0px));
    max-height:86vh;overflow-y:auto}
  .card h2{margin:0 0 3px;font-size:20px;font-weight:700;overflow-wrap:anywhere}
  .card .end{font-size:13px;color:var(--ink4);word-break:break-all}
  .bloco{margin-top:20px}
  .rot{font-size:11px;letter-spacing:.2em;color:var(--ink4);margin-bottom:10px}
  .desc{width:100%;min-height:104px;resize:vertical;background:var(--campo);border:1px solid var(--borda);
    border-radius:12px;padding:12px 14px;font-size:14.5px;line-height:1.5;outline:none;
    color:var(--ink);caret-color:var(--ink)}
  .desc::placeholder{color:#5a5a5a}
  .desc:focus{border-color:#3a3a3a}
  .desc-baixo{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:8px}
  .desc-baixo small{font-size:11.5px;color:var(--ink4);font-variant-numeric:tabular-nums}
  .seta{flex:none;color:var(--ink4);font-size:20px;line-height:1}
  .revisar{border:1px solid #3a2f18;background:#16120a;border-radius:14px;padding:14px 16px;margin:6px 0 14px}
  .revisar b{display:block;font-size:14.5px;font-weight:600}
  .revisar>small{display:block;color:var(--ink3);font-size:12.5px;line-height:1.45;margin-top:4px}
  .revisar ul{list-style:none;margin:12px 0 0;padding:0;display:flex;flex-direction:column;gap:9px}
  .revisar li span{display:block;font-size:14px}
  .revisar li small{display:block;color:var(--ink4);font-size:12px;line-height:1.4}
  .sw{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:13px 0;border-bottom:1px solid var(--linha)}
  .sw b{font-size:15px;font-weight:500}
  .sw small{display:block;margin-top:3px;font-size:12px;color:var(--ink4)}
  .toggle{width:50px;height:30px;border-radius:999px;border:1px solid var(--borda);background:#242424;
    position:relative;cursor:pointer;flex-shrink:0;transition:background .15s}
  .toggle i{position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#8a8a8a;transition:.15s}
  .toggle[aria-pressed="true"]{background:#fff;border-color:#fff}
  .toggle[aria-pressed="true"] i{left:23px;background:#000}
  .numeros{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}
  .numeros div{background:#101010;border:1px solid var(--borda);border-radius:12px;padding:12px 10px}
  .numeros b{display:block;font-size:21px;font-weight:700;line-height:1.1;font-variant-numeric:tabular-nums}
  .numeros span{display:block;margin-top:6px;font-size:10px;letter-spacing:.09em;color:var(--ink4);
    text-transform:uppercase;line-height:1.3}
  .pag{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px}
  .pag button{width:38px;height:38px;border-radius:10px;border:1px solid var(--borda);background:#141414;
    color:#fff;font-size:16px;cursor:pointer}
  .pag button:disabled{opacity:.35;cursor:default}
  .pag small{font-size:12px;color:var(--ink4);font-variant-numeric:tabular-nums}
  .ev{display:flex;gap:10px;padding:9px 0;font-size:13px;color:var(--ink2);border-bottom:1px solid #161616}
  .ev span:first-child{color:var(--ink4);width:96px;flex-shrink:0;font-variant-numeric:tabular-nums}
  .acoes{display:flex;gap:10px;margin-top:20px}
  .acoes .pill{flex:1;justify-content:center}
  .toast{position:fixed;left:50%;transform:translateX(-50%);bottom:26px;z-index:60;background:#1d1d1d;
    border:1px solid #2d2d2d;font-size:13px;padding:11px 15px;border-radius:12px;transition:opacity .25s}
  .toast[hidden]{display:none}
  .login{min-height:100%;display:flex;align-items:center;justify-content:center;padding:24px}
  .login form{width:100%;max-width:320px;text-align:center}
  .login .marca{margin:0 auto 26px}
  .login input{width:100%;background:var(--campo);border:1px solid var(--borda);border-radius:12px;
    padding:14px;font-size:16px;text-align:center;outline:none}
  .login button{width:100%;margin-top:12px;padding:14px;border-radius:12px;border:0;background:#fff;color:#000;
    font-size:15px;font-weight:600;cursor:pointer}
  .erro{margin-top:14px;font-size:13px;color:#e08d7e}
</style>`;

function telaSenha(erro) {
  return `<!doctype html><html lang="pt-BR"><head><title>Painel · Caramujo</title>${BASE}</head>
<body><div class="login"><form method="post">
  <div class="marca"></div>
  <input type="password" name="senha" placeholder="senha" autofocus autocomplete="current-password">
  <button type="submit">Entrar</button>
  ${erro ? `<div class="erro">${erro}</div>` : ''}
</form></div></body></html>`;
}

function aviso(texto) {
  return `<!doctype html><html lang="pt-BR"><head><title>Painel</title>${BASE}</head>
<body><div class="login"><div><div class="marca"></div><p class="sub">${texto}</p></div></div></body></html>`;
}

function pagina() {
  return `<!doctype html><html lang="pt-BR"><head><title>Painel · Caramujo</title>${BASE}</head>
<body>
<div class="wrap">
  <div class="topo"><div class="marca"></div><span class="so">só você vê</span></div>
  <h1>Seus artistas</h1>
  <div class="sub" id="resumo">carregando…</div>

  <div class="barra">
    <div class="campo">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6a6a6a" stroke-width="1.9"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.6-4.6"/></svg>
      <label for="q" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Buscar artista</label>
      <input id="q" type="search" placeholder="Buscar artista" autocomplete="off">
    </div>
    <button class="pill" id="ordemBtn" type="button">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M8 4v16"/><path d="M5 7l3-3 3 3"/><path d="M16 20V4"/><path d="M13 17l3 3 3-3"/></svg>
      <span id="ordemLabel">Atividade</span>
    </button>
    <button class="pill" id="syncTudo" type="button">Converter tudo</button>
  </div>

  <div id="lista"><div class="vazio">carregando…</div></div>
</div>

<div class="veil" id="veil" hidden><div class="card" id="card" role="dialog" aria-modal="true"></div></div>
<div class="toast" id="toast" hidden></div>

<script>
(function(){
  var $=function(i){return document.getElementById(i)};
  var artistas=[], tapes=[], revisar=[], vista='artistas', filtro='', ordem='atividade';
  var ORDENS={atividade:'Atividade', az:'A a Z', faixas:'Mais faixas'};

  function tempo(iso){
    if(!iso) return 'nunca abriu';
    var d=(Date.now()-new Date(iso).getTime())/1000;
    if(d<3600) return 'aberto agora há pouco';
    if(d<86400) return 'aberto hoje';
    var dias=Math.floor(d/86400);
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

  var relogio=null;
  function acompanhar(){
    var ativo = artistas.some(rodando);
    if(ativo && !relogio) relogio=setInterval(function(){carregar(true)}, 3000);
    if(!ativo && relogio){ clearInterval(relogio); relogio=null; }
  }

  function carregar(silencioso){
    fetch('/api/painel?op=artistas').then(function(r){return r.json()}).then(function(j){
      var antes=artistas.filter(rodando).length;
      var todos=j.artistas||[];
      artistas=todos.filter(function(a){return a.tipo!=='tape'});
      tapes=todos.filter(function(a){return a.tipo==='tape'});
      $('resumo').textContent = artistas.length+(artistas.length===1?' artista no ar':' artistas no ar')+
        (tapes.length?' · '+tapes.length+(tapes.length===1?' beat tape':' beat tapes'):'')+
        ' · prateleira '+gb(j.prateleira.usado)+' de 8 GB';
      desenhar();
      acompanhar();
      if(tapes.length) fetch('/api/painel?op=revisar').then(function(r){return r.json()})
        .then(function(x){ revisar=x.faixas||[]; desenhar(); }).catch(function(){});
      if(silencioso && antes && !artistas.filter(rodando).length) flash('Conversão terminou.');
    }).catch(function(){
      if(!silencioso) $('lista').innerHTML='<div class="vazio">Não consegui carregar. Recarrega a página.</div>';
    });
  }

  function desenhar(){
    var fonte = vista==='tapes' ? tapes : artistas;
    var alvo=fonte.filter(function(a){
      return !filtro || a.name.toLowerCase().indexOf(filtro)>-1;
    });
    alvo.sort(function(a,b){
      if(ordem==='az') return a.name.localeCompare(b.name,'pt-BR',{sensitivity:'base'});
      if(ordem==='faixas') return ((b.nb||0)+(b.ns||0)) - ((a.nb||0)+(a.ns||0));
      // atividade: quem abriu mais recente primeiro, quem nunca abriu por último
      if(!a.visto && !b.visto) return a.name.localeCompare(b.name,'pt-BR',{sensitivity:'base'});
      if(!a.visto) return 1;
      if(!b.visto) return -1;
      return a.visto < b.visto ? 1 : -1;
    });
    $('lista').innerHTML='';

    if(vista==='tapes'){ $('lista').appendChild(voltar()); cartaoRevisar(); }
    else if(tapes.length && !filtro) $('lista').appendChild(fixo());

    if(!alvo.length){
      var v=document.createElement('div'); v.className='vazio';
      v.textContent = vista==='tapes'
        ? (filtro?'Nenhuma tape com esse nome.':'Nenhuma beat tape convertida ainda.')
        : 'Nenhum artista com esse nome.';
      $('lista').appendChild(v);
      return;
    }
    alvo.forEach(function(a){
      var row=document.createElement('div');
      row.className='item';
      var b=document.createElement('button');
      b.type='button';b.className='linha';
      b.innerHTML='<span style="flex:1;min-width:0"><span class="nome">'+esc(a.name)+'</span>'+
        (rodando(a) ? barra(a) : '<span class="meta">'+conta(a)+' · '+tempo(a.visto)+'</span>')+'</span>';
      b.addEventListener('click',function(){abrir(a)});
      var c=document.createElement('button');
      c.type='button';c.className='copiar';c.setAttribute('aria-label','Copiar link de '+a.name);
      c.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b7b7b7" stroke-width="1.7"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a1 1 0 011-1h9"/></svg>';
      c.addEventListener('click',function(e){e.stopPropagation();copiar(a)});
      row.appendChild(b);row.appendChild(c);
      $('lista').appendChild(row);
    });
  }
  // @rideblan33 mora fixo no topo e leva pro portfólio
  function fixo(){
    var row=document.createElement('div'); row.className='item';
    var b=document.createElement('button');
    b.type='button'; b.className='linha';
    b.innerHTML='<span style="flex:1;min-width:0"><span class="nome">@rideblan33</span>'+
      '<span class="meta">'+tapes.length+(tapes.length===1?' beat tape':' beat tapes')+
      (revisar.length?' · '+revisar.length+' pra revisar':'')+'</span></span>'+
      '<span class="seta">›</span>';
    b.addEventListener('click',function(){
      vista='tapes'; filtro=''; $('q').value=''; $('q').placeholder='Buscar beat tape'; desenhar();
    });
    row.appendChild(b);
    return row;
  }

  function voltar(){
    var row=document.createElement('div'); row.className='item';
    var b=document.createElement('button');
    b.type='button'; b.className='linha';
    b.innerHTML='<span class="seta" style="transform:rotate(180deg)">›</span>'+
      '<span style="flex:1;min-width:0"><span class="nome">Beat tapes</span>'+
      '<span class="meta">@rideblan33 · voltar pros artistas</span></span>';
    b.addEventListener('click',function(){
      vista='artistas'; filtro=''; $('q').value=''; $('q').placeholder='Buscar artista'; desenhar();
    });
    row.appendChild(b);
    return row;
  }

  function cartaoRevisar(){
    if(!revisar.length) return;
    var d=document.createElement('div');
    d.className='revisar';
    d.innerHTML='<b>'+revisar.length+(revisar.length===1?' beat pra revisar':' beats pra revisar')+'</b>'+
      '<small>Caíram em Exclusivos e na pasta de um artista ao mesmo tempo, ou em nenhum dos dois. '+
      'Saem sem tag no catálogo até você resolver no Drive.</small>'+
      '<ul>'+revisar.map(function(f){
        return '<li><span>'+esc(f.title)+'</span><small>'+esc(f.tape)+' — '+esc(f.revisar)+'</small></li>';
      }).join('')+'</ul>';
    $('lista').appendChild(d);
  }

  function conta(a){
    var p=[];
    if(a.nb) p.push(a.nb+(a.nb===1?' beat':' beats'));
    if(a.ns) p.push(a.ns+(a.ns===1?' música':' músicas'));
    return p.join(', ')||'sem faixa pronta';
  }
  function link(a){ return location.origin+'/'+a.slug+'/'+a.code }

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
    return '<span class="andamento"><span class="trilho'+(indef?' indef':'')+'"><i style="width:'+pct+'%"></i></span>'+
      '<small>'+texto+'</small></span>';
  }

  function copiar(a){
    var u=link(a);
    if(navigator.clipboard) navigator.clipboard.writeText(u);
    flash('Link do '+a.name+' copiado.');
  }

  function abrir(a){
    var c=$('card');
    c.innerHTML=
      '<h2>'+esc(a.name)+'</h2><div class="end">'+esc(link(a).replace(/^https?:\\/\\//,''))+'</div>'+
      '<div class="acoes">'+
        '<button class="pill solid" data-act="copiar" type="button">Copiar link</button>'+
        '<button class="pill" data-act="abrir" type="button">Abrir</button>'+
      '</div>'+
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
      Object.keys(ORDENS).map(function(k){
        return '<button type="button" data-ordem="'+k+'">'+
          '<span style="width:18px;display:flex">'+(ordem===k?'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4"><path d="M5 12.5l5 5 9-10"/></svg>':'')+'</span>'+
          ORDENS[k]+'</button>';
      }).join('')+
      '</div><button class="pill" data-close type="button" style="width:100%;justify-content:center;margin-top:14px">Fechar</button>';
    $('veil').hidden=false;
    c.querySelector('[data-close]').addEventListener('click',fechar);
    c.querySelectorAll('[data-ordem]').forEach(function(b){
      b.addEventListener('click',function(){
        ordem=b.dataset.ordem;
        $('ordemLabel').textContent=ORDENS[ordem];
        fechar();
      });
    });
  });
  $('syncTudo').addEventListener('click',function(e){
    var b=e.currentTarget;b.disabled=true;b.textContent='Mandando…';
    acao('sync',{}).then(function(j){
      b.disabled=false;b.textContent='Converter tudo';
      if(!j.ok){ flash(j.erro||'Não consegui disparar.'); return; }
      flash('Conversão de todo mundo começou.');
      artistas.forEach(function(x){ x.job_estado='na fila';x.job_total=0;x.job_feitos=0;x.job_at=new Date().toISOString() });
      desenhar();acompanhar();carregar(true);
    });
  });

  var tid;
  function flash(m){
    clearTimeout(tid);
    var el=$('toast');el.textContent=m;el.hidden=false;el.style.opacity='1';
    tid=setTimeout(function(){el.style.opacity='0';setTimeout(function(){el.hidden=true},260)},2600);
  }

  carregar();
})();
</script>
</body></html>`;
}
