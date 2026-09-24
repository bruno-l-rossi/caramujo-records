/* Analytics do painel (24/09/2026): vitrine, beat tapes e artistas.
   Carregado só pelo /painel. Os números vêm de /api/painel?op=analytics, que
   exige o login do painel; este arquivo não tem dado nenhum dentro.
   Gráficos em SVG na mão: série única na cor #b88a3a (validada contra o fundo
   #141414), grade em fio, cruz + balão no hover e no teclado, e a tabela com
   os números por dia logo embaixo de cada gráfico. */
(function () {
  // Até 3 linhas no mesmo gráfico. As 3 cores passam no validador do dataviz
  // em TODOS os pares (fundo #101010): âmbar da casa, azul e verde-água. Cada
  // métrica tem a sua cor fixa (a cor segue a métrica, não a posição).
  var CORES = ['#b88a3a', '#3987e5', '#199e70'];
  var COR = CORES[0], LAVAGEM = 'rgba(184,138,58,.12)', GRADE = '#232323', FUNDO = '#101010';

  var CSS = [
    '.an-filtros{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:18px 0 6px}',
    '.an-seg{display:flex;background:#111;border:1px solid var(--borda);border-radius:999px;padding:3px}',
    '.an-seg button{border:0;background:transparent;color:var(--ink3);font-size:13.5px;font-weight:500;padding:8px 14px;border-radius:999px;cursor:pointer}',
    '.an-seg button[aria-pressed="true"]{background:#fff;color:#000}',
    '.an-dir{margin-left:auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:8px}',
    '.an-datas{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--ink3)}',
    '.an-datas input{background:var(--campo);border:1px solid var(--borda);border-radius:10px;color:var(--ink);padding:7px 9px;font-size:13px;color-scheme:dark}',
    '.an-corpo{transition:opacity .2s}',
    '.an-corpo.carregando{opacity:.45}',
    '.an-periodo{font-size:12.5px;color:var(--ink4);margin:2px 0 14px}',
    '.an-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(128px,1fr));gap:8px}',
    '.an-tile{background:#101010;border:1px solid var(--borda);border-radius:12px;padding:12px 12px 11px}',
    '.an-tile span{display:block;font-size:11.5px;color:var(--ink3);line-height:1.3}',
    '.an-tile b{display:block;font-size:24px;font-weight:700;margin-top:6px;letter-spacing:-.01em}',
    '.an-tile small{display:block;font-size:11.5px;color:var(--ink4);margin-top:3px;font-variant-numeric:tabular-nums}',
    '.an-bloco{margin-top:24px;min-width:0}',
    '.an-bloco h3{margin:0 0 3px;font-size:15px;font-weight:600}',
    '.an-bloco p.an-sub{margin:0 0 10px;font-size:12.5px;color:var(--ink4)}',
    '.an-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 6px}',
    '.an-chips button{border:1px solid var(--borda);background:#141414;color:var(--ink2);font-size:12.5px;padding:6px 11px;border-radius:999px;cursor:pointer}',
    '.an-chips button[aria-pressed="true"]{border-color:#fff;color:#fff}',
    '.an-graf{position:relative;background:#101010;border:1px solid var(--borda);border-radius:12px;padding:10px 8px 4px}',
    '.an-graf svg{display:block;width:100%;height:190px;outline:none}',
    '.an-graf svg:focus-visible{box-shadow:0 0 0 2px #fff;border-radius:6px}',
    '.an-balao{position:absolute;pointer-events:none;background:#1d1d1d;border:1px solid #333;border-radius:9px;padding:7px 10px;font-size:12px;color:var(--ink2);white-space:nowrap;transform:translate(-50%,-100%);display:none}',
    '.an-balao b{display:block;font-size:15px;color:#fff;font-variant-numeric:tabular-nums}',
    '.an-balao i{display:inline-block;width:12px;height:2px;vertical-align:middle;margin-right:6px}',
    '.an-balao .lin{display:flex;align-items:baseline;gap:8px;margin-top:3px}',
    '.an-balao .lin b{display:inline;font-size:14px;min-width:26px}',
    '.an-balao .dia{display:block;font-size:11.5px;color:var(--ink4);margin-bottom:2px}',
    '.an-chips button .k{display:inline-block;width:12px;height:2px;border-radius:1px;vertical-align:middle;margin-right:7px}',
    '.an-chips button[aria-pressed="false"] .k{opacity:.6}',
    '.an-chips button:disabled{opacity:.4;cursor:not-allowed}',
    '.an-mais{font-size:12px;color:var(--ink4);margin-top:8px}',
    '.an-chips .nota[hidden]{display:none}',
    '.an-chips .nota{align-self:center;font-size:12px;color:var(--ink4);margin-left:4px}',
    '.an-chips .nota:before{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;background:#e8e0cf;margin-right:6px;vertical-align:0}',
    '.an-busca{display:flex;align-items:center;gap:8px;background:var(--campo);border:1px solid var(--borda);border-radius:10px;padding:8px 11px;margin:4px 0 8px;max-width:320px}',
    '.an-busca input{flex:1;min-width:0;background:transparent;border:0;outline:none;color:var(--ink);font-size:14px;color-scheme:dark}',
    '.an-tab{width:100%;border-collapse:collapse;font-size:13px}',
    '.an-tab th{font-weight:500;color:var(--ink4);text-align:right;padding:6px 0 6px 10px;border-bottom:1px solid var(--linha);font-size:11.5px;white-space:nowrap}',
    '.an-tab th:first-child,.an-tab td:first-child{text-align:left;padding-left:0}',
    '.an-tab td{text-align:right;padding:9px 0 9px 10px;border-bottom:1px solid #161616;font-variant-numeric:tabular-nums;color:var(--ink2);white-space:nowrap}',
    '.an-tab td:first-child{color:var(--ink);white-space:normal;overflow-wrap:anywhere}',
    '.an-tab td:first-child small{display:block;color:var(--ink4);font-size:11.5px}',
    '.an-tag{display:inline-block;vertical-align:1px;margin-left:8px;padding:1px 7px;border:1px solid var(--borda);border-radius:999px;font-size:10.5px;font-weight:500;letter-spacing:.02em;color:var(--ink3);white-space:nowrap}',
    '.an-tag.beat{border-color:rgba(184,138,58,.55);color:#d6b27a}',
    '.an-rolar{overflow-x:auto}',
    '.an-barras{display:flex;flex-direction:column;gap:12px}',
    '.an-barra{display:grid;grid-template-columns:150px 1fr;align-items:center;gap:10px}',
    '@media (max-width:560px){.an-barra{grid-template-columns:1fr;gap:5px}}',
    '.an-barra>span{font-size:13px;color:var(--ink2)}',
    '.an-barra .an-trilho{position:relative;height:18px;cursor:default;outline:none}',
    '.an-barra .an-trilho:focus-visible{box-shadow:0 0 0 2px #fff;border-radius:4px}',
    '.an-barra .an-trilho i{position:absolute;left:0;top:0;bottom:0;background:' + COR + ';border-radius:0 4px 4px 0;min-width:2px}',
    '.an-barra .an-trilho:hover i{filter:brightness(1.15)}',
    '.an-barra .an-trilho em{position:absolute;top:50%;transform:translateY(-50%);font-style:normal;font-size:12.5px;color:var(--ink);white-space:nowrap;font-variant-numeric:tabular-nums}',
    '.an-barra .an-trilho em small{color:var(--ink4);margin-left:6px}',
    '.an-medidor{height:10px;border-radius:5px;background:#262626;overflow:hidden;display:flex}',
    '.an-medidor i{background:' + COR + ';border-right:2px solid ' + FUNDO + '}',
    '.an-leg{display:flex;flex-wrap:wrap;gap:6px 14px;justify-content:space-between;font-size:12px;color:var(--ink3);margin-top:7px}',
    '.an-leg span:before{content:"";display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:6px;vertical-align:-1px;background:' + COR + '}',
    '.an-leg span+span:before{background:#262626}',
    '.an-det{margin-top:8px;font-size:12.5px;color:var(--ink3)}',
    '.an-det summary{cursor:pointer;padding:4px 0}',
    '.an-vazio{margin-top:10px;padding:12px 14px;border:1px solid #2a2314;background:#16120a;border-radius:12px;font-size:13px;color:#d9c79a}',
    '.an-dois{display:grid;grid-template-columns:1fr 1fr;gap:24px}',
    '@media (max-width:640px){.an-dois{grid-template-columns:1fr}}'
  ].join('\n');

  /* ---------- utilidades ---------- */
  var num = function (n) { return Number(n || 0).toLocaleString('pt-BR'); };
  var pct = function (a, b) { return b ? Math.round(a * 100 / b) + '%' : '—'; };
  var hoje = function () { return new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10); };
  var soma = function (d, n) { return new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10); };
  var br = function (d) { var p = d.split('-'); return p[2] + '/' + p[1]; };
  var brAno = function (d) { var p = d.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function delta(a, b) {
    if (!b && !a) return 'igual ao período anterior';
    if (!b) return 'antes: 0';
    var d = Math.round((a - b) * 100 / b);
    return (d > 0 ? '↑ ' + d : d < 0 ? '↓ ' + (-d) : '= 0') + '% vs período anterior';
  }
  function niceMax(v) {
    if (v <= 4) return 4;
    var p = Math.pow(10, Math.floor(Math.log10(v))), m = v / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
  }
  var ORIGEM = {
    direto: 'Direto (link salvo ou digitado)', instagram: 'Instagram', facebook: 'Facebook', whatsapp: 'WhatsApp',
    tiktok: 'TikTok', youtube: 'YouTube', google: 'Google', busca: 'Outra busca', 'outro-site': 'Outro site',
    beat: 'Link de beat', bio: 'Bio do Instagram', story: 'Story', 'beat-tape': 'Beat tape'
  };
  var nomeOrigem = function (o) { return o.nome ? 'Tape: ' + o.nome : (ORIGEM[o.origem] || o.origem); };

  /* ---------- gráfico de linhas (1 a 3 séries) ---------- */
  // series: [{nome, cor, valores}]. vendas (opcional): número de vendas por dia,
  // marcado como ponto claro embaixo do eixo, sem virar uma 4ª linha.
  function grafico(dias, series, vendas) {
    var caixa = el('div', 'an-graf');
    var balao = el('div', 'an-balao');
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('tabindex', '0');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', series.map(function (x) { return x.nome; }).join(', ') + ' por dia, de ' + br(dias[0]) + ' a ' + br(dias[dias.length - 1]) + '. Use as setas pra ver cada dia.');
    caixa.appendChild(svg); caixa.appendChild(balao);
    var geo = null, atual = -1;
    var uma = series.length === 1;

    function desenha() {
      var W = Math.max(280, (caixa.clientWidth || 600) - 16), H = 190, L = 34, R = uma ? 34 : 14, T = 14, B = vendas ? 32 : 24;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      var todos = [0];
      series.forEach(function (x) { todos = todos.concat(x.valores); });
      var max = niceMax(Math.max.apply(null, todos));
      var n = dias.length;
      var base = H - B;
      var x = function (i) { return L + (n === 1 ? (W - L - R) / 2 : i * (W - L - R) / (n - 1)); };
      var y = function (v) { return T + (base - T) * (1 - v / max); };
      geo = { x: x, y: y, L: L, R: R, W: W, n: n };
      var h = '';
      [0, max / 2, max].forEach(function (t) {
        h += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(t) + '" y2="' + y(t) + '" stroke="' + GRADE + '" stroke-width="1"/>' +
          '<text x="' + (L - 7) + '" y="' + (y(t) + 4) + '" text-anchor="end" font-size="11" fill="#6a6a6a">' + num(t) + '</text>';
      });
      var marcas = n > 2 ? [0, Math.floor((n - 1) / 2), n - 1] : n === 2 ? [0, 1] : [0];
      marcas.forEach(function (i, k) {
        var anc = k === 0 && n > 1 ? 'start' : k === marcas.length - 1 && n > 1 ? 'end' : 'middle';
        h += '<text x="' + x(i) + '" y="' + (H - 6) + '" text-anchor="' + anc + '" font-size="11" fill="#6a6a6a">' + br(dias[i]) + '</text>';
      });
      if (vendas) vendas.forEach(function (v, i) {
        if (v > 0) h += '<circle cx="' + x(i) + '" cy="' + (base + 9) + '" r="3.5" fill="#e8e0cf"/>';
      });
      series.forEach(function (s) {
        var pts = s.valores.map(function (v, i) { return x(i).toFixed(1) + ',' + y(v).toFixed(1); });
        if (n > 1) {
          if (uma) h += '<path d="M' + x(0) + ',' + y(0) + ' L' + pts.join(' L') + ' L' + x(n - 1) + ',' + y(0) + ' Z" fill="' + LAVAGEM + '"/>';
          h += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + s.cor + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
        }
        var ult = n - 1;
        h += '<circle cx="' + x(ult) + '" cy="' + y(s.valores[ult]) + '" r="4" fill="' + s.cor + '" stroke="' + FUNDO + '" stroke-width="2"/>';
        if (uma) h += '<text x="' + (x(ult) + 8) + '" y="' + (y(s.valores[ult]) + 4) + '" font-size="11.5" fill="#d9d9d9">' + num(s.valores[ult]) + '</text>';
      });
      h += '<line class="cruz" x1="0" x2="0" y1="' + T + '" y2="' + base + '" stroke="#5a5a5a" stroke-width="1" visibility="hidden"/>';
      series.forEach(function (s, k) {
        h += '<circle class="ponto" data-k="' + k + '" r="4" fill="' + s.cor + '" stroke="' + FUNDO + '" stroke-width="2" visibility="hidden"/>';
      });
      h += '<rect x="' + L + '" y="' + T + '" width="' + (W - L - R) + '" height="' + (base - T) + '" fill="transparent"/>';
      svg.innerHTML = h;
      if (atual >= 0) mostra(atual);
    }
    function mostra(i) {
      if (!geo) return;
      atual = i;
      var px = geo.x(i), topo = Infinity;
      var cruz = svg.querySelector('.cruz');
      cruz.setAttribute('x1', px); cruz.setAttribute('x2', px); cruz.setAttribute('visibility', 'visible');
      [].forEach.call(svg.querySelectorAll('.ponto'), function (p) {
        var s = series[Number(p.dataset.k)], py = geo.y(s.valores[i]);
        topo = Math.min(topo, py);
        p.setAttribute('cx', px); p.setAttribute('cy', py); p.setAttribute('visibility', 'visible');
      });
      var esc = (svg.getBoundingClientRect().width / geo.W) || 1;
      balao.textContent = '';
      balao.appendChild(el('span', 'dia', brAno(dias[i])));
      series.forEach(function (s) {           // valor forte, nome discreto, traço da cor
        var l = el('span', 'lin');
        l.appendChild(el('b', null, num(s.valores[i])));
        var k = el('i'); k.style.background = s.cor;
        var nome = el('span'); nome.appendChild(k); nome.appendChild(document.createTextNode(s.nome));
        l.appendChild(nome); balao.appendChild(l);
      });
      if (vendas) balao.appendChild(el('span', 'dia', vendas[i] ? (vendas[i] + (vendas[i] === 1 ? ' venda' : ' vendas') + ' no dia') : 'sem venda no dia'));
      balao.style.display = 'block';
      var left = 8 + px * esc;
      left = Math.max(90, Math.min((caixa.clientWidth || 600) - 90, left));
      balao.style.left = left + 'px';
      balao.style.top = Math.max(60, topo * esc) + 'px';
    }
    function esconde() {
      atual = -1; balao.style.display = 'none';
      var c = svg.querySelector('.cruz');
      if (c) c.setAttribute('visibility', 'hidden');
      [].forEach.call(svg.querySelectorAll('.ponto'), function (p) { p.setAttribute('visibility', 'hidden'); });
    }
    svg.addEventListener('pointermove', function (e) {
      if (!geo) return;
      var r = svg.getBoundingClientRect(), esc = geo.W / (r.width || geo.W);
      var xs = (e.clientX - r.left) * esc;
      var i = geo.n === 1 ? 0 : Math.round((xs - geo.L) / ((geo.W - geo.L - geo.R) / (geo.n - 1)));
      mostra(Math.max(0, Math.min(geo.n - 1, i)));
    });
    svg.addEventListener('pointerleave', esconde);
    svg.addEventListener('blur', esconde);
    svg.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      var i = atual < 0 ? geo.n - 1 : atual + (e.key === 'ArrowRight' ? 1 : -1);
      mostra(Math.max(0, Math.min(geo.n - 1, i)));
    });
    caixa.__desenha = desenha;
    setTimeout(desenha, 0);
    return caixa;
  }

  // os mesmos números em tabela, pra quem não quer (ou não pode) passar o mouse
  function tabelaDias(dias, colunas) {
    var d = el('details', 'an-det');
    d.appendChild(el('summary', null, 'Ver os números por dia'));
    var box = el('div', 'an-rolar'), t = el('table', 'an-tab');
    var cab = el('tr'); cab.appendChild(el('th', null, 'Dia'));
    colunas.forEach(function (c) { cab.appendChild(el('th', null, c.nome)); });
    t.appendChild(cab);
    for (var i = dias.length - 1; i >= 0; i--) {
      var tr = el('tr'); tr.appendChild(el('td', null, brAno(dias[i])));
      colunas.forEach(function (c) { tr.appendChild(el('td', null, num(c.valores[i]))); });
      t.appendChild(tr);
    }
    box.appendChild(t); d.appendChild(box);
    return d;
  }

  // bloco: título + botões de liga/desliga por métrica + gráfico + tabela.
  // Até 3 linhas por vez (3 cores que passam no validador em todos os pares).
  // Cada linha ligada ocupa uma das 3 vagas de cor e fica com ela enquanto
  // estiver ligada: desligar uma não repinta as outras. Com 3 ligadas, as
  // demais ficam travadas até você desligar uma.
  function evolucao(titulo, sub, dias, serie, metricas, padrao, vendas) {
    var b = el('div', 'an-bloco');
    b.appendChild(el('h3', null, titulo));
    if (sub) b.appendChild(el('p', 'an-sub', sub));
    var chips = el('div', 'an-chips'), alvo = el('div');
    chips.setAttribute('role', 'group'); chips.setAttribute('aria-label', 'Linhas do gráfico (até 3)');
    b.appendChild(chips); b.appendChild(alvo);
    var vaga = {};                              // métrica -> índice da cor
    (padrao || metricas.slice(0, 3).map(function (m) { return m[0]; })).forEach(function (k, i) { vaga[k] = i; });
    var valores = function (k) { return serie[k] || dias.map(function () { return 0; }); };
    var ligadas = function () { return Object.keys(vaga).length; };
    function desenha() {
      [].forEach.call(chips.querySelectorAll('button'), function (c) {
        var on = c.dataset.k in vaga;
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
        c.disabled = !on && ligadas() >= 3;
        c.title = c.disabled ? 'Máximo de 3 linhas: desligue uma pra ligar esta' : '';
        c.querySelector('.k').style.background = on ? CORES[vaga[c.dataset.k]] : '#3a3a3a';
      });
      alvo.textContent = '';
      var vis = [];
      metricas.forEach(function (m) { if (m[0] in vaga) vis.push({ nome: m[1], cor: CORES[vaga[m[0]]], valores: valores(m[0]) }); });
      var pontos = vendas && !('pago' in vaga);      // com a linha Pagaram ligada, o ponto é redundante
      if (nota) nota.hidden = !pontos;
      alvo.appendChild(grafico(dias, vis, pontos ? vendas : null));
      var cols = metricas.map(function (m) { return { nome: m[1], valores: valores(m[0]) }; });
      alvo.appendChild(tabelaDias(dias, cols));
    }
    metricas.forEach(function (m) {
      var c = el('button'); c.type = 'button'; c.dataset.k = m[0];
      c.appendChild(el('span', 'k')); c.appendChild(document.createTextNode(m[1]));
      c.addEventListener('click', function () {
        if (m[0] in vaga) {
          if (ligadas() === 1) return;             // sempre fica ao menos uma
          delete vaga[m[0]];
        } else {
          if (ligadas() >= 3) return;
          var usadas = Object.keys(vaga).map(function (k) { return vaga[k]; });
          vaga[m[0]] = [0, 1, 2].filter(function (x) { return usadas.indexOf(x) < 0; })[0];
        }
        desenha();
      });
      chips.appendChild(c);
    });
    var nota = vendas ? chips.appendChild(el('span', 'nota', 'dia com venda')) : null;
    desenha();
    return b;
  }

  function tiles(lista) {
    var box = el('div', 'an-tiles');
    lista.forEach(function (t) {
      var d = el('div', 'an-tile');
      d.appendChild(el('span', null, t[0]));
      d.appendChild(el('b', null, t[1]));
      if (t[2]) d.appendChild(el('small', null, t[2]));
      box.appendChild(d);
    });
    return box;
  }

  // barras horizontais em ordem (funil): valor na ponta, % ao lado, detalhe no hover/foco
  function barras(titulo, sub, linhas) {
    var b = el('div', 'an-bloco');
    b.appendChild(el('h3', null, titulo));
    if (sub) b.appendChild(el('p', 'an-sub', sub));
    var box = el('div', 'an-barras');
    var max = Math.max.apply(null, linhas.map(function (l) { return l[1]; }).concat([1]));
    linhas.forEach(function (l) {
      var row = el('div', 'an-barra');
      row.appendChild(el('span', null, l[0]));
      var tr = el('div', 'an-trilho');
      var w = l[1] ? Math.max(1, l[1] * 72 / max) : 0;
      var bar = el('i'); bar.style.width = w + '%'; tr.appendChild(bar);
      var v = el('em', null, num(l[1])); if (l[2]) v.appendChild(el('small', null, l[2]));
      v.style.left = 'calc(' + w + '% + 8px)'; tr.appendChild(v);
      tr.title = l[0] + ': ' + num(l[1]) + (l[3] ? ' · ' + l[3] : '');
      tr.setAttribute('tabindex', '0');
      tr.setAttribute('aria-label', tr.title);
      row.appendChild(tr);
      box.appendChild(row);
    });
    b.appendChild(box);
    return b;
  }

  // mesma busca do catálogo: vai filtrando enquanto digita, sem ligar pra
  // maiúscula nem acento
  var normal = function (x) { return String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); };
  // opts: { vazio, busca: 'placeholder', limite: 10 }. Sem busca digitada mostra
  // as primeiras `limite` linhas (já vêm ordenadas); com busca, mostra o que
  // casar (até 50). b.__filtra(q) deixa uma busca de fora comandar a tabela.
  function tabela(titulo, sub, colunas, linhas, opts) {
    opts = opts || {};
    var b = el('div', 'an-bloco');
    b.appendChild(el('h3', null, titulo));
    if (sub) b.appendChild(el('p', 'an-sub', sub));
    if (!linhas.length) { b.appendChild(el('p', 'an-sub', opts.vazio || 'Nada nesse período.')); b.__filtra = function () {}; return b; }
    var limite = opts.limite || 0, MAX_BUSCA = 50;
    var chaves = linhas.map(function (l) { return normal(Array.isArray(l[0]) ? l[0].slice(0, 2).join(' ') : l[0]); });
    if (opts.busca) b.appendChild(campoBusca(opts.busca, function (q) { b.__filtra(q); }));
    var box = el('div', 'an-rolar'), t = el('table', 'an-tab'), mais = el('p', 'an-mais');
    var cab = el('tr'); colunas.forEach(function (c) { cab.appendChild(el('th', null, c)); });
    function linha(l) {
      var tr = el('tr');
      l.forEach(function (c, i) {
        var td = el('td');
        if (i === 0 && Array.isArray(c)) {
          td.appendChild(document.createTextNode(c[0]));
          // 3º item = etiqueta (Beat / Música), pra separar faixas de mesmo nome
          if (c[2]) td.appendChild(el('span', 'an-tag' + (c[2] === 'Beat' ? ' beat' : ''), c[2]));
          td.appendChild(el('small', null, c[1]));
        }
        else td.textContent = c;
        tr.appendChild(td);
      });
      return tr;
    }
    b.__filtra = function (qBruto) {
      var q = normal(String(qBruto || '').trim());
      var idx = [];
      for (var i = 0; i < linhas.length; i++) if (!q || chaves[i].indexOf(q) > -1) idx.push(i);
      var teto = q ? MAX_BUSCA : (limite || linhas.length);
      t.textContent = ''; t.appendChild(cab);
      idx.slice(0, teto).forEach(function (i) { t.appendChild(linha(linhas[i])); });
      if (!idx.length) mais.textContent = 'Nenhum resultado pra essa busca.';
      else if (idx.length > teto) mais.textContent = q
        ? 'Mostrando ' + teto + ' de ' + idx.length + ' resultados. Continue digitando pra achar.'
        : 'Mostrando ' + teto + ' de ' + linhas.length + '. Use a busca pra achar os outros.';
      else mais.textContent = '';
    };
    box.appendChild(t); b.appendChild(box); b.appendChild(mais);
    b.__filtra('');
    return b;
  }
  function campoBusca(placeholder, aoDigitar) {
    var campo = el('label', 'an-busca');
    campo.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6a6a6a" stroke-width="1.9"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.6-4.6"/></svg>';
    var inp = el('input'); inp.type = 'search'; inp.placeholder = placeholder; inp.setAttribute('aria-label', placeholder); inp.autocomplete = 'off';
    campo.appendChild(inp);
    inp.addEventListener('input', function () { aoDigitar(inp.value); });
    return campo;
  }

  /* ---------- as três abas ---------- */
  function vitrine(j, corpo) {
    var a = j.agora, an = j.antes;
    var V = a.visita.total;
    corpo.appendChild(tiles([
      ['Visitas', num(V), delta(V, an.visita.total)],
      ['Deram play', num(a.play.total), pct(a.play.total, V) + ' das visitas'],
      ['Puseram no carrinho', num(a.carrinho.total), pct(a.carrinho.total, V) + ' das visitas'],
      ['Pagaram', num(a.pago.total), delta(a.pago.total, an.pago.total)],
      ['Conversão', pct(a.pago.total, V), 'visitas que viraram venda']
    ]));
    if (!V) corpo.appendChild(el('div', 'an-vazio', 'Nenhuma visita contada nesse período. O funil da vitrine começou a contar no deploy de 24/09/2026.'));
    corpo.appendChild(evolucao('Evolução por dia', 'Cada visita conta uma vez por etapa. Até 3 linhas por vez: desligue uma pra ligar outra.', j.dias, j.serie,
      [['visita', 'Visitas'], ['play', 'Deram play'], ['carrinho', 'Puseram no carrinho'], ['checkout', 'Abriram o checkout'], ['pagamento', 'Chegaram no pagamento'], ['pago', 'Pagaram']],
      ['visita', 'carrinho', 'pago'], j.serie.pago));
    var NOMES = { visita: 'Visitas', play: 'Deram play', carrinho: 'Puseram no carrinho', checkout: 'Abriram o checkout', pagamento: 'Chegaram no pagamento', pago: 'Pagaram' };
    var ant = null;
    var dois = el('div', 'an-dois');
    dois.appendChild(barras('Funil da vitrine', 'Da home até o pagamento. O % pequeno é de quem passou pela etapa anterior.',
      j.etapas.map(function (e) {
        var n = a[e].total, linha = [NOMES[e], n, e === 'visita' ? '' : pct(n, ant), pct(n, V) + ' das visitas'];
        ant = n; return linha;
      })));
    var ap = el('div', 'an-bloco');
    ap.appendChild(el('h3', null, 'Celular ou computador'));
    ap.appendChild(el('p', 'an-sub', 'Das visitas no período.'));
    var med = el('div', 'an-medidor'), cel = el('i');
    cel.style.width = V ? (a.visita.celular * 100 / V) + '%' : '0';
    med.appendChild(cel); ap.appendChild(med);
    var leg = el('div', 'an-leg');
    leg.appendChild(el('span', null, 'Celular ' + pct(a.visita.celular, V) + ' · ' + num(a.visita.celular)));
    leg.appendChild(el('span', null, 'Computador ' + pct(a.visita.computador, V) + ' · ' + num(a.visita.computador)));
    ap.appendChild(leg);
    dois.appendChild(ap);
    corpo.appendChild(dois);
    corpo.appendChild(tabela('De onde vieram', 'Use ?de=bio ou ?de=story nos links que você divulga pra separar a origem.', ['Origem', 'Visitas', 'Carrinho', 'Pagaram'],
      j.origens.map(function (o) { return [nomeOrigem(o), num(o.visitas), num(o.carrinho), num(o.pagos)]; }), { vazio: 'Nenhuma visita nesse período.' }));
    // beats tocados e adições ao carrinho: top 10, com uma busca só pras duas
    var bb = el('div', 'an-bloco');
    bb.appendChild(el('h3', null, 'Beats'));
    bb.appendChild(el('p', 'an-sub', 'Quantas visitas tocaram cada beat e quantas puseram no carrinho. Todos os beats da vitrine, inclusive os zerados.'));
    var top = el('div', 'an-dois');
    var tt = tabela('Beats tocados', null, ['Beat', 'Visitas'],
      j.tocados.map(function (x) { return [x.vendido ? [x.nome, 'vendido'] : x.nome, num(x.n)]; }), { limite: 10 });
    var tc = tabela('Adições ao carrinho', null, ['Beat', 'Visitas'],
      j.carrinhos.map(function (x) { return [x.vendido ? [x.nome, 'vendido'] : x.nome, num(x.n)]; }), { limite: 10 });
    bb.appendChild(campoBusca('Buscar beat', function (q) { tt.__filtra(q); tc.__filtra(q); }));
    top.appendChild(tt); top.appendChild(tc);
    bb.appendChild(top);
    corpo.appendChild(bb);
  }

  function tapes(j, corpo) {
    var a = j.agora, an = j.antes, v = j.vitrine || { visitas: 0, pagos: 0 };
    corpo.appendChild(tiles([
      ['Pessoas que abriram', num(a.pessoas), delta(a.pessoas, an.pessoas)],
      ['Plays', num(a.play), delta(a.play, an.play)],
      ['Cliques no carrinho', num(a.carrinho), delta(a.carrinho, an.carrinho)],
      ['Chegaram na vitrine', num(v.visitas), 'vindas das tapes'],
      ['Vendas', num(v.pagos), 'de quem veio das tapes']
    ]));
    if (!a.open && !a.play) corpo.appendChild(el('div', 'an-vazio', 'Nenhuma beat tape aberta nesse período.'));
    corpo.appendChild(evolucao('Evolução por dia', 'Até 3 linhas por vez: desligue uma pra ligar outra.', j.dias, j.serie,
      [['pessoas', 'Pessoas que abriram'], ['open', 'Aberturas'], ['play', 'Plays'], ['carrinho', 'Cliques no carrinho'], ['vitrine', 'Chegaram na vitrine']],
      ['pessoas', 'play', 'carrinho']));
    corpo.appendChild(barras('Da tape até a venda', 'Pessoas diferentes em cada etapa. "Chegaram na vitrine" conta quem saiu de uma tape pelo botão de carrinho.', [
      ['Abriram a tape', a.pessoas, '', ''],
      ['Ouviram algum beat', a.ouviram, pct(a.ouviram, a.pessoas), ''],
      ['Clicaram no carrinho', a.clicaram, pct(a.clicaram, a.ouviram), ''],
      ['Chegaram na vitrine', v.visitas, '', ''],
      ['Pagaram', v.pagos, pct(v.pagos, v.visitas), '']
    ]));
    corpo.appendChild(tabela('Por beat tape', null, ['Tape', 'Pessoas', 'Plays', 'Carrinho', 'Vitrine', 'Vendas'],
      j.lista.map(function (t) { return [t.name, num(t.pessoas), num(t.play), num(t.carrinho), num(t.vitrine), num(t.pagos)]; }),
      { busca: 'Buscar beat tape', limite: 10, vazio: 'Nenhuma beat tape convertida ainda.' }));
    corpo.appendChild(tabela('Beats das tapes', 'Plays no período. Todos os beats, inclusive os zerados.', ['Beat', 'Plays'],
      j.faixas.map(function (f) { return [[f.title, f.onde], num(f.n)]; }), { busca: 'Buscar beat ou tape', limite: 10 }));
  }

  function artistas(j, corpo) {
    var a = j.agora, an = j.antes;
    corpo.appendChild(tiles([
      ['Aberturas', num(a.open), delta(a.open, an.open)],
      ['Pessoas', num(a.pessoas), delta(a.pessoas, an.pessoas)],
      ['Plays', num(a.play), delta(a.play, an.play)],
      ['Downloads', num(a.download), delta(a.download, an.download)],
      ['Artistas ativos', num(a.ativos), 'abriram o link no período']
    ]));
    if (!a.open && !a.play) corpo.appendChild(el('div', 'an-vazio', 'Nenhum link de artista aberto nesse período.'));
    corpo.appendChild(evolucao('Evolução por dia', 'Até 3 linhas por vez: desligue uma pra ligar outra.', j.dias, j.serie,
      [['pessoas', 'Pessoas'], ['open', 'Aberturas'], ['play', 'Plays'], ['download', 'Downloads']],
      ['pessoas', 'play', 'download']));
    var ult = function (iso) { if (!iso) return '—'; return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); };
    corpo.appendChild(tabela('Por artista', 'Ordenado por aberturas no período.', ['Artista', 'Aberturas', 'Pessoas', 'Plays', 'Downloads', 'Última'],
      j.lista.map(function (t) { return [t.name, num(t.open), num(t.pessoas), num(t.play), num(t.download), ult(t.ultima)]; }),
      { busca: 'Buscar artista', limite: 10, vazio: 'Nenhum artista convertido ainda.' }));
    corpo.appendChild(tabela('Faixas', 'Plays no período. Todas as faixas, inclusive as zeradas.', ['Faixa', 'Plays'],
      j.faixas.map(function (f) { return [[f.title, f.onde, f.kind === 'beat' ? 'Beat' : 'Música'], num(f.n)]; }), { busca: 'Buscar faixa ou artista', limite: 10 }));
  }

  /* ---------- montagem ---------- */
  window.CaramujoAnalytics = {
    abrir: function (raiz, voltar) {
      if (!document.getElementById('an-css')) { var st = el('style'); st.id = 'an-css'; st.textContent = CSS; document.head.appendChild(st); }
      var estado = { aba: 'vitrine', de: soma(hoje(), -29), ate: hoje(), preset: 30 };
      try { var s = JSON.parse(sessionStorage.getItem('an-estado') || 'null'); if (s && s.aba) estado = s; } catch (_) {}
      if (estado.preset) { estado.ate = hoje(); estado.de = soma(estado.ate, -(estado.preset - 1)); }
      raiz.textContent = '';


      var filtros = el('div', 'an-filtros');
      var abas = el('div', 'an-seg'); abas.setAttribute('role', 'group'); abas.setAttribute('aria-label', 'O que ver');
      [['vitrine', 'Vitrine'], ['tapes', 'Beat tapes'], ['artistas', 'Artistas']].forEach(function (x) {
        var b = el('button', null, x[1]); b.type = 'button'; b.dataset.aba = x[0];
        b.addEventListener('click', function () { estado.aba = x[0]; puxa(); });
        abas.appendChild(b);
      });
      var per = el('div', 'an-seg'); per.setAttribute('role', 'group'); per.setAttribute('aria-label', 'Período');
      [[7, '7 dias'], [30, '30 dias'], [90, '90 dias'], [0, 'Escolher']].forEach(function (x) {
        var b = el('button', null, x[1]); b.type = 'button'; b.dataset.p = x[0];
        b.addEventListener('click', function () {
          estado.preset = x[0];
          if (x[0]) { estado.ate = hoje(); estado.de = soma(estado.ate, -(x[0] - 1)); puxa(); } else pinta();
        });
        per.appendChild(b);
      });
      var datas = el('div', 'an-datas');
      var iDe = el('input'); iDe.type = 'date'; iDe.setAttribute('aria-label', 'De');
      var iAte = el('input'); iAte.type = 'date'; iAte.setAttribute('aria-label', 'Até');
      datas.appendChild(iDe); datas.appendChild(document.createTextNode('até')); datas.appendChild(iAte);
      [iDe, iAte].forEach(function (i) {
        i.addEventListener('change', function () {
          if (!iDe.value || !iAte.value) return;
          estado.de = iDe.value <= iAte.value ? iDe.value : iAte.value;
          estado.ate = iDe.value <= iAte.value ? iAte.value : iDe.value;
          puxa();
        });
      });
      // período e datas no canto direito, alinhados com o fim dos gráficos
      var dir = el('div', 'an-dir'); dir.appendChild(datas); dir.appendChild(per);
      filtros.appendChild(abas); filtros.appendChild(dir);
      raiz.appendChild(filtros);
      var legenda = el('div', 'an-periodo'); raiz.appendChild(legenda);
      var corpo = el('div', 'an-corpo'); raiz.appendChild(corpo);

      function pinta() {
        [].forEach.call(abas.children, function (b) { b.setAttribute('aria-pressed', b.dataset.aba === estado.aba ? 'true' : 'false'); });
        [].forEach.call(per.children, function (b) { b.setAttribute('aria-pressed', Number(b.dataset.p) === Number(estado.preset) ? 'true' : 'false'); });
        datas.style.display = Number(estado.preset) === 0 ? 'flex' : 'none';
        iDe.value = estado.de; iAte.value = estado.ate; iDe.max = iAte.max = hoje();
      }
      var pedido = 0;
      function puxa() {
        pinta();
        try { sessionStorage.setItem('an-estado', JSON.stringify(estado)); } catch (_) {}
        corpo.classList.add('carregando');          // o quadro antigo fica, mais apagado
        var meu = ++pedido;
        fetch('/api/painel?op=analytics&aba=' + estado.aba + '&de=' + estado.de + '&ate=' + estado.ate)
          .then(function (r) { return r.json(); })
          .then(function (j) {
            if (meu !== pedido) return;
            corpo.classList.remove('carregando');
            corpo.textContent = '';
            if (!j || !j.dias) { corpo.appendChild(el('div', 'vazio', 'Não consegui carregar. Tenta de novo.')); return; }
            legenda.textContent = brAno(j.de) + ' a ' + brAno(j.ate) + ' · ' + j.dias.length + (j.dias.length === 1 ? ' dia' : ' dias') +
              ', comparado com os ' + j.dias.length + (j.dias.length === 1 ? ' dia' : ' dias') + ' antes';
            (j.aba === 'tapes' ? tapes : j.aba === 'artistas' ? artistas : vitrine)(j, corpo);
          })
          .catch(function () {
            if (meu !== pedido) return;
            corpo.classList.remove('carregando');
            corpo.textContent = '';
            corpo.appendChild(el('div', 'vazio', 'Não consegui carregar. Tenta de novo.'));
          });
      }
      var tempo;
      window.addEventListener('resize', function () {
        clearTimeout(tempo);
        tempo = setTimeout(function () { [].forEach.call(corpo.querySelectorAll('.an-graf'), function (g) { if (g.__desenha) g.__desenha(); }); }, 120);
      });
      puxa();
    }
  };
  // o script chegou depois de a pessoa já ter tocado em Analytics
  var alvo = document.getElementById('analytics');
  if (alvo && !alvo.hidden && !alvo.dataset.montado && window.__painelIr) window.__painelIr('analytics');
})();
