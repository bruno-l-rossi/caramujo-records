// A página do pedido (/pedido/<token>, 10/10/2026): o desenho aprovado no mockup do item 6,
// só a parte dos beats (serviço segue com o Bruno). Marca terrosa (DESIGN.md): Cormorant nos
// nomes, Helvetica nos botões, IBM Plex Mono nas fichas, bordas de 1px, cantos retos.
// Privada: noindex, sem cópia em lugar nenhum.

import { ICONES } from './icones.js';
import { capaUrl, CAPA_VOLTA } from './midia.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export function dataLonga(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const sp = new Date(d.getTime() - 3 * 3600e3);       // horário de São Paulo
  return `${sp.getUTCDate()} de ${MESES[sp.getUTCMonth()]} de ${sp.getUTCFullYear()}`;
}
export function dataCurta(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const sp = new Date(d.getTime() - 3 * 3600e3);
  return `${String(sp.getUTCDate()).padStart(2, '0')}/${String(sp.getUTCMonth() + 1).padStart(2, '0')}/${sp.getUTCFullYear()}`;
}
const mb = (b) => (!b ? '' : b < 10 * 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.round(b / 1048576) + ' MB');
// número curto do pedido (o fim do pagamento; teste = TESTE)
const numero = (p) => (p.status === 'teste' ? 'TESTE' : '#' + String(p.pagamento || p.token).slice(-6).toUpperCase());

const DESCE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/></svg>';
const IG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/></svg>';

const CSS = `
@font-face{font-family:'Cormorant Garamond';font-weight:500;font-display:swap;src:url(/assets/fonts/cormorant-garamond-latin-500-normal.woff2) format('woff2')}
@font-face{font-family:'IBM Plex Mono';font-weight:400;font-display:swap;src:url(/assets/fonts/ibm-plex-mono-latin-400-normal.woff2) format('woff2')}
:root{--black:#14110d;--deep:#1A1815;--mole:#221e18;--loam:#3a3127;--clay:#A87B4A;--amber:#c3a074;--bone:#E8E0CF;--cream:#f2ecdf;--fire:#b98f5e;--dim:#6f6757;--wire:#332c22;--read:#b89e72;--label:#9e7c48;
  --serif:'Cormorant Garamond',Georgia,serif;--sans:'Helvetica Neue',Helvetica,Arial,sans-serif;--mono:'IBM Plex Mono',ui-monospace,monospace}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%}
body{background:var(--black);color:var(--bone);font-family:var(--sans);-webkit-font-smoothing:antialiased;min-height:100vh}
a{color:inherit}
:focus-visible{outline:2px solid var(--fire);outline-offset:2px}
.topo{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;padding-top:calc(14px + env(safe-area-inset-top,0px));background:rgba(20,17,13,.96);border-bottom:1px solid var(--wire)}
.topo img{display:block;width:122px;height:22px}
.topo a.aj{font-size:.62rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--read);text-decoration:none;padding:8px 0}
@media (min-width:900px){.topo{padding:18px 32px}.topo img{width:148px;height:27px}}
main{max-width:640px;margin:0 auto;padding:34px 18px 56px}
.k{display:block;font-size:.62rem;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:var(--fire)}
h1{font-family:var(--serif);font-weight:500;font-size:2.7rem;line-height:1;color:var(--cream);margin:.7rem 0 .9rem;text-wrap:balance}
.lede{font-size:.92rem;line-height:1.7;color:var(--read)}
.lede b{color:var(--cream);font-weight:600}
.guarda{margin-top:1rem;font-family:var(--mono);font-size:.68rem;line-height:1.6;color:var(--dim)}
.teste{margin-top:1.2rem;padding:12px 14px;border:1px solid var(--clay);border-left:3px solid var(--fire);font-size:.8rem;line-height:1.6;color:var(--read)}
.teste b{color:var(--cream)}
.sec{margin-top:2.4rem}
.sec-cab{display:flex;align-items:baseline;justify-content:space-between;gap:1rem;padding-bottom:.7rem;border-bottom:1px solid var(--wire);margin-bottom:1rem}
.sec-cab h2{font-size:.66rem;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--label)}
.sec-cab span{font-family:var(--mono);font-size:.66rem;color:var(--dim)}
.beat{display:grid;grid-template-columns:64px minmax(0,1fr);gap:14px;align-items:center;padding:14px;border:1px solid var(--wire);background:var(--deep)}
.beat+.beat{margin-top:10px}
.beat img{width:64px;height:64px;object-fit:cover;border:1px solid var(--wire);background:var(--mole);display:block}
.beat .n{font-family:var(--serif);font-weight:500;font-size:1.35rem;text-transform:uppercase;color:var(--cream);line-height:1.1;overflow-wrap:anywhere}
.beat .f{margin-top:4px;font-family:var(--mono);font-size:.66rem;color:var(--read);letter-spacing:.03em}
.beat .f em{font-style:normal;color:var(--clay);text-transform:uppercase}
.bx{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:2px}
.b{display:flex;align-items:center;justify-content:center;gap:8px;min-height:46px;padding:0 12px;font-size:.66rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;text-decoration:none;border:1px solid var(--wire);color:var(--bone);background:transparent}
.b svg{width:15px;height:15px;flex:none}
.b.cheio{background:var(--bone);border-color:var(--bone);color:var(--deep)}
.b small{font-family:var(--mono);font-weight:400;letter-spacing:0;text-transform:none;opacity:.7}
@media (hover:hover){.b:hover{border-color:var(--clay)}.b.cheio:hover{background:var(--cream)}}
.nota{grid-column:1/-1;font-family:var(--mono);font-size:.66rem;line-height:1.6;color:var(--read)}
.contrato{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px;padding:14px;border:1px solid var(--wire)}
.contrato b{display:block;font-size:.84rem;color:var(--cream);font-weight:600}
.contrato small{display:block;margin-top:3px;font-family:var(--mono);font-size:.64rem;color:var(--read)}
.contrato a{font-size:.6rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--fire);white-space:nowrap;text-decoration:none;padding:10px 0}
.aviso{margin-top:10px;padding:12px 14px;border:1px solid var(--wire);border-left:3px solid var(--fire);font-size:.8rem;line-height:1.6;color:var(--read)}
.aviso b{color:var(--cream);font-weight:600}
.espera{margin-top:1.6rem;display:flex;align-items:center;gap:10px;font-family:var(--mono);font-size:.7rem;color:var(--read)}
.espera i{width:8px;height:8px;border-radius:50%;background:var(--fire);animation:pisca 1.4s ease-in-out infinite}
@keyframes pisca{50%{opacity:.25}}
@media (prefers-reduced-motion:reduce){.espera i{animation:none}}
.ajuda{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:2.6rem;min-height:50px;border:1px solid var(--wire);font-size:.66rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--bone);text-decoration:none}
.ajuda svg{width:16px;height:16px}
footer{padding:22px 18px 30px;border-top:1px solid var(--wire);text-align:center;font-size:.58rem;letter-spacing:.2em;text-transform:uppercase;color:var(--dim)}
`;

