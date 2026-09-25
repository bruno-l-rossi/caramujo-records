/* Compartilhar (25/09/2026).
   Folha com a prévia, o texto e os botões:
   - Postar no story: manda só o arquivo. Faixa com som (beat da vitrine, beat da tape,
     faixa da pasta de artista) = SÓ vídeo, com o trecho e a onda andando, montado no
     aparelho (só o pedaço do áudio vem da rede). O botão mostra o andamento e, tocado
     antes da hora, avisa "Quase lá! Preparando seu vídeo". Falhou = "Tentar de novo".
     A arte parada ficou só pra tape inteira. Pausa o player e copia o link pro sticker.
   - Enviar o link: manda só o link (a prévia da conversa já mostra capa, nome e ficha).
   Story clicável automático (como SoundCloud/Spotify) só existe pra app nativo parceiro da
   Meta; pela web o caminho é o sticker de link.
   Pastas de artista: 30s (opts.duracao), sem link (semLink: mandar a faixa é o ENVIAR
   da pasta) e o nome do artista no lugar do texto do cupom (opts.texto).
   Usado pelo site (index.html) e pelas páginas de beat tape e de artista (catalogo/app.html).
   Carregado sob demanda (ou uns segundos depois do primeiro play, pra folha abrir na hora). */
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
  function medirTitulo(ctx, texto, larg) {
    var tam = 112, linhas;
    for (; tam >= 64; tam -= 6) {
      ctx.font = '600 ' + tam + 'px "Cormorant Garamond", Georgia, serif';
      linhas = quebrar(ctx, texto, larg);
      if (linhas.length <= 2 && linhas.every(function (l) { return ctx.measureText(l).width <= larg; })) break;
    }
    if (tam < 64) tam = 64;
    if (linhas.length > 2) linhas = [linhas[0], linhas.slice(1).join(' ')];
    return { tam: tam, linhas: linhas, alt: tam + (linhas.length - 1) * tam * 1.02 };
  }
  function titulo(ctx, m, cx, y) {
    ctx.font = '600 ' + m.tam + 'px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = COR.cream;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    m.linhas.forEach(function (l, i) { ctx.fillText(l, cx, y + m.tam + i * m.tam * 1.02); });
    return y + m.alt;
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

  // A onda do som (2ª versão, 25/09): barras de ponta redonda desenhadas direto no pixel
  // do vídeo (sem o borrão de reduzir de 1080 pra 720) e o que já tocou enchendo liso,
  // quadro a quadro. Antes enchia de barra em barra: nos 30s das músicas era 1,6 barra
  // por segundo, parecia vídeo travando. s = escala (0,67 no vídeo de 720, 0,2 na miniatura).
  var ONDA_A = 96;
  var ONDA_VAZIA = 'rgba(232,224,207,.2)';
  function nBarras(larg) { return Math.max(40, Math.min(72, Math.round((larg || 760) / 13.5))); }
  function onda(ctx, pk, prog, y, larg, s) {
    s = s || 1;
    var L = (larg || 760) * s, n = pk.length, passo = L / n;
    var bw = Math.max(1, Math.round(passo * 0.56)), r = bw / 2;
    var x0 = Math.round((W * s - L) / 2 + (passo - bw) / 2), meio = y * s, A = ONDA_A * s;
    var corte = Math.max(0, Math.min(n, prog * n)), redondo = typeof ctx.roundRect === 'function';
    for (var i = 0; i < n; i++) {
      var h = Math.max(bw, Math.round(pk[i] * A / 2) * 2);
      var x = x0 + Math.round(i * passo), topo = Math.round(meio - h / 2);
      ctx.beginPath();
      if (redondo) ctx.roundRect(x, topo, bw, h, r); else ctx.rect(x, topo, bw, h);
      if (i + 1 <= corte) { ctx.fillStyle = COR.fire; ctx.fill(); continue; }
      ctx.fillStyle = ONDA_VAZIA; ctx.fill();
      if (i < corte) {                       // a barra da vez: enche até o ponto exato
        ctx.save(); ctx.clip();
        ctx.fillStyle = COR.fire; ctx.fillRect(x, topo, bw * (corte - i), h);
        ctx.restore();
      }
    }
  }

  // opts: { capa, titulo, artista (pasta de artista: nome em âmbar logo acima do título), kicker, ficha:[...], onda (deixa lugar pra onda do vídeo) }
  // A arte sai centrada na altura, fora das barras do Instagram (topo e resposta).
  function arte(opts) {
    return Promise.resolve().then(function () { return Promise.all([fontes(), selo(), imagem(opts.capa)]); }).then(function (r) {
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

      // tom fica como se escreve (Am, Abm, F#m); o resto em caixa alta
      var fichas = (opts.ficha || []).filter(Boolean).map(function (t) {
        t = String(t);
        return { texto: /^[A-G](#|b)?(m|maj)?$/.test(t) ? t : t.toUpperCase() };
      });
      // sem etiqueta de vendido no compartilhar (pedido do Bruno, 25/09)

      // mede o bloco todo: a capa cresce até ocupar a altura (sem sobra embaixo)
      // e o conjunto fica centrado entre as barras do Instagram (topo ~170, resposta ~1720)
      var mt = medirTitulo(ctx, opts.titulo || '', 900);
      var TOPO = 170;
      // ordem embaixo da capa (pedido do Bruno, 25/09): nome, prod. @rideblan33, ficha
      var CHIPS = fichas.length ? 36 + 58 : 0;
      // artista (opção 2 escolhida pelo Bruno, 25/09): caixa alta, âmbar, espaçado, em cima
      // do nome da música. Nome comprido diminui até caber em 900px.
      var artista = String(opts.artista || '').trim().toLocaleUpperCase('pt-BR'), ART = artista ? 78 : 0, tamArt = 44;
      if (artista) {
        for (; tamArt > 28; tamArt -= 2) {
          ctx.font = '600 ' + tamArt + 'px "Schibsted Grotesk", "Helvetica Neue", Arial, sans-serif';
          if (ctx.measureText(artista).width + (artista.length - 1) * tamArt * 0.23 <= 900) break;
        }
      }
      var resto = TOPO + 24 + ART + mt.alt + 72 + CHIPS + (opts.onda ? 70 + ONDA_A : 0);
      var lado = Math.round(Math.max(680, Math.min(900, 1530 - resto)));
      var bloco = resto + lado;
      var y0 = 170 + Math.max(0, (1720 - 170 - bloco) / 2);

      desenharSelo(ctx, path, W / 2 - 30, y0, 60, COR.cream, 4);
      ctx.fillStyle = COR.cream;
      ctx.font = '600 28px "Schibsted Grotesk", "Helvetica Neue", Arial, sans-serif';
      espacado(ctx, 'CARAMUJO RECORDS', W / 2, y0 + 110, 9);

      // capa (ou o selo grande, quando não tem capa)
      var cx = (W - lado) / 2, cy = y0 + TOPO;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 24;
      ctx.fillStyle = COR.deep; ctx.fillRect(cx, cy, lado, lado);
      ctx.restore();
      if (img) {
        var l = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - l) / 2, (img.height - l) / 2, l, l, cx, cy, lado, lado);
      } else {
        desenharSelo(ctx, path, cx + lado / 2 - lado / 4, cy + lado / 2 - lado / 4, lado / 2, COR.fire, 3);
      }
      ctx.strokeStyle = COR.wire; ctx.lineWidth = 2; ctx.strokeRect(cx + 1, cy + 1, lado - 2, lado - 2);

      // nome, o prod. @rideblan33 do jeito que se escreve, e a ficha (gênero, BPM, tom, beat tape...)
      var yt = cy + lado + 24;
      if (artista) {
        ctx.fillStyle = COR.amber;
        ctx.font = '600 ' + tamArt + 'px "Schibsted Grotesk", "Helvetica Neue", Arial, sans-serif';
        espacado(ctx, artista, W / 2, yt + 62, Math.round(tamArt * 0.23));
        yt += ART;
      }
      var fim = titulo(ctx, mt, W / 2, yt);
      ctx.fillStyle = COR.fire;
      ctx.font = '400 30px "IBM Plex Mono", ui-monospace, monospace';
      espacado(ctx, String(opts.kicker || 'prod. @rideblan33'), W / 2, fim + 62, 4);
      fim += 72;
      if (fichas.length) { chips(ctx, fichas, W / 2, fim + 36); fim += CHIPS; }
      if (opts.onda) { cv.ondaY = fim + 70 + ONDA_A / 2; cv.ondaL = lado; }
      return cv;
    });
  }

  function paraArquivo(cv, nome) {
    return new Promise(function (ok) {
      try {
        cv.toBlob(function (b) {
          if (!b) return ok(null);
          ok(comoArquivo(b, nome + '.jpg', 'image/jpeg'));
        }, 'image/jpeg', 0.92);
      } catch (_) { ok(null); }
    });
  }
  function comoArquivo(blob, nome, tipo) {
    try { return new File([blob], nome, { type: tipo }); } catch (_) { blob.name = nome; return blob; }
  }

  /* ---------- vídeo com som ----------
     15s do beat (a partir de onde está tocando) + a arte com a onda andando.
     Caminho 1: WebCodecs (Chrome, Android, Safari novo), mais rápido que o tempo real.
     Caminho 2: gravar a tela da arte em tempo real (Safari antigo), ~15s.
     Sem nenhum dos dois, ou se algo falhar: fica a imagem parada. */
  // DUR: 15s nos beats (vitrine e tape), 30s nas músicas das pastas de artista (opts.duracao)
  var DUR = 15, FPS = 30, TAXA = 48000, BPS = 16000;   // mp3 de 128k = 16 mil bytes por segundo

  function espera(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }
  function offline(canais, amostras) {
    var C = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    return new C(canais, amostras, TAXA);
  }
  function decodificar(buf) {
    var ctx = offline(2, TAXA);
    return new Promise(function (ok, erro) {
      var p = ctx.decodeAudioData(buf, ok, erro);
      if (p && p.then) p.then(ok, erro);
    });
  }
  // Quadro de MP3 (MPEG-1 camada III, o que o conversor gera): tamanho em bytes, ou 0.
  function quadro(u, i) {
    if (i + 4 > u.length || u[i] !== 0xFF || (u[i + 1] & 0xFE) !== 0xFA) return 0;
    var br = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320][u[i + 2] >> 4];
    var sr = [44100, 48000, 32000][(u[i + 2] >> 2) & 3];
    if (!br || !sr) return 0;
    return Math.floor(144000 * br / sr) + ((u[i + 2] >> 1) & 1);
  }
  // o pedaço baixado começa no meio de um quadro: acha o 1º quadro inteiro (3 seguidos batendo)
  function primeiroQuadro(u) {
    for (var i = 0, lim = Math.min(u.length - 4, 8192); i < lim; i++) {
      var n = quadro(u, i), m = n && quadro(u, i + n);
      if (n && m && quadro(u, i + n + m)) return i;
    }
    return 0;
  }
  function baixarInteiro(src, inicio) {
    return fetch(src, { cache: 'no-store' }).then(function (r) { return r.arrayBuffer(); }).then(decodificar)
      .then(function (dec) { return { dec: dec, desloc: inicio, noFim: true, inteiro: true }; });
  }
  // Pede só o pedaço do mp3 que interessa (~265KB). Até 25/09 o pedaço ia direto pro
  // decodificador; no Android ele devolvia menos som do que veio (começo no meio de um
  // quadro) e o story ficava mudo no fim. Agora: corta no 1º quadro inteiro, lê o
  // Content-Range de verdade, e se o som vier curto baixa o arquivo inteiro.
  function baixarTrecho(src, inicio) {
    var a = Math.max(0, Math.floor((inicio - 0.5) * BPS)), b = Math.ceil((inicio + DUR + 1) * BPS);
    return fetch(src, { headers: { Range: 'bytes=' + a + '-' + b }, cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('áudio ' + r.status);
      if (r.status !== 206) return r.arrayBuffer().then(decodificar).then(function (dec) { return { dec: dec, desloc: inicio, noFim: true, inteiro: true }; });
      var cr = /bytes\s+(\d+)-(\d+)\/(\d+)/.exec(r.headers.get('content-range') || '');
      if (!cr) throw new Error('sem content-range');
      var ini = +cr[1], fim = +cr[2], total = +cr[3];
      return r.arrayBuffer().then(function (buf) {
        var q = primeiroQuadro(new Uint8Array(buf));
        var pedaco = q ? buf.slice(q) : buf, bytes = pedaco.byteLength;
        return decodificar(pedaco).then(function (dec) {
          if (dec.duration < bytes / BPS - 1) throw new Error('decodificou curto');
          return { dec: dec, desloc: inicio - (ini + q) / BPS, noFim: fim >= total - 1 };
        });
      });
    }).catch(function () { return baixarInteiro(src, inicio); });
  }
  // Onde o som acaba de verdade dentro do pedaço baixado. Beat costuma terminar com
  // uns segundos de cauda em silêncio; se ela cair dentro dos 15s, o story fica mudo
  // no fim (achado de 25/09/2026). Canal esquerdo, janelas de 50ms, -48dB.
  function fimAudivel(dec) {
    var d = dec.getChannelData(0), passo = Math.max(1, Math.round(dec.sampleRate * 0.05));
    for (var i = d.length - 1; i > 0; i -= passo) {
      for (var j = Math.max(0, i - passo); j <= i; j++) if (d[j] > 0.004 || d[j] < -0.004) return i / dec.sampleRate;
    }
    return 0;
  }
  // 15s em estéreo 48k, entrando e saindo suave.
  // audio: { src, inicio, dur, fixo (trecho escolhido pela onda/pessoa: não mexe), somAte (até onde a onda diz que tem som) }
  // O buffer volta com .inicio = o começo usado de verdade.
  function trecho(audio, jaInteiro) {
    var inicio = Math.max(0, Number(audio.inicio) || 0);
    if (audio.dur && inicio > audio.dur - DUR) inicio = Math.max(0, audio.dur - DUR);
    return (jaInteiro ? baixarInteiro(audio.src, inicio) : baixarTrecho(audio.src, inicio)).then(function (t) {
      // pedaço curto no meio da faixa = problema de download/decodificação: arquivo inteiro
      if (t.dec.duration - t.desloc < DUR - 0.3 && !t.noFim && !t.inteiro) return trecho(audio, true);
      // o trecho passa do fim do som: com onda/escolha (fixo), só o fim do arquivo conta;
      // sem onda, a cauda muda do beat também. Aí volta o começo (1 vez).
      var fimSom = audio.fixo ? t.dec.duration : Math.min(t.dec.duration, fimAudivel(t.dec) + 0.3);
      var falta = t.desloc + DUR - fimSom;
      if (falta > 0.4 && inicio > 0 && !audio.voltou) {
        return trecho({ src: audio.src, inicio: Math.max(0, inicio - falta - 0.3), dur: audio.dur, fixo: audio.fixo, voltou: true }, t.inteiro);
      }
      var desloc = Math.max(0, Math.min(t.desloc, t.dec.duration - DUR));
      var ctx = offline(2, DUR * TAXA);
      var s = ctx.createBufferSource(); s.buffer = t.dec;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0, 0); g.gain.linearRampToValueAtTime(1, 0.3);
      g.gain.setValueAtTime(1, DUR - 1.2); g.gain.linearRampToValueAtTime(0, DUR);
      s.connect(g); g.connect(ctx.destination);
      s.start(0, desloc, DUR);
      return new Promise(function (ok, erro) {
        ctx.oncomplete = function (e) { ok(e.renderedBuffer); };
        var p = ctx.startRendering(); if (p && p.then) p.then(ok, erro);
      }).then(function (som) {
        // a onda diz que tem som até X e o pedaço veio mudo antes: refaz com o arquivo inteiro
        if (audio.somAte && fimAudivel(som) < audio.somAte - 1) {
          if (!t.inteiro) return trecho(audio, true);
          throw new Error('som curto mesmo com o arquivo inteiro');   // vai a arte, nunca story mudo
        }
        som.inicio = inicio;
        return som;
      });
    });
  }

  // A onda da faixa inteira (volume a cada meio segundo, feita no conversor):
  // /audio/<id>.onda, ~1KB. Sem ela, o compartilhar segue do ponto que está tocando.
  function lerOnda(src) {
    var url = String(src).replace(/(\.mp3)?$/i, '.onda');
    var limite = espera(5000).then(function () { return null; });
    return Promise.race([fetch(url).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (o) { return o && o.p && o.p.length ? o : null; }).catch(function () { return null; }), limite]);
  }
  // o som acaba aqui (em segundos): depois é a cauda em silêncio
  function fimDaOnda(o) {
    var p = o.p, max = 0, i;
    for (i = 0; i < p.length; i++) if (p[i] > max) max = p[i];
    for (i = p.length - 1; i > 0 && p[i] < max * 0.08; i--);
    return (i + 1) * (o.passo || 0.5);
  }
  // os 15s de mais energia da faixa (onde o beat bate mais forte), sem entrar na cauda
  function maisForte(o) {
    var p = o.p, passo = o.passo || 0.5, n = Math.round(DUR / passo);
    var ult = Math.floor(fimDaOnda(o) / passo) - n;
    if (ult <= 0) return 0;
    var soma = 0, melhor = 0, maior = -1, i;
    for (i = 0; i < n; i++) soma += p[i] * p[i];
    for (i = 0; i <= ult; i++) {
      if (i > 0) soma += p[i + n - 1] * p[i + n - 1] - p[i - 1] * p[i - 1];
      if (soma > maior) { maior = soma; melhor = i; }
    }
    return melhor * passo;
  }

  // Altura de cada barra: volume médio do pedaço (os 2 canais). Som masterizado é alto
  // o tempo todo e as barras saíam quase iguais; agora estica do mais baixo ao mais alto
  // do trecho (ignorando os 10% mais baixos, que são a entrada e a saída suave).
  function picos(som, n) {
    var d = som.getChannelData(0), e = som.numberOfChannels > 1 ? som.getChannelData(1) : d;
    var passo = Math.floor(d.length / n), v = [];
    for (var i = 0; i < n; i++) {
      var soma = 0, k = 0;
      for (var j = i * passo; j < (i + 1) * passo; j += 4) { soma += d[j] * d[j] + e[j] * e[j]; k += 2; }
      v.push(Math.sqrt(soma / Math.max(1, k)));
    }
    var ord = v.slice().sort(function (a, b) { return a - b; });
    var lo = ord[Math.floor(n * 0.1)] * 0.8, hi = ord[n - 1];
    return v.map(function (x) {
      var t = hi > lo ? Math.max(0, Math.min(1, (x - lo) / (hi - lo))) : 0.5;
      return 0.14 + 0.86 * Math.pow(t, 0.9);
    });
  }

  var muxerJs = null;
  function carregarMuxer() {
    if (window.Mp4Muxer) return Promise.resolve();
    if (muxerJs) return muxerJs;
    muxerJs = new Promise(function (ok, falha) {
      var s = document.createElement('script'); s.src = '/assets/mp4-muxer.js?v=5.2.2';
      s.onload = ok; s.onerror = function () { muxerJs = null; falha(new Error('muxer')); };
      document.head.appendChild(s);
    });
    return muxerJs;
  }
  function temWebCodecs() {
    return !!(window.VideoEncoder && window.AudioEncoder && window.VideoFrame && window.AudioData);
  }
  function mimeGravacao() {
    try {
      if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return null;
      var l = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2'];
      for (var i = 0; i < l.length; i++) if (MediaRecorder.isTypeSupported(l[i])) return l[i];
      // Safari grava mp4 sempre em H.264 + AAC, mesmo sem dizer o codec
      if (/Apple/.test(navigator.vendor || '') && MediaRecorder.isTypeSupported('video/mp4')) return 'video/mp4';
    } catch (_) {}
    return null;   // só webm: o Instagram não aceita, fica a imagem
  }
  function podeVideo() { return !!((temWebCodecs() || mimeGravacao()) && (window.OfflineAudioContext || window.webkitOfflineAudioContext)); }
  // O Safari antigo só grava som com o áudio destravado por um toque: quem abre a folha
  // chama isso direto no toque de compartilhar (antes de carregar este arquivo, ver index.html).
  function precisaDestravar() { return !temWebCodecs() && !!mimeGravacao(); }

  // 720x1280 a 1 Mbps nos 15s dos beats (~2MB). Nos 30s das músicas, 800 kbps: com o
  // quadro-chave a cada 4s a arte sai tão nítida quanto a 1 Mbps com quadro-chave a cada
  // 2s (medido em 25/09 com x264: mesma nitidez), e o arquivo cai de ~4,2MB pra ~3,4MB.
  function taxaVideo() { return DUR > 15 ? 800000 : 1000000; }
  function escolherCodec() {
    // o Instagram recomprime pra 720p de qualquer jeito; a arte quase parada comprime bem
    var l = [[720, 1280, 'avc1.64001f'], [720, 1280, 'avc1.4d001f'], [720, 1280, 'avc1.42001f'], [1080, 1920, 'avc1.640028']]
      .concat(window.__csCodecsTeste || []);   // os testes no Chromium sem H.264 entram com VP9 aqui
    return l.reduce(function (p, t) {
      return p.then(function (achou) {
        if (achou) return achou;
        var cfg = { codec: t[2], width: t[0], height: t[1], bitrate: taxaVideo(), framerate: FPS };
        cfg.mux = t[3] || 'avc';
        return VideoEncoder.isConfigSupported(cfg).then(function (r) { return r.supported ? cfg : null; }, function () { return null; });
      });
    }, Promise.resolve(null));
  }

  async function porWebCodecs(base, desenhar, som, prog, segue) {
    var vcfg = await escolherCodec();
    if (!vcfg) throw new Error('sem codec de vídeo');
    // AAC (iPhone, Mac, Windows, Android); sem AAC, Opus (o Android lê mp4 com Opus)
    var acfg = null, sons = [['mp4a.40.2', 'aac'], ['opus', 'opus']];
    for (var c = 0; c < sons.length && !acfg; c++) {
      var t = { codec: sons[c][0], sampleRate: TAXA, numberOfChannels: 2, bitrate: 128000 };
      if (await AudioEncoder.isConfigSupported(t).then(function (r) { return r.supported; }, function () { return false; })) { acfg = t; acfg.mux = sons[c][1]; }
    }
    if (!acfg) throw new Error('sem codec de som');
    await carregarMuxer();
    var M = window.Mp4Muxer;
    var muxer = new M.Muxer({
      target: new M.ArrayBufferTarget(),
      video: { codec: vcfg.mux, width: vcfg.width, height: vcfg.height, frameRate: FPS },
      audio: { codec: acfg.mux, sampleRate: TAXA, numberOfChannels: 2 },
      fastStart: 'in-memory', firstTimestampBehavior: 'offset'
    });
    var falha = null;
    var venc = new VideoEncoder({ output: function (c, m) { muxer.addVideoChunk(c, m); }, error: function (e) { falha = e; } });
    venc.configure({ codec: vcfg.codec, width: vcfg.width, height: vcfg.height, bitrate: vcfg.bitrate, framerate: FPS });
    var aenc = new AudioEncoder({ output: function (c, m) { muxer.addAudioChunk(c, m); }, error: function (e) { falha = e; } });
    aenc.configure({ codec: acfg.codec, sampleRate: TAXA, numberOfChannels: 2, bitrate: 128000 });

    // o som entra junto com a imagem, em pedaços de 4096 amostras (múltiplo do quadro do AAC)
    // e esperando o codificador esvaziar: codificador de celular com a fila cheia pode perder
    // pedaço, e aí o story fica mudo no fim (25/09/2026)
    var n = som.length, L = som.getChannelData(0), R = som.getChannelData(1), passo = 4096, i = 0;
    async function somAte(amostra) {
      while (i < n && i < amostra) {
        var k = Math.min(passo, n - i), d = new Float32Array(k * 2);
        d.set(L.subarray(i, i + k), 0); d.set(R.subarray(i, i + k), k);
        var ad = new AudioData({ format: 'f32-planar', sampleRate: TAXA, numberOfFrames: k, numberOfChannels: 2, timestamp: Math.round(i / TAXA * 1e6), data: d });
        aenc.encode(ad); ad.close();
        i += k;
        while (aenc.encodeQueueSize > 4) await espera(2);
      }
    }

    var cv = document.createElement('canvas'); cv.width = vcfg.width; cv.height = vcfg.height;
    var ctx = cv.getContext('2d'), total = DUR * FPS;
    for (var f = 0; f < total; f++) {
      if (falha) throw falha;
      if (!segue()) { try { venc.close(); aenc.close(); } catch (_) {} throw new Error('cancelado'); }
      await somAte(Math.round((f + 1) / FPS * TAXA) + passo);
      desenhar(ctx, cv.width / W, f / (total - 1));
      var vf = new VideoFrame(cv, { timestamp: Math.round(f * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
      // quadro-chave a cada 4s (era 2s): a arte é parada, então o que sobra de bits vai
      // pra nitidez dela, sem o arquivo crescer
      venc.encode(vf, { keyFrame: f % (FPS * 4) === 0 }); vf.close();
      while (venc.encodeQueueSize > 6) await espera(4);
      if (f % 15 === 0) { prog(f / total); await espera(0); }
    }
    await somAte(n);
    await venc.flush(); await aenc.flush();
    venc.close(); aenc.close();
    if (falha) throw falha;
    muxer.finalize();
    return new Blob([muxer.target.buffer], { type: 'video/mp4' });
  }

  function porGravacao(desenhar, som, prog, segue) {
    var mime = mimeGravacao();
    var AC = window.AudioContext || window.webkitAudioContext;
    var ac = window.__csAC || new AC();
    return (ac.state === 'suspended' ? ac.resume() : Promise.resolve()).then(function () {
      if (ac.state !== 'running') throw new Error('som travado');
      var cv = document.createElement('canvas'); cv.width = 720; cv.height = 1280;
      var ctx = cv.getContext('2d');
      desenhar(ctx, cv.width / W, 0);
      var st = cv.captureStream(FPS);
      var dest = ac.createMediaStreamDestination();
      var s = ac.createBufferSource(); s.buffer = som; s.connect(dest);   // grava sem tocar no alto-falante
      st.addTrack(dest.stream.getAudioTracks()[0]);
      var rec = new MediaRecorder(st, { mimeType: mime, videoBitsPerSecond: taxaVideo(), audioBitsPerSecond: 128000 });
      var partes = [];
      rec.ondataavailable = function (e) { if (e.data && e.data.size) partes.push(e.data); };
      return new Promise(function (ok, erro) {
        rec.onstop = function () {
          st.getTracks().forEach(function (t) { t.stop(); });
          ok(new Blob(partes, { type: 'video/mp4' }));
        };
        rec.onerror = function (e) { erro(e.error || e); };
        // o gravador do iPhone demora pra começar a pegar o som: se o som sai antes,
        // o começo se perde e o vídeo termina mudo. Espera o "start" + 0,3s.
        var t0 = 0, comecou = false;
        var soltar = function () {
          if (comecou) return; comecou = true;
          setTimeout(function () { t0 = ac.currentTime + 0.05; s.start(t0); laco(); }, 300);
        };
        rec.onstart = soltar;
        rec.start();
        setTimeout(soltar, 1500);   // navegador que não avisa o start
        function laco() {
          var p = (ac.currentTime - t0) / DUR;
          if (!segue()) { try { s.stop(); } catch (_) {} rec.onstop = function () { st.getTracks().forEach(function (t) { t.stop(); }); erro(new Error('cancelado')); }; rec.stop(); return; }
          if (p >= 1) { desenhar(ctx, cv.width / W, 1); setTimeout(function () { rec.stop(); }, 500); return; }
          desenhar(ctx, cv.width / W, Math.max(0, p)); prog(Math.max(0, p));
          setTimeout(laco, 1000 / FPS);
        }
      });
    });
  }

  // base: a arte com lugar pra onda (cv.ondaY). Devolve { blob, picos }.
  function video(base, audio, prog, aoTerPicos, segue) {
    segue = segue || function () { return true; };
    return trecho(audio).then(function (som) {
      if (!segue()) throw new Error('cancelado');
      var pk = picos(som, nBarras(base.ondaL));
      if (aoTerPicos) aoTerPicos(pk);
      // 1º quadro: a arte inteira, reduzida uma vez só. Nos outros só a faixa da onda é
      // refeita (repõe o fundo dela e desenha as barras): bem menos trabalho por quadro.
      var desenhar = function (ctx, esc, p) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        var fx = ctx.__faixa;
        if (!fx || fx.base !== base) {
          ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(base, 0, 0, W * esc, H * esc);
          var m = 10, x = Math.max(0, Math.floor((W - base.ondaL) / 2 * esc) - m), y = Math.max(0, Math.floor((base.ondaY - ONDA_A / 2) * esc) - m);
          var c = document.createElement('canvas');
          c.width = Math.ceil(base.ondaL * esc) + m * 2; c.height = Math.ceil(ONDA_A * esc) + m * 2;
          c.getContext('2d').drawImage(ctx.canvas, x, y, c.width, c.height, 0, 0, c.width, c.height);
          fx = ctx.__faixa = { base: base, c: c, x: x, y: y };
        } else ctx.drawImage(fx.c, fx.x, fx.y);
        onda(ctx, pk, p, base.ondaY, base.ondaL, esc);
      };
      // Confere o arquivo pronto antes de oferecer: o som tem que ir até onde o trecho vai.
      // Se o caminho rápido (WebCodecs) sair com o fim mudo, tenta gravando; se ainda
      // assim falhar, vai a arte (nunca um story mudo no fim).
      var esperado = fimAudivel(som);
      var conferir = function (blob, caminho) {
        if (!blob || blob.size < 20000) throw new Error('vídeo vazio');
        prog(1);
        return blob.arrayBuffer().then(decodificar).then(function (b) {
          var fim = fimAudivel(b);
          window.__csDiag = { caminho: caminho, esperado: +esperado.toFixed(2), veio: +fim.toFixed(2), dur: +b.duration.toFixed(2) };
          if (fim < esperado - 1) throw new Error('som cortado (' + caminho + '): ' + fim.toFixed(1) + 's de ' + esperado.toFixed(1) + 's');
          return blob;
        }, function () { window.__csDiag = { caminho: caminho, conferido: false }; return blob; });   // navegador que não lê o próprio mp4: segue
      };
      var gravando = function () { return porGravacao(desenhar, som, prog, segue).then(function (b) { return conferir(b, 'gravacao'); }); };
      var feito = temWebCodecs()
        ? porWebCodecs(base, desenhar, som, prog, segue).then(function (b) { return conferir(b, 'webcodecs'); })
            .catch(function (e) { if (segue() && mimeGravacao()) return gravando(); throw e; })
        : gravando();
      return feito.then(function (blob) { return { blob: blob, picos: pk, inicio: som.inicio }; });
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
    '.cs-topo p strong{display:block;font-size:15px;margin-bottom:3px}',
    '.cs-acoes button small{display:block;font-size:10.5px;letter-spacing:.08em;font-weight:400;opacity:.75;margin-top:3px;text-transform:none}',
    '.cs-acoes .cs-forte{flex-direction:column;gap:0}',
    '.cs-acoes{display:flex;flex-direction:column;gap:10px;margin-top:18px}',
    // escolher o trecho: a faixa inteira com a janela de 15s pra arrastar
    '.cs-trecho{margin-top:18px}',
    '.cs-trecho[hidden]{display:none}',
    '.cs-trecho-topo{display:flex;justify-content:space-between;align-items:baseline;font-size:11px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px}',
    '.cs-trecho canvas{display:block;width:100%;height:52px;touch-action:none;cursor:grab}',
    '.cs-trecho p.cs-dica{margin:6px 0 0;font-size:11.5px}',
    '.cs-site .cs-trecho-topo{color:#b89e72;font-family:"IBM Plex Mono",ui-monospace,monospace}',
    '.cs-site .cs-trecho-topo b{color:#f2ecdf;font-weight:400}',
    '.cs-site .cs-dica{color:#6f6757!important}',
    '.cs-catalogo .cs-trecho-topo{color:#8a8a8a}',
    '.cs-catalogo .cs-trecho-topo b{color:#fff;font-weight:600}',
    '.cs-acoes button{width:100%;padding:15px 16px;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px}',
    '.cs-acoes button:disabled{opacity:.45;cursor:default}',
    // faixa com som (soVideo): o botão espera o vídeo e mostra o andamento enchendo
    '.cs-acoes .cs-forte{position:relative;isolation:isolate;overflow:hidden}',
    '.cs-barra{display:none;position:absolute;left:0;top:0;bottom:0;width:0;z-index:-1;pointer-events:none;transition:width .35s linear}',
    '.cs-acoes .cs-espera{opacity:1;cursor:progress}',
    '.cs-espera .cs-barra{display:block}',
    '.cs-catalogo .cs-acoes .cs-forte.cs-espera{background:#1b1b1b;border-color:#2a2a2a;color:#fff}',
    '.cs-catalogo .cs-espera .cs-barra{background:rgba(255,255,255,.16)}',
    '.cs-site .cs-acoes .cs-forte.cs-espera{background:transparent;border-color:#332c22;color:#E8E0CF}',
    // "Quase lá!": aviso rápido em cima do botão quando tocam antes do vídeo sair
    '.cs-acoes{position:relative}',
    '.cs-aviso{position:absolute;left:50%;top:-44px;transform:translate(-50%,6px);opacity:0;pointer-events:none;white-space:nowrap;padding:9px 16px;font-size:13px;transition:opacity .18s,transform .18s;z-index:2}',
    '.cs-aviso.on{opacity:1;transform:translate(-50%,0)}',
    '.cs-catalogo .cs-aviso{background:#fff;color:#000;border-radius:999px;font-weight:600}',
    '.cs-site .cs-aviso{background:#1e1a12;border:1px solid #A87B4A;color:#E8E0CF;font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:12px}',
    '.cs-site .cs-espera .cs-barra{background:rgba(185,143,94,.3)}',
    // cara do site: paleta da casa, cantos retos
    '.cs-site .cs-folha{background:#1A1815;border:1px solid #332c22;border-bottom:none;color:#E8E0CF}',
    '.cs-site .cs-arte{border:1px solid #332c22;background:#14110d;color:#6f6757}',
    '.cs-site h2{font-family:"Cormorant Garamond",Georgia,serif;font-weight:600;color:#f2ecdf;font-size:26px}',
    '.cs-site p{color:#b89e72;font-family:"Helvetica Neue",Helvetica,Arial,sans-serif}',
    '.cs-site p strong{color:#f2ecdf}',
    '.cs-site .cs-acoes button{background:transparent;border:1px solid #332c22;color:#E8E0CF;font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;font-weight:700;font-size:12.5px;letter-spacing:.16em;text-transform:uppercase}',
    '.cs-site .cs-acoes .cs-forte{background:#b98f5e;border-color:#b98f5e;color:#14110d}',
    '.cs-site .cs-fechar{color:#9e7c48!important;border-color:transparent!important}',
    // cara das páginas de catálogo: a mesma do Offtop (cinza, redondo)
    '.cs-catalogo{z-index:40}',
    '.cs-catalogo .cs-folha{background:#141414;border-radius:20px 20px 0 0;color:#fff;font-family:"Schibsted Grotesk",-apple-system,Helvetica,Arial,sans-serif}',
    '.cs-catalogo .cs-arte{border-radius:10px;background:#0e0e0e;color:#8a8a8a}',
    '.cs-catalogo h2{font-weight:700}',
    '.cs-catalogo p{color:#8a8a8a}',
    '.cs-catalogo p strong{color:#fff}',
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
  function podeCompartilhar(dados) {
    try { return !!(navigator.share && navigator.canShare && navigator.canShare(dados)); } catch (_) { return false; }
  }
  function baixar(arquivo) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(arquivo); a.download = arquivo.name || 'caramujo-story';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var TEXTO = 'Nos marque e receba um cupom exclusivo!\n@rideblan33 · © Caramujo Records';

  // A prévia do trecho toca num player só da folha. Quem chama destrava ele no toque de
  // compartilhar (window.__csPrevia, tocando mudo): o celular só deixa tocar som depois de um toque.
  var veu = null, vez = 0, previa = null;
  function pararPrevia() { if (previa) { try { previa.pause(); previa.ontimeupdate = null; } catch (_) {} } }
  function fechar() { vez++; pararPrevia(); if (veu) { veu.hidden = true; veu.innerHTML = ''; } }
  function mmss(t) { t = Math.max(0, Math.round(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }

  // opts: { tema:'site'|'catalogo', titulo, texto (padrão: o do cupom), url (o link que vai na conversa),
  //         urlStory (vai copiado pro sticker do story), arte:{...}, audio:{ src, inicio, dur } (sem audio = arte parada),
  //         nomeArquivo, pausar() (para o player da página), avisar(msg),
  //         soVideo (só posta o vídeo: o botão espera ele ficar pronto mostrando o andamento),
  //         semLink (sem "Enviar o link" e sem copiar link pro sticker) }
  // Faixa com som vira soVideo sozinha (vitrine, tape, pasta de artista). Pasta de artista
  // também vai semLink: mandar a faixa é trabalho do ENVIAR da pasta.
  // Dois caminhos, porque a web não sabe qual app a pessoa escolhe na tela do aparelho:
  //   Postar no story: manda SÓ o arquivo (vídeo com som, ou a arte). Nunca trava: a arte fica
  //     pronta em menos de 1s e o vídeo entra no lugar quando termina (a legenda do botão conta).
  //   Enviar o link: manda SÓ o link (a prévia do WhatsApp/Direct já mostra capa, nome e ficha).
  // Com som: começa nos 15s mais fortes do beat (pela onda) e a pessoa pode arrastar a janela
  // pra outro trecho, ouvindo na hora (como o Instagram faz com música).
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
    var minha = ++vez;
    var vivo = function () { return minha === vez; };
    DUR = Number(opts.duracao) === 30 ? 30 : 15;
    var avisar = opts.avisar || function () {};
    var pausar = function () { try { if (opts.pausar) opts.pausar(); } catch (_) {} };
    var linhas = String(opts.texto || TEXTO).split('\n');
    var temTrecho = !!(opts.audio && opts.audio.src);
    var comSom = temTrecho && podeVideo();
    var catalogo = opts.tema === 'catalogo';
    // Faixa com som = só vídeo (decisão de 25/09 noite, vitrine, tape e pastas de artista):
    // prévia de música em imagem parada não vai mais. A arte parada fica pra tape inteira.
    var soVideo = !!opts.soVideo || temTrecho, semLink = !!opts.semLink || !opts.url, falhou = false;
    var nome = String(opts.nomeArquivo || 'caramujo-story').replace(/\.(jpe?g|mp4)$/i, '');
    veu.className = 'cs-veu cs-' + (catalogo ? 'catalogo' : 'site');
    veu.innerHTML = '<div class="cs-folha" role="dialog" aria-modal="true" aria-label="Compartilhar">' +
      '<div class="cs-topo"><div class="cs-arte" id="csArte">preparando a arte…</div><div>' +
      '<h2>' + esc(opts.titulo || 'Compartilhar') + '</h2><p><strong>' + esc(linhas[0]) + '</strong>' +
      esc(linhas.slice(1).join(' ')) + '</p></div></div>' +
      '<div class="cs-trecho" id="csTrecho" hidden><div class="cs-trecho-topo"><span>Trecho do story</span><b id="csTempo"></b></div>' +
      '<canvas id="csFaixa" aria-label="Arrasta pra escolher o trecho de ' + DUR + ' segundos"></canvas>' +
      '<p class="cs-dica">Arrasta pra escolher o trecho que vai no story.</p></div>' +
      '<div class="cs-acoes"><div class="cs-aviso" id="csAviso" role="status" aria-live="polite"></div>' +
        '<button type="button" class="cs-forte' + (soVideo ? ' cs-espera' : '') + '" id="csStory" disabled>Postar no story<small id="csSom"></small><span class="cs-barra" id="csBarra"></span></button>' +
        (semLink ? '' : '<button type="button" id="csLink">Enviar o link</button>') +
        '<button type="button" class="cs-fechar" id="csFechar">Fechar</button>' +
      '</div></div>';
    veu.hidden = false;
    var $ = function (i) { return document.getElementById(i); };
    var legenda = function (t) { var e = $('csSom'); if (e && vivo()) e.textContent = t; };
    // soVideo: o botão fica esperando (barra enchendo) até o vídeo sair; se falhar, vira "Tentar de novo"
    var botao = function (estado, texto, p) {
      var b = $('csStory'); if (!b || !vivo()) return;
      b.firstChild.nodeValue = estado === 'falhou' ? 'Tentar de novo' : 'Postar no story';
      b.classList.toggle('cs-espera', estado === 'espera');
      // esperando, o botão segue tocável: o toque mostra o "Quase lá!" (pedido de 25/09)
      b.disabled = estado === 'sem';
      if (estado === 'espera') b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled');
      falhou = estado === 'falhou';
      $('csBarra').style.width = Math.round(Math.max(0, Math.min(1, p || 0)) * 100) + '%';
      legenda(texto);
    };
    $('csFechar').addEventListener('click', fechar);

    // prévia pequena (a arte grande fica na memória)
    var vista = document.createElement('canvas'); vista.width = 216; vista.height = 384;
    function mostrar(cv, pk) {
      var c = vista.getContext('2d');
      c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(cv, 0, 0, 216, 384);
      if (pk && cv.ondaY) onda(c, pk, 0.4, cv.ondaY, cv.ondaL, 0.2);
      var caixa = $('csArte'); if (caixa && vivo() && !vista.parentNode) { caixa.textContent = ''; caixa.appendChild(vista); }
    }

    // 1) a arte parada: libera o botão na hora
    var arqImagem = null, arqVideo = null;
    var semArte = function () { var c = $('csArte'); if (c && vivo()) c.textContent = 'sem prévia'; };
    if (soVideo) {
      if (!comSom) {
        arte(Object.assign({}, opts.arte, { onda: false })).then(function (cv) { mostrar(cv); }).catch(semArte);
        botao('sem', temTrecho ? 'esse navegador não monta vídeo: abre no Chrome ou no Safari atualizado' : 'essa faixa não tem som pra prévia', 0);
      } else botao('espera', 'preparando…', 0.02);
    } else arte(Object.assign({}, opts.arte, { onda: false })).then(function (cv) {
      if (!comSom) mostrar(cv);
      return paraArquivo(cv, nome);
    }).then(function (f) {
      arqImagem = f;
      var b = $('csStory'); if (b && f && vivo()) b.disabled = false;
      if (!f) semArte();
    }).catch(semArte);

    // 2) com trecho: acha os 15s (onda), toca a prévia em loop, monta o vídeo e deixa trocar
    if (temTrecho) {
      var src = opts.audio.src, dur = Number(opts.audio.dur) || 0, inicio = Number(opts.audio.inicio) || 0;
      var base = null, ger = 0, timer = null, onda0 = null, pintar = function () {};
      var tocando = -1;
      if (comSom && !soVideo) legenda('preparando o som…');

      // toca o trecho escolhido, em loop, até a folha fechar ou a pessoa postar
      var tocarTrecho = function () {
        if (!vivo()) return;
        pausar();                                            // o beat da página para
        previa = window.__csPrevia || previa || new Audio();
        window.__csPrevia = previa;
        if (previa.__src !== src) { previa.src = src; previa.__src = src; }
        var ini = inicio;
        var pular = function () { try { previa.currentTime = ini; } catch (_) {} };
        previa.muted = true;                                 // mudo até chegar no trecho
        previa.onseeked = function () { if (Math.abs(previa.currentTime - ini) < 1) previa.muted = false; };
        previa.ontimeupdate = function () {
          if (!vivo()) return pararPrevia();
          var t = previa.currentTime;
          if (t < ini - 0.5 || t > ini + DUR + 1) return;    // ainda pulando
          if (t >= ini + DUR) { pular(); return; }           // volta pro começo do trecho
          tocando = t; pintar();
        };
        previa.onpause = function () { tocando = -1; if (vivo()) pintar(); };
        if (previa.readyState >= 1) pular(); else previa.onloadedmetadata = pular;
        var p = previa.play(); if (p && p.catch) p.catch(function () {});
      };

      var gerar = function () {
        var meu = ++ger;
        var segue = function () { return meu === ger && vivo(); };
        arqVideo = null;
        if (soVideo) botao('espera', 'baixando o som…', 0.04); else legenda('preparando o som…');
        var limite = espera(DUR * (soVideo ? 4000 : 3000)).then(function () { throw new Error('demorou'); });
        var ini = inicio;
        var pedido = { src: src, inicio: ini, dur: dur, fixo: !!onda0,
          somAte: onda0 ? Math.min(DUR, fimDaOnda(onda0) - ini) - 0.5 : 0 };
        Promise.race([video(base, pedido, function (p) {
          if (!segue()) return;
          if (!soVideo) return legenda('preparando o som · ' + Math.round(p * 100) + '%');
          var t = 0.1 + p * 0.88;   // baixar e cortar o som ≈ 10%, montar ≈ 88%, conferir o resto
          botao('espera', p >= 1 ? 'conferindo o som…' : 'montando o vídeo · ' + Math.round(t * 100) + '%', t);
        }, function (pk) {
          if (!segue()) return;
          mostrar(base, pk);
          if (soVideo) botao('espera', 'montando o vídeo · 10%', 0.1);
        }, segue), limite]).then(function (v) {
          if (!segue()) return;
          arqVideo = comoArquivo(v.blob, nome + '.mp4', 'video/mp4');
          var usado = typeof v.inicio === 'number' ? v.inicio : ini;
          if (soVideo) botao('pronto', 'vídeo de ' + DUR + 's · ' + mmss(usado) + ' a ' + mmss(usado + DUR), 1);
          else legenda('com ' + DUR + 's de som · ' + mmss(usado) + ' a ' + mmss(usado + DUR));
        }).catch(function () {
          if (!segue()) return;
          ger++;                                          // o que ainda estiver montando para
          if (soVideo) botao('falhou', 'não deu pra montar o vídeo', 0);
          else legenda('');                               // sem som: segue a arte
        });
      };

      Promise.all([lerOnda(src), comSom ? arte(Object.assign({}, opts.arte, { onda: true })) : null]).then(function (r) {
        if (!vivo()) return;
        onda0 = r[0]; base = r[1];
        if (onda0) {
          dur = dur || onda0.dur || onda0.p.length * (onda0.passo || 0.5);
          inicio = maisForte(onda0);        // os 15s mais fortes do beat
        } else if (dur && inicio > dur - DUR) inicio = Math.max(0, dur - DUR);
        tocarTrecho();
        if (!comSom) return;               // aparelho sem vídeo: toca a prévia e posta a arte
        mostrar(base);
        if (dur > DUR + 1) montarEscolha();
        gerar();
      }).catch(function () { if (soVideo) botao('falhou', 'não deu pra montar o vídeo', 0); else legenda(''); });

      // a faixa inteira com a janela de 15s
      var montarEscolha = function () {
        var cx = $('csFaixa'), caixa = $('csTrecho');
        if (!cx || !caixa) return;
        caixa.hidden = false;
        var dpr = Math.min(3, window.devicePixelRatio || 1);
        var larg = cx.clientWidth || 300, alt = 52;
        cx.width = Math.round(larg * dpr); cx.height = Math.round(alt * dpr);
        var cores = catalogo ? { on: '#ffffff', off: 'rgba(255,255,255,.22)', borda: '#ffffff', fundo: 'rgba(255,255,255,.07)' }
          : { on: '#b98f5e', off: 'rgba(232,224,207,.2)', borda: '#b98f5e', fundo: 'rgba(185,143,94,.12)' };
        var fimOk = onda0 ? Math.min(dur, fimDaOnda(onda0) + 0.5) : dur;
        var maxInicio = Math.max(0, fimOk - DUR);
        var nb = Math.max(20, Math.floor(larg / 4));
        var barras = [];
        for (var i = 0; i < nb; i++) {
          if (!onda0) { barras.push(0.35); continue; }
          var p = onda0.p, a0 = Math.floor(i * p.length / nb), a1 = Math.max(a0 + 1, Math.floor((i + 1) * p.length / nb)), m = 0;
          for (var j = a0; j < a1 && j < p.length; j++) if (p[j] > m) m = p[j];
          barras.push(0.12 + 0.88 * m / 255);
        }
        pintar = function () {
          var c = cx.getContext('2d');
          c.setTransform(dpr, 0, 0, dpr, 0, 0);
          c.clearRect(0, 0, larg, alt);
          var x0 = inicio / dur * larg, x1 = (inicio + DUR) / dur * larg, bw = larg / nb;
          c.fillStyle = cores.fundo; c.fillRect(x0, 0, x1 - x0, alt);
          for (var i = 0; i < nb; i++) {
            var x = i * bw, h = Math.max(3, barras[i] * (alt - 12));
            c.fillStyle = (x + bw / 2 >= x0 && x + bw / 2 <= x1) ? cores.on : cores.off;
            c.fillRect(x + 0.5, (alt - h) / 2, Math.max(1, bw - 1.5), h);
          }
          c.strokeStyle = cores.borda; c.lineWidth = 2; c.strokeRect(x0 + 1, 1, x1 - x0 - 2, alt - 2);
          if (tocando >= 0) { var xp = tocando / dur * larg; c.fillStyle = catalogo ? '#fff' : '#f2ecdf'; c.fillRect(xp - 1, 0, 2, alt); }
          var t = $('csTempo'); if (t) t.textContent = mmss(inicio) + ' – ' + mmss(inicio + DUR);
        };
        pintar();

        var arrasto = null;
        var posicao = function (e) { var r = cx.getBoundingClientRect(); return (e.clientX - r.left) / r.width * dur; };
        cx.addEventListener('pointerdown', function (e) {
          var t = posicao(e);
          arrasto = (t >= inicio && t <= inicio + DUR) ? t - inicio : DUR / 2;   // fora da janela: centra no toque
          inicio = Math.max(0, Math.min(maxInicio, t - arrasto));
          try { cx.setPointerCapture(e.pointerId); } catch (_) {}
          tocando = -1; pintar();
        });
        cx.addEventListener('pointermove', function (e) {
          if (arrasto === null) return;
          inicio = Math.max(0, Math.min(maxInicio, posicao(e) - arrasto));
          pintar();
        });
        var soltar = function () {
          if (arrasto === null) return;
          arrasto = null;
          inicio = Math.round(inicio * 2) / 2;
          pintar();
          tocarTrecho();
          // o vídeo refaz quando a pessoa para de mexer; até lá, "Postar" manda a arte
          // (no soVideo o botão volta a esperar)
          arqVideo = null;
          ger++;
          if (soVideo) botao('espera', 'trecho novo: preparando…', 0.02); else legenda('preparando o som…');
          clearTimeout(timer);
          timer = setTimeout(function () { if (vivo()) gerar(); }, 700);
        };
        cx.addEventListener('pointerup', soltar);
        cx.addEventListener('pointercancel', soltar);
      };
    }

    var tAviso = null;
    var quaseLa = function () {
      var a = $('csAviso'); if (!a) return;
      a.textContent = 'Quase lá! Preparando seu vídeo';
      a.classList.add('on');
      clearTimeout(tAviso); tAviso = setTimeout(function () { a.classList.remove('on'); }, 1800);
    };
    $('csStory').addEventListener('click', function () {
      if (falhou) { if (gerar) gerar(); return; }        // "Tentar de novo"
      if (soVideo && !arqVideo) { quaseLa(); return; }
      var f = soVideo ? arqVideo : (arqVideo || arqImagem);
      if (!f) return;
      pararPrevia();
      pausar();                             // o site para de tocar junto com o Instagram
      if (!semLink) copiar(opts.urlStory || opts.url);    // pro sticker de link do story
      if (podeCompartilhar({ files: [f] })) {
        navigator.share({ files: [f] }).then(function () {
          fechar();
          if (!semLink) avisar('Link copiado: no story, cola no sticker de link.');
        }).catch(function (e) {
          if (e && e.name === 'AbortError') return;   // a pessoa desistiu
          avisar('Não abriu o compartilhar. Tenta de novo.');
        });
        return;
      }
      // navegador sem compartilhar arquivo (Firefox no computador): baixa e copia
      baixar(f);
      avisar(semLink ? 'Vídeo baixado.' : 'Arquivo baixado e link copiado.');
    });

    if (!semLink) $('csLink').addEventListener('click', function () {
      if (navigator.share) {
        navigator.share({ url: opts.url }).then(fechar).catch(function () {});
        return;
      }
      copiar(opts.url).then(function (ok) { avisar(ok ? 'Link copiado.' : opts.url); });
    });
  }

  window.CaramujoStory = { abrir: abrir, arte: arte, fechar: fechar, precisaDestravar: precisaDestravar, video: video, podeVideo: podeVideo, maisForte: maisForte, fimDaOnda: fimDaOnda, primeiroQuadro: primeiroQuadro, onda: onda, picos: picos, nBarras: nBarras };

  // deixa o juntador de mp4 no cache enquanto a pessoa ouve (32KB), pra folha não esperar a rede
  try {
    if (temWebCodecs()) {
      var ocioso = window.requestIdleCallback || function (f) { setTimeout(f, 1500); };
      ocioso(function () { carregarMuxer().catch(function () {}); });
    }
  } catch (_) {}
})();
