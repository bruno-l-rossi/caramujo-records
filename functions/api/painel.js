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
  if (op === 'funil') return funil(d, request, env, url.searchParams.get('dias'));
  if (op === 'analytics') return analytics(d, request, env, url.searchParams);
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
            a.job_estado, a.job_total, a.job_feitos, a.job_at, a.cover_origem, a.cover_key, a.descricao,
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

// Funil de venda do site: quantas visitas chegaram em cada etapa no período.
// Cada linha da tabela já é "uma sessão numa etapa", então contar linha é contar gente.
const ETAPAS_FUNIL = ['visita', 'play', 'carrinho', 'checkout', 'pagamento', 'pago'];

async function funil(d, request, env, diasTxt) {
  const dias = [7, 30, 90].includes(Number(diasTxt)) ? Number(diasTxt) : 7;
  const hojeSP = new Date(Date.now() - 3 * 3600e3);
  const desde = new Date(hojeSP.getTime() - (dias - 1) * 86400e3).toISOString().slice(0, 10);

  const porEtapa = await d.prepare(
    'SELECT etapa, aparelho, COUNT(*) n FROM funil WHERE dia >= ? GROUP BY etapa, aparelho'
  ).bind(desde).all();
  const etapas = ETAPAS_FUNIL.map((e) => ({ etapa: e, total: 0, celular: 0, computador: 0 }));
  for (const r of porEtapa.results || []) {
    const e = etapas.find((x) => x.etapa === r.etapa);
    if (!e) continue;
    e.total += r.n;
    if (r.aparelho === 'celular') e.celular += r.n; else e.computador += r.n;
  }

  // de onde vieram as visitas, e quantas dessas visitas pagaram
  const origens = await d.prepare(
    `SELECT v.origem, COUNT(*) visitas,
            SUM(CASE WHEN p.sessao IS NOT NULL THEN 1 ELSE 0 END) pagos
       FROM funil v LEFT JOIN funil p ON p.sessao = v.sessao AND p.etapa = 'pago'
      WHERE v.etapa = 'visita' AND v.dia >= ?
      GROUP BY v.origem ORDER BY visitas DESC LIMIT 8`
  ).bind(desde).all();

  // beat que abriu a escuta e beat que abriu o carrinho (o primeiro de cada visita)
  const top = async (etapa) => (await d.prepare(
    `SELECT beat_id, COUNT(*) n FROM funil WHERE etapa = ? AND dia >= ? AND beat_id IS NOT NULL
      GROUP BY beat_id ORDER BY n DESC LIMIT 5`
  ).bind(etapa, desde).all()).results || [];
  const [tocados, carrinhos] = await Promise.all([top('play'), top('carrinho')]);
  const nomes = new Map((await vitrine(request, env)).map((b) => [b.id, b.name]));
  const nomear = (l) => l.map((r) => ({ nome: nomes.get(r.beat_id) || ('beat ' + r.beat_id), n: r.n }));

  const porDia = await d.prepare(
    `SELECT dia, SUM(CASE WHEN etapa='visita' THEN 1 ELSE 0 END) visitas,
            SUM(CASE WHEN etapa='pago' THEN 1 ELSE 0 END) pagos
       FROM funil WHERE dia >= ? GROUP BY dia ORDER BY dia`
  ).bind(desde).all();

  return json({
    dias, desde, etapas,
    origens: origens.results || [],
    tocados: nomear(tocados), carrinhos: nomear(carrinhos),
    porDia: porDia.results || []
  });
}

/* ---------- analytics: vitrine, beat tapes e artistas ---------- */
// Período em dias de São Paulo (AAAA-MM-DD). events.at é UTC; funil.dia já é SP.
// O mesmo tamanho de período, logo antes, vira a comparação dos números do topo.

const DIA_MS = 864e5;
const hojeSP = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
const somaDias = (dia, n) => new Date(Date.parse(dia + 'T00:00:00Z') + n * DIA_MS).toISOString().slice(0, 10);
const inicioUTC = (dia) => dia + 'T03:00:00.000Z';            // 00h em SP
const DIA_SP = "substr(datetime(e.at, '-3 hours'), 1, 10)";

