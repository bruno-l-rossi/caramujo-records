// As ações do painel: lista de artistas, permissão por pasta,
// atividade e o disparo da conversão. Tudo atrás do mesmo cookie do painel.

import { db, json } from '../_lib/db.js';
import { autenticado } from '../_lib/sessao.js';
import { mesma, mesmoTom, limpo } from '../_lib/casar.js';
import { vitrine, indexar, achar } from '../_lib/vitrine.js';

const TETO_BYTES = 8 * 1024 * 1024 * 1024;

export async function onRequest({ request, env }) {
  if (!(await autenticado(request, env))) return json({ erro: 'entra no painel primeiro' }, 401);

  const url = new URL(request.url);
  const op = url.searchParams.get('op');
  const d = await db(env);

  // Tudo que só lê responde em GET. 'revisar' ficou abaixo desta trava e o painel
  // pedia por GET: voltava 400, a lista chegava vazia e o painel desenhava
  // "nada pra revisar" com beat sem pastilha no catálogo.
  if (op === 'artistas') return artistas(d);
  if (op === 'eventos') return eventos(d, url.searchParams.get('id'), url.searchParams.get('p'));
  if (op === 'revisar') return revisar(d);
  if (op === 'vitrine') return relatorio(d, request, env);
  if (request.method !== 'POST') return json({ erro: 'op desconhecida' }, 400);

  const body = await request.json().catch(() => ({}));
  if (op === 'perm') return perm(d, body);
  if (op === 'descricao') return descricao(d, body);
  if (op === 'venda') return venda(d, body);
  if (op === 'sync') return sync(env, d, body);
  return json({ erro: 'op desconhecida' }, 400);
}

async function artistas(d) {
  const { results } = await d.prepare(
    `SELECT a.id, a.slug, a.name, a.code, a.tipo, a.dl_beats, a.dl_sons, a.synced_at,
            a.job_estado, a.job_total, a.job_feitos, a.job_at, a.cover_origem, a.descricao,
            (SELECT MAX(t.src_modified) FROM tracks t WHERE t.artist_id = a.id) AS modificado,
            (SELECT COUNT(*) FROM tracks t WHERE t.artist_id = a.id AND t.ready = 1 AND t.kind = 'beat') AS nb,
            (SELECT COUNT(*) FROM tracks t WHERE t.artist_id = a.id AND t.ready = 1 AND t.kind = 'son') AS ns,
            (SELECT MAX(at) FROM events e WHERE e.artist_id = a.id) AS visto
     FROM artists a ORDER BY a.name COLLATE NOCASE`
  ).all();

  const soma = await d.prepare(
    'SELECT COALESCE(SUM(mp3_bytes), 0) AS n FROM tracks WHERE ready = 1'
  ).first();

  return json({
    artistas: results || [],
    prateleira: { usado: Number(soma?.n || 0), teto: TETO_BYTES }
  });
}

async function eventos(d, id, pagina) {
  const artistId = Number(id);
  if (!artistId) return json({ erro: 'sem artista' }, 400);

  const POR_PAGINA = 10;
  const p = Math.max(0, Number(pagina) || 0);

  // mês e ano contados no horário de São Paulo
  const sp = new Date(Date.now() - 3 * 3600e3);
  const inicioMes = new Date(Date.UTC(sp.getUTCFullYear(), sp.getUTCMonth(), 1) + 3 * 3600e3).toISOString();
  const inicioAno = new Date(Date.UTC(sp.getUTCFullYear(), 0, 1) + 3 * 3600e3).toISOString();

  const resumo = await d.prepare(
    `SELECT MAX(at) AS ultima,
            SUM(CASE WHEN kind = 'open' AND at >= ? THEN 1 ELSE 0 END) AS mes,
            SUM(CASE WHEN kind = 'open' AND at >= ? THEN 1 ELSE 0 END) AS ano,
            COUNT(*) AS total
     FROM events WHERE artist_id = ?`
  ).bind(inicioMes, inicioAno, artistId).first();

  const { results } = await d.prepare(
    `SELECT e.kind, e.at, t.title AS titulo
     FROM events e LEFT JOIN tracks t ON t.id = e.track_id
     WHERE e.artist_id = ? ORDER BY e.at DESC LIMIT ? OFFSET ?`
  ).bind(artistId, POR_PAGINA, p * POR_PAGINA).all();

  const total = Number(resumo?.total || 0);
  return json({
    eventos: results || [],
    resumo: {
      ultima: resumo?.ultima || null,
      mes: Number(resumo?.mes || 0),
      ano: Number(resumo?.ano || 0)
    },
    pagina: p,
    paginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
    total
  });
}

