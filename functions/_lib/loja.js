// A loja do site: beats à venda, cupons e o destaque do hero.
//
// Até 24/09/2026 a lista morava escrita no index.html (const BEATS) e os cupons em
// functions/coupons.json, e cada venda virava commit no GitHub + redeploy. Agora
// tudo mora no D1 (tabelas beats, cupons, cupom_uso e a chave 'destaque' na meta).
// O index.html continua com a lista antiga escrita: ela só serve pra importação
// da primeira vez e pra cobrir uma venda que o webhook antigo commitou depois.
// Quem abre o site recebe a lista do banco: functions/index.js troca o bloco
// const BEATS pela lista daqui (injetar()).

import { db, now } from './db.js';

/* ---------- o que ainda vem do index.html servido ---------- */

// Lista escrita no index.html ({id:N, name:'...', ...}). Aceita aspa simples ou dupla.
export function parseBeats(html) {
  const ini = html.indexOf('const BEATS=[');
  if (ini < 0) return [];
  const fim = html.indexOf('];', ini);
  if (fim < 0) return [];
  const bloco = html.slice(ini, fim);

  const beats = [];
  const entrada = /\{\s*id:\s*(\d+)\s*,([^}]*)\}/g;
  let m;
  while ((m = entrada.exec(bloco))) {
    const resto = m[2];
    const texto = (chave) => {
      const t = resto.match(new RegExp(chave + ":\\s*'((?:[^'\\\\]|\\\\.)*)'")) ||
                resto.match(new RegExp(chave + ':\\s*"((?:[^"\\\\]|\\\\.)*)"'));
      return t ? t[1].replace(/\\(.)/g, '$1') : null;
    };
    const numero = (chave) => {
      const t = resto.match(new RegExp(chave + ':\\s*(\\d+)'));
      return t ? Number(t[1]) : null;
    };
    const name = texto('name');
    if (!name) continue;
    beats.push({
      id: Number(m[1]), name, bpm: numero('bpm'), key: texto('key'),
      genre: texto('genre'), sold: /sold:\s*true/.test(resto)
    });
  }
  return beats;
}

// O site escreve o gênero em código ('boombap') e o nome bonito noutra lista.
export function parseGeneros(html) {
  const m = html.match(/const GENRE_LABELS\s*=\s*\{([^}]*)\}/);
  const mapa = {};
  if (!m) return mapa;
  const re = /'([^']+)'\s*:\s*'([^']*)'/g;
  let p;
  while ((p = re.exec(m[1]))) mapa[p[1]] = p[2];
  return mapa;
}

export function parseDestaque(html) {
  const id = html.match(/const FEATURED_OVERRIDE_ID\s*=\s*(\d+|null|0|'')\s*;/);
  const ate = html.match(/const FEATURED_OVERRIDE_ATE\s*=\s*'([^']*)'\s*;/);
  const n = id && /^\d+$/.test(id[1]) ? Number(id[1]) : null;
  return { id: n || null, ate: ate ? ate[1] : '' };
}

const VALIDADE_ESTATICO = 10 * 60 * 1000;     // o index.html só muda quando o Bruno publica
let estatico = { at: 0, dados: null };

// O Pages pode responder /index.html com redirecionamento pra "/": tento os dois.
export async function paginaEstatica(request, env) {
  let ultimo = 0;
  for (const caminho of ['/index.html', '/']) {
    const r = await env.ASSETS.fetch(new URL(caminho, request.url));
    if (r.ok) return r.text();
    ultimo = r.status;
  }
  throw new Error('index.html respondeu ' + ultimo);
}

export async function lerEstatico(request, env) {
  if (estatico.dados && Date.now() - estatico.at < VALIDADE_ESTATICO) return estatico.dados;
  const html = await paginaEstatica(request, env);
  const p = html.match(/const PRICE_BEAT\s*=\s*(\d+)/);
  const dados = {
    html,
    beats: parseBeats(html),
    generos: parseGeneros(html),
    destaque: parseDestaque(html),
    preco: p ? Number(p[1]) : null
  };
  estatico = { at: Date.now(), dados };
  return dados;
}

/* ---------- importação da primeira vez ---------- */