function periodo(params) {
  const ok = (x) => /^\d{4}-\d{2}-\d{2}$/.test(x || '') && !isNaN(Date.parse(x + 'T00:00:00Z'));
  let ate = ok(params.get('ate')) ? params.get('ate') : hojeSP();
  let de = ok(params.get('de')) ? params.get('de') : somaDias(ate, -29);
  if (de > ate) [de, ate] = [ate, de];
  if ((Date.parse(ate) - Date.parse(de)) / DIA_MS > 400) de = somaDias(ate, -400);
  const n = Math.round((Date.parse(ate) - Date.parse(de)) / DIA_MS) + 1;
  const dias = Array.from({ length: n }, (_, i) => somaDias(de, i));
  return { de, ate, dias, antesDe: somaDias(de, -n), antesAte: somaDias(de, -1) };
}

// linhas {dia, chave, n} viram {chave: [n por dia]} com zero onde não teve nada
function series(dias, linhas, chaves) {
  const pos = new Map(dias.map((d, i) => [d, i]));
  const out = {};
  for (const c of chaves) out[c] = dias.map(() => 0);
  for (const r of linhas) {
    const i = pos.get(r.dia);
    if (i === undefined || !out[r.chave]) continue;
    out[r.chave][i] += r.n;
  }
  return out;
}

async function analytics(d, request, env, params) {
  const p = periodo(params);
  const aba = params.get('aba');
  if (aba === 'tapes') return json({ ...p, aba, ...(await abaCatalogos(d, p, 'tape')) });
  if (aba === 'artistas') return json({ ...p, aba, ...(await abaCatalogos(d, p, 'artista')) });
  return json({ ...p, aba: 'vitrine', ...(await abaVitrine(d, request, env, p)) });
}

async function abaVitrine(d, request, env, p) {
  const tot = async (de, ate) => {
    const { results } = await d.prepare(
      'SELECT etapa, aparelho, COUNT(*) n FROM funil WHERE dia BETWEEN ? AND ? GROUP BY etapa, aparelho'
    ).bind(de, ate).all();
    const o = {};
    for (const e of ETAPAS_FUNIL) o[e] = { total: 0, celular: 0, computador: 0 };
    for (const r of results || []) {
      if (!o[r.etapa]) continue;
      o[r.etapa].total += r.n;
      o[r.etapa][r.aparelho === 'celular' ? 'celular' : 'computador'] += r.n;
    }
    return o;
  };
  const [agora, antes] = await Promise.all([tot(p.de, p.ate), tot(p.antesDe, p.antesAte)]);

  const porDia = (await d.prepare(
    'SELECT dia, etapa AS chave, COUNT(*) n FROM funil WHERE dia BETWEEN ? AND ? GROUP BY dia, etapa'
  ).bind(p.de, p.ate).all()).results || [];

  const origens = (await d.prepare(
    `SELECT v.origem, COUNT(*) visitas,
            SUM(CASE WHEN c.sessao IS NOT NULL THEN 1 ELSE 0 END) carrinho,
            SUM(CASE WHEN g.sessao IS NOT NULL THEN 1 ELSE 0 END) pagos
       FROM funil v
       LEFT JOIN funil c ON c.sessao = v.sessao AND c.etapa = 'carrinho'
       LEFT JOIN funil g ON g.sessao = v.sessao AND g.etapa = 'pago'
      WHERE v.etapa = 'visita' AND v.dia BETWEEN ? AND ?
      GROUP BY v.origem ORDER BY visitas DESC LIMIT 12`
  ).bind(p.de, p.ate).all()).results || [];

  // cada beat da vitrine com quantas visitas tocaram e quantas puseram no carrinho
  // (inclusive os zerados: a busca do painel acha qualquer um)
  const conta = async (tipo) => new Map(((await d.prepare(
    'SELECT beat_id, COUNT(*) n FROM beat_evento WHERE tipo = ? AND dia BETWEEN ? AND ? GROUP BY beat_id'
  ).bind(tipo, p.de, p.ate).all()).results || []).map((r) => [r.beat_id, r.n]));
  const [toques, adicoes] = await Promise.all([conta('toque'), conta('adicao')]);
  const beats = await vitrine(request, env);
  const lista = (m) => beats.map((b) => ({ nome: b.name, vendido: b.sold ? 1 : 0, n: m.get(b.id) || 0 }))
    .sort((a, b) => b.n - a.n || a.nome.localeCompare(b.nome, 'pt-BR'));

  // origem tape-<slug> ganha o nome da tape
  const nomesTape = new Map(((await d.prepare("SELECT slug, name FROM artists WHERE tipo = 'tape'").all()).results || [])
    .map((r) => ['tape-' + r.slug, r.name]));
  for (const o of origens) if (nomesTape.has(o.origem)) o.nome = nomesTape.get(o.origem);

  return {
    etapas: ETAPAS_FUNIL, agora, antes,
    serie: series(p.dias, porDia, ETAPAS_FUNIL),
    origens, tocados: lista(toques), carrinhos: lista(adicoes)
  };
}

