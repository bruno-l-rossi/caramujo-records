// A "onda" de uma faixa: o volume de cada meio segundo, de 0 a 255.
// Serve pro compartilhar do site (assets/story.js) achar o trecho mais forte do beat
// e desenhar a faixa inteira pra pessoa escolher o pedaço do story, sem baixar o MP3.
// ~360 números por beat de 3 min (~1KB). Mora no R2 em onda/<id>.json.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
export const PASSO = 0.5;   // segundos por barra
const TAXA = 8000;          // mono 8 kHz: sobra pra medir volume e é leve

export async function ondaDe(arquivo) {
  const { stdout } = await run('ffmpeg', ['-v', 'error', '-i', arquivo, '-ac', '1', '-ar', String(TAXA), '-f', 's16le', '-'],
    { encoding: 'buffer', maxBuffer: 256 * 1024 * 1024 });
  return ondaDoPcm(new Int16Array(stdout.buffer, stdout.byteOffset, Math.floor(stdout.length / 2)));
}

// separado pra dar pra testar sem ffmpeg
export function ondaDoPcm(amostras, taxa = TAXA) {
  const n = Math.round(taxa * PASSO), rms = [];
  for (let i = 0; i < amostras.length; i += n) {
    let soma = 0; const fim = Math.min(amostras.length, i + n);
    for (let j = i; j < fim; j++) { const v = amostras[j] / 32768; soma += v * v; }
    rms.push(Math.sqrt(soma / Math.max(1, fim - i)));
  }
  const max = Math.max(...rms, 1e-9);
  return { v: 1, passo: PASSO, dur: Math.round(amostras.length / taxa * 10) / 10, p: rms.map((r) => Math.round(255 * r / max)) };
}