async function perm(d, body) {
  const id = Number(body.id);
  const campo = body.campo === 'beats' ? 'dl_beats' : body.campo === 'sons' ? 'dl_sons' : null;
  if (!id || !campo) return json({ erro: 'pedido incompleto' }, 400);
  await d.prepare(`UPDATE artists SET ${campo} = ? WHERE id = ?`).bind(body.valor ? 1 : 0, id).run();
  return json({ ok: true });
}

// Beat de tape sem pastilha: caiu nos dois critérios, em nenhum, ou nem chegou a
// passar pelo cruzamento. A conta é a MESMA do catálogo (tag vazia = pendente),
// então a lista e a página não têm como discordar.
async function revisar(d) {
  const { results } = await d.prepare(
    `SELECT t.id, t.title, t.bpm, t.mkey,
            COALESCE(t.revisar, 'Esse beat ainda não passou pelo cruzamento') AS revisar,
            a.id AS tape_id, a.name AS tape
       FROM tracks t JOIN artists a ON a.id = t.artist_id
      WHERE a.tipo = 'tape' AND t.kind = 'beat'
        AND t.tag IS NULL AND t.venda_manual IS NULL
      ORDER BY a.name COLLATE NOCASE, t.title COLLATE NOCASE`
  ).all();
  return json({ faixas: results || [] });
}

// Os beats à venda no site x o que já está convertido no R2. Diz o que não casou
// dos dois lados: beat do site sem áudio guardado, e beat disponível numa tape que
// não existe na vitrine (esse não ganha botão de carrinho).
async function relatorio(d, request, env) {
  const beats = await vitrine(request, env);
  if (!beats.length) return json({ erro: 'não consegui ler a lista de beats do site' }, 502);

  const { results } = await d.prepare(
    `SELECT t.title, t.bpm, t.mkey AS key, t.ready, a.name AS onde
       FROM tracks t JOIN artists a ON a.id = t.artist_id
      WHERE t.kind = 'beat'`
  ).all();

  // índice por título limpo: 134 beats contra ~800 faixas sem varrer tudo toda vez
  const porTitulo = new Map();
  for (const f of results || []) {
    const k = limpo(f.title);
    if (!porTitulo.has(k)) porTitulo.set(k, []);
    porTitulo.get(k).push(f);
  }

  // Exclusivos não vira catálogo, então não tem MP3. A lista serve pra explicar.
  const guardado = await d.prepare("SELECT valor FROM meta WHERE chave = 'exclusivos'").first();
  let exclusivos = [];
  try { exclusivos = JSON.parse(guardado?.valor || '{}').beats || []; } catch { exclusivos = []; }

  const ficha = (x) => [x.key, x.bpm ? x.bpm + 'bpm' : ''].filter(Boolean).join(' ') || 'sem bpm nem tom';

  // Não achou é pouco: o relatório diz POR QUÊ, que é o que vira conserto no Drive.
  const semAudio = [];
  for (const b of beats) {
    const candidatos = porTitulo.get(limpo(b.name)) || [];
    if (candidatos.some((f) => f.ready === 1 && mesma(b, f))) continue;

    const faltaConverter = candidatos.find((f) => mesma(b, f));
    const soONome = candidatos[0] || null;
    // o nome já foi comparado sem caixa e sem acento: se chegou aqui, ele BATE.
    // o que não fecha é BPM ou tom, e é isso que precisa estar escrito.
    const difBpm = soONome && b.bpm && soONome.bpm && Math.abs(Number(b.bpm) - Number(soONome.bpm)) > 1;
    const difTom = soONome && !mesmoTom(b.key, soONome.key);
    const motivo = faltaConverter
      ? 'Está em ' + faltaConverter.onde + ', mas ainda não foi convertido. Roda a conversão.'
      : soONome
        ? 'O nome bate (caixa e acento não contam). Não fecha ' +
          (difBpm && difTom ? 'o BPM nem o tom' : difBpm ? 'o BPM' : difTom ? 'o tom' : 'o BPM/tom') +
          ': o site diz ' + ficha(b) + ' e o Drive diz ' + ficha(soONome) + ', em ' + soONome.onde + '.'
        : exclusivos.some((e) => mesma(b, e))
          ? 'Está só em Exclusivos, que não vira catálogo e por isso não tem MP3 guardado.'
          : 'Não achei esse nome em nenhuma pasta convertida.';

    semAudio.push({ name: b.name, bpm: b.bpm, key: b.key, sold: b.sold ? 1 : 0, motivo });
  }

  // Beat disponível numa tape que ainda não está à venda no site. Não é erro, é fila:
  // é o que falta postar. Tape de graça fica fora (não tem carrinho por definição) e
  // beat vendido no site também (a pastilha dele já vira vendido sozinha).
  const mapa = indexar(beats);
  const { results: disp } = await d.prepare(
    `SELECT t.title, t.bpm, t.mkey AS key, a.name AS tape FROM tracks t
       JOIN artists a ON a.id = t.artist_id
      WHERE a.tipo = 'tape' AND a.dl_beats = 0 AND t.kind = 'beat' AND t.tag = 'disponivel'`
  ).all();

  const semBotao = [];
  for (const t of disp || []) {
    if (achar(mapa, t)) continue;
    semBotao.push({ title: t.title, tape: t.tape, bpm: t.bpm, key: t.key });
  }

  return json({
    total: beats.length,
    aVenda: beats.filter((b) => !b.sold).length,
    comAudio: beats.length - semAudio.length,
    semAudio,
    semBotao
  });
}

