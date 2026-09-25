// Recebe o que o conversor (GitHub Actions) preparou: cadastra o artista,
// diz quais faixas faltam converter, guarda o MP3 no R2 e fecha a sincronia.
// Protegido pelo token INGEST_TOKEN.

import { db, now, slugify, code, json } from '../_lib/db.js';
import { mesma, limpo } from '../_lib/casar.js';   // o cruzamento mora lá, um só pro site inteiro
import { vitrine } from '../_lib/vitrine.js';

// Teto de segurança da prateleira. O plano gratuito do R2 vai até 10 GB;
// paramos em 8 pra nunca virar cobrança. A conta cheia do catálogo dá ~3 GB.
const TETO_BYTES = 8 * 1024 * 1024 * 1024;

// Bitrate do MP3 (ouvir no site, nos catálogos e o "baixar MP3"). Faixa guardada com
// outro valor entra no plano de novo e é refeita a partir do WAV do Drive.
export const KBPS = 128;

// Quanto a prateleira ocupa. Somar a tabela inteira a cada MP3 que subia lia
// faixas × faixas na conversão total (24/09/2026): agora soma uma vez por minuto
// por isolate e vai acrescentando o que sobe. Conta pra cima (MP3 refeito conta
// duas vezes até a próxima soma), que é o lado seguro pro teto.
let prateleira = { at: 0, n: 0 };
async function usado(d) {
  if (Date.now() - prateleira.at < 60e3) return prateleira.n;
  const r = await d.prepare('SELECT COALESCE(SUM(mp3_bytes), 0) AS n FROM tracks WHERE ready = 1').first();
  prateleira = { at: Date.now(), n: Number(r?.n || 0) };
  return prateleira.n;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.INGEST_TOKEN || request.headers.get('x-ingest-token') !== env.INGEST_TOKEN) {
    return json({ erro: 'token invalido' }, 401);
  }

  try {
    return await rodar(request, env);
  } catch (e) {
    const msg = String(e && e.message || e);
    // Limite do dia do D1 (5 mi de linhas lidas no gratuito): o conversor para a
    // rodada inteira quando vê "limite", em vez de seguir convertendo à toa.
    if (/exceed|limit|quota|too many|daily/i.test(msg)) {
      return json({ erro: 'banco do site no limite do dia: ' + msg.slice(0, 200), limite: true }, 503);
    }
    throw e;
  }
}

async function rodar(request, env) {
  const url = new URL(request.url);
  const op = url.searchParams.get('op');
  const d = await db(env);

  if (op === 'plan') return plan(d, await request.json(), request, env);
  if (op === 'track') return track(d, env, url, request);
  if (op === 'capa') return capa(d, env, url, request);
  if (op === 'done') return done(d, env, url, await request.json());
  if (op === 'fila') return fila(d, await request.json());
  if (op === 'exclusivos') return exclusivos(d, await request.json());
  if (op === 'faltando') return faltando(d, request, env);
  if (op === 'onda') return onda(env, url, await request.json());
  if (op === 'semonda') return semonda(d, env);
  if (op === 'faxina') return faxina(d, env);
  return json({ erro: 'op desconhecida' }, 400);
}

