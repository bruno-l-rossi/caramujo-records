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
    pedir('gravou').then(function (j) { erroCarga = !j || !j.ok; dados = erroCarga ? null : j; desenhar(); })
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
    var meta = (v === n ? n + (n === 1 ? ' música' : ' músicas') : v + ' de ' + n + ' músicas na página') +
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
    h += '<div class="campo gv-busca"><input id="gvFiltro" type="search" placeholder="Buscar artista ou pasta" autocomplete="off" aria-label="Buscar artista" value="' + esc(filtro) + '"></div>';
    var comPasta = dados.artistas.filter(function (a) { return a.pasta; }), feat = dados.artistas.filter(function (a) { return !a.pasta; });
    var ord = function (x, y) { return faixaOuv(y.ouvintes) - faixaOuv(x.ouvintes) || y.faixas.length - x.faixas.length || (y.ouvintes || 0) - (x.ouvintes || 0) || x.nome.localeCompare(y.nome, 'pt'); };
    h += '<div class="gv-sec"><b>Com pasta no Drive · ' + comPasta.length + '</b><small>Toque no nome pra ver as músicas. A chave tira da página.</small><ul class="gv-lista">' + comPasta.sort(ord).map(linhaArtista).join('') + '</ul></div>';
    h += '<div class="gv-sec"><b>Só participação · ' + feat.length + '</b><small>Cantaram junto nas faixas, mas não têm pasta no Drive.</small><ul class="gv-lista">' + feat.sort(ord).map(linhaArtista).join('') + '</ul></div>';
    raiz.innerHTML = h;
    filtrar();
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
