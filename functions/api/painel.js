// As ações do painel: lista de artistas, permissão por pasta,
// atividade e o disparo da conversão. Tudo atrás do mesmo cookie do painel.

import { db, json, TETO_LEITURA } from '../_lib/db.js';
import { autenticado } from '../_lib/sessao.js';
import { mesma, mesmoTom, limpo } from '../_lib/casar.js';
import { vitrine, indexar, achar, esquecerVitrine } from '../_lib/vitrine.js';
import { lerBeats, lerDestaque, lerEstatico, esquecerLoja } from '../_lib/loja.js';
import { slug } from '../_lib/casar.js';
import { tomDeCopia, ehBeatNovo } from '../_lib/tom.js';
import { esquecerApiVitrine } from './vitrine.js';
import { esquecerPerfil } from '../_lib/perfil.js';

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
  if (op === 'andamento') return andamento(d);
  if (op === 'consumo') return consumo(d);
  if (op === 'eventos') return eventos(d, url.searchParams.get('id'), url.searchParams.get('p'));
  if (op === 'revisar') return revisar(d);
  if (op === 'vitrine') return relatorio(d, request, env);
  if (op === 'funil') return funil(d, request, env, url.searchParams.get('dias'));
  if (op === 'analytics') return analytics(d, request, env, url.searchParams);
  if (op === 'loja') return loja(d, request, env);
  if (op === 'cupom-usos') return cupomUsos(d, url.searchParams.get('codigo'));
  if (request.method !== 'POST') return json({ erro: 'op desconhecida' }, 400);

  const body = await request.json().catch(() => ({}));
  if (op === 'perm') return perm(d, body);
  if (op === 'descricao') return descricao(d, body);
  if (op === 'perfil') { const r = await perfilMostrar(d, body); await esquecerPerfil(request); return r; }
  if (op === 'perfil-topo') { const r = await perfilTopo(d, body); await esquecerPerfil(request); return r; }
  if (op === 'venda') return venda(d, body);
  if (op === 'sync') return sync(env, d, body);
  if (LOJA_POST[op]) {
    const r = await LOJA_POST[op](d, body, request, env);
    await esquecerLoja(request); esquecerVitrine(); await esquecerApiVitrine(request);
    return r;
  }
  return json({ erro: 'op desconhecida' }, 400);
}

// Uma passada só em tracks (agrupada por catálogo) no lugar de 3 subconsultas por
// artista. Antes lia ~4x a tabela inteira a cada abertura (24/09/2026).
async function artistas(d) {
  const { results } = await d.prepare(
    `SELECT a.id, a.slug, a.name, a.code, a.tipo, a.dl_beats, a.dl_sons, a.synced_at,
            a.job_estado, a.job_total, a.job_feitos, a.job_at, a.cover_origem, a.cover_key, a.descricao,
            a.perfil, a.perfil_ordem,
            c.modificado, COALESCE(c.nb, 0) AS nb, COALESCE(c.ns, 0) AS ns, COALESCE(c.bytes, 0) AS bytes,
            (SELECT MAX(at) FROM events e WHERE e.artist_id = a.id) AS visto
       FROM artists a
       LEFT JOIN (
         SELECT artist_id, MAX(src_modified) AS modificado,
                SUM(CASE WHEN ready = 1 AND kind = 'beat' THEN 1 ELSE 0 END) AS nb,
                SUM(CASE WHEN ready = 1 AND kind = 'son' THEN 1 ELSE 0 END) AS ns,
                SUM(CASE WHEN ready = 1 THEN COALESCE(mp3_bytes, 0) ELSE 0 END) AS bytes
           FROM tracks GROUP BY artist_id
       ) c ON c.artist_id = a.id
      ORDER BY a.name COLLATE NOCASE`
  ).all();
  const lista = results || [];
  const usado = lista.reduce((n, a) => n + Number(a.bytes || 0), 0);
  for (const a of lista) delete a.bytes;
  return json({ artistas: lista, prateleira: { usado, teto: TETO_BYTES } });
}

// O que o painel consulta enquanto tem conversão rodando: só o andamento, sem
// faixa nenhuma. ~100 linhas lidas (antes eram milhares a cada 3 segundos).
async function andamento(d) {
  const { results } = await d.prepare(
    `SELECT id, name, tipo, job_estado, job_total, job_feitos, job_at FROM artists
      WHERE job_estado IN ('na fila', 'convertendo')`
  ).all();
  const tapes = await d.prepare("SELECT COUNT(*) AS n, MAX(synced_at) AS ultima FROM artists WHERE tipo = 'tape'").first();
  return json({ rodando: results || [], tapes: Number(tapes?.n || 0), tapeAt: tapes?.ultima || null });
}

