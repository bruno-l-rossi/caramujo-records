// Conversor do catálogo: lê as pastas do Drive, converte o que falta
// e entrega ao site (functions/api/ingest.js), que guarda no R2 e no D1.
// Roda no GitHub Actions, nunca no navegador.
//
//   node scripts/sync.mjs                 -> todos os artistas
//   node scripts/sync.mjs "nico2b,PUMA"   -> só esses
//
// Precisa de: GDRIVE_SA_JSON, INGEST_TOKEN, SITE_URL
// Opcional: PROJETOS_FOLDER_ID (padrão: a pasta Projetos do rideblan33)

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parseName } from './parse.mjs';

const run = promisify(execFile);

const PROJETOS = process.env.PROJETOS_FOLDER_ID || '1wbIR0daNpWvZu5o6NiyrTkEJJkgHXgaH';
const SITE = (process.env.SITE_URL || 'https://caramujorecords.com.br').replace(/\/$/, '');
const TOKEN = process.env.INGEST_TOKEN;
const AUDIO = /\.(wav|aiff?|flac|mp3|m4a)$/i;
const IGNORAR = new Set(['shows', 'vídeos', 'videos', 'sessão de stu', 'sessao de stu']);

const alvo = (process.argv[2] || '').split(',').map((s) => s.trim()).filter(Boolean);

/* ---------- Google: token da conta de serviço ---------- */

let cache = { token: null, exp: 0 };

async function gtoken() {
  if (cache.token && Date.now() < cache.exp - 60000) return cache.token;
  const sa = JSON.parse(process.env.GDRIVE_SA_JSON);
  const iat = Math.floor(Date.now() / 1000);
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat, exp: iat + 3600
  };
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const head = b64({ alg: 'RS256', typ: 'JWT' });
  const body = b64(claim);
  const sig = crypto.createSign('RSA-SHA256').update(`${head}.${body}`)
    .sign(sa.private_key).toString('base64url');

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${head}.${body}.${sig}`
    })
  });
  if (!r.ok) throw new Error('Google recusou a chave: ' + (await r.text()).slice(0, 300));
  const j = await r.json();
  cache = { token: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return cache.token;
}

async function drive(params) {
  const q = new URLSearchParams({
    fields: 'files(id,name,mimeType,size,modifiedTime),nextPageToken',
    pageSize: '1000',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
    ...params
  });
  const out = [];
  let page;
  do {
    if (page) q.set('pageToken', page);
    const r = await fetch('https://www.googleapis.com/drive/v3/files?' + q, {
      headers: { authorization: 'Bearer ' + (await gtoken()) }
    });
    if (!r.ok) throw new Error('Drive respondeu ' + r.status + ': ' + (await r.text()).slice(0, 200));
    const j = await r.json();
    out.push(...(j.files || []));
    page = j.nextPageToken;
  } while (page);
  return out;
}

const filhos = (id) => drive({ q: `'${id}' in parents and trashed = false` });

/* ---------- montar o catálogo de um artista ---------- */

const PASTAS = [
  { nome: 'beats', kind: 'beat', grp: 'res', tag: null },
  { nome: 'sons', kind: 'son', grp: 'pronta', tag: 'mastered' }
];
const SUB = {
  beats: { 'já gravados': { grp: 'grav', tag: null }, 'ja gravados': { grp: 'grav', tag: null } },
  sons: {
    'já lançados': { grp: 'lancada', tag: 'mastered' },
    'ja lancados': { grp: 'lancada', tag: 'mastered' },
    guias: { grp: 'guia', tag: 'demo' }
  }
};

async function catalogo(artista) {
  const faixas = [];
  const raiz = await filhos(artista.id);

  for (const pasta of raiz) {
    if (pasta.mimeType !== 'application/vnd.google-apps.folder') continue;
    const nome = pasta.name.toLowerCase();
    if (IGNORAR.has(nome)) continue;
    const base = PASTAS.find((p) => p.nome === nome);
    if (!base) continue;

    const dentro = await filhos(pasta.id);
    for (const f of dentro) {
      if (f.mimeType === 'application/vnd.google-apps.folder') {
        const regra = SUB[base.nome]?.[f.name.toLowerCase()];
        if (!regra) continue;
        for (const g of await filhos(f.id)) {
          if (g.mimeType === 'application/vnd.google-apps.folder') continue;
          add(faixas, g, base.kind, regra.grp, regra.tag);
        }
      } else {
        add(faixas, f, base.kind, base.grp, base.tag);
      }
    }
  }
  return faixas;
}

function add(lista, f, kind, grp, tag) {
  if (!AUDIO.test(f.name)) return;
  const { title, bpm, key } = parseName(f.name);
  lista.push({
    id: f.id, title, kind, grp, tag,
    bpm: kind === 'beat' ? bpm : null,
    key: kind === 'beat' ? key : null,
    wavBytes: Number(f.size || 0),
    modified: f.modifiedTime,
    fileName: f.name
  });
}

/* ---------- conversão ---------- */

async function converter(faixa, dir) {
  const bruto = path.join(dir, faixa.id + path.extname(faixa.fileName));
  const leve = path.join(dir, faixa.id + '.mp3');

  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${faixa.id}?alt=media&supportsAllDrives=true`, {
    headers: { authorization: 'Bearer ' + (await gtoken()) }
  });
  if (!r.ok) throw new Error('download falhou (' + r.status + ')');
  await fs.promises.writeFile(bruto, Buffer.from(await r.arrayBuffer()));

  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', bruto,
    '-vn', '-c:a', 'libmp3lame', '-b:a', '192k', '-ar', '44100', leve]);

  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries',
    'format=duration', '-of', 'csv=p=0', leve]);

  const bytes = (await fs.promises.stat(leve)).size;
  const buf = await fs.promises.readFile(leve);
  await fs.promises.rm(bruto, { force: true });
  await fs.promises.rm(leve, { force: true });
  return { buf, dur: Number(stdout.trim()) || 0, bytes };
}

