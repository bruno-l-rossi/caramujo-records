/* Vitrine do painel (24/09/2026): a loja do site, que antes era editar o
   index.html e o coupons.json e fazer push.
   - Beats: a lista do site (editar, vender, desfazer vendido, subir pro topo)
     + o que está sem áudio. O destaque do hero saiu em 03/11/2026.
   - Fila: beat disponível numa tape paga que ainda não está no site. Publicar
     pede o gênero (nunca adivinho gênero).
   - Cupons: criar, buscar, editar (desconto e limite de usos), pausar, ver cada uso.
   Carregado só pelo /painel. Os dados vêm de /api/painel (exige o login). */
(function () {
  var CSS = [
    '.vt-seg{display:flex;background:#111;border:1px solid var(--borda);border-radius:999px;padding:3px;margin:18px 0 14px;width:max-content;max-width:100%}',
    '.vt-seg button{border:0;background:transparent;color:var(--ink3);font-size:13.5px;font-weight:500;padding:8px 15px;border-radius:999px;cursor:pointer;white-space:nowrap}',
    '.vt-seg button[aria-pressed="true"]{background:#fff;color:#000}',
    '.vt-seg em{font-style:normal;color:#e0b155;margin-left:5px}',
    '.vt-seg button[aria-pressed="true"] em{color:#8a5a00}',
    '@media (max-width:380px){.vt-seg button{padding:8px 11px;font-size:13px}}',
    '.vt-filtros{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 6px}',
    '.vt-filtros .campo{flex:1 1 220px}',
    '.vt-chips{display:flex;gap:6px}',
    '.vt-chips button{border:1px solid var(--borda);background:#141414;color:var(--ink2);font-size:12.5px;padding:7px 12px;border-radius:999px;cursor:pointer;white-space:nowrap}',
    '.vt-chips button[aria-pressed="true"]{border-color:#fff;color:#fff}',
    '.vt-conta{font-size:12px;color:var(--ink4);margin:10px 0 2px}',
    '.vt-linha .nome{display:flex;align-items:center;gap:8px}',
    '.vt-linha .nome span{overflow:hidden;text-overflow:ellipsis}',
    '.vt-vend .nome span{text-decoration:line-through;text-decoration-color:rgba(255,255,255,.35);color:var(--ink3)}',
    '.vt-tag{flex:none;font-size:10px;letter-spacing:.08em;text-transform:uppercase;border:1px solid #3a3a3a;color:var(--ink3);padding:2px 6px;border-radius:999px}',
    '.vt-mais{display:block;width:100%;margin-top:12px;padding:12px;border-radius:12px;border:1px solid var(--borda);background:#141414;color:var(--ink2);font-size:13.5px;cursor:pointer}',
    '.vt-form{display:flex;flex-direction:column;gap:12px;margin-top:16px}',
    '.vt-form label{display:flex;flex-direction:column;gap:6px;font-size:11px;letter-spacing:.14em;color:var(--ink4);text-transform:uppercase}',
    '.vt-form input,.vt-form select{background:var(--campo);border:1px solid var(--borda);border-radius:12px;padding:12px 13px;font-size:15px;color:var(--ink);outline:none;width:100%;box-sizing:border-box;color-scheme:dark;letter-spacing:0;text-transform:none}',
    '.vt-form input:focus,.vt-form select:focus{border-color:#3a3a3a}',
    '.vt-form select.falta{border-color:#6b5320}',
    '.vt-dupla{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
    '.vt-nota{font-size:12.5px;color:var(--ink4);line-height:1.45}',
    '.vt-nota b{color:var(--ink2);font-weight:600}',
    '.vt-erro{font-size:13px;color:#e08d7e}',
    '.vt-erro:empty{display:none}',
    '.vt-acoes{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}',
    '.vt-acoes .pill{flex:1 1 auto;justify-content:center}',
    '.vt-perigo{border-color:#5a2a22!important;color:#f0b3a6}',
    '.vt-confirma{margin-top:12px;border:1px solid #5a2a22;background:#1a100e;border-radius:12px;padding:12px 14px;font-size:13px;color:#e8c9c2;line-height:1.45}',
    '.vt-confirma[hidden]{display:none}',
    '.vt-confirma .vt-acoes{margin-top:10px}',
    '.vt-novo{background:#101010;border:1px solid var(--borda);border-radius:14px;padding:14px;margin-bottom:16px}',
    '.vt-novo h3{margin:0;font-size:15px;font-weight:600}',
    '.vt-novo .vt-form{margin-top:10px}',
    '.vt-tipo{display:flex;background:#141414;border:1px solid var(--borda);border-radius:12px;padding:3px}',
    '.vt-tipo button{flex:1;border:0;background:transparent;color:var(--ink3);font-size:13.5px;padding:9px;border-radius:9px;cursor:pointer}',
    '.vt-tipo button[aria-pressed="true"]{background:#fff;color:#000;font-weight:600}',
    '.vt-cupom{display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--linha)}',
    '.vt-cupom .linha{flex:1;min-width:0}',
    '.vt-cupom.pausado .nome{color:var(--ink3)}',
    '.vt-vazio{padding:28px 0;color:#5a5a5a;font-size:14px;line-height:1.5}',
    '.vt-usos .ev span:last-child{margin-left:auto;color:var(--ink3)}',
    '.vt-buscar{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#101010;border:1px solid var(--borda);border-radius:14px;padding:12px 14px;margin-bottom:16px}',
    '.vt-buscar small{display:block;font-size:12px;color:var(--ink4);margin-top:3px;line-height:1.4}',
    '.vt-buscar b{font-size:14px;font-weight:600}',
    '.vt-buscar .pill{flex:none;padding:9px 14px;font-size:13px}',
    '.vt-tape{border:1px solid var(--borda);border-radius:16px;padding:14px;margin-bottom:14px;background:#0e0e0e}',
    '.vt-tape-topo{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:6px}',
    '.vt-tape-topo b{font-size:16px;font-weight:700}',
    '.vt-tape-topo small{font-size:12px;color:var(--ink4);white-space:nowrap}',
    '.vt-tape .revisar{margin:8px 0 10px}',
    '.vt-tape .revisar .pill{margin-top:10px;padding:8px 13px;font-size:13px}',
    '.vt-fl{display:grid;grid-template-columns:auto 1fr auto auto;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--linha)}',
    '.vt-fl:last-of-type{border-bottom:0}',
    '.vt-fl input[type=checkbox]{width:20px;height:20px;accent-color:#fff;margin:0}',
    '.vt-fl .nome{font-size:15px}',
    '.vt-fl .meta i{font-style:normal;color:#b99a5b}',
    '.vt-fl .meta em{font-style:normal;color:#e0b155}',
    '.vt-fl select{background:var(--campo);border:1px solid var(--borda);border-radius:10px;padding:8px 8px;font-size:13px;color:var(--ink);max-width:128px;color-scheme:dark}',
    '.vt-fl select.falta{border-color:#6b5320}',
    '.vt-fl .vt-ed{border:1px solid var(--borda);background:#141414;border-radius:10px;width:36px;height:36px;color:var(--ink2);cursor:pointer;font-size:15px}',
    '.vt-fl-erro{grid-column:2 / -1;font-size:12px;color:#e08d7e}',
    '.vt-tape-pe{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:12px}',
    '.vt-tape-pe select{flex:1 1 150px;background:var(--campo);border:1px solid var(--borda);border-radius:999px;padding:10px 14px;font-size:13.5px;color:var(--ink);color-scheme:dark}',
    '.vt-tape-pe .pill{flex:1 1 180px;justify-content:center}',
    '@media (max-width:420px){.vt-fl{grid-template-columns:auto 1fr auto}.vt-fl select{grid-column:2 / 3;max-width:none}.vt-fl .vt-ed{grid-row:1;grid-column:3}}',
    /* 04/11/2026 (revisão do painel, itens 6, 7, 9 e 12): a lista com capa, ▶ e ⋯ (tabela no computador),
       a folha do beat com À venda/Vendido em cima, os cupons com a lista primeiro e a fila com o gênero no toque */
    '.vt-row{display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--linha)}',
    '.vt-row .linha{flex:1;min-width:0;padding:6px 0}',
    '.vt-row .vt-col{display:none}',
    '.vt-th{position:relative;width:46px;height:46px;flex:none;border-radius:10px;background:#1a1a1a url(/assets/brand/selo-creme.svg) center/55% no-repeat;overflow:visible}',
    '.vt-th img{width:100%;height:100%;object-fit:cover;border-radius:10px;display:block}',
    '.vt-play{position:absolute;right:-5px;bottom:-5px;width:26px;height:26px;border-radius:50%;border:2px solid #0a0a0a;background:#fff;color:#000;display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer}',
    '.vt-play.on{background:var(--at,#e0b155)}',
    '.vt-vend .vt-th{opacity:.5}',
    '.vt-mn{width:38px;height:38px;flex:none;border:0;border-radius:10px;background:transparent;color:var(--ink3);display:flex;align-items:center;justify-content:center;cursor:pointer}',
    '.vt-mn:hover{background:#1a1a1a;color:#fff}',
    '.vt-menu{position:fixed;z-index:40;min-width:210px;background:#1c1c1c;border:1px solid #2c2c2c;border-radius:14px;padding:6px;box-shadow:0 18px 40px rgba(0,0,0,.6)}',
    '.vt-menu[hidden]{display:none}',
    '.vt-menu button{display:flex;align-items:center;gap:10px;width:100%;padding:11px 12px;border:0;border-radius:9px;background:transparent;color:var(--ink);font-size:14px;text-align:left;cursor:pointer}',
    '.vt-menu button:hover{background:#262626}',
    '.vt-menu button.conf{background:var(--at,#e0b155);color:#000;font-weight:650}',
    '.vt-cab-t{display:none}',
    '@media (min-width:900px){.vt-cab-t{display:grid;grid-template-columns:46px minmax(0,1fr) 130px 64px 64px 104px 38px;gap:12px;padding:8px 0;font-size:12px;font-weight:600;color:var(--ink4);border-bottom:1px solid var(--linha)}',
    '  .vt-row{display:grid;grid-template-columns:46px minmax(0,1fr) 130px 64px 64px 104px 38px;gap:12px}.vt-row .vt-col{display:block;font-size:14px;color:var(--ink2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.vt-row .linha .meta{display:none}.vt-row .linha .seta{display:none}.vt-row .vt-tag{display:none}}',
    '.vt-sit{display:inline-block;font-size:11px;font-weight:650;padding:3px 8px;border-radius:999px;background:#1b1b1b;color:var(--ink2)}',
    '.vt-sit.vd{background:transparent;border:1px solid #333;color:var(--ink3)}',
    '.vt-f-cab{display:flex;align-items:center;gap:14px}',
    '.vt-f-cab .vt-th{width:62px;height:62px;border-radius:12px}',
    '.vt-f-cab .vt-th img{border-radius:12px}',
    '.vt-f-cab .vt-play{width:30px;height:30px}',
    '.vt-f-cab .t{flex:1;min-width:0}',
    '.vt-f-cab h2{margin:0;font-size:22px;letter-spacing:-.02em}',
    '.vt-f-cab p{margin:3px 0 0}',
    '.vt-est{display:flex;gap:4px;margin-top:18px;padding:4px;border-radius:14px;background:#0f0f0f}',
    '.vt-est button{flex:1;min-height:46px;border:0;border-radius:11px;background:transparent;color:var(--ink3);font-size:15px;font-weight:650;cursor:pointer}',
    '.vt-est button[aria-pressed="true"]{background:#fff;color:#000}',
    '.vt-acs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}',
    '.vt-acs button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;min-height:72px;border:0;border-radius:14px;background:#1b1b1b;color:#e6e6e6;font-size:12.5px;font-weight:600;cursor:pointer}',
    '.vt-acs button:hover{background:#222}',
    '.vt-acs button:disabled{opacity:.5}',
    '.vt-tirar{display:block;margin:18px auto 0;border:0;background:none;color:var(--erro,#e08d7e);font-size:14px;font-weight:650;cursor:pointer;padding:8px}',
    '.vt-salvar:disabled{background:#1b1b1b!important;color:var(--ink4)!important;border-color:#1b1b1b!important}',
    '.vt-uso{height:4px;border-radius:2px;background:#262626;margin-top:8px;overflow:hidden;max-width:260px}',
    '.vt-uso i{display:block;height:4px;background:#fff}',
    '.vt-cupom .linha{padding:13px 0}',
    '.vt-novo-bt{width:100%;justify-content:center;margin-top:12px}',
    '.vt-gens{display:flex;gap:6px;margin:10px 0 2px;padding-left:56px;overflow-x:auto;scrollbar-width:none}',
    '.vt-gens::-webkit-scrollbar{display:none}',
    '.vt-gens button{flex:none;min-height:34px;padding:0 13px;border:0;border-radius:999px;background:#1b1b1b;color:var(--ink2);font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap}',
    '.vt-gens button[aria-pressed="true"]{background:#fff;color:#000}',
    '.vt-fq{padding:10px 0 12px;border-bottom:1px solid var(--linha)}',
    '.vt-fq:last-of-type{border-bottom:0}',
    '.vt-fq-l{display:flex;align-items:center;gap:12px}',
    '.vt-fq-l .vt-th{width:44px;height:44px}',
    '.vt-fq-l .t{flex:1;min-width:0;border:0;background:none;padding:0;text-align:left;color:inherit;cursor:pointer}',
    '.vt-fq-l .t b{display:block;font-size:15px;font-weight:650}',
    '.vt-fq-l .t small{display:block;margin-top:2px;font-size:12.5px;color:var(--ink3)}',
    '.vt-fq-l .t small em{font-style:normal;color:var(--at,#e0b155)}',
    '.vt-fq-l input[type=checkbox]{width:24px;height:24px;accent-color:#fff;margin:0;flex:none}',
    '.vt-fq-erro{padding-left:56px;font-size:12px;color:var(--erro,#e08d7e);margin-top:4px}',
    '.vt-pub{position:sticky;bottom:calc(76px + env(safe-area-inset-bottom,0px));z-index:12;display:flex;align-items:center;gap:12px;margin-top:14px;padding:10px 10px 10px 16px;border-radius:18px;background:#1d1d1d;box-shadow:0 10px 30px rgba(0,0,0,.55)}',
    '.vt-pub[hidden]{display:none}',
    '.vt-pub .t{flex:1;min-width:0;font-size:13px;color:var(--ink3)}',
    '.vt-pub .t b{display:block;font-size:14.5px;color:#fff;font-weight:650}',
    '@media (min-width:900px){.vt-pub{bottom:16px}}'
  ].join('\n');

  var $ = function (i) { return document.getElementById(i); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function sem(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function slug(s) { return sem(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
  function flash(m) { if (window.__painelFlash) window.__painelFlash(m); }
  function fechar() { if (window.__painelFechar) window.__painelFechar(); }
  function pedir(op) {
    return fetch('/api/painel?op=' + op).then(function (r) { return r.json(); });
  }
  function acao(op, body) {
    return fetch('/api/painel?op=' + op, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
    }).then(function (r) { return r.json(); }).catch(function () { return { erro: 'sem conexão, tenta de novo' }; });
  }
  function dataBR(iso) {
    if (!iso) return '';
    var p = String(iso).slice(0, 10).split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso;
  }
  function quando(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '') + ' ' +
      d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  function reais(n) { return 'R$' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); }

  var raiz = null, aba = 'beats', busca = '', filtro = 'todos', mostrar = 30, buscaCupom = '', semAbas = false;   // semAbas (12/10/2026): o painel novo mostra as partes em cima
  var loja = null, lojaErro = false, rel = null, relErro = false;
  var midia = {}, midiaPedida = false, esperando = [];   // 04/11/2026: capa e MP3 de cada beat do site (de /api/vitrine)

  try { aba = sessionStorage.getItem('vt-aba') || 'beats'; } catch (_) {}
  if (['beats', 'fila', 'cupons'].indexOf(aba) < 0) aba = 'beats';

  function carregar(tudo) {
    pedir('loja').then(function (j) {
      lojaErro = !j || !Array.isArray(j.beats);
      loja = lojaErro ? null : j;
      desenhar(); avisa();
    }).catch(function () { lojaErro = true; desenhar(); avisa(); });
    if (tudo || !rel) {
      pedir('vitrine').then(function (j) {
        relErro = !j || typeof j.total !== 'number';
        rel = relErro ? null : j;
        desenhar(); avisa();
      }).catch(function () { relErro = true; desenhar(); avisa(); });
    }
    if (!midiaPedida) {
      midiaPedida = true;
      fetch('/api/vitrine').then(function (r) { return r.json(); }).then(function (j) {
        (j && j.beats || []).forEach(function (b) { midia[b.id] = { capa: b.capaP || b.capa || null, mp3: b.mp3 || null }; });
        if (raiz) desenhar(); avisa();
      }).catch(function () {});
    }
  }
  // a busca do painel (painel.js) espera os dados chegarem
  function avisa() { var l = esperando; esperando = []; l.forEach(function (f) { try { f(); } catch (_) {} }); }

  /* ---------- ▶ do painel (04/11/2026): um áudio só, o botão vira ❚❚ enquanto toca ---------- */
  var som = null, tocando = null;
  var PLAY = '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>';
  var PAUSA = '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>';
  function marcaPlay() {
    var vivo = som && !som.paused && tocando;
    document.querySelectorAll('[data-toca]').forEach(function (b) {
      var on = !!vivo && b.dataset.toca === tocando;
      b.classList.toggle('on', on); b.innerHTML = on ? PAUSA : PLAY;
      b.setAttribute('aria-label', (on ? 'Pausar ' : 'Ouvir ') + (b.dataset.nome || 'o beat'));
    });
  }
  function tocar(chave, url) {
    if (!url) { flash('Esse beat ainda não tem áudio no site.'); return; }
    if (!som) {
      som = new Audio(); som.preload = 'none';
      ['play', 'pause', 'ended'].forEach(function (ev) { som.addEventListener(ev, marcaPlay); });
    }
    if (tocando === chave && !som.paused) { som.pause(); return; }
    tocando = chave; som.src = url;
    var p = som.play(); if (p && p.catch) p.catch(function () { flash('Não consegui tocar agora.'); tocando = null; marcaPlay(); });
    marcaPlay();
  }
  function botaoPlay(chave, url, nome) {
    return '<button type="button" class="vt-play" data-toca="' + esc(chave) + '" data-url="' + esc(url || '') + '" data-nome="' + esc(nome) + '" aria-label="Ouvir ' + esc(nome) + '">' + PLAY + '</button>';
  }
  function ligarPlays(onde) {
    onde.querySelectorAll('[data-toca]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); tocar(b.dataset.toca, b.dataset.url); });
    });
    marcaPlay();
  }
  function capaBeat(b, comPlay) {
    var m = midia[b.id] || {};
    return '<span class="vt-th">' + (m.capa ? '<img src="' + esc(m.capa) + '" alt="" loading="lazy">' : '') + (comPlay && m.mp3 ? botaoPlay('b' + b.id, m.mp3, b.name) : '') + '</span>';
  }

  function generoLabel(g) { return (loja && loja.generos && loja.generos[g]) || g || ''; }
  function ficha(b) { return [generoLabel(b.genre), b.bpm ? b.bpm + ' BPM' : '', b.key].filter(Boolean).join(' · '); }
  function beatPorId(id) { return loja ? loja.beats.filter(function (b) { return b.id === id; })[0] : null; }

  /* ---------- desenho ---------- */

  function desenhar() {
    if (!raiz) return;
    var fila = rel && rel.semBotao ? rel.semBotao.length : 0;
    var h = semAbas ? '<div id="vtCorpo"></div>' : '<div class="vt-seg" role="group" aria-label="Seção da vitrine">' +
      '<button type="button" data-aba="beats" aria-pressed="' + (aba === 'beats') + '">Beats</button>' +
      '<button type="button" data-aba="fila" aria-pressed="' + (aba === 'fila') + '">Fila' + (fila ? '<em>' + fila + '</em>' : '') + '</button>' +
      '<button type="button" data-aba="cupons" aria-pressed="' + (aba === 'cupons') + '">Cupons</button></div>' +
      '<div id="vtCorpo"></div>';
    raiz.innerHTML = h;
    raiz.querySelectorAll('[data-aba]').forEach(function (b) {
      b.addEventListener('click', function () {
        aba = b.dataset.aba; busca = ''; mostrar = 30;
        try { sessionStorage.setItem('vt-aba', aba); } catch (_) {}
        desenhar();
      });
    });
    var corpo = $('vtCorpo');
    if (aba === 'fila') return abaFila(corpo);
    if (!loja) {
      corpo.innerHTML = '<div class="vt-vazio">' + (lojaErro ? 'Não consegui carregar a loja. Recarrega a página.' : 'carregando…') + '</div>';
      return;
    }
    if (aba === 'cupons') return abaCupons(corpo);
    abaBeats(corpo);
  }

  function abaBeats(corpo) {
    var beats = loja.beats;
    var aVenda = beats.filter(function (b) { return !b.sold; }).length;
    $('resumo').textContent = beats.length + ' beats no site · ' + aVenda + ' à venda · R$' + (loja.preco || '') + ' cada';

    var h = '';

    // o que não tem áudio é conserto (o beat some da lista do site sem MP3)
    // recolhível: o resumo fica à vista, a lista abre no toque (lembra a escolha)
    var aberta = false; try { aberta = localStorage.getItem('painel-vitrine-aberta') === '1'; } catch (_) {}
    if (rel && rel.semAudio && rel.semAudio.length) {
      h += '<div class="revisar"><button type="button" class="vit-topo" id="vtSemAudio" aria-expanded="' + aberta + '"><b>' +
        rel.semAudio.length + (rel.semAudio.length === 1 ? ' beat sem áudio' : ' beats sem áudio') + '</b><span class="vit-seta" aria-hidden="true">›</span></button>' +
        '<small>Eles somem da lista do site até o MP3 aparecer. Toca pra ver o motivo de cada um.</small><ul class="vit-corpo"' + (aberta ? '' : ' hidden') + '>' +
        rel.semAudio.map(function (b) {
          var f = [b.key, b.bpm ? b.bpm + 'bpm' : ''].filter(Boolean).join(' · ');
          return '<li><span class="rev-nome">' + esc(b.name) + (f ? ' <i>' + esc(f) + '</i>' : '') + (b.sold ? ' <i>vendido</i>' : '') + '</span>' +
            '<small>' + esc(b.motivo || '') + '</small></li>';
        }).join('') + '</ul></div>';
    } else if (relErro) {
      h += '<div class="revisar limpo"><b>Não consegui conferir o áudio</b><small>Recarrega a página pra ver quais beats estão sem MP3.</small></div>';
    }

    // 04/11/2026 (revisão do painel, itens 6 e 14): o filtro é o seletor de sempre do painel, com as contagens
    h += '<div class="vt-filtros"><div class="campo">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6a6a6a" stroke-width="1.9"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.6-4.6"/></svg>' +
      '<input id="vtBusca" type="search" placeholder="Buscar beat no site" autocomplete="off" aria-label="Buscar beat" value="' + esc(busca) + '"></div></div>' +
      '<div class="linha-f"><div class="seg" role="group" aria-label="Filtro dos beats">' +
      [['todos', 'Todos', beats.length], ['venda', 'À venda', aVenda], ['vendidos', 'Vendidos', beats.length - aVenda]].map(function (c) {
        return '<button type="button" data-f="' + c[0] + '" aria-pressed="' + (filtro === c[0]) + '">' + c[1] + ' <i>' + c[2] + '</i></button>';
      }).join('') + '</div></div><div id="vtLista"></div>';
    corpo.innerHTML = h;

    var sa = $('vtSemAudio');
    if (sa) sa.addEventListener('click', function () {
      var corpo = sa.parentNode.querySelector('.vit-corpo'), abre = corpo.hidden;
      corpo.hidden = !abre; sa.setAttribute('aria-expanded', String(abre));
      try { localStorage.setItem('painel-vitrine-aberta', abre ? '1' : '0'); } catch (_) {}
    });
    var campo = $('vtBusca');
    campo.addEventListener('input', function () { busca = campo.value; mostrar = 30; pintarLista(); });
    corpo.querySelectorAll('[data-f]').forEach(function (b) {
      b.addEventListener('click', function () {
        filtro = b.dataset.f; mostrar = 30;
        corpo.querySelectorAll('[data-f]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        pintarLista();
      });
    });
    pintarLista();
  }

  function pintarLista() {
    var alvo = $('vtLista'); if (!alvo) return;
    var q = sem(busca).trim();
    var lista = loja.beats.filter(function (b) {
      if (filtro === 'venda' && b.sold) return false;
      if (filtro === 'vendidos' && !b.sold) return false;
      return !q || sem(b.name).indexOf(q) > -1 || sem(generoLabel(b.genre)).indexOf(q) > -1;
    });
    if (!lista.length) { alvo.innerHTML = '<div class="vt-vazio">Nenhum beat com esse nome.</div>'; return; }
    var h = '<div class="vt-conta">' + lista.length + (lista.length === 1 ? ' beat' : ' beats') + ' · na ordem do site · ▶ pra ouvir, ⋯ pras ações rápidas</div>' +
      '<div class="vt-cab-t" aria-hidden="true"><span></span><span>Beat</span><span>Gênero</span><span>BPM</span><span>Tom</span><span>Situação</span><span></span></div>';
    // 04/11/2026 (item 6): capa com ▶, nome e ficha, ⋯ com as ações; no computador vira tabela
    h += lista.slice(0, mostrar).map(function (b) {
      return '<div class="item vt-linha vt-row' + (b.sold ? ' vt-vend' : '') + '">' + capaBeat(b, true) +
        '<button type="button" class="linha" data-id="' + b.id + '">' +
        '<span style="flex:1;min-width:0"><span class="nome"><span>' + esc(b.name) + '</span>' +
        (b.sold ? '<i class="vt-tag">vendido</i>' : '') + '</span>' +
        '<span class="meta">' + esc(ficha(b)) + '</span></span><span class="seta" aria-hidden="true">›</span></button>' +
        '<span class="vt-col">' + esc(generoLabel(b.genre)) + '</span><span class="vt-col">' + esc(b.bpm || '') + '</span><span class="vt-col">' + esc(b.key || '') + '</span>' +
        '<span class="vt-col"><i class="vt-sit' + (b.sold ? ' vd' : '') + '">' + (b.sold ? 'vendido' : 'à venda') + '</i></span>' +
        '<button type="button" class="vt-mn" data-mn="' + b.id + '" aria-label="Ações de ' + esc(b.name) + '" aria-haspopup="menu">' + PONTOS + '</button></div>';
    }).join('');
    if (lista.length > mostrar) h += '<button type="button" class="vt-mais" id="vtMais">Mostrar mais ' + Math.min(30, lista.length - mostrar) + '</button>';
    alvo.innerHTML = h;
    alvo.querySelectorAll('[data-id]').forEach(function (b) {
      b.addEventListener('click', function () { abrirBeat(beatPorId(Number(b.dataset.id))); });
    });
    alvo.querySelectorAll('[data-mn]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); abrirMenu(b, beatPorId(Number(b.dataset.mn))); });
    });
    ligarPlays(alvo);
    var m = $('vtMais'); if (m) m.addEventListener('click', function () { mostrar += 30; pintarLista(); });
  }
  var PONTOS = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>';
  var IC = {
    link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
    site: '<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v6H4V6h6"/>',
    topo: '<path d="M5 4h14"/><path d="M12 20V9"/><path d="M7 14l5-5 5 5"/>',
    vendido: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>'
  };
  function ic(k, t) { return '<svg width="' + (t || 18) + '" height="' + (t || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[k] + '</svg>'; }
  function linkDo(b) { return location.origin + '/b/' + slug(b.name); }
  function copiarLink(b) { if (navigator.clipboard) navigator.clipboard.writeText(linkDo(b)); flash('Link do ' + b.name + ' copiado.'); }
  // vender / desfazer, com a confirmação de sempre (o servidor pede confirmo: true)
  function venderOuVoltar(b, depois) {
    var op = b.sold ? 'beat-desvender' : 'beat-vender';
    return acao(op, { id: b.id, confirmo: true }).then(function (j) {
      if (!j.ok) { flash(j.erro || 'Não consegui.'); return false; }
      flash(b.sold ? b.name + ' voltou pra venda.' : b.name + ' marcado como vendido.');
      carregar(true); if (depois) depois(); return true;
    });
  }
  function subirTopo(b) {
    return acao('beat-topo', { id: b.id }).then(function (j) {
      if (!j.ok) { flash(j.erro || 'Não consegui mexer.'); return; }
      flash(b.name + ' é o primeiro da lista agora.'); carregar();
    });
  }
  // o ⋯ de cada linha: vender (2 toques: o 1º pede confirmação), copiar o link, subir pro topo, abrir no site
  var menu = null;
  function fecharMenu() { if (menu) { menu.hidden = true; menu.innerHTML = ''; } }
  function abrirMenu(bt, b) {
    if (!b) return;
    if (!menu) {
      menu = document.createElement('div'); menu.className = 'vt-menu'; menu.setAttribute('role', 'menu'); menu.hidden = true; document.body.appendChild(menu);
      document.addEventListener('click', function (e) { if (menu && !menu.hidden && !menu.contains(e.target)) fecharMenu(); });
      window.addEventListener('scroll', fecharMenu, { passive: true });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fecharMenu(); });
    }
    menu.innerHTML =
      '<button type="button" role="menuitem" data-m="vender">' + ic('vendido') + (b.sold ? 'Voltar pra venda' : 'Marcar vendido') + '</button>' +
      '<button type="button" role="menuitem" data-m="link">' + ic('link') + 'Copiar link</button>' +
      '<button type="button" role="menuitem" data-m="topo">' + ic('topo') + 'Subir pro topo</button>' +
      '<button type="button" role="menuitem" data-m="site">' + ic('site') + 'Abrir no site</button>';
    menu.hidden = false;
    var r = bt.getBoundingClientRect(), w = 220, hgt = 4 * 44 + 12;
    menu.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + 'px';
    menu.style.top = (r.bottom + hgt + 8 > innerHeight ? Math.max(8, r.top - hgt - 4) : r.bottom + 4) + 'px';
    menu.querySelectorAll('[data-m]').forEach(function (x) {
      x.addEventListener('click', function (e) {
        e.stopPropagation();
        var m = x.dataset.m;
        if (m === 'vender') {
          if (!x.classList.contains('conf')) { x.classList.add('conf'); x.lastChild.nodeValue = b.sold ? 'Confirmar: voltar pra venda' : 'Confirmar: vendido'; return; }
          x.disabled = true; venderOuVoltar(b, fecharMenu); return;
        }
        fecharMenu();
        if (m === 'link') copiarLink(b);
        else if (m === 'topo') subirTopo(b);
        else if (m === 'site') window.open(location.origin + '/beat/' + slug(b.name), '_blank', 'noopener');
      });
    });
  }

  function opcoesGenero(atual, vazio) {
    var g = (loja && loja.generos) || {};
    return (vazio ? '<option value="">escolhe o gênero</option>' : '') + Object.keys(g).map(function (k) {
      return '<option value="' + esc(k) + '"' + (k === atual ? ' selected' : '') + '>' + esc(g[k]) + '</option>';
    }).join('');
  }

  function formFicha(b, publicar) {
    return '<div class="vt-form">' +
      '<label>Nome<input id="vtNome" maxlength="60" autocomplete="off" value="' + esc(b.name) + '"></label>' +
      '<div class="vt-dupla"><label>BPM<input id="vtBpm" inputmode="numeric" maxlength="3" value="' + esc(b.bpm || '') + '"></label>' +
      '<label>Tom<input id="vtTom" maxlength="6" autocomplete="off" placeholder="ex.: Dm" value="' + esc(b.key || '') + '"></label></div>' +
      '<label>Gênero<select id="vtGenero"' + (publicar ? ' class="falta"' : '') + '>' + opcoesGenero(b.genre, publicar) + '</select></label>' +
      '<div class="vt-erro" id="vtErro" role="alert"></div></div>';
  }
  function lerFicha() {
    return { name: $('vtNome').value, bpm: Number($('vtBpm').value), key: $('vtTom').value, genre: $('vtGenero').value };
  }

  // 04/11/2026 (revisão do painel, item 7): o que você mais usa em cima. À venda ou Vendido num toque
  // (com a confirmação de sempre), Copiar link, Abrir no site e Subir pro topo; a ficha embaixo, com o
  // Salvar aceso só quando algo muda; Tirar do site no pé, em vermelho.
  function abrirBeat(b) {
    if (!b) return;
    fecharMenu();
    var c = $('card');
    var pos = loja.beats.filter(function (x) { return !x.removido; }).indexOf(b) + 1;
    var X = '<button type="button" class="f-x" data-close aria-label="Fechar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
    c.innerHTML = '<div class="vt-f-cab">' + capaBeat(b, true) + '<span class="t"><h2>' + esc(b.name) + '</h2><p>' + esc(ficha(b)) + '</p>' +
        '<p class="vt-nota">' + (b.sold ? 'vendido' + (b.sold_at ? ' em ' + dataBR(b.sold_at) : '') + (b.sold_por === 'painel' ? ' (marcado aqui)' : '') : (pos > 0 ? pos + 'º da lista do site' : 'à venda')) + '</p></span>' + X + '</div>' +
      '<div class="vt-est" role="group" aria-label="Situação do beat">' +
        '<button type="button"' + (b.sold ? ' data-act="desvender"' : '') + ' aria-pressed="' + !b.sold + '">À venda</button>' +
        '<button type="button"' + (b.sold ? '' : ' data-act="vender"') + ' aria-pressed="' + !!b.sold + '">Vendido</button></div>' +
      '<div class="vt-confirma" id="vtConfirma" hidden>' + (b.sold
        ? '<b>' + esc(b.name) + '</b> volta pra venda no site na hora, com botão de carrinho. Só faz isso se o beat não foi entregue pra ninguém (reembolso, erro).'
        : '<b>' + esc(b.name) + '</b> fica riscado no site e sai do carrinho de quem estiver com ele.') +
        '<div class="vt-acoes"><button class="pill' + (b.sold ? ' vt-perigo' : ' solid') + '" type="button" data-act="sim">' + (b.sold ? 'Sim, voltar pra venda' : 'Sim, marcar vendido') + '</button>' +
        '<button class="pill" type="button" data-act="nao">Cancelar</button></div></div>' +
      '<div class="vt-acs"><button type="button" data-act="link">' + ic('link', 22) + 'Copiar link</button>' +
        '<button type="button" data-act="abrir">' + ic('site', 22) + 'Abrir no site</button>' +
        '<button type="button" data-act="topo"' + (pos === 1 ? ' disabled' : '') + '>' + ic('topo', 22) + (pos === 1 ? 'Já é o 1º' : 'Subir pro topo') + '</button></div>' +
      '<div class="bloco"><div class="rot">Ficha</div>' + formFicha(b, false) +
        '<p class="vt-nota" style="margin-top:10px">Mudou o nome? Renomeia o arquivo no Drive também, senão o player perde o áudio desse beat.</p>' +
        '<div class="vt-acoes"><button class="pill solid vt-salvar" type="button" data-act="salvar" disabled>Salvar ficha</button></div></div>' +
      '<button class="vt-tirar" type="button" data-act="tirar">Tirar do site</button>' +
      '<div class="vt-confirma" id="vtTirar" hidden><b>' + esc(b.name) + '</b> sai da lista do site e do carrinho de quem estiver com ele. ' +
        (b.sold ? 'Continua vendido: a tape segue com a pastilha de vendido e ele não volta pra Fila.'
          : 'Se estiver disponível numa beat tape, volta pra Fila e dá pra publicar de novo.') +
        '<div class="vt-acoes"><button class="pill vt-perigo" type="button" data-act="tirasim">Sim, tirar do site</button>' +
        '<button class="pill" type="button" data-act="tiranao">Cancelar</button></div></div>';
    $('veil').hidden = false;
    c.scrollTop = 0;
    c.querySelector('[data-close]').addEventListener('click', fechar);
    ligarPlays(c);
    c.querySelector('[data-act=abrir]').addEventListener('click', function () { window.open(location.origin + '/beat/' + slug(b.name), '_blank', 'noopener'); });   // 04/10/2026: abre a página do beat
    c.querySelector('[data-act=link]').addEventListener('click', function () { copiarLink(b); });
    // o Salvar acende quando a ficha muda
    var antes = JSON.stringify(lerFicha()), sv = c.querySelector('[data-act=salvar]');
    ['vtNome', 'vtBpm', 'vtTom', 'vtGenero'].forEach(function (id) {
      ['input', 'change'].forEach(function (ev) { $(id).addEventListener(ev, function () { sv.disabled = JSON.stringify(lerFicha()) === antes; }); });
    });
    sv.addEventListener('click', function (e) {
      var bt = e.currentTarget, f = lerFicha(); f.id = b.id;
      bt.disabled = true; bt.textContent = 'Salvando…';
      acao('beat-editar', f).then(function (j) {
        bt.disabled = false; bt.textContent = 'Salvar ficha';
        if (!j.ok) { $('vtErro').textContent = j.erro || 'Não consegui salvar.'; return; }
        flash('Ficha do ' + j.name + ' salva. O site atualiza em até 1 minuto.');
        fechar(); carregar(true);
      });
    });
    c.querySelector('[data-act=topo]').addEventListener('click', function (e) {
      var bt = e.currentTarget; bt.disabled = true;
      acao('beat-topo', { id: b.id }).then(function (j) {
        if (!j.ok) { bt.disabled = false; flash(j.erro || 'Não consegui mexer.'); return; }
        flash(b.name + ' é o primeiro da lista agora.'); fechar(); carregar();
      });
    });
    var tira = $('vtTirar');
    c.querySelector('[data-act=tirar]').addEventListener('click', function () { tira.hidden = false; tira.scrollIntoView({ block: 'nearest' }); });
    tira.querySelector('[data-act=tiranao]').addEventListener('click', function () { tira.hidden = true; });
    tira.querySelector('[data-act=tirasim]').addEventListener('click', function (e) {
      var bt = e.currentTarget; bt.disabled = true;
      acao('beat-tirar', { id: b.id, confirmo: true }).then(function (j) {
        if (!j.ok) { bt.disabled = false; flash(j.erro || 'Não consegui.'); return; }
        flash(b.name + ' saiu do site.');
        fechar(); carregar(true);
      });
    });
    var conf = $('vtConfirma');
    var pede = c.querySelector('[data-act=vender],[data-act=desvender]');
    pede.addEventListener('click', function () { conf.hidden = false; conf.scrollIntoView({ block: 'nearest' }); });
    conf.querySelector('[data-act=nao]').addEventListener('click', function () { conf.hidden = true; });
    conf.querySelector('[data-act=sim]').addEventListener('click', function (e) {
      var bt = e.currentTarget; bt.disabled = true;
      venderOuVoltar(b, fechar).then(function (ok) { if (!ok) bt.disabled = false; });
    });
  }

  /* ---------- fila de postagem ---------- */
  // Agrupada por beat tape, a mais nova em cima. Cada beat: marcar, gênero (escolha
  // sua, nunca adivinho) e editar. "Publicar marcados" manda a tape inteira de uma vez.
  var escolha = {};            // id da faixa -> { marcado, genre, erro }
  var vigia = null;            // conferindo o Drive depois do "Buscar tapes novas"

  function estado(t) {
    if (!escolha[t.id]) escolha[t.id] = { marcado: !!t.bpm, genre: '' };
    return escolha[t.id];
  }
  function metaFila(t) {
    var p = [];
    p.push(t.bpm ? t.bpm + ' BPM' + (t.bpmOnde ? ' <i>(de ' + esc(t.bpmOnde) + ')</i>' : '') : '<em>sem BPM: edita antes</em>');
    p.push(t.key ? esc(t.key) + (t.keyOnde ? ' <i>(tom de ' + esc(t.keyOnde) + (t.confere ? ', confere' : '') + ')</i>' : '') : 'sem tom');
    return p.join(' · ');
  }

  function abaFila(corpo) {
    if (!rel) {
      corpo.innerHTML = '<div class="vt-vazio">' + (relErro ? 'Não consegui conferir a fila. Recarrega a página.' : 'conferindo as tapes…') + '</div>';
      $('resumo').textContent = relErro ? 'a fila não carregou' : 'conferindo as tapes…';
      return;
    }
    var grupos = rel.tapesFila || [];
    var fila = rel.semBotao || [];
    var novos = grupos.reduce(function (n, g) { return n + g.novos.length; }, 0);
    $('resumo').textContent = fila.length || novos
      ? (fila.length ? fila.length + (fila.length === 1 ? ' beat esperando' : ' beats esperando') + ' pra entrar no site' : 'nenhum beat pronto pra publicar') +
        (novos ? ' · ' + novos + (novos === 1 ? ' beat novo' : ' beats novos') + ' sem pastilha' : '')
      : 'fila vazia';

    // 04/11/2026 (item 14): a explicação mora no "Como funciona"; com a conferência rodando, o aviso fica à vista
    var h = '<div class="vt-buscar"><div><b>Tape nova no Drive?</b>' +
      (vigia ? '<small>Conferindo o Drive desde ' + vigia.desde + '. A fila atualiza sozinha quando terminar (uns minutos).</small>'
        : '<details class="como"><summary>Como funciona</summary><small>Cria a pasta em @rideblan33 / Beat tapes com a capa e os beats, e aperta aqui. Sem esperar a conversão da madrugada.</small></details>') +
      '</div><button class="pill" type="button" id="vtBuscar"' + (vigia ? ' disabled' : '') + '>' + (vigia ? 'Conferindo…' : 'Buscar tapes novas') + '</button></div>';

    if (!grupos.length) {
      h += '<div class="vt-vazio">Nada na fila. Todo beat disponível nas tapes pagas já está à venda no site.</div>';
    }
    h += grupos.map(function (g) {
      var x = '<div class="vt-tape" data-tape="' + g.tape_id + '"><div class="vt-tape-topo"><b>' + esc(g.tape) + '</b><small>' +
        (g.itens.length ? g.itens.length + ' pra publicar' : '') + '</small></div>';
      if (g.novos.length) {
        x += '<div class="revisar"><b>' + g.novos.length + (g.novos.length === 1 ? ' beat novo sem pastilha' : ' beats novos sem pastilha') + '</b>' +
          '<small>Não aparecem em nenhuma pasta de artista, então ninguém gravou: ' + g.novos.map(function (n) { return esc(n.title); }).join(', ') + '.</small>' +
          '<button class="pill" type="button" data-novos="' + g.tape_id + '">Marcar ' + (g.novos.length === 1 ? 'como disponível' : 'os ' + g.novos.length + ' como disponíveis') + '</button></div>';
      }
      if (g.outros) {
        x += '<p class="vt-nota" style="margin:6px 0 8px">' + g.outros + (g.outros === 1 ? ' beat dessa tape precisa' : ' beats dessa tape precisam') +
          ' de você em Beat tapes (aparece numa pasta de artista ou só como música). <button type="button" class="aviso" data-irtapes="1">Abrir Beat tapes</button></p>';
      }
      if (g.itens.length) {
        // 04/11/2026 (revisão do painel, item 12): ▶ pra ouvir antes de escolher, o gênero no toque
        // (sem menu) e o nome abre a ficha pra corrigir. O Publicar mora na barra fixa de baixo.
        var gens = (loja && loja.generos) || {};
        x += g.itens.map(function (t) {
          var e = estado(t);
          return '<div class="vt-fq" data-id="' + esc(t.id) + '"><div class="vt-fq-l">' +
            '<span class="vt-th">' + (t.capa ? '<img src="' + esc(t.capa) + '" alt="" loading="lazy">' : '') + (t.mp3 ? botaoPlay('f' + t.id, t.mp3, t.title) : '') + '</span>' +
            '<button type="button" class="t" data-ed="' + esc(t.id) + '" aria-label="Editar a ficha de ' + esc(t.title) + '"><b>' + esc(t.title) + '</b><small>' + metaFila(t) + (e.genre ? '' : ' · <em>falta o gênero</em>') + '</small></button>' +
            '<input type="checkbox" data-chk="' + esc(t.id) + '" aria-label="Publicar ' + esc(t.title) + '"' + (e.marcado ? ' checked' : '') + (t.bpm ? '' : ' disabled') + '></div>' +
            '<div class="vt-gens" role="group" aria-label="Gênero de ' + esc(t.title) + '">' + Object.keys(gens).map(function (k) {
              return '<button type="button" data-gen="' + esc(t.id) + '" data-g="' + esc(k) + '" aria-pressed="' + (e.genre === k) + '">' + esc(gens[k]) + '</button>';
            }).join('') + '</div>' +
            (e.erro ? '<div class="vt-fq-erro">' + esc(e.erro) + '</div>' : '') + '</div>';
        }).join('');
        x += '<div class="vt-tape-pe"><select data-todos="' + g.tape_id + '" aria-label="Mesmo gênero pra todos da ' + esc(g.tape) + '">' +
          '<option value="">mesmo gênero pra todos</option>' + opcoesGenero('', false) + '</select></div>';
      }
      return x + '</div>';
    }).join('');
    // a barra fixa: quantos marcados, o gênero escolhido e o Publicar (de todas as tapes de uma vez)
    // Publicar leva os marcados que já têm gênero; quem falta fica marcado, esperando (04/11/2026)
    var marcadosTodos = fila.filter(function (t) { return estado(t).marcado; });
    var prontosTodos = marcadosTodos.filter(function (t) { return estado(t).genre; });
    var gensEsc = prontosTodos.map(function (t) { return estado(t).genre; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    var semGen = marcadosTodos.length - prontosTodos.length;
    h += '<div class="vt-pub" id="vtPub"' + (marcadosTodos.length ? '' : ' hidden') + '><span class="t"><b>' + marcadosTodos.length + (marcadosTodos.length === 1 ? ' marcado' : ' marcados') +
      (gensEsc.length === 1 ? ' · ' + esc(generoLabel(gensEsc[0])) : gensEsc.length > 1 ? ' · ' + gensEsc.length + ' gêneros' : '') + '</b>' +
      (semGen ? '<em style="font-style:normal;color:var(--at,#e0b155)">' + (semGen === marcadosTodos.length ? 'escolhe o gênero pra publicar' : 'falta o gênero de ' + semGen + ': ' + (semGen === 1 ? 'fica' : 'ficam') + ' pra depois') + '</em>' : 'entram no topo do catálogo') + '</span>' +
      '<button class="pill solid" type="button" data-publicar="todos">Publicar ' + (prontosTodos.length || marcadosTodos.length) + '</button></div>';
    corpo.innerHTML = h;
    ligarPlays(corpo);

    $('vtBuscar').addEventListener('click', buscarTapes);
    corpo.querySelectorAll('[data-irtapes]').forEach(function (b) {
      b.addEventListener('click', function () { if (window.__painelIr) window.__painelIr('tapes'); });
    });
    corpo.querySelectorAll('[data-novos]').forEach(function (b) {
      b.addEventListener('click', function () {
        b.disabled = true; b.textContent = 'Marcando…';
        acao('tape-novos', { tapeId: Number(b.dataset.novos) }).then(function (j) {
          if (!j.ok) { b.disabled = false; flash(j.erro || 'Não consegui marcar.'); abaFila(corpo); return; }
          flash(j.marcados + (j.marcados === 1 ? ' beat marcado' : ' beats marcados') + ' como disponível. Agora é escolher o gênero e publicar.');
          carregar(true);
        });
      });
    });
    var porId = {};
    fila.forEach(function (t) { porId[t.id] = t; });
    corpo.querySelectorAll('[data-chk]').forEach(function (c) {
      c.addEventListener('change', function () { escolha[c.dataset.chk].marcado = c.checked; abaFila(corpo); });
    });
    corpo.querySelectorAll('[data-gen]').forEach(function (bt) {
      bt.addEventListener('click', function () {
        var t = porId[bt.dataset.gen]; if (!t) return;
        var e = estado(t); e.genre = e.genre === bt.dataset.g ? '' : bt.dataset.g; e.erro = '';
        if (e.genre && t.bpm) e.marcado = true;
        var rolagem = bt.parentNode.scrollLeft;
        abaFila(corpo);
        var novo = corpo.querySelector('.vt-fq[data-id="' + t.id + '"] .vt-gens'); if (novo) novo.scrollLeft = rolagem;
      });
    });
    corpo.querySelectorAll('[data-todos]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        if (!sel.value) return;
        var g = grupos.filter(function (x) { return String(x.tape_id) === sel.dataset.todos; })[0];
        g.itens.forEach(function (t) { var e = estado(t); if (e.marcado) { e.genre = sel.value; e.erro = ''; } });
        abaFila(corpo);
      });
    });
    corpo.querySelectorAll('[data-ed]').forEach(function (b) {
      b.addEventListener('click', function () { abrirPublicar(porId[b.dataset.ed]); });
    });
    corpo.querySelectorAll('[data-publicar]').forEach(function (b) {
      b.addEventListener('click', function () {
        var marcados = fila.filter(function (t) { return estado(t).marcado; });
        var semGenero = marcados.filter(function (t) { return !estado(t).genre; });
        var alvo = marcados.filter(function (t) { return estado(t).genre; });
        semGenero.forEach(function (t) { estado(t).erro = 'escolhe o gênero'; });
        if (!alvo.length) {
          abaFila(corpo);
          flash(semGenero.length === 1 ? 'Falta o gênero de 1 beat.' : 'Falta o gênero de ' + semGenero.length + ' beats.');
          return;
        }
        b.disabled = true; b.textContent = 'Publicando…';
        acao('beat-publicar-lote', { itens: alvo.map(function (t) {
          return { track_id: t.id, name: String(t.title || '').toLocaleUpperCase('pt-BR'), bpm: t.bpm, key: t.key || '', genre: estado(t).genre };
        }) }).then(function (j) {
          if (!j.ok) { flash(j.erro || 'Não consegui publicar.'); abaFila(corpo); return; }
          var erros = 0;
          (j.resultados || []).forEach(function (r) {
            var t = alvo[r.i]; if (!t) return;
            if (r.ok) delete escolha[t.id]; else { estado(t).erro = r.erro; erros++; }
          });
          flash(j.publicados + (j.publicados === 1 ? ' beat publicado' : ' beats publicados') + ' no topo do site' + (erros ? '. ' + erros + ' com problema, olha na lista.' : '.'));
          carregar(true);
        });
      });
    });
  }

  // "Buscar tapes novas": dispara a conversão só das beat tapes e fica de olho no
  // andamento (consulta leve, a cada 15 s, só com a aba à vista, no máximo 30 min).
  function buscarTapes() {
    var b = $('vtBuscar'); if (b) { b.disabled = true; b.textContent = 'Mandando…'; }
    acao('sync', { artista: 'tapes' }).then(function (j) {
      if (!j.ok) { flash(j.erro || 'Não consegui disparar a conversão.'); if (b) { b.disabled = false; b.textContent = 'Buscar tapes novas'; } return; }
      var agora = new Date();
      vigia = { desde: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), inicio: agora.getTime(), base: null, viuRodar: false };
      flash('Conversão das tapes começou. A fila atualiza sozinha.');
      desenhar();
      vigia.relogio = setInterval(olharAndamento, 15000);
    });
  }
  function olharAndamento() {
    if (!vigia || document.hidden) return;
    if (Date.now() - vigia.inicio > 30 * 60 * 1000) { pararVigia(); carregar(true); return; }
    pedir('andamento').then(function (j) {
      if (!vigia || !j || !Array.isArray(j.rodando)) return;
      var tapesRodando = j.rodando.filter(function (x) { return x.tipo === 'tape'; }).length;
      var marca = j.tapes + '|' + (j.tapeAt || '');
      if (vigia.base === null) vigia.base = marca;
      if (tapesRodando) vigia.viuRodar = true;
      // terminou: alguma tape rodou (ou mudou) e agora nenhuma está rodando
      if (!tapesRodando && (vigia.viuRodar || marca !== vigia.base)) {
        pararVigia();
        flash('Tapes conferidas. A fila atualizou.');
        carregar(true);
      }
    }).catch(function () {});
  }
  function pararVigia() { if (vigia && vigia.relogio) clearInterval(vigia.relogio); vigia = null; }

  function abrirPublicar(t) {
    if (!t || !loja) return;
    var c = $('card');
    var e = estado(t);
    var b = { name: String(t.title || '').toLocaleUpperCase('pt-BR'), bpm: t.bpm, key: t.key || '', genre: e.genre };
    c.innerHTML = '<h2>Publicar no site</h2><p>' + esc(t.tape) + ' · confere a ficha e escolhe o gênero</p>' +
      formFicha(b, !e.genre) +
      (t.keyOnde ? '<p class="vt-nota" style="margin-top:10px">O tom não está no nome do arquivo da tape: veio de <b>' + esc(t.keyOnde) + '</b>' +
        (t.confere ? ', mas outras cópias discordam. Confere antes.' : '.') + '</p>' : '') +
      (t.bpmOnde ? '<p class="vt-nota" style="margin-top:6px">O BPM veio de <b>' + esc(t.bpmOnde) + '</b>.</p>' : '') +
      '<p class="vt-nota" style="margin-top:10px">Entra no topo da lista, à venda por R$' + esc(loja.preco || '') + '. O nome fica igual ao do Drive, em caixa alta, pro player achar o áudio.</p>' +
      '<div class="vt-acoes"><button class="pill solid" type="button" id="vtPublicar">Publicar</button>' +
      '<button class="pill" data-close type="button">Cancelar</button></div>';
    $('veil').hidden = false;
    c.scrollTop = 0;
    c.querySelector('[data-close]').addEventListener('click', fechar);
    var sel = $('vtGenero');
    sel.addEventListener('change', function () { sel.classList.toggle('falta', !sel.value); });
    $('vtPublicar').addEventListener('click', function (ev) {
      var bt = ev.currentTarget, f = lerFicha();
      if (!f.genre) { $('vtErro').textContent = 'Escolhe o gênero antes de publicar.'; sel.focus(); return; }
      f.track_id = t.id;
      bt.disabled = true; bt.textContent = 'Publicando…';
      acao('beat-publicar', f).then(function (j) {
        bt.disabled = false; bt.textContent = 'Publicar';
        if (!j.ok) { $('vtErro').textContent = j.erro || 'Não consegui publicar.'; return; }
        delete escolha[t.id];
        flash(j.name + (j.voltou ? ' voltou pro site, no topo da lista.' : ' está no site, no topo da lista.'));
        fechar(); carregar(true);
      });
    });
  }

  /* ---------- cupons ---------- */

  var tipoNovo = 'pct';
  function descCupom(c) {
    var v = c.preco_fixo !== null && c.preco_fixo !== undefined ? reais(c.preco_fixo) + ' no total' : c.pct + '% de desconto';
    var u = c.max_usos === null || c.max_usos === undefined ? c.usos + (c.usos === 1 ? ' uso' : ' usos') + ', sem limite'
      : c.usos + ' de ' + c.max_usos + ' usos';
    var esgotou = c.max_usos !== null && c.max_usos !== undefined && c.usos >= c.max_usos;
    return v + ' · ' + u + (!c.ativo ? ' · pausado' : esgotou ? ' · esgotado' : '');
  }

  // 04/11/2026 (revisão do painel, item 9): a lista primeiro, com o filtro Valendo / Esgotados / Desligados e a
  // barra de usos de quem tem limite. O formulário do cupom novo abre numa folha, no "+ Novo cupom".
  var filtroCupom = 'valendo';
  function situCupom(c) {
    if (!c.ativo) return 'desligados';
    return c.max_usos !== null && c.max_usos !== undefined && c.usos >= c.max_usos ? 'esgotados' : 'valendo';
  }
  function abaCupons(corpo) {
    var cupons = loja.cupons || [];
    var conta = { valendo: 0, esgotados: 0, desligados: 0 };
    cupons.forEach(function (c) { conta[situCupom(c)]++; });
    $('resumo').textContent = cupons.length + (cupons.length === 1 ? ' cupom' : ' cupons') + ' · ' + conta.valendo + ' valendo agora';
    var h = '<button class="pill solid vt-novo-bt" type="button" id="cpNovo"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>Novo cupom</button>';
    if (!cupons.length) h += '<div class="vt-vazio">Nenhum cupom ainda.</div>';
    else {
      h += '<div class="linha-f"><div class="seg" role="group" aria-label="Filtro dos cupons">' +
        [['valendo', 'Valendo'], ['esgotados', 'Esgotados'], ['desligados', 'Desligados']].map(function (f) {
          return '<button type="button" data-fc="' + f[0] + '" aria-pressed="' + (filtroCupom === f[0]) + '">' + f[1] + (conta[f[0]] ? ' <i>' + conta[f[0]] + '</i>' : '') + '</button>';
        }).join('') + '</div></div>';
      h += '<div class="vt-filtros"><div class="campo">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6a6a6a" stroke-width="1.9"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.6-4.6"/></svg>' +
        '<input id="cpBusca" type="search" placeholder="Buscar cupom" autocomplete="off" autocapitalize="characters" aria-label="Buscar cupom" value="' + esc(buscaCupom) + '"></div></div>';
      h += '<div id="cpLista"></div>';
    }
    corpo.innerHTML = h;
    var bc = $('cpBusca');
    if (bc) bc.addEventListener('input', function () { buscaCupom = bc.value; pintarCupons(corpo); });
    corpo.querySelectorAll('[data-fc]').forEach(function (b) {
      b.addEventListener('click', function () { filtroCupom = b.dataset.fc; abaCupons(corpo); });
    });
    $('cpNovo').addEventListener('click', abrirNovoCupom);
    pintarCupons(corpo);
  }
  function abrirNovoCupom() {
    var c = $('card');
    var X = '<button type="button" class="f-x" data-close aria-label="Fechar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
    var pinta = function (cod, max) {
      c.innerHTML = '<div class="f-cab"><span class="t"><h2>Novo cupom</h2><p>vale no site assim que você cria</p></span>' + X + '</div><div class="vt-form">' +
        '<label>Código<input id="cpCodigo" maxlength="30" autocomplete="off" autocapitalize="characters" placeholder="ex.: RIDE20"></label>' +
        '<div class="vt-tipo" role="group" aria-label="Tipo de cupom">' +
          '<button type="button" data-tipo="pct" aria-pressed="' + (tipoNovo === 'pct') + '">% de desconto</button>' +
          '<button type="button" data-tipo="fixo" aria-pressed="' + (tipoNovo === 'fixo') + '">Preço fixo</button></div>' +
        '<div class="vt-dupla"><label id="cpValorRot">' + (tipoNovo === 'pct' ? 'Desconto (%)' : 'Total a pagar (R$)') +
          '<input id="cpValor" inputmode="decimal" maxlength="8" placeholder="' + (tipoNovo === 'pct' ? '20' : '1') + '"></label>' +
        '<label>Limite de usos<input id="cpMax" inputmode="numeric" maxlength="5" placeholder="sem limite"></label></div>' +
        '<p class="vt-nota">' + (tipoNovo === 'pct' ? 'Tira a porcentagem do total do carrinho.' : 'O carrinho inteiro sai por esse valor. Um cupom de R$1 com 1 uso serve pra compra de teste.') + '</p>' +
        '<div class="vt-erro" id="cpErro" role="alert"></div>' +
        '<div class="vt-acoes"><button class="pill solid" type="button" id="cpCriar">Criar cupom</button></div></div>';
      $('cpCodigo').value = cod || ''; $('cpMax').value = max || '';
      c.querySelector('[data-close]').addEventListener('click', fechar);
      c.querySelectorAll('[data-tipo]').forEach(function (b) {
        b.addEventListener('click', function () { tipoNovo = b.dataset.tipo; pinta($('cpCodigo').value, $('cpMax').value); });
      });
      $('cpCodigo').addEventListener('input', function (e) {
        var v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (v !== e.target.value) e.target.value = v;
      });
      $('cpCriar').addEventListener('click', function (e) {
        var bt = e.currentTarget;
        bt.disabled = true; bt.textContent = 'Criando…';
        acao('cupom-criar', { codigo: $('cpCodigo').value, tipo: tipoNovo, valor: $('cpValor').value, max_usos: $('cpMax').value.trim() })
          .then(function (j) {
            bt.disabled = false; bt.textContent = 'Criar cupom';
            if (!j.ok) { $('cpErro').textContent = j.erro || 'Não consegui criar.'; return; }
            flash('Cupom ' + j.codigo + ' valendo no site.');
            filtroCupom = 'valendo'; fechar(); carregar();
          });
      });
    };
    $('veil').hidden = false; c.scrollTop = 0;
    pinta('', '');
    setTimeout(function () { try { $('cpCodigo').focus(); } catch (_) {} }, 30);
  }

  // a lista (separada do resto pra busca não perder o foco do campo)
  function pintarCupons(corpo) {
    var alvo = $('cpLista'); if (!alvo) return;
    var q = sem(buscaCupom).replace(/\s+/g, '');
    // com busca, acha em todos (valendo, esgotado ou desligado); sem busca, o filtro manda
    var lista = (loja.cupons || []).filter(function (c) { return q ? sem(c.codigo).indexOf(q) > -1 : situCupom(c) === filtroCupom; });
    alvo.innerHTML = (q ? '<div class="vt-conta">' + lista.length + (lista.length === 1 ? ' cupom' : ' cupons') + '</div>' : '') +
      (lista.length ? '' : '<div class="vt-vazio">' + (q ? 'Nenhum cupom com "' + esc(buscaCupom) + '".' : filtroCupom === 'valendo' ? 'Nenhum cupom valendo agora.' : filtroCupom === 'esgotados' ? 'Nenhum cupom esgotado.' : 'Nenhum cupom desligado.') + '</div>') +
      lista.map(function (c) {
        var lim = c.max_usos !== null && c.max_usos !== undefined && c.max_usos > 0;
        return '<div class="vt-cupom' + (c.ativo ? '' : ' pausado') + '"><button type="button" class="linha" data-cod="' + esc(c.codigo) + '">' +
          '<span style="flex:1;min-width:0"><span class="nome">' + esc(c.codigo) + '</span><span class="meta">' + esc(descCupom(c)) + '</span>' +
          (lim ? '<span class="vt-uso" aria-hidden="true"><i style="width:' + Math.min(100, Math.round(c.usos / c.max_usos * 100)) + '%"></i></span>' : '') + '</span></button>' +
          '<button class="toggle" type="button" data-ativo="' + esc(c.codigo) + '" aria-pressed="' + (c.ativo ? 'true' : 'false') + '" aria-label="' + (c.ativo ? 'Pausar ' : 'Reativar ') + esc(c.codigo) + '"><i></i></button></div>';
      }).join('');
    corpo = alvo;
    corpo.querySelectorAll('[data-ativo]').forEach(function (t) {
      t.addEventListener('click', function () {
        var on = t.getAttribute('aria-pressed') !== 'true';
        t.disabled = true;
        acao('cupom-ativo', { codigo: t.dataset.ativo, ativo: on }).then(function (j) {
          t.disabled = false;
          if (!j.ok) { flash(j.erro || 'Não consegui mudar.'); return; }
          flash(on ? 'Cupom ' + t.dataset.ativo + ' valendo de novo.' : 'Cupom ' + t.dataset.ativo + ' pausado.');
          carregar();
        });
      });
    });
    corpo.querySelectorAll('[data-cod]').forEach(function (b) {
      b.addEventListener('click', function () { abrirCupom(b.dataset.cod); });
    });
  }

  function abrirCupom(codigo) {
    var c = $('card');
    var cp = (loja.cupons || []).filter(function (x) { return x.codigo === codigo; })[0];
    if (!cp) return;
    var tipoEd = cp.preco_fixo !== null && cp.preco_fixo !== undefined ? 'fixo' : 'pct';
    var semLimite = cp.max_usos === null || cp.max_usos === undefined;
    c.innerHTML = '<h2>' + esc(cp.codigo) + '</h2><p>' + esc(descCupom(cp)) + (cp.criado_em ? ' · desde ' + dataBR(cp.criado_em) : '') + '</p>' +
      '<div class="bloco"><div class="rot">EDITAR</div><div class="vt-form">' +
        '<div class="vt-tipo" role="group" aria-label="Tipo de cupom">' +
          '<button type="button" data-tipoed="pct" aria-pressed="' + (tipoEd === 'pct') + '">% de desconto</button>' +
          '<button type="button" data-tipoed="fixo" aria-pressed="' + (tipoEd === 'fixo') + '">Preço fixo</button></div>' +
        '<div class="vt-dupla"><label id="cpEdRot">' + (tipoEd === 'pct' ? 'Desconto (%)' : 'Total a pagar (R$)') +
          '<input id="cpEdValor" inputmode="decimal" maxlength="8" value="' + esc(tipoEd === 'pct' ? cp.pct : String(cp.preco_fixo).replace('.', ',')) + '"></label>' +
        '<label>Limite de usos<input id="cpEdMax" inputmode="numeric" maxlength="5" placeholder="sem limite" value="' + (semLimite ? '' : esc(cp.max_usos)) + '"></label></div>' +
        '<p class="vt-nota">Já usado <b>' + cp.usos + (cp.usos === 1 ? ' vez' : ' vezes') + '</b>. Pra liberar mais usos, aumenta o limite; vazio = sem limite. O código não muda.</p>' +
        '<div class="vt-erro" id="cpEdErro" role="alert"></div>' +
        '<div class="vt-acoes" style="margin-top:0"><button class="pill solid" type="button" id="cpEdSalvar">Salvar</button></div></div></div>' +
      '<div class="bloco"><div class="rot">USOS</div><div class="vt-usos" id="cpUsos">carregando…</div></div>' +
      '<div class="vt-acoes"><button class="pill" data-close type="button">Fechar</button></div>';
    $('veil').hidden = false;
    c.scrollTop = 0;
    c.querySelector('[data-close]').addEventListener('click', fechar);
    c.querySelectorAll('[data-tipoed]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (tipoEd === b.dataset.tipoed) return;
        tipoEd = b.dataset.tipoed;
        c.querySelectorAll('[data-tipoed]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        $('cpEdRot').firstChild.nodeValue = tipoEd === 'pct' ? 'Desconto (%)' : 'Total a pagar (R$)';
        $('cpEdValor').value = ''; $('cpEdValor').placeholder = tipoEd === 'pct' ? '20' : '1'; $('cpEdValor').focus();
      });
    });
    $('cpEdSalvar').addEventListener('click', function (e) {
      var bt = e.currentTarget;
      bt.disabled = true; bt.textContent = 'Salvando…';
      acao('cupom-editar', { codigo: cp.codigo, tipo: tipoEd, valor: $('cpEdValor').value, max_usos: $('cpEdMax').value.trim() })
        .then(function (j) {
          bt.disabled = false; bt.textContent = 'Salvar';
          if (!j.ok) { $('cpEdErro').textContent = j.erro || 'Não consegui salvar.'; return; }
          flash('Cupom ' + cp.codigo + ' atualizado.');
          fechar(); carregar();
        });
    });
    pedir('cupom-usos&codigo=' + encodeURIComponent(codigo)).then(function (j) {
      var box = $('cpUsos'); if (!box) return;
      if (!j || !Array.isArray(j.usos)) { box.textContent = 'Não consegui carregar os usos.'; return; }
      var antes = cp.usos - j.usos.length;
      if (!j.usos.length) {
        box.innerHTML = '<div class="vt-vazio" style="padding:10px 0">' + (cp.usos ? cp.usos + (cp.usos === 1 ? ' uso' : ' usos') + ' de antes do painel (sem detalhe guardado).' : 'Ninguém usou ainda.') + '</div>';
        return;
      }
      box.innerHTML = j.usos.map(function (u) {
        return '<div class="ev"><span>' + quando(u.at) + '</span><span>pagamento ' + esc(u.pagamento) + '</span><span>' + (u.valor ? reais(u.valor) : '') + '</span></div>';
      }).join('') + (antes > 0 ? '<p class="vt-nota" style="margin-top:10px">+ ' + antes + (antes === 1 ? ' uso' : ' usos') + ' de antes do painel, sem detalhe guardado.</p>' : '');
    }).catch(function () { var box = $('cpUsos'); if (box) box.textContent = 'Não consegui carregar os usos.'; });
  }

  window.CaramujoVitrine = {
    abrir: function (el, op) {
      raiz = el;
      if (op && op.semAbas) semAbas = true;
      if (op && op.aba && ['beats', 'fila', 'cupons'].indexOf(op.aba) > -1) aba = op.aba;
      if (!$('vt-css')) {
        var st = document.createElement('style'); st.id = 'vt-css'; st.textContent = CSS;
        document.head.appendChild(st);
      }
      desenhar();
      carregar(true);
    },
    // a home do painel volta pra cá: o resumo muda conforme a aba
    pintar: function () { desenhar(); },
    // o painel novo escolhe a parte (Vitrine, Fila ou Cupons) pelas partes em cima
    aba: function (nome) {
      if (['beats', 'fila', 'cupons'].indexOf(nome) < 0) return;
      if (aba !== nome) { aba = nome; busca = ''; mostrar = 30; }
      desenhar();
    },
    /* 04/11/2026 (revisão do painel): o que a busca única e os atalhos do Hoje usam */
    dados: function () { return { loja: loja, rel: rel, midia: midia }; },
    // carrega a loja e a fila sem desenhar (a busca pode abrir antes da tela do Catálogo) e avisa quando chega
    garantir: function (cb) {
      if (!$('vt-css')) { var st = document.createElement('style'); st.id = 'vt-css'; st.textContent = CSS; document.head.appendChild(st); }
      if (cb) esperando.push(cb);
      if (!loja || !rel) carregar(!rel); else avisa();
    },
    recarregar: function () { carregar(true); },
    abrirBeat: function (id) {
      var vai = function () { var b = beatPorId(Number(id)); if (b) abrirBeat(b); };
      if (loja) vai(); else { esperando.push(vai); carregar(true); }
    },
    abrirPublicar: function (trackId) {
      var vai = function () { var t = ((rel && rel.semBotao) || []).filter(function (x) { return String(x.id) === String(trackId); })[0]; if (t && loja) abrirPublicar(t); };
      if (rel && loja) vai(); else { esperando.push(vai); carregar(true); }
    },
    abrirCupom: function (cod) {
      var vai = function () { abrirCupom(cod); };
      if (loja) vai(); else { esperando.push(vai); carregar(); }
    },
    novoCupom: function () { abrirNovoCupom(); }
  };
})();
