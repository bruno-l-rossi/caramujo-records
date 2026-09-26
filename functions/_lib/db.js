// Esquema e helpers do catálogo (Cloudflare D1).
// Criado sob demanda: a primeira chamada garante as tabelas.

import { chave } from './casar.js';

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS artists (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     slug TEXT UNIQUE NOT NULL,
     name TEXT NOT NULL,
     folder_id TEXT UNIQUE NOT NULL,
     code TEXT NOT NULL,
     tipo TEXT NOT NULL DEFAULT 'artista',
     dl_beats INTEGER NOT NULL DEFAULT 1,
     dl_sons INTEGER NOT NULL DEFAULT 1,
     cover_key TEXT,
     cover_origem TEXT,
     descricao TEXT,
     synced_at TEXT,
     job_estado TEXT,
     job_total INTEGER NOT NULL DEFAULT 0,
     job_feitos INTEGER NOT NULL DEFAULT 0,
     job_at TEXT
   )`,
  // bancos criados antes da barra de andamento
  `ALTER TABLE artists ADD COLUMN cover_origem TEXT`,
  `ALTER TABLE artists ADD COLUMN descricao TEXT`,
  `ALTER TABLE artists ADD COLUMN job_estado TEXT`,
  `ALTER TABLE artists ADD COLUMN job_total INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE artists ADD COLUMN job_feitos INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE artists ADD COLUMN job_at TEXT`,
  // beat tapes do @rideblan33 entraram depois dos artistas
  `ALTER TABLE artists ADD COLUMN tipo TEXT NOT NULL DEFAULT 'artista'`,
  `CREATE TABLE IF NOT EXISTS tracks (
     id TEXT PRIMARY KEY,
     artist_id INTEGER NOT NULL,
     title TEXT NOT NULL,
     kind TEXT NOT NULL,
     grp TEXT NOT NULL,
     bpm INTEGER,
     mkey TEXT,
     tag TEXT,
     dur INTEGER,
     wav_bytes INTEGER,
     mp3_bytes INTEGER,
     src_modified TEXT,
     ready INTEGER NOT NULL DEFAULT 0,
     revisar TEXT,
     venda_manual TEXT,
     seen_at TEXT
   )`,
  `ALTER TABLE tracks ADD COLUMN revisar TEXT`,
  // bitrate do MP3 guardado. NULL = 192k antigo; o conversor refaz em 128k (25/09/2026)
  `ALTER TABLE tracks ADD COLUMN mp3_kbps INTEGER`,
  `ALTER TABLE tracks ADD COLUMN venda_manual TEXT`,
  `CREATE INDEX IF NOT EXISTS tracks_artist ON tracks (artist_id)`,
  `CREATE TABLE IF NOT EXISTS links (
     code TEXT PRIMARY KEY,
     kind TEXT NOT NULL,
     artist_id INTEGER NOT NULL,
     track_ids TEXT NOT NULL,
     created_at TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS events (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     artist_id INTEGER,
     track_id TEXT,
     kind TEXT NOT NULL,
     link_code TEXT,
     who TEXT,
     at TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS events_artist ON events (artist_id, at)`,
  // Funil de venda do site (24/09/2026). Nada pessoal: a sessão é um número
  // aleatório da aba, que morre quando a aba fecha. Uma linha por etapa por
  // sessão (o índice único segura repetição e spam de uma aba só).
  `CREATE TABLE IF NOT EXISTS funil (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     sessao TEXT NOT NULL,
     etapa TEXT NOT NULL,
     aparelho TEXT,
     origem TEXT,
     beat_id INTEGER,
     dia TEXT NOT NULL,
     at TEXT NOT NULL
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS funil_sessao_etapa ON funil (sessao, etapa)`,
  // cada beat que a visita tocou ou pôs no carrinho (uma vez por beat por visita):
  // o funil só guarda o PRIMEIRO de cada etapa, isso aqui guarda todos
  `CREATE TABLE IF NOT EXISTS beat_evento (
     sessao TEXT NOT NULL,
     beat_id INTEGER NOT NULL,
     tipo TEXT NOT NULL,
     dia TEXT NOT NULL
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS beat_evento_um ON beat_evento (sessao, beat_id, tipo)`,
  `CREATE INDEX IF NOT EXISTS beat_evento_dia ON beat_evento (dia, tipo)`,
  `CREATE INDEX IF NOT EXISTS funil_dia ON funil (dia, etapa)`,
  `CREATE TABLE IF NOT EXISTS meta (chave TEXT PRIMARY KEY, valor TEXT NOT NULL)`,
  // A loja (24/09/2026): a lista de beats à venda, os cupons e cada uso de cupom
  // saíram do GitHub (const BEATS no index.html e functions/coupons.json) e vieram
  // pra cá. Venda e cupom gravam aqui: acabou o commit + redeploy a cada venda.
  // id = o mesmo número de antes (carrinho salvo, funil e analytics apontam pra ele).
  // ordem: menor aparece primeiro na lista do site; beat novo entra com MIN-1.
  `CREATE TABLE IF NOT EXISTS beats (
     id INTEGER PRIMARY KEY,
     name TEXT NOT NULL,
     bpm INTEGER,
     mkey TEXT,
     genre TEXT NOT NULL,
     sold INTEGER NOT NULL DEFAULT 0,
     sold_at TEXT,
     sold_por TEXT,
     unsold_at TEXT,
     ordem REAL NOT NULL,
     track_id TEXT,
     criado_em TEXT NOT NULL,
     mexido_em TEXT,
     removido_em TEXT
   )`,
  // "Tirar do site" no painel (24/09/2026): some da vitrine, guarda o histórico
  `ALTER TABLE beats ADD COLUMN removido_em TEXT`,
  `CREATE INDEX IF NOT EXISTS beats_ordem ON beats (ordem)`,
  `CREATE TABLE IF NOT EXISTS cupons (
     codigo TEXT PRIMARY KEY,
     pct INTEGER,
     preco_fixo REAL,
     max_usos INTEGER,
     usos INTEGER NOT NULL DEFAULT 0,
     ativo INTEGER NOT NULL DEFAULT 1,
     criado_em TEXT NOT NULL
   )`,
  // um uso por pagamento: o webhook do Mercado Pago chega repetido e a chave
  // (codigo, pagamento) não deixa contar duas vezes
  `CREATE TABLE IF NOT EXISTS cupom_uso (
     codigo TEXT NOT NULL,
     pagamento TEXT NOT NULL,
     valor REAL,
     at TEXT NOT NULL,
     PRIMARY KEY (codigo, pagamento)
   )`,
  // Índices da rodada do limite de leitura (24/09/2026): o analytics filtra events
  // por data e a vitrine/relatório filtram tracks por tipo, sem varrer a tabela toda.
  `CREATE INDEX IF NOT EXISTS events_at ON events (at)`,
  `CREATE INDEX IF NOT EXISTS tracks_kind ON tracks (kind, ready)`,
  // Contador de consumo: linhas lidas por dia (UTC, o dia do limite da Cloudflare),
  // por consulta. rotulo '*' = total do dia.
  `CREATE TABLE IF NOT EXISTS consumo (
     dia TEXT NOT NULL,
     rotulo TEXT NOT NULL,
     linhas INTEGER NOT NULL DEFAULT 0,
     chamadas INTEGER NOT NULL DEFAULT 0,
     PRIMARY KEY (dia, rotulo)
   )`,
  // Perfil do @rideblan33 (26/09/2026): toda tape aparece no perfil sozinha; o painel
  // esconde (perfil = 0) e ordena (perfil_ordem, menor primeiro; tape nova sem ordem
  // entra no topo). events.origem guarda de onde veio a visita do perfil e a tape
  // aberta a partir dele (?de=perfil).
  `ALTER TABLE artists ADD COLUMN perfil INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE artists ADD COLUMN perfil_ordem REAL`,
  `ALTER TABLE events ADD COLUMN origem TEXT`,
  // visitas do perfil (kind = 'perfil', artist_id vazio): o painel pergunta a última e
  // as do mês/ano sem varrer a tabela
  `CREATE INDEX IF NOT EXISTS events_kind_at ON events (kind, at)`
];

// Versão do esquema: muda sozinha quando a lista acima muda. Com ela gravada na
// meta, um isolate novo gasta 2 consultas pra acordar em vez de ~30 (o plano
// gratuito aceita 50 por chamada, e a importação da loja precisa de folga).
function assinatura(txt) {
  let h = 5381;
  for (let i = 0; i < txt.length; i++) h = ((h << 5) + h + txt.charCodeAt(i)) | 0;
  return 'esquema-' + (h >>> 0).toString(36);
}
const VERSAO = assinatura(SCHEMA.join('\n'));

// As respostas que o Bruno deu em 22/09/2026 pros beats que o cruzamento não
// resolveu. Comparo o título em JS, sem acento e sem pontuação, porque o LOWER do
// SQLite não tira acento e "clássico vol. 3" tem que casar com "classico vol 3".
const RESPOSTAS = {
  disponivel: ['nada vai me parar', 'loop', 'olhando pra tras', 'nada mudou', 'real',
    'matueto', 'sereno', 'sequencia', 'elegancia', 'cotidiano', 'roakutan',
    'classico vol 3', 'casa', 'beat sincero', 'funeral', 'gana', 'malas prontas'],
  vendido: ['regalia', 'aquela sorte', 'arrepio', 'classic', 'classico como lincoln']
};

// Aplica as respostas nos beats das tapes. Comparo em JS porque o LOWER do SQLite
// não tira acento. Três modos, porque cada um roda uma vez e num momento diferente:
//   'pendentes'         -> só faixa sem pastilha nenhuma. Foi a primeira passada.
//   'vendido'           -> corrige pra vendido mesmo por cima de pastilha errada.
//                          Nessa direção é sempre seguro; a inversa anunciaria um
//                          beat que já saiu, que é o pior erro daqui.
//   'fixar-disponivel'  -> não muda pastilha nenhuma: só carimba a resposta dele em
//                          quem já está disponível, pra conversão nenhuma desfazer.
async function aplicarRespostas(DB, modo) {
  const dicionario = new Map();
  for (const valor of Object.keys(RESPOSTAS)) {
    for (const nome of RESPOSTAS[valor]) dicionario.set(chave(nome), valor);
  }
  const { results } = await DB.prepare(
    `SELECT t.id, t.title, t.tag FROM tracks t JOIN artists a ON a.id = t.artist_id
      WHERE a.tipo = 'tape' AND t.kind = 'beat' AND t.venda_manual IS NULL`
  ).all();
  const mudar = [];
  for (const r of results || []) {
    const valor = dicionario.get(chave(r.title));
    if (!valor) continue;
    if (modo === 'pendentes' && r.tag !== null) continue;
    if (modo === 'vendido' && valor !== 'vendido') continue;
    if (modo === 'fixar-disponivel' && !(valor === 'disponivel' && r.tag === 'disponivel')) continue;
    mudar.push(DB.prepare(
      'UPDATE tracks SET venda_manual = ?, tag = ?, revisar = NULL WHERE id = ?'
    ).bind(valor, valor, r.id));
  }
  if (mudar.length) await DB.batch(mudar);
}

export const respostasDoBruno = (DB) => aplicarRespostas(DB, 'pendentes');
export const vendidosDoBruno = (DB) => aplicarRespostas(DB, 'vendido');

// Ordem inicial do perfil (26/09/2026): a mesma da prévia que o Bruno aprovou, pela
// data da arte de cada capa no Drive, mais nova primeiro. Duas consultas: lê as
// tapes e grava tudo num UPDATE só (o plano gratuito aceita 50 por chamada).
// Tape que não está na lista fica sem ordem e aparece no topo (é nova).
export const ORDEM_PERFIL = ['A VIDA PASSA, FOCA NO SEU SONHO AGORA', 'FAÇO BEAT, LOGO EXISTO',
  'TUDO MUDA E NADA MUDA', 'INTERNET', 'OPP FICA PUTO', 'TEMPORADA DE CAÇA', 'CAPITAL DO SUBMUNDO',
  'CULTURA NÃO DEVE SER TRATADA COMO NEGÓCIOS', 'A VIDA QUE EU PEDI', 'RESILIÊNCIA', 'vozes e vultos',
  'O FUTURO E O PASSADO SÃO COISAS QUE ME CONFUNDEM', 'caramujo natalino', 'ARMADILHA PARA RATOS',
  "SÓ QUEM 'TEVE LÁ EMBAIXO COMIGO VAI ANDAR DE BENTLEY", 'respirando notas', 'mente fria', 'Rastros',
  '1-6 tape', 'rideblan vs michael jackson', 'rideblan vs freddy krueger', 'Onda', 'Não fecho com bolsominion',
  '2021 tape', 'Nada de novo (vol. I)', 'Grito'];
export async function ordemInicialPerfil(DB) {
  const pos = new Map(ORDEM_PERFIL.map((n, i) => [chave(n), i + 1]));
  const { results } = await DB.prepare("SELECT id, name FROM artists WHERE tipo = 'tape'").all();
  const casos = [];
  for (const r of results || []) {
    const i = pos.get(chave(r.name));
    if (i) casos.push([r.id, i]);
  }
  if (!casos.length) return;
  await DB.prepare(
    'UPDATE artists SET perfil_ordem = CASE id ' + casos.map(() => 'WHEN ? THEN ?').join(' ') + ' END WHERE id IN (' +
    casos.map(() => '?').join(', ') + ')'
  ).bind(...casos.flat(), ...casos.map((c) => c[0])).run();
}
export const disponiveisDoBruno = (DB) => aplicarRespostas(DB, 'fixar-disponivel');

// Ajustes que rodam uma vez só e ficam marcados na tabela meta.
// Depois disso o painel manda: se eu desligar um download, fica desligado.
// String = SQL solto. Função = ajuste que precisa comparar texto em JS.
export const UMA_VEZ = [
  ['download-ligado-2026-09', 'UPDATE artists SET dl_beats = 1, dl_sons = 1'],
  // "Nada de novo" é tape de graça: beat sem licença exclusiva, download liberado
  // e, por consequência, sem botão de carrinho no catálogo.
  ['tape-gratis-2026-09-22',
    "UPDATE artists SET dl_beats = 1, dl_sons = 1 WHERE tipo = 'tape' AND name LIKE 'Nada de novo%'"],
  ['tape-gratis-tags-2026-09-22',
    `UPDATE tracks SET venda_manual = 'disponivel', tag = 'disponivel', revisar = NULL
      WHERE kind = 'beat' AND venda_manual IS NULL
        AND artist_id IN (SELECT id FROM artists WHERE tipo = 'tape' AND name LIKE 'Nada de novo%')`],
  ['respostas-do-bruno-2026-09-22', respostasDoBruno],
  // Segunda passada: beat que o Bruno confirmou vendido em 23/09/2026 e que o
  // cruzamento tinha deixado como disponível (ele continua na pasta Exclusivos).
  ['vendidos-do-bruno-2026-09-23', vendidosDoBruno],
  // Terceira: carimba a resposta dele em quem já está disponível, sem mexer em
  // pastilha. Assim "malas prontas" e companhia não voltam atrás numa conversão.
  ['disponiveis-do-bruno-2026-09-23', disponiveisDoBruno],
  // o que o funil já tinha (o primeiro beat de cada visita) entra na tabela nova
  ['beat-evento-do-funil-2026-09-25',
    `INSERT OR IGNORE INTO beat_evento (sessao, beat_id, tipo, dia)
       SELECT sessao, beat_id, CASE etapa WHEN 'play' THEN 'toque' ELSE 'adicao' END, dia
         FROM funil WHERE etapa IN ('play', 'carrinho') AND beat_id IS NOT NULL`],
  ['perfil-ordem-2026-09-26', ordemInicialPerfil]
];

let ready = false;

/* ---------- contador de consumo (24/09/2026) ----------
   O plano gratuito do D1 bloqueia o dia inteiro quando passa de 5 milhões de
   linhas lidas (aconteceu em 24/09 com o painel aberto durante a conversão total).
   Toda consulta que passa por db() soma o rows_read que o D1 devolve. A cada
   minuto, o isolate grava o que juntou numa consulta só (tabela consumo). O painel
   mostra o dia. É estimativa: o que um isolate juntou e não gravou antes de morrer
   se perde. */
export const TETO_LEITURA = 5000000;
const pendente = new Map();
let gravadoEm = Date.now();
let ultimoDia = null;
const rotular = (sql) => String(sql).replace(/\s+/g, ' ').trim().slice(0, 96);

function anotar(sql, meta) {
  const linhas = Number(meta && (meta.rows_read ?? meta.rowsRead)) || 0;
  const k = rotular(sql);
  const p = pendente.get(k) || { linhas: 0, chamadas: 0 };
  p.linhas += linhas; p.chamadas += 1;
  pendente.set(k, p);
}

// Uma consulta só: o total do dia e as 23 consultas que mais leram (o resto vira
// 'outras'). O plano gratuito aceita 50 consultas por chamada; não dá pra gastar à toa.
export async function gravarConsumo(DB, agora = false) {
  if (!pendente.size) return;
  if (!agora && Date.now() - gravadoEm < 60e3) return;
  const lista = [...pendente.entries()].sort((a, b) => b[1].linhas - a[1].linhas);
  pendente.clear();
  gravadoEm = Date.now();
  const dia = new Date().toISOString().slice(0, 10);
  const soma = (l) => l.reduce((o, [, p]) => ({ linhas: o.linhas + p.linhas, chamadas: o.chamadas + p.chamadas }), { linhas: 0, chamadas: 0 });
  const linhas = [['*', soma(lista)], ...lista.slice(0, 22)];
  if (lista.length > 22) linhas.push(['outras', soma(lista.slice(22))]);
  try {
    await DB.prepare(
      'INSERT INTO consumo (dia, rotulo, linhas, chamadas) VALUES ' + linhas.map(() => '(?, ?, ?, ?)').join(', ') +
      ' ON CONFLICT(dia, rotulo) DO UPDATE SET linhas = linhas + excluded.linhas, chamadas = chamadas + excluded.chamadas'
    ).bind(...linhas.flatMap(([k, p]) => [dia, k, p.linhas, p.chamadas])).run();
    if (ultimoDia !== dia) {
      ultimoDia = dia;
      const velho = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
      await DB.prepare('DELETE FROM consumo WHERE dia < ?').bind(velho).run();
    }
  } catch (_) { /* contador é bônus: nunca derruba a chamada */ }
}

// O D1 embrulhado: mesma cara (prepare/bind/all/first/run/batch), mas anota o
// consumo. first() vira all() porque só o all() devolve o rows_read.
function consulta(DB, cru, sql) {
  return {
    __cru: cru, __sql: sql,
    bind: (...a) => consulta(DB, cru.bind(...a), sql),
    async all() { const r = await cru.all(); anotar(sql, r && r.meta); await gravarConsumo(DB); return r; },
    async run() { const r = await cru.run(); anotar(sql, r && r.meta); await gravarConsumo(DB); return r; },
    async first(col) {
      const r = await cru.all();
      anotar(sql, r && r.meta);
      await gravarConsumo(DB);
      const l = r && r.results && r.results[0];
      if (l === undefined || l === null) return null;
      return col ? l[col] : l;
    }
  };
}
function embrulhar(DB) {
  return {
    prepare: (sql) => consulta(DB, DB.prepare(sql), sql),
    async batch(lista) {
      const r = await DB.batch(lista.map((x) => x.__cru || x));
      (r || []).forEach((x, i) => anotar(lista[i].__sql || '(lote)', x && x.meta));
      await gravarConsumo(DB);
      return r;
    }
  };
}
let embrulhado = null, cruVisto = null;

export async function db(env) {
  if (!env.DB) throw new Error('D1 nao esta ligado (binding DB)');
  if (!ready) {
    let versao = null;
    try {
      const v = await env.DB.prepare("SELECT valor FROM meta WHERE chave = 'esquema'").first();
      versao = v ? v.valor : null;
    } catch (_) { versao = null; }            // banco novo: nem a meta existe ainda
    if (versao !== VERSAO) {
      for (const q of SCHEMA) {
        try { await env.DB.prepare(q).run(); }
        catch (e) { if (!/duplicate column/i.test(String(e))) throw e; }
      }
      await env.DB.prepare("INSERT OR REPLACE INTO meta (chave, valor) VALUES ('esquema', ?)").bind(VERSAO).run();
    }
    const vagas = UMA_VEZ.map(() => '?').join(', ');
    const { results: jaFeitos } = await env.DB.prepare(
      `SELECT chave FROM meta WHERE chave IN (${vagas})`
    ).bind(...UMA_VEZ.map((x) => x[0])).all();
    const feitos = new Set((jaFeitos || []).map((r) => r.chave));
    for (const [marca, q] of UMA_VEZ) {
      if (feitos.has(marca)) continue;
      if (typeof q === 'function') await q(env.DB);
      else await env.DB.prepare(q).run();
      await env.DB.prepare('INSERT INTO meta (chave, valor) VALUES (?, ?)')
        .bind(marca, new Date().toISOString()).run();
    }
    ready = true;
  }
  if (cruVisto !== env.DB) { cruVisto = env.DB; embrulhado = embrulhar(env.DB); }
  return embrulhado;
}

export const now = () => new Date().toISOString();

export function slugify(s) {
  return String(s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'artista';
}

// Código curto sem caracteres que se confundem lendo em voz alta.
const ALPHA = 'abcdefghjkmnpqrstuvwxyz23456789';
export function code(len = 5) {
  const b = crypto.getRandomValues(new Uint8Array(len));
  let out = '';
  for (const n of b) out += ALPHA[n % ALPHA.length];
  return out;
}

// Identificador de quem abriu, sem guardar IP: hash do IP + navegador.
export async function who(request) {
  const raw = (request.headers.get('cf-connecting-ip') || '') + '|' +
              (request.headers.get('user-agent') || '');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return [...new Uint8Array(buf)].slice(0, 6).map((n) => n.toString(16).padStart(2, '0')).join('');
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers }
  });
}
