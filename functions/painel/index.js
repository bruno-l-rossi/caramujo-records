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
  button,input{font-family:inherit;color:inherit}
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
  .veil{position:fixed;inset:0;z-index:30;background:rgba(0,0,0,.65);display:flex;align-items:flex-end;justify-content:center}
  .veil[hidden]{display:none}
  .card{width:100%;max-width:560px;background:#141414;border:1px solid var(--borda);
    border-radius:20px 20px 0 0;padding:20px 18px calc(24px + env(safe-area-inset-bottom,0px));
    max-height:86vh;overflow-y:auto}
  .card h2{margin:0 0 3px;font-size:20px;font-weight:700;overflow-wrap:anywhere}
  .card .end{font-size:13px;color:var(--ink4);word-break:break-all}
  .bloco{margin-top:20px}
  .rot{font-size:11px;letter-spacing:.2em;color:var(--ink4);margin-bottom:10px}
  .sw{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:13px 0;border-bottom:1px solid var(--linha)}
  .sw b{font-size:15px;font-weight:500}
  .sw small{display:block;margin-top:3px;font-size:12px;color:var(--ink4)}
  .toggle{width:50px;height:30px;border-radius:999px;border:1px solid var(--borda);background:#242424;
    position:relative;cursor:pointer;flex-shrink:0;transition:background .15s}
  .toggle i{position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#8a8a8a;transition:.15s}
  .toggle[aria-pressed="true"]{background:#fff;border-color:#fff}
  .toggle[aria-pressed="true"] i{left:23px;background:#000}
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
    <button class="pill" id="syncTudo" type="button">Converter tudo</button>
  </div>

  <div id="lista"><div class="vazio">carregando…</div></div>
</div>

<div class="veil" id="veil" hidden><div class="card" id="card" role="dialog" aria-modal="true"></div></div>
<div class="toast" id="toast" hidden></div>

<script>
(function(){
  var $=function(i){return document.getElementById(i)};
  var artistas=[], filtro='';

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

  function carregar(){
    fetch('/api/painel?op=artistas').then(function(r){return r.json()}).then(function(j){
      artistas=j.artistas||[];
      $('resumo').textContent = artistas.length+(artistas.length===1?' artista no ar':' artistas no ar')+
        ' · prateleira '+gb(j.prateleira.usado)+' de 8 GB';
      desenhar();
    }).catch(function(){ $('lista').innerHTML='<div class="vazio">Não consegui carregar. Recarrega a página.</div>' });
  }

  function desenhar(){
    var alvo=artistas.filter(function(a){
      return !filtro || a.name.toLowerCase().indexOf(filtro)>-1;
    });
    if(!alvo.length){ $('lista').innerHTML='<div class="vazio">Nenhum artista com esse nome.</div>'; return }
    $('lista').innerHTML='';
    alvo.forEach(function(a){
      var row=document.createElement('div');
      row.className='item';
      var b=document.createElement('button');
      b.type='button';b.className='linha';
      b.innerHTML='<span style="flex:1;min-width:0"><span class="nome">'+esc(a.name)+'</span>'+
        '<span class="meta">'+conta(a)+' · '+tempo(a.visto)+'</span></span>';
      b.addEventListener('click',function(){abrir(a)});
      var c=document.createElement('button');
      c.type='button';c.className='copiar';c.setAttribute('aria-label','Copiar link de '+a.name);
      c.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b7b7b7" stroke-width="1.7"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a1 1 0 011-1h9"/></svg>';
      c.addEventListener('click',function(e){e.stopPropagation();copiar(a)});
      row.appendChild(b);row.appendChild(c);
      $('lista').appendChild(row);
    });
  }
  function conta(a){
    var p=[];
    if(a.nb) p.push(a.nb+(a.nb===1?' beat':' beats'));
    if(a.ns) p.push(a.ns+(a.ns===1?' música':' músicas'));
    return p.join(', ')||'sem faixa pronta';
  }
  function link(a){ return location.origin+'/'+a.slug+'/'+a.code }

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
      '<div class="bloco"><div class="rot">PODE BAIXAR</div>'+
        sw('beats','Beats','os beats reservados e os já gravados',a.dl_beats)+
        sw('sons','Músicas','os sons prontos, lançados e as guias',a.dl_sons)+
      '</div>'+
      '<div class="bloco"><div class="rot">ÚLTIMAS AUDIÇÕES</div><div id="eventos">carregando…</div></div>'+
      '<div class="acoes">'+
        '<button class="pill" data-act="sync" type="button">Converter agora</button>'+
        '<button class="pill" data-close type="button">Fechar</button>'+
      '</div>';
    $('veil').hidden=false;
    c.querySelector('[data-close]').addEventListener('click',fechar);
    c.querySelector('[data-act=copiar]').addEventListener('click',function(){copiar(a)});
    c.querySelector('[data-act=abrir]').addEventListener('click',function(){window.open(link(a),'_blank','noopener')});
    c.querySelector('[data-act=sync]').addEventListener('click',function(e){
      var b=e.currentTarget;b.disabled=true;b.textContent='Mandando…';
      acao('sync',{artista:a.name}).then(function(j){
        flash(j.ok?'Conversão do '+a.name+' começou. Leva uns minutos.':(j.erro||'Não consegui disparar.'));
        b.disabled=false;b.textContent='Converter agora';
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
    fetch('/api/painel?op=eventos&id='+a.id).then(function(r){return r.json()}).then(function(j){
      var e=$('eventos');
      if(!j.eventos||!j.eventos.length){ e.innerHTML='<div class="vazio" style="padding:14px 0">Ninguém abriu ainda.</div>'; return }
      e.innerHTML=j.eventos.map(function(x){
        return '<div class="ev"><span>'+quando(x.at)+'</span><span>'+rotulo(x)+'</span></div>';
      }).join('');
    });
  }
  function sw(campo,titulo,desc,valor){
    return '<div class="sw"><span><b>'+titulo+'</b><small>'+desc+'</small></span>'+
      '<button class="toggle" type="button" data-campo="'+campo+'" aria-pressed="'+(valor?'true':'false')+'" aria-label="'+titulo+'"><i></i></button></div>';
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
  $('syncTudo').addEventListener('click',function(e){
    var b=e.currentTarget;b.disabled=true;b.textContent='Mandando…';
    acao('sync',{}).then(function(j){
      flash(j.ok?'Conversão de todo mundo começou.':(j.erro||'Não consegui disparar.'));
      b.disabled=false;b.textContent='Converter tudo';
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
