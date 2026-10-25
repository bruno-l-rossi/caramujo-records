// Ajustes dos beats dentro de uma beat tape (24/10/2026, pedido do Bruno): ordem, gênero, BPM e beats
// escondidos, feitos no painel (Catálogo > Beat tapes > a tape > "Beats da tape").
// Tudo numa linha da meta ('tapes-ajuste'), por tape: a conversão do Drive não apaga, nenhuma coluna
// nova (o deploy segue abaixo de 50 consultas) e o perfil lê junto das outras chaves dele.
//   { "<id da tape>": { o: [ids na ordem], x: [ids escondidos], g: { id: 'trap' }, b: { id: 140 } } }
// - Ordem: beat que não está na lista (subiu depois) vem primeiro, do mais novo pro mais antigo.
// - Beat casado com a vitrine (24/10/2026): gênero e BPM moram na vitrine; o painel grava lá e a tape mostra
//   o da vitrine (nome, BPM, tom, gênero, vendido). O casamento usa a identidade guardada (casar.js chaveCasa),
//   então mexer não desliga o beat da tape.
// - Beat que não está na vitrine: gênero e BPM ficam aqui, só na tape.
// - Escondido: some da página da tape, da contagem e do "Ouça a última beat tape" do perfil.
import { GENEROS } from './generos.js';
import { mesma, tituloCasa, limpo } from './casar.js';

export const CHAVE_AJUSTE = 'tapes-ajuste';
const RE_ID = /^[A-Za-z0-9_-]{6,80}$/;
const GEN = new Set(GENEROS.map(([s]) => s));
export const ROTULO_GENERO = Object.fromEntries(GENEROS);

const ids = (l) => (Array.isArray(l) ? [...new Set(l.map(String).filter((x) => RE_ID.test(x)))].slice(0, 400) : []);
function umaTape(v) {
  const o = ids(v && v.o), x = ids(v && v.x);
  const g = {}, b = {};
  for (const [k, s] of Object.entries((v && v.g) || {})) if (RE_ID.test(k) && GEN.has(s)) g[k] = s;
  for (const [k, n] of Object.entries((v && v.b) || {})) { const z = Math.round(Number(n)); if (RE_ID.test(k) && z >= 40 && z <= 300) b[k] = z; }
  return { o, x, g, b };
}
const vazia = (t) => !t.o.length && !t.x.length && !Object.keys(t.g).length && !Object.keys(t.b).length;

export function ajusteDeTexto(txt) {
  let v = {};
  try { v = typeof txt === 'string' ? JSON.parse(txt || '{}') : txt || {}; } catch (_) { v = {}; }
  const out = {};
  for (const [k, t] of Object.entries(v || {})) {
    if (!/^\d{1,9}$/.test(k)) continue;
    const u = umaTape(t);
    if (!vazia(u)) out[k] = u;
  }
  return out;
}
export const daTape = (aj, id) => (aj && aj[String(id)]) || { o: [], x: [], g: {}, b: {} };

export async function lerAjuste(d) {
  try {
    const r = await d.prepare('SELECT valor FROM meta WHERE chave = ?').bind(CHAVE_AJUSTE).first();
    return ajusteDeTexto(r && r.valor);
  } catch (_) { return {}; }
}
export async function salvarAjuste(d, aj) {
  await d.prepare('INSERT OR REPLACE INTO meta (chave, valor) VALUES (?, ?)').bind(CHAVE_AJUSTE, JSON.stringify(ajusteDeTexto(aj))).run();
}

// A ordem que a página da tape mostra (a mesma do app.html): beat sem posição (subiu depois) primeiro, do mais
// novo pro mais antigo, depois a ordem salva. beats = [{ id, mod }]. Devolve os ids.
export function ordemDaTape(beats, t) {
  const pos = new Map(((t && t.o) || []).map((k, i) => [k, i]));
  return [...beats].sort((p, q) => {
    const a = pos.has(p.id), b = pos.has(q.id);
    if (a && b) return pos.get(p.id) - pos.get(q.id);
    if (a !== b) return a ? 1 : -1;
    return (p.mod || '') < (q.mod || '') ? 1 : (p.mod || '') > (q.mod || '') ? -1 : 0;
  }).map((b) => b.id);
}