/* ---------- conversa com o site ---------- */

async function ingest(op, params, body, binario = false) {
  const q = new URLSearchParams({ op, ...params });
  const r = await fetch(`${SITE}/api/ingest?${q}`, {
    method: 'POST',
    headers: {
      'x-ingest-token': TOKEN,
      'content-type': binario ? 'audio/mpeg' : 'application/json'
    },
    body: binario ? body : JSON.stringify(body)
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`site respondeu ${r.status}: ${txt.slice(0, 300)}`);
  return JSON.parse(txt);
}

/* ---------- principal ---------- */

async function main() {
  if (!TOKEN) throw new Error('falta INGEST_TOKEN');
  if (!process.env.GDRIVE_SA_JSON) throw new Error('falta GDRIVE_SA_JSON');

  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'caramujo-'));
  const artistas = (await filhos(PROJETOS))
    .filter((f) => f.mimeType === 'application/vnd.google-apps.folder')
    .filter((f) => !alvo.length || alvo.some((a) => a.toLowerCase() === f.name.toLowerCase()));

  if (alvo.length && !artistas.length) throw new Error('nenhum artista bateu com: ' + alvo.join(', '));
  console.log(`${artistas.length} pasta(s) de artista`);

  for (const artista of artistas) {
    const faixas = await catalogo(artista);
    if (!faixas.length) { console.log(`- ${artista.name}: sem faixa, pulei`); continue; }

    const p = await ingest('plan', {}, { folderId: artista.id, name: artista.name, tracks: faixas });
    console.log(`- ${artista.name}: ${faixas.length} faixa(s), ${p.need.length} pra converter`);

    for (const id of p.need) {
      const faixa = faixas.find((f) => f.id === id);
      try {
        const { buf, dur, bytes } = await converter(faixa, dir);
        await ingest('track', { id, dur: String(dur) }, buf, true);
        console.log(`    ok  ${faixa.title}  ${Math.round(dur)}s  ${(bytes / 1048576).toFixed(1)} MB`);
      } catch (e) {
        console.log(`    falhou  ${faixa.title}: ${e.message}`);
      }
    }

    const fim = await ingest('done', { folderId: artista.id }, { ids: faixas.map((f) => f.id) });
    console.log(`    link: ${SITE}${fim.link}`);
  }

  await fs.promises.rm(dir, { recursive: true, force: true });
}

main().catch((e) => { console.error('parou:', e.message); process.exit(1); });
