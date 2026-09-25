// Tom e BPM que faltam no nome do arquivo da tape, achados em outra cópia do
// mesmo beat (24/09/2026). No Drive é comum a tape ter "ademar 158bpm" e a pasta
// do artista ter "ademar Fm 158bpm": o tom existe, só não naquela cópia.

import { limpo, chaveTom } from './casar.js';

// copias: [{ title, bpm, key, onde }]. Casa pelo título limpo e, quando os dois
// lados têm BPM, com 1 de folga. Devolve { key, bpm, keyOnde, bpmOnde, confere }.
// confere = as cópias discordam (vai o tom mais comum, e o painel avisa).
export function tomDeCopia(item, copias) {
  const alvo = limpo(item.title);
  const iguais = copias.filter((c) =>
    limpo(c.title) === alvo &&
    !(item.bpm && c.bpm && Math.abs(Number(item.bpm) - Number(c.bpm)) > 1));
  const out = { key: item.key || null, bpm: item.bpm || null, keyOnde: null, bpmOnde: null, confere: false };

  if (!out.key) {
    const votos = new Map();
    for (const c of iguais) {
      const k = chaveTom(c.key);
      if (!k) continue;
      const v = votos.get(k) || { key: c.key, onde: c.onde, n: 0 };
      v.n++;
      votos.set(k, v);
    }
    const ranking = [...votos.values()].sort((a, b) => b.n - a.n);
    if (ranking.length) {
      out.key = ranking[0].key;
      out.keyOnde = ranking[0].onde;
      out.confere = ranking.length > 1;
    }
  }
  if (!out.bpm) {
    const bpms = [...new Set(iguais.map((c) => Number(c.bpm)).filter(Boolean))];
    if (bpms.length === 1) {
      out.bpm = bpms[0];
      out.bpmOnde = iguais.find((c) => Number(c.bpm) === bpms[0]).onde;
    }
  }
  return out;
}

// Beat que o cruzamento não achou em lugar nenhum: beat novo, de tape nova.
// É o único tipo de pendência que a Fila deixa marcar disponível em lote.
export const ehBeatNovo = (motivo) =>
  /^Beat novo:/.test(motivo || '') || /^Não está em Exclusivos nem nos beats de nenhum artista/.test(motivo || '');
