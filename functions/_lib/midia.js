// Endereço do áudio (03/10/2026). Vazio = o de sempre: o MP3 passa pela função
// /audio/<id> (com cópia na borda). Preenchido = o MP3 sai direto do armazenamento
// (R2) pelo domínio próprio, com CDN da Cloudflare e sem gastar chamada de função.
// Pra ligar: na Cloudflare, R2 > caramujo-audio > Settings > Custom Domains >
// som.caramujorecords.com.br, e a regra de CORS (ver .github/README.md). Conferido o
// domínio no ar, troca a linha de baixo e publica.
export const MIDIA = '';

// /audio/<id> (vitrine e perfil) ou <MIDIA>/mp3/<id>.mp3
export function somUrl(id) {
  return MIDIA ? `${MIDIA}/mp3/${id}.mp3` : `/audio/${id}`;
}
