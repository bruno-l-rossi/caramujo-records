// A vitrine pro navegador: os beats à venda do site com o endereço do MP3 que já está
// guardado no R2. É o que vai deixar o site tocar do Drive, no lugar do SoundCloud.
// Público e de leitura: o áudio já é público nos catálogos.

import { db, json } from '../_lib/db.js';
import { vitrine } from '../_lib/vitrine.js';
import { mesma, limpo } from '../_lib/casar.js';

const VALIDADE = 5 * 60 * 1000;
let cache = { at: 0, dados: null };

// Cópia da região (5 min): todos os isolates daquela região usam a mesma, e o
// banco (que varre as faixas) é lido uma vez a cada 5 minutos por região.
const REGIAO = '/__cache/vitrine';
const regiaoCache = () => (typeof caches !== 'undefined' && caches.default ? caches.default : null);

// O painel publicou/tirou beat: a memória deste isolate e a cópia da região do
// Bruno caem na hora, pra ele ver o beat novo tocando sem esperar 5 minutos.
export async function esquecerApiVitrine(request) {
  cache = { at: 0, dados: null };
  const c = regiaoCache();
  if (c && request) { try { await c.delete(new URL(REGIAO, request.url)); } catch (_) { /* bônus */ } }
}

export async function onRequestGet({ request, env }) {
  const chave = new URL(REGIAO, request.url);
  const regiao = regiaoCache();
  if (regiao) {
    try { const c = await regiao.match(chave); if (c) return c; } catch (_) { /* segue */ }
  }
  const dados = await montarVitrine(request, env);
  if (!dados) return json({ erro: 'nao consegui ler a lista de beats do site' }, 502);
  const r = resposta(dados);
  if (regiao && !dados.reserva) {
    try { await regiao.put(chave, r.clone()); } catch (_) { /* cópia é bônus */ }
  }
  return r;
}

// A lista pronta (beat + MP3 + capa). Também usada pelo link de beat (/b/<slug>).
// Plano B (26/09/2026): toda lista boa vai pro cache da Cloudflare como reserva.
// Se montar falhar (banco fora do ar, bug, limite do dia no D1), devolvo a última
// reserva, marcada com .reserva = true. Sem reserva, null (a API responde 502 e o
// navegador usa a cópia dele).
export async function montarVitrine(request, env) {
  if (cache.dados && Date.now() - cache.at < VALIDADE) return cache.dados;
  let dados = null;
  try {
    dados = await montar(request, env);
  } catch (e) {
    console.error('vitrine falhou', e && e.message);
  }
  if (dados) {
    cache = { at: Date.now(), dados };
    await guardarReserva(request, dados);
    return dados;
  }
  return lerReserva(request);
}

const RESERVA = '/__reserva/vitrine';
const temCache = () => typeof caches !== 'undefined' && caches.default;

async function guardarReserva(request, dados) {
  if (!temCache()) return;
  try {
    await caches.default.put(new URL(RESERVA, request.url), new Response(JSON.stringify(dados), {
      headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=2592000' }
    }));
  } catch (_) { /* reserva é bônus: sem ela a vitrine segue igual */ }
}

async function lerReserva(request) {
  if (!temCache()) return null;
  try {
    const r = await caches.default.match(new URL(RESERVA, request.url));
    if (!r) return null;
    const dados = await r.json();
    if (!Array.isArray(dados) || !dados.length) return null;
    dados.reserva = true;
    return dados;
  } catch (_) {
    return null;
  }
}

async function montar(request, env) {
  const beats = (await vitrine(request, env)).filter((b) => !b.removido);
  if (!beats.length) return null;

  const d = await db(env);
  const { results } = await d.prepare(
    `SELECT t.id, t.title, t.bpm, t.mkey AS key, t.dur, a.tipo, a.cover_key
       FROM tracks t JOIN artists a ON a.id = t.artist_id
      WHERE t.kind = 'beat' AND t.ready = 1`
  ).all();

  const porTitulo = new Map();
  for (const f of results || []) {
    const k = limpo(f.title);
    if (!porTitulo.has(k)) porTitulo.set(k, []);
    porTitulo.get(k).push(f);
  }

  const dados = beats.map((b) => {
    const candidatos = (porTitulo.get(limpo(b.name)) || []).filter((x) => mesma(b, x));
    // A capa do beat é a arte da BEAT TAPE onde ele está, que é arte do Bruno.
    // Capa de pasta de artista é foto do artista, não do beat: essa não serve.
    const comCapa = candidatos.find((x) => x.tipo === 'tape' && x.cover_key) || null;
    const f = comCapa || candidatos[0] || null;
    return {
      id: b.id, name: b.name, slug: b.slug, bpm: b.bpm, key: b.key,
      genre: b.genre, genero: b.generoLabel || b.genre || '', sold: b.sold,
      mp3: f ? '/audio/' + f.id : null,
      capa: comCapa ? '/capa/' + comCapa.cover_key : null,
      dur: f ? (f.dur || 0) : 0
    };
  });

  return dados;
}

function resposta(dados) {
  return json(
    {
      beats: dados,
      comAudio: dados.filter((b) => b.mp3).length,
      comCapa: dados.filter((b) => b.capa).length,
      total: dados.length,
      ...(dados.reserva ? { reserva: true } : {})
    },
    200,
    // a reserva vale por 1 minuto: assim que o banco voltar, a lista nova aparece
    { 'cache-control': dados.reserva ? 'public, max-age=60' : 'public, max-age=300' }
  );
}
