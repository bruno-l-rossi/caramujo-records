// A loja do site: beats à venda, cupons e o destaque do hero, no D1 (tabelas
// beats, cupons, cupom_uso e a chave 'destaque' na meta). Até 24/09/2026 isso era
// const BEATS escrito no index.html e functions/coupons.json no GitHub; a
// importação rodou uma vez e o código dela saiu na limpeza da mesma data.
// Quem abre o site recebe a lista daqui: functions/index.js troca o bloco
// const BEATS (vazio no arquivo) pela lista do banco (injetar()).

import { db, now } from './db.js';

/* ---------- o que ainda vem do index.html servido ---------- */

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

// A tabela de preço que a página mostra: PRICE_BEAT/PRICE_STEMS e os botões
// addPkg('2 Beats',219) / addSvc('Mixagem',149). O servidor refaz a conta do
// carrinho com ela (create-payment), então a página e a cobrança nunca divergem.
// Nome com dois preços diferentes na página vira null (ambíguo: recusa).
export function parsePrecos(html) {
  const num = (re) => { const m = html.match(re); return m ? Number(m[1]) : null; };
  const tabela = (fn) => {
    const achados = {};
    const re = new RegExp('onclick="[^"]*' + fn + "\\(\\s*'([^']*)'\\s*,\\s*(\\d+(?:\\.\\d+)?)", 'g');
    let m;
    while ((m = re.exec(html))) (achados[m[1]] = achados[m[1]] || new Set()).add(Number(m[2]));
    const mapa = {};
    for (const [k, v] of Object.entries(achados)) mapa[k] = v.size === 1 ? [...v][0] : null;
    return mapa;
  };
  return {
    beat: num(/const PRICE_BEAT\s*=\s*(\d+(?:\.\d+)?)/),
    stems: num(/PRICE_STEMS\s*=\s*(\d+(?:\.\d+)?)/),
    pacotes: tabela('addPkg'),
    servicos: tabela('addSvc')
  };
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
  const dados = { html, generos: parseGeneros(html), preco: p ? Number(p[1]) : null, precos: parsePrecos(html) };
  estatico = { at: Date.now(), dados };
  return dados;
}

/* ---------- leitura ---------- */

// Os beats do site, na ordem da lista. Tirado do site (removido_em) fica de fora.
export async function lerBeats(d) {
  const { results } = await d.prepare(
    `SELECT id, name, bpm, mkey AS key, genre, sold, sold_at, sold_por, unsold_at, ordem, track_id
       FROM beats WHERE removido_em IS NULL ORDER BY ordem, id`
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

/* ---------- a lista que vai dentro da página ---------- */

const VALIDADE_PAGINA = 60 * 1000;   // venda some da lista em até 1 minuto
let pagina = { at: 0, dados: null };
const RESERVA = '/__reserva/loja';    // última lista boa, 30 dias (plano B)
const FRESCA = '/__loja/fresca';      // a mesma lista por 1 minuto, pra região inteira
const temCache = () => typeof caches !== 'undefined' && caches.default;

// Painel mexeu ou saiu venda: a memória deste isolate e a cópia de 1 minuto da
// região (a do Bruno) caem na hora. As outras regiões seguem no máximo 1 minuto.
export async function esquecerLoja(request) {
  pagina = { at: 0, dados: null };
  if (request && temCache()) {
    try { await caches.default.delete(new URL(FRESCA, request.url)); } catch (_) { /* bônus */ }
  }
}

// {lista:[{id,name,bpm,key,genre,sold}], destaque:{id,ate}|null}
// Ordem: memória do isolate (1 min) > cópia da região (1 min) > banco. O banco só é
// lido uma vez por minuto por região, não uma vez por isolate.
// Falhou o banco: a última lista boa (cache da Cloudflare, 30 dias). Sem ela, null.
export async function lojaParaPagina(request, env) {
  if (pagina.dados && Date.now() - pagina.at < VALIDADE_PAGINA) return pagina.dados;
  const fresca = await lerCache(request, FRESCA);
  if (fresca && fresca.at && Date.now() - fresca.at < VALIDADE_PAGINA && Array.isArray(fresca.lista)) {
    pagina = { at: fresca.at, dados: { lista: fresca.lista, destaque: fresca.destaque || null } };
    return pagina.dados;
  }
  try {
    const d = await db(env);
    const beats = await lerBeats(d);
    if (!beats.length) throw new Error('lista vazia no banco');
    const dados = {
      lista: beats.map((b) => ({ id: b.id, name: b.name, bpm: b.bpm, key: b.key || '', genre: b.genre, sold: !!b.sold })),
      destaque: await lerDestaque(d)
    };
    pagina = { at: Date.now(), dados };
    await guardar(request, FRESCA, { ...dados, at: pagina.at }, 60);
    await guardar(request, RESERVA, dados, 2592000);
    return dados;
  } catch (e) {
    console.error('loja fora do banco', e && e.message);
    if (pagina.dados) return pagina.dados;     // a cópia da memória vale mais que nada
    const r = await lerCache(request, RESERVA);
    return r && Array.isArray(r.lista) && r.lista.length ? r : null;
  }
}

async function guardar(request, caminho, dados, segundos) {
  if (!temCache()) return;
  try {
    await caches.default.put(new URL(caminho, request.url), new Response(JSON.stringify(dados), {
      headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=' + segundos }
    }));
  } catch (_) { /* cache é bônus */ }
}

async function lerCache(request, caminho) {
  if (!temCache()) return null;
  try {
    const r = await caches.default.match(new URL(caminho, request.url));
    return r ? await r.json() : null;
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
  // lista vazia: o próprio index.html liga o aviso (if(!BEATS.length) window.__LOJA_FORA=true)
  let saida = html.slice(0, ini) + 'const BEATS=[\n' + linhas + '\n];' + html.slice(fim + 2);

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

// Os que não podem mais ser vendidos: vendidos ou tirados do site.
export async function vendidosEntre(d, nomes) {
  const limpos = [...new Set(nomes.map(nomeDoBeat).filter(Boolean))].slice(0, 60);
  if (!limpos.length) return [];
  const { results } = await d.prepare(
    `SELECT name FROM beats WHERE (sold = 1 OR removido_em IS NOT NULL) AND name COLLATE NOCASE IN (${limpos.map(() => '?').join(', ')})`
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
