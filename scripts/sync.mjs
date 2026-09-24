// Conversor do catálogo: lê as pastas do Drive, converte o que falta
// e entrega ao site (functions/api/ingest.js), que guarda no R2 e no D1.
// Roda no GitHub Actions, nunca no navegador.
//
//   node scripts/sync.mjs                 -> todos os artistas + as beat tapes
//   node scripts/sync.mjs "nico2b,PUMA"   -> só esses
//   node scripts/sync.mjs "tapes"         -> só as beat tapes do @rideblan33
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
import { mesma } from '../functions/_lib/casar.js';   // o mesmo cruzamento que o site usa

const run = promisify(execFile);

const PROJETOS = process.env.PROJETOS_FOLDER_ID || '1wbIR0daNpWvZu5o6NiyrTkEJJkgHXgaH';
const SITE = (process.env.SITE_URL || 'https://caramujorecords.com.br').replace(/\/$/, '');
const TOKEN = process.env.INGEST_TOKEN;
// MP3 de 128k pra ouvir e pra baixar (25/09/2026). Tem que bater com KBPS do functions/api/ingest.js.
const KBPS = 128;
const AUDIO = /\.(wav|aiff?|flac|mp3|m4a)$/i;
const IMAGEM = /^image\/(jpeg|png|webp|heic|heif)$/i;
const IGNORAR = new Set(['shows', 'vídeos', 'videos', 'sessão de stu', 'sessao de stu']);

// Pastas que ficam de fora da passada geral. O portfólio do rideblan33 tem outra
// estrutura (beat tapes, exclusivos, free) e vai ser tratado à parte. Pedindo pelo
// nome na mão, converte assim mesmo.
const FORA_DA_GERAL = new Set(['@rideblan33', 'batalhas de rima']);

const alvo = (process.argv[2] || '').split(',').map((s) => s.trim()).filter(Boolean);

// "3/6" = terceiro lote de seis. Serve pra dividir a carga geral em vários
// jobs que rodam ao mesmo tempo, sem um passar por cima do outro.
const lote = (function () {
  const m = String(process.argv[3] || '').match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!m) return null;
  const parte = Number(m[1]), total = Number(m[2]);
  return parte >= 1 && total >= 1 && parte <= total ? { parte, total } : null;
})();

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

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// 500, 502, 503 e 429 do Google são quase sempre passageiros.
async function insiste(oque, tentativas = 4) {
  let ultimo;
  for (let i = 1; i <= tentativas; i++) {
    try {
      const r = await oque();
      if (r.ok || r.status === 206) return r;
      if (![429, 500, 502, 503, 504].includes(r.status)) return r;
      ultimo = new Error('respondeu ' + r.status);
    } catch (e) {
      ultimo = e;
    }
    if (i < tentativas) {
      const pausa = 1500 * Math.pow(2, i - 1);
      console.log(`    (o Drive tropeçou, tento de novo em ${pausa / 1000}s)`);
      await espera(pausa);
    }
  }
  throw ultimo || new Error('nao consegui falar com o Drive');
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
    const r = await insiste(async () => fetch('https://www.googleapis.com/drive/v3/files?' + q, {
      headers: { authorization: 'Bearer ' + (await gtoken()) }
    }));
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

  // a capa é a imagem mais recente solta na pasta do artista
  const capa = raiz
    .filter((f) => IMAGEM.test(f.mimeType || ''))
    .sort((a, b) => (a.modifiedTime < b.modifiedTime ? 1 : -1))[0] || null;

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
          if (g.mimeType === 'application/vnd.google-apps.folder') {
            // pasta de álbum dentro de "Já lançados" / "Já gravados" / "Guias".
            // Entra um nível só: o que está solto ali é a faixa; o que está mais
            // fundo (Remastered, Artes) fica de fora.
            if (IGNORAR.has(g.name.trim().toLowerCase())) continue;
            for (const h of await filhos(g.id)) {
              if (h.mimeType === 'application/vnd.google-apps.folder') continue;
              add(faixas, h, base.kind, regra.grp, regra.tag, true);
            }
            continue;
          }
          add(faixas, g, base.kind, regra.grp, regra.tag);
        }
      } else {
        add(faixas, f, base.kind, base.grp, base.tag);
      }
    }
  }
  return { faixas: semRepetir(faixas), capa };
}

