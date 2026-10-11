/* Comentários das pastas (10/10/2026). O que os artistas escreveram no tempo das faixas
   ("em 1:23, sobe a voz") e as versões que eles aprovaram, de todas as pastas, a mais nova
   primeiro. Responder aparece pro artista na pasta, embaixo do comentário dele. "Feito"
   tira da lista de abertos (o artista vê o comentário como resolvido).
   Carregado só pelo /painel. Os dados vêm de /api/painel (exige o login). */
(function () {
  var CSS = [
    '.cm-filtro{display:flex;background:#111;border:1px solid var(--borda);border-radius:999px;padding:3px;margin:18px 0 6px;width:max-content;max-width:100%}',
    '.cm-filtro button{border:0;background:transparent;color:var(--ink3);font-size:13px;padding:7px 14px;border-radius:999px;cursor:pointer;white-space:nowrap}',
    '.cm-filtro button[aria-pressed="true"]{background:#fff;color:#000;font-weight:600}',
    '.cm-art{margin-top:26px}',
    '.cm-art-topo{display:flex;align-items:baseline;justify-content:space-between;gap:10px;padding-bottom:6px;border-bottom:1px solid var(--linha)}',
    '.cm-art-topo b{font-size:18px;font-weight:700;letter-spacing:-.01em}',
    '.cm-art-topo a{font-size:13px;color:var(--ink2);text-underline-offset:3px;white-space:nowrap}',
    '.cm-fx{margin-top:14px}',
    '.cm-fx-topo{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink4);margin-bottom:4px}',
    '.cm-fx-topo span{letter-spacing:0;text-transform:none;font-size:12px}',
    '.cm-it{display:flex;gap:12px;padding:10px 0}',
    '.cm-t{flex:none;min-width:52px;height:28px;padding:0 9px;border-radius:999px;border:1px solid var(--borda);background:#181818;color:#fff;font-size:12.5px;font-variant-numeric:tabular-nums;display:inline-flex;align-items:center;justify-content:center;text-decoration:none}',
    '.cm-t.toda{background:transparent;border-color:transparent;color:var(--ink4);font-size:11.5px;min-width:52px;padding:0}',
    '.cm-cp{flex:1;min-width:0}',
    '.cm-cp p{margin:3px 0 0;font-size:14.5px;line-height:1.5;white-space:pre-line;overflow-wrap:anywhere}',
    '.cm-cp>small{display:block;margin-top:4px;font-size:12px;color:var(--ink4)}',
    '.cm-cp>small em{font-style:normal;color:#e0b155}',
    '.cm-it.feito .cm-cp p{color:var(--ink3)}',
    '.cm-re{margin-top:8px;padding-left:10px;border-left:2px solid #2c2c2c;font-size:13.5px;color:var(--ink2);line-height:1.45;white-space:pre-line;overflow-wrap:anywhere}',
    '.cm-re b{color:#fff;font-weight:600}',
    '.cm-bts{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}',
    '.cm-bts button{border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);color:var(--ink);padding:6px 12px;border-radius:999px;font-size:12.5px;cursor:pointer;white-space:nowrap}',
    '.cm-bts button:hover{background:rgba(255,255,255,.1)}',
    '.cm-bts button.ok{background:#fff;color:#000;border-color:#fff;font-weight:600}',
    '.cm-bts button:disabled{opacity:.45;cursor:default}',
    '.cm-resp{margin-top:10px}',
    '.cm-resp[hidden]{display:none}',
    '.cm-resp .acoes{margin-top:10px}',
    '.cm-ap{display:flex;align-items:center;gap:8px;padding:8px 0;font-size:13.5px;color:var(--ink2)}',
    '.cm-ap svg{flex:none}',
    '.cm-ap.vencida{color:var(--ink4)}',
    '.cm-ap button{margin-left:auto;border:0;background:transparent;color:var(--ink4);font-size:12px;text-decoration:underline;cursor:pointer}'
  ].join('\n');

  var $ = function (i) { return document.getElementById(i); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function flash(m) { if (window.__painelFlash) window.__painelFlash(m); }
  function mmss(s) { s = Math.max(0, Math.round(+s || 0)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function quando(iso) {
    var d = new Date(iso); if (isNaN(d)) return '';
    var dd = ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2);
    return dd + ' ' + ('0' + d.getHours()).slice(-2) + 'h' + ('0' + d.getMinutes()).slice(-2);
  }
  var OK = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  var raiz = null, dados = null, erro = false, filtro = 'abertos', aberto = null;

  function carregar() {
    fetch('/api/painel?op=comentarios').then(function (r) { return r.json(); }).then(function (j) {
      erro = !j || !j.ok; dados = erro ? null : j; desenhar();
    }).catch(function () { erro = true; desenhar(); });
  }
  function acao(op, body) {
    return fetch('/api/painel?op=' + op, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {})
    }).then(function (r) { return r.json(); }).catch(function () { return { erro: 'Sem conexão. Tenta de novo.' }; });
  }
  function usar(j, msg) {
    if (!j || !j.ok) { flash((j && j.erro) || 'Não deu certo. Tenta de novo.'); return false; }
    dados = j; desenhar(); if (msg) flash(msg); return true;
  }

  // grupos: pasta > faixa > comentários (com as respostas embaixo de cada um)
  function agrupar() {
    var lista = dados.lista, respostas = {}, pastas = [], porPasta = {};
    lista.forEach(function (c) { if (c.respostaDe) (respostas[c.respostaDe] = respostas[c.respostaDe] || []).unshift(c); });
    var recente = Date.now() - 14 * 864e5;
    lista.forEach(function (c) {
      if (c.respostaDe) return;
      if (filtro === 'abertos') {
        var abre = c.tipo === 'nota' && c.autor === 'artista' && !c.feito;
        var aprovou = c.tipo === 'aprovou' && !c.antiga && new Date(c.at).getTime() > recente;
        if (!abre && !aprovou) return;
      }
      var p = porPasta[c.artistId];
      if (!p) { p = porPasta[c.artistId] = { nome: c.artista, link: c.link.split('?')[0], faixas: [], porFaixa: {} }; pastas.push(p); }
      var f = p.porFaixa[c.trackId];
      if (!f) { f = p.porFaixa[c.trackId] = { nome: c.faixa, kind: c.kind, noAr: c.noAr, itens: [] }; p.faixas.push(f); }
      f.itens.push(c);
    });
    pastas.forEach(function (p) { p.faixas.forEach(function (f) { f.itens.reverse(); }); });   // dentro da faixa: na ordem em que foram escritos
    return { pastas: pastas, respostas: respostas };
  }

  function item(c, respostas) {
    if (c.tipo === 'aprovou') {
      return '<div class="cm-ap' + (c.antiga ? ' vencida' : '') + '">' + OK +
        '<span>' + esc(c.nome || 'Alguém') + ' aprovou ' + (c.antiga ? 'uma versão anterior' : 'essa versão') + ' · ' + quando(c.at) + '</span>' +
        '<button type="button" data-apagar="' + c.id + '">tirar</button></div>';
    }
    var resp = (respostas[c.id] || []).map(function (r) {
      return '<div class="cm-re"><b>Você</b> ' + esc(r.texto) + ' <small>· ' + quando(r.at) + '</small></div>';
    }).join('');
    var t = c.seg != null
      ? '<a class="cm-t" href="' + esc(c.link) + '" target="_blank" rel="noopener" title="Abrir a pasta nesse ponto">' + mmss(c.seg) + '</a>'
      : '<span class="cm-t toda">faixa toda</span>';
    var eu = c.autor === 'bruno';
    return '<div class="cm-it' + (c.feito ? ' feito' : '') + '" data-id="' + c.id + '">' + t +
      '<div class="cm-cp"><p>' + esc(c.texto) + '</p>' +
      '<small>' + (eu ? 'Você' : esc(c.nome || 'Sem nome')) + ' · ' + quando(c.at) + (c.antiga ? ' · <em>versão anterior</em>' : '') + (c.feito ? ' · resolvido' : '') + '</small>' +
      resp +
      (eu ? '' : '<div class="cm-bts">' +
        '<button type="button" data-responder="' + c.id + '">Responder</button>' +
        '<button type="button" class="' + (c.feito ? '' : 'ok') + '" data-feito="' + c.id + '" data-valor="' + (c.feito ? '0' : '1') + '">' + (c.feito ? 'Reabrir' : 'Feito') + '</button>' +
        '<button type="button" data-apagar="' + c.id + '">Apagar</button></div>') +
      '<div class="cm-resp" id="cmResp' + c.id + '"' + (aberto === c.id ? '' : ' hidden') + '>' +
        '<label for="cmTx' + c.id + '" class="rot" style="display:block;margin:0 0 8px">SUA RESPOSTA</label>' +
        '<textarea class="desc" id="cmTx' + c.id + '" maxlength="1000" placeholder="Aparece na pasta, embaixo do comentário"></textarea>' +
        '<div class="acoes"><button type="button" class="pill" data-cancelar="' + c.id + '">Cancelar</button><button type="button" class="pill solid" data-enviar="' + c.id + '">Responder</button></div>' +
      '</div>' +
      '</div></div>';
  }

  function desenhar() {
    if (!raiz) return;
    if (erro) { raiz.innerHTML = '<div class="vazio">Não consegui carregar os comentários. Tenta de novo.</div>'; return; }
    if (!dados) { raiz.innerHTML = '<div class="vazio">carregando…</div>'; return; }
    var g = agrupar();
    var resumo = dados.abertos ? dados.abertos + (dados.abertos === 1 ? ' comentário aberto' : ' comentários abertos') : 'Nenhum comentário aberto';
    var res = $('resumo'); if (res) res.textContent = resumo + '. A resposta aparece na pasta, embaixo do comentário do artista.';
    var html = '<div class="cm-filtro" role="group" aria-label="Quais comentários">' +
        '<button type="button" data-filtro="abertos" aria-pressed="' + (filtro === 'abertos') + '">Abertos</button>' +
        '<button type="button" data-filtro="todos" aria-pressed="' + (filtro === 'todos') + '">Todos</button></div>';
    if (!g.pastas.length) {
      html += '<div class="vazio">' + (filtro === 'abertos' && dados.lista.length ? 'Tudo respondido.<small>Os resolvidos ficam em Todos.</small>'
        : 'Nenhum comentário ainda.<small>Na pasta, o artista toca em <b>Comentar</b> na barra do player e escreve no segundo que está tocando. Você recebe um e-mail.</small>') + '</div>';
    }
    g.pastas.forEach(function (p) {
      html += '<section class="cm-art"><div class="cm-art-topo"><b>' + esc(p.nome) + '</b><a href="' + esc(p.link) + '" target="_blank" rel="noopener">abrir a pasta</a></div>';
      p.faixas.forEach(function (f) {
        html += '<div class="cm-fx"><div class="cm-fx-topo">' + esc(f.nome) + ' <span>· ' + (f.kind === 'beat' ? 'beat' : f.kind === 'son' ? 'música' : 'saiu da pasta') + '</span></div>' +
          f.itens.map(function (c) { return item(c, g.respostas); }).join('') + '</div>';
      });
      html += '</section>';
    });
    raiz.innerHTML = html;
  }

  function ligar() {
    raiz.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.filtro) { filtro = b.dataset.filtro; aberto = null; desenhar(); return; }
      if (b.dataset.responder) {
        aberto = Number(b.dataset.responder); desenhar();
        var tx = $('cmTx' + aberto); if (tx) tx.focus();
        return;
      }
      if (b.dataset.cancelar) { aberto = null; desenhar(); return; }
      if (b.dataset.enviar) {
        var id = Number(b.dataset.enviar), t = $('cmTx' + id), texto = t ? t.value.trim() : '';
        if (!texto) { if (t) t.focus(); return; }
        b.disabled = true; b.textContent = 'Enviando…';
        acao('comentario-responder', { id: id, texto: texto }).then(function (j) {
          if (usar(j, 'Resposta na pasta.')) aberto = null;
          else { b.disabled = false; b.textContent = 'Responder'; }
          desenhar();
        });
        return;
      }
      if (b.dataset.feito) {
        b.disabled = true;
        acao('comentario-feito', { id: Number(b.dataset.feito), feito: b.dataset.valor === '1' }).then(function (j) {
          usar(j, b.dataset.valor === '1' ? 'Marcado como feito.' : 'Voltou pros abertos.');
        });
        return;
      }
      if (b.dataset.apagar) {
        if (b.dataset.certeza !== '1') { b.dataset.certeza = '1'; b.textContent = 'Apagar mesmo?'; return; }
        b.disabled = true;
        acao('comentario-apagar', { id: Number(b.dataset.apagar) }).then(function (j) { usar(j, 'Apagado.'); });
      }
    });
  }

  window.CaramujoComentarios = {
    abrir: function (el) {
      raiz = el;
      if (!document.getElementById('cm-css')) {
        var st = document.createElement('style'); st.id = 'cm-css'; st.textContent = CSS; document.head.appendChild(st);
      }
      ligar(); desenhar(); carregar();
    },
    carregar: carregar
  };
})();
