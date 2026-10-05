/* Músicas do perfil (05/10/2026; 2ª versão 06/10/2026): a aba "Músicas" do
   caramujorecords.com.br/rideblan33.
   - Adicionar: colar o link do Spotify (ou do YouTube) já lê sozinho; nome, artistas, data
     e capa vêm do link. Vários links de uma vez entram todos nas recentes.
   - Destaques: a ordem é sua (arrasta pela alça, como a ordem das beat tapes).
   - Recentes: pela data de lançamento (padrão) ou "Na minha ordem" (arrasta).
   - Áudio: o arquivo da pasta do artista no catálogo, tocado INTEIRO no perfil. O painel
     acha sozinho quando o nome bate; dá pra trocar e ouvir aqui.
   - "No ar": desligado, só quem está logado no painel vê a aba (prévia).
   Carregado só pelo /painel. Os dados vêm de /api/painel (exige o login). */
(function () {
  var CSS = [
    '.mu-topo{background:#101010;border:1px solid var(--borda);border-radius:14px;padding:4px 14px 12px;margin:18px 0 16px}',
    '.mu-topo .sw{border-bottom:0;padding:12px 0 8px}',
    '.mu-topo a{font-size:13px;color:var(--ink2);text-underline-offset:3px}',
    '.mu-novo{background:#101010;border:1px solid var(--borda);border-radius:14px;padding:14px;margin-bottom:22px}',
    '.mu-novo h3{margin:0 0 4px;font-size:15px;font-weight:600}',
    '.mu-novo p{margin:0 0 10px;font-size:12.5px;color:var(--ink4);line-height:1.45}',
    '.mu-colar{display:flex;gap:8px}',
    '.mu-colar .campo{padding:9px 12px;min-width:0}',
    '.mu-colar .pill{flex:none}',
    '.mu-status{margin-top:10px;font-size:13px;color:var(--ink2);line-height:1.45}',
    '.mu-status:empty{display:none}',
    '.mu-status small{display:block;margin-top:4px;color:var(--ink4);word-break:break-all}',
    '.mu-sec{margin-top:24px}',
    '.mu-sec-topo{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:4px;flex-wrap:wrap}',
    '.mu-sec-topo b{font-size:11px;letter-spacing:.2em;color:var(--ink3);text-transform:uppercase}',
    '.mu-sec-topo small{font-size:12px;color:var(--ink4)}',
    '.mu-ordem{display:flex;background:#111;border:1px solid var(--borda);border-radius:999px;padding:3px}',
    '.mu-ordem button{border:0;background:transparent;color:var(--ink3);font-size:12.5px;padding:6px 12px;border-radius:999px;cursor:pointer;white-space:nowrap}',
    '.mu-ordem button[aria-pressed="true"]{background:#fff;color:#000;font-weight:600}',
    '.mu-dica{margin:2px 0 6px;font-size:12px;color:var(--ink4)}',
    '.mu-lista{position:relative;list-style:none;margin:0;padding:0}',
    '.mu-lista li{position:relative;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--linha);background:#0a0a0a;will-change:transform}',
    '.mu-lista li.pego{z-index:3;background:#1e1e1e;box-shadow:0 14px 34px rgba(0,0,0,.6);border-radius:10px;border-bottom-color:transparent}',
    '.mu-lista li.novo{animation:mu-novo 2.2s ease-out}',
    '@keyframes mu-novo{0%,35%{background:#2a2414}100%{background:#0a0a0a}}',
    '.mu-lista .linha{flex:1;min-width:0;padding:11px 0}',
    '.mu-lista .meta em{font-style:normal;color:#e0b155}',
    '.mu-capa{width:44px;height:44px;flex:none;border-radius:6px;overflow:hidden;background:#171717;border:1px solid var(--linha)}',
    '.mu-capa img{width:100%;height:100%;object-fit:cover;display:block}',
    '.mu-alca{width:44px;height:44px;flex:none;display:flex;align-items:center;justify-content:center;color:#8a8a8a;cursor:grab;touch-action:none;background:transparent;border:0;border-radius:10px;padding:0}',
    '.mu-alca:hover{color:#fff;background:#1a1a1a}',
    '.mu-alca:active{cursor:grabbing}',
    '.mu-alca:focus-visible{outline:2px solid #fff;outline-offset:-2px}',
    '.mu-vazio{padding:14px 0;color:#5a5a5a;font-size:13.5px;line-height:1.5}',
    '.mu-form{display:flex;flex-direction:column;gap:12px;margin-top:16px}',
    '.mu-form label{display:flex;flex-direction:column;gap:6px;font-size:11px;letter-spacing:.14em;color:var(--ink4);text-transform:uppercase}',
    '.mu-form input,.mu-form select{background:var(--campo);border:1px solid var(--borda);border-radius:12px;padding:12px 13px;font-size:15px;color:var(--ink);outline:none;width:100%;box-sizing:border-box;color-scheme:dark;letter-spacing:0;text-transform:none}',
    '.mu-form input:focus,.mu-form select:focus{border-color:#3a3a3a}',
    '.mu-form .campo input{border:0;border-radius:0;padding:0;background:transparent;font-size:15px}',
    '.mu-dupla{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
    '@media (max-width:420px){.mu-dupla{grid-template-columns:1fr}}',
    '.mu-tipo{display:flex;background:#141414;border:1px solid var(--borda);border-radius:12px;padding:3px}',
    '.mu-tipo button{flex:1;border:0;background:transparent;color:var(--ink3);font-size:13.5px;padding:9px;border-radius:9px;cursor:pointer}',
    '.mu-tipo button[aria-pressed="true"]{background:#fff;color:#000;font-weight:600}',
    '.mu-perigo{border-color:#5a2a22!important;color:#f0b3a6}',
    '.mu-confirma{margin-top:12px;border:1px solid #5a2a22;background:#1a100e;border-radius:12px;padding:12px 14px;font-size:13px;color:#e8c9c2;line-height:1.45}',
    '.mu-confirma[hidden]{display:none}',
    '.mu-confirma .mu-acoes{display:flex;gap:8px;margin-top:10px}',
    '.mu-confirma .mu-acoes .pill{flex:1;justify-content:center}',
    '.mu-audio{background:#101010;border:1px solid var(--borda);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:10px}',
    '.mu-audio .rot{margin:0}',
    '.mu-audio small{font-size:12px;color:var(--ink4);line-height:1.45}',
    '.mu-ouvir{display:flex;align-items:center;gap:10px}',
    '.mu-ouvir .pill{flex:none;padding:9px 14px;font-size:13px}',
    '.mu-ouvir i{flex:1;height:3px;background:#242424;border-radius:2px;overflow:hidden;font-style:normal}',
    '.mu-ouvir i b{display:block;height:100%;width:0;background:#fff}',
    '.mu-busca{display:flex;align-items:center;gap:8px}',
    '.mu-busca .pill{flex:none;padding:9px 13px;font-size:13px}',
    '.mu-ja{border:1px solid #3a2f18;background:#16120a;border-radius:12px;padding:10px 12px;font-size:13px;color:#e8d5a8;line-height:1.45}',
    '.mu-erro{font-size:13px;color:#e08d7e}',
    '.mu-erro:empty{display:none}',
    '@media (prefers-reduced-motion:reduce){.mu-lista li.novo{animation:none}}'
  ].join('\n');

  var ALCA = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>';
  var $ = function (i) { return document.getElementById(i); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function flash(m) { if (window.__painelFlash) window.__painelFlash(m); }
  function fechar() { parar(); if (window.__painelFechar) window.__painelFechar(); }
  function pedir(op) { return fetch('/api/painel?op=' + op).then(function (r) { return r.json(); }); }
  function acao(op, body) {
    return fetch('/api/painel?op=' + op, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {})
    }).then(function (r) { return r.json(); }).catch(function () { return { erro: 'Sem conexão. Tenta de novo.' }; });
  }
  var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  function mesAno(d) { var m = String(d || '').match(/^(\d{4})(?:-(\d{2}))?/); return !m ? '' : m[2] ? MESES[+m[2] - 1] + ' ' + m[1] : m[1]; }
  function mmss(s) { s = Math.max(0, Math.round(+s || 0)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  // a data guardada pode ser só o ano ou ano-mês (veio assim do Spotify): o campo pede o dia
  function dataCampo(d) { d = String(d || ''); return d.length === 10 ? d : d.length === 7 ? d + '-01' : d.length === 4 ? d + '-01-01' : ''; }
  // os links de música num texto colado (um ou vários). O campo de uma linha tira as
  // quebras de linha (os links chegam grudados): o fim de cada um para no próximo "http"
  var RE_LINK = /https?:\/\/(?:open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:track|album)\/[A-Za-z0-9]{22}|(?:www\.|m\.|music\.)?youtube\.com\/(?:watch\?(?:(?!https?:)[^\s])*v=|shorts\/)[A-Za-z0-9_-]{11}|youtu\.be\/[A-Za-z0-9_-]{11})(?:(?!https?:\/\/)[^\s])*/g;
  function linksDe(t) { var l = String(t || '').match(RE_LINK) || [], vistos = {}; return l.filter(function (x) { var k = x.split('?')[0]; if (vistos[k]) return false; vistos[k] = 1; return true; }); }
  var PERFIL = '/rideblan33?de=painel#musicas';

  var raiz = null, dados = null, erroCarga = false, destacar = null;

  // cada abertura guarda até 4 capas na prateleira: faltou, pede de novo sozinho (até 4 vezes)
  var voltas = 0;
  function carregar() {
    pedir('musicas').then(function (j) {
      erroCarga = !j || !j.ok; dados = erroCarga ? null : j; desenhar();
      if (dados && dados.faltamCapas > 0 && voltas < 4) { voltas++; setTimeout(carregar, 300); }
    }).catch(function () { erroCarga = true; desenhar(); });
  }
  function usar(j, msg) {
    if (!j || j.erro || !j.ok) { flash((j && j.erro) || 'Não deu certo. Tenta de novo.'); desenhar(); return false; }
    if (j.destaques) dados = j;
    desenhar(); if (msg) flash(msg);
    return true;
  }
  function total() { return dados ? dados.destaques.length + dados.recentes.length : 0; }
  function achar(id) { return dados.destaques.concat(dados.recentes).filter(function (x) { return x.id === id; })[0] || null; }

  /* ---------- a tela ---------- */

  function desenhar() {
    if (!raiz) return;
    var res = $('resumo');
    if (!dados) {
      raiz.innerHTML = '<div class="vazio">' + (erroCarga ? 'Não consegui carregar as músicas. Recarrega a página.' : 'carregando…') + '</div>';
      if (res) res.textContent = 'a aba Músicas do seu perfil';
      return;
    }
    var n = total(), manual = dados.ordemRecentes === 'manual';
    if (res) res.textContent = n + (n === 1 ? ' música' : ' músicas') + ' · ' + (dados.noAr ? 'no ar pra todo mundo' : 'fora do ar (só você vê a prévia)');
    var h = '<div class="mu-topo"><div class="sw"><div><b>No ar no perfil</b><small>' +
      (dados.noAr ? 'Todo mundo vê a aba Músicas no seu perfil.' : 'Desligado: a aba Músicas só aparece pra você, logado no painel.') +
      '</small></div><button class="toggle" type="button" id="muNoAr" aria-pressed="' + !!dados.noAr + '" aria-label="Aba Músicas no ar"><i></i></button></div>' +
      '<a href="' + PERFIL + '" target="_blank" rel="noopener">Ver ' + (dados.noAr ? 'o perfil' : 'a prévia') + ' ↗</a></div>';
    h += '<div class="mu-novo"><h3>Adicionar música</h3><p>No Spotify: ⋯ › Compartilhar › Copiar link. Cola aqui e ela já é lida: nome, artistas, data e capa vêm sozinhos. Vários links de uma vez entram todos nas recentes.</p>' +
      '<div class="mu-colar"><div class="campo"><input id="muLink" type="text" inputmode="url" placeholder="Link do Spotify ou do YouTube" autocomplete="off" aria-label="Link da música"></div>' +
      '<button class="pill solid" type="button" id="muLer">Adicionar</button></div><div class="mu-status" id="muStatus" role="status"></div></div>';
    h += '<div class="mu-sec"><div class="mu-sec-topo"><b>Destaques · ' + dados.destaques.length + '</b><small>a fileira grande do topo da aba</small></div>' +
      (dados.destaques.length > 1 ? '<p class="mu-dica">Segura a alça e arrasta. Salva sozinho.</p>' : '') +
      lista('destaque', dados.destaques, true) + '</div>';
    h += '<div class="mu-sec"><div class="mu-sec-topo"><b>Recentes · ' + dados.recentes.length + '</b>' +
      '<div class="mu-ordem" role="group" aria-label="Ordem das recentes"><button type="button" data-ordem="data" aria-pressed="' + !manual + '">Por lançamento</button><button type="button" data-ordem="manual" aria-pressed="' + manual + '">Na minha ordem</button></div></div>' +
      '<p class="mu-dica">' + (manual ? 'Segura a alça e arrasta. Salva sozinho. Música nova entra em 1º.' : 'A mais nova primeiro, pela data de lançamento.') + '</p>' +
      lista('recente', dados.recentes, manual) + '</div>';
    raiz.innerHTML = h;

    $('muNoAr').addEventListener('click', function () {
      var b = this, liga = b.getAttribute('aria-pressed') !== 'true';
      if (liga && !n) { flash('Coloca pelo menos uma música antes de ligar.'); return; }
      b.disabled = true;
      acao('musicas-no-ar', { noAr: liga }).then(function (j) {
        usar(j, liga ? 'Aba Músicas no ar. O perfil mostra em até 1 minuto.' : 'Aba Músicas fora do ar. Só você vê a prévia.');
      });
    });
    var campo = $('muLink');
    $('muLer').addEventListener('click', function () { colado(campo.value); });
    campo.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); colado(campo.value); } });
    // colou = já lê (sem precisar do botão)
    campo.addEventListener('paste', function () { setTimeout(function () { if (linksDe(campo.value).length) colado(campo.value); }, 0); });
    raiz.querySelectorAll('[data-ordem]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.getAttribute('aria-pressed') === 'true') return;
        var modo = b.dataset.ordem;
        raiz.querySelectorAll('[data-ordem]').forEach(function (x) { x.disabled = true; });
        acao('musicas-ordem-recentes', { modo: modo }).then(function (j) {
          usar(j, modo === 'manual' ? 'Recentes na sua ordem: arrasta pela alça.' : 'Recentes pela data de lançamento.');
        });
      });
    });
    raiz.querySelectorAll('[data-abre]').forEach(function (b) {
      b.addEventListener('click', function () { abrirMusica(achar(b.dataset.abre)); });
    });
    raiz.querySelectorAll('ol.mu-lista[data-arrasta]').forEach(ligarOrdem);
    if (destacar) {
      var li = raiz.querySelector('li[data-id="' + destacar + '"]');
      destacar = null;
      if (li) { li.classList.add('novo'); if (li.scrollIntoView) li.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    }
  }

  function lista(secao, itens, arrasta) {
    if (!itens.length) return '<div class="mu-vazio">' + (secao === 'destaque' ? 'Nenhum destaque ainda. Abre uma música e escolhe "Destaque".' : 'Nenhuma recente ainda.') + '</div>';
    return '<ol class="mu-lista" data-secao="' + secao + '"' + (arrasta && itens.length > 1 ? ' data-arrasta="1"' : '') + '>' + itens.map(function (m) {
      var capa = m.capaSrc ? '<img src="' + esc(m.capaSrc) + '" alt="" loading="lazy">' : '';
      // o áudio vem primeiro (é o que falta conferir antes de ligar o No ar)
      var info = [m.audio ? 'toca no perfil' + (m.dur ? ' · ' + mmss(m.dur) : '') : '<em>sem áudio</em>',
        secao === 'recente' ? mesAno(m.data) || 'sem data' : '', esc(m.artistas || '')].filter(Boolean).join(' · ');
      return '<li data-id="' + esc(m.id) + '"><span class="mu-capa">' + capa + '</span><button class="linha" type="button" data-abre="' + esc(m.id) + '"><span style="min-width:0;flex:1"><span class="nome">' + esc(m.nome) + '</span><span class="meta">' + info + '</span></span>' + (arrasta && itens.length > 1 ? '' : '<span class="seta" aria-hidden="true">›</span>') + '</button>' +
        (arrasta && itens.length > 1 ? '<button class="mu-alca" type="button" aria-label="Mover ' + esc(m.nome) + ' (setas pra cima e pra baixo)">' + ALCA + '</button>' : '') + '</li>';
    }).join('') + '</ol>';
  }

  /* ---------- arrastar (o mesmo jeito da ordem das beat tapes) ---------- */

  // A música pega segue o dedo e as outras deslizam pro lugar novo (FLIP: mede antes,
  // troca no DOM, anima a diferença). Perto da borda da tela, a página rola sozinha.
  var salvarT = {};
  function salvarOrdem(ol) {
    var secao = ol.dataset.secao;
    clearTimeout(salvarT[secao]);
    salvarT[secao] = setTimeout(function () {
      var ids = [].slice.call(ol.children).map(function (li) { return li.dataset.id; });
      acao('musicas-ordem', { secao: secao, ids: ids }).then(function (j) {
        if (!j || !j.ok) { usar(j); return; }
        dados = j; flash('Ordem salva.');
      });
    }, 600);
  }
  function ligarOrdem(ol) {
    var pego = null, dy = 0, DUR = 180, rolar = 0;
    function topoLayout(li) { return ol.getBoundingClientRect().top + li.offsetTop; }
    function desliza(mudar) {
      var outros = [].slice.call(ol.children).filter(function (li) { return li !== pego; });
      var antes = outros.map(function (li) { return li.getBoundingClientRect().top; });
      mudar();
      outros.forEach(function (li, i) {
        var d = antes[i] - li.getBoundingClientRect().top;
        if (!d) return;
        li.style.transition = 'none'; li.style.transform = 'translateY(' + d + 'px)';
        li.getBoundingClientRect();
        li.style.transition = 'transform ' + DUR + 'ms cubic-bezier(.2,.7,.3,1)'; li.style.transform = '';
      });
    }
    function segue(y) { if (pego) pego.style.transform = 'translateY(' + (y - dy - topoLayout(pego)) + 'px)'; }
    ol.addEventListener('pointerdown', function (e) {
      var h = e.target.closest('.mu-alca'); if (!h) return;
      pego = h.closest('li'); e.preventDefault();
      try { h.setPointerCapture(e.pointerId); } catch (_) {}
      dy = e.clientY - pego.getBoundingClientRect().top;
      pego.style.transition = 'box-shadow .15s, background .15s';
      pego.classList.add('pego');
    });
    ol.addEventListener('pointermove', function (e) {
      if (!pego) return;
      rolar = e.clientY < 70 ? -10 : e.clientY > window.innerHeight - 70 ? 10 : 0;
      if (rolar) window.scrollBy(0, rolar);
      var meio = e.clientY - dy + pego.offsetHeight / 2;
      var outros = [].slice.call(ol.children).filter(function (li) { return li !== pego; });
      var alvo = null;
      for (var i = 0; i < outros.length; i++) { if (meio < topoLayout(outros[i]) + outros[i].offsetHeight / 2) { alvo = outros[i]; break; } }
      if (alvo ? pego.nextElementSibling !== alvo : ol.lastElementChild !== pego) {
        desliza(function () { if (alvo) ol.insertBefore(pego, alvo); else ol.appendChild(pego); });
      }
      segue(e.clientY);
    });
    function solta() {
      if (!pego) return;
      var li = pego; pego = null;
      li.style.transition = 'transform ' + DUR + 'ms cubic-bezier(.2,.7,.3,1), box-shadow .2s, background .2s';
      li.style.transform = '';
      li.classList.remove('pego');
      setTimeout(function () { li.style.transition = ''; }, DUR + 20);
      salvarOrdem(ol);
    }
    ol.addEventListener('pointerup', solta); ol.addEventListener('pointercancel', solta);
    // teclado: alça focada + seta pra cima/baixo
    ol.addEventListener('keydown', function (e) {
      var h = e.target.closest('.mu-alca'); if (!h) return;
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      var li = h.closest('li'); pego = li;
      desliza(function () {
        if (e.key === 'ArrowUp' && li.previousElementSibling) ol.insertBefore(li, li.previousElementSibling);
        if (e.key === 'ArrowDown' && li.nextElementSibling) ol.insertBefore(li.nextElementSibling, li);
      });
      pego = null; h.focus(); salvarOrdem(ol);
    });
  }

  /* ---------- colar: um link abre o cartão; vários entram direto nas recentes ---------- */

  var lendo = false;
  function status(t, sub) { var s = $('muStatus'); if (s) s.innerHTML = t ? esc(t) + (sub ? '<small>' + sub + '</small>' : '') : ''; }
  function colado(texto) {
    if (lendo) return;
    var links = linksDe(texto);
    if (!links.length) { status(String(texto || '').trim() ? 'Não achei link do Spotify ou do YouTube aí.' : ''); if (!String(texto || '').trim()) $('muLink').focus(); return; }
    lendo = true; $('muLer').disabled = true;
    if (links.length === 1) {
      status('Lendo o link…');
      acao('musica-ler', { link: links[0] }).then(function (j) {
        lendo = false; $('muLer').disabled = false;
        if (!j || !j.ok) { status((j && j.erro) || 'Não consegui ler esse link.'); return; }
        $('muLink').value = ''; status('');
        abrirMusica(null, j);
      });
      return;
    }
    emLote(links);
  }
  // em lote: lê cada link e coloca nas recentes com o áudio que bater (dá pra mexer depois)
  function emLote(links) {
    var entraram = 0, jaEstavam = 0, falhas = [], k = 0, ultimo = null;
    function fim() {
      lendo = false;
      if (ultimo) dados = ultimo;
      $('muLink').value = '';
      desenhar();
      var partes = [];
      if (entraram) partes.push(entraram + (entraram === 1 ? ' música entrou' : ' músicas entraram') + ' nas recentes');
      if (jaEstavam) partes.push(jaEstavam + (jaEstavam === 1 ? ' já estava' : ' já estavam') + ' na lista');
      if (falhas.length) partes.push(falhas.length + (falhas.length === 1 ? ' link não deu pra ler' : ' links não deram pra ler'));
      status(partes.join(' · ') + '.', falhas.length ? 'Cola de novo um por vez: ' + falhas.map(esc).join(' ') : '');
      flash(entraram ? 'Pronto. Abre cada uma pra conferir.' : 'Nenhuma música nova.');
    }
    function proxima() {
      if (k >= links.length) return fim();
      var link = links[k++];
      status('Adicionando ' + k + ' de ' + links.length + '…');
      acao('musica-ler', { link: link }).then(function (j) {
        if (!j || !j.ok || !j.musica || !j.musica.nome) { falhas.push(link); return proxima(); }
        if (j.ja) { jaEstavam++; return proxima(); }
        var x = j.musica, c = (j.candidatos || [])[0];
        acao('musica-salvar', { nome: x.nome, artistas: x.artistas, spotify: x.spotify || '', youtube: x.youtube || '', data: x.data, secao: 'recente',
          faixa: c && c.musica && c.pts >= 100 ? c.id : null, capaUrl: x.capaUrl }).then(function (s) {
          if (s && s.ok) { entraram++; ultimo = s; } else falhas.push(link);
          proxima();
        });
      });
    }
    proxima();
  }

  /* ---------- ouvir o arquivo aqui ---------- */

  var som = null;
  function parar() { if (som) { som.pause(); som = null; } var b = $('muOuvir'); if (b) b.textContent = 'Ouvir'; var i = $('muBarra'); if (i) i.style.width = '0'; }
  function ouvir(url) {
    if (som) return parar();
    som = new Audio(url);
    var b = $('muOuvir'), barra = $('muBarra');
    if (b) b.textContent = 'Parar';
    som.addEventListener('timeupdate', function () { if (som && barra) barra.style.width = (som.duration ? som.currentTime / som.duration * 100 : 0) + '%'; });
    som.addEventListener('ended', parar);
    som.play().catch(function () { parar(); flash('Não consegui tocar esse arquivo.'); });
  }

  /* ---------- o cartão de uma música ---------- */

  // m = música da lista (editar) ou null (nova, com o que o link trouxe em lido)
  function abrirMusica(m, lido) {
    var novo = !m, x = m || lido.musica, card = $('card');
    var secaoAtual = m ? m.secao : 'recente';
    var cands = (lido && lido.candidatos) || [];
    // o áudio escolhido: o atual (editar) ou o melhor candidato que é música (nova)
    var esc0 = m ? (m.faixa || '') : (cands[0] && cands[0].musica && cands[0].pts >= 100 ? cands[0].id : '');
    var opcoes = {};
    if (m && m.audio) opcoes[m.faixa] = { id: m.faixa, titulo: m.audio.titulo, pasta: m.audio.pasta, som: m.audio.som };
    cands.forEach(function (c) { if (!opcoes[c.id]) opcoes[c.id] = c; });

    var capa = x.capaSrc || x.capaUrl;
    var h = '<div class="cab"><div class="capa-mini">' + (capa ? '<img src="' + esc(capa) + '" alt="">' : '') + '</div><div class="cab-txt"><h2>' + esc(x.nome || 'Nova música') + '</h2>' +
      '<p>' + (novo ? esc(x.artistas || 'Confere o que veio do link') + (x.data ? ' · ' + esc(mesAno(x.data)) : '') : 'Muda o que precisar e salva.') + '</p></div></div>';
    if (lido && lido.ja) h += '<div class="mu-ja" style="margin-top:14px">Essa música já está na lista. Salvar aqui atualiza a que já existe.</div>';
    if (novo && !x.nome) h += '<div class="mu-ja" style="margin-top:14px">O link não trouxe o nome. Digita o nome e os artistas.</div>';
    h += '<div class="mu-form">' +
      '<div><div class="rot">ONDE ENTRA</div><div class="mu-tipo" role="group" aria-label="Onde a música entra">' +
        '<button type="button" data-sec="destaque" aria-pressed="' + (secaoAtual === 'destaque') + '">Destaque</button>' +
        '<button type="button" data-sec="recente" aria-pressed="' + (secaoAtual === 'recente') + '">Recente</button></div></div>' +
      '<label>Nome<input id="muNome" value="' + esc(x.nome) + '" autocomplete="off"></label>' +
      '<div class="mu-dupla"><label>Artistas (sem você)<input id="muArt" value="' + esc(x.artistas) + '" placeholder="Ex.: CandyBoiNarco, mavyrmldy" autocomplete="off"></label>' +
      '<label>Lançamento<input id="muData" type="date" value="' + esc(dataCampo(x.data)) + '"></label></div>' +
      '<div class="mu-audio"><div class="rot">ÁUDIO NO PERFIL</div>' +
        '<select id="muFaixa" aria-label="Arquivo que toca no perfil"></select>' +
        '<div class="mu-ouvir" id="muOuvirBox"><button class="pill" type="button" id="muOuvir">Ouvir</button><i><b id="muBarra"></b></i></div>' +
        '<div class="mu-busca"><div class="campo" style="padding:8px 12px"><input id="muBuscaQ" type="search" placeholder="Buscar outro arquivo no catálogo" autocomplete="off" aria-label="Buscar arquivo"></div><button class="pill" type="button" id="muBuscar">Buscar</button></div>' +
        '<small id="muAudioNota"></small></div>' +
      '<label>Link do Spotify<input id="muSp" type="url" value="' + esc(x.spotify || '') + '" placeholder="open.spotify.com/track/…" autocomplete="off"></label>' +
      '<label>Link do YouTube (opcional)<input id="muYt" type="url" value="' + esc(x.youtube || '') + '" placeholder="youtube.com/watch?v=…" autocomplete="off"></label>' +
      '<div class="mu-erro" id="muErro"></div></div>' +
      '<div class="acoes"><button class="pill" type="button" data-close>Cancelar</button><button class="pill solid" type="button" id="muSalvar">' + (novo && !(lido && lido.ja) ? 'Colocar no perfil' : 'Salvar') + '</button></div>' +
      (novo ? '' : '<button class="pill mu-perigo" type="button" id="muTirar" style="width:100%;justify-content:center;margin-top:10px">Tirar do perfil</button>' +
        '<div class="mu-confirma" id="muConfirma" hidden>Tirar <b>' + esc(x.nome) + '</b> da aba Músicas? Dá pra colocar de novo colando o link.<div class="mu-acoes"><button class="pill" type="button" id="muNao">Não</button><button class="pill mu-perigo" type="button" id="muSim">Tirar</button></div></div>');
    card.innerHTML = h;
    $('veil').hidden = false;

    var sel = $('muFaixa');
    function pintarOpcoes(escolha) {
      var ids = Object.keys(opcoes);
      sel.innerHTML = '<option value="">Sem áudio (a capa leva pro Spotify)</option>' + ids.map(function (id) {
        var c = opcoes[id];
        return '<option value="' + esc(id) + '"' + (id === escolha ? ' selected' : '') + '>' + esc(c.titulo) + ' · ' + esc(c.pasta) + (c.musica === false ? ' (beat)' : '') + '</option>';
      }).join('');
      notaAudio();
    }
    function notaAudio() {
      var v = sel.value, nota = $('muAudioNota');
      $('muOuvirBox').style.display = v ? '' : 'none';
      nota.textContent = v ? 'A música toca inteira no perfil, a partir deste arquivo.'
        : Object.keys(opcoes).length ? 'Sem áudio, a capa leva direto pro Spotify.' : 'Não achei arquivo com esse nome no catálogo. Busca acima ou deixa sem áudio (a capa leva pro Spotify).';
    }
    pintarOpcoes(esc0);
    sel.addEventListener('change', function () { parar(); notaAudio(); });
    $('muOuvir').addEventListener('click', function () { var c = opcoes[sel.value]; if (c) ouvir(c.som); });
    var buscar = function () {
      var q = $('muBuscaQ').value.trim();
      if (q.length < 3) { flash('Digita pelo menos 3 letras.'); return; }
      var b = $('muBuscar'); b.disabled = true;
      acao('musica-buscar', { q: q, artistas: $('muArt').value }).then(function (j) {
        b.disabled = false;
        var l = (j && j.candidatos) || [];
        if (!l.length) { flash('Nada com esse nome no catálogo.'); return; }
        l.forEach(function (c) { if (!opcoes[c.id]) opcoes[c.id] = c; });
        parar(); pintarOpcoes(l[0].id);
        flash(l.length === 1 ? 'Achei 1 arquivo. Já escolhi.' : 'Achei ' + l.length + '. Escolhi o mais parecido; confere na lista.');
      });
    };
    $('muBuscar').addEventListener('click', buscar);
    $('muBuscaQ').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); buscar(); } });
    card.querySelectorAll('[data-sec]').forEach(function (b) {
      b.addEventListener('click', function () {
        secaoAtual = b.dataset.sec;
        card.querySelectorAll('[data-sec]').forEach(function (y) { y.setAttribute('aria-pressed', String(y === b)); });
      });
    });
    card.querySelector('[data-close]').addEventListener('click', fechar);
    $('muSalvar').addEventListener('click', function () {
      var b = this;
      var corpo = {
        id: m ? m.id : (lido && lido.ja) || null,
        nome: $('muNome').value, artistas: $('muArt').value, spotify: $('muSp').value.trim(), youtube: $('muYt').value.trim(),
        // sem mexer no campo, a data guardada fica como veio (só o ano continua só o ano)
        data: ($('muData').value === dataCampo(x.data) ? x.data : $('muData').value) || null, secao: secaoAtual, faixa: sel.value || null,
        capaUrl: novo ? x.capaUrl : undefined
      };
      b.disabled = true; b.textContent = 'Salvando…'; $('muErro').textContent = '';
      acao('musica-salvar', corpo).then(function (j) {
        if (!j || !j.ok) { b.disabled = false; b.textContent = 'Salvar'; $('muErro').textContent = (j && j.erro) || 'Não salvou. Tenta de novo.'; return; }
        dados = j; parar();
        destacar = corpo.id || x.id;
        fechar();
        flash(novo ? (secaoAtual === 'destaque' ? 'Entrou no fim dos destaques' : 'Entrou nas recentes') + (dados.noAr ? '. Aparece em até 1 minuto.' : ' (prévia). Liga o "No ar" quando quiser.') : 'Salvo.');
      });
    });
    var tirar = $('muTirar');
    if (tirar) {
      tirar.addEventListener('click', function () { $('muConfirma').hidden = false; tirar.hidden = true; });
      $('muNao').addEventListener('click', function () { $('muConfirma').hidden = true; tirar.hidden = false; });
      $('muSim').addEventListener('click', function () {
        this.disabled = true;
        acao('musica-tirar', { id: m.id }).then(function (j) { if (j && j.ok) { dados = j; fechar(); flash('Tirei do perfil.'); } else flash((j && j.erro) || 'Não consegui tirar.'); });
      });
    }
  }

  window.CaramujoMusicas = {
    abrir: function (el) {
      raiz = el;
      if (!$('mu-css')) {
        var st = document.createElement('style'); st.id = 'mu-css'; st.textContent = CSS;
        document.head.appendChild(st);
      }
      desenhar();
      carregar();
    },
    pintar: function () { desenhar(); },
    // a home do painel pergunta o resumo (n músicas, no ar ou não)
    resumo: function () { return dados ? { n: total(), noAr: dados.noAr } : null; }
  };
})();