// Mesma faixa solta e dentro da pasta do álbum: fica a solta.
function semRepetir(faixas) {
  const visto = new Map();
  for (const f of faixas) {
    const chave = f.kind + '|' + f.grp + '|' +
      String(f.title).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const antes = visto.get(chave);
    if (!antes || (antes.doAlbum && !f.doAlbum)) visto.set(chave, f);
  }
  return [...visto.values()];
}

/* ---------- o portfólio do @rideblan33 ---------- */

// Beat tape: pasta chapada, a capa dentro dela e os beats soltos.
// Sem subpasta, sem aba de músicas, sem tag vinda da pasta: quem decide
// se é "disponível" ou "vendido" é o site, cruzando com Exclusivos e com
// as pastas dos artistas.
async function catalogoTape(tape) {
  const dentro = await filhos(tape.id);
  const capa = dentro
    .filter((f) => IMAGEM.test(f.mimeType || ''))
    .sort((a, b) => (a.modifiedTime < b.modifiedTime ? 1 : -1))[0] || null;

  const faixas = [];
  for (const f of dentro) {
    if (f.mimeType === 'application/vnd.google-apps.folder') continue;
    add(faixas, f, 'beat', 'res', null);
  }
  return { faixas, capa };
}

// Acha "Beat tapes" e "Beats disponíveis > Exclusivos" dentro do @rideblan33.
async function portfolio() {
  const ride = (await filhos(PROJETOS))
    .find((f) => f.name.trim().toLowerCase() === '@rideblan33');
  if (!ride) return { tapes: [], exclusivos: null };

  const dentro = await filhos(ride.id);
  const eh = (f, ...nomes) => nomes.includes(f.name.trim().toLowerCase());
  const pastaTapes = dentro.find((f) => eh(f, 'beat tapes'));
  const pastaDisp = dentro.find((f) => eh(f, 'beats disponíveis', 'beats disponiveis'));

  const tapes = pastaTapes
    ? (await filhos(pastaTapes.id))
        .filter((f) => f.mimeType === 'application/vnd.google-apps.folder')
    : [];

  const exclusivos = pastaDisp
    ? (await filhos(pastaDisp.id)).find((f) => eh(f, 'exclusivos')) || null
    : null;

  return { tapes, exclusivos };
}

// Exceção combinada com o Bruno (22/09/2026): beat que o site vende e que não existe
// em NENHUM catálogo (só em Exclusivos) ganha o MP3 puxado direto de lá, pra prateleira
// interna 'vitrine'. Só esses: o resto reaproveita o áudio que já está guardado.
async function vitrineAvulsa(pasta, dir) {
  const { faltam, tenho } = await ingest('faltando', {}, {});
  const guardados = new Set(tenho || []);

  const faixas = [];
  for (const f of await filhos(pasta.id)) {
    if (!AUDIO.test(f.name)) continue;
    const { title, bpm, key } = parseName(f.name);
    const precisa = guardados.has(f.id) || (faltam || []).some((b) => mesma(b, { title, bpm, key }));
    if (!precisa) continue;
    faixas.push({
      id: f.id, title, kind: 'beat', grp: 'res', tag: null, bpm, key,
      wavBytes: Number(f.size || 0), modified: f.modifiedTime, fileName: f.name
    });
  }

  if (!faixas.length) {
    console.log(`Vitrine: todo beat do site já tem áudio guardado (${(faltam || []).length} sem par em Exclusivos)`);
    return;
  }

  const p = await ingest('plan', {}, {
    folderId: pasta.id, name: 'Beats à venda (interno)', tipo: 'vitrine', tracks: faixas
  });
  console.log(`Vitrine: ${faixas.length} beat(s) que só existem em Exclusivos, ${p.need.length} pra converter`);

  for (const id of p.need) {
    const faixa = faixas.find((f) => f.id === id);
    try {
      const { buf, dur, bytes } = await converter(faixa, dir);
      await ingest('track', { id, dur: String(dur), kbps: String(KBPS) }, buf, true);
      console.log(`    ok  ${faixa.title}  ${Math.round(dur)}s  ${(bytes / 1048576).toFixed(1)} MB`);
    } catch (e) {
      console.log(`    falhou  ${faixa.title}: ${e.message}`);
    }
  }

  await ingest('done', { folderId: pasta.id }, { ids: faixas.map((f) => f.id), capa: null });

  const sobrando = (faltam || []).filter((b) => !faixas.some((f) => mesma(b, f)));
  if (sobrando.length) {
    console.log(`Vitrine: ${sobrando.length} beat(s) do site continuam sem áudio (nome diferente no Drive):`);
    for (const b of sobrando.slice(0, 20)) console.log('    - ' + b.title);
  }
}

