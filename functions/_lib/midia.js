// Endereço do áudio (03/10/2026). Vazio = o MP3 passa pela função /audio/<id> (com
// cópia na borda). Preenchido = o MP3 sai direto do armazenamento (R2) pelo domínio
// próprio, com CDN da Cloudflare e sem gastar chamada de função.
// LIGADO em 03/10/2026: bucket caramujo-records com o domínio som.caramujorecords.com.br,
// CORS no bucket e a regra "Audio som.caramujorecords: permissao de tocar no site"
// (Rules > Transform Rules > Response Header) que carimba Access-Control-Allow-Origin: *
// e Access-Control-Expose-Headers em toda resposta do domínio. Sem essa regra, uma
// cópia guardada sem o cabeçalho (de um play sem CORS) deixava a tape muda e o vídeo
// do compartilhar sem som. Pra voltar ao caminho antigo: deixa a linha vazia e publica.
export const MIDIA = 'https://som.caramujorecords.com.br';

// /audio/<id> (vitrine e perfil) ou <MIDIA>/mp3/<id>.mp3
export function somUrl(id) {
  return MIDIA ? `${MIDIA}/mp3/${id}.mp3` : `/audio/${id}`;
}
