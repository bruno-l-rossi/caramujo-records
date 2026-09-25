/* Compartilhar com arte pro story (25/09/2026).
   O Instagram só oferece "Stories" no menu de compartilhar quando recebe uma
   IMAGEM; link sozinho não aparece. Aqui eu desenho a arte vertical do beat ou
   da beat tape (1080x1920, cara da Caramujo: capa, nome em serifa, ficha em mono,
   selo) e abro uma folha com: postar no story, enviar o link, copiar o link.
   O link já vai copiado na hora do story: no Instagram é só colar no sticker.
   Usado pelo site (index.html) e pelas páginas de beat tape (catalogo/app.html).
   Carregado sob demanda: ninguém baixa isso sem tocar em compartilhar. */
(function () {
  if (window.CaramujoStory) return;

  var W = 1080, H = 1920;
  var COR = {
    fundo: '#14110d', deep: '#1A1815', wire: '#332c22', fire: '#b98f5e', amber: '#c3a074',
    cream: '#f2ecdf', bone: '#E8E0CF', read: '#b89e72', dim: '#6f6757', blood: '#8C3B2E'
  };

  /* ---------- fontes e selo ---------- */
  var prontas = null;
  function fontes() {
    if (prontas) return prontas;
    var lista = [
      ['Cormorant Garamond', '/assets/fonts/cormorant-garamond-latin-600-normal.woff2', '600'],
      ['IBM Plex Mono', '/assets/fonts/ibm-plex-mono-latin-400-normal.woff2', '400'],
      ['Schibsted Grotesk', '/assets/fonts/schibsted-grotesk-latin-600-normal.woff2', '600']
    ];
    prontas = Promise.all(lista.map(function (f) {
      try {
        var ff = new FontFace(f[0], 'url(' + f[1] + ')', { weight: f[2] });
        return ff.load().then(function (x) { document.fonts.add(x); }).catch(function () {});
      } catch (_) { return Promise.resolve(); }
    }));
    return prontas;
  }

  var seloPath = null;
  function selo() {
    if (seloPath) return seloPath;
    seloPath = fetch('/assets/brand/selo-creme.svg').then(function (r) { return r.text(); }).then(function (t) {
      var m = t.match(/ d="([^"]+)"/);
      return m && typeof Path2D !== 'undefined' ? new Path2D(m[1]) : null;
    }).catch(function () { return null; });
    return seloPath;
  }

  function imagem(url) {
    return new Promise(function (ok) {
      if (!url) return ok(null);
      var img = new Image();
      img.onload = function () { ok(img); };
      img.onerror = function () { ok(null); };
      img.src = url;
    });
  }

  /* ---------- desenho ---------- */
  function desenharSelo(ctx, path, x, y, tam, cor, largura) {
    if (!path) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(tam / 100, tam / 100);
    ctx.translate(50, 50); ctx.rotate(Math.PI); ctx.translate(-50, -50);   // o SVG gira 180°
    ctx.strokeStyle = cor; ctx.lineWidth = largura; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.stroke(path);
    ctx.restore();
  }

  // capa borrada no fundo: reduz e amplia (funciona em todo navegador, sem ctx.filter)
  function fundoBorrado(ctx, img) {
    var p = document.createElement('canvas');
    p.width = 36; p.height = 64;
    var c = p.getContext('2d');
    var lado = Math.min(img.width, img.height);
    c.drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, -14, 0, 64, 64);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.globalAlpha = 0.55;
    ctx.drawImage(p, -60, -60, W + 120, H + 120);
    ctx.restore();
  }

  function grao(ctx) {
    var t = document.createElement('canvas');
    t.width = 180; t.height = 180;
    var c = t.getContext('2d');
    var d = c.createImageData(180, 180);
    for (var i = 0; i < d.data.length; i += 4) {
      var v = Math.random() * 255;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      d.data[i + 3] = 14;
    }
    c.putImageData(d, 0, 0);
    ctx.save();
    ctx.fillStyle = ctx.createPattern(t, 'repeat');
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // quebra o nome em até 2 linhas, diminuindo a fonte até caber
  function titulo(ctx, texto, cx, y, larg) {
    var tam = 112, linhas;
    for (; tam >= 64; tam -= 6) {
      ctx.font = '600 ' + tam + 'px "Cormorant Garamond", Georgia, serif';
      linhas = quebrar(ctx, texto, larg);
      if (linhas.length <= 2 && linhas.every(function (l) { return ctx.measureText(l).width <= larg; })) break;
    }
    if (linhas.length > 2) linhas = [linhas[0], linhas.slice(1).join(' ')];
    ctx.fillStyle = COR.cream;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    var alt = tam * 1.02;
    linhas.forEach(function (l, i) { ctx.fillText(l, cx, y + tam + i * alt); });
    return y + tam + (linhas.length - 1) * alt;
  }
  function quebrar(ctx, texto, larg) {
    var palavras = String(texto).split(/\s+/), linhas = [], atual = '';
    palavras.forEach(function (p) {
      var teste = atual ? atual + ' ' + p : p;
      if (ctx.measureText(teste).width > larg && atual) { linhas.push(atual); atual = p; }
      else atual = teste;
    });
    if (atual) linhas.push(atual);
    return linhas;
  }

  function espacado(ctx, texto, cx, y, espaco) {
    // letter-spacing na mão (canvas antigo não tem)
    var larg = 0, i;
    for (i = 0; i < texto.length; i++) larg += ctx.measureText(texto[i]).width + (i < texto.length - 1 ? espaco : 0);
    var x = cx - larg / 2;
    ctx.textAlign = 'left';
    for (i = 0; i < texto.length; i++) { ctx.fillText(texto[i], x, y); x += ctx.measureText(texto[i]).width + espaco; }
  }

  function chips(ctx, itens, cx, y) {
    ctx.font = '400 30px "IBM Plex Mono", ui-monospace, monospace';
    var pad = 22, gap = 14, alt = 58;
    var larguras = itens.map(function (t) { return ctx.measureText(t.texto).width + pad * 2; });
    var total = larguras.reduce(function (a, b) { return a + b; }, 0) + gap * (itens.length - 1);
    var x = cx - total / 2;
    itens.forEach(function (t, i) {
      ctx.fillStyle = t.cheio ? t.cor : 'rgba(20,17,13,.55)';
      ctx.fillRect(x, y, larguras[i], alt);
      ctx.strokeStyle = t.cor || COR.wire; ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, larguras[i] - 2, alt - 2);
      ctx.fillStyle = t.cheio ? COR.fundo : (t.corTexto || COR.bone);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(t.texto, x + larguras[i] / 2, y + alt / 2 + 1);
      x += larguras[i] + gap;
    });
    ctx.textBaseline = 'alphabetic';
  }

  // opts: { capa, titulo, kicker, ficha:[...], vendido, rodape }
  function arte(opts) {
    return Promise.all([fontes(), selo(), imagem(opts.capa)]).then(function (r) {
      var path = r[1], img = r[2];
      var cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      var ctx = cv.getContext('2d');

      ctx.fillStyle = COR.fundo; ctx.fillRect(0, 0, W, H);
      if (img) fundoBorrado(ctx, img);
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(20,17,13,.55)');
      g.addColorStop(0.45, 'rgba(20,17,13,.35)');
      g.addColorStop(0.7, 'rgba(20,17,13,.9)');
      g.addColorStop(1, 'rgba(20,17,13,1)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      grao(ctx);

      // topo: selo + CARAMUJO RECORDS (abaixo da barra do Instagram)
      desenharSelo(ctx, path, W / 2 - 30, 200, 60, COR.cream, 4);
      ctx.fillStyle = COR.cream;
      ctx.font = '600 28px "Schibsted Grotesk", "Helvetica Neue", Arial, sans-serif';
      espacado(ctx, 'CARAMUJO RECORDS', W / 2, 310, 9);

      // capa (ou o selo grande, quando não tem capa)
      var lado = 760, cx = (W - lado) / 2, cy = 370;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 24;
      ctx.fillStyle = COR.deep; ctx.fillRect(cx, cy, lado, lado);
      ctx.restore();
      if (img) {
        var l = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - l) / 2, (img.height - l) / 2, l, l, cx, cy, lado, lado);
      } else {
        desenharSelo(ctx, path, cx + lado / 2 - 190, cy + lado / 2 - 190, 380, COR.fire, 3);
      }
      ctx.strokeStyle = COR.wire; ctx.lineWidth = 2; ctx.strokeRect(cx + 1, cy + 1, lado - 2, lado - 2);

      // kicker, nome, ficha
      ctx.fillStyle = COR.fire;
      ctx.font = '400 28px "IBM Plex Mono", ui-monospace, monospace';
      espacado(ctx, String(opts.kicker || '').toUpperCase(), W / 2, cy + lado + 80, 8);
      var fim = titulo(ctx, opts.titulo || '', W / 2, cy + lado + 96, 900);
      // tom fica como se escreve (Am, Abm, F#m); o resto em caixa alta
      var fichas = (opts.ficha || []).filter(Boolean).map(function (t) {
        t = String(t);
        return { texto: /^[A-G](#|b)?(m|maj)?$/.test(t) ? t : t.toUpperCase() };
      });
      if (opts.vendido) fichas.push({ texto: 'VENDIDO', cor: COR.blood, corTexto: COR.bone });
      if (fichas.length) chips(ctx, fichas, W / 2, fim + 44);

      // rodapé: o endereço (o sticker de link vai por cima, onde você quiser)
      ctx.fillStyle = COR.read;
      ctx.font = '400 28px "IBM Plex Mono", ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(opts.rodape || 'caramujorecords.com.br', W / 2, 1640);
      ctx.fillStyle = COR.dim;
      ctx.font = '400 24px "IBM Plex Mono", ui-monospace, monospace';
      espacado(ctx, 'PROD. @RIDEBLAN33', W / 2, 1684, 6);
      return cv;
    });
  }

  function paraArquivo(cv, nome) {
    return new Promise(function (ok) {
      try {
        cv.toBlob(function (b) {
          if (!b) return ok(null);
          try { ok(new File([b], nome, { type: 'image/jpeg' })); } catch (_) { b.name = nome; ok(b); }
        }, 'image/jpeg', 0.92);
      } catch (_) { ok(null); }
    });
  }

  /* ---------- a folha ---------- */
  var CSS = [
    '.cs-veu{position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.66);display:flex;align-items:flex-end;justify-content:center}',
    '.cs-veu[hidden]{display:none}',
    '.cs-folha{width:100%;max-width:520px;max-height:92vh;overflow-y:auto;padding:22px 20px calc(22px + env(safe-area-inset-bottom,0px))}',
    '.cs-topo{display:flex;gap:16px;align-items:center}',
    '.cs-arte{flex:none;width:96px;aspect-ratio:9/16;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:11px;text-align:center}',
    '.cs-arte canvas{width:100%;height:100%;display:block}',
    '.cs-topo h2{margin:0 0 4px;font-size:22px;line-height:1.15}',
    '.cs-topo p{margin:0;font-size:13.5px;line-height:1.45}',
    '.cs-acoes{display:flex;flex-direction:column;gap:10px;margin-top:18px}',
    '.cs-acoes button{width:100%;padding:15px 16px;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px}',
    '.cs-acoes button:disabled{opacity:.45;cursor:default}',
    // cara do site: paleta da casa, cantos retos
    '.cs-site .cs-folha{background:#1A1815;border:1px solid #332c22;border-bottom:none;color:#E8E0CF}',
    '.cs-site .cs-arte{border:1px solid #332c22;background:#14110d;color:#6f6757}',
    '.cs-site h2{font-family:"Cormorant Garamond",Georgia,serif;font-weight:600;color:#f2ecdf;font-size:26px}',
    '.cs-site p{color:#b89e72;font-family:"Helvetica Neue",Helvetica,Arial,sans-serif}',
    '.cs-site .cs-acoes button{background:transparent;border:1px solid #332c22;color:#E8E0CF;font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;font-weight:700;font-size:12.5px;letter-spacing:.16em;text-transform:uppercase}',
    '.cs-site .cs-acoes .cs-forte{background:#b98f5e;border-color:#b98f5e;color:#14110d}',
    '.cs-site .cs-fechar{color:#9e7c48!important;border-color:transparent!important}',
    // cara das páginas de catálogo: a mesma do Offtop (cinza, redondo)
    '.cs-catalogo{z-index:40}',
    '.cs-catalogo .cs-folha{background:#141414;border-radius:20px 20px 0 0;color:#fff;font-family:"Schibsted Grotesk",-apple-system,Helvetica,Arial,sans-serif}',
    '.cs-catalogo .cs-arte{border-radius:10px;background:#0e0e0e;color:#8a8a8a}',
    '.cs-catalogo h2{font-weight:700}',
    '.cs-catalogo p{color:#8a8a8a}',
    '.cs-catalogo .cs-acoes button{border-radius:999px;border:1px solid #2a2a2a;background:#1b1b1b;color:#fff;font-weight:600}',
    '.cs-catalogo .cs-acoes .cs-forte{background:#fff;color:#000;border-color:#fff}',
    '.cs-catalogo .cs-fechar{background:transparent!important;border-color:transparent!important;color:#8a8a8a!important}',
    '@media (min-width:700px){.cs-veu{align-items:center}.cs-catalogo .cs-folha{border-radius:20px}.cs-site .cs-folha{border-bottom:1px solid #332c22}}'
  ].join('\n');

  function celular() {
    try { return !matchMedia('(hover: hover) and (pointer: fine)').matches; } catch (_) { return true; }
  }
  function copiar(t) {
    try { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(function () { return true; }, function () { return false; }); } catch (_) {}
    return Promise.resolve(false);
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var veu = null;
  function fechar() { if (veu) { veu.hidden = true; veu.innerHTML = ''; } }

  // opts: { tema:'site'|'catalogo', titulo, texto, url (enviar/copiar), urlStory (vai copiado pro sticker),
  //         arte:{...}, nomeArquivo, avisar(msg) }
  function abrir(opts) {
    if (!document.getElementById('cs-css')) {
      var st = document.createElement('style'); st.id = 'cs-css'; st.textContent = CSS; document.head.appendChild(st);
    }
    if (!veu) {
      veu = document.createElement('div'); veu.className = 'cs-veu'; veu.hidden = true;
      veu.addEventListener('click', function (e) { if (e.target === veu) fechar(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fechar(); });
      document.body.appendChild(veu);
    }
    var avisar = opts.avisar || function () {};
    var noCel = celular();
    var podeEnviar = noCel && !!navigator.share;
    veu.className = 'cs-veu cs-' + (opts.tema === 'catalogo' ? 'catalogo' : 'site');
    veu.innerHTML = '<div class="cs-folha" role="dialog" aria-modal="true" aria-label="Compartilhar">' +
      '<div class="cs-topo"><div class="cs-arte" id="csArte">preparando a arte…</div><div>' +
      '<h2>' + esc(opts.titulo || 'Compartilhar') + '</h2><p>' + esc(opts.texto || '') + '</p></div></div>' +
      '<div class="cs-acoes">' +
        '<button type="button" class="cs-forte" id="csStory" disabled>' + (noCel ? 'Postar no story' : 'Baixar a arte pro story') + '</button>' +
        (podeEnviar ? '<button type="button" id="csEnviar">Enviar o link</button>' : '') +
        '<button type="button" id="csCopiar">Copiar o link</button>' +
        '<button type="button" class="cs-fechar" id="csFechar">Fechar</button>' +
      '</div></div>';
    veu.hidden = false;
    var $ = function (i) { return document.getElementById(i); };
    $('csFechar').addEventListener('click', fechar);
    $('csCopiar').addEventListener('click', function () {
      copiar(opts.url).then(function (ok) { avisar(ok ? 'Link copiado.' : opts.url); });
    });
    if (podeEnviar) $('csEnviar').addEventListener('click', function () {
      navigator.share({ url: opts.url }).catch(function () {});
    });

    // a arte fica pronta enquanto você lê: o toque em "Postar" já compartilha na hora
    // (o celular só deixa abrir o compartilhar logo depois de um toque)
    var arquivo = null;
    arte(opts.arte || {}).then(function (cv) {
      var caixa = $('csArte'); if (!caixa) return;
      caixa.textContent = ''; caixa.appendChild(cv);
      return paraArquivo(cv, opts.nomeArquivo || 'caramujo-story.jpg');
    }).then(function (f) {
      arquivo = f;
      var b = $('csStory'); if (b && f) b.disabled = false;
      if (!f && $('csArte')) $('csArte').textContent = 'não consegui montar a arte';
    }).catch(function () { var c = $('csArte'); if (c) c.textContent = 'não consegui montar a arte'; });

    $('csStory').addEventListener('click', function () {
      if (!arquivo) return;
      var link = opts.urlStory || opts.url;
      copiar(link);                       // pro sticker de link do Instagram
      var comArquivo = false;
      try { comArquivo = noCel && navigator.canShare && navigator.canShare({ files: [arquivo] }); } catch (_) { comArquivo = false; }
      if (comArquivo) {
        navigator.share({ files: [arquivo] }).then(function () {
          avisar('No story, põe o sticker de link e cola: o link já está copiado.');
        }).catch(function () {});
        return;
      }
      // computador (ou celular sem compartilhar arquivo): baixa a arte
      var a = document.createElement('a');
      a.href = URL.createObjectURL(arquivo); a.download = arquivo.name || 'caramujo-story.jpg';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      avisar('Arte baixada. O link já está copiado pro sticker.');
    });
  }

  window.CaramujoStory = { abrir: abrir, arte: arte, fechar: fechar };
})();