// Marca na mão o que o cruzamento não resolveu. Vence a pasta e não volta atrás.
async function venda(d, body) {
  const valor = body.valor === 'disponivel' || body.valor === 'vendido' ? body.valor : null;
  if (!valor) return json({ erro: 'valor invalido' }, 400);   // pedido torto não apaga pastilha
  const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean).slice(0, 200) : [];
  const tapeId = Number(body.tapeId) || 0;

  if (!ids.length && !tapeId) return json({ erro: 'sem faixa' }, 400);

  if (tapeId) {
    // a tape inteira, só o que ainda está sem resposta (mesma conta da lista)
    await d.prepare(
      `UPDATE tracks SET venda_manual = ?, tag = ?, revisar = NULL
        WHERE artist_id = ? AND kind = 'beat' AND tag IS NULL AND venda_manual IS NULL`
    ).bind(valor, valor, tapeId).run();
  } else {
    const vagas = ids.map(() => '?').join(', ');
    await d.prepare(
      `UPDATE tracks SET venda_manual = ?, tag = ?, revisar = NULL WHERE id IN (${vagas})`
    ).bind(valor, valor, ...ids).run();
  }
  return json({ ok: true });
}

async function descricao(d, body) {
  const id = Number(body.id);
  if (!id) return json({ erro: 'sem artista' }, 400);
  const texto = String(body.texto || '')
    .replace(/\r\n?/g, '\n')      // Windows e Mac velho escrevem a quebra de outro jeito
    .replace(/[ \t]+$/gm, '')      // espaço sobrando no fim da linha
    .replace(/\n{3,}/g, '\n\n')    // no máximo uma linha em branco entre parágrafos
    .slice(0, 280)
    .trim();
  await d.prepare('UPDATE artists SET descricao = ? WHERE id = ?')
    .bind(texto || null, id).run();
  return json({ ok: true, texto: texto || null });
}

async function sync(env, d, body) {
  if (!env.GITHUB_TOKEN) return json({ erro: 'falta a chave do GitHub' }, 500);

  const r = await fetch(
    'https://api.github.com/repos/bruno-l-rossi/caramujo-records/actions/workflows/catalogo.yml/dispatches',
    {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + env.GITHUB_TOKEN,
        accept: 'application/vnd.github+json',
        'user-agent': 'caramujo-painel',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ ref: 'main', inputs: { artistas: String(body.artista || '') } })
    }
  );

  if (r.status === 204) {
    const marca = new Date().toISOString();
    if (body.artista) {
      await d.prepare(
        "UPDATE artists SET job_estado = 'na fila', job_total = 0, job_feitos = 0, job_at = ? WHERE name = ?"
      ).bind(marca, String(body.artista)).run();
    } else {
      await d.prepare(
        "UPDATE artists SET job_estado = 'na fila', job_total = 0, job_feitos = 0, job_at = ?"
      ).bind(marca).run();
    }
    return json({ ok: true });
  }
  if (r.status === 403 || r.status === 404) {
    return json({ erro: 'a chave do GitHub precisa de permissão em Actions' }, 403);
  }
  return json({ erro: 'GitHub respondeu ' + r.status }, 502);
}
