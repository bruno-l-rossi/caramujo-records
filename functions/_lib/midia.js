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

// Capas pelo mesmo caminho do áudio (10/10/2026): a imagem sai direto do R2 pela CDN e
// não gasta chamada de função (o plano grátis tem 100 mil por dia e cada capa na tela
// gastava uma). tam: '' = a arte inteira (1000px), 'm' = 480px, 'p' = miniatura.
// Miniatura que ainda não existe no R2 dá erro no navegador e o CAPA_VOLTA (abaixo) troca
// pela função /capa/<id>?p, que cai na arte inteira. og:image, dados do Google e painel
// seguem pela função de propósito (endereço do próprio site).
export function capaUrl(key, tam = '') {
  if (!key) return null;
  const k = String(key);
  return MIDIA ? `${MIDIA}/capa/${k}${tam ? '-' + tam : ''}.jpg` : `/capa/${k}${tam ? '?' + tam : ''}`;
}

// Rede de segurança das capas no navegador: imagem do R2 que falhou (miniatura que o
// conversor ainda não fez, por exemplo) volta pela função, uma vez só.
export const CAPA_VOLTA = '<script>/* capa-volta */window.addEventListener("error",function(e){var t=e.target;if(!t||t.tagName!=="IMG"||t.__volta)return;var m=/^https:\\/\\/som\\.caramujorecords\\.com\\.br\\/capa\\/([A-Za-z0-9_-]+?)(?:-(p|m))?\\.jpg$/.exec(t.currentSrc||t.src||"");if(!m)return;t.__volta=1;t.removeAttribute("srcset");t.src="/capa/"+m[1]+(m[2]?"?"+m[2]:"")},true);</script>';