// A lista do que ainda está à venda. Vai pro site uma vez por rodada.
async function mandarExclusivos(pasta) {
  const beats = [];
  for (const f of await filhos(pasta.id)) {
    if (!AUDIO.test(f.name)) continue;
    const { title, bpm, key } = parseName(f.name);
    beats.push({ title, bpm, key });
  }
  await ingest('exclusivos', {}, { beats });
  console.log(`Exclusivos: ${beats.length} beat(s) à venda`);
}

function add(lista, f, kind, grp, tag, doAlbum = false) {
  if (!AUDIO.test(f.name)) return;
  const { title, bpm, key } = parseName(f.name);
  lista.push({
    id: f.id, title, kind, grp, tag, doAlbum,
    bpm: kind === 'beat' ? bpm : null,
    key: kind === 'beat' ? key : null,
    wavBytes: Number(f.size || 0),
    modified: f.modifiedTime,
    fileName: f.name
  });
}

/* ---------- conversão ---------- */

async function converter(faixa, dir) {
  const bruto = path.join(dir, faixa.id + '.fonte' + (path.extname(faixa.fileName) || '.wav'));
  const leve = path.join(dir, faixa.id + '.leve.mp3');

  const r = await insiste(async () => fetch(`https://www.googleapis.com/drive/v3/files/${faixa.id}?alt=media&supportsAllDrives=true`, {
    headers: { authorization: 'Bearer ' + (await gtoken()) }
  }));
  if (!r.ok) throw new Error('download falhou (' + r.status + ')');
  await fs.promises.writeFile(bruto, Buffer.from(await r.arrayBuffer()));

  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', bruto,
    '-vn', '-c:a', 'libmp3lame', '-b:a', KBPS + 'k', '-ar', '44100', leve]);

  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries',
    'format=duration', '-of', 'csv=p=0', leve]);

  const bytes = (await fs.promises.stat(leve)).size;
  const buf = await fs.promises.readFile(leve);
  await fs.promises.rm(bruto, { force: true });
  await fs.promises.rm(leve, { force: true });
  return { buf, dur: Number(stdout.trim()) || 0, bytes };
}

async function capinha(arquivo, dir) {
  const bruto = path.join(dir, arquivo.id + '.fonte');
  const quadrado = path.join(dir, arquivo.id + '.capa.jpg');

  const r = await insiste(async () => fetch(`https://www.googleapis.com/drive/v3/files/${arquivo.id}?alt=media&supportsAllDrives=true`, {
    headers: { authorization: 'Bearer ' + (await gtoken()) }
  }));
  if (!r.ok) throw new Error('download da capa falhou (' + r.status + ')');
  await fs.promises.writeFile(bruto, Buffer.from(await r.arrayBuffer()));

  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', bruto,
    '-vf', 'scale=1000:1000:force_original_aspect_ratio=increase,crop=1000:1000',
    '-q:v', '4', quadrado]);

  // a miniatura sai da grande já recortada: 200px cobre a capa de 96px do
  // destaque em tela de celular (2x) e sobra pras de 34-46px da lista
  const pequena = path.join(dir, arquivo.id + '.capa-p.jpg');
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', quadrado,
    '-vf', 'scale=200:200', '-q:v', '5', pequena]);

  const grande = await fs.promises.readFile(quadrado);
  const mini = await fs.promises.readFile(pequena);
  for (const f of [bruto, quadrado, pequena]) await fs.promises.rm(f, { force: true });
  return { grande, mini };
}

