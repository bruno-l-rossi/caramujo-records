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
  `CREATE TABLE IF NOT EXISTS meta (chave TEXT PRIMARY KEY, valor TEXT NOT NULL)`
];

// As respostas que o Bruno deu em 22/09/2026 pros beats que o cruzamento não
// resolveu. Comparo o título em JS, sem acento e sem pontuação, porque o LOWER do
// SQLite não tira acento e "clássico vol. 3" tem que casar com "classico vol 3".
const RESPOSTAS = {
  disponivel: ['nada vai me parar', 'loop', 'olhando pra tras', 'nada mudou', 'real',
    'matueto', 'sereno', 'sequencia', 'elegancia', 'cotidiano', 'roakutan',
    'classico vol 3', 'casa', 'beat sincero', 'funeral', 'gana'],
  vendido: ['regalia', 'aquela sorte', 'arrepio', 'classic', 'classico como lincoln',
    'malas prontas']
};

// Só mexe em beat de tape que ainda está SEM pastilha. O que já foi resolvido, pelo
// cruzamento ou na mão, fica como está: marcar disponível um beat já vendido é o
// pior erro possível aqui.
export async function respostasDoBruno(DB) {
  const dicionario = new Map();
  for (const valor of Object.keys(RESPOSTAS)) {
    for (const nome of RESPOSTAS[valor]) dicionario.set(chave(nome), valor);
  }
  const { results } = await DB.prepare(
    `SELECT t.id, t.title FROM tracks t JOIN artists a ON a.id = t.artist_id
      WHERE a.tipo = 'tape' AND t.kind = 'beat'
        AND t.tag IS NULL AND t.venda_manual IS NULL`
  ).all();
  const mudar = [];
  for (const r of results || []) {
    const valor = dicionario.get(chave(r.title));
    if (valor) {
      mudar.push(DB.prepare(
        'UPDATE tracks SET venda_manual = ?, tag = ?, revisar = NULL WHERE id = ?'
      ).bind(valor, valor, r.id));
    }
  }
  if (mudar.length) await DB.batch(mudar);
}

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
  ['respostas-do-bruno-2026-09-22', respostasDoBruno]
];

let ready = false;

export async function db(env) {
  if (!env.DB) throw new Error('D1 nao esta ligado (binding DB)');
  if (!ready) {
    for (const q of SCHEMA) {
      try { await env.DB.prepare(q).run(); }
      catch (e) { if (!/duplicate column/i.test(String(e))) throw e; }
    }
    for (const [marca, q] of UMA_VEZ) {
      const feito = await env.DB.prepare('SELECT 1 FROM meta WHERE chave = ?').bind(marca).first();
      if (feito) continue;
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
