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
     mexido_em TEXT
   )`,
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
   )`
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
         FROM funil WHERE etapa IN ('play', 'carrinho') AND beat_id IS NOT NULL`]
];

let ready = false;

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
  return env.DB;
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
