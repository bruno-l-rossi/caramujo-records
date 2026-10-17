/* Quem já gravou (16/10/2026, rodada K): Perfil > Quem já gravou.
   A página caramujorecords.com.br/rideblan33/artistas e a linha no fim da aba Músicas.
   - A lista vem conferida (functions/_lib/gravou-lista.js): artistas que aparecem junto
     com o @rideblan33 em faixas do Spotify. Aqui você esconde artista ou faixa.
   - "Buscar fotos e capas": o servidor lê as páginas públicas do Spotify em lotes (foto,
     capa e ouvintes mensais) e guarda as imagens no nosso R2. Chama sozinho até acabar.
   - "Atualizar" (17/10/2026): lê tudo de novo (foto trocada, ouvintes do mês). A página
     ordena por ouvintes mensais; diferença pequena (menos de 35%) = quem tem mais faixas.
   - "No ar": desligado, só quem está logado no painel vê a página (prévia).
   Carregado só pelo /painel. Os dados vêm de /api/painel (exige o login). */
(function () {
  var CSS = [
    '.gv-topo{background:#101010;border:1px solid var(--borda);border-radius:14px;padding:4px 14px 12px;margin:18px 0 12px}',
    '.gv-topo .sw{border-bottom:0;padding:12px 0 8px}',
    '.gv-topo a{font-size:13px;color:var(--ink2);text-underline-offset:3px}',
    '.gv-img{display:flex;align-items:center;gap:12px;background:#101010;border:1px solid var(--borda);border-radius:14px;padding:12px 14px;margin-bottom:16px}',
    '.gv-img div{flex:1;min-width:0}',
    '.gv-img b{display:block;font-size:14px;font-weight:600}',
    '.gv-img small{display:block;margin-top:3px;font-size:12.5px;color:var(--ink4);line-height:1.4}',
    '.gv-img .pill{flex:none;padding:9px 14px;font-size:13px}',
    '.gv-busca{margin-bottom:6px}',
    '.gv-sec{margin-top:20px}',
    '.gv-sec>b{display:block;font-size:11px;letter-spacing:.2em;color:var(--ink3);text-transform:uppercase;margin-bottom:4px}',
    '.gv-sec>small{display:block;font-size:12px;color:var(--ink4);margin-bottom:6px;line-height:1.4}',
    '.gv-lista{list-style:none;margin:0;padding:0}',
    '.gv-lista>li{border-bottom:1px solid var(--linha)}',
    '.gv-lista>li[hidden]{display:none}',
    '.gv-art{display:flex;align-items:center;gap:12px;padding:10px 0}',
    '.gv-abre{flex:1;min-width:0;display:flex;align-items:center;gap:12px;background:none;border:0;padding:0;color:inherit;font:inherit;text-align:left;cursor:pointer}',
    '.gv-foto{width:44px;height:44px;flex:none;border-radius:50%;overflow:hidden;background:#1c1c1c;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:var(--ink3)}',
    '.gv-foto img{width:100%;height:100%;object-fit:cover;display:block}',
    '.gv-txt{min-width:0;flex:1}',
    '.gv-txt b{display:block;font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.gv-txt small{display:block;margin-top:3px;font-size:12.5px;color:var(--ink3);line-height:1.35}',
    '.gv-txt em{font-style:normal;color:#e0b155}',
    '.gv-fora .gv-txt b,.gv-fora .gv-foto{opacity:.4}',
    '.gv-fx{list-style:none;margin:0 0 10px 56px;padding:0}',
    '.gv-fx[hidden]{display:none}',
    '.gv-fx li{display:flex;align-items:center;gap:10px;padding:7px 0;border-top:1px solid #161616}',
    '.gv-fx img,.gv-fx .gv-sem{width:36px;height:36px;flex:none;border-radius:5px;object-fit:cover;background:#1c1c1c}',
    '.gv-fx a{flex:1;min-width:0;color:inherit;text-decoration:none}',
    '.gv-fx a b{display:block;font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.gv-fx a small{display:block;font-size:12px;color:var(--ink4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.gv-fx li.gv-fora a{opacity:.4}',
    '.gv-fx .toggle{transform:scale(.85)}',
    '.gv-troca{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 10px 56px}',
    '.gv-troca .pill{padding:8px 12px;font-size:12.5px;cursor:pointer}',
    '.gv-troca small{flex-basis:100%;font-size:12px;color:var(--ink4)}',
    '.gv-ord{background:#101010;border:1px solid var(--borda);border-radius:14px;padding:12px 14px;margin-bottom:16px}',
    '.gv-ord-topo{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}',
    '.gv-ord-topo b{font-size:14px;font-weight:600}',
    '.gv-ord-modo{display:inline-flex;background:#141414;border:1px solid var(--borda);border-radius:999px;padding:3px}',
    '.gv-ord-modo button{border:0;background:none;color:var(--ink3);font:inherit;font-size:12.5px;padding:7px 12px;border-radius:999px;cursor:pointer}',
    '.gv-ord-modo button[aria-pressed=true]{background:#fff;color:#000;font-weight:600}',
    '.gv-ord small{display:block;margin-top:6px;font-size:12px;color:var(--ink4);line-height:1.4}',
    '.gv-ord-ver{margin-top:8px;background:none;border:0;color:var(--ink2);font:inherit;font-size:13px;text-decoration:underline;text-underline-offset:3px;cursor:pointer;padding:4px 0}',
    '.gv-ol{position:relative;list-style:none;margin:8px 0 0;padding:0;counter-reset:o}',
    '.gv-ol li{display:flex;align-items:center;gap:10px;padding:6px 0;border-top:1px solid #161616;background:#101010;counter-increment:o}',
    '.gv-ol li:before{content:counter(o);width:22px;flex:none;font-size:12px;color:var(--ink4);text-align:right}',
    '.gv-ol .gv-foto{width:34px;height:34px;font-size:11px}',
    '.gv-ol .t{flex:1;min-width:0;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.gv-ol .t small{display:inline;margin:0 0 0 6px;font-size:12px;color:var(--ink4)}',
    '.gv-ol li.pego{position:relative;z-index:2;box-shadow:0 8px 24px rgba(0,0,0,.6);background:#1a1a1a}',
    '.gv-alca{width:44px;height:40px;flex:none;display:flex;align-items:center;justify-content:center;color:#8a8a8a;cursor:grab;touch-action:none;background:transparent;border:0;border-radius:10px;padding:0}',
    '.gv-alca:focus-visible{outline:2px solid #fff;outline-offset:-2px}',
    '.gv-pl{background:#101010;border:1px solid var(--borda);border-radius:14px;padding:12px 14px;margin:-6px 0 16px}',
    '.gv-pl-topo{display:flex;align-items:center;gap:12px}',
    '.gv-pl-topo div{flex:1;min-width:0}',
    '.gv-pl b{display:block;font-size:14px;font-weight:600}',
    '.gv-pl small{display:block;margin-top:3px;font-size:12.5px;color:var(--ink4);line-height:1.45}',
    '.gv-pl .pill{flex:none;padding:9px 14px;font-size:13px}',
    '.gv-pl ol{margin:12px 0 0;padding:0 0 0 20px;font-size:13.5px;line-height:1.5;color:var(--ink2)}',
    '.gv-pl li{margin:0 0 12px}',
    '.gv-pl li small{color:var(--ink4)}',
    '.gv-atalho{display:inline-flex;align-items:center;gap:8px;margin-top:8px;padding:10px 16px;border-radius:999px;background:#fff;color:#000!important;font-weight:700;font-size:13px;text-decoration:none;cursor:grab}',
    '.gv-pl .gv-sp{display:inline-block;margin-top:8px;color:#fff;text-underline-offset:3px}',
    '@media (max-width:420px){.gv-fx,.gv-troca{margin-left:0}}'
  ].join('\n');

  var $ = function (i) { return document.getElementById(i); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function flash(m) { if (window.__painelFlash) window.__painelFlash(m); }
  function pedir(op) { return fetch('/api/painel?op=' + op).then(function (r) { return r.json(); }); }
  function acao(op, body) {
    return fetch('/api/painel?op=' + op, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {})
    }).then(function (r) { return r.json(); }).catch(function () { return { erro: 'Sem conexão. Tenta de novo.' }; });
  }
  var verOrdem = false, verPlays = false;
  /* Plays (17/10/2026, rodada N): o Spotify só mostra os plays pra quem está logado, e o servidor
     não loga. Então quem lê é o navegador do Bruno: o atalho "Plays Caramujo" (favorito) roda dentro
     do open.spotify.com, abre cada música da lista como uma pessoa faria (uma por vez, ~1 s cada),
     lê o número e volta pro painel com tudo no endereço (#gravou&plays=...). O painel guarda. */
  function codigoAtalho(ids) {
    var c = '(async()=>{' +
      'if(!/(^|\\.)open\\.spotify\\.com$/.test(location.hostname)){alert("Abra o open.spotify.com (logado) e toque no Plays Caramujo de novo.");return}' +
      'if(document.querySelector(\'[data-testid="login-button"]\')){alert("Entre na sua conta do Spotify antes: sem login ele não mostra os plays.");return}' +
      'const ids=' + JSON.stringify(ids) + ';' +
      'const sl=m=>new Promise(r=>setTimeout(r,m));' +
      'const go=p=>{history.pushState({},"",p);dispatchEvent(new PopStateEvent("popstate",{state:{}}))};' +
      'const b=document.createElement("div");b.style.cssText="position:fixed;z-index:2147483647;left:50%;top:16px;transform:translateX(-50%);background:#111;color:#fff;padding:14px 20px;border-radius:12px;font:600 14px system-ui,sans-serif;box-shadow:0 10px 30px #000;border:1px solid #333";document.body.appendChild(b);' +
      'const out=[];let lidos=0;' +
      'for(let i=0;i<ids.length;i++){' +
        'b.textContent="Caramujo: lendo os plays "+(i+1)+" de "+ids.length+" (não feche esta aba)";' +
        'const ja=location.pathname.indexOf(ids[i])>=0,antes=document.querySelector("main h1");if(!ja)go("/track/"+ids[i]);let ok=false;' +
        'for(let k=0;k<80;k++){await sl(120);const h=document.querySelector("main h1");if(location.pathname.indexOf(ids[i])>=0&&h&&(ja||h!==antes)){ok=true;break}}' +
        'if(!ok)continue;await sl(700);' +
        'const pc=document.querySelector(\'main [data-testid="playcount"]\');const n=pc?parseInt(pc.textContent.replace(/\\D/g,""),10)||0:0;if(n)lidos++;out.push(ids[i]+":"+n)}' +
      'if(!lidos){b.textContent="Não achei nenhum play. Confira se está logado no Spotify e tente de novo.";return}' +
      'b.textContent="Pronto: voltando pro painel…";' +
      'location.href="https://caramujorecords.com.br/painel#gravou&plays="+out.join(",")' +
      '})()';
    return 'javascript:' + encodeURIComponent(c);
  }
  function quando(iso) { try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch (_) { return ''; } }
  // volta do atalho: /painel#gravou&plays=<id>:<n>,... (o começo do painel guarda em window.__gvPlays)
  function playsDaVolta() {
    var t = window.__gvPlays; window.__gvPlays = null;
    if (!t) return;
    var plays = {}, n = 0;
    String(t).split(',').forEach(function (par) { var m = par.match(/^([A-Za-z0-9]{22}):(\d{1,11})$/); if (m) { plays[m[1]] = +m[2]; n++; } });
    if (!n) return;
    flash('Guardando ' + n + ' plays…');
    acao('gravou-plays', { plays: plays }).then(function (j) { usar(j, 'Plays atualizados: ' + n + ' músicas. A ordem das músicas já segue os números novos.'); });
  }
  var ALCA = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>';
  function peq(u) { return String(u || '').replace('ab67616d0000b273', 'ab67616d00001e02').replace('ab6761610000e5eb', 'ab67616100005174').replace(/(\/capa\/gr[va]-[A-Za-z0-9_-]+?)(?:-m)?\.jpg$/, '$1-p.jpg'); }
  // 67000 → "67 mil ouvintes"; 1200000 → "1,2 mi ouvintes"
  function ouv(n) {
    if (n == null) return '';
    var t = n >= 1e6 ? (Math.round(n / 1e5) / 10).toString().replace('.', ',') + ' mi' : n >= 1e3 ? Math.round(n / 1e3) + ' mil' : String(n);
    return t + (n === 1 ? ' ouvinte' : ' ouvintes');
  }
  // mesma ordem da página: ouvintes mensais em faixas de 35%, empate = mais faixas
  function faixaOuv(n) { return n > 0 ? Math.floor(Math.log(n) / Math.log(1.35)) : -1; }
  function ini(n) { return String(n || '').replace(/^@/, '').split(/[\s_.-]+/).filter(Boolean).map(function (p) { return p[0]; }).join('').slice(0, 2).toUpperCase() || '?'; }
  function sem(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
  var PAGINA = '/rideblan33/artistas';

  var raiz = null, dados = null, erroCarga = false, abertos = {}, filtro = '', buscando = false;

  function carregar() {
    pedir('gravou').then(function (j) { erroCarga = !j || !j.ok; dados = erroCarga ? null : j; desenhar(); if (dados) playsDaVolta(); })
      .catch(function () { erroCarga = true; desenhar(); });
  }
  function usar(j, msg) {
    if (!j || j.erro || !j.ok) { flash((j && j.erro) || 'Não deu certo. Tenta de novo.'); desenhar(); return false; }
    dados = j; desenhar(); if (msg) flash(msg);
    return true;
  }
  function nomeDe(id) { var a = dados.artistas.filter(function (x) { return x.id === id; })[0]; return a ? a.nome : ''; }
  function visiveis(a) { return a.faixas.filter(function (id) { return !dados.faixas[id].fora; }).length; }

  function linhaArtista(a) {
    var n = a.faixas.length, v = visiveis(a);
    var meta = a.eu ? (v === n ? n + ' músicas como artista' : v + ' de ' + n + ' músicas na página') + (a.ouvintes != null ? ' · ' + ouv(a.ouvintes) : '') + ' · entra na ordem por ouvintes, como os outros' : (v === n ? n + (n === 1 ? ' música' : ' músicas') : v + ' de ' + n + ' músicas na página') +
      (a.ouvintes != null ? ' · ' + ouv(a.ouvintes) : '') +
      (a.pasta ? ' · pasta ' + esc(a.pasta) : ' · só participação') + (a.provavel ? ' · <em>confira se é a mesma pessoa</em>' : '') +
      (a.foto ? (a.tipo === 'capa' ? ' · <em>sem foto no Spotify (usa uma capa)</em>' : '') : ' · <em>sem foto</em>');
    var foto = a.foto ? '<img src="' + esc(peq(a.foto)) + '" alt="" loading="lazy">' : esc(ini(a.nome));
    // foto própria (17/10/2026): artista sem foto no Spotify ganha a que o Bruno subir
    var troca = abertos[a.id] ? '<div class="gv-troca"><label class="pill"><input type="file" accept="image/*" data-foto="' + esc(a.id) + '" hidden>' + (a.manual ? 'Trocar a foto' : 'Subir uma foto') + '</label>' +
      (a.manual ? '<button class="pill" type="button" data-tirarfoto="' + esc(a.id) + '">Voltar pra do Spotify</button>' : '') +
      '<small>' + (a.manual ? 'Foto sua (o Atualizar não troca).' : a.tipo === 'capa' ? 'No Spotify ele não tem foto: a página usa a capa de um lançamento.' : a.foto ? 'Foto do Spotify.' : 'Sem foto: a página mostra as iniciais.') + '</small></div>' : '';
    var fx = abertos[a.id] ? troca + '<ul class="gv-fx">' + a.faixas.map(function (id) {
      var f = dados.faixas[id];
      var com = f.ars.map(nomeDe).filter(Boolean).join(', ');
      return '<li' + (f.fora ? ' class="gv-fora"' : '') + '>' + (f.capa ? '<img src="' + esc(peq(f.capa)) + '" alt="" loading="lazy">' : '<span class="gv-sem"></span>') +
        '<a href="https://open.spotify.com/track/' + esc(id) + '" target="_blank" rel="noopener"><b>' + esc(f.nome) + '</b><small>' + esc(com) + '</small></a>' +
        '<button class="toggle" type="button" data-faixa="' + esc(id) + '" aria-pressed="' + !f.fora + '" aria-label="Mostrar ' + esc(f.nome) + ' na página"><i></i></button></li>';
    }).join('') + '</ul>' : '';
    return '<li data-busca="' + esc(sem(a.nome + ' ' + a.pasta)) + '"' + (a.fora ? ' class="gv-fora"' : '') + '><div class="gv-art">' +
      '<button class="gv-abre" type="button" data-abre="' + esc(a.id) + '" aria-expanded="' + !!abertos[a.id] + '"><span class="gv-foto">' + foto + '</span>' +
      '<span class="gv-txt"><b>' + esc(a.nome) + '</b><small>' + meta + '</small></span></button>' +
      '<button class="toggle" type="button" data-artista="' + esc(a.id) + '" aria-pressed="' + !a.fora + '" aria-label="Mostrar ' + esc(a.nome) + ' na página"><i></i></button></div>' + fx + '</li>';
  }

  function desenhar() {
    if (!raiz) return;
    var res = $('resumo');
    if (!dados) {
      raiz.innerHTML = '<div class="vazio">' + (erroCarga ? 'Não consegui carregar a lista. Recarrega a página.' : 'carregando…') + '</div>';
      if (res) res.textContent = 'os artistas das suas músicas';
      return;
    }
    var mostra = dados.artistas.filter(function (a) { return !a.fora && visiveis(a) > 0; }).length;
    if (res) res.textContent = mostra + ' artistas na página · ' + (dados.noAr ? 'no ar pra todo mundo' : 'fora do ar (só você vê a prévia)');
    var h = '<div class="gv-topo"><div class="sw"><div><b>No ar</b><small>' +
      (dados.noAr ? 'Todo mundo vê a página e a linha "Quem já gravou" no fim da aba Músicas.' : 'Desligado: a página e a linha só aparecem pra você, logado no painel.') +
      '</small></div><button class="toggle" type="button" id="gvNoAr" aria-pressed="' + !!dados.noAr + '" aria-label="Quem já gravou no ar"><i></i></button></div>' +
      '<a href="' + PAGINA + '" target="_blank" rel="noopener">Ver ' + (dados.noAr ? 'a página' : 'a prévia') + ' ↗</a></div>';
    h += '<div class="gv-img"><div><b>Fotos, capas e ouvintes</b><small>' + (dados.faltam ? (buscando ? 'buscando no Spotify… faltam ' + dados.faltam : 'faltam ' + dados.faltam + ' (fotos, capas das faixas e ouvintes mensais). Sem foto, a página mostra as iniciais.') : 'Tudo guardado no nosso servidor' + (dados.atualizado ? ' (' + new Date(dados.atualizado).toLocaleDateString('pt-BR') + ')' : '') + '. Toca em Atualizar quando um artista trocar a foto ou pra ler os ouvintes do mês.') + '</small></div>' +
      '<button class="pill' + (dados.faltam ? ' solid' : '') + '" type="button" id="gvImg"' + (buscando ? ' disabled' : '') + '>' + (buscando ? 'Buscando…' : dados.faltam ? 'Buscar' : 'Atualizar') + '</button></div>';
    var nFx = Object.keys(dados.faixas || {}).length;
    h += '<div class="gv-pl"><div class="gv-pl-topo"><div><b>Plays das músicas</b><small>' + (dados.playsEm ? 'Lidos em ' + quando(dados.playsEm) + '.' : 'Os da varredura de 17/10/2026.') + ' As músicas de cada artista aparecem das mais tocadas pras menos.</small></div>' +
      '<button class="pill" type="button" data-plays="1" aria-expanded="' + verPlays + '">' + (verPlays ? 'Fechar' : 'Atualizar plays') + '</button></div>' +
      (verPlays ? '<ol><li><b>Uma vez só:</b> arraste este botão pra barra de favoritos do navegador.<br><a class="gv-atalho" href="' + esc(codigoAtalho(Object.keys(dados.faixas || {}))) + '" onclick="event.preventDefault();return false">Plays Caramujo</a><br><small>Se a lista de músicas mudar, arraste de novo (o atalho leva a lista de hoje: ' + nFx + ' músicas).</small></li>' +
        '<li>Abra o Spotify neste navegador, logado na sua conta.<br><a class="gv-sp" href="https://open.spotify.com/" target="_blank" rel="noopener">Abrir o Spotify ↗</a></li>' +
        '<li>Lá no Spotify, toque no favorito <b>Plays Caramujo</b>. Ele passa pelas ' + nFx + ' músicas (uns ' + Math.max(1, Math.round(nFx * 1.1 / 60)) + ' minutos) e volta pra cá sozinho com os números.<br><small>Não precisa fazer nada no meio. Música com menos de mil plays fica 0 (o Spotify não mostra) e vai pela data.</small></li></ol>' : '') + '</div>';
    // Ordem da página (17/10/2026): padrão por ouvintes ou a do Bruno (arrastar)
    var porId = {}; dados.artistas.forEach(function (a) { porId[a.id] = a; });
    var manual = !!dados.ordemManual;
    h += '<div class="gv-ord"><div class="gv-ord-topo"><b>Ordem da página</b><div class="gv-ord-modo" role="group" aria-label="Ordem da página">' +
      '<button type="button" data-modo="ouvintes" aria-pressed="' + !manual + '">Por ouvintes (padrão)</button><button type="button" data-modo="manual" aria-pressed="' + manual + '">Na minha ordem</button></div></div>' +
      '<small>' + (manual ? 'Na sua ordem: segura a alça e arrasta. Salva sozinho. Artista novo entra no fim.' : 'Mais ouvintes mensais primeiro; diferença pequena, quem tem mais faixas. Arrastar um artista liga a sua ordem.') + '</small>' +
      '<button type="button" class="gv-ord-ver" data-verordem="1" aria-expanded="' + verOrdem + '">' + (verOrdem ? 'Esconder a lista' : 'Ver e arrastar a ordem (' + (dados.ordemPagina || []).length + ')') + '</button>' +
      (verOrdem ? '<ol class="gv-ol" id="gvOl">' + (dados.ordemPagina || []).map(function (id) {
        var a = porId[id]; if (!a) return '';
        return '<li data-id="' + esc(id) + '"><span class="gv-foto">' + (a.foto ? '<img src="' + esc(peq(a.foto)) + '" alt="" loading="lazy">' : esc(ini(a.nome))) + '</span><span class="t">' + esc(a.nome) + (a.ouvintes != null ? '<small>' + ouv(a.ouvintes) + '</small>' : '') + '</span>' +
          '<button class="gv-alca" type="button" aria-label="Mover ' + esc(a.nome) + ' (setas pra cima e pra baixo)">' + ALCA + '</button></li>';
      }).join('') + '</ol>' : '') + '</div>';
    h += '<div class="campo gv-busca"><input id="gvFiltro" type="search" placeholder="Buscar artista ou pasta" autocomplete="off" aria-label="Buscar artista" value="' + esc(filtro) + '"></div>';
    var solo = dados.artistas.filter(function (a) { return a.eu; }), outros = dados.artistas.filter(function (a) { return !a.eu; });
    var comPasta = outros.filter(function (a) { return a.pasta; }), feat = outros.filter(function (a) { return !a.pasta; });
    var posPag = {}; (dados.ordemPagina || []).forEach(function (id, i) { posPag[id] = i; });
    var ord = function (x, y) { return (x.id in posPag ? posPag[x.id] : 1e6) - (y.id in posPag ? posPag[y.id] : 1e6) || faixaOuv(y.ouvintes) - faixaOuv(x.ouvintes) || y.faixas.length - x.faixas.length || x.nome.localeCompare(y.nome, 'pt'); };
    if (solo.length) h += '<div class="gv-sec"><b>Você</b><small>Seu cartão: as músicas em que você aparece como artista (solo, principal ou feat). A chave tira ele ou uma faixa da página.</small><ul class="gv-lista">' + solo.map(linhaArtista).join('') + '</ul></div>';
    h += '<div class="gv-sec"><b>Com pasta no Drive · ' + comPasta.length + '</b><small>Toque no nome pra ver as músicas. A chave tira da página.</small><ul class="gv-lista">' + comPasta.sort(ord).map(linhaArtista).join('') + '</ul></div>';
    h += '<div class="gv-sec"><b>Só participação · ' + feat.length + '</b><small>Cantaram junto nas faixas, mas não têm pasta no Drive.</small><ul class="gv-lista">' + feat.sort(ord).map(linhaArtista).join('') + '</ul></div>';
    raiz.innerHTML = h;
    filtrar();
    var ol = $('gvOl'); if (ol) ligarOrdem(ol);
  }
  function filtrar() {
    var q = sem(filtro).trim();
    [].forEach.call(raiz.querySelectorAll('.gv-lista>li'), function (li) { li.hidden = !!q && li.dataset.busca.indexOf(q) < 0; });
  }

  function buscarImagens() {
    if (buscando) return;
    buscando = true; desenhar();
    (function vai(voltas) {
      acao('gravou-imagens', {}).then(function (j) {
        if (!j || j.erro || !j.ok) { buscando = false; usar(j); return; }
        dados = j; desenhar();
        if (j.faltam > 0 && j.feitas > 0 && voltas < 40) return vai(voltas + 1);
        buscando = false; desenhar();
        flash(j.faltam ? 'Parei com ' + j.faltam + ' faltando. Tenta de novo daqui a pouco.' : 'Fotos, capas e ouvintes prontos.');
      });
    })(0);
  }

  function ligar() {
    raiz.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('button');
      if (!t || !raiz.contains(t)) return;
      if (t.id === 'gvNoAr') {
        var quer = t.getAttribute('aria-pressed') !== 'true';
        t.disabled = true;
        acao('gravou-no-ar', { noAr: quer }).then(function (j) { usar(j, quer ? 'Quem já gravou no ar.' : 'Fora do ar (só a prévia).'); });
        return;
      }
      if (t.id === 'gvImg') {
        if (dados && !dados.faltam) {
          // Atualizar: marca tudo pra ler de novo e já busca em lotes
          acao('gravou-atualizar', {}).then(function (j) { if (!j || !j.ok) { usar(j); return; } dados = j; buscarImagens(); });
          return;
        }
        buscarImagens(); return;
      }
      if (t.dataset.verordem) { verOrdem = !verOrdem; desenhar(); return; }
      if (t.dataset.plays) { verPlays = !verPlays; desenhar(); return; }
      if (t.dataset.modo) {
        var quer = t.dataset.modo === 'manual';
        if (quer === !!dados.ordemManual) return;
        acao('gravou-ordem-modo', { manual: quer }).then(function (j) { usar(j, quer ? 'Na sua ordem.' : 'De volta à ordem por ouvintes.'); });
        return;
      }
      if (t.dataset.tirarfoto) {
        t.disabled = true;
        acao('gravou-foto-tirar', { id: t.dataset.tirarfoto }).then(function (j) { usar(j, 'Volta pra foto do Spotify no próximo Buscar.'); });
        return;
      }
      if (t.dataset.abre) { abertos[t.dataset.abre] = !abertos[t.dataset.abre]; desenhar(); return; }
      if (t.dataset.artista || t.dataset.faixa) {
        var esconder = t.getAttribute('aria-pressed') === 'true';
        t.setAttribute('aria-pressed', String(!esconder)); t.disabled = true;
        acao('gravou-esconder', { tipo: t.dataset.artista ? 'artista' : 'faixa', id: t.dataset.artista || t.dataset.faixa, esconder: esconder })
          .then(function (j) { usar(j, esconder ? 'Saiu da página.' : 'Voltou pra página.'); });
      }
    });
    raiz.addEventListener('input', function (e) { if (e.target && e.target.id === 'gvFiltro') { filtro = e.target.value; filtrar(); } });
    raiz.addEventListener('change', function (e) {
      var inp = e.target; if (!inp || !inp.dataset || !inp.dataset.foto || !inp.files || !inp.files[0]) return;
      flash('Preparando a foto…');
      reduzir(inp.files[0]).then(function (f) {
        return acao('gravou-foto', { id: inp.dataset.foto, grande: f.grande, pequena: f.pequena });
      }).then(function (j) { usar(j, 'Foto nova no ar em até 1 minuto.'); })
        .catch(function () { flash('Não consegui ler essa imagem. Tenta um JPEG ou PNG.'); });
    });
  }

  /* ---------- arrastar a ordem (o mesmo jeito das Músicas e das beat tapes) ---------- */
  var salvarT = null;
  function salvarOrdem(ol) {
    clearTimeout(salvarT);
    salvarT = setTimeout(function () {
      var ids = [].slice.call(ol.children).map(function (li) { return li.dataset.id; });
      acao('gravou-ordem', { ids: ids }).then(function (j) { usar(j, 'Ordem salva (na sua ordem).'); });
    }, 600);
  }
  function ligarOrdem(ol) {
    var pego = null, dy = 0, DUR = 180;
    function topoLayout(li) { return ol.getBoundingClientRect().top + li.offsetTop; }
    function desliza(mudar) {
      var outros = [].slice.call(ol.children).filter(function (li) { return li !== pego; });
      var antes = outros.map(function (li) { return li.getBoundingClientRect().top; });
      mudar();
      outros.forEach(function (li, i) {
        var d = antes[i] - li.getBoundingClientRect().top; if (!d) return;
        li.style.transition = 'none'; li.style.transform = 'translateY(' + d + 'px)';
        li.getBoundingClientRect();
        li.style.transition = 'transform ' + DUR + 'ms cubic-bezier(.2,.7,.3,1)'; li.style.transform = '';
      });
    }
    ol.addEventListener('pointerdown', function (e) {
      var h = e.target.closest('.gv-alca'); if (!h) return;
      pego = h.closest('li'); e.preventDefault();
      try { h.setPointerCapture(e.pointerId); } catch (_) {}
      dy = e.clientY - pego.getBoundingClientRect().top;
      pego.classList.add('pego');
    });
    ol.addEventListener('pointermove', function (e) {
      if (!pego) return;
      var rolar = e.clientY < 70 ? -10 : e.clientY > window.innerHeight - 70 ? 10 : 0;
      if (rolar) window.scrollBy(0, rolar);
      var meio = e.clientY - dy + pego.offsetHeight / 2;
      var outros = [].slice.call(ol.children).filter(function (li) { return li !== pego; });
      var alvo = null;
      for (var i = 0; i < outros.length; i++) { if (meio < topoLayout(outros[i]) + outros[i].offsetHeight / 2) { alvo = outros[i]; break; } }
      if (alvo ? pego.nextElementSibling !== alvo : ol.lastElementChild !== pego) desliza(function () { if (alvo) ol.insertBefore(pego, alvo); else ol.appendChild(pego); });
      pego.style.transform = 'translateY(' + (e.clientY - dy - topoLayout(pego)) + 'px)';
    });
    function solta() {
      if (!pego) return;
      var li = pego; pego = null;
      li.style.transition = 'transform ' + DUR + 'ms cubic-bezier(.2,.7,.3,1)'; li.style.transform = '';
      li.classList.remove('pego');
      setTimeout(function () { li.style.transition = ''; }, DUR + 20);
      salvarOrdem(ol);
    }
    ol.addEventListener('pointerup', solta); ol.addEventListener('pointercancel', solta);
    ol.addEventListener('keydown', function (e) {
      var h = e.target.closest('.gv-alca'); if (!h || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
      e.preventDefault();
      var li = h.closest('li'); pego = li;
      desliza(function () {
        if (e.key === 'ArrowUp' && li.previousElementSibling) ol.insertBefore(li, li.previousElementSibling);
        if (e.key === 'ArrowDown' && li.nextElementSibling) ol.insertBefore(li.nextElementSibling, li);
      });
      pego = null; h.focus(); salvarOrdem(ol);
    });
  }

  // recorta no quadrado do meio e faz duas JPEG (640 e 320 px) pro R2
  function reduzir(arq) {
    return new Promise(function (ok, erro) {
      var img = new Image(), url = URL.createObjectURL(arq);
      img.onload = function () {
        var lado = Math.min(img.naturalWidth, img.naturalHeight), sx = (img.naturalWidth - lado) / 2, sy = (img.naturalHeight - lado) / 2;
        var faz = function (px) { var c = document.createElement('canvas'); c.width = c.height = px; c.getContext('2d').drawImage(img, sx, sy, lado, lado, 0, 0, px, px); return c.toDataURL('image/jpeg', 0.86).split(',')[1]; };
        URL.revokeObjectURL(url);
        ok({ grande: faz(Math.min(640, lado)), pequena: faz(Math.min(320, lado)) });
      };
      img.onerror = function () { URL.revokeObjectURL(url); erro(new Error('imagem')); };
      img.src = url;
    });
  }

  window.CaramujoGravou = {
    abrir: function (el) {
      raiz = el;
      if (!$('gvCss')) { var st = document.createElement('style'); st.id = 'gvCss'; st.textContent = CSS; document.head.appendChild(st); }
      ligar(); desenhar(); carregar();
    },
    carregar: carregar
  };
})();
