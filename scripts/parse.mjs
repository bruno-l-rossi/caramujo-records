// Lê o nome do arquivo do Drive e devolve título, BPM e tom.
// Padrões:
//   beat:   "classico como lincoln Ebm 180bpm (mastered -14 lufs) prod. @rideb.wav"
//   beat:   "hard 150bpm (mastered -12 lufs) prod. @rideblan.wav"   (sem tom)
//   beat:   "buraco negro Abm 150bpm (mastered) prod. @rideblan33.wav" (sem lufs)
//   musica: "ice candy (mastered -9 lufs) prod. @rideblan33.wav"
// Fora do padrão: devolve o nome limpo, sem BPM e sem tom.

const TOM = /^[A-G](?:b|#)?m?$/;

export function parseName(fileName) {
  let s = String(fileName).replace(/\.[a-z0-9]{2,4}$/i, '').trim();

  // corta o rabo técnico: "(mastered ...)" e "prod. @..." (inclusive truncados)
  const corte = [s.search(/\s*\((?:mastered|master)\b/i), s.search(/\s*prod\.?\s*@/i)]
    .filter((i) => i > -1);
  if (corte.length) s = s.slice(0, Math.min(...corte));
  s = s.replace(/[\s\-_]+$/, '').trim();

  let bpm = null;
  let key = null;

  const mBpm = s.match(/\s(\d{2,3})\s*bpm\b/i);
  if (mBpm) {
    bpm = Number(mBpm[1]);
    s = (s.slice(0, mBpm.index) + s.slice(mBpm.index + mBpm[0].length)).trim();
  }

  const palavras = s.split(/\s+/);
  if (palavras.length > 1 && TOM.test(palavras[palavras.length - 1])) {
    key = palavras.pop();
    s = palavras.join(' ');
  }

  const title = s.replace(/\s{2,}/g, ' ').trim();
  return { title: title || String(fileName), bpm, key };
}
