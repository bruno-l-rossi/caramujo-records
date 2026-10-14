// A página do pedido (/pedido/<token>, 10/10/2026): o desenho aprovado no mockup do item 6,
// só a parte dos beats (serviço segue com o Bruno). Marca terrosa (DESIGN.md): Cormorant nos
// nomes, Helvetica nos botões, IBM Plex Mono nas fichas, bordas de 1px, cantos retos.
// Privada: noindex, sem cópia em lugar nenhum.

import { ICONES } from './icones.js';
import { capaUrl, CAPA_VOLTA } from './midia.js';
import { topo as topoSite, TOPO_CSS, TOPO_CSS_899, TOPO_CSS_CEL } from './topo.js';
import { LEVA_DE } from './origem.js';
import { servicoDe } from './servicos.js';

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
/* topo igual ao da vitrine (11/10/2026: _lib/topo.js, o mesmo das páginas de beat) */
.topo a,.menu-cel a{text-decoration:none}
.topo button{font:inherit;color:inherit;background:none;border:0;cursor:pointer}
.topo img{display:block}
${TOPO_CSS}${TOPO_CSS_899}@media(max-width:860px){
${TOPO_CSS_CEL}}
/* rodapé no fim da tela mesmo com pouco conteúdo (11/10/2026) */
body{display:flex;flex-direction:column;min-height:100vh;min-height:100dvh}
main{flex:1 0 auto;width:100%;max-width:640px;margin:0 auto;padding:34px 18px 56px}
footer{flex:none}
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
/* serviços (12/10/2026): o passo a passo, o formulário do envio e a entrega */
.st{padding:18px 16px;border:1px solid var(--wire);background:var(--deep)}
.st+.st{margin-top:10px}
.st h3{font-family:var(--serif);font-weight:500;font-size:1.7rem;color:var(--cream);line-height:1.1}
.st .pz{margin-top:6px;font-family:var(--mono);font-size:.66rem;color:var(--read)}
.passos{list-style:none;margin:18px 0 6px;position:relative}
.passos li{position:relative;padding:0 0 16px 26px;font-size:.84rem;color:var(--dim)}
.passos li:before{content:'';position:absolute;left:3px;top:4px;width:9px;height:9px;border-radius:50%;border:1px solid var(--loam);background:var(--black)}
.passos li:after{content:'';position:absolute;left:7px;top:15px;bottom:0;width:1px;background:var(--wire)}
.passos li:last-child:after{display:none}
.passos li.ok{color:var(--bone)}.passos li.ok:before{background:var(--fire);border-color:var(--fire)}
.passos li.ag{color:var(--cream);font-weight:600}.passos li.ag:before{background:var(--fire);border-color:var(--fire);box-shadow:0 0 0 4px rgba(185,143,94,.25)}
.passos small{display:block;font-family:var(--mono);font-weight:400;font-size:.62rem;color:var(--dim);margin-top:2px}
.fm{margin-top:14px;padding:16px;border:1px solid var(--wire);background:var(--black)}
.fm[hidden]{display:none}
.fm h4{font-family:var(--serif);font-weight:500;font-size:1.35rem;color:var(--cream)}
.fm p{font-size:.8rem;line-height:1.6;color:var(--read);margin-top:6px}
.fm label{display:block;margin-top:14px;font-size:.6rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--label)}
.fm label i{font-style:normal;font-weight:400;letter-spacing:.06em;text-transform:none;color:var(--dim)}
.fm input,.fm textarea{display:block;width:100%;margin-top:6px;min-height:46px;border:1px solid var(--wire);border-radius:0;background:var(--mole);padding:12px;font-family:var(--mono);font-size:.78rem;color:var(--cream);-webkit-appearance:none}
.fm textarea{min-height:84px;resize:vertical}
.fm input::placeholder,.fm textarea::placeholder{color:var(--dim)}
.fm input:focus,.fm textarea:focus{outline:none;border-color:var(--fire)}
.fm button{margin-top:16px;width:100%;display:flex;align-items:center;justify-content:center;min-height:50px;border:0;background:var(--bone);color:var(--deep);font-size:.68rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;cursor:pointer}
.fm button:disabled{opacity:.6;cursor:default}
.fm button.cancela{margin-top:8px;min-height:44px;background:transparent;border:1px solid var(--wire);color:var(--bone)}
.fm .er{margin-top:10px;font-family:var(--mono);font-size:.68rem;color:#d98a6c}
.dicas{list-style:none;margin-top:14px}.dicas li{font-size:.76rem;line-height:1.6;color:var(--read);padding-left:14px;position:relative}.dicas li:before{content:'›';position:absolute;left:0;color:var(--clay)}
.mandou[hidden]{display:none}
.mandou{margin-top:14px;padding:14px 16px;border:1px solid var(--wire);background:var(--black)}
.mandou .rot{font-size:.58rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--label)}
.mandou dl{margin-top:8px;font-size:.78rem;line-height:1.6}
.mandou dt{margin-top:8px;font-family:var(--mono);font-size:.6rem;color:var(--dim);text-transform:lowercase}
.mandou dd{color:var(--bone);overflow-wrap:anywhere}
.mandou dd a{color:var(--fire)}
.mandou .cab-m{display:flex;align-items:center;justify-content:space-between;gap:12px}
.troca{flex:none;display:inline-flex;align-items:center;min-height:36px;padding:0 14px;border:1px solid var(--clay);background:transparent;font:700 .6rem var(--sans);letter-spacing:.18em;text-transform:uppercase;color:var(--bone);cursor:pointer}
.troca:hover{border-color:var(--fire);color:var(--cream)}
.mandou .pode{margin-top:10px;font-family:var(--mono);font-size:.62rem;color:var(--dim)}
.pronto{margin-top:14px}
.pronto .b{min-height:52px}
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

