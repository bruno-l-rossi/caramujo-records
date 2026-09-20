// Esquema e helpers do catálogo (Cloudflare D1).
// Criado sob demanda: a primeira chamada garante as tabelas.

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS artists (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     slug TEXT UNIQUE NOT NULL,
     name TEXT NOT NULL,
     folder_id TEXT UNIQUE NOT NULL,
     code TEXT NOT NULL,
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
     seen_at TEXT
   )`,
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

// Ajustes que rodam uma vez só e ficam marcados na tabela meta.
// Depois disso o painel manda: se eu desligar um download, fica desligado.
const UMA_VEZ = [
  ['download-ligado-2026-09', 'UPDATE artists SET dl_beats = 1, dl_sons = 1']
];

let ready = false;

export async function db(env) {
  if (!env.DB) throw new Error('D1 nao esta ligado (binding DB)');
  if (!ready) {
    for (const q of SCHEMA) {
      try { await env.DB.prepare(q).run(); }
      catch (e) { if (!/duplicate column/i.test(String(e))) throw e; }
    }
    for (const [chave, q] of UMA_VEZ) {
      const feito = await env.DB.prepare('SELECT 1 FROM meta WHERE chave = ?').bind(chave).first();
      if (feito) continue;
      await env.DB.prepare(q).run();
      await env.DB.prepare('INSERT INTO meta (chave, valor) VALUES (?, ?)')
        .bind(chave, new Date().toISOString()).run();
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