// Linhas lidas no banco hoje (dia UTC, o mesmo do limite) e ontem, e o que mais leu.
async function consumo(d) {
  const hoje = new Date().toISOString().slice(0, 10);
  const ontem = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const { results } = await d.prepare(
    "SELECT dia, rotulo, linhas, chamadas FROM consumo WHERE dia IN (?, ?) ORDER BY linhas DESC"
  ).bind(hoje, ontem).all();
  const linhas = results || [];
  const total = (dia) => Number((linhas.find((r) => r.dia === dia && r.rotulo === '*') || {}).linhas || 0);
  return json({
    hoje: total(hoje), ontem: total(ontem), teto: TETO_LEITURA,
    top: linhas.filter((r) => r.dia === hoje && r.rotulo !== '*').slice(0, 10)
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
    if (b.removido) continue;               // fora do site: áudio não importa
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

  // A FILA: beat disponível numa tape paga que ainda não está à venda no site.
  // Não é erro, é o que falta postar. Tape de graça fica fora (não tem carrinho) e
  // beat vendido no site também (a pastilha dele já vira vendido sozinha).
  // Tom/BPM que faltam no nome do arquivo vêm de outra cópia do mesmo beat.
  const copias = (results || []).map((f) => ({ title: f.title, bpm: f.bpm, key: f.key, onde: f.onde }))
    .concat(exclusivos.map((e) => ({ title: e.title, bpm: e.bpm, key: e.key, onde: 'Exclusivos' })));
  const mapa = indexar(beats);
  const { results: disp } = await d.prepare(
    `SELECT t.id, t.title, t.bpm, t.mkey AS key, t.src_modified, a.id AS tape_id, a.name AS tape FROM tracks t
       JOIN artists a ON a.id = t.artist_id
      WHERE a.tipo = 'tape' AND a.dl_beats = 0 AND t.kind = 'beat' AND t.tag = 'disponivel'
      ORDER BY t.src_modified DESC`
  ).all();

  const semBotao = [];
  const vistos = new Set();
  for (const t of disp || []) {
    if (achar(mapa, t)) continue;
    // o mesmo beat em duas tapes vira UM item na fila (publicar um resolve os dois)
    const k = limpo(t.title) + '|' + (t.bpm || '') + '|' + (t.key || '');
    if (vistos.has(k)) continue;
    vistos.add(k);
    const achado = tomDeCopia(t, copias);
    semBotao.push({
      id: t.id, title: t.title, tape: t.tape, tape_id: t.tape_id, at: t.src_modified,
      bpm: achado.bpm, key: achado.key,
      ...(achado.keyOnde ? { keyOnde: achado.keyOnde } : {}),
      ...(achado.bpmOnde ? { bpmOnde: achado.bpmOnde } : {}),
      ...(achado.confere ? { confere: true } : {})
    });
  }

  // Beat de tape paga ainda sem pastilha. "Beat novo" (não aparece em pasta de
  // artista nenhuma) a Fila marca em lote; o resto pede olho em Beat tapes.
  const { results: pend } = await d.prepare(
    `SELECT t.id, t.title, t.revisar, t.src_modified, a.id AS tape_id, a.name AS tape FROM tracks t
       JOIN artists a ON a.id = t.artist_id
      WHERE a.tipo = 'tape' AND a.dl_beats = 0 AND t.kind = 'beat'
        AND t.tag IS NULL AND t.venda_manual IS NULL`
  ).all();

  // tudo agrupado por tape, a mais nova primeiro
  const porTape = new Map();
  const tapeDe = (id, nome, at) => {
    if (!porTape.has(id)) porTape.set(id, { tape_id: id, tape: nome, at: at || '', itens: [], novos: [], outros: 0 });
    const g = porTape.get(id);
    if ((at || '') > g.at) g.at = at;
    return g;
  };
  for (const t of semBotao) tapeDe(t.tape_id, t.tape, t.at).itens.push(t);
  for (const p of pend || []) {
    const g = tapeDe(p.tape_id, p.tape, p.src_modified);
    if (ehBeatNovo(p.revisar)) g.novos.push({ id: p.id, title: p.title });
    else g.outros++;
  }
  const tapesFila = [...porTape.values()].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));

  const noSite = beats.filter((b) => !b.removido);
  return json({
    total: noSite.length,
    aVenda: noSite.filter((b) => !b.sold).length,
    comAudio: noSite.length - semAudio.length,
    semAudio,
    semBotao,
    tapesFila
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

// Perfil do @rideblan33 (26/09/2026): mostrar/esconder a tape e subir pro topo.
async function perfilMostrar(d, body) {
  const id = Number(body.id);
  if (!id) return json({ erro: 'sem tape' }, 400);
  await d.prepare("UPDATE artists SET perfil = ? WHERE id = ? AND tipo = 'tape'").bind(body.valor ? 1 : 0, id).run();
  return json({ ok: true, perfil: body.valor ? 1 : 0 });
}
// Topo = uma posição acima da primeira. Tape sem ordem (nova) conta como estando no
// topo, na mesma conta da página do perfil.
async function perfilTopo(d, body) {
  const id = Number(body.id);
  if (!id) return json({ erro: 'sem tape' }, 400);
  const r = await d.prepare(
    "SELECT MIN(COALESCE(perfil_ordem, -1000000000 - id)) AS m FROM artists WHERE tipo = 'tape'"
  ).first();
  const nova = (r && r.m != null ? Number(r.m) : 0) - 1;
  await d.prepare("UPDATE artists SET perfil_ordem = ? WHERE id = ? AND tipo = 'tape'").bind(nova, id).run();
  return json({ ok: true, perfil_ordem: nova });
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

  // Pedido repetido em menos de 10 minutos não sai de novo (24/09/2026: dois
  // "converter tudo" com 4 s de diferença fizeram o GitHub converter tudo 2 vezes).
  const alvo = String(body.artista || '');
  const ultimo = await d.prepare("SELECT valor FROM meta WHERE chave = 'disparo'").first();
  try {
    const u = ultimo ? JSON.parse(ultimo.valor) : null;
    if (u && u.alvo === alvo && Date.now() - Date.parse(u.at) < 10 * 60e3) {
      const hora = new Date(Date.parse(u.at) - 3 * 3600e3).toISOString().slice(11, 16);
      return json({ erro: 'essa conversão já foi pedida às ' + hora + ' e está na fila do GitHub' }, 409);
    }
  } catch (_) { /* anotação torta: deixa passar */ }

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
    await d.prepare("INSERT OR REPLACE INTO meta (chave, valor) VALUES ('disparo', ?)")
      .bind(JSON.stringify({ alvo, at: marca })).run();
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

function periodo(params, teto = 400) {
  const ok = (x) => /^\d{4}-\d{2}-\d{2}$/.test(x || '') && !isNaN(Date.parse(x + 'T00:00:00Z'));
  let ate = ok(params.get('ate')) ? params.get('ate') : hojeSP();
  let de = ok(params.get('de')) ? params.get('de') : somaDias(ate, -29);
  if (de > ate) [de, ate] = [ate, de];
  if ((Date.parse(ate) - Date.parse(de)) / DIA_MS > teto) de = somaDias(ate, -teto);
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

// "Tudo": do primeiro dia com algum dado (funil ou link aberto) até hoje.
// Sem comparação: não existe período anterior. Teto de ~3 anos pro gráfico.
async function primeiroDia(d) {
  const [f, e] = await Promise.all([
    d.prepare('SELECT MIN(dia) m FROM funil').first(),
    d.prepare('SELECT MIN(at) m FROM events').first()
  ]);
  const dias = [];
  if (f && f.m) dias.push(f.m);
  if (e && e.m) dias.push(new Date(Date.parse(e.m) - 3 * 3600e3).toISOString().slice(0, 10));
  return dias.sort()[0] || null;
}

async function analytics(d, request, env, params) {
  let p;
  if (params.get('de') === 'tudo') {
    const q = new URLSearchParams(params);
    q.set('de', (await primeiroDia(d)) || hojeSP());
    p = { ...periodo(q, 1100), tudo: true };
  } else {
    p = periodo(params);
  }
  const aba = params.get('aba');
  if (aba === 'tapes') return json({ ...p, aba, ...(await abaCatalogos(d, p, 'tape')) });
  if (aba === 'artistas') return json({ ...p, aba, ...(await abaCatalogos(d, p, 'artista')) });
  if (aba === 'perfil') return json({ ...p, aba, ...(await abaPerfil(d, p)) });
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

  // todas as faixas prontas (beats nas tapes; beats e músicas nos artistas) com os plays
  // do período. Conto os plays à parte (índice por data) e junto aqui: o JOIN antigo
  // relia os eventos do artista pra cada faixa (24/09/2026).
  const lista0 = (await d.prepare(
    `SELECT t.id, t.title, t.kind, a.name AS onde
       FROM tracks t JOIN artists a ON a.id = t.artist_id
      WHERE a.tipo = ? AND t.ready = 1 ${tipo === 'tape' ? "AND t.kind = 'beat'" : ''}`
  ).bind(tipo).all()).results || [];
  const plays = new Map(((await d.prepare(
    `SELECT track_id, COUNT(*) n FROM events
      WHERE at >= ? AND at < ? AND kind = 'play' AND track_id IS NOT NULL GROUP BY track_id`
  ).bind(ini, fim).all()).results || []).map((r) => [r.track_id, r.n]));
  const faixas = lista0.map((t) => ({ ...t, n: plays.get(t.id) || 0 }))
    .sort((x, y) => y.n - x.n || String(x.title).localeCompare(String(y.title), 'pt-BR', { sensitivity: 'base' }))
    .slice(0, 5000);

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

// Portfólio (26/09/2026): o perfil caramujorecords.com.br/rideblan33.
// perfil = visita, perfil-tape = tocou numa capa, perfil-rede = tocou num botão
// (vitrine, spotify, youtube, instagram, em track_id). A tape aberta a partir do
// perfil grava 'open' com origem 'perfil'; pelo bloco "Mais do @rideblan33", 'mais'.
// Quem foi pra vitrine pelo perfil chega no funil com origem 'perfil'.
async function abaPerfil(d, p) {
  const ini = inicioUTC(p.de), fim = inicioUTC(somaDias(p.ate, 1));
  const iniA = inicioUTC(p.antesDe), fimA = ini;
  const tot = async (a, b) => {
    const r = await d.prepare(
      `SELECT
         SUM(CASE WHEN kind='perfil' THEN 1 ELSE 0 END) visitas,
         COUNT(DISTINCT CASE WHEN kind='perfil' THEN who END) pessoas,
         SUM(CASE WHEN kind='perfil-tape' THEN 1 ELSE 0 END) cliques,
         COUNT(DISTINCT CASE WHEN kind='perfil-tape' THEN who END) clicaram,
         SUM(CASE WHEN kind='perfil-rede' THEN 1 ELSE 0 END) redes,
         SUM(CASE WHEN kind='open' AND origem='perfil' THEN 1 ELSE 0 END) abertas,
         SUM(CASE WHEN kind='open' AND origem='mais' THEN 1 ELSE 0 END) mais
         FROM events WHERE at >= ? AND at < ? AND (kind IN ('perfil','perfil-tape','perfil-rede') OR origem IN ('perfil','mais'))`
    ).bind(a, b).first();
    const o = {};
    for (const k of Object.keys(r || {})) o[k] = Number(r[k] || 0);
    return o;
  };
  const vit = async (de, ate) => (await d.prepare(
    `SELECT COUNT(*) visitas, SUM(CASE WHEN g.sessao IS NOT NULL THEN 1 ELSE 0 END) pagos
       FROM funil v LEFT JOIN funil g ON g.sessao = v.sessao AND g.etapa = 'pago'
      WHERE v.etapa = 'visita' AND v.origem = 'perfil' AND v.dia BETWEEN ? AND ?`
  ).bind(de, ate).first()) || {};
  const [agora, antes, va, vb] = await Promise.all([tot(ini, fim), tot(iniA, fimA), vit(p.de, p.ate), vit(p.antesDe, p.antesAte)]);
  agora.vitrine = Number(va.visitas || 0); agora.pagos = Number(va.pagos || 0);
  antes.vitrine = Number(vb.visitas || 0); antes.pagos = Number(vb.pagos || 0);

  const porDia = (await d.prepare(
    `SELECT ${DIA_SP} dia,
            CASE WHEN e.kind = 'perfil' THEN 'visitas' WHEN e.kind = 'perfil-tape' THEN 'cliques' ELSE 'abertas' END chave,
            COUNT(*) n
       FROM events e WHERE e.at >= ? AND e.at < ?
        AND (e.kind IN ('perfil','perfil-tape') OR (e.kind = 'open' AND e.origem = 'perfil'))
      GROUP BY dia, chave`
  ).bind(ini, fim).all()).results || [];
  const pessoasDia = (await d.prepare(
    `SELECT ${DIA_SP} dia, 'pessoas' chave, COUNT(DISTINCT e.who) n
       FROM events e WHERE e.kind = 'perfil' AND e.at >= ? AND e.at < ? GROUP BY dia`
  ).bind(ini, fim).all()).results || [];
  const vitDia = (await d.prepare(
    `SELECT dia, 'vitrine' chave, COUNT(*) n FROM funil
      WHERE etapa = 'visita' AND origem = 'perfil' AND dia BETWEEN ? AND ? GROUP BY dia`
  ).bind(p.de, p.ate).all()).results || [];
  const serie = series(p.dias, porDia.concat(pessoasDia, vitDia), ['visitas', 'pessoas', 'cliques', 'abertas', 'vitrine']);

  // todas as tapes, inclusive as zeradas e as escondidas (marcadas)
  const tapes = (await d.prepare(
    `SELECT a.id, a.name, a.perfil,
            COALESCE(SUM(CASE WHEN e.kind='perfil-tape' THEN 1 ELSE 0 END), 0) cliques,
            COALESCE(SUM(CASE WHEN e.kind='open' AND e.origem='perfil' THEN 1 ELSE 0 END), 0) abertas,
            COALESCE(SUM(CASE WHEN e.kind='open' AND e.origem='mais' THEN 1 ELSE 0 END), 0) mais
       FROM artists a LEFT JOIN events e ON e.artist_id = a.id AND e.at >= ? AND e.at < ?
        AND (e.kind = 'perfil-tape' OR (e.kind = 'open' AND e.origem IN ('perfil','mais')))
      WHERE a.tipo = 'tape'
      GROUP BY a.id ORDER BY cliques DESC, abertas DESC, a.name COLLATE NOCASE`
  ).bind(ini, fim).all()).results || [];

  const origens = (await d.prepare(
    `SELECT COALESCE(origem, 'direto') origem, COUNT(*) visitas, COUNT(DISTINCT who) pessoas
       FROM events WHERE kind = 'perfil' AND at >= ? AND at < ?
      GROUP BY 1 ORDER BY visitas DESC LIMIT 12`
  ).bind(ini, fim).all()).results || [];
  const redes = (await d.prepare(
    `SELECT track_id rede, COUNT(*) n FROM events
      WHERE kind = 'perfil-rede' AND at >= ? AND at < ? GROUP BY track_id ORDER BY n DESC`
  ).bind(ini, fim).all()).results || [];

  return { agora, antes, serie, tapes, origens, redes };
}

/* ---------- a loja: beats do site, destaque do hero e cupons (24/09/2026) ---------- */
// Tudo que antes era editar o index.html ou o coupons.json e fazer push.

async function loja(d, request, env) {
  const [beats, destaque, cupons] = await Promise.all([
    lerBeats(d),
    lerDestaque(d),
    d.prepare('SELECT codigo, pct, preco_fixo, max_usos, usos, ativo, criado_em FROM cupons ORDER BY ativo DESC, criado_em DESC, codigo').all()
  ]);
  let generos = {}, preco = null;
  try { const est = await lerEstatico(request, env); generos = est.generos; preco = est.preco; } catch (_) { /* segue sem rótulo */ }
  return json({
    beats: beats.map((b) => ({ ...b, slug: slug(b.name) })),
    destaque,
    cupons: cupons.results || [],
    generos,
    preco
  });
}

// Tipo, valor e limite de um cupom (vale pra criar e pra editar).
function regraCupom(body) {
  const tipo = body.tipo === 'fixo' ? 'fixo' : body.tipo === 'pct' ? 'pct' : null;
  if (!tipo) return { erro: 'escolhe desconto ou preço fixo' };
  const valor = Number(String(body.valor || '').replace(',', '.'));
  if (tipo === 'pct' && !(Number.isInteger(valor) && valor >= 1 && valor <= 100)) return { erro: 'desconto entre 1% e 100%' };
  if (tipo === 'fixo' && !(valor >= 1 && valor <= 100000)) return { erro: 'preço fixo a partir de R$1' };
  let max = body.max_usos;
  if (max === '' || max === null || max === undefined) max = null;
  else {
    max = Number(max);
    if (!Number.isInteger(max) || max < 1 || max > 100000) return { erro: 'limite de usos inválido' };
  }
  return { tipo, valor, max };
}

async function cupomUsos(d, codigo) {
  const c = String(codigo || '').trim().toUpperCase().slice(0, 30);
  if (!c) return json({ erro: 'sem cupom' }, 400);
  const { results } = await d.prepare(
    'SELECT pagamento, valor, at FROM cupom_uso WHERE codigo = ? ORDER BY at DESC LIMIT 100'
  ).bind(c).all();
  return json({ codigo: c, usos: results || [] });
}

// Nome como o site escreve: caixa alta, um espaço entre as palavras.
function nomeBeat(txt) {
  const n = String(txt || '').replace(/\s+/g, ' ').trim().toLocaleUpperCase('pt-BR');
  if (!n) return { erro: 'o beat precisa de nome' };
  if (n.length > 60) return { erro: 'nome comprido demais (até 60 letras)' };
  if (/[<>|\\]/.test(n)) return { erro: 'tira os símbolos < > | \\ do nome' };
  if (!slug(n)) return { erro: 'o nome precisa ter pelo menos uma letra ou número' };
  return { nome: n };
}

// 'f#min' -> 'F#m', 'Ebmaj' -> 'Ebmaj', 'c' -> 'C'. Vazio vale (tem beat sem tom).
function tomBeat(txt) {
  const t = String(txt || '').replace(/\s+/g, '').trim();
  if (!t) return { tom: '' };
  const m = t.match(/^([A-Ga-g])([#b]?)(m|min|minor|maj|major|M)?$/);
  if (!m) return { erro: 'tom não reconhecido (ex.: Dm, F#m, Ebmaj)' };
  const q = m[3] ? (/^(m|min|minor)$/.test(m[3]) ? 'm' : 'maj') : '';
  return { tom: m[1].toUpperCase() + m[2] + q };
}

// O que a validação precisa, lido uma vez só (lote de 30 beats = as mesmas 2 leituras).
async function contextoFicha(d, request, env) {
  let generos = {};
  try { generos = (await lerEstatico(request, env)).generos; } catch (_) { generos = {}; }
  const ativos = await lerBeats(d);
  const { results } = await d.prepare(
    'SELECT id, name, sold, removido_em FROM beats WHERE removido_em IS NOT NULL'
  ).all();
  return { generos, ativos, removidos: results || [] };
}

function fichaValida(body, ctx, idAtual) {
  const n = nomeBeat(body.name);
  if (n.erro) return n;
  const bpm = Number(body.bpm);
  if (!Number.isInteger(bpm) || bpm < 40 || bpm > 300) return { erro: 'BPM entre 40 e 300' };
  const t = tomBeat(body.key);
  if (t.erro) return t;
  const genre = String(body.genre || '');
  // gênero é SEMPRE escolha do Bruno: sem ele, nada entra
  if (!genre || !Object.prototype.hasOwnProperty.call(ctx.generos, genre)) return { erro: 'escolhe o gênero' };
  const igual = ctx.ativos.find((b) => b.id !== idAtual && slug(b.name) === slug(n.nome));
  if (igual) return { erro: 'já tem um beat chamado ' + igual.name + ' no site' };
  return { name: n.nome, bpm, key: t.tom, genre };
}

// Publica um ou vários (a Fila manda a tape inteira de uma vez). O primeiro do lote
// fica no topo da lista do site, os outros logo abaixo, na mesma ordem.
// Beat que já esteve no site e foi tirado volta com o mesmo número (histórico e
// analytics seguem), menos se tiver sido vendido: esse não volta nunca.
async function publicarVarios(d, itens, request, env) {
  const ctx = await contextoFicha(d, request, env);
  const resultados = [];
  const aceitos = [];
  const noLote = new Set();
  itens.forEach((it, i) => {
    const f = fichaValida(it || {}, ctx, null);
    if (f.erro) { resultados.push({ i, erro: f.erro }); return; }
    const s = slug(f.name);
    if (noLote.has(s)) { resultados.push({ i, erro: 'nome repetido neste lote' }); return; }
    const antigo = ctx.removidos.find((b) => slug(b.name) === s);
    if (antigo && antigo.sold) { resultados.push({ i, erro: antigo.name + ' já foi vendido: não volta pro site' }); return; }
    noLote.add(s);
    aceitos.push({ i, f, volta: antigo ? antigo.id : null, track: it.track_id ? String(it.track_id).slice(0, 80) : null });
  });
  if (!aceitos.length) return resultados;

  const base = await topoDaLista(d);
  const prox = await d.prepare('SELECT COALESCE(MAX(id), 0) + 1 AS n FROM beats').first();
  let id = Number(prox.n);
  const quando = new Date().toISOString();
  aceitos.forEach((x, k) => {
    x.ordem = base - (aceitos.length - 1) + k;
    if (!x.volta) x.id = id++;
  });

  const lote = [];
  const novos = aceitos.filter((x) => !x.volta);
  for (let i = 0; i < novos.length; i += 9) {        // 10 valores por beat, teto de 100 do D1
    const parte = novos.slice(i, i + 9);
    lote.push(d.prepare(
      'INSERT INTO beats (id, name, bpm, mkey, genre, sold, ordem, track_id, criado_em, mexido_em) VALUES ' +
      parte.map(() => '(?, ?, ?, ?, ?, 0, ?, ?, ?, ?)').join(', ')
    ).bind(...parte.flatMap((x) => [x.id, x.f.name, x.f.bpm, x.f.key, x.f.genre, x.ordem, x.track, quando, quando])));
  }
  for (const x of aceitos.filter((y) => y.volta)) {
    x.id = x.volta;
    lote.push(d.prepare(
      `UPDATE beats SET name = ?, bpm = ?, mkey = ?, genre = ?, ordem = ?, track_id = COALESCE(?, track_id),
              removido_em = NULL, mexido_em = ? WHERE id = ?`
    ).bind(x.f.name, x.f.bpm, x.f.key, x.f.genre, x.ordem, x.track, quando, x.id));
  }
  await d.batch(lote);
  for (const x of aceitos) resultados.push({ i: x.i, ok: true, id: x.id, name: x.f.name, voltou: !!x.volta });
  return resultados.sort((a, b) => a.i - b.i);
}

async function topoDaLista(d) {
  const r = await d.prepare('SELECT MIN(ordem) m FROM beats').first();
  return r && r.m !== null && r.m !== undefined ? Number(r.m) - 1 : 0;
}

async function beatPorId(d, id) {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return null;
  return d.prepare('SELECT * FROM beats WHERE id = ?').bind(n).first();
}

const LOJA_POST = {
  async 'beat-publicar'(d, body, request, env) {
    const [r] = await publicarVarios(d, [body], request, env);
    if (!r.ok) return json({ erro: r.erro }, 400);
    return json({ ok: true, id: r.id, name: r.name, voltou: r.voltou });
  },

  // A Fila publica a tape inteira de uma vez: [{track_id, name, bpm, key, genre}]
  async 'beat-publicar-lote'(d, body, request, env) {
    const itens = Array.isArray(body.itens) ? body.itens.slice(0, 60) : [];
    if (!itens.length) return json({ erro: 'nada marcado' }, 400);
    const resultados = await publicarVarios(d, itens, request, env);
    return json({ ok: true, resultados, publicados: resultados.filter((r) => r.ok).length });
  },

  // Tira da lista do site sem vender. O histórico fica; se o beat estiver disponível
  // numa tape, ele volta pra Fila e dá pra publicar de novo.
  async 'beat-tirar'(d, body) {
    if (body.confirmo !== true) return json({ erro: 'precisa confirmar' }, 400);
    const b = await beatPorId(d, body.id);
    if (!b || b.removido_em) return json({ erro: 'beat não encontrado' }, 404);
    const quando = new Date().toISOString();
    await d.prepare('UPDATE beats SET removido_em = ?, mexido_em = ? WHERE id = ?').bind(quando, quando, b.id).run();
    const dest = await lerDestaque(d);
    if (dest && dest.id === b.id) {
      await d.prepare("UPDATE meta SET valor = ? WHERE chave = 'destaque'").bind(JSON.stringify({ id: null, ate: '' })).run();
    }
    return json({ ok: true });
  },

  // Tape nova: marca DISPONÍVEL os beats que o cruzamento não achou em pasta de artista
  // nenhuma ("Beat novo"). Pendência de outro tipo (conflito) fica pra Beat tapes.
  async 'tape-novos'(d, body, request, env) {
    const tapeId = Number(body.tapeId) || 0;
    if (!tapeId) return json({ erro: 'sem tape' }, 400);
    const { results } = await d.prepare(
      `SELECT t.id, t.title, t.bpm, t.mkey AS key, t.revisar FROM tracks t JOIN artists a ON a.id = t.artist_id
        WHERE a.id = ? AND a.tipo = 'tape' AND t.kind = 'beat' AND t.tag IS NULL AND t.venda_manual IS NULL`
    ).bind(tapeId).all();
    // vendido no site nunca vira disponível, nem aqui
    const vendidos = (await vitrine(request, env)).filter((b) => b.sold);
    const ids = (results || [])
      .filter((t) => ehBeatNovo(t.revisar) && !vendidos.some((b) => mesma(b, t)))
      .map((t) => t.id);
    for (let i = 0; i < ids.length; i += 90) {
      const parte = ids.slice(i, i + 90);
      await d.prepare(
        `UPDATE tracks SET venda_manual = 'disponivel', tag = 'disponivel', revisar = NULL WHERE id IN (${parte.map(() => '?').join(', ')})`
      ).bind(...parte).run();
    }
    return json({ ok: true, marcados: ids.length });
  },

  async 'beat-editar'(d, body, request, env) {
    const b = await beatPorId(d, body.id);
    if (!b) return json({ erro: 'beat não encontrado' }, 404);
    const f = fichaValida(body, await contextoFicha(d, request, env), b.id);
    if (f.erro) return json({ erro: f.erro }, 400);
    await d.prepare('UPDATE beats SET name = ?, bpm = ?, mkey = ?, genre = ?, mexido_em = ? WHERE id = ?')
      .bind(f.name, f.bpm, f.key, f.genre, new Date().toISOString(), b.id).run();
    return json({ ok: true, name: f.name });
  },

  async 'beat-vender'(d, body) {
    const b = await beatPorId(d, body.id);
    if (!b) return json({ erro: 'beat não encontrado' }, 404);
    if (b.sold) return json({ ok: true });
    const quando = new Date().toISOString();
    await d.prepare("UPDATE beats SET sold = 1, sold_at = ?, sold_por = 'painel', unsold_at = NULL, mexido_em = ? WHERE id = ?")
      .bind(quando, quando, b.id).run();
    return json({ ok: true });
  },

  // Volta pra venda. Só com confirmação explícita: anunciar beat vendido é o pior erro daqui.
  async 'beat-desvender'(d, body) {
    if (body.confirmo !== true) return json({ erro: 'precisa confirmar' }, 400);
    const b = await beatPorId(d, body.id);
    if (!b) return json({ erro: 'beat não encontrado' }, 404);
    if (!b.sold) return json({ ok: true });
    const quando = new Date().toISOString();
    await d.prepare('UPDATE beats SET sold = 0, sold_at = NULL, sold_por = NULL, unsold_at = ?, mexido_em = ? WHERE id = ?')
      .bind(quando, quando, b.id).run();
    return json({ ok: true });
  },

  async 'beat-topo'(d, body) {
    const b = await beatPorId(d, body.id);
    if (!b) return json({ erro: 'beat não encontrado' }, 404);
    await d.prepare('UPDATE beats SET ordem = ?, mexido_em = ? WHERE id = ?')
      .bind(await topoDaLista(d), new Date().toISOString(), b.id).run();
    return json({ ok: true });
  },

  // Destaque do hero. id vazio = volta o rodízio semanal. ate vazio = sem prazo.
  async destaque(d, body) {
    const ate = String(body.ate || '');
    if (ate && !/^\d{4}-\d{2}-\d{2}$/.test(ate)) return json({ erro: 'data inválida' }, 400);
    let id = null;
    if (body.id) {
      const b = await beatPorId(d, body.id);
      if (!b) return json({ erro: 'beat não encontrado' }, 404);
      if (b.sold) return json({ erro: 'beat vendido não vai pro destaque' }, 400);
      id = b.id;
    }
    await d.prepare("INSERT OR REPLACE INTO meta (chave, valor) VALUES ('destaque', ?)")
      .bind(JSON.stringify({ id, ate: id ? ate : '' })).run();
    return json({ ok: true });
  },

  async 'cupom-criar'(d, body) {
    const codigo = String(body.codigo || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{3,30}$/.test(codigo)) return json({ erro: 'código com 3 a 30 letras ou números, sem espaço' }, 400);
    const v = regraCupom(body);
    if (v.erro) return json({ erro: v.erro }, 400);
    const { tipo, valor, max } = v;
    const ja = await d.prepare('SELECT 1 FROM cupons WHERE codigo = ?').bind(codigo).first();
    if (ja) return json({ erro: 'já existe um cupom ' + codigo }, 400);
    await d.prepare(
      'INSERT INTO cupons (codigo, pct, preco_fixo, max_usos, usos, ativo, criado_em) VALUES (?, ?, ?, ?, 0, 1, ?)'
    ).bind(codigo, tipo === 'pct' ? valor : null, tipo === 'fixo' ? Math.round(valor * 100) / 100 : null, max,
      new Date().toISOString()).run();
    return json({ ok: true, codigo });
  },

  // Editar (25/09/2026): desconto/preço e limite de usos. O código não muda (quem já
  // recebeu por DM continua usando o mesmo). O limite não pode ficar abaixo do que já foi usado.
  async 'cupom-editar'(d, body) {
    const codigo = String(body.codigo || '').trim().toUpperCase().slice(0, 30);
    const c = await d.prepare('SELECT usos FROM cupons WHERE codigo = ?').bind(codigo).first();
    if (!c) return json({ erro: 'cupom não encontrado' }, 404);
    const v = regraCupom(body);
    if (v.erro) return json({ erro: v.erro }, 400);
    const usos = Number(c.usos) || 0;
    if (v.max !== null && v.max < usos) return json({ erro: 'já foi usado ' + usos + (usos === 1 ? ' vez' : ' vezes') + ': o limite precisa ser ' + usos + ' ou mais' }, 400);
    await d.prepare('UPDATE cupons SET pct = ?, preco_fixo = ?, max_usos = ? WHERE codigo = ?')
      .bind(v.tipo === 'pct' ? v.valor : null, v.tipo === 'fixo' ? Math.round(v.valor * 100) / 100 : null, v.max, codigo).run();
    return json({ ok: true, codigo });
  },

  async 'cupom-ativo'(d, body) {
    const codigo = String(body.codigo || '').trim().toUpperCase().slice(0, 30);
    const r = await d.prepare('UPDATE cupons SET ativo = ? WHERE codigo = ?').bind(body.ativo ? 1 : 0, codigo).run();
    if (!Number((r && r.meta && r.meta.changes) || 0)) return json({ erro: 'cupom não encontrado' }, 404);
    return json({ ok: true });
  }
};
