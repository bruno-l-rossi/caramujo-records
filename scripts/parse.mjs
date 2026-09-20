// Lê o nome do arquivo do Drive e devolve título, BPM e tom.
// Padrões:
//   beat:   "classico como lincoln Ebm 180bpm (mastered -14 lufs) prod. @rideb.wav"
//   beat:   "hard 150bpm (mastered -12 lufs) prod. @rideblan.wav"   (sem tom)
//   beat:   "buraco negro Abm 150bpm (mastered) prod. @rideblan33.wav" (sem lufs)
//   musica: "ice candy (mastered -9 lufs) prod. @rideblan33.wav"
//   musica: "intro (prod. @rideblan33).wav"   (o rabo inteiro dentro do parêntese)
// Fora do padrão: devolve o nome limpo, sem BPM e sem tom.

// Tom: nota + maior/menor em qualquer das grafias que aparecem no Drive
// (Abm, Bbmin, Cmaj, Emaj...). Sai sempre como "Abm" ou "Abmaj".
const TOM = /^([A-G](?:b|#)?)(m|min|minor|maj|major|M)?$/;

// Onde começa o rabo técnico do nome, em qualquer das formas do Drive.
const RABOS = [
  /\s*[([]\s*(?:mastered|master|mixed|mix|prod)\b/i,  // "(mastered -9 lufs)", "(prod. @...)"
  /\s*prod\.?\s*@/i,                                   // "prod. @rideblan33"
  /\s*\bmastered\b/i                                   // "mastered" solto
];

export function parseName(fileName) {
  const semExt = String(fileName).replace(/\.[a-z0-9]{2,4}$/i, '').trim();
  let s = semExt;

  const corte = RABOS.map((r) => s.search(r)).filter((i) => i > -1);
  if (corte.length) s = s.slice(0, Math.min(...corte));

  s = aparar(fecharParenteses(s));

  let bpm = null;
  let key = null;

  // aceita "150bpm" e "120.400bpm" (o Ableton às vezes exporta com casa decimal)
  const mBpm = s.match(/\s(\d{2,3})(?:[.,]\d+)?\s*bpm\b/i);
  if (mBpm) {
    bpm = Number(mBpm[1]);
    s = (s.slice(0, mBpm.index) + s.slice(mBpm.index + mBpm[0].length)).trim();
  }

  const palavras = s.split(/\s+/);
  const m = palavras.length > 1 && palavras[palavras.length - 1].match(TOM);
  if (m) {
    key = m[1] + (m[2] ? (/^(maj|major|M)$/.test(m[2]) ? 'maj' : 'm') : '');
    palavras.pop();
    s = palavras.join(' ');
  }

  const title = aparar(s).replace(/\s{2,}/g, ' ');
  return { title: title || sobra(semExt), bpm, key };
}

// Corta no primeiro parêntese/colchete que ficou aberto, pra não sobrar "intro (".
function fecharParenteses(s) {
  const pilha = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(' || c === '[') pilha.push(i);
    else if ((c === ')' || c === ']') && pilha.length) pilha.pop();
  }
  return pilha.length ? s.slice(0, pilha[0]) : s;
}

// Tira traço, underline e cópia do Drive ("_2", "(1)") sobrando na ponta.
// O ponto final fica: tem faixa chamada "b.d.r.".
function aparar(s) {
  return String(s)
    .replace(/\s*\(\s*\d+\s*\)\s*$/, '')
    .replace(/_\d+$/, '')
    .replace(/^[\s\-_.,;:]+/, '')
    .replace(/[\s\-_,;:([]+$/, '')
    .trim();
}

// Nome que só tem o rabo (gravação solta do Ableton): devolve algo legível.
function sobra(semExt) {
  const limpo = aparar(semExt.replace(/prod\.?\s*@[^\s_]*[\s_]*/i, '').replace(/_/g, ' '));
  return limpo || semExt;
}