// menu do celular e número do carrinho, como nas páginas de beat
const TOPO_JS = `<script>(function(){var $=function(s){return document.querySelector(s)};
try{var c=JSON.parse(localStorage.getItem('caramujo_carrinho_v1')||'null');if(c&&c.itens&&c.itens.length&&Date.now()-(c.em||0)<7*864e5){var n=c.itens.reduce(function(s,x){return s+(x.qty||1)},0),b=$('.js-n');if(b){b.textContent=n;b.hidden=false}}}catch(_){}
var mb=$('.js-menu'),mc=$('#menuCel');if(mb&&mc)mb.addEventListener('click',function(){var on=!mc.classList.contains('on');mc.classList.toggle('on',on);mb.setAttribute('aria-expanded',on?'true':'false')});
var ms=$('.mc-sub>a');if(ms)ms.addEventListener('click',function(e){e.preventDefault();var li=ms.parentNode,on=!li.classList.contains('abre');li.classList.toggle('abre',on);ms.setAttribute('aria-expanded',on?'true':'false')});})();</script>`;
const topo = topoSite('pedido');
const rodape = '<footer>© 2026 Caramujo Records · São Carlos, SP</footer>' + TOPO_JS + LEVA_DE;
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
  // pedido só de serviço (11/10/2026): sem beat, o texto fala do próximo passo
  html += `<h1>Pedido confirmado</h1><p class="lede">Valeu${quem ? ', <b>' + esc(quem) + '</b>' : ''}. O pagamento caiu ${!beats.length ? 'e o próximo passo do seu pedido está' : um ? 'e o beat já é seu: os arquivos estão' : 'e os beats já são seus: os arquivos estão'} aqui embaixo.</p>`;
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
      html += '</div>';
    }
    html += `<div class="contrato"><div><b>Contrato de licença exclusiva</b><small>no nome de ${esc(p.nome || quem || 'quem comprou')} · ${esc(dataCurta(p.criado_em))}</small></div><a href="${base}/contrato" download>Baixar</a></div>`;
    html += '</section>';
  }
  // serviços (12/10/2026): cada um com o passo a passo, o envio e, depois, a entrega
  const comServico = (p.itens || []).map((it, k) => ({ it, k })).filter((x) => x.it.t === 'servico');
  if (comServico.length) {
    for (const { it, k } of comServico) html += blocoServico(it, k, p, base);
    if (!beats.length) html += `<div class="contrato"><div><b>Contrato do pedido</b><small>no nome de ${esc(p.nome || quem || 'quem comprou')} · ${esc(dataCurta(p.criado_em))}</small></div><a href="${base}/contrato" download>Baixar</a></div>`;
    html += FORM_JS;
  }
  html += ajuda + '</main>' + rodape + '\n</body></html>';
  return html;
}