/* ---------- conversa com o site ---------- */

async function ingest(op, params, body, binario = false) {
  const q = new URLSearchParams({ op, ...params });
  const r = await insiste(() => fetch(`${SITE}/api/ingest?${q}`, {
    method: 'POST',
    headers: {
      'x-ingest-token': TOKEN,
      'content-type': binario ? (op === 'capa' ? 'image/jpeg' : 'audio/mpeg') : 'application/json'
    },
    body: binario ? body : JSON.stringify(body)
  }));
  const txt = await r.text();
  if (!r.ok) throw new Error(`site respondeu ${r.status}: ${txt.slice(0, 300)}`);
  return JSON.parse(txt);
}

/* ---------- principal ---------- */

async function main() {
  if (!TOKEN) throw new Error('falta INGEST_TOKEN');
  if (!process.env.GDRIVE_SA_JSON) throw new Error('falta GDRIVE_SA_JSON');

  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'caramujo-'));

  // "tapes" sozinho no pedido = só o portfólio; o resto casa por nome.
  const soTapes = alvo.length === 1 && alvo[0].toLowerCase() === 'tapes';
  const pedido = (nome) => alvo.some((a) => a.toLowerCase() === nome.trim().toLowerCase());

  const artistas = soTapes ? [] : (await filhos(PROJETOS))
    .filter((f) => f.mimeType === 'application/vnd.google-apps.folder')
    .filter((f) => alvo.length ? pedido(f.name) : !FORA_DA_GERAL.has(f.name.trim().toLowerCase()))
    .map((f) => ({ ...f, tipo: 'artista' }));

  const { tapes: todasTapes, exclusivos } = await portfolio();
  const tapes = todasTapes
    .filter((f) => (alvo.length && !soTapes) ? pedido(f.name) : true)
    .map((f) => ({ ...f, tipo: 'tape' }));

  const pastas = [...artistas, ...tapes];
  if (alvo.length && !pastas.length) throw new Error('nada bateu com: ' + alvo.join(', '));

  let fila = pastas;
  if (lote) {
    fila = pastas.filter((_, i) => i % lote.total === lote.parte - 1);
    console.log(`lote ${lote.parte} de ${lote.total}: ${fila.length} de ${pastas.length} pastas`);
  } else {
    console.log(`${artistas.length} pasta(s) de artista e ${tapes.length} beat tape(s)`);
  }

  // O site precisa da lista de Exclusivos pra saber o que ainda está à venda.
  if (fila.some((f) => f.tipo === 'tape')) {
    if (exclusivos) {
      try { await mandarExclusivos(exclusivos); }
      catch (e) { console.log(`- Exclusivos: não consegui ler (${e.message}). As tapes vão pra revisão.`); }
    } else {
      console.log('- não achei a pasta Exclusivos; as tapes vão pra revisão.');
    }
  }

  const tropecos = [];

  for (const pasta of fila) {
    try {
      await umaPasta(pasta, dir);
    } catch (e) {
      tropecos.push(`${pasta.name}: ${e.message}`);
      console.log(`- ${pasta.name}: parou no meio (${e.message}). Sigo com os outros.`);
    }
  }

  // Passada da vitrine: só na rodada inteira ou no job das tapes. Num lote da carga
  // geral não roda, senão as 6 frentes fariam a mesma coisa ao mesmo tempo.
  if (exclusivos && (soTapes || (!alvo.length && !lote))) {
    try { await vitrineAvulsa(exclusivos, dir); }
    catch (e) { console.log(`- vitrine: não consegui (${e.message})`); tropecos.push('vitrine: ' + e.message); }
  }

  // Faxina da prateleira: roda quando a rodada passou por tudo (madrugada, "Converter
  // tudo" ou o job final da carga geral). Apaga do R2 o que nenhum catálogo usa mais.
  if (!tropecos.length && (soTapes || (!alvo.length && !lote))) {
    try {
      const f = await ingest('faxina', {}, {});
      console.log(`- faxina da prateleira: ${f.apagados} arquivo(s) sem uso apagado(s), ${(f.liberados / 1048576).toFixed(1)} MB liberados (${f.vistos} conferidos)`);
    } catch (e) { console.log(`- faxina: não consegui (${e.message})`); }
  }

  await fs.promises.rm(dir, { recursive: true, force: true });

  if (tropecos.length) {
    console.log(`\n${tropecos.length} pasta(s) ficaram pela metade:`);
    for (const t of tropecos) console.log('  - ' + t);
    console.log('Rodar de novo continua de onde parou.');
    process.exitCode = 1;
  } else {
    console.log('\nTudo convertido.');
  }
}

