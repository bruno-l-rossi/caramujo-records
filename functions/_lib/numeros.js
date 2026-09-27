// Os números grandes do site (27/09/2026): artistas, faixas e streams. Moram na meta
// ('numeros') e o painel troca na home ("Números do site"). Aparecem no hero da
// vitrine, no topo do perfil, na prévia do perfil nas redes e nos dados pro Google.
// Sem nada gravado, valem os de sempre.

export const PADRAO = { artistas: 40, faixas: 200, streams: 2500000 };
export const CHAVE = 'numeros';

export function limpar(o) {
  const n = {};
  for (const k of Object.keys(PADRAO)) {
    const v = Math.round(Number(o && o[k]));
    n[k] = Number.isFinite(v) && v > 0 && v < 1e11 ? v : PADRAO[k];
  }
  return n;
}
export function deTexto(valor) {
  try { return limpar(JSON.parse(valor)); } catch (_) { return { ...PADRAO }; }
}

// 2500000 → "2.500.000" (hero da vitrine)
export const cheio = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
// 2500000 → "2,5 mi" · 850000 → "850 mil" · 900 → "900" (perfil e prévia)
export function curto(n) {
  if (n >= 1e6) return (Math.floor(n / 1e5) / 10).toString().replace('.', ',') + ' mi';
  if (n >= 1e3) return Math.floor(n / 1e3) + ' mil';
  return String(n);
}
// 2500000 → "2,5 milhões" (dados pro Google)
export function longo(n) {
  if (n >= 1e6) { const v = Math.floor(n / 1e5) / 10; return v.toString().replace('.', ',') + (v < 2 ? ' milhão' : ' milhões'); }
  if (n >= 1e3) return Math.floor(n / 1e3) + ' mil';
  return String(n);
}

// Troca os três números do hero da vitrine (<b data-num="...">).
export function injetarNumeros(html, num) {
  const n = limpar(num);
  return html
    .replace(/(<b data-num="artistas">)[^<]*(<\/b>)/, `$1${cheio(n.artistas)}+$2`)
    .replace(/(<b data-num="faixas">)[^<]*(<\/b>)/, `$1${cheio(n.faixas)}+$2`)
    .replace(/(<b data-num="streams">)[^<]*(<\/b>)/, `$1${cheio(n.streams)}+$2`);
}