// Um serviço do pedido: passo a passo, formulário (até o envio), o que foi mandado e a entrega
function blocoServico(it, k, p, base) {
  const sv = servicoDe(it.nome);
  if (!sv) return `<section class="sec"><div class="sec-cab"><h2>${esc(it.nome)}</h2><span>serviço</span></div><p class="aviso"><b>O @rideblan33 te chama pra combinar.</b></p></section>`;
  const env = it.envio, ent = it.entrega;
  const recebido = sv.tipo === 'encomenda' ? 'Referência recebida' : sv.tipo === 'faixa' ? 'Faixa recebida' : 'Vozes recebidas';
  const passos = [
    ['Pagamento confirmado', 'ok', dataCurta(p.pago_em || p.criado_em)],
    env ? [recebido, 'ok', dataCurta(env.em)] : [sv.aguardando, 'ag', 'manda pelo campo abaixo'],
    [sv.trabalho, ent ? 'ok' : env ? 'ag' : '', env && !ent ? 'o @rideblan33 está trabalhando nele' : ''],
    [sv.fim, ent ? 'ok' : '', ent ? dataCurta(ent.em) : sv.fimSub]
  ];
  const titulo = ent ? 'Pronto pra baixar' : env ? 'Tá no estúdio' : 'Agora é com você';
  let h = `<section class="sec" id="sv${k}"><div class="sec-cab"><h2>${esc(sv.curto)}</h2><span>${esc(sv.unidade)}</span></div><div class="st"><h3>${titulo}</h3>`;
  if (!ent) h += `<div class="pz">prazo: ${esc(sv.prazo)}</div>`;
  h += '<ol class="passos">' + passos.map(([t, c, sub]) => `<li${c ? ` class="${c}"` : ''}>${esc(t)}${sub ? `<small>${esc(sub)}</small>` : ''}</li>`).join('') + '</ol>';
  if (ent) h += `<div class="pronto"><a class="b cheio" href="${esc(ent.link)}" target="_blank" rel="noopener">${DESCE}Baixar ${sv.tipo === 'encomenda' ? 'o beat' : 'a faixa'}</a></div>`;
  // 12/10/2026: depois de entregue, só o botão de baixar; antes, o que foi mandado com "Editar"
  if (env && !ent) {
    const linhas = sv.campos.filter((c) => env[c.k]).map((c) => `<dt>${esc(c.rot)}</dt><dd>${c.link ? `<a href="${esc(env[c.k])}" target="_blank" rel="noopener nofollow">${esc(env[c.k])}</a>` : esc(env[c.k])}</dd>`).join('');
    h += `<div class="mandou"><div class="cab-m"><div class="rot">O que você mandou · ${esc(dataCurta(env.em))}</div><button type="button" class="troca" data-troca="${k}">Editar</button></div><dl>${linhas}</dl><p class="pode">Dá pra editar até a entrega.</p></div>`;
  }
  if (!ent) {
    h += `<form class="fm" data-envio="${k}" action="${base}/envio/${k}" method="post"${env ? ' hidden' : ''} novalidate><h4>${esc(sv.titulo)}</h4><p>${esc(sv.texto)}</p>` +
      sv.campos.map((c) => {
        const id = `f${k}${c.k}`, v = env && env[c.k] ? esc(env[c.k]) : '';
        const rot = `<label for="${id}">${esc(c.rot)}${c.obrig ? '' : ' <i>(opcional)</i>'}</label>`;
        return rot + (c.alto
          ? `<textarea id="${id}" name="${c.k}" placeholder="${esc(c.ph)}" maxlength="1500">${v}</textarea>`
          : `<input id="${id}" name="${c.k}" type="${c.link ? 'url' : 'text'}" inputmode="${c.link ? 'url' : 'text'}" placeholder="${esc(c.ph)}" value="${v}" maxlength="400"${c.obrig ? ' required' : ''}${c.link ? ' autocapitalize="off" autocorrect="off" spellcheck="false"' : ''}>`);
      }).join('') +
      `<button type="submit">${env ? 'Salvar as mudanças' : 'Enviar pro estúdio'}</button>${env ? `<button type="button" class="cancela" data-cancela="${k}">Cancelar</button>` : ''}<p class="er" role="alert" hidden></p></form>`;
    if (!env && sv.dicas) h += '<ul class="dicas">' + sv.dicas.map((d) => `<li>${esc(d)}</li>`).join('') + '</ul>';
  }
  return h + '</div></section>';
}