// Beat tapes e artistas moram na mesma tabela (artists.tipo) e contam os mesmos
// eventos: open (abriu o link), play (ouviu uma faixa), download-*, carrinho (só tape).
async function abaCatalogos(d, p, tipo) {
  const ini = inicioUTC(p.de), fim = inicioUTC(somaDias(p.ate, 1));
  const iniA = inicioUTC(p.antesDe), fimA = ini;
  const KINDS = tipo === 'tape' ? ['open', 'play', 'carrinho'] : ['open', 'play', 'download'];
  const chaveKind = "CASE WHEN e.kind LIKE 'download%' THEN 'download' ELSE e.kind END";

  const tot = async (a, b) => {
    const r = await d.prepare(
      `SELECT
         SUM(CASE WHEN e.kind='open' THEN 1 ELSE 0 END) open,
         SUM(CASE WHEN e.kind='play' THEN 1 ELSE 0 END) play,
         SUM(CASE WHEN e.kind LIKE 'download%' THEN 1 ELSE 0 END) download,
         SUM(CASE WHEN e.kind='carrinho' THEN 1 ELSE 0 END) carrinho,
         COUNT(DISTINCT CASE WHEN e.kind='open' THEN e.who END) pessoas,
         COUNT(DISTINCT CASE WHEN e.kind='play' THEN e.who END) ouviram,
         COUNT(DISTINCT CASE WHEN e.kind='carrinho' THEN e.who END) clicaram,
         COUNT(DISTINCT CASE WHEN e.kind='open' THEN e.artist_id END) ativos
         FROM events e JOIN artists a ON a.id = e.artist_id
        WHERE a.tipo = ? AND e.at >= ? AND e.at < ?`
    ).bind(tipo, a, b).first();
    const o = {};
    for (const k of Object.keys(r || {})) o[k] = Number(r[k] || 0);
    return o;
  };
  const [agora, antes] = await Promise.all([tot(ini, fim), tot(iniA, fimA)]);

  const porDia = (await d.prepare(
    `SELECT ${DIA_SP} dia, ${chaveKind} chave, COUNT(*) n
       FROM events e JOIN artists a ON a.id = e.artist_id
      WHERE a.tipo = ? AND e.at >= ? AND e.at < ?
      GROUP BY dia, chave`
  ).bind(tipo, ini, fim).all()).results || [];

  // todos os catálogos do tipo, inclusive os que não tiveram nada no período
  const lista = (await d.prepare(
    `SELECT a.id, a.name, a.slug,
            COALESCE(SUM(CASE WHEN e.kind='open' THEN 1 ELSE 0 END), 0) open,
            COUNT(DISTINCT CASE WHEN e.kind='open' THEN e.who END) pessoas,
            COALESCE(SUM(CASE WHEN e.kind='play' THEN 1 ELSE 0 END), 0) play,
            COALESCE(SUM(CASE WHEN e.kind LIKE 'download%' THEN 1 ELSE 0 END), 0) download,
            COALESCE(SUM(CASE WHEN e.kind='carrinho' THEN 1 ELSE 0 END), 0) carrinho,
            MAX(e.at) ultima
       FROM artists a LEFT JOIN events e ON e.artist_id = a.id AND e.at >= ? AND e.at < ?
      WHERE a.tipo = ?
      GROUP BY a.id ORDER BY open DESC, play DESC, a.name COLLATE NOCASE`
  ).bind(ini, fim, tipo).all()).results || [];

  // todas as faixas prontas (beats nas tapes; beats e músicas nos artistas) com os plays do período
  const faixas = (await d.prepare(
    `SELECT t.id, t.title, t.kind, a.name AS onde, COUNT(e.id) n
       FROM tracks t JOIN artists a ON a.id = t.artist_id
       LEFT JOIN events e ON e.track_id = t.id AND e.artist_id = a.id AND e.kind = 'play' AND e.at >= ? AND e.at < ?
      WHERE a.tipo = ? AND t.ready = 1 ${tipo === 'tape' ? "AND t.kind = 'beat'" : ''}
      GROUP BY t.id ORDER BY n DESC, t.title COLLATE NOCASE LIMIT 5000`
  ).bind(ini, fim, tipo).all()).results || [];

  // pessoas diferentes por dia (quem abriu o link)
  const pessoasDia = (await d.prepare(
    `SELECT ${DIA_SP} dia, 'pessoas' chave, COUNT(DISTINCT e.who) n
       FROM events e JOIN artists a ON a.id = e.artist_id
      WHERE a.tipo = ? AND e.kind = 'open' AND e.at >= ? AND e.at < ?
      GROUP BY dia`
  ).bind(tipo, ini, fim).all()).results || [];
  const serie = series(p.dias, porDia.concat(pessoasDia), KINDS.concat(['pessoas', 'vitrine']));

  const out = { kinds: KINDS, agora, antes, serie, lista, faixas };

  // o caminho da tape até a venda: quem saiu da tape pelo botão de carrinho e
  // chegou na vitrine (origem tape-<slug> no funil), e quanto disso pagou
  if (tipo === 'tape') {
    const vit = (await d.prepare(
      `SELECT v.origem, COUNT(*) visitas,
              SUM(CASE WHEN c.sessao IS NOT NULL THEN 1 ELSE 0 END) carrinho,
              SUM(CASE WHEN g.sessao IS NOT NULL THEN 1 ELSE 0 END) pagos
         FROM funil v
         LEFT JOIN funil c ON c.sessao = v.sessao AND c.etapa = 'carrinho'
         LEFT JOIN funil g ON g.sessao = v.sessao AND g.etapa = 'pago'
        WHERE v.etapa = 'visita' AND v.dia BETWEEN ? AND ? AND (v.origem LIKE 'tape-%' OR v.origem = 'beat-tape')
        GROUP BY v.origem`
    ).bind(p.de, p.ate).all()).results || [];
    const porSlug = new Map(vit.map((r) => [r.origem.replace(/^tape-/, ''), r]));
    const vitDia = (await d.prepare(
      `SELECT dia, 'vitrine' chave, COUNT(*) n FROM funil
        WHERE etapa = 'visita' AND dia BETWEEN ? AND ? AND (origem LIKE 'tape-%' OR origem = 'beat-tape')
        GROUP BY dia`
    ).bind(p.de, p.ate).all()).results || [];
    out.serie.vitrine = series(p.dias, vitDia, ['vitrine']).vitrine;
    for (const t of lista) {
      const v = porSlug.get(t.slug);
      t.vitrine = v ? v.visitas : 0;
      t.pagos = v ? v.pagos : 0;
    }
    out.vitrine = vit.reduce((o, r) => ({ visitas: o.visitas + r.visitas, carrinho: o.carrinho + r.carrinho, pagos: o.pagos + r.pagos }),
      { visitas: 0, carrinho: 0, pagos: 0 });
  }
  return out;
}
