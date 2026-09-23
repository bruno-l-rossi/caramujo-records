// A vitrine é a lista de beats à venda, que mora escrita no index.html
// (decisão do Bruno em 21/09/2026: manter na mão por enquanto).
//
// Aqui eu leio essa lista do PRÓPRIO site servido (env.ASSETS, sem sair pra internet)
// e caso cada beat com o que já está convertido no R2, pra não subir MP3 repetido.
// Serve o botão de carrinho do catálogo e o relatório do painel.

import { mesma, limpo, slug } from './casar.js';

const VALIDADE = 10 * 60 * 1000;    // o index.html só muda quando o Bruno publica
let cache = { at: 0, beats: null };

function parse(html) {
  const ini = html.indexOf('const BEATS=[');
  if (ini < 0) return [];
  const fim = html.indexOf('];', ini);
  if (fim < 0) return [];
  const bloco = html.slice(ini, fim);   // ~15 KB, não os 188 KB da página

  const beats = [];
  const entrada = /\{\s*id:\s*(\d+)\s*,([^}]*)\}/g;
  let m;
  while ((m = entrada.exec(bloco))) {
    const resto = m[2];
    const texto = (chave) => {
      const t = resto.match(new RegExp(chave + ":\\s*'((?:[^'\\\\]|\\\\.)*)'"));
      return t ? t[1].replace(/\\(.)/g, '$1') : null;
    };
    const numero = (chave) => {
      const t = resto.match(new RegExp(chave + ':\\s*(\\d+)'));
      return t ? Number(t[1]) : null;
    };
    const name = texto('name');
    if (!name) continue;
    beats.push({
      id: Number(m[1]),
      name,
      title: name,                    // mesma() compara por .title
      slug: slug(name),               // o mesmo slug do deep-link do site
      bpm: numero('bpm'),
      key: texto('key'),
      genre: texto('genre'),
      sold: /sold:\s*true/.test(resto)
    });
  }
  return beats;
}

// O site escreve o gênero em código ('boombap') e o nome bonito noutra lista.
// Leio as duas, pra ninguém ver "boombap" na tela.
function generos(html) {
  const m = html.match(/const GENRE_LABELS\s*=\s*\{([^}]*)\}/);
  const mapa = {};
  if (!m) return mapa;
  const re = /'([^']+)'\s*:\s*'([^']*)'/g;
  let p;
  while ((p = re.exec(m[1]))) mapa[p[1]] = p[2];
  return mapa;
}

export async function vitrine(request, env) {
  if (cache.beats && Date.now() - cache.at < VALIDADE) return cache.beats;
  try {
    const r = await env.ASSETS.fetch(new URL('/index.html', request.url));
    if (!r.ok) return cache.beats || [];
    const pagina = await r.text();
    const beats = parse(pagina);
    const rotulos = generos(pagina);
    for (const b of beats) b.generoLabel = rotulos[b.genre] || b.genre || '';
    if (beats.length) cache = { at: Date.now(), beats };
    return beats.length ? beats : (cache.beats || []);
  } catch {
    return cache.beats || [];      // vitrine fora do ar não pode derrubar o catálogo
  }
}

// Índice por título limpo: achar é direto, e BPM/tom só desempatam nomes repetidos.
export function indexar(beats) {
  const mapa = new Map();
  for (const b of beats) {
    const k = limpo(b.name);
    if (!mapa.has(k)) mapa.set(k, []);
    mapa.get(k).push(b);
  }
  return mapa;
}

// faixa = { title, bpm, key }
export function achar(mapa, faixa) {
  const lista = mapa.get(limpo(faixa.title));
  if (!lista) return null;
  return lista.find((b) => mesma(b, faixa)) || null;
}