// Retrato do functions/coupons.json em 24/09/2026. Só entra se o GitHub não
// responder na hora da importação (o normal é ler o arquivo de lá, com os usos
// do momento).
const CUPONS_RETRATO = {
  CARAMUJO25: { pct: 25, maxUses: 10, uses: 2 },
  RIDE20: { pct: 20, maxUses: null, uses: 1 },
  PAGUPAGU: { fixedPrice: 1, maxUses: 2, uses: 2 },
  SABER50: { pct: 50, maxUses: 1, uses: 1 }
};

async function cuponsDoGitHub(env) {
  if (!env.GITHUB_TOKEN) return null;
  try {
    const r = await fetch(
      'https://api.github.com/repos/bruno-l-rossi/caramujo-records/contents/functions/coupons.json?ref=main',
      { headers: {
        Authorization: 'Bearer ' + env.GITHUB_TOKEN,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'caramujo-records-loja/1.0'
      } }
    );
    if (!r.ok) return null;
    const { content } = await r.json();
    const texto = decodeURIComponent(escape(atob(String(content || '').replace(/\n/g, ''))));
    const j = JSON.parse(texto);
    return j && typeof j === 'object' ? j : null;
  } catch (_) {
    return null;
  }
}

let importada = false;

// Roda uma vez na vida do banco (marca 'loja-importada' na meta). Tudo com
// INSERT OR IGNORE: duas chamadas ao mesmo tempo não duplicam nada.
export async function garantirLoja(request, env, d) {
  if (importada) return;
  const feito = await d.prepare("SELECT valor FROM meta WHERE chave = 'loja-importada'").first();
  if (feito) { importada = true; return; }

  const est = await lerEstatico(request, env);
  if (!est.beats.length) throw new Error('não achei a lista de beats no index.html pra importar');

  const quando = now();
  // 11 beats por INSERT: 99 valores, abaixo do teto de 100 do D1
  const POR = 11;
  const lotes = [];
  for (let i = 0; i < est.beats.length; i += POR) {
    const parte = est.beats.slice(i, i + POR);
    lotes.push(d.prepare(
      'INSERT OR IGNORE INTO beats (id, name, bpm, mkey, genre, sold, sold_por, ordem, criado_em) VALUES ' +
      parte.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')
    ).bind(...parte.flatMap((b, j) => [
      b.id, b.name, b.bpm, b.key || null, b.genre || 'trap', b.sold ? 1 : 0,
      b.sold ? 'site-antigo' : null, i + j, quando
    ])));
  }

  const cupons = (await cuponsDoGitHub(env)) || CUPONS_RETRATO;
  for (const [codigo, c] of Object.entries(cupons)) {
    if (!c || typeof c !== 'object') continue;
    const fixo = c.fixedPrice !== undefined && c.fixedPrice !== null;
    lotes.push(d.prepare(
      'INSERT OR IGNORE INTO cupons (codigo, pct, preco_fixo, max_usos, usos, ativo, criado_em) VALUES (?, ?, ?, ?, ?, 1, ?)'
    ).bind(
      String(codigo).trim().toUpperCase().slice(0, 30),
      fixo ? null : Number(c.pct) || 0,
      fixo ? Number(c.fixedPrice) : null,
      c.maxUses === null || c.maxUses === undefined ? null : Number(c.maxUses),
      Number(c.uses) || 0,
      quando
    ));
  }

  if (est.destaque.id) {
    lotes.push(d.prepare("INSERT OR IGNORE INTO meta (chave, valor) VALUES ('destaque', ?)")
      .bind(JSON.stringify(est.destaque)));
  }
  lotes.push(d.prepare("INSERT OR IGNORE INTO meta (chave, valor) VALUES ('loja-importada', ?)").bind(quando));
  await d.batch(lotes);
  importada = true;
}

/* ---------- leitura ---------- */

export async function lerBeats(d) {
  const { results } = await d.prepare(
    `SELECT id, name, bpm, mkey AS key, genre, sold, sold_at, sold_por, unsold_at, ordem, track_id
       FROM beats ORDER BY ordem, id`
  ).all();
  return (results || []).map((b) => ({ ...b, sold: b.sold ? 1 : 0 }));
}

export async function lerDestaque(d) {
  const r = await d.prepare("SELECT valor FROM meta WHERE chave = 'destaque'").first();
  if (!r) return null;
  try {
    const j = JSON.parse(r.valor);
    return { id: Number(j.id) || null, ate: /^\d{4}-\d{2}-\d{2}$/.test(j.ate || '') ? j.ate : '' };
  } catch (_) { return null; }
}

