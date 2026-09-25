/* Vitrine do painel (24/09/2026): a loja do site, que antes era editar o
   index.html e o coupons.json e fazer push.
   - Beats: a lista do site (editar, vender, desfazer vendido, subir pro topo,
     destaque do hero) + o que está sem áudio.
   - Fila: beat disponível numa tape paga que ainda não está no site. Publicar
     pede o gênero (nunca adivinho gênero).
   - Cupons: criar, pausar, ver cada uso.
   Carregado só pelo /painel. Os dados vêm de /api/painel (exige o login). */
(function () {
  var CSS = [
    '.vt-seg{display:flex;background:#111;border:1px solid var(--borda);border-radius:999px;padding:3px;margin:18px 0 14px;width:max-content;max-width:100%}',
    '.vt-seg button{border:0;background:transparent;color:var(--ink3);font-size:13.5px;font-weight:500;padding:8px 15px;border-radius:999px;cursor:pointer;white-space:nowrap}',
    '.vt-seg button[aria-pressed="true"]{background:#fff;color:#000}',
    '.vt-seg em{font-style:normal;color:#e0b155;margin-left:5px}',
    '.vt-seg button[aria-pressed="true"] em{color:#8a5a00}',
    '@media (max-width:380px){.vt-seg button{padding:8px 11px;font-size:13px}}',
    '.vt-dest{display:flex;align-items:center;gap:12px;background:#101010;border:1px solid var(--borda);border-radius:14px;padding:13px 14px;margin-bottom:14px}',
    '.vt-dest div{flex:1;min-width:0}',
    '.vt-dest b{display:block;font-size:14.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.vt-dest small{display:block;font-size:12px;color:var(--ink4);margin-top:3px}',
    '.vt-dest .pill{padding:8px 13px;font-size:13px}',
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
    '.vt-tag.ouro{border-color:#6b5320;color:#e0b155}',
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
    '@media (max-width:420px){.vt-fl{grid-template-columns:auto 1fr auto}.vt-fl select{grid-column:2 / 3;max-width:none}.vt-fl .vt-ed{grid-row:1;grid-column:3}}'
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

  var raiz = null, aba = 'beats', busca = '', filtro = 'todos', mostrar = 30;
  var loja = null, lojaErro = false, rel = null, relErro = false;

  try { aba = sessionStorage.getItem('vt-aba') || 'beats'; } catch (_) {}
  if (['beats', 'fila', 'cupons'].indexOf(aba) < 0) aba = 'beats';

  function carregar(tudo) {
    pedir('loja').then(function (j) {
      lojaErro = !j || !Array.isArray(j.beats);
      loja = lojaErro ? null : j;
      desenhar();
    }).catch(function () { lojaErro = true; desenhar(); });
    if (tudo || !rel) {
      pedir('vitrine').then(function (j) {
        relErro = !j || typeof j.total !== 'number';
        rel = relErro ? null : j;
        desenhar();
      }).catch(function () { relErro = true; desenhar(); });
    }
  }

  function generoLabel(g) { return (loja && loja.generos && loja.generos[g]) || g || ''; }
  function ficha(b) { return [generoLabel(b.genre), b.bpm ? b.bpm + ' BPM' : '', b.key].filter(Boolean).join(' · '); }
  function beatPorId(id) { return loja ? loja.beats.filter(function (b) { return b.id === id; })[0] : null; }

  /* ---------- desenho ---------- */

  function desenhar() {
    if (!raiz) return;
    var fila = rel && rel.semBotao ? rel.semBotao.length : 0;
    var h = '<div class="vt-seg" role="group" aria-label="Seção da vitrine">' +
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

    var d = loja.destaque, db = d && d.id ? beatPorId(d.id) : null;
    var vencido = d && d.ate && new Date() > new Date(d.ate + 'T23:59:59');
    var h = '<div class="vt-dest"><div><b>' + (db && !db.sold && !vencido ? 'Destaque: ' + esc(db.name) : 'Destaque: rodízio da semana') + '</b>' +
      '<small>' + (db && !db.sold && !vencido
        ? (d.ate ? 'no hero até ' + dataBR(d.ate) + ', depois volta o rodízio' : 'no hero sem prazo')
        : (db && db.sold ? esc(db.name) + ' foi vendido, o rodízio voltou' : vencido ? 'o prazo acabou, o rodízio voltou' : 'um beat à venda por semana, sozinho')) +
      '</small></div>' +
      (db && !db.sold && !vencido ? '<button class="pill" type="button" id="vtTiraDest">Voltar o rodízio</button>' : '') + '</div>';

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

    h += '<div class="vt-filtros"><div class="campo">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6a6a6a" stroke-width="1.9"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.6-4.6"/></svg>' +
      '<input id="vtBusca" type="search" placeholder="Buscar beat" autocomplete="off" aria-label="Buscar beat" value="' + esc(busca) + '"></div>' +
      '<div class="vt-chips">' +
      [['todos', 'Todos'], ['venda', 'À venda'], ['vendidos', 'Vendidos']].map(function (c) {
        return '<button type="button" data-f="' + c[0] + '" aria-pressed="' + (filtro === c[0]) + '">' + c[1] + '</button>';
      }).join('') + '</div></div><div id="vtLista"></div>';
    corpo.innerHTML = h;

    var sa = $('vtSemAudio');
    if (sa) sa.addEventListener('click', function () {
      var corpo = sa.parentNode.querySelector('.vit-corpo'), abre = corpo.hidden;
      corpo.hidden = !abre; sa.setAttribute('aria-expanded', String(abre));
      try { localStorage.setItem('painel-vitrine-aberta', abre ? '1' : '0'); } catch (_) {}
    });
    var t = $('vtTiraDest');
    if (t) t.addEventListener('click', function () {
      t.disabled = true;
      acao('destaque', { id: null }).then(function (j) {
        if (j.ok) { flash('O rodízio da semana voltou pro hero.'); carregar(); }
        else { t.disabled = false; flash(j.erro || 'Não consegui mudar.'); }
      });
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
    var dest = loja.destaque && loja.destaque.id;
    var lista = loja.beats.filter(function (b) {
      if (filtro === 'venda' && b.sold) return false;
      if (filtro === 'vendidos' && !b.sold) return false;
      return !q || sem(b.name).indexOf(q) > -1 || sem(generoLabel(b.genre)).indexOf(q) > -1;
    });
    if (!lista.length) { alvo.innerHTML = '<div class="vt-vazio">Nenhum beat com esse nome.</div>'; return; }
    var h = '<div class="vt-conta">' + lista.length + (lista.length === 1 ? ' beat' : ' beats') + ' · na ordem do site</div>';
    h += lista.slice(0, mostrar).map(function (b) {
      return '<div class="item vt-linha' + (b.sold ? ' vt-vend' : '') + '"><button type="button" class="linha" data-id="' + b.id + '">' +
        '<span style="flex:1;min-width:0"><span class="nome"><span>' + esc(b.name) + '</span>' +
        (b.sold ? '<i class="vt-tag">vendido</i>' : '') + (dest === b.id && !b.sold ? '<i class="vt-tag ouro">destaque</i>' : '') + '</span>' +
        '<span class="meta">' + esc(ficha(b)) + '</span></span><span class="seta" aria-hidden="true">›</span></button></div>';
    }).join('');
    if (lista.length > mostrar) h += '<button type="button" class="vt-mais" id="vtMais">Mostrar mais ' + Math.min(30, lista.length - mostrar) + '</button>';
    alvo.innerHTML = h;
    alvo.querySelectorAll('[data-id]').forEach(function (b) {
      b.addEventListener('click', function () { abrirBeat(beatPorId(Number(b.dataset.id))); });
    });
    var m = $('vtMais'); if (m) m.addEventListener('click', function () { mostrar += 30; pintarLista(); });
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

  function abrirBeat(b) {
    if (!b) return;
    var c = $('card');
    var ehDest = loja.destaque && loja.destaque.id === b.id;
    c.innerHTML = '<h2>' + esc(b.name) + '</h2><p>' + esc(ficha(b)) + (b.sold ? ' · vendido' + (b.sold_at ? ' em ' + dataBR(b.sold_at) : '') + (b.sold_por === 'painel' ? ' (marcado aqui)' : '') : ' · à venda') + '</p>' +
      '<div class="vt-acoes">' +
        '<button class="pill" type="button" data-act="abrir">Abrir no site</button>' +
        '<button class="pill" type="button" data-act="link">Copiar link</button>' +
      '</div>' +
      '<div class="bloco"><div class="rot">FICHA</div>' + formFicha(b, false) +
        '<p class="vt-nota" style="margin-top:10px">Mudou o nome? Renomeia o arquivo no Drive também, senão o player perde o áudio desse beat.</p>' +
        '<div class="vt-acoes"><button class="pill solid" type="button" data-act="salvar">Salvar ficha</button></div></div>' +
      '<div class="bloco"><div class="rot">NA LISTA DO SITE</div><div class="vt-acoes">' +
        '<button class="pill" type="button" data-act="topo">Subir pro topo</button>' +
        (b.sold ? '' : '<button class="pill" type="button" data-act="dest">' + (ehDest ? 'Trocar prazo do destaque' : 'Pôr no destaque') + '</button>') +
      '</div><div id="vtDestForm" hidden></div></div>' +
      '<div class="bloco"><div class="rot">VENDA</div><div class="vt-acoes">' +
        (b.sold
          ? '<button class="pill vt-perigo" type="button" data-act="desvender">Desfazer vendido</button>'
          : '<button class="pill" type="button" data-act="vender">Marcar vendido</button>') +
      '</div>' +
      '<div class="vt-confirma" id="vtConfirma" hidden>' + (b.sold
        ? '<b>' + esc(b.name) + '</b> volta pra venda no site na hora, com botão de carrinho. Só faz isso se o beat não foi entregue pra ninguém (reembolso, erro).'
        : '<b>' + esc(b.name) + '</b> fica riscado no site e sai do carrinho de quem estiver com ele.') +
        '<div class="vt-acoes"><button class="pill' + (b.sold ? ' vt-perigo' : ' solid') + '" type="button" data-act="sim">' + (b.sold ? 'Sim, voltar pra venda' : 'Sim, marcar vendido') + '</button>' +
        '<button class="pill" type="button" data-act="nao">Cancelar</button></div></div></div>' +
      '<div class="bloco"><div class="rot">NO SITE</div><div class="vt-acoes">' +
        '<button class="pill vt-perigo" type="button" data-act="tirar">Tirar do site</button></div>' +
      '<div class="vt-confirma" id="vtTirar" hidden><b>' + esc(b.name) + '</b> sai da lista do site e do carrinho de quem estiver com ele. ' +
        (b.sold ? 'Continua vendido: a tape segue com a pastilha de vendido e ele não volta pra Fila.'
          : 'Se estiver disponível numa beat tape, volta pra Fila e dá pra publicar de novo.') +
        '<div class="vt-acoes"><button class="pill vt-perigo" type="button" data-act="tirasim">Sim, tirar do site</button>' +
        '<button class="pill" type="button" data-act="tiranao">Cancelar</button></div></div></div>' +
      '<div class="vt-acoes"><button class="pill" data-close type="button">Fechar</button></div>';
    $('veil').hidden = false;
    c.scrollTop = 0;
    c.querySelector('[data-close]').addEventListener('click', fechar);
    var site = location.origin + '/b/' + slug(b.name);
    c.querySelector('[data-act=abrir]').addEventListener('click', function () { window.open(location.origin + '/#beat=' + slug(b.name), '_blank', 'noopener'); });
    c.querySelector('[data-act=link]').addEventListener('click', function () {
      if (navigator.clipboard) navigator.clipboard.writeText(site);
      flash('Link do ' + b.name + ' copiado.');
    });
    c.querySelector('[data-act=salvar]').addEventListener('click', function (e) {
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
    var bd = c.querySelector('[data-act=dest]');
    if (bd) bd.addEventListener('click', function () {
      var box = $('vtDestForm');
      box.hidden = false;
      box.innerHTML = '<div class="vt-form"><label>Até quando (opcional)<input type="date" id="vtAte" value="' + esc(ehDest ? loja.destaque.ate : '') + '"></label>' +
        '<p class="vt-nota">Sem data, fica no hero até você trocar. Vendeu, o rodízio volta sozinho.</p>' +
        '<div class="vt-acoes"><button class="pill solid" type="button" id="vtDestOk">Pôr no hero</button></div></div>';
      $('vtDestOk').addEventListener('click', function (e) {
        var bt = e.currentTarget; bt.disabled = true;
        acao('destaque', { id: b.id, ate: $('vtAte').value || '' }).then(function (j) {
          if (!j.ok) { bt.disabled = false; flash(j.erro || 'Não consegui.'); return; }
          flash(b.name + ' está no hero. O site atualiza em até 1 minuto.'); fechar(); carregar();
        });
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
      var op = b.sold ? 'beat-desvender' : 'beat-vender';
      acao(op, { id: b.id, confirmo: true }).then(function (j) {
        if (!j.ok) { bt.disabled = false; flash(j.erro || 'Não consegui.'); return; }
        flash(b.sold ? b.name + ' voltou pra venda.' : b.name + ' marcado como vendido.');
        fechar(); carregar(true);
      });
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
      return;
    }
    var grupos = rel.tapesFila || [];
    var fila = rel.semBotao || [];
    var novos = grupos.reduce(function (n, g) { return n + g.novos.length; }, 0);
    $('resumo').textContent = fila.length || novos
      ? (fila.length ? fila.length + (fila.length === 1 ? ' beat esperando' : ' beats esperando') + ' pra entrar no site' : 'nenhum beat pronto pra publicar') +
        (novos ? ' · ' + novos + (novos === 1 ? ' beat novo' : ' beats novos') + ' sem pastilha' : '')
      : 'fila vazia';

    var h = '<div class="vt-buscar"><div><b>Beat tape nova no Drive?</b><small>' +
      (vigia ? 'Conferindo o Drive desde ' + vigia.desde + '. A fila atualiza sozinha quando terminar (uns minutos).'
        : 'Cria a pasta em @rideblan33 / Beat tapes com a capa e os beats, e aperta aqui. Sem esperar a conversão da madrugada.') +
      '</small></div><button class="pill" type="button" id="vtBuscar"' + (vigia ? ' disabled' : '') + '>' + (vigia ? 'Conferindo…' : 'Buscar tapes novas') + '</button></div>';

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
        x += g.itens.map(function (t) {
          var e = estado(t);
          return '<div class="vt-fl" data-id="' + esc(t.id) + '">' +
            '<input type="checkbox" data-chk="' + esc(t.id) + '" aria-label="Publicar ' + esc(t.title) + '"' + (e.marcado ? ' checked' : '') + (t.bpm ? '' : ' disabled') + '>' +
            '<div style="min-width:0"><span class="nome">' + esc(t.title) + '</span><span class="meta">' + metaFila(t) + '</span></div>' +
            '<select data-gen="' + esc(t.id) + '" aria-label="Gênero de ' + esc(t.title) + '"' + (e.genre ? '' : ' class="falta"') + '>' +
              '<option value="">gênero</option>' + opcoesGenero(e.genre, false) + '</select>' +
            '<button type="button" class="vt-ed" data-ed="' + esc(t.id) + '" aria-label="Editar ficha de ' + esc(t.title) + '">✎</button>' +
            (e.erro ? '<div class="vt-fl-erro">' + esc(e.erro) + '</div>' : '') + '</div>';
        }).join('');
        var marcados = g.itens.filter(function (t) { return estado(t).marcado; }).length;
        x += '<div class="vt-tape-pe"><select data-todos="' + g.tape_id + '" aria-label="Gênero pra todos da ' + esc(g.tape) + '">' +
          '<option value="">gênero pra todos</option>' + opcoesGenero('', false) + '</select>' +
          '<button class="pill solid" type="button" data-publicar="' + g.tape_id + '"' + (marcados ? '' : ' disabled') + '>Publicar ' +
          (marcados === 1 ? '1 marcado' : marcados + ' marcados') + '</button></div>';
      }
      return x + '</div>';
    }).join('');
    corpo.innerHTML = h;

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
    corpo.querySelectorAll('[data-gen]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var e = escolha[sel.dataset.gen]; e.genre = sel.value; e.erro = '';
        sel.classList.toggle('falta', !sel.value);
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
        var g = grupos.filter(function (x) { return String(x.tape_id) === b.dataset.publicar; })[0];
        var alvo = g.itens.filter(function (t) { return estado(t).marcado; });
        var semGenero = alvo.filter(function (t) { return !estado(t).genre; });
        if (semGenero.length) {
          semGenero.forEach(function (t) { estado(t).erro = 'escolhe o gênero'; });
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

  function abaCupons(corpo) {
    var cupons = loja.cupons || [];
    var ativos = cupons.filter(function (c) { return c.ativo && !(c.max_usos !== null && c.usos >= c.max_usos); }).length;
    $('resumo').textContent = cupons.length + (cupons.length === 1 ? ' cupom' : ' cupons') + ' · ' + ativos + (ativos === 1 ? ' valendo agora' : ' valendo agora');
    var h = '<div class="vt-novo"><h3>Novo cupom</h3><div class="vt-form">' +
      '<label>Código<input id="cpCodigo" maxlength="30" autocomplete="off" autocapitalize="characters" placeholder="ex.: RIDE20"></label>' +
      '<div class="vt-tipo" role="group" aria-label="Tipo de cupom">' +
        '<button type="button" data-tipo="pct" aria-pressed="' + (tipoNovo === 'pct') + '">% de desconto</button>' +
        '<button type="button" data-tipo="fixo" aria-pressed="' + (tipoNovo === 'fixo') + '">Preço fixo</button></div>' +
      '<div class="vt-dupla"><label id="cpValorRot">' + (tipoNovo === 'pct' ? 'Desconto (%)' : 'Total a pagar (R$)') +
        '<input id="cpValor" inputmode="decimal" maxlength="8" placeholder="' + (tipoNovo === 'pct' ? '20' : '1') + '"></label>' +
      '<label>Limite de usos<input id="cpMax" inputmode="numeric" maxlength="5" placeholder="sem limite"></label></div>' +
      '<p class="vt-nota">' + (tipoNovo === 'pct' ? 'Tira a porcentagem do total do carrinho.' : 'O carrinho inteiro sai por esse valor. Um cupom de R$1 com 1 uso serve pra compra de teste.') + '</p>' +
      '<div class="vt-erro" id="cpErro" role="alert"></div>' +
      '<div class="vt-acoes"><button class="pill solid" type="button" id="cpCriar">Criar cupom</button></div></div></div>';
    if (!cupons.length) h += '<div class="vt-vazio">Nenhum cupom ainda.</div>';
    h += cupons.map(function (c) {
      return '<div class="vt-cupom' + (c.ativo ? '' : ' pausado') + '"><button type="button" class="linha" data-cod="' + esc(c.codigo) + '">' +
        '<span style="flex:1;min-width:0"><span class="nome">' + esc(c.codigo) + '</span><span class="meta">' + esc(descCupom(c)) + '</span></span></button>' +
        '<button class="toggle" type="button" data-ativo="' + esc(c.codigo) + '" aria-pressed="' + (c.ativo ? 'true' : 'false') + '" aria-label="' + (c.ativo ? 'Pausar ' : 'Reativar ') + esc(c.codigo) + '"><i></i></button></div>';
    }).join('');
    corpo.innerHTML = h;

    corpo.querySelectorAll('[data-tipo]').forEach(function (b) {
      b.addEventListener('click', function () {
        tipoNovo = b.dataset.tipo;
        var cod = $('cpCodigo').value, max = $('cpMax').value;
        abaCupons(corpo);
        $('cpCodigo').value = cod; $('cpMax').value = max;
      });
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
          carregar();
        });
    });
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
    c.innerHTML = '<h2>' + esc(cp.codigo) + '</h2><p>' + esc(descCupom(cp)) + (cp.criado_em ? ' · desde ' + dataBR(cp.criado_em) : '') + '</p>' +
      '<div class="bloco"><div class="rot">USOS</div><div class="vt-usos" id="cpUsos">carregando…</div></div>' +
      '<div class="vt-acoes"><button class="pill" data-close type="button">Fechar</button></div>';
    $('veil').hidden = false;
    c.scrollTop = 0;
    c.querySelector('[data-close]').addEventListener('click', fechar);
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
    abrir: function (el) {
      raiz = el;
      if (!$('vt-css')) {
        var st = document.createElement('style'); st.id = 'vt-css'; st.textContent = CSS;
        document.head.appendChild(st);
      }
      desenhar();
      carregar(true);
    },
    // a home do painel volta pra cá: o resumo muda conforme a aba
    pintar: function () { desenhar(); }
  };
})();