async function plan(d, body, request, env) {
  const { folderId, name, tracks } = body;
  if (!folderId || !name || !Array.isArray(tracks)) return json({ erro: 'faltou dado' }, 400);

  // 'tape'    = beat tape do @rideblan33: nasce sem download, tag vem do cruzamento.
  // 'vitrine' = prateleira interna, sem página e sem tag: guarda o MP3 de beat que o
  //             site vende e que não existe em nenhum outro catálogo (só em Exclusivos).
  const tipo = (body.tipo === 'tape' || body.tipo === 'vitrine') ? body.tipo : 'artista';
  const tape = tipo === 'tape';
  const fechado = tipo !== 'artista';

  let artist = await d.prepare('SELECT * FROM artists WHERE folder_id = ?').bind(folderId).first();

  if (!artist) {
    let slug = slugify(name);
    const taken = await d.prepare('SELECT 1 FROM artists WHERE slug = ?').bind(slug).first();
    if (taken) slug = slug + '-' + code(3);
    await d.prepare(
      'INSERT INTO artists (slug, name, folder_id, code, tipo, dl_beats, dl_sons) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(slug, name, folderId, code(5), tipo, fechado ? 0 : 1, fechado ? 0 : 1).run();
    artist = await d.prepare('SELECT * FROM artists WHERE folder_id = ?').bind(folderId).first();
  } else if (artist.name !== name || artist.tipo !== tipo) {
    await d.prepare('UPDATE artists SET name = ?, tipo = ? WHERE id = ?').bind(name, tipo, artist.id).run();
  }

  // Numa tape, a tag não vem da pasta: sai do cruzamento com Exclusivos
  // e com o que já está nas pastas dos artistas.
  const venda = tape ? await marcarVenda(d, tracks, request, env) : null;

  const have = await d.prepare(
    'SELECT id, src_modified, ready, mp3_kbps FROM tracks WHERE artist_id = ?'
  ).bind(artist.id).all();
  const byId = new Map((have.results || []).map((r) => [r.id, r]));

  const stamp = now();
  const need = [];
  const rows = [];

  for (const t of tracks) {
    const old = byId.get(t.id);
    const fresh = old && old.ready === 1 && old.src_modified === t.modified;
    // pronta mas em outro bitrate: continua tocando a antiga até a nova chegar
    if (!fresh || old.mp3_kbps !== KBPS) need.push(t.id);
    rows.push(
      d.prepare(
        `INSERT INTO tracks (id, artist_id, title, kind, grp, bpm, mkey, tag, wav_bytes, src_modified, ready, revisar, seen_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           artist_id = excluded.artist_id, title = excluded.title, kind = excluded.kind,
           grp = excluded.grp, bpm = excluded.bpm, mkey = excluded.mkey, tag = excluded.tag,
           wav_bytes = excluded.wav_bytes, src_modified = excluded.src_modified,
           ready = CASE WHEN tracks.src_modified = excluded.src_modified THEN tracks.ready ELSE 0 END,
           revisar = excluded.revisar, seen_at = excluded.seen_at`
      ).bind(
        t.id, artist.id, t.title, t.kind, t.grp,
        t.bpm ?? null, t.key ?? null, t.tag ?? null,
        t.wavBytes ?? null, t.modified, fresh ? 1 : 0, t.revisar ?? null, stamp
      )
    );
  }

  if (rows.length) await d.batch(rows);

  await d.prepare(
    "UPDATE artists SET job_estado = 'convertendo', job_total = ?, job_feitos = 0, job_at = ? WHERE id = ?"
  ).bind(need.length, stamp, artist.id).run();

  const usadoBytes = await usado(d);
  const capaAtual = artist.cover_origem === 'artista' ? null : (artist.cover_key || null);
  // capa que subiu antes de existir miniatura: o conversor gera só a pequena
  const capaMini = capaAtual ? !!(await env.AUDIO.head(`capa/${capaAtual}-p.jpg`).catch(() => null)) : false;
  return json({
    artistId: artist.id, slug: artist.slug, code: artist.code, need, venda,
    capaAtual, capaMini,
    prateleira: { usado: usadoBytes, teto: TETO_BYTES, folga: TETO_BYTES - usadoBytes }
  });
}

/* ---------- disponível, vendido, ou pra eu revisar ---------- */

async function exclusivos(d, body) {
  const beats = Array.isArray(body.beats) ? body.beats : [];
  const lista = beats.map((b) => ({ title: b.title, bpm: b.bpm ?? null, key: b.key ?? null }));
  await d.prepare(
    `INSERT INTO meta (chave, valor) VALUES ('exclusivos', ?)
     ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor`
  ).bind(JSON.stringify({ at: now(), beats: lista })).run();
  return json({ ok: true, total: lista.length });
}

// As faixas das pastas de artista, pro cruzamento das tapes. Na conversão as 25
// tapes chegam em sequência: guardo 1 minuto em vez de ler tudo 25 vezes.
let dosArtistas = { at: 0, lista: null };
async function faixasDosArtistas(d) {
  if (dosArtistas.lista && Date.now() - dosArtistas.at < 60e3) return dosArtistas.lista;
  const { results } = await d.prepare(
    `SELECT t.title, t.bpm, t.mkey, t.kind, a.name AS artista
       FROM tracks t JOIN artists a ON a.id = t.artist_id
      WHERE a.tipo = 'artista'`
  ).all();
  dosArtistas = { at: Date.now(), lista: results || [] };
  return dosArtistas.lista;
}

// Escreve t.tag ('disponivel' | 'vendido' | null) e t.revisar nas faixas da tape.
async function marcarVenda(d, tracks, request, env) {
  // O que eu marquei na mão no painel vence o cruzamento e não volta atrás.
  const manual = new Map();
  for (let i = 0; i < tracks.length; i += 60) {
    const ids = tracks.slice(i, i + 60).map((t) => t.id);
    const vagas = ids.map(() => '?').join(', ');
    const { results } = await d.prepare(
      `SELECT id, venda_manual FROM tracks WHERE venda_manual IS NOT NULL AND id IN (${vagas})`
    ).bind(...ids).all();
    for (const r of results || []) manual.set(r.id, r.venda_manual);
  }

  // O SITE manda no vendido. Se lá o beat já saiu, a tape acompanha, aconteça o que
  // acontecer no cruzamento: anunciar DISPONÍVEL um beat vendido é o pior erro daqui.
  let vendidosNoSite = [];
  try { vendidosNoSite = (await vitrine(request, env)).filter((b) => b.sold); }
  catch { vendidosNoSite = []; }

  const guardado = await d.prepare("SELECT valor FROM meta WHERE chave = 'exclusivos'").first();
  let aVenda = [];
  try { aVenda = JSON.parse(guardado?.valor || '{}').beats || []; } catch { aVenda = []; }

  // Quem decide "vendido" é o BEAT na pasta do artista (solto ou em Já gravados).
  // Música gravada com o mesmo nome não decide sozinha: manda pra revisão, porque
  // nome repetido entre beat e som acontece e eu não anuncio beat no chute.
  // Puxo a lista inteira porque o LOWER do SQLite não tira acento e "dígitos"
  // não bateria com "digitos"; a comparação boa é aqui, com limpo().
  const results = await faixasDosArtistas(d);
  const naMao = [];
  const gravadas = [];
  for (const r of results || []) {
    const item = { title: r.title, bpm: r.bpm, key: r.mkey, artista: r.artista };
    (r.kind === 'beat' ? naMao : gravadas).push(item);
  }

  const conta = { disponivel: 0, vendido: 0, revisar: 0 };

  for (const t of tracks) {
    if (manual.has(t.id)) {
      t.tag = manual.get(t.id); t.revisar = null;
      if (t.tag === 'disponivel') conta.disponivel++; else conta.vendido++;
      continue;
    }
    if (vendidosNoSite.some((b) => mesma(b, t))) {
      t.tag = 'vendido'; t.revisar = null; conta.vendido++;
      continue;
    }
    const emExclusivos = aVenda.some((b) => mesma(b, t));
    const comArtista = naMao.find((r) => mesma(r, t)) || null;
    const soMusica = comArtista ? null : (gravadas.find((r) => mesma(r, t)) || null);

    if (emExclusivos && !comArtista && !soMusica) {
      t.tag = 'disponivel'; t.revisar = null; conta.disponivel++;
    } else if (comArtista && !emExclusivos) {
      t.tag = 'vendido'; t.revisar = null; conta.vendido++;
    } else {
      // nos dois ao mesmo tempo, só como música gravada, ou em lugar nenhum:
      // sai sem pastilha e entra na minha lista
      t.tag = null;
      t.revisar = comArtista
        ? 'Está em Exclusivos e nos beats de ' + comArtista.artista
        : soMusica
          ? 'Aparece só como música gravada, na pasta de ' + soMusica.artista +
            (emExclusivos ? ', e também em Exclusivos' : '')
          // (24/09/2026) Exclusivos virou opcional: beat que não aparece em pasta de
          // artista nenhuma é beat novo, e a Fila do painel marca em lote
          : 'Beat novo: não aparece em nenhuma pasta de artista (nem em Exclusivos)';
      conta.revisar++;
    }
  }

  return conta;
}

// O que o site vende e ainda não tem MP3 guardado em lugar nenhum. O conversor usa
// isso pra puxar de Exclusivos SÓ esses, sem duplicar o que já está na prateleira.
async function faltando(d, request, env) {
  const beats = (await vitrine(request, env)).filter((b) => !b.removido);
  if (!beats.length) return json({ erro: 'nao consegui ler a lista de beats do site' }, 502);

  const { results } = await d.prepare(
    `SELECT t.title, t.bpm, t.mkey AS key FROM tracks t
       JOIN artists a ON a.id = t.artist_id
      WHERE t.kind = 'beat' AND t.ready = 1`
  ).all();

  const porTitulo = new Map();
  for (const f of results || []) {
    const k = limpo(f.title);
    if (!porTitulo.has(k)) porTitulo.set(k, []);
    porTitulo.get(k).push(f);
  }

  const faltam = beats
    .filter((b) => !(porTitulo.get(limpo(b.name)) || []).some((f) => mesma(b, f)))
    .map((b) => ({ title: b.name, bpm: b.bpm, key: b.key }));

  // o que a prateleira interna já guardou: entra no plano de novo, senão o done apaga
  const { results: meus } = await d.prepare(
    `SELECT t.id FROM tracks t JOIN artists a ON a.id = t.artist_id WHERE a.tipo = 'vitrine'`
  ).all();

  return json({ faltam, tenho: (meus || []).map((r) => r.id) });
}

async function track(d, env, url, request) {
  if (!env.AUDIO) return json({ erro: 'R2 nao esta ligado (binding AUDIO)' }, 500);

  const id = url.searchParams.get('id');
  const dur = Number(url.searchParams.get('dur') || 0);
  const kbps = Number(url.searchParams.get('kbps') || 0) || null;
  if (!id) return json({ erro: 'faltou id' }, 400);

  const body = await request.arrayBuffer();
  if (!body.byteLength) return json({ erro: 'arquivo vazio' }, 400);

  const usadoBytes = await usado(d);
  if (usadoBytes + body.byteLength > TETO_BYTES) {
    return json({
      erro: 'teto da prateleira atingido',
      usado: usadoBytes, teto: TETO_BYTES
    }, 507);
  }

  prateleira.n += body.byteLength;
  await env.AUDIO.put(`mp3/${id}.mp3`, body, {
    httpMetadata: { contentType: 'audio/mpeg', cacheControl: 'public, max-age=31536000, immutable' }
  });

  await d.prepare(
    'UPDATE tracks SET mp3_bytes = ?, dur = ?, mp3_kbps = ?, ready = 1 WHERE id = ?'
  ).bind(body.byteLength, Math.round(dur), kbps, id).run();

  await d.prepare(
    `UPDATE artists SET job_feitos = job_feitos + 1, job_at = ?
     WHERE id = (SELECT artist_id FROM tracks WHERE id = ?)`
  ).bind(now(), id).run();

  return json({ ok: true, bytes: body.byteLength });
}

// A onda do beat (volume de cada meio segundo, scripts/onda.mjs): o compartilhar usa pra
// achar o trecho mais forte e pra pessoa escolher o pedaço. Fica no R2, não no banco:
// o site lê direto de /audio/<id>.onda sem gastar leitura do D1.
async function onda(env, url, body) {
  if (!env.AUDIO) return json({ erro: 'R2 nao esta ligado (binding AUDIO)' }, 500);
  const id = url.searchParams.get('id') || '';
  if (!/^[A-Za-z0-9_-]{10,80}$/.test(id)) return json({ erro: 'id invalido' }, 400);
  const p = Array.isArray(body && body.p) ? body.p : null;
  if (!p || !p.length || p.length > 4000 || p.some((v) => !Number.isInteger(v) || v < 0 || v > 255)) {
    return json({ erro: 'onda invalida' }, 400);
  }
  const passo = Number(body.passo) > 0 ? Number(body.passo) : 0.5;
  await env.AUDIO.put(`onda/${id}.json`, JSON.stringify({ v: 1, passo, dur: Number(body.dur) || p.length * passo, p }), {
    httpMetadata: { contentType: 'application/json', cacheControl: 'public, max-age=86400' }
  });
  return json({ ok: true, barras: p.length });
}

// Beats prontos que ainda não têm onda (pra primeira carga, sync.mjs --ondas)
async function semonda(d, env) {
  if (!env.AUDIO) return json({ erro: 'R2 nao esta ligado (binding AUDIO)' }, 500);
  const { results } = await d.prepare(`SELECT id FROM tracks WHERE kind = 'beat' AND ready = 1`).all();
  const tem = new Set();
  let cursor;
  do {
    const pag = await env.AUDIO.list({ prefix: 'onda/', cursor, limit: 1000 });
    for (const o of pag.objects) tem.add(o.key.slice(5, -5));
    cursor = pag.truncated ? pag.cursor : undefined;
  } while (cursor);
  return json({ ids: (results || []).map((r) => r.id).filter((id) => !tem.has(id)) });
}

async function done(d, env, url, body) {
  const folderId = url.searchParams.get('folderId');
  const keep = new Set(body.ids || []);
  const artist = await d.prepare('SELECT * FROM artists WHERE folder_id = ?').bind(folderId).first();
  if (!artist) return json({ erro: 'artista nao encontrado' }, 404);

  // a capa saiu da pasta do Drive: some daqui também, e volta o logo da casa
  const capaAgora = body.capa || null;
  if (!capaAgora && artist.cover_key && artist.cover_origem !== 'artista') {
    await env.AUDIO.delete([`capa/${artist.cover_key}.jpg`, `capa/${artist.cover_key}-p.jpg`]).catch(() => {});
    await d.prepare('UPDATE artists SET cover_key = NULL WHERE id = ?').bind(artist.id).run();
  }

  const have = await d.prepare('SELECT id FROM tracks WHERE artist_id = ?').bind(artist.id).all();
  const gone = (have.results || []).map((r) => r.id).filter((id) => !keep.has(id));
  if (gone.length) {
    await d.batch(gone.map((id) => d.prepare('DELETE FROM tracks WHERE id = ?').bind(id)));
  }
  await d.prepare(
    "UPDATE artists SET synced_at = ?, job_estado = 'pronto', job_at = ? WHERE id = ?"
  ).bind(now(), now(), artist.id).run();

  const count = await d.prepare(
    "SELECT kind, COUNT(*) n FROM tracks WHERE artist_id = ? AND ready = 1 GROUP BY kind"
  ).bind(artist.id).all();

  return json({
    ok: true, slug: artist.slug, code: artist.code,
    link: `/${artist.slug}/${artist.code}`,
    removidas: gone.length,
    prontas: count.results || []
  });
}

// A capa do catálogo: a imagem que estiver na pasta do artista.
async function capa(d, env, url, request) {
  const folderId = url.searchParams.get('folderId');
  const chave = url.searchParams.get('chave');
  if (!folderId || !chave) return json({ erro: 'faltou dado' }, 400);

  const artist = await d.prepare(
    'SELECT id, cover_key, cover_origem FROM artists WHERE folder_id = ?'
  ).bind(folderId).first();
  if (!artist) return json({ erro: 'artista nao encontrado' }, 404);

  // o artista trocou a capa pelo site: a imagem do Drive não atropela
  if (artist.cover_origem === 'artista') {
    return json({ ok: true, pulou: 'capa do artista' });
  }

  const body = await request.arrayBuffer();
  if (!body.byteLength) return json({ erro: 'imagem vazia' }, 400);

  // tam=p: a miniatura de 200px da mesma capa. Só guarda, não mexe no banco.
  if (url.searchParams.get('tam') === 'p') {
    await env.AUDIO.put(`capa/${chave}-p.jpg`, body, {
      httpMetadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=31536000, immutable' }
    });
    return json({ ok: true, chave, mini: true });
  }

  await env.AUDIO.put(`capa/${chave}.jpg`, body, {
    httpMetadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=31536000, immutable' }
  });

  if (artist.cover_key && artist.cover_key !== chave) {
    await env.AUDIO.delete([`capa/${artist.cover_key}.jpg`, `capa/${artist.cover_key}-p.jpg`]).catch(() => {});
  }
  await d.prepare(
    "UPDATE artists SET cover_key = ?, cover_origem = 'drive' WHERE id = ?"
  ).bind(chave, artist.id).run();

  return json({ ok: true, chave });
}

// O painel marca o artista como "na fila" assim que manda converter.
async function fila(d, body) {
  if (body.artista) {
    await d.prepare(
      "UPDATE artists SET job_estado = 'na fila', job_total = 0, job_feitos = 0, job_at = ? WHERE name = ?"
    ).bind(now(), String(body.artista)).run();
  } else {
    await d.prepare(
      "UPDATE artists SET job_estado = 'na fila', job_total = 0, job_feitos = 0, job_at = ?"
    ).bind(now()).run();
  }
  return json({ ok: true });
}

// Faxina da prateleira: apaga do R2 o que nenhum catálogo usa mais (faixa que saiu
// do Drive, capa trocada, miniatura órfã). Só olha arquivo com mais de 1 hora, pra
// nunca apagar algo que o conversor acabou de subir e ainda não registrou.
async function faxina(d, env) {
  if (!env.AUDIO) return json({ erro: 'R2 nao esta ligado (binding AUDIO)' }, 500);
  const ids = ((await d.prepare('SELECT id FROM tracks').all()).results || []).map((r) => r.id);
  const faixas = new Set(ids.map((id) => 'mp3/' + id + '.mp3'));
  const ondas = new Set(ids.map((id) => 'onda/' + id + '.json'));
  const capas = new Set();
  for (const r of (await d.prepare('SELECT cover_key FROM artists WHERE cover_key IS NOT NULL').all()).results || []) {
    capas.add('capa/' + r.cover_key + '.jpg');
    capas.add('capa/' + r.cover_key + '-p.jpg');
  }
  const limite = Date.now() - 3600e3;
  const apagar = [];
  let vistos = 0, bytes = 0;
  for (const prefixo of ['mp3/', 'capa/', 'onda/']) {
    let cursor;
    do {
      const pag = await env.AUDIO.list({ prefix: prefixo, cursor, limit: 1000 });
      for (const o of pag.objects) {
        vistos++;
        const usado = prefixo === 'mp3/' ? faixas.has(o.key) : prefixo === 'onda/' ? ondas.has(o.key) : capas.has(o.key);
        const velho = !o.uploaded || new Date(o.uploaded).getTime() < limite;
        if (!usado && velho) { apagar.push(o.key); bytes += o.size || 0; }
      }
      cursor = pag.truncated ? pag.cursor : undefined;
    } while (cursor);
  }
  for (let i = 0; i < apagar.length; i += 1000) await env.AUDIO.delete(apagar.slice(i, i + 1000));
  return json({ ok: true, vistos, apagados: apagar.length, liberados: bytes });
}