// Venda que o webhook ANTIGO commitou no index.html depois da importação (a janela
// entre o push do Bruno e o deploy novo). Só vai na direção de vendido, e nunca por
// cima de um "desfazer vendido" do painel.
async function reconciliar(d, est, beats) {
  const noBanco = new Map(beats.map((b) => [b.id, b]));
  const ids = est.beats
    .filter((s) => s.sold)
    .map((s) => noBanco.get(s.id))
    .filter((b) => b && !b.sold && !b.unsold_at)
    .map((b) => b.id);
  if (!ids.length) return false;
  await d.prepare(
    `UPDATE beats SET sold = 1, sold_at = ?, sold_por = 'site-antigo' WHERE sold = 0 AND unsold_at IS NULL AND id IN (${ids.map(() => '?').join(', ')})`
  ).bind(now(), ...ids).run();
  return true;
}

/* ---------- a lista que vai dentro da página ---------- */

const VALIDADE_PAGINA = 60 * 1000;   // venda some da lista em até 1 minuto
let pagina = { at: 0, dados: null };
const RESERVA = '/__reserva/loja';
const temCache = () => typeof caches !== 'undefined' && caches.default;

export function esquecerLoja() { pagina = { at: 0, dados: null }; }

// {lista:[{id,name,bpm,key,genre,sold}], destaque:{id,ate}|null}
// Falhou o banco: a última lista boa (cache da Cloudflare, 30 dias). Sem ela, null.
export async function lojaParaPagina(request, env) {
  if (pagina.dados && Date.now() - pagina.at < VALIDADE_PAGINA) return pagina.dados;
  try {
    const d = await db(env);
    await garantirLoja(request, env, d);
    let beats = await lerBeats(d);
    try {
      const est = await lerEstatico(request, env);
      if (await reconciliar(d, est, beats)) beats = await lerBeats(d);
    } catch (_) { /* reconciliar é bônus */ }
    if (!beats.length) throw new Error('lista vazia no banco');
    const dados = {
      lista: beats.map((b) => ({ id: b.id, name: b.name, bpm: b.bpm, key: b.key || '', genre: b.genre, sold: !!b.sold })),
      destaque: await lerDestaque(d)
    };
    pagina = { at: Date.now(), dados };
    await guardarReserva(request, dados);
    return dados;
  } catch (e) {
    console.error('loja fora do banco', e && e.message);
    if (pagina.dados) return pagina.dados;     // a cópia da memória vale mais que nada
    return lerReserva(request);
  }
}

async function guardarReserva(request, dados) {
  if (!temCache()) return;
  try {
    await caches.default.put(new URL(RESERVA, request.url), new Response(JSON.stringify(dados), {
      headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=2592000' }
    }));
  } catch (_) { /* reserva é bônus */ }
}

async function lerReserva(request) {
  if (!temCache()) return null;
  try {
    const r = await caches.default.match(new URL(RESERVA, request.url));
    if (!r) return null;
    const dados = await r.json();
    return dados && Array.isArray(dados.lista) && dados.lista.length ? dados : null;
  } catch (_) { return null; }
}

// Texto seguro dentro de <script>: aspas do JSON e nada de "</script>".
const L_SEP = String.fromCharCode(0x2028), P_SEP = String.fromCharCode(0x2029);
const js = (s) => JSON.stringify(String(s == null ? '' : s))
  .replace(/</g, '\\u003c').split(L_SEP).join('\\u2028').split(P_SEP).join('\\u2029');

