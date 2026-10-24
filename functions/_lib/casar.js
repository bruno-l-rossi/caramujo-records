// Achar a MESMA faixa em lugares diferentes: pasta de artista, Exclusivos, beat tape
// e a lista de beats à venda que mora escrita no index.html.
//
// Comparo o título limpo e, quando os dois lados dizem BPM ou tom, exijo que batam.
// Isso evita confundir dois "intro". Vive aqui, sozinho, porque o cruzamento das tapes
// (api/ingest.js) e a vitrine do site (_lib/vitrine.js) precisam responder igual.

export const limpo = (s) => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/\s+/g, ' ').trim();

// O mesmo slug que o index.html usa no deep-link (#beat=nome-do-beat).
export const slug = (s) => limpo(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Chave frouxa pra casar nome escrito na mão: ignora caixa, acento e pontuação.
// "Clássico vol. 3" e "classico vol 3" viram a mesma coisa.
export const chave = (s) => limpo(s).replace(/[^a-z0-9]+/g, ' ').trim();

// F# e Gb são a mesma tecla; "F#" e "F#maj" são o mesmo tom escrito de dois jeitos.
const ENARM = { 'a#': 'bb', 'c#': 'db', 'd#': 'eb', 'f#': 'gb', 'g#': 'ab' };

function tom(k) {
  const m = limpo(k).match(/^([a-g])(b|#)?(.*)$/);
  if (!m) return null;
  const nota = ENARM[m[1] + (m[2] || '')] || (m[1] + (m[2] || ''));
  const resto = m[3];
  const q = /^(m|min|minor)$/.test(resto) ? 'm' : (resto ? 'maj' : null);
  return { nota, q };
}

// 'F#m' e 'Gbmin' viram a mesma chave ('gb:m'). null quando não dá pra ler.
export function chaveTom(k) {
  const t = tom(k);
  return t ? t.nota + ':' + (t.q || '') : null;
}

export function mesmoTom(a, b) {
  const x = tom(a), y = tom(b);
  if (!x || !y) return true;                 // um dos lados não diz o tom: não atrapalha
  if (x.nota !== y.nota) return false;
  if (x.q && y.q && x.q !== y.q) return false;
  return true;
}

// Identidade do beat pra casar com o arquivo (24/10/2026): beat da vitrine editado no painel (nome, BPM ou
// tom) guarda em `casa` {t, b, k} o nome/BPM/tom de antes da 1ª edição. Casar usa a identidade; a tela usa o
// atual. Assim mexer na vitrine não tira o áudio do beat nem o desliga da beat tape (e vice-versa).
export function chaveCasa(x) {
  let c = x && x.casa;
  if (typeof c === 'string') { try { c = JSON.parse(c); } catch (_) { c = null; } }
  if (c && c.t) return { title: c.t, bpm: c.b == null ? null : c.b, key: c.k || '' };
  return { title: x.title != null ? x.title : x.name, bpm: x.bpm, key: x.key };
}
export const tituloCasa = (x) => limpo(chaveCasa(x).title);
// casa pra gravar antes de mudar nome/BPM/tom de um beat da vitrine (linha do banco: name, bpm, mkey)
export const casaAntes = (row) => JSON.stringify({ t: row.name, b: row.bpm == null ? null : row.bpm, k: row.mkey || '' });

export function mesma(a, b) {
  a = chaveCasa(a); b = chaveCasa(b);
  if (limpo(a.title) !== limpo(b.title)) return false;
  // 1 BPM de folga: exportação com casa decimal arredonda diferente
  if (a.bpm && b.bpm && Math.abs(Number(a.bpm) - Number(b.bpm)) > 1) return false;
  return mesmoTom(a.key, b.key);
}