export function cabecalho(titulo) {
  return `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(titulo)}</title>
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="no-referrer">
<meta name="theme-color" content="#14110d">
${ICONES}
${CAPA_VOLTA}
<style>${CSS}</style>
</head>`;
}

const topo = '<header class="topo"><a href="/" aria-label="Caramujo Records, página inicial"><img src="/assets/brand/caramujo-h.webp" srcset="/assets/brand/caramujo-h-244.webp 244w, /assets/brand/caramujo-h-366.webp 366w, /assets/brand/caramujo-h.webp 504w" sizes="(max-width:899px) 122px, 148px" alt="Caramujo Records" width="148" height="27"></a><a class="aj" href="https://ig.me/m/rideblan33" rel="noopener">Ajuda</a></header>';
const rodape = '<footer>© 2026 Caramujo Records · São Carlos, SP</footer>';
const ajuda = `<a class="ajuda" href="https://ig.me/m/rideblan33" rel="noopener">${IG}Dúvida? Chama no Direct</a>`;

// p = pedido (lerPedido), faixas = Map(id -> {wav_bytes, mp3_bytes}) das faixas que ainda existem
export function paginaPedido(p, faixas = new Map()) {
  const beats = (p.itens || []).filter((i) => i.t === 'beat');
  const servicos = (p.itens || []).filter((i) => i.t === 'servico');
  const quem = p.artista || (p.nome || '').split(' ')[0] || '';
  const pago = p.status === 'pago' || p.status === 'teste';
  const base = '/pedido/' + p.token;
  const titulo = pago ? 'Pedido confirmado' : 'Esperando o pagamento';
  let html = cabecalho(`${titulo} · Caramujo Records`) + '\n<body>\n' + topo + '\n<main>';
  html += `<span class="k">Pedido ${esc(numero(p))} · ${esc(dataLonga(p.pago_em || p.criado_em))}</span>`;
  if (!pago) {
    html += `<h1>Esperando o PIX</h1><p class="lede">Assim que o pagamento cair, os arquivos aparecem aqui sozinhos. Pode deixar esta página aberta.</p>` +
      '<p class="espera" id="espera"><i></i><span>conferindo o pagamento…</span></p>' +
      `<script>(function(){var n=0;function v(){if(n++>80)return;fetch('${base}/estado',{cache:'no-store'}).then(function(r){return r.json()}).then(function(j){if(j&&j.status==='pago')location.reload();else setTimeout(v,n<12?5000:12000)}).catch(function(){setTimeout(v,12000)})}setTimeout(v,4000)})();</script>`;
    html += ajuda + '</main>' + rodape + '\n</body></html>';
    return html;
  }
  const um = beats.length === 1;
  html += `<h1>Pedido confirmado</h1><p class="lede">Valeu${quem ? ', <b>' + esc(quem) + '</b>' : ''}. O pagamento caiu e ${um ? 'o beat já é seu: os arquivos estão' : 'os beats já são seus: os arquivos estão'} aqui embaixo.</p>`;
  html += `<p class="guarda">Esse link é só seu${p.status === 'teste' ? '' : '. Também mandamos ele pro seu e-mail'}.</p>`;
  if (p.status === 'teste') {
    html += '<p class="teste"><b>Pedido de teste.</b> Só quem tem este link vê, e nenhum beat foi vendido. O comprador vê esta mesma página, com o nome dele.</p>';
  }
  if (beats.length) {
    html += `<section class="sec"><div class="sec-cab"><h2>${um ? 'Seu beat' : 'Seus beats'}</h2><span>licença exclusiva</span></div>`;
    for (const b of beats) {
      const f = b.faixa ? faixas.get(b.faixa) : null;
      const ficha = [b.genero ? `<em>${esc(b.genero)}</em>` : '', b.bpm ? esc(b.bpm) + ' BPM' : '', b.key ? esc(b.key) : ''].filter(Boolean).join(' · ');
      html += '<div class="beat">' +
        (b.capa ? `<img src="${esc(capaUrl(b.capa, 'p'))}" alt="" width="64" height="64" loading="lazy" decoding="async">` : '<img src="/assets/brand/caramujo-v.webp" alt="" width="64" height="64">') +
        `<div><div class="n">${esc(b.nome)}</div>${ficha ? `<div class="f">${ficha}</div>` : ''}</div>`;
      if (b.faixa && b.id != null) {
        html += '<div class="bx">' +
          `<a class="b cheio" href="${base}/wav/${encodeURIComponent(b.id)}" download>${DESCE}WAV${f && f.wav_bytes ? ' <small>' + mb(f.wav_bytes) + '</small>' : ''}</a>` +
          `<a class="b" href="${base}/mp3/${encodeURIComponent(b.id)}" download>${DESCE}MP3${f && f.mp3_bytes ? ' <small>' + mb(f.mp3_bytes) + '</small>' : ''}</a>` +
          '</div>';
      } else {
        html += '<p class="nota">O @rideblan33 manda os arquivos desse beat no seu e-mail em até 1 dia útil.</p>';
      }
      if (b.stems) html += '<p class="nota">Stems: o @rideblan33 manda no seu e-mail em até 1 dia útil.</p>';
      html += '</div>';
    }
    html += `<div class="contrato"><div><b>Contrato de licença exclusiva</b><small>no nome de ${esc(p.nome || quem || 'quem comprou')} · ${esc(dataCurta(p.criado_em))}</small></div><a href="${base}/contrato" download>Baixar</a></div>`;
    html += '</section>';
  }
  if (servicos.length) {
    html += `<section class="sec"><div class="sec-cab"><h2>${servicos.length === 1 ? esc(servicos[0].nome) : 'Serviços'}</h2><span>${servicos.length === 1 ? '1 serviço' : servicos.length + ' serviços'}</span></div>` +
      `<p class="aviso"><b>O @rideblan33 te chama pra combinar.</b> ${servicos.length === 1 ? '' : esc(servicos.map((s) => s.nome).join(', ')) + '. '}Beat personalizado sai em até 2 semanas; mixagem e master, até 3 semanas depois que as vozes chegam.</p></section>`;
  }
  html += ajuda + '</main>' + rodape + '\n</body></html>';
  return html;
}

// Página curta pra quando um arquivo não sai (limite de downloads, arquivo fora do ar)
export function paginaAviso(titulo, texto, voltar) {
  return cabecalho(`${titulo} · Caramujo Records`) + '\n<body>\n' + topo + '\n<main>' +
    `<span class="k">Pedido</span><h1>${esc(titulo)}</h1><p class="lede">${esc(texto)}</p>` +
    (voltar ? `<p class="guarda"><a href="${esc(voltar)}">Voltar pro pedido</a></p>` : '') + ajuda + '</main>' + rodape + '\n</body></html>';
}