// Troca a lista escrita no index.html pela do banco. lista = null: loja fora do ar
// (lista vazia + aviso; lista velha pode anunciar beat já vendido).
export function injetar(html, dados) {
  const ini = html.indexOf('const BEATS=[');
  const fim = ini < 0 ? -1 : html.indexOf('];', ini);
  if (ini < 0 || fim < 0) return html;
  const lista = dados && Array.isArray(dados.lista) ? dados.lista : [];
  const linhas = lista.map((b) =>
    '  {id:' + Number(b.id) + ', name:' + js(b.name) + ', bpm:' + (Number(b.bpm) || 0) +
    ', key:' + js(b.key) + ', genre:' + js(b.genre) + ', sold:' + (b.sold ? 'true' : 'false') + '}'
  ).join(',\n');
  let saida = html.slice(0, ini) + 'const BEATS=[\n' + linhas + '\n];' +
    (lista.length ? '' : '\nwindow.__LOJA_FORA=true;') + html.slice(fim + 2);

  const dest = dados && dados.destaque;
  if (dest) {
    saida = saida
      .replace(/const FEATURED_OVERRIDE_ID\s*=\s*[^;]*;/, 'const FEATURED_OVERRIDE_ID=' + (Number(dest.id) || 'null') + ';')
      .replace(/const FEATURED_OVERRIDE_ATE\s*=\s*'[^']*'\s*;/, "const FEATURED_OVERRIDE_ATE='" +
        (/^\d{4}-\d{2}-\d{2}$/.test(dest.ate || '') ? dest.ate : '') + "';");
  }
  return saida;
}

/* ---------- venda e cupom ---------- */

// Nome que chega do carrinho ("NOME", "NOME + Stems", "NOME x2") vira o nome do beat.
export const nomeDoBeat = (s) => String(s || '').replace(/ \+ Stems$/i, '').replace(/ x\d+$/, '').trim();

export async function vendidosEntre(d, nomes) {
  const limpos = [...new Set(nomes.map(nomeDoBeat).filter(Boolean))].slice(0, 60);
  if (!limpos.length) return [];
  const { results } = await d.prepare(
    `SELECT name FROM beats WHERE sold = 1 AND name COLLATE NOCASE IN (${limpos.map(() => '?').join(', ')})`
  ).bind(...limpos).all();
  return (results || []).map((r) => r.name);
}

// Marca vendido os beats pelo nome. Devolve {marcados, naoAchei}.
export async function marcarVendidos(d, nomes, pagamento) {
  const limpos = [...new Set(nomes.map(nomeDoBeat).filter(Boolean))].slice(0, 60);
  if (!limpos.length) return { marcados: [], naoAchei: [] };
  const vagas = limpos.map(() => '?').join(', ');
  const { results } = await d.prepare(
    `SELECT id, name, sold FROM beats WHERE name COLLATE NOCASE IN (${vagas})`
  ).bind(...limpos).all();
  const achados = results || [];
  const naoAchei = limpos.filter((n) => !achados.some((b) => b.name.toLowerCase() === n.toLowerCase()));
  const ids = achados.filter((b) => !b.sold).map((b) => b.id);
  if (ids.length) {
    await d.prepare(
      `UPDATE beats SET sold = 1, sold_at = ?, sold_por = ?, unsold_at = NULL WHERE sold = 0 AND id IN (${ids.map(() => '?').join(', ')})`
    ).bind(now(), 'site:' + String(pagamento || ''), ...ids).run();
    esquecerLoja();
  }
  return { marcados: achados.filter((b) => ids.includes(b.id)).map((b) => b.name), naoAchei };
}

export async function lerCupom(d, codigo) {
  const c = String(codigo || '').trim().toUpperCase().slice(0, 30);
  if (!c) return null;
  return d.prepare('SELECT * FROM cupons WHERE codigo = ?').bind(c).first();
}

// 'ok' | 'not_found' | 'expired'. Cupom pausado no painel responde como esgotado.
export function situacaoCupom(c) {
  if (!c) return 'not_found';
  if (!c.ativo) return 'expired';
  if (c.max_usos !== null && c.max_usos !== undefined && Number(c.usos || 0) >= Number(c.max_usos)) return 'expired';
  return 'ok';
}

// Conta o uso uma vez por pagamento, mesmo com o webhook chegando repetido.
export async function usarCupom(d, codigo, pagamento, valor) {
  const c = String(codigo || '').trim().toUpperCase().slice(0, 30);
  if (!c || !pagamento) return false;
  const r = await d.prepare(
    'INSERT OR IGNORE INTO cupom_uso (codigo, pagamento, valor, at) VALUES (?, ?, ?, ?)'
  ).bind(c, String(pagamento), Number(valor) || null, now()).run();
  const mudou = Number((r && r.meta && r.meta.changes) || 0) > 0;
  if (mudou) await d.prepare('UPDATE cupons SET usos = usos + 1 WHERE codigo = ?').bind(c).run();
  return mudou;
}