// Página da tape: tira os escondidos, troca BPM/gênero e numera a ordem (t.ord; o app.html ordena por ela)
export function aplicarNaTape(tracks, t) {
  if (!t || vazia(t)) return tracks;
  const escondido = new Set(t.x), pos = new Map(t.o.map((id, i) => [id, i]));
  return tracks.filter((f) => !(f.kind === 'beat' && escondido.has(f.id))).map((f) => {
    if (f.kind !== 'beat') return f;
    const n = { ...f };
    // beat casado com a vitrine segue a vitrine (gênero e BPM se mudam lá); o ajuste só vale pro que não está lá
    if (!f.naLoja && t.b[f.id]) n.bpm = t.b[f.id];
    if (!f.naLoja && t.g[f.id]) n.genero = ROTULO_GENERO[t.g[f.id]];
    delete n.naLoja;
    if (pos.has(f.id)) n.ord = pos.get(f.id);
    return n;
  });
}

// A vitrine segue a ordem da beat tape (24/10/2026): os beats da tape que estão na vitrine trocam de lugar
// ENTRE SI, nas posições (beats.ordem) que já ocupavam; os de outras tapes não saem do lugar.
// beats = [{ id, mod, loja: { id } | null }]; t = o ajuste da tape (daTape). Devolve quantos mudaram.
export async function reordenarNaVitrine(d, beats, t) {
  const ids = ordemDaTape(beats, t);
  const por = new Map(beats.map((b) => [b.id, b]));
  const lojaIds = [];
  for (const id of ids) { const b = por.get(id); if (b && b.loja && !lojaIds.includes(b.loja.id)) lojaIds.push(b.loja.id); }
  if (lojaIds.length < 2) return 0;
  const { results } = await d.prepare(`SELECT id, ordem FROM beats WHERE id IN (${lojaIds.map(() => '?').join(', ')})`).bind(...lojaIds).all();
  const atual = new Map((results || []).map((x) => [x.id, Number(x.ordem)]));
  const vivos = lojaIds.filter((id) => atual.has(id));
  const lugares = vivos.map((id) => atual.get(id)).sort((a, b) => a - b);
  const muda = vivos.map((id, i) => [id, lugares[i]]).filter(([id, o]) => atual.get(id) !== o);
  if (!muda.length) return 0;
  await d.prepare('UPDATE beats SET ordem = CASE id ' + muda.map(() => 'WHEN ? THEN ?').join(' ') + ' END, mexido_em = ? WHERE id IN (' + muda.map(() => '?').join(', ') + ')')
    .bind(...muda.flatMap(([id, o]) => [id, o]), new Date().toISOString(), ...muda.map(([id]) => id)).run();
  return muda.length;
}

// A mesma coisa direto no banco, sem a cópia da vitrine (pros ajustes de uma vez só do db.js).
// nome = o nome da beat tape como está no Drive. Devolve quantos beats mudaram de lugar.
export async function reordenarTapePeloNome(DB, nome) {
  const a = await DB.prepare("SELECT id FROM artists WHERE tipo = 'tape' AND LOWER(TRIM(name)) = LOWER(TRIM(?)) ORDER BY id DESC LIMIT 1").bind(String(nome)).first();
  if (!a) return 0;
  const { results: faixas } = await DB.prepare(
    "SELECT id, title, bpm, mkey, src_modified FROM tracks WHERE kind = 'beat' AND ready = 1 AND artist_id = ?"
  ).bind(a.id).all();
  const { results: loja } = await DB.prepare('SELECT id, name, bpm, mkey AS key, casa FROM beats WHERE removido_em IS NULL').all();
  const mapa = new Map();
  for (const b of loja || []) { const x = { ...b, title: b.name }; if (!x.casa) delete x.casa; const k = tituloCasa(x); if (!mapa.has(k)) mapa.set(k, []); mapa.get(k).push(x); }
  const beats = (faixas || []).map((f) => {
    const faixa = { title: f.title, bpm: f.bpm, key: f.mkey };
    const b = (mapa.get(limpo(f.title)) || []).find((x) => mesma(x, faixa));
    return { id: f.id, mod: f.src_modified || '', loja: b ? { id: b.id } : null };
  });
  let aj = {};
  try { const r = await DB.prepare("SELECT valor FROM meta WHERE chave = ?").bind(CHAVE_AJUSTE).first(); aj = ajusteDeTexto(r && r.valor); } catch (_) { aj = {}; }
  return reordenarNaVitrine(DB, beats, daTape(aj, a.id));
}