async function umaPasta(pasta, dir) {
  const tape = pasta.tipo === 'tape';
  const { faixas, capa } = tape ? await catalogoTape(pasta) : await catalogo(pasta);
  const rotulo = tape ? `tape ${pasta.name}` : pasta.name;

  if (!faixas.length) { console.log(`- ${rotulo}: sem faixa, pulei`); return; }

  const p = await ingest('plan', {}, {
    folderId: pasta.id, name: pasta.name, tipo: pasta.tipo || 'artista', tracks: faixas
  });
  console.log(`- ${rotulo}: ${faixas.length} faixa(s), ${p.need.length} pra converter`);

  if (tape && p.venda) {
    console.log(`    ${p.venda.disponivel} disponível(is), ${p.venda.vendido} vendido(s), ${p.venda.revisar} pra revisar`);
  }

  for (const id of p.need) {
    const faixa = faixas.find((f) => f.id === id);
    try {
      const { buf, dur, bytes } = await converter(faixa, dir);
      await ingest('track', { id, dur: String(dur), kbps: String(KBPS) }, buf, true);
      console.log(`    ok  ${faixa.title}  ${Math.round(dur)}s  ${(bytes / 1048576).toFixed(1)} MB`);
    } catch (e) {
      console.log(`    falhou  ${faixa.title}: ${e.message}`);
    }
  }

  let capaChave = null;
  if (capa && capa.id === p.capaAtual) {
    capaChave = capa.id;                       // já está na prateleira, não baixa de novo
    if (p.capaMini === false) {                // subiu antes de existir miniatura
      try {
        const { mini } = await capinha(capa, dir);
        await ingest('capa', { folderId: pasta.id, chave: capa.id, tam: 'p' }, mini, true);
        console.log(`    miniatura da capa: ${capa.name}`);
      } catch (e) {
        console.log(`    miniatura falhou (${capa.name}): ${e.message}`);
      }
    }
  } else if (capa) {
    try {
      const { grande, mini } = await capinha(capa, dir);
      await ingest('capa', { folderId: pasta.id, chave: capa.id }, grande, true);
      await ingest('capa', { folderId: pasta.id, chave: capa.id, tam: 'p' }, mini, true);
      capaChave = capa.id;
      console.log(`    capa: ${capa.name}`);
    } catch (e) {
      console.log(`    capa falhou (${capa.name}): ${e.message}`);
    }
  } else {
    console.log('    sem imagem na pasta, fica o logo da Caramujo');
  }

  const fim = await ingest('done', { folderId: pasta.id }, {
    ids: faixas.map((f) => f.id),
    capa: capaChave
  });
  console.log(`    link: ${SITE}${fim.link}`);
}

main().catch((e) => { console.error('parou:', e.message); process.exit(1); });