// o formulário do serviço manda por fetch e recarrega a página (sem fetch: o POST normal)
const FORM_JS = `<script>(function(){
document.querySelectorAll('[data-troca]').forEach(function(b){b.addEventListener('click',function(){var f=document.querySelector('form[data-envio="'+b.getAttribute('data-troca')+'"]');if(f){f.hidden=false;var m=b.closest('.mandou');if(m)m.hidden=true;var i=f.querySelector('input,textarea');if(i)i.focus();}});});
document.querySelectorAll('[data-cancela]').forEach(function(b){b.addEventListener('click',function(){var k=b.getAttribute('data-cancela'),f=document.querySelector('form[data-envio="'+k+'"]'),t=document.querySelector('[data-troca="'+k+'"]');if(f)f.hidden=true;if(t){var m=t.closest('.mandou');if(m)m.hidden=false;}});});
document.querySelectorAll('form[data-envio]').forEach(function(f){f.addEventListener('submit',function(e){
  if(!window.fetch)return;e.preventDefault();var bt=f.querySelector('button[type=submit]'),er=f.querySelector('.er'),d={};
  f.querySelectorAll('input,textarea').forEach(function(i){d[i.name]=i.value;});
  bt.disabled=true;var rot=bt.textContent;bt.textContent='Enviando…';er.hidden=true;
  fetch(f.getAttribute('action'),{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify(d)})
    .then(function(r){return r.json();}).then(function(j){if(j&&j.ok){location.reload();return;}bt.disabled=false;bt.textContent=rot;er.textContent=(j&&j.erro)||'Não foi agora. Tenta de novo.';er.hidden=false;})
    .catch(function(){bt.disabled=false;bt.textContent=rot;er.textContent='Sem conexão agora. Tenta de novo.';er.hidden=false;});
});});})();</script>`;

// Página curta pra quando um arquivo não sai (limite de downloads, arquivo fora do ar)
export function paginaAviso(titulo, texto, voltar, kicker = 'Pedido') {
  return cabecalho(`${titulo} · Caramujo Records`) + '\n<body>\n' + topo + '\n<main>' +
    `<span class="k">${esc(kicker)}</span><h1>${esc(titulo)}</h1><p class="lede">${esc(texto)}</p>` +
    (voltar ? `<p class="guarda"><a href="${esc(voltar)}">Voltar pro pedido</a></p>` : '') + ajuda + '</main>' + rodape + '\n</body></html>';
}
