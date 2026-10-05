/* Músicas do perfil (05/10/2026): a aba "Músicas" do caramujorecords.com.br/rideblan33.
   - Colar o link do Spotify (ou do YouTube): nome, artistas, data e capa vêm sozinhos.
   - Destaque (a ordem é sua, setas) ou Recente (vai pela data, a mais nova primeiro).
   - Trecho: o arquivo da pasta do artista no catálogo. O painel acha sozinho quando o
     nome bate; o começo é o pedaço mais forte (dá pra mudar e ouvir aqui).
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
    '.mu-colar .campo{padding:9px 12px}',
    '.mu-colar .pill{flex:none}',
    '.mu-sec{margin-top:22px}',
    '.mu-sec-topo{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:4px}',
    '.mu-sec-topo b{font-size:11px;letter-spacing:.2em;color:var(--ink3);text-transform:uppercase}',
    '.mu-sec-topo small{font-size:12px;color:var(--ink4)}',
    '.mu-lista{list-style:none;margin:0;padding:0}',
    '.mu-lista li{display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--linha)}',
    '.mu-lista .linha{flex:1;min-width:0;padding:11px 0}',
    '.mu-lista .meta em{font-style:normal;color:#e0b155}',
    '.mu-capa{width:44px;height:44px;flex:none;border-radius:6px;overflow:hidden;background:#171717;border:1px solid var(--linha)}',
    '.mu-capa img{width:100%;height:100%;object-fit:cover;display:block}',
    '.mu-setas{display:flex;flex-direction:column;gap:2px}',
    '.mu-setas button{width:34px;height:24px;border-radius:7px;border:1px solid var(--borda);background:#141414;color:var(--ink2);cursor:pointer;font-size:12px;line-height:1;padding:0}',
    '.mu-setas button:disabled{opacity:.25;cursor:default}',
    '.mu-vazio{padding:14px 0;color:#5a5a5a;font-size:13.5px;line-height:1.5}',
    '.mu-form{display:flex;flex-direction:column;gap:12px;margin-top:16px}',
    '.mu-form label{display:flex;flex-direction:column;gap:6px;font-size:11px;letter-spacing:.14em;color:var(--ink4);text-transform:uppercase}',
    '.mu-form input,.mu-form select{background:var(--campo);border:1px solid var(--borda);border-radius:12px;padding:12px 13px;font-size:15px;color:var(--ink);outline:none;width:100%;box-sizing:border-box;color-scheme:dark;letter-spacing:0;text-transform:none}',
    '.mu-form input:focus,.mu-form select:focus{border-color:#3a3a3a}',
    '.mu-tipo{display:flex;background:#141414;border:1px solid var(--borda);border-radius:12px;padding:3px}',
    '.mu-tipo button{flex:1;border:0;background:transparent;color:var(--ink3);font-size:13.5px;padding:9px;border-radius:9px;cursor:pointer}',
    '.mu-tipo button[aria-pressed="true"]{background:#fff;color:#000;font-weight:600}',
    '.mu-perigo{border-color:#5a2a22!important;color:#f0b3a6}',
    '.mu-confirma{margin-top:12px;border:1px solid #5a2a22;background:#1a100e;border-radius:12px;padding:12px 14px;font-size:13px;color:#e8c9c2;line-height:1.45}',
    '.mu-confirma[hidden]{display:none}',
    '.mu-confirma .mu-acoes{display:flex;gap:8px;margin-top:10px}',
    '.mu-confirma .mu-acoes .pill{flex:1;justify-content:center}',
    '.mu-trecho{background:#101010;border:1px solid var(--borda);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:10px}',
    '.mu-trecho .rot{margin:0}',
    '.mu-trecho small{font-size:12px;color:var(--ink4);line-height:1.45}',
    '.mu-ouvir{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
    '.mu-ouvir input{width:90px;text-align:center;font-variant-numeric:tabular-nums}',
    '.mu-ouvir .pill{padding:9px 13px;font-size:13px}',
    '.mu-ouvir i{flex-basis:100%;height:3px;background:#242424;border-radius:2px;overflow:hidden;font-style:normal}',
    '.mu-ouvir i b{display:block;height:100%;width:0;background:#fff}',
    '.mu-busca{display:flex;align-items:center;gap:8px}',
    '.mu-form .campo input{border:0;border-radius:0;padding:0;background:transparent;font-size:15px}',
    '.mu-busca .pill{flex:none;padding:9px 13px;font-size:13px}',
    '.mu-ja{border:1px solid #3a2f18;background:#16120a;border-radius:12px;padding:10px 12px;font-size:13px;color:#e8d5a8;line-height:1.45}',
    '.mu-erro{font-size:13px;color:#e08d7e}',
    '.mu-erro:empty{display:none}'
  ].join('\n');

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
  function seg(t) {
    var m = String(t || '').trim().match(/^(\d{1,2}):(\d{1,2})$/);
    if (m) return +m[1] * 60 + +m[2];
    return /^\d{1,4}$/.test(String(t).trim()) ? +t : null;
  }
  // a data guardada pode ser só o ano ou ano-mês (veio assim do Spotify): o campo pede o dia
  function dataCampo(d) { d = String(d || ''); return d.length === 10 ? d : d.length === 7 ? d + '-01' : d.length === 4 ? d + '-01-01' : ''; }
  var PERFIL = '/rideblan33?de=painel#musicas';

  var raiz = null, dados = null, erroCarga = false;

  // cada abertura guarda até 4 capas na prateleira: faltou, pede de novo sozinho (até 4 vezes)
  var voltas = 0;
  function carregar() {
    pedir('musicas').then(function (j) {
      erroCarga = !j || !j.ok; dados = erroCarga ? null : j; desenhar();
      if (dados && dados.faltamCapas > 0 && voltas < 4) { voltas++; setTimeout(carregar, 300); }
    }).catch(function () { erroCarga = true; desenhar(); });
  }
  function usar(j, msg) {
    if (!j || j.erro || !j.ok) { flash((j && j.erro) || 'Não deu certo. Tenta de novo.'); return false; }
    if (j.destaques) dados = j;
    desenhar(); if (msg) flash(msg);
    return true;
  }
  function total() { return dados ? dados.destaques.length + dados.recentes.length : 0; }

  /* ---------- a tela ---------- */

  function desenhar() {
    if (!raiz) return;
    var res = $('resumo');
    if (!dados) {
      raiz.innerHTML = '<div class="vazio">' + (erroCarga ? 'Não consegui carregar as músicas. Recarrega a página.' : 'carregando…') + '</div>';
      if (res) res.textContent = 'a aba Músicas do seu perfil';
      return;
    }
    var n = total();
    if (res) res.textContent = n + (n === 1 ? ' música' : ' músicas') + ' · ' + (dados.noAr ? 'no ar pra todo mundo' : 'fora do ar (só você vê a prévia)');
    var h = '<div class="mu-topo"><div class="sw"><div><b>No ar no perfil</b><small>' +
      (dados.noAr ? 'Todo mundo vê a aba Músicas no seu perfil.' : 'Desligado: a aba Músicas só aparece pra você, logado no painel.') +
      '</small></div><button class="toggle" type="button" id="muNoAr" aria-pressed="' + !!dados.noAr + '" aria-label="Aba Músicas no ar"><i></i></button></div>' +
      '<a href="' + PERFIL + '" target="_blank" rel="noopener">Ver ' + (dados.noAr ? 'o perfil' : 'a prévia') + ' ↗</a></div>';
    h += '<div class="mu-novo"><h3>Adicionar música</h3><p>No Spotify: ⋯ › Compartilhar › Copiar link da música. Cola aqui; nome, artistas, data e capa vêm sozinhos.</p>' +
      '<div class="mu-colar"><div class="campo"><input id="muLink" type="url" inputmode="url" placeholder="Link do Spotify ou do YouTube" autocomplete="off" aria-label="Link da música"></div>' +
      '<button class="pill solid" type="button" id="muLer">Ler link</button></div></div>';
    h += secao('Destaques', 'a ordem é sua', dados.destaques, true);
    h += secao('Recentes', 'a mais nova primeiro', dados.recentes, false);
    raiz.innerHTML = h;

    $('muNoAr').addEventListener('click', function () {
      var b = this, liga = b.getAttribute('aria-pressed') !== 'true';
      if (liga && !n) { flash('Coloca pelo menos uma música antes de ligar.'); return; }
      b.disabled = true;
      acao('musicas-no-ar', { noAr: liga }).then(function (j) {
        b.disabled = false;
        usar(j, liga ? 'Aba Músicas no ar. O perfil mostra em até 1 minuto.' : 'Aba Músicas fora do ar. Só você vê a prévia.');
      });
    });
    var ler = function () {
      var v = $('muLink').value.trim(), b = $('muLer');
      if (!v) { $('muLink').focus(); return; }
      b.disabled = true; b.textContent = 'Lendo…';
      acao('musica-ler', { link: v }).then(function (j) {
        b.disabled = false; b.textContent = 'Ler link';
        if (!j || !j.ok) { flash((j && j.erro) || 'Não consegui ler esse link.'); return; }
        $('muLink').value = '';
        abrirMusica(null, j);
      });
    };
    $('muLer').addEventListener('click', ler);
    $('muLink').addEventListener('keydown', function (e) { if (e.key === 'Enter') ler(); });
    raiz.querySelectorAll('[data-abre]').forEach(function (b) {
      b.addEventListener('click', function () { abrirMusica(achar(b.dataset.abre)); });
    });
    raiz.querySelectorAll('[data-mover]').forEach(function (b) {
      b.addEventListener('click', function () {
        b.disabled = true;
        acao('musica-mover', { id: b.dataset.mover, dir: +b.dataset.dir }).then(function (j) { usar(j); });
      });
    });
  }
  function achar(id) {
    return dados.destaques.concat(dados.recentes).filter(function (x) { return x.id === id; })[0] || null;
  }
  function secao(titulo, sub, lista, ordena) {
    var h = '<div class="mu-sec"><div class="mu-sec-topo"><b>' + titulo + ' · ' + lista.length + '</b><small>' + sub + '</small></div>';
    if (!lista.length) return h + '<div class="mu-vazio">' + (ordena ? 'Nenhum destaque ainda. Os destaques são a fileira de capas grandes do topo da aba.' : 'Nenhuma recente ainda.') + '</div></div>';
    return h + '<ul class="mu-lista">' + lista.map(function (m, k) {
      var capa = m.capaSrc ? '<img src="' + esc(m.capaSrc) + '" alt="" loading="lazy">' : '';
      // o estado do trecho vem primeiro (é o que falta conferir antes de ligar o No ar)
      var info = [m.trecho ? 'trecho ' + mmss(m.ini) : '<em>sem trecho</em>', ordena ? '' : mesAno(m.data) || 'sem data',
        esc(m.artistas || '')].filter(Boolean).join(' · ');
      return '<li><span class="mu-capa">' + capa + '</span><button class="linha" type="button" data-abre="' + esc(m.id) + '"><span style="min-width:0;flex:1"><span class="nome">' + esc(m.nome) + '</span><span class="meta">' + info + '</span></span><span class="seta" aria-hidden="true">›</span></button>' +
        (ordena ? '<span class="mu-setas"><button type="button" data-mover="' + esc(m.id) + '" data-dir="-1" aria-label="Subir ' + esc(m.nome) + '"' + (k === 0 ? ' disabled' : '') + '>▲</button><button type="button" data-mover="' + esc(m.id) + '" data-dir="1" aria-label="Descer ' + esc(m.nome) + '"' + (k === lista.length - 1 ? ' disabled' : '') + '>▼</button></span>' : '') + '</li>';
    }).join('') + '</ul></div>';
  }

  /* ---------- ouvir o trecho aqui ---------- */

  var som = null, fimEm = 0;
  function parar() { if (som) { som.pause(); som = null; } var b = $('muOuvir'); if (b) b.textContent = 'Ouvir 30 s'; var i = $('muBarra'); if (i) i.style.width = '0'; }
  function ouvir(url, ini, dur) {
    if (som) return parar();
    som = new Audio(url + '#t=' + ini); fimEm = ini + dur;
    var b = $('muOuvir'), barra = $('muBarra');
    if (b) b.textContent = 'Parar';
    som.addEventListener('loadedmetadata', function () { if (som && som.currentTime < ini - 1) som.currentTime = ini; });
    som.addEventListener('timeupdate', function () {
      if (!som) return;
      if (barra) barra.style.width = Math.max(0, Math.min(100, (som.currentTime - ini) / dur * 100)) + '%';
      if (som.currentTime >= fimEm) parar();
    });
    som.addEventListener('ended', parar);
    som.play().catch(function () { parar(); flash('Não consegui tocar esse arquivo.'); });
  }

  /* ---------- o cartão de uma música ---------- */

  // m = música da lista (editar) ou null (nova, com o que o link trouxe em lido)
  function abrirMusica(m, lido) {
    var novo = !m, x = m || lido.musica, card = $('card');
    var secaoAtual = m ? m.secao : 'recente';
    var cands = (lido && lido.candidatos) || [];
    // o trecho escolhido: o atual (editar) ou o melhor candidato que é música (nova)
    var esc0 = m ? (m.faixa || '') : (cands[0] && cands[0].musica && cands[0].pts >= 100 ? cands[0].id : '');
    var opcoes = {};
    if (m && m.trecho) opcoes[m.faixa] = { id: m.faixa, titulo: m.trecho.titulo, pasta: m.trecho.pasta, som: m.trecho.som, atual: true };
    cands.forEach(function (c) { if (!opcoes[c.id]) opcoes[c.id] = c; });

    var capa = x.capaSrc || x.capaUrl;
    var h = '<div class="cab"><div class="capa-mini">' + (capa ? '<img src="' + esc(capa) + '" alt="">' : '') + '</div><div class="cab-txt"><h2>' + (novo ? 'Nova música' : esc(x.nome)) + '</h2>' +
      '<p>' + (novo ? 'Confere o que veio do link e escolhe onde ela entra.' : 'Muda o que precisar e salva.') + '</p></div></div>';
    if (lido && lido.ja) h += '<div class="mu-ja" style="margin-top:14px">Essa música já está na lista. Salvar aqui atualiza a que já existe.</div>';
    if (novo && !x.nome) h += '<div class="mu-ja" style="margin-top:14px">O link não trouxe o nome. Digita o nome e os artistas.</div>';
    h += '<div class="mu-form">' +
      '<label>Nome<input id="muNome" value="' + esc(x.nome) + '" autocomplete="off"></label>' +
      '<label>Artistas (sem você)<input id="muArt" value="' + esc(x.artistas) + '" placeholder="Ex.: CandyBoiNarco, mavyrmldy" autocomplete="off"></label>' +
      '<label>Link do Spotify<input id="muSp" type="url" value="' + esc(x.spotify || '') + '" placeholder="open.spotify.com/track/…" autocomplete="off"></label>' +
      '<label>Link do YouTube (opcional)<input id="muYt" type="url" value="' + esc(x.youtube || '') + '" placeholder="youtube.com/watch?v=…" autocomplete="off"></label>' +
      '<label>Lançamento (ordena as recentes)<input id="muData" type="date" value="' + esc(dataCampo(x.data)) + '"></label>' +
      '<div><div class="rot">ONDE ENTRA</div><div class="mu-tipo" role="group" aria-label="Onde a música entra">' +
        '<button type="button" data-sec="destaque" aria-pressed="' + (secaoAtual === 'destaque') + '">Destaque</button>' +
        '<button type="button" data-sec="recente" aria-pressed="' + (secaoAtual === 'recente') + '">Recente</button></div></div>' +
      '<div class="mu-trecho"><div class="rot">TRECHO DE ' + (dados ? dados.trechoSeg : 30) + ' S NO PERFIL</div>' +
        '<select id="muFaixa" aria-label="Arquivo do trecho"></select>' +
        '<div class="mu-busca"><div class="campo" style="padding:8px 12px"><input id="muBuscaQ" type="search" placeholder="Buscar outro arquivo no catálogo" autocomplete="off" aria-label="Buscar arquivo"></div><button class="pill" type="button" id="muBuscar">Buscar</button></div>' +
        '<div class="mu-ouvir" id="muOuvirBox"><span style="font-size:13px;color:var(--ink3)">Começa em</span><input id="muIni" inputmode="numeric" placeholder="auto" autocomplete="off" aria-label="Começa em (minuto:segundo)" value="' + (m && m.faixa && m.ini != null ? mmss(m.ini) : '') + '"><button class="pill" type="button" id="muOuvir">Ouvir 30 s</button><i><b id="muBarra"></b></i></div>' +
        '<small id="muTrechoNota"></small></div>' +
      '<div class="mu-erro" id="muErro"></div></div>' +
      '<div class="acoes"><button class="pill" type="button" data-close>Cancelar</button><button class="pill solid" type="button" id="muSalvar">' + (novo && !(lido && lido.ja) ? 'Colocar no perfil' : 'Salvar') + '</button></div>' +
      (novo ? '' : '<button class="pill mu-perigo" type="button" id="muTirar" style="width:100%;justify-content:center;margin-top:10px">Tirar do perfil</button>' +
        '<div class="mu-confirma" id="muConfirma" hidden>Tirar <b>' + esc(x.nome) + '</b> da aba Músicas? Dá pra colocar de novo colando o link.<div class="mu-acoes"><button class="pill" type="button" id="muNao">Não</button><button class="pill mu-perigo" type="button" id="muSim">Tirar</button></div></div>');
    card.innerHTML = h;
    $('veil').hidden = false;

    var sel = $('muFaixa');
    function pintarOpcoes(escolha) {
      var ids = Object.keys(opcoes);
      sel.innerHTML = '<option value="">Sem trecho (só os botões do Spotify/YouTube)</option>' + ids.map(function (id) {
        var c = opcoes[id];
        return '<option value="' + esc(id) + '"' + (id === escolha ? ' selected' : '') + '>' + esc(c.titulo) + ' · ' + esc(c.pasta) + (c.musica === false ? ' (beat)' : '') + '</option>';
      }).join('');
      notaTrecho();
    }
    function notaTrecho() {
      var v = sel.value, nota = $('muTrechoNota'), box = $('muOuvirBox');
      box.style.display = v ? '' : 'none';
      if (!v) { nota.textContent = Object.keys(opcoes).length ? 'Sem trecho, a capa leva direto pro Spotify.' : 'Não achei arquivo com esse nome no catálogo. Busca acima ou deixa sem trecho (a capa leva pro Spotify).'; return; }
      nota.textContent = $('muIni').value ? 'Muda o começo (minuto:segundo) e ouve antes de salvar.' : 'Vazio = o pedaço mais forte da música, escolhido sozinho ao salvar.';
    }
    pintarOpcoes(esc0);
    sel.addEventListener('change', function () { parar(); $('muIni').value = ''; notaTrecho(); });
    $('muIni').addEventListener('input', notaTrecho);
    $('muOuvir').addEventListener('click', function () {
      var c = opcoes[sel.value]; if (!c) return;
      var ini = seg($('muIni').value);
      if (ini == null) {
        if ($('muIni').value.trim()) { flash('O começo fica no formato minuto:segundo (ex.: 1:12).'); return; }
        ini = m && m.faixa === sel.value && m.ini != null ? m.ini : 0;
        if (!(m && m.faixa === sel.value)) flash('Tocando do começo. Salva pra ele achar o pedaço mais forte.');
      }
      ouvir(c.som, ini, (dados && dados.trechoSeg) || 30);
    });
    var buscar = function () {
      var q = $('muBuscaQ').value.trim();
      if (q.length < 3) { flash('Digita pelo menos 3 letras.'); return; }
      var b = $('muBuscar'); b.disabled = true;
      acao('musica-buscar', { q: q, artistas: $('muArt').value }).then(function (j) {
        b.disabled = false;
        var l = (j && j.candidatos) || [];
        if (!l.length) { flash('Nada com esse nome no catálogo.'); return; }
        l.forEach(function (c) { if (!opcoes[c.id]) opcoes[c.id] = c; });
        pintarOpcoes(l[0].id); $('muIni').value = ''; notaTrecho();
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
      var b = this, ini = $('muIni').value.trim(), iniS = seg(ini);
      if (ini && iniS == null) { $('muErro').textContent = 'O começo do trecho fica no formato minuto:segundo (ex.: 1:12).'; return; }
      var corpo = {
        id: m ? m.id : (lido && lido.ja) || null,
        nome: $('muNome').value, artistas: $('muArt').value, spotify: $('muSp').value.trim(), youtube: $('muYt').value.trim(),
        // sem mexer no campo, a data guardada fica como veio (só o ano continua só o ano)
        data: ($('muData').value === dataCampo(x.data) ? x.data : $('muData').value) || null, secao: secaoAtual, faixa: sel.value || null, ini: sel.value && ini ? iniS : null,
        capaUrl: novo ? x.capaUrl : undefined
      };
      b.disabled = true; b.textContent = 'Salvando…'; $('muErro').textContent = '';
      acao('musica-salvar', corpo).then(function (j) {
        if (!j || !j.ok) { b.disabled = false; b.textContent = 'Salvar'; $('muErro').textContent = (j && j.erro) || 'Não salvou. Tenta de novo.'; return; }
        dados = j; parar(); fechar();
        flash(novo ? 'Música no perfil' + (dados.noAr ? '. Aparece em até 1 minuto.' : ' (prévia). Liga o "No ar" quando quiser.') : 'Salvo.');
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
