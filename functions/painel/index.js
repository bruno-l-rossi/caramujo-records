// Painel privado do rideblan33. Só abre com a senha guardada em PAINEL_SENHA.
// Mostra os artistas, o link de cada um, a permissão de download e quem ouviu o quê.

import { COOKIE, DIAS, assinar, igual, autenticado, cookieEu } from '../_lib/sessao.js';
import { ICONES } from '../_lib/icones.js';
import { COMENTARIOS } from '../_lib/comentarios.js';

/* ---------- entrada ---------- */

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (!env.PAINEL_SENHA) return html(aviso('Falta a senha do painel'), 500);

  if (request.method === 'POST') {
    const form = await request.formData();
    const senha = String(form.get('senha') || '');
    if (!igual(senha, env.PAINEL_SENHA)) {
      return html(telaSenha('Senha errada.'), 401);
    }
    const t = await assinar(env, Date.now() + DIAS * 864e5);
    const h = new Headers({ location: url.pathname });
    h.append('set-cookie', `${COOKIE}=${t}; Path=/; Max-Age=${DIAS * 86400}; HttpOnly; Secure; SameSite=Lax`);
    // este aparelho para de contar no analytics (10/10/2026, _lib/sessao.js)
    h.append('set-cookie', await cookieEu(env));
    return new Response(null, { status: 303, headers: h });
  }

  if (!(await autenticado(request, env))) return html(telaSenha(), 401);
  // a marca do aparelho é renovada a cada abertura do painel (400 dias)
  const r = html(pagina());
  r.headers.append('set-cookie', await cookieEu(env));
  return r;
}

function html(corpo, status = 200) {
  return new Response(corpo, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex'
    }
  });
}

/* ---------- telas ---------- */

const BASE = `
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
${ICONES}
<meta name="theme-color" content="#0a0a0a">
<!-- fonte servida daqui (assets/fonts, licença OFL): sem Google no caminho -->
<link rel="preload" href="/assets/fonts/schibsted-grotesk-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<style>
@font-face{font-family:'Schibsted Grotesk';font-style:normal;font-weight:400 900;font-display:swap;src:url(/assets/fonts/schibsted-grotesk-latin-wght-normal.woff2) format('woff2');unicode-range:U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;}
  :root{--ink:#fff;--ink2:#b7b7b7;--ink3:#8a8a8a;--ink4:#6a6a6a;--linha:#1f1f1f;--campo:#141414;--borda:#252525}
  *{box-sizing:border-box}
  html,body{height:100%}
  body{margin:0;background:#0a0a0a;color:var(--ink);
    font-family:"Schibsted Grotesk",-apple-system,"Helvetica Neue",Helvetica,Arial,sans-serif;
    -webkit-font-smoothing:antialiased}
  button,input,textarea,select{font-family:inherit;color:inherit}
  a{color:#fff}
  :focus-visible{outline:2px solid #fff;outline-offset:2px}
  .wrap{max-width:760px;margin:0 auto;padding:0 18px 120px}
  .topo{display:flex;align-items:center;justify-content:space-between;
    padding:18px 0 6px;padding-top:calc(18px + env(safe-area-inset-top,0px))}
  .marca{display:block;width:148px;height:27px;background:url('/assets/brand/caramujo-h.webp') left center/contain no-repeat;opacity:.9}
  a.marca{transition:opacity .15s}
  a.marca:hover{opacity:1}
  h1{margin:22px 0 4px;font-size:34px;font-weight:700;letter-spacing:-.02em}
  .sub{font-size:14px;color:var(--ink4)}
  .barra{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0 6px}
  .barra .pill{flex:0 0 auto}
  .barra[hidden],#resumo[hidden],#lista[hidden],#analytics[hidden],#vitrine[hidden],#musicas[hidden],#gravou[hidden],#comentarios[hidden]{display:none}
  @media (max-width:560px){
    /* 16/10/2026 (rodada K): busca na linha toda e os dois botões dividindo a de baixo
       (antes o 1º ficava solto no meio, com um buraco à esquerda) */
    .barra .campo{flex:1 1 100%}
    .barra .pill{flex:1 1 0;justify-content:center;min-width:0}
    h1{font-size:30px}
    .wrap{padding:0 16px 120px}
  }
  /* celular (16/10/2026, rodada K): campo com letra menor que 16px faz o iPhone dar zoom
     ao tocar, e a tela fica cortada até a pessoa tirar o zoom na mão. Vale pros campos das
     telas que vêm de arquivo à parte também (por isso o seletor mais forte). */
  @media (max-width:899px){
    html body :is(input,select,textarea):not([type="checkbox"]):not([type="radio"]){font-size:16px}
  }
  .campo{flex:1;display:flex;align-items:center;gap:10px;background:var(--campo);
    border:1px solid var(--borda);border-radius:12px;padding:11px 14px}
  .campo input{flex:1;min-width:0;background:transparent;border:0;outline:none;font-size:15px}
  .campo input::placeholder{color:#5a5a5a}
  .pill{display:flex;align-items:center;gap:7px;padding:11px 16px;border-radius:999px;
    border:1px solid var(--borda);background:#181818;font-size:14px;font-weight:500;cursor:pointer;white-space:nowrap}
  .pill.solid{background:#fff;color:#000;border-color:#fff}
  .pill:disabled{opacity:.45;cursor:default}
  .linha{display:flex;align-items:center;gap:14px;padding:14px 0;border:0;min-width:0;
    background:transparent;width:100%;text-align:left;cursor:pointer}
  .item{display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--linha)}
  .item .linha{flex:1;min-width:0}
  .nome{display:block;font-size:16px;font-weight:600;line-height:1.25;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .meta{display:block;margin-top:4px;font-size:12.5px;color:var(--ink3);line-height:1.3;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .capa-lista{width:44px;height:44px;flex-shrink:0;border-radius:9px;overflow:hidden;background:#171717;
    border:1px solid var(--linha);display:flex;align-items:center;justify-content:center}
  .capa-lista img{width:100%;height:100%;object-fit:cover}
  .capa-lista.vazia img{width:18px;height:18px;object-fit:contain;opacity:.28}
  .copiar{width:42px;height:42px;flex-shrink:0;border-radius:11px;border:1px solid var(--borda);
    background:#141414;display:flex;align-items:center;justify-content:center;cursor:pointer}
  .vazio{padding:40px 0;color:#5a5a5a;font-size:14px}
  .andamento{display:flex;align-items:center;gap:10px;margin-top:8px}
  .trilho{flex:1;height:4px;border-radius:3px;background:#242424;overflow:hidden}
  .trilho i{display:block;height:4px;background:#fff;transition:width .4s ease}
  .trilho.indef i{width:35%;animation:vaivem 1.1s ease-in-out infinite}
  @keyframes vaivem{0%{margin-left:-35%}100%{margin-left:100%}}
  .andamento small{font-size:11.5px;color:var(--ink3);white-space:nowrap;font-variant-numeric:tabular-nums}
  @media (prefers-reduced-motion:reduce){.trilho.indef i{animation:none;width:100%;opacity:.4}}
  .veil{position:fixed;inset:0;z-index:30;background:rgba(0,0,0,.65);display:flex;align-items:flex-end;justify-content:center}
  .veil[hidden]{display:none}
  .card{width:100%;max-width:560px;background:#141414;border:1px solid var(--borda);
    border-radius:20px 20px 0 0;padding:20px 18px calc(24px + env(safe-area-inset-bottom,0px));
    max-height:86vh;max-height:86dvh;overflow-y:auto;overscroll-behavior:contain}
  .card h2{margin:0 0 3px;font-size:20px;overflow-wrap:anywhere}
  .cab{display:flex;align-items:center;gap:13px}
  .cab-txt{flex:1;min-width:0}
  .capa-mini{width:62px;height:62px;flex:none;border-radius:8px;overflow:hidden;background:#171717;
    border:1px solid var(--linha);display:flex;align-items:center;justify-content:center}
  .capa-mini img{width:100%;height:100%;object-fit:cover}
  .capa-mini.vazia{color:var(--ink4);font-size:10px;letter-spacing:.08em;text-align:center;padding:4px}
  .card .end{font-size:13px;color:var(--ink4);word-break:break-all}
  .card p{margin:0;font-size:13.5px;color:var(--ink3)}
  .card-list{display:flex;flex-direction:column;gap:2px;margin-top:16px}
  .card-list button{display:flex;align-items:center;gap:13px;width:100%;padding:14px 10px;
    background:transparent;border:0;border-radius:12px;font-size:15px;color:var(--ink);
    text-align:left;cursor:pointer;-webkit-appearance:none;appearance:none}
  .card-list button:hover{background:#1a1a1a}
  .card-list button:active{background:#1d1d1d}
  .bloco{margin-top:20px}
  /* Perfil @rideblan33: lista numerada pra arrastar (26/09/2026) */
  .capa-lista.perfil,.capa-mini.perfil{border-radius:50%}
  .pf-lista{list-style:none;margin:0;padding:0;counter-reset:pf}
  .pf-lista{position:relative}
  .pf-lista li{position:relative;display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--linha);background:#141414;will-change:transform}
  .pf-lista li.pego{z-index:3;background:#1e1e1e;box-shadow:0 14px 34px rgba(0,0,0,.6);border-radius:10px;border-bottom-color:transparent}
  .pf-n{width:26px;flex:none;text-align:right;font-size:13px;font-weight:700;color:var(--ink3);font-variant-numeric:tabular-nums}
  .pf-capa{width:40px;height:40px;flex:none;border-radius:6px;overflow:hidden;background:#171717}
  .pf-capa img{width:100%;height:100%;object-fit:cover;display:block}
  .pf-capa img.sem{object-fit:contain;padding:22%}
  .pf-txt{flex:1;min-width:0}
  .pf-txt b{display:block;font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .pf-txt small{display:block;font-size:12px;color:var(--ink4);margin-top:2px}
  .pf-alca{width:44px;height:44px;flex:none;display:flex;align-items:center;justify-content:center;color:#8a8a8a;cursor:grab;touch-action:none;
    background:transparent;border:0;border-radius:10px;padding:0}
  .pf-alca:focus-visible{outline:2px solid #fff;outline-offset:-2px}
  .pf-alca:hover{color:#fff;background:#1a1a1a}
  .pf-alca:active{cursor:grabbing}
  .pf-fora li .pill{padding:8px 12px;font-size:13px}
  .rot{font-size:11px;letter-spacing:.2em;color:var(--ink4);margin-bottom:10px}
  .desc{width:100%;min-height:104px;resize:vertical;background:var(--campo);border:1px solid var(--borda);
    border-radius:12px;padding:12px 14px;font-size:14.5px;line-height:1.5;outline:none;
    color:var(--ink);caret-color:var(--ink)}
  .desc::placeholder{color:#5a5a5a}
  .desc:focus{border-color:#3a3a3a}
  .desc-baixo{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:8px}
  .desc-baixo small{font-size:11.5px;color:var(--ink4);font-variant-numeric:tabular-nums}
  .aviso{border:0;background:transparent;padding:0;font-size:14px;color:#e0b155;
    text-decoration:underline;text-underline-offset:3px;cursor:pointer}
  .seta{flex:none;color:var(--ink4);font-size:20px;line-height:1}
  .revisar{border:1px solid #3a2f18;background:#16120a;border-radius:14px;padding:14px 16px;margin:6px 0 14px}
  .revisar b{display:block;font-size:14.5px;font-weight:600}
  .revisar.limpo{border-color:#1f1f1f;background:#101010}
  .vazio small{display:block;margin-top:8px;color:var(--ink4);font-size:12.5px;line-height:1.5}
  .vazio b{color:var(--ink2);font-weight:600}
  .revisar>small{display:block;color:var(--ink3);font-size:12.5px;line-height:1.45;margin-top:4px}
  .revisar ul{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:12px}
  .rev-tape{margin-top:14px;padding-top:12px;border-top:1px solid #2a2314}
  .rev-topo{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
  .rev-topo b{font-size:12.5px;letter-spacing:.06em;text-transform:uppercase;color:#d9c79a}
  .rev-tudo{font-size:11.5px;color:var(--ink4);display:flex;align-items:center;gap:6px}
  .revisar li{display:flex;flex-direction:column;gap:5px}
  .rev-nome{font-size:14.5px}
  .rev-nome i{font-style:normal;color:var(--ink4);font-size:12.5px}
  .revisar li small{color:var(--ink4);font-size:12px;line-height:1.4}
  .rev-acoes{display:flex;gap:7px;margin-top:2px}
  .revisar button{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05);color:var(--ink);
    padding:5px 11px;border-radius:999px;font-size:12px;cursor:pointer;white-space:nowrap}
  .revisar button:hover{background:rgba(255,255,255,.11)}
  .revisar button:disabled{opacity:.4;cursor:default}
  .sw{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:13px 0;border-bottom:1px solid var(--linha)}
  .sw b{font-size:15px;font-weight:500}
  .sw small{display:block;margin-top:3px;font-size:12px;color:var(--ink4)}
  .toggle{width:50px;height:30px;border-radius:999px;border:1px solid var(--borda);background:#242424;
    position:relative;cursor:pointer;flex-shrink:0;transition:background .15s}
  .toggle i{position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#8a8a8a;transition:.15s}
  .toggle[aria-pressed="true"]{background:#fff;border-color:#fff}
  .toggle[aria-pressed="true"] i{left:23px;background:#000}
  .numeros{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}
  .numeros div{background:#101010;border:1px solid var(--borda);border-radius:12px;padding:12px 10px}
  .numeros b{display:block;font-size:21px;line-height:1.1;font-variant-numeric:tabular-nums}
  .numeros span{display:block;margin-top:6px;font-size:10px;letter-spacing:.09em;color:var(--ink4);
    text-transform:uppercase;line-height:1.3}
  .pag{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px}
  .pag button{width:38px;height:38px;border-radius:10px;border:1px solid var(--borda);background:#141414;
    color:#fff;font-size:16px;cursor:pointer}
  .pag button:disabled{opacity:.35;cursor:default}
  .pag small{font-size:12px;color:var(--ink4);font-variant-numeric:tabular-nums}
  .ev{display:flex;gap:10px;padding:9px 0;font-size:13px;color:var(--ink2);border-bottom:1px solid #161616}
  .ev span:first-child{color:var(--ink4);width:96px;flex-shrink:0;font-variant-numeric:tabular-nums}
  .acoes{display:flex;gap:10px;margin-top:20px}
  .acoes .pill{flex:1;justify-content:center}
  .toast{position:fixed;left:50%;transform:translateX(-50%);bottom:26px;z-index:60;background:#1d1d1d;
    border:1px solid #2d2d2d;font-size:13px;padding:11px 15px;border-radius:12px;transition:opacity .25s}
  .toast[hidden]{display:none}
  .login{min-height:100%;display:flex;align-items:center;justify-content:center;padding:24px}
  .login form{width:100%;max-width:320px;text-align:center}
  .login .marca{margin:0 auto 26px}
  .login input{width:100%;background:var(--campo);border:1px solid var(--borda);border-radius:12px;
    padding:14px;font-size:16px;text-align:center;outline:none}
  .login button{width:100%;margin-top:12px;padding:14px;border-radius:12px;border:0;background:#fff;color:#000;
    font-size:15px;font-weight:600;cursor:pointer}
  .erro{margin-top:14px;font-size:13px;color:#e08d7e}
  .revisar .vit-topo{display:flex;align-items:center;justify-content:space-between;width:100%;padding:0;border:0;
    background:transparent;color:var(--ink);cursor:pointer;text-align:left;border-radius:0;font-size:inherit;white-space:normal}
  .revisar .vit-topo:hover{background:transparent}
  .vit-topo .vit-seta{font-size:20px;color:var(--ink3);transition:transform .15s}
  .vit-topo[aria-expanded="true"] .vit-seta{transform:rotate(90deg)}
  .vit-corpo[hidden]{display:none}
  .home{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:22px}
  .consumo{display:block;margin-top:6px;padding:0;border:0;background:transparent;font-size:13px;color:var(--ink4);cursor:pointer;text-align:left}
  .consumo.alto{color:#e0b155;text-decoration:underline;text-underline-offset:3px}
  @media (max-width:640px){.home{grid-template-columns:1fr}}
  /* números do site (27/09/2026): linha larga embaixo dos 4 cartões */
  .home button.num{grid-column:1/-1;min-height:0;flex-direction:row;align-items:center;gap:14px;padding:14px 18px}
  .home button.num b{font-size:16px}
  .home button.num .seta{margin-left:auto;color:var(--ink3);font-size:20px}
  .nums{display:flex;flex-direction:column;gap:10px;margin-top:10px}
  .nums label{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:14.5px}
  .nums input{width:150px;background:var(--campo);border:1px solid var(--borda);border-radius:10px;padding:11px 12px;font-size:16px;text-align:right;outline:none;font-variant-numeric:tabular-nums}
  .nums input:focus{border-color:#4a4a4a}
  .nums-prev{margin-top:14px;font-size:12.5px;line-height:1.6;color:var(--ink3)}
  .nums-prev b{color:var(--ink);font-weight:600}
  .home button{display:flex;flex-direction:column;align-items:flex-start;gap:14px;min-height:150px;padding:18px;
    background:#111;border:1px solid var(--borda);border-radius:16px;color:var(--ink);text-align:left;cursor:pointer;
    transition:background .15s,border-color .15s}
  .home button:hover{background:#161616;border-color:#343434}
  .home .ico{width:40px;height:40px;border-radius:11px;background:#1b1b1b;display:flex;align-items:center;justify-content:center}
  .home b{font-size:20px;letter-spacing:-.01em}
  .home small{display:block;margin-top:4px;font-size:13px;color:var(--ink3);line-height:1.4}
  .home small em{font-style:normal;color:#e0b155}
  .periodo{display:flex;gap:8px;margin:14px 0 4px}
  .periodo .pill{padding:8px 14px;font-size:13px}
  .etapa{padding:11px 0;border-bottom:1px solid var(--linha)}
  .etapa-topo{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
  .etapa-topo b{font-size:14.5px;font-weight:600}
  .etapa-topo span{font-size:20px;font-weight:700;font-variant-numeric:tabular-nums}
  .etapa-barra{height:6px;border-radius:3px;background:#1e1e1e;margin:8px 0 6px;overflow:hidden}
  .etapa-barra i{display:block;height:6px;border-radius:3px;background:#fff}
  .etapa small{display:block;font-size:12px;color:var(--ink4);font-variant-numeric:tabular-nums}
  .etapa small em{font-style:normal;color:#e0b155}
  .tabela{width:100%;border-collapse:collapse;font-size:13.5px;font-variant-numeric:tabular-nums}
  .tabela td{padding:8px 0;border-bottom:1px solid #161616}
  .tabela td+td{text-align:right;color:var(--ink3);width:70px}
  .dias{display:flex;align-items:flex-end;gap:2px;height:54px;margin-top:6px}
  .dias i{flex:1;background:#2c2c2c;border-radius:2px 2px 0 0;min-height:2px;position:relative}
  .dias i.venda{background:#fff}
  .dias-leg{display:flex;justify-content:space-between;font-size:11px;color:var(--ink4);margin-top:5px}
  /* painel novo (12/10/2026): barra das seções (embaixo no celular, do lado no computador) */
  .nav-p{position:fixed;left:0;right:0;bottom:0;z-index:20;display:grid;grid-template-columns:repeat(5,1fr);padding:6px 4px calc(8px + env(safe-area-inset-bottom,0px));background:rgba(10,10,10,.96);border-top:1px solid var(--linha);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
  .nav-p button,.nav-p a{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 2px;border:0;background:transparent;color:var(--ink4);font-size:10.5px;font-weight:600;text-decoration:none;cursor:pointer}
  .nav-p [aria-current="page"]{color:#fff}
  .nav-p em{position:absolute;top:0;left:calc(50% + 5px);min-width:16px;height:16px;padding:0 4px;border-radius:8px;background:#fff;color:#000;font-style:normal;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center}
  .nav-p .np-marca,.nav-p .np-sep,.nav-p .np-lado,.nav-p .np-sub,.nav-p .np-seta{display:none}
  .topo .eng{width:40px;height:40px;border-radius:12px;border:1px solid var(--borda);background:#141414;color:#d9d9d9;display:flex;align-items:center;justify-content:center;cursor:pointer}
  .topo .eng[aria-current="page"]{background:#fff;color:#000;border-color:#fff}
  @media (min-width:900px){
    .nav-p{top:0;right:auto;bottom:0;width:236px;display:flex;flex-direction:column;align-items:stretch;gap:2px;padding:22px 14px;border-top:0;border-right:1px solid var(--linha);background:#0a0a0a}
    .nav-p .np-marca{display:block;width:148px;height:27px;margin:0 8px 26px;background:url('/assets/brand/caramujo-h.webp') left center/contain no-repeat;opacity:.9}
    .nav-p button,.nav-p a{flex-direction:row;gap:12px;padding:10px;border-radius:10px;font-size:14.5px;font-weight:500;color:var(--ink2)}
    .nav-p [aria-current="page"]{background:#1a1a1a;color:#fff;font-weight:600}
    .nav-p button:hover,.nav-p a:hover{background:#151515;color:#fff}
    .nav-p em{position:static;margin-left:auto}
    .nav-p .np-sep{display:block;height:1px;background:var(--linha);margin:14px 6px}
    .nav-p .np-pai[aria-expanded="true"] .np-seta{transform:rotate(90deg)}
    .nav-p .np-seta{display:inline;margin-left:auto;color:var(--ink4);font-size:13px;transition:transform .15s}
    .nav-p em+.np-seta{margin-left:8px}
    .nav-p .np-sub{display:flex;flex-direction:column;gap:1px;margin:0 0 6px 32px;padding-left:10px;border-left:1px solid var(--linha)}
    .nav-p .np-sub button{padding:7px 10px;border-radius:8px;font-size:13.5px;font-weight:500;color:var(--ink3)}
    .nav-p .np-sub button[aria-current="true"]{background:none;color:#fff;font-weight:600}
    .nav-p .np-sub em{position:static;margin-left:auto}
    .nav-p .np-lado{display:flex}
    .wrap{margin-left:236px;max-width:900px;padding:0 44px 80px}
    .topo .marca,.topo .eng{display:none}
    .topo{min-height:10px}
  }
  /* 16/10/2026: as partes da seção viraram abas (linha embaixo), e os filtros um seletor menor,
     pra não confundir uma coisa com a outra */
  .secoes{display:flex;gap:24px;margin:14px 0 4px;border-bottom:1px solid var(--linha);overflow-x:auto;scrollbar-width:none}
  .secoes::-webkit-scrollbar{display:none}
  .secoes[hidden]{display:none}
  .secoes button{flex:none;display:flex;align-items:center;gap:7px;padding:11px 1px 12px;margin-bottom:-1px;border:0;border-bottom:2px solid transparent;border-radius:0;background:transparent;color:var(--ink3);font-size:15px;font-weight:600;cursor:pointer;white-space:nowrap}
  .secoes button:hover{color:#fff}
  .secoes button[aria-pressed="true"]{color:#fff;border-bottom-color:#fff}
  .secoes i{font-style:normal;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:#fff;color:#000;font-size:11px;font-weight:700;display:inline-flex;align-items:center;justify-content:center}
  .filtros{display:inline-flex;gap:2px;margin:16px 0 8px;padding:3px;border-radius:10px;background:#141414;border:1px solid var(--borda)}
  .filtros button{flex:none;padding:6px 12px;border:0;border-radius:8px;background:transparent;color:var(--ink3);font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap}
  .filtros button[aria-pressed="true"]{background:#2a2a2a;color:#fff;font-weight:600}
  .hoje .rot{margin:24px 0 8px}
  .ac{display:flex;align-items:center;gap:12px;width:100%;padding:14px;margin-bottom:8px;border:1px solid var(--borda);border-radius:16px;background:#121212;color:var(--ink);text-align:left;cursor:pointer}
  .ac:hover{background:#161616;border-color:#343434}
  .ac.quente{border-color:#3a3a3a;background:#161616}
  .ac .ico{flex:none;width:40px;height:40px;border-radius:11px;background:#1c1c1c;display:flex;align-items:center;justify-content:center;color:#d9d9d9}
  .ac.quente .ico{background:#fff;color:#000}
  .ac .t{flex:1;min-width:0}
  .ac b{display:block;font-size:15px;font-weight:600}
  .ac small{display:block;margin-top:3px;font-size:12.5px;color:var(--ink3);line-height:1.35}
  .ac small em{font-style:normal;color:#e0b155}
  .ac .seta{color:var(--ink3);font-size:20px}
  .nada{margin:4px 0 8px;font-size:14px;color:var(--ink4)}
  .tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
  .tile{padding:12px;border:1px solid var(--borda);border-radius:14px;background:#121212;color:var(--ink);text-align:left;cursor:pointer}
  .tile small{display:block;font-size:11.5px;color:var(--ink3)}
  .tile b{display:block;margin-top:4px;font-size:22px;font-weight:700;font-variant-numeric:tabular-nums}
  .tile i{display:block;margin-top:2px;font-style:normal;font-size:11px;color:var(--ink4)}
  .atalhos{display:flex;gap:8px;flex-wrap:wrap}
  .ped{display:flex;align-items:center;gap:12px;width:100%;padding:13px 0;border:0;border-bottom:1px solid var(--linha);background:transparent;color:var(--ink);text-align:left;cursor:pointer}
  .ped .av{flex:none;width:40px;height:40px;border-radius:10px;background:#1c1c1c;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#bdbdbd}
  .ped .t{flex:1;min-width:0}
  .ped b{display:block;font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ped small{display:block;margin-top:3px;font-size:12.5px;color:var(--ink3)}
  .chip{flex:none;font-size:11px;font-weight:700;padding:5px 9px;border-radius:999px;border:1px solid var(--borda);color:var(--ink2)}
  .chip.faz{background:#fff;color:#000;border-color:#fff}
  .card .mat{margin-top:6px;font-size:13.5px;color:var(--ink2);overflow-wrap:anywhere}
  .card .mat span{color:var(--ink4)}
  .card .entrega{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
  .card .entrega input{flex:1 1 220px;min-width:0;padding:11px 12px;border:1px solid var(--borda);border-radius:10px;background:#0f0f0f;color:inherit;font:inherit;font-size:14px;outline:none}
  .card .sub,.wrap .sub{font-size:13px;color:var(--ink3)}
  .acoes a.pill{text-decoration:none;justify-content:center}
  .sw-b{width:100%;border:0;border-bottom:1px solid var(--linha);background:transparent;color:inherit;text-align:left;cursor:pointer}
  .sw-b .seta{color:var(--ink3);font-size:20px}
  .barra-c{height:6px;border-radius:3px;background:#242424;margin-top:8px;overflow:hidden}
  .barra-c i{display:block;height:6px;background:#fff;min-width:2px}
</style>`;

function telaSenha(erro) {
  return `<!doctype html><html lang="pt-BR"><head><title>Painel · Caramujo</title>${BASE}</head>
<body><div class="login"><form method="post">
  <div class="marca"></div>
  <input type="password" name="senha" placeholder="senha" autofocus autocomplete="current-password">
  <button type="submit">Entrar</button>
  ${erro ? `<div class="erro">${erro}</div>` : ''}
</form></div></body></html>`;
}

function aviso(texto) {
  return `<!doctype html><html lang="pt-BR"><head><title>Painel</title>${BASE}</head>
<body><div class="login"><div><div class="marca"></div><p class="sub">${texto}</p></div></div></body></html>`;
}

function pagina() {
  return `<!doctype html><html lang="pt-BR"><head><title>Painel · Caramujo</title>${BASE}</head>
<body>
<div class="wrap">
  <div class="topo"><a class="marca" href="/" aria-label="Voltar pro site"></a><button type="button" class="eng" id="engBtn" aria-label="Ajustes"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg></button></div>
  <h1 id="titulo">Hoje</h1>
  <div class="sub" id="resumo">carregando…</div>
  <div class="secoes" id="secoes" role="group" aria-label="Partes da seção" hidden></div>

  <div class="barra" id="barra" hidden>
    <div class="campo">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6a6a6a" stroke-width="1.9"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.6-4.6"/></svg>
      <label for="q" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Buscar artista</label>
      <input id="q" type="search" placeholder="Buscar artista" autocomplete="off">
    </div>
    <button class="pill" id="ordemBtn" type="button">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M8 4v16"/><path d="M5 7l3-3 3 3"/><path d="M16 20V4"/><path d="M13 17l3 3 3-3"/></svg>
      <span id="ordemLabel">Atividade</span>
    </button>
    <button class="pill" id="syncTudo" type="button">Converter tudo</button>
  </div>

  <div id="lista"><div class="vazio">carregando…</div></div>
  <div id="analytics" hidden></div>
  <div id="vitrine" hidden></div>
  <div id="musicas" hidden></div>
  <div id="gravou" hidden></div>
  <div id="comentarios" hidden></div>
</div>
<script src="/assets/painel/analytics.js?v=2026-10-16a" defer></script>
<script src="/assets/painel/vitrine.js?v=2026-10-16a" defer></script>
<script src="/assets/painel/musicas.js?v=2026-10-17a" defer></script>
<script src="/assets/painel/gravou.js?v=2026-10-17c" defer></script>
<script src="/assets/painel/comentarios.js?v=2026-10-10a" defer></script>

<nav class="nav-p" id="navP" aria-label="Seções do painel"></nav>
<div class="veil" id="veil" hidden><div class="card" id="card" role="dialog" aria-modal="true"></div></div>
<div class="toast" id="toast" hidden></div>

<script>
(function(){
  var $=function(i){return document.getElementById(i)};
  var COMENTARIOS_LIGADOS=${COMENTARIOS.ligado ? 'true' : 'false'};   // 11/10/2026: desligados (_lib/comentarios.js)
  var artistas=[], tapes=[], revisar=[], revisarErro=false, vista='hoje', filtro='', ordem='atividade', perfilVisto=null;
  var lojaResumo=null, lojaPedida=false, consumoHoje=null, consumoPedido=false, numerosSite=null, numerosPedido=false;
  var musicasResumo=null, musicasPedido=false, comentResumo=null, comentPedido=false, entrega=null, entregaPedida=false;
  var ordemDe={artistas:'atividade',tapes:'modificado'};
  var ORDENS={modificado:'Modificação', atividade:'Atividade', az:'A a Z', faixas:'Mais faixas', perfil:'Ordem do perfil'};
  // Perfil do @rideblan33 (26/09/2026): a mesma conta da página (tape sem ordem = nova = topo)
  function chavePerfil(a){ return a.perfil_ordem!=null ? Number(a.perfil_ordem) : -1000000000 - a.id; }
  function noPerfil(){
    return tapes.filter(function(t){ return t.perfil!==0 && (t.nb||0)>0 })
      .sort(function(x,y){ return chavePerfil(x)-chavePerfil(y) || x.id-y.id });
  }
  function posicaoPerfil(a){
    if(a.perfil===0) return 'Fora do perfil';
    if(!(a.nb>0)) return 'Aparece quando tiver beat pronto';
    var l=noPerfil(), i=l.indexOf(a);
    return (i+1)+'ª de '+l.length+' no perfil';
  }

  function tempo(iso){
    if(!iso) return 'nunca abriu';
    var q=new Date(iso), agora=new Date();
    if((agora.getTime()-q.getTime())/1000 < 3600) return 'aberto agora há pouco';
    // o que conta é a virada do dia: 23h50 de ontem é ONTEM, não "hoje há 24h"
    var zero=function(x){return new Date(x.getFullYear(),x.getMonth(),x.getDate()).getTime()};
    var dias=Math.round((zero(agora)-zero(q))/86400000);
    if(dias<=0) return 'aberto hoje';
    if(dias===1) return 'aberto ontem';
    if(dias<30) return 'aberto há '+dias+' dias';
    var m=Math.floor(dias/30);
    return 'aberto há '+m+(m===1?' mês':' meses');
  }
  function gb(b){
    if(b < 1073741824) return Math.round(b/1048576)+' MB';
    return (b/1073741824).toFixed(1).replace('.',',')+' GB';
  }
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]})}

  // Conversão rodando: a cada 5 s pergunto SÓ o andamento (umas 100 linhas do banco),
  // e só com a aba à vista. A lista completa recarrega uma vez, quando alguém termina.
  // (24/09/2026: recarregar tudo a cada 3 s com o painel aberto estourou o limite
  // diário de leitura do D1 durante a conversão total.)
  var relogio=null;
  function acompanhar(){
    var ativo = artistas.concat(tapes).some(rodando);
    if(ativo && !relogio) relogio=setInterval(espiar, 5000);
    if(!ativo && relogio){ clearInterval(relogio); relogio=null; }
  }
  function espiar(){
    if(document.hidden) return;
    fetch('/api/painel?op=andamento').then(function(r){return r.json()}).then(function(j){
      if(!j||!Array.isArray(j.rodando)) return;
      var agora={}; j.rodando.forEach(function(x){ agora[x.id]=x; });
      var terminou=false;
      artistas.concat(tapes).forEach(function(a){
        var x=agora[a.id];
        if(x){ a.job_estado=x.job_estado; a.job_total=x.job_total; a.job_feitos=x.job_feitos; a.job_at=x.job_at; }
        else if(rodando(a)){ terminou=true; a.job_estado='pronto'; }
      });
      if(terminou) carregar(true);
      else if(vista==='artistas'||vista==='tapes') desenhar();
      acompanhar();
    }).catch(function(){});
  }

  function carregar(silencioso){
    fetch('/api/painel?op=artistas').then(function(r){return r.json()}).then(function(j){
      var antes=artistas.filter(rodando).length;
      var todos=j.artistas||[];
      artistas=todos.filter(function(a){return a.tipo==='artista'});   // 'vitrine' é interno, não aparece
      tapes=todos.filter(function(a){return a.tipo==='tape'});
      perfilVisto=j.perfilVisto||null;
      pintarResumo(j.prateleira.usado);
      desenhar();
      acompanhar();
      fetch('/api/painel?op=revisar').then(function(r){return r.json()}).then(function(x){
        // lista vazia é resposta; resposta torta não pode virar "nada pra revisar"
        revisarErro = !x || !Array.isArray(x.faixas);
        revisar = revisarErro ? [] : x.faixas;
        pintarResumo(j.prateleira.usado); desenhar();
      }).catch(function(){
        revisarErro=true; revisar=[]; pintarResumo(j.prateleira.usado); desenhar();
      });
      if(silencioso && antes && !artistas.filter(rodando).length) flash('Conversão terminou.');
    }).catch(function(){
      if(!silencioso) $('lista').innerHTML='<div class="vazio">Não consegui carregar. Recarrega a página.</div>';
    });
  }

  var TITULOS={hoje:'Hoje',pedidos:'Vendas',cupons:'Vendas',lista:'Vendas',vitrine:'Catálogo',fila:'Catálogo',tapes:'Catálogo',artistas:'Catálogo',perfil:'Perfil',musicas:'Músicas do perfil',gravou:'Quem já gravou',analytics:'Números',ajustes:'Ajustes',comentarios:'Comentários'};
  var VITRINE_ABA={vitrine:'beats',fila:'fila',cupons:'cupons'};
  /* Voltar (16/10/2026): o histórico do navegador segue o caminho Hoje > seção > parte. Numa
     parte (Músicas, Cupons, Fila…), voltar cai na página da seção (Perfil, Vendas, Catálogo…);
     na página da seção, cai no Hoje. Trocar de parte ou de seção troca a entrada, não empilha. */
  var pilha=[], pendente=null;
  function caminhoDe(v){
    if(v==='hoje') return ['hoje'];
    var g=GRUPO[v]||'hoje', e=ENTRADA[g];
    return (g==='hoje'||v===e)?['hoje',v]:['hoje',e,v];
  }
  function endereco(v){ return location.pathname+(v==='hoje'?'':'#'+v); }
  function poe(v){ history.pushState({painel:v},'',endereco(v)); pilha.push(v); }
  function historico(v){
    var c=caminhoDe(v), k=0;
    while(k<pilha.length&&k<c.length&&pilha[k]===c[k]) k++;
    var tira=pilha.length-k, falta=c.slice(k);
    if(!tira){ falta.forEach(poe); return; }
    if(tira===1&&falta.length===1){ history.replaceState({painel:falta[0]},'',endereco(falta[0])); pilha[pilha.length-1]=falta[0]; return; }
    pilha.length=k; pendente=falta;            // volta o que sobra e, quando o navegador voltar, empilha o resto
    history.go(-tira);
  }
  function iniciarHistorico(v){
    try{ history.replaceState({painel:'hoje'},'',endereco('hoje')); pilha=['hoje']; if(v&&v!=='hoje') caminhoDe(v).slice(1).forEach(poe); }catch(_){ }
  }
  window.addEventListener('popstate',function(e){
    if(pendente){ var f=pendente; pendente=null; try{ f.forEach(poe); }catch(_){ } return; }
    var v=(e.state&&e.state.painel)||((location.hash||'').replace('#',''))||'hoje';
    pilha=caminhoDe(TITULOS[v]?v:'hoje');
    if(!$('veil').hidden){ $('veil').hidden=true; $('card').innerHTML=''; }   // folha aberta fecha junto
    irPara(v,true);
  });
  function irPara(v,semHistorico){
    if(v==='home') v='hoje';
    if(!TITULOS[v]) v='hoje';
    if(v==='hoje'){ lojaPedida=false; consumoPedido=false; numerosPedido=false; musicasPedido=false; comentPedido=false; entregaPedida=false; listaPedida=false; filaPedida=false; }   // volta com os números novos
    // o endereço guarda a seção (recarregar volta pra ela); Hoje = /painel
    if(!semHistorico && v!==vista){ try{ historico(v); }catch(_){ } }
    vista=v; filtro=''; $('q').value='';
    if(ordemDe[v]){ ordem=ordemDe[v]; $('ordemLabel').textContent=ORDENS[ordem]; }
    $('q').placeholder = v==='tapes' ? 'Buscar beat tape' : 'Buscar artista';
    desenhar(); window.scrollTo(0,0);
  }
  window.__painelIr=irPara;

  /* ---------- painel novo (12/10/2026): Hoje, Vendas, Catálogo, Perfil, Números e Ajustes ----------
     As telas de antes viraram partes das seções: Vitrine e Fila (vitrine.js), Beat tapes e Artistas
     (listas daqui), Cupons (vitrine.js), Pedidos (entrega na hora + serviços), Lista, Músicas
     (musicas.js), Analytics. Barra embaixo no celular, menu do lado no computador. */
  var IC={
    hoje:'<path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"/>',
    vendas:'<path d="M6 6h15l-1.5 9h-12z"/><path d="M6 6L5 3H2"/><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/>',
    catalogo:'<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="8.5" cy="12" r="2"/><circle cx="15.5" cy="12" r="2"/><path d="M8.5 14h7"/>',
    perfil:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>',
    numeros:'<path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 15l4-4 3 3 5-6"/>',
    ajustes:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    site:'<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v6H4V6h6"/>'
  };
  function svg(k,t){ return '<svg width="'+(t||20)+'" height="'+(t||20)+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+IC[k]+'</svg>'; }
  var GRUPO={hoje:'hoje',pedidos:'vendas',cupons:'vendas',lista:'vendas',vitrine:'catalogo',fila:'catalogo',tapes:'catalogo',artistas:'catalogo',perfil:'perfil',musicas:'perfil',gravou:'perfil',analytics:'numeros',ajustes:'ajustes',comentarios:'hoje'};
  var ENTRADA={hoje:'hoje',vendas:'pedidos',catalogo:'vitrine',perfil:'perfil',numeros:'analytics',ajustes:'ajustes'};
  var SUB={vendas:[['pedidos','Pedidos'],['cupons','Cupons'],['lista','Lista']],catalogo:[['vitrine','Vitrine'],['fila','Fila'],['tapes','Beat tapes'],['artistas','Artistas']]};
  var NAV=[['hoje','Hoje'],['vendas','Vendas'],['catalogo','Catálogo'],['perfil','Perfil'],['numeros','Números']];
  var filaN=null, filaPedida=false, prateleira=null;
  // a Fila vem do relatório da vitrine (lê as faixas todas): o Hoje guarda a conta por 30 min
  function pedirFila(){
    if(filaPedida) return; filaPedida=true;
    try{ var g=JSON.parse(localStorage.getItem('painel-fila')||'null'); if(g&&Date.now()-g.at<30*60e3){ filaN=g.n; return; } }catch(_){ }
    fetch('/api/painel?op=vitrine').then(function(r){return r.json()}).then(function(j){
      filaN=(j&&j.semBotao)?j.semBotao.length:null;
      try{ if(filaN!=null) localStorage.setItem('painel-fila',JSON.stringify({n:filaN,at:Date.now()})); }catch(_){ }
      pintarNav(); refazer(['hoje']);
    }).catch(function(){});
  }
  function refazer(vs){ if((vs||['hoje','pedidos','lista','perfil','ajustes']).indexOf(vista)>-1 && $('veil').hidden) desenhar(); }
  function pendServicos(){ return servicosAbertos().filter(function(x){ return x.s.envio && x.p.status!=='teste'; }); }
  function contaVendas(){ return pendServicos().length; }
  // 16/10/2026: no computador o menu do lado abre as partes da seção embaixo do pai (Vendas,
  // Catálogo, Perfil). Clicar no pai segue abrindo a seção; dá pra ir direto numa parte.
  var FILHOS={vendas:SUB.vendas,catalogo:SUB.catalogo,perfil:[['musicas','Músicas'],['gravou','Quem já gravou'],['@ordem','Ordem das beat tapes'],['@numeros','Números do site']]};
  function pintarNav(){
    var g=GRUPO[vista]||'hoje', n=$('navP'); if(!n) return;
    var bolha={vendas:contaVendas(), catalogo:(filaN||0)+(revisar.length||0)};
    n.innerHTML='<a class="np-marca" href="/" aria-label="Voltar pro site"></a>'+NAV.map(function(it){
      var b=bolha[it[0]], f=FILHOS[it[0]], aberto=g===it[0];
      var sub=f&&aberto?'<div class="np-sub">'+f.map(function(x){
        var nn=x[0]==='fila'?filaN:x[0]==='pedidos'?contaVendas():null;
        return '<button type="button" data-filho="'+x[0]+'"'+(vista===x[0]?' aria-current="true"':'')+'>'+x[1]+(nn?'<em>'+nn+'</em>':'')+'</button>';
      }).join('')+'</div>':'';
      return '<button type="button" data-sec="'+it[0]+'"'+(f?' class="np-pai" aria-expanded="'+aberto+'"':'')+(aberto?' aria-current="page"':'')+'>'+svg(it[0])+'<span>'+it[1]+'</span>'+(b?'<em>'+b+'</em>':'')+(f?'<span class="np-seta" aria-hidden="true">›</span>':'')+'</button>'+sub;
    }).join('')+'<i class="np-sep"></i><button type="button" class="np-lado" data-sec="ajustes"'+(g==='ajustes'?' aria-current="page"':'')+'>'+svg('ajustes')+'<span>Ajustes</span></button>'+
      '<a class="np-lado" href="/" target="_blank" rel="noopener">'+svg('site')+'<span>Ver o site</span></a>';
    n.querySelectorAll('[data-sec]').forEach(function(b){ b.addEventListener('click',function(){ irPara(ENTRADA[b.dataset.sec]); }); });
    n.querySelectorAll('[data-filho]').forEach(function(b){ b.addEventListener('click',function(){
      var v=b.dataset.filho;
      if(v==='@ordem'){ irPara('perfil'); abrirPerfil(); return; }
      if(v==='@numeros'){ irPara('perfil'); abrirNumeros(); return; }
      irPara(v);
    }); });
  }
  function pintarSecoes(){
    var g=GRUPO[vista], s=$('secoes'), l=SUB[g];
    if(!l){ s.hidden=true; s.innerHTML=''; return; }
    s.hidden=false;
    s.innerHTML=l.map(function(it){
      var n=it[0]==='fila'?filaN:it[0]==='pedidos'?contaVendas():null;
      return '<button type="button" data-v="'+it[0]+'" aria-pressed="'+(vista===it[0])+'">'+it[1]+(n?'<i>'+n+'</i>':'')+'</button>';
    }).join('');
    s.querySelectorAll('[data-v]').forEach(function(b){ b.addEventListener('click',function(){ irPara(b.dataset.v); }); });
  }
  function hojeData(){ var d=new Date(); return d.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'}); }
  function linhaAcao(ic,t,sub,fn,quente){
    var b=document.createElement('button'); b.type='button'; b.className='ac'+(quente?' quente':'');
    b.innerHTML='<span class="ico">'+ic+'</span><span class="t"><b>'+t+'</b><small>'+sub+'</small></span><span class="seta" aria-hidden="true">›</span>';
    b.addEventListener('click',fn); return b;
  }
  function hoje(){
    var box=document.createElement('div'); box.className='hoje';
    var rot=function(t){ var r=document.createElement('div'); r.className='rot'; r.textContent=t; box.appendChild(r); };
    rot('PRECISA DE VOCÊ');
    var n=0, add=function(el){ box.appendChild(el); n++; };
    var IC_DESCE='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/></svg>';
    pendServicos().forEach(function(x){
      add(linhaAcao(IC_DESCE,'Entregar '+esc(x.s.nome),esc(x.p.quem||'Quem comprou')+' mandou o material em '+dm(x.s.envio.em),function(){ abrirPedido(x.p); },true));
    });
    if(filaN) add(linhaAcao(svg('catalogo'),filaN+(filaN===1?' beat na Fila':' beats na Fila'),'escolher o gênero e publicar na vitrine',function(){ irPara('fila'); }));
    if(revisarErro) add(linhaAcao(svg('catalogo'),'Não consegui conferir os pendentes','a lista de revisão das beat tapes não respondeu · toca pra tentar de novo',function(){ carregar(true); }));
    if(revisar.length) add(linhaAcao(svg('catalogo'),revisar.length+(revisar.length===1?' beat pra revisar':' beats pra revisar'),'nas beat tapes: marcar disponível ou vendido',function(){ irPara('tapes'); }));
    var env=lista&&lista.envios&&lista.envios[0];
    if(env&&!env.ok) add(linhaAcao('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 7l9 6 9-6"/></svg>','E-mail do cupom não saiu','pra '+esc(env.email)+' · ver o motivo',function(){ irPara('lista'); }));
    if(COMENTARIOS_LIGADOS&&comentResumo&&comentResumo.abertos) add(linhaAcao('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5h16v11H9l-5 4z"/></svg>',comentResumo.abertos+(comentResumo.abertos===1?' comentário aberto':' comentários abertos'),'nas pastas dos artistas',function(){ irPara('comentarios'); }));
    if(consumoHoje&&consumoHoje.hoje/consumoHoje.teto>=0.5) add(linhaAcao(svg('ajustes'),'Banco passou da metade hoje',milhar(consumoHoje.hoje)+' de '+milhar(consumoHoje.teto)+' leituras · zera às 21h',abrirConsumo));
    if(!n){ var v=document.createElement('p'); v.className='nada'; v.textContent=(entrega&&funilResumo)?'Nada pendente agora.':'conferindo…'; box.appendChild(v); }
    rot('ÚLTIMOS 7 DIAS');
    var r=funilResumo, t=document.createElement('div'); t.className='tiles';
    var tile=function(rotulo,valor,sub,ir){ var b=document.createElement('button'); b.type='button'; b.className='tile'; b.innerHTML='<small>'+rotulo+'</small><b>'+valor+'</b><i>'+sub+'</i>'; b.addEventListener('click',ir); t.appendChild(b); };
    tile('Visitas',r&&!r.erro?nEtapa(r,'visita'):'–','na vitrine',function(){ irPara('analytics'); });
    tile('Vendas',r&&!r.erro?nEtapa(r,'pago'):'–','pagas',function(){ irPara('pedidos'); });
    tile('Lista',lista&&lista.total!=null?lista.total:'–',lista&&lista.usaram?lista.usaram+' usaram o cupom':'pessoas',function(){ irPara('lista'); });
    box.appendChild(t);
    rot('ATALHOS');
    var at=document.createElement('div'); at.className='atalhos';
    [['+ Cupom',function(){ irPara('cupons'); }],['+ Música no perfil',function(){ irPara('musicas'); }],['Pedido de teste',function(){ irPara('pedidos'); }]].forEach(function(a){
      var b=document.createElement('button'); b.type='button'; b.className='pill'; b.textContent=a[0]; b.addEventListener('click',a[1]); at.appendChild(b);
    });
    box.appendChild(at);
    return box;
  }
  // Vendas > Pedidos: a lista com filtro, e cada pedido abre numa folha
  var filtroPed='fazer';
  function estadoPedido(p){
    var sv=p.servicos||[];
    if(p.status==='teste') return ['teste',''];
    if(p.status==='pendente') return ['PIX pendente',''];
    if(sv.some(function(s){ return s.envio&&!s.entrega; })) return ['Entregar','faz'];
    if(sv.some(function(s){ return !s.envio; })) return ['esperando o material',''];
    if(sv.length&&sv.every(function(s){ return s.entrega; })&&!p.beats.length) return ['entregue',''];
    return [p.baixou?'baixou '+p.baixou:'não baixou ainda',''];
  }
  function iniciais(q){ var s=String(q||'?').replace(/^@/,'').trim(); return (s.slice(0,2)||'?').toUpperCase(); }
  function paginaPedidos(){
    var box=document.createElement('div');
    if(!entrega){ box.innerHTML='<div class="vazio">carregando…</div>'; return box; }
    var todos=entrega.pedidos||[];
    var fazer=todos.filter(function(p){ return estadoPedido(p)[1]==='faz'; });
    var testes=todos.filter(function(p){ return p.status==='teste'; });
    if(!fazer.length&&filtroPed==='fazer') filtroPed='todos';
    var mostra=filtroPed==='fazer'?fazer:filtroPed==='testes'?testes:todos.filter(function(p){ return p.status!=='teste'; });
    var h='<div class="filtros">'+[['fazer','Pra fazer',fazer.length],['todos','Todos',null],['testes','Testes',testes.length]].map(function(f){
      return '<button type="button" data-f="'+f[0]+'" aria-pressed="'+(filtroPed===f[0])+'">'+f[1]+(f[2]?' '+f[2]:'')+'</button>';
    }).join('')+'</div>';
    h+=mostra.length?mostra.map(function(p){
      var e=estadoPedido(p), itens=p.beats.concat((p.servicos||[]).map(function(x){return x.nome})).join(', ');
      return '<button type="button" class="ped" data-t="'+esc(p.token)+'"><span class="av">'+esc(iniciais(p.quem))+'</span><span class="t"><b>'+esc((p.quem?p.quem+' · ':'')+itens)+'</b><small>'+dm(p.em)+(p.valor?' · R$'+Math.round(p.valor):'')+'</small></span><span class="chip'+(e[1]?' '+e[1]:'')+'">'+esc(e[0])+'</span></button>';
    }).join(''):'<p class="nada">'+(filtroPed==='testes'?'Nenhum pedido de teste.':'Nenhum pedido com link ainda.')+'</p>';
    // De onde vêm as vendas (17/10/2026): por onde a pessoa conheceu (1ª visita) e de onde veio na compra
    var og=entrega.origens;
    if(og&&og.vendas){
      var linhaOg=function(x){ return '<div class="ev"><span>'+esc(x.origem)+'</span><span style="margin-left:auto">'+x.n+(x.n===1?' venda':' vendas')+' · R$'+Math.round(x.valor)+'</span></div>'; };
      h+='<div class="rot" style="margin-top:26px">DE ONDE VÊM AS VENDAS · '+og.dias+' DIAS</div><p class="sub">'+og.vendas+(og.vendas===1?' venda aprovada':' vendas aprovadas')+' desde que o site começou a guardar (17/10/2026).</p>'+
        '<p class="sub" style="margin-top:10px"><b>Conheceu por</b> (1ª visita do aparelho)</p>'+og.conheceu.map(linhaOg).join('')+
        '<p class="sub" style="margin-top:10px"><b>Comprou vindo de</b> (a visita da compra)</p>'+og.comprou.map(linhaOg).join('');
    }
    h+='<div class="rot" style="margin-top:26px">TESTAR</div><p class="sub">Cria um pedido de mentira e abre a página que o comprador vê. Nada é vendido.</p>'+
      '<div class="acoes" style="margin-top:12px;flex-wrap:wrap"><button type="button" class="pill" id="enTeste">Criar pedido de teste</button><button type="button" class="pill" id="enTesteSv">Criar pedido de teste de serviço</button></div><div id="enTesteLink" class="sub" style="margin-top:10px"></div>';
    box.innerHTML=h;
    box.querySelectorAll('[data-f]').forEach(function(b){ b.addEventListener('click',function(){ filtroPed=b.dataset.f; desenhar(); }); });
    box.querySelectorAll('.ped').forEach(function(b){ b.addEventListener('click',function(){ var p=todos.filter(function(x){ return x.token===b.dataset.t; })[0]; if(p) abrirPedido(p); }); });
    var teste=function(id,op,rot,msg){ box.querySelector('#'+id).addEventListener('click',function(){
      var b=this; b.disabled=true; b.textContent='Criando…';
      acao(op,{}).then(function(j){
        b.disabled=false; b.textContent=rot;
        if(!j||!j.ok){ flash((j&&j.erro)||'Não criou. Tenta de novo.'); return; }
        entrega.pedidos=j.pedidos||entrega.pedidos; filtroPed='testes'; desenhar();
        var l=$('enTesteLink'); if(l) l.innerHTML=msg(j)+': <a href="'+esc(j.caminho)+'" target="_blank" rel="noopener">abrir a página do pedido</a>';
      });
    }); };
    teste('enTeste','pedido-teste','Criar pedido de teste',function(j){ return 'Pedido de teste com '+esc(j.beat); });
    teste('enTesteSv','pedido-teste-servico','Criar pedido de teste de serviço',function(){ return 'Pedido de teste com Mix + Master e Beat personalizado'; });
    return box;
  }
  // um pedido aberto: o que comprou, o material de cada serviço e a entrega por link (SERVIÇOS DOS PEDIDOS)
  function abrirPedido(p){
    var card=$('card'), ROT={ref:'referência',guia:'guia das vozes',link:'link',musica:'música',recado:'recado'};
    var pinta=function(){
      var h='<h2>'+esc((p.quem||'Pedido')+(p.status==='teste'?' · teste':''))+'</h2><p>'+dm(p.em)+(p.valor?' · R$'+Math.round(p.valor):'')+' · '+esc(estadoPedido(p)[0])+'</p>';
      if(p.beats.length) h+='<div class="bloco"><div class="rot">BEATS</div><p>'+esc(p.beats.join(', '))+' · '+(p.baixou?'baixou '+p.baixou+(p.baixou===1?' arquivo':' arquivos'):'ainda não baixou')+'</p></div>';
      (p.servicos||[]).forEach(function(sv){
        var e=sv.envio, en=sv.entrega;
        h+='<div class="bloco"><div class="rot">'+esc(sv.nome.toUpperCase())+' · '+(en?'ENTREGUE '+dm(en.em):e?'MATERIAL CHEGOU '+dm(e.em):'ESPERANDO O MATERIAL')+'</div>'+
          (e?Object.keys(ROT).filter(function(k){ return e[k]; }).map(function(k){ var v=String(e[k]); return '<p class="mat"><span>'+ROT[k]+':</span> '+(/^https?:/.test(v)?'<a href="'+esc(v)+'" target="_blank" rel="noopener">'+esc(v)+'</a>':esc(v))+'</p>'; }).join(''):'<p>Quem comprou ainda não mandou. A página do pedido pede o material.</p>')+
          '<div class="entrega"><input type="url" class="sv-link" data-k="'+sv.k+'" placeholder="Link do arquivo final (Drive, WeTransfer…)" value="'+(en?esc(en.link):'')+'">'+
          '<button type="button" class="pill solid sv-ent" data-k="'+sv.k+'">'+(en?'Trocar o link':'Entregar')+'</button></div>'+
          '<p class="sub" style="margin-top:6px">Quem comprou recebe um e-mail e o botão de baixar aparece no pedido.</p></div>';
      });
      h+='<div class="acoes"><a class="pill" href="/pedido/'+esc(p.token)+'" target="_blank" rel="noopener">Abrir a página</a><button type="button" class="pill" data-close>Fechar</button></div>';
      card.innerHTML=h;
      card.querySelector('[data-close]').addEventListener('click',fechar);
      card.querySelectorAll('.sv-ent').forEach(function(b){ b.addEventListener('click',function(){
        var k=Number(b.dataset.k), inp=card.querySelector('.sv-link[data-k="'+k+'"]'), link=(inp&&inp.value||'').trim();
        if(!link){ flash('Cola o link do arquivo final primeiro.'); if(inp) inp.focus(); return; }
        b.disabled=true; b.textContent='Entregando…';
        acao('pedido-entregar',{token:p.token,k:k,link:link}).then(function(j){
          b.disabled=false;
          if(!j||!j.ok){ b.textContent='Entregar'; flash((j&&j.erro)||'Não salvou. Tenta de novo.'); return; }
          entrega.pedidos=j.pedidos||entrega.pedidos;
          p=(entrega.pedidos.filter(function(x){ return x.token===p.token; })[0])||p; pinta(); pintarNav();
          flash(j.avisou?'Entregue. Quem comprou recebeu o e-mail.':'Entregue. O botão já aparece na página do pedido.');
        });
      }); });
    };
    $('veil').hidden=false; pinta();
  }
  // Vendas > Lista: o que era a folha "Lista de e-mails", agora na página
  function paginaLista(){
    var box=document.createElement('div'), l=lista;
    if(!l){ box.innerHTML='<div class="vazio">carregando…</div>'; return box; }
    box.innerHTML='<p class="sub" style="margin-top:4px">Quem se cadastrou no "Fique por dentro" da vitrine e das tapes. Cada pessoa ganha um cupom só dela: 15% nos beats do catálogo, uso único, 15 dias. Os cupons da lista não aparecem em Cupons.</p>'+
      '<div class="bloco"><div class="rot">NA LISTA</div><p>'+textoLista()+(l.sairam?' · '+l.sairam+(l.sairam===1?' saiu':' saíram'):'')+'</p>'+
      (l.emails&&l.emails.length?'<div class="acoes" style="margin-top:12px"><button type="button" class="pill solid" id="liCopia">Copiar os e-mails</button></div>':'')+'</div>'+
      '<div class="bloco"><div class="rot">ÚLTIMOS CADASTROS</div>'+((l.ultimos||[]).length?l.ultimos.map(function(u){
        return '<div class="ev"><span>'+dm(u.em)+'</span><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(u.email)+(u.usou?' · usou o cupom':'')+'</span></div>';
      }).join(''):'<p>Ninguém ainda.</p>')+'</div>'+
      '<div class="bloco"><div class="rot">E-MAILS DO CUPOM</div>'+((l.envios||[]).length?l.envios.map(function(u){
        var d=new Date(u.em), hh=isNaN(d)?'':' '+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);
        return '<div class="ev"><span>'+dm(u.em)+hh+'</span><span style="min-width:0">'+esc(u.email)+' · '+(u.ok?'saiu':'<em>não saiu</em> ('+esc(u.erro||'erro')+')')+'</span></div>';
      }).join(''):'<p>Nenhum envio registrado ainda (o registro começou em 12/10).</p>')+'</div>';
    var cp=box.querySelector('#liCopia');
    if(cp) cp.addEventListener('click',function(){
      var txt=(l.emails||[]).join(', ');
      (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(function(){ flash(l.emails.length+' e-mails copiados.'); }).catch(function(){ prompt('Copie os e-mails:',txt); });
    });
    return box;
  }
  // Perfil: tudo que mexe no /rideblan33
  function paginaPerfil(){
    var box=document.createElement('div'); box.className='hoje'; box.style.paddingTop='14px';
    var lm=linhaAcao('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>','Músicas',textoMusicas()+' · destaques e recentes',function(){ irPara('musicas'); }); lm.id='musPerfil'; box.appendChild(lm);
    box.appendChild(linhaAcao('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.2c3 .3 5.5 2.7 5.5 5.8"/></svg>','Quem já gravou','os artistas das suas músicas no Spotify · página /rideblan33/artistas',function(){ irPara('gravou'); }));
    var noP=noPerfil().length;
    box.appendChild(linhaAcao(svg('catalogo'),'Ordem das beat tapes',noP+(noP===1?' tape no perfil':' tapes no perfil')+' · arrastar pra ordenar',abrirPerfil));
    var ln=linhaAcao('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"/></svg>','Números do site',numerosSite?esc(textoNumeros(numerosSite,'curto')):'artistas, faixas e streams',abrirNumeros); ln.id='numSite'; box.appendChild(ln);
    box.appendChild(linhaAcao('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>','Ver o perfil','abre /rideblan33 com a prévia do que está desligado',function(){ window.open('/rideblan33?de=painel','_blank','noopener'); }));
    return box;
  }
  // Ajustes: as chaves do site e o consumo do plano grátis
  function paginaAjustes(){
    var box=document.createElement('div');
    var lig=!!(entrega&&entrega.ligada), mus=musicasResumo;
    var c=consumoHoje, pct=c?Math.min(100,Math.round(c.hoje/c.teto*100)):0;
    box.innerHTML='<div class="rot" style="margin-top:22px">CHAVES</div>'+
      '<div class="sw"><div><b>Entrega na hora</b><small>'+(lig?'Ligada: beat sai no link na hora; serviço ganha a página pra mandar o material.':'Desligada: o checkout fica como era, sem link.')+'</small></div>'+
        '<button type="button" class="toggle" id="ajEntrega" aria-pressed="'+lig+'" aria-label="Entrega na hora"'+(entrega?'':' disabled')+'><i></i></button></div>'+
      '<div class="sw"><div><b>Músicas no perfil</b><small>'+(mus?(mus.noAr?'No ar: a aba Músicas aparece pra todo mundo.':'Fora do ar: a prévia aparece só pra quem entra no painel.'):'carregando…')+'</small></div>'+
        '<button type="button" class="toggle" id="ajMusicas" aria-pressed="'+!!(mus&&mus.noAr)+'" aria-label="Músicas no perfil"'+(mus?'':' disabled')+'><i></i></button></div>'+
      '<div class="sw"><div><b>Comentários nas pastas</b><small>'+(COMENTARIOS_LIGADOS?'Ligados.':'Desligados desde 11/10/2026. Pra religar, é comigo (muda no código).')+'</small></div></div>'+
      '<div class="rot" style="margin-top:26px">CONSUMO HOJE</div>'+
      '<button type="button" class="sw sw-b" id="ajBanco"><div style="flex:1"><b>Banco</b><small>'+(c?milhar(c.hoje)+' de '+milhar(c.teto)+' leituras · zera às 21h':'carregando…')+'</small><div class="barra-c"><i style="width:'+pct+'%"></i></div></div><span class="seta" aria-hidden="true">›</span></button>'+
      '<div class="sw"><div style="flex:1"><b>Prateleira de arquivos</b><small>'+(prateleira!=null?gb(prateleira)+' de 8 GB':'carregando…')+'</small><div class="barra-c"><i style="width:'+(prateleira!=null?Math.min(100,Math.round(prateleira/(8*1073741824)*100)):0)+'%"></i></div></div></div>';
    var be=box.querySelector('#ajEntrega');
    be.addEventListener('click',function(){
      var quer=be.getAttribute('aria-pressed')!=='true'; be.disabled=true;
      acao('entrega',{ligada:quer}).then(function(j){
        be.disabled=false;
        if(!j||!j.ok){ flash((j&&j.erro)||'Não salvou. Tenta de novo.'); return; }
        entrega=j; desenhar(); flash(quer?'Entrega na hora ligada.':'Entrega na hora desligada.');
      });
    });
    var bm=box.querySelector('#ajMusicas');
    bm.addEventListener('click',function(){
      var quer=bm.getAttribute('aria-pressed')!=='true'; bm.disabled=true;
      acao('musicas-no-ar',{noAr:quer}).then(function(j){
        bm.disabled=false;
        if(!j||j.erro){ flash((j&&j.erro)||'Não salvou. Tenta de novo.'); return; }
        musicasResumo={n:musicasResumo?musicasResumo.n:0,noAr:quer}; desenhar(); flash(quer?'Músicas no ar.':'Músicas fora do ar (só a prévia).');
      });
    });
    box.querySelector('#ajBanco').addEventListener('click',abrirConsumo);
    return box;
  }

  function textoEntrega(){
    if(!entrega) return 'o beat sai num link na hora em que o pagamento cai';
    var n=(entrega.pedidos||[]).filter(function(p){ return p.status!=='teste'; }).length;
    var fila=servicosAbertos().filter(function(x){ return x.s.envio; }).length;
    return (entrega.ligada?'ligada':'<em>desligada</em> · faça um pedido de teste e ligue')+(entrega.ligada&&n?' · '+n+(n===1?' pedido com link':' pedidos com link'):'')+(fila?' · <em>'+fila+(fila===1?' serviço esperando a entrega':' serviços esperando a entrega')+'</em>':'');
  }
  function pedirEntrega(){
    if(entregaPedida) return; entregaPedida=true;
    fetch('/api/painel?op=entrega').then(function(r){return r.json()}).then(function(j){
      if(!j||!j.ok||!Array.isArray(j.pedidos)) return; entrega=j;
      pintarNav(); refazer();
    }).catch(function(){});
  }
  function listaPedidos(){
    var l=(entrega&&entrega.pedidos)||[];
    if(!l.length) return '<p style="margin-top:6px">Nenhum pedido com link ainda.</p>';
    return '<div style="margin-top:6px">'+l.slice(0,12).map(function(p){
      var d=new Date(p.em), dd=isNaN(d)?'':('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2);
      return '<div class="ev"><span>'+dd+(p.status==='teste'?' · teste':p.status==='pendente'?' · PIX':'')+'</span><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+
        esc((p.quem?p.quem+' · ':'')+p.beats.concat((p.servicos||[]).map(function(x){return x.nome})).join(', '))+' · '+(p.baixou?'baixou '+p.baixou+(p.baixou===1?' arquivo':' arquivos'):'ainda não baixou')+
        ' · <a href="/pedido/'+esc(p.token)+'" target="_blank" rel="noopener">abrir</a></span></div>';
    }).join('')+'</div>';
  }
  // serviços dos pedidos (12/10/2026): quem comprou manda o material pela página do pedido; você
  // entrega colando o link aqui (quem comprou recebe um e-mail e o botão aparece na página)
  function servicosAbertos(){
    var out=[];
    ((entrega&&entrega.pedidos)||[]).forEach(function(p){ (p.servicos||[]).forEach(function(sv){ if(!sv.entrega) out.push({p:p,s:sv}); }); });
    return out;
  }
  function dm(iso){ var d=new Date(iso); return isNaN(d)?'':('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2); }
  function listaServicos(){
    var todos=[];
    ((entrega&&entrega.pedidos)||[]).forEach(function(p){ (p.servicos||[]).forEach(function(sv){ todos.push({p:p,s:sv}); }); });
    if(!todos.length) return '<p style="margin-top:6px">Nenhum pedido de serviço ainda.</p>';
    var ROT={ref:'referência',guia:'guia das vozes',link:'link',musica:'música',recado:'recado'};
    return todos.slice(0,12).map(function(x,i){
      var p=x.p, sv=x.s, e=sv.envio, en=sv.entrega;
      var estado=en?'entregue '+dm(en.em):e?'material chegou '+dm(e.em):'esperando o material';
      var mat=e?Object.keys(ROT).filter(function(k){ return e[k]; }).map(function(k){
        var v=String(e[k]); return '<div style="margin-top:4px;font-size:13px;overflow-wrap:anywhere"><span style="opacity:.6">'+ROT[k]+':</span> '+(/^https?:/.test(v)?'<a href="'+esc(v)+'" target="_blank" rel="noopener">'+esc(v)+'</a>':esc(v))+'</div>';
      }).join(''):'';
      return '<div class="bloco" style="margin-top:10px;padding:12px 14px">'+
        '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><b>'+esc(sv.nome)+'</b><span style="font-size:13px;opacity:.75">'+esc((p.quem||'')+(p.status==='teste'?' · teste':''))+' · '+estado+'</span></div>'+mat+
        '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><input type="url" class="sv-link" data-i="'+i+'" placeholder="Link da entrega (Drive, WeTransfer…)" value="'+(en?esc(en.link):'')+'" style="flex:1 1 220px;min-width:0;padding:10px 12px;border:1px solid #333;border-radius:10px;background:transparent;color:inherit;font:inherit;font-size:14px">'+
        '<button type="button" class="pill solid sv-ent" data-i="'+i+'">'+(en?'Trocar o link':'Entregar')+'</button>'+
        '<a class="pill" href="/pedido/'+esc(p.token)+'#sv'+sv.k+'" target="_blank" rel="noopener">Abrir o pedido</a></div></div>';
    }).join('');
  }
  function abrirEntrega(){
    var card=$('card');
    var pinta=function(){
      var lig=!!(entrega&&entrega.ligada);
      card.innerHTML='<h2>Entrega na hora</h2><p>Pagou, o beat sai num link com o WAV, o MP3 e o contrato: o botão aparece no PEDIDO CONFIRMADO e o link vai no e-mail do comprador. Nos serviços, quem comprou manda o material pela página do pedido e você entrega por aqui.</p>'+
        '<div class="sw"><div><b>Entrega na hora dos beats</b><small>'+(lig?'Ligada: venda com beat já sai com o link.':'Desligada: o checkout fica como era.')+'</small></div>'+
          '<button type="button" class="toggle" id="enLiga" aria-pressed="'+lig+'" aria-label="Entrega na hora dos beats"><i></i></button></div>'+
        '<div class="bloco"><div class="rot">TESTAR ANTES</div><p>Cria um pedido de mentira com o primeiro beat à venda e abre a página que o comprador vê. Nada é vendido e o beat segue na vitrine.</p>'+
          '<div class="acoes" style="margin-top:12px"><button type="button" class="pill solid" id="enTeste">Criar pedido de teste</button></div><div id="enTesteLink" style="margin-top:10px;font-size:13.5px"></div></div>'+
        '<div class="bloco"><div class="rot">SERVIÇOS DOS PEDIDOS</div><p>Quem comprou mix, master ou beat personalizado manda o material pela página do pedido (chega um e-mail pra você). Terminou, cola o link do arquivo final e toca em Entregar: quem comprou recebe um e-mail e o botão de baixar aparece no pedido.</p>'+
          '<div id="svLista">'+listaServicos()+'</div>'+
          '<div class="acoes" style="margin-top:12px"><button type="button" class="pill" id="enTesteSv">Criar pedido de teste de serviço</button></div><div id="enTesteSvLink" style="margin-top:10px;font-size:13.5px"></div></div>'+
        '<div class="bloco"><div class="rot">ÚLTIMOS PEDIDOS COM LINK</div>'+listaPedidos()+'</div>'+
        '<div class="acoes"><button type="button" class="pill" data-close>Fechar</button></div>';
      card.querySelector('[data-close]').addEventListener('click',fechar);
      $('enLiga').addEventListener('click',function(){
        var b=this, quer=b.getAttribute('aria-pressed')!=='true'; b.disabled=true;
        acao('entrega',{ligada:quer}).then(function(j){
          b.disabled=false;
          if(!j||!j.ok){ flash((j&&j.erro)||'Não salvou. Tenta de novo.'); return; }
          entrega=j; pinta(); flash(quer?'Entrega na hora ligada.':'Entrega na hora desligada.');
        });
      });
      card.querySelectorAll('.sv-ent').forEach(function(b){ b.addEventListener('click',function(){
        var todos=[]; ((entrega&&entrega.pedidos)||[]).forEach(function(p){ (p.servicos||[]).forEach(function(sv){ todos.push({p:p,s:sv}); }); });
        var x=todos[Number(b.getAttribute('data-i'))]; if(!x) return;
        var inp=card.querySelector('.sv-link[data-i="'+b.getAttribute('data-i')+'"]'), link=(inp&&inp.value||'').trim();
        if(!link){ flash('Cola o link do arquivo final primeiro.'); if(inp) inp.focus(); return; }
        b.disabled=true; b.textContent='Entregando…';
        acao('pedido-entregar',{token:x.p.token,k:x.s.k,link:link}).then(function(j){
          b.disabled=false;
          if(!j||!j.ok){ b.textContent='Entregar'; flash((j&&j.erro)||'Não salvou. Tenta de novo.'); return; }
          entrega.pedidos=j.pedidos||entrega.pedidos; pinta();
          flash(j.avisou?'Entregue. Quem comprou recebeu o e-mail.':'Entregue. O botão já aparece na página do pedido.');
        });
      }); });
      $('enTesteSv').addEventListener('click',function(){
        var b=this; b.disabled=true; b.textContent='Criando…';
        acao('pedido-teste-servico',{}).then(function(j){
          b.disabled=false; b.textContent='Criar pedido de teste de serviço';
          if(!j||!j.ok){ flash((j&&j.erro)||'Não criou. Tenta de novo.'); return; }
          entrega.pedidos=j.pedidos||entrega.pedidos; pinta();
          var l=$('enTesteSvLink'); if(l) l.innerHTML='Pedido de teste com Mix + Master e Beat personalizado: <a href="'+esc(j.caminho)+'" target="_blank" rel="noopener">abrir a página do pedido</a>';
        });
      });
      $('enTeste').addEventListener('click',function(){
        var b=this; b.disabled=true; b.textContent='Criando…';
        acao('pedido-teste',{}).then(function(j){
          b.disabled=false; b.textContent='Criar pedido de teste';
          if(!j||!j.ok){ flash((j&&j.erro)||'Não criou. Tenta de novo.'); return; }
          entrega.pedidos=j.pedidos||entrega.pedidos;
          var l=$('enTesteLink'); l.innerHTML='Pedido de teste com '+esc(j.beat)+': <a href="'+esc(j.caminho)+'" target="_blank" rel="noopener">abrir a página do pedido</a>';
        });
      });
    };
    $('veil').hidden=false;
    if(entrega) pinta(); else { card.innerHTML='<h2>Entrega na hora</h2><p>carregando…</p>'; }
    fetch('/api/painel?op=entrega').then(function(r){return r.json()}).then(function(j){ if(j&&j.ok){ entrega=j; if(!$('veil').hidden) pinta(); } }).catch(function(){});
  }
  var lista=null, listaPedida=false;
  function textoLista(){
    if(!lista) return 'quem se cadastrou pra receber o cupom de 15%';
    if(!lista.total) return 'ninguém ainda';
    var falhou=(lista.envios||[])[0]&&!lista.envios[0].ok;
    return lista.total+(lista.total===1?' pessoa':' pessoas')+' · '+lista.usaram+(lista.usaram===1?' usou o cupom':' usaram o cupom')+(falhou?' · <em>o último e-mail não saiu</em>':'');
  }
  function pedirLista(){
    if(listaPedida) return; listaPedida=true;
    fetch('/api/painel?op=lista').then(function(r){return r.json()}).then(function(j){
      if(!j||!j.ok) return; lista=j;
      refazer(['hoje','lista']);
    }).catch(function(){});
  }
  function abrirLista(){
    var card=$('card');
    var pinta=function(){
      var l=lista||{total:0,ultimos:[],emails:[]};
      card.innerHTML='<h2>Lista de e-mails</h2><p>Quem se cadastrou no "Fique por dentro" da vitrine. Cada pessoa ganha um cupom só dela: 15% nos beats do catálogo, uso único, 15 dias. Os cupons da lista não aparecem na tela de Cupons.</p>'+
        '<div class="bloco"><div class="rot">NA LISTA</div><p>'+esc(textoLista())+(l.sairam?' · '+l.sairam+(l.sairam===1?' saiu':' saíram'):'')+'</p>'+
        (l.emails&&l.emails.length?'<div class="acoes" style="margin-top:12px"><button type="button" class="pill solid" id="liCopia">Copiar os e-mails</button></div>':'')+'</div>'+
        '<div class="bloco"><div class="rot">ÚLTIMOS CADASTROS</div>'+((l.ultimos||[]).length?'<div style="margin-top:6px">'+l.ultimos.map(function(u){
          var d=new Date(u.em), dd=isNaN(d)?'':('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2);
          return '<div class="ev"><span>'+dd+'</span><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(u.email)+(u.usou?' · usou o cupom':'')+'</span></div>';
        }).join('')+'</div>':'<p style="margin-top:6px">Ninguém ainda.</p>')+'</div>'+
        '<div class="bloco"><div class="rot">E-MAILS DO CUPOM</div>'+((l.envios||[]).length?'<div style="margin-top:6px">'+l.envios.map(function(u){
          var d=new Date(u.em), dd=isNaN(d)?'':('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2)+' '+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);
          return '<div class="ev"><span>'+dd+'</span><span style="min-width:0">'+esc(u.email)+' · '+(u.ok?'saiu':'<em>não saiu</em> ('+esc(u.erro||'erro')+')')+'</span></div>';
        }).join('')+'</div>':'<p style="margin-top:6px">Nenhum envio registrado ainda (o registro começou em 12/10).</p>')+'</div>'+
        '<div class="acoes"><button type="button" class="pill" data-close>Fechar</button></div>';
      card.querySelector('[data-close]').addEventListener('click',fechar);
      var cp=$('liCopia');
      if(cp) cp.addEventListener('click',function(){
        var txt=(l.emails||[]).join(', ');
        (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(function(){ flash(l.emails.length+' e-mails copiados.'); }).catch(function(){ prompt('Copie os e-mails:',txt); });
      });
    };
    $('veil').hidden=false; pinta();
    fetch('/api/painel?op=lista').then(function(r){return r.json()}).then(function(j){ if(j&&j.ok){ lista=j; if(!$('veil').hidden) pinta(); } }).catch(function(){});
  }
  function textoComent(){
    var r=comentResumo;
    if(!r) return 'o que os artistas comentaram no tempo das faixas';
    if(!r.total) return 'nenhum comentário ainda';
    return (r.abertos?'<em>'+r.abertos+(r.abertos===1?' aberto':' abertos')+'</em>':'nada aberto')+(r.ultimo?' · último '+tempo(r.ultimo).replace(/^aberto /,''):'');
  }
  function pedirComent(){
    if(comentPedido) return; comentPedido=true;
    fetch('/api/painel?op=comentarios-resumo').then(function(r){return r.json()}).then(function(j){
      if(!j||!j.ok) return;
      comentResumo=j;
      refazer(['hoje']);
    }).catch(function(){});
  }
  function textoMusicas(){
    var r=musicasResumo;
    if(!r) return 'destaques, recentes e o trecho de cada uma';
    return r.n+(r.n===1?' música':' músicas')+' · '+(r.noAr?'no ar':'<em>fora do ar (prévia)</em>');
  }
  function pedirMusicas(){
    if(musicasPedido) return; musicasPedido=true;
    fetch('/api/painel?op=musicas').then(function(r){return r.json()}).then(function(j){
      if(!j||!j.ok) return;
      musicasResumo={ n:j.destaques.length+j.recentes.length, noAr:!!j.noAr };
      refazer(['perfil','ajustes']);
    }).catch(function(){});
  }
  function milharPonto(n){ return String(Math.round(n)).replace(/\\B(?=(\\d{3})+(?!\\d))/g,'.'); }
  function streamsCurto(n){ return n>=1e6?(Math.floor(n/1e5)/10).toString().replace('.',',')+' mi':n>=1e3?Math.floor(n/1e3)+' mil':String(n); }
  function textoNumeros(n,modo){
    return modo==='curto' ? n.artistas+'+ artistas · '+n.faixas+'+ faixas · '+streamsCurto(n.streams)+' de streams'
      : milharPonto(n.artistas)+'+ artistas · '+milharPonto(n.faixas)+'+ faixas lançadas · '+milharPonto(n.streams)+'+ streams';
  }
  function pedirNumeros(){
    if(numerosPedido) return; numerosPedido=true;
    fetch('/api/painel?op=numeros').then(function(r){return r.json()}).then(function(j){
      if(j&&j.numeros){ numerosSite=j.numeros; refazer(['perfil']); }
    }).catch(function(){});
  }
  function abrirNumeros(){
    var n=numerosSite||{artistas:40,faixas:200,streams:2500000};
    var card=$('card');
    card.innerHTML='<h2>Números do site</h2><p>Aparecem no topo da vitrine, no topo do perfil e na prévia do perfil quando o link é compartilhado. Sempre com o "+" na frente.</p>'+
      '<div class="bloco"><div class="nums">'+
        '<label for="nArt">Artistas<input id="nArt" inputmode="numeric" autocomplete="off" value="'+n.artistas+'"></label>'+
        '<label for="nFx">Faixas lançadas<input id="nFx" inputmode="numeric" autocomplete="off" value="'+n.faixas+'"></label>'+
        '<label for="nSt">Streams<input id="nSt" inputmode="numeric" autocomplete="off" value="'+milharPonto(n.streams)+'"></label>'+
      '</div><div class="nums-prev" id="nPrev"></div></div>'+
      '<div class="acoes"><button class="pill" data-close type="button">Cancelar</button><button class="pill solid" id="nSalvar" type="button">Salvar</button></div>';
    $('veil').hidden=false;
    var ler=function(){ var v={}, ok=true; [['artistas','nArt'],['faixas','nFx'],['streams','nSt']].forEach(function(p){ var x=Number(String($(p[1]).value).replace(/\\D/g,'')); if(!(x>0)) ok=false; v[p[0]]=x; }); return ok?v:null; };
    var prev=function(){ var v=ler(); $('nPrev').innerHTML=v?'Vitrine: <b>'+esc(textoNumeros(v,'cheio'))+'</b><br>Perfil: <b>'+esc(textoNumeros(v,'curto'))+'</b>':'Só algarismos, maior que zero.'; $('nSalvar').disabled=!v; };
    ['nArt','nFx','nSt'].forEach(function(i){ $(i).addEventListener('input',prev); });
    $('nSt').addEventListener('blur',function(){ var x=Number(String(this.value).replace(/\\D/g,'')); if(x>0) this.value=milharPonto(x); });
    prev();
    card.querySelector('[data-close]').addEventListener('click',fechar);
    $('nSalvar').addEventListener('click',function(){
      var v=ler(); if(!v) return;
      var b=this; b.disabled=true; b.textContent='Salvando…';
      fetch('/api/painel?op=numeros',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(v)})
        .then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j}})}).then(function(x){
          if(!x.ok){ flash((x.j&&x.j.erro)||'Não salvou. Tenta de novo.'); b.disabled=false; b.textContent='Salvar'; return; }
          numerosSite=x.j.numeros; fechar(); flash('Números salvos. O site mostra em até 1 minuto.');
        }).catch(function(){ flash('Não salvou. Tenta de novo.'); b.disabled=false; b.textContent='Salvar'; });
    });
  }
  // o selo do topo: numa subpágina volta pra home do painel; na home, leva pro site
  document.querySelector('.topo .marca').addEventListener('click',function(e){
    if(vista!=='hoje'){ e.preventDefault(); irPara('hoje'); }
  });
  $('engBtn').addEventListener('click',function(){ irPara('ajustes'); });

  function desenhar(){
    $('titulo').textContent=TITULOS[vista];
    document.querySelector('.topo .marca').setAttribute('aria-label', vista==='hoje' ? 'Voltar pro site' : 'Voltar pro Hoje');
    if(vista==='ajustes') $('engBtn').setAttribute('aria-current','page'); else $('engBtn').removeAttribute('aria-current');
    var vit=!!VITRINE_ABA[vista];
    $('barra').hidden = !(vista==='artistas'||vista==='tapes');
    $('resumo').hidden = vista==='analytics';
    $('lista').hidden = vista==='analytics'||vit||vista==='musicas'||vista==='gravou'||vista==='comentarios';
    $('analytics').hidden = vista!=='analytics';
    $('vitrine').hidden = !vit;
    $('musicas').hidden = vista!=='musicas';
    $('gravou').hidden = vista!=='gravou';
    $('comentarios').hidden = vista!=='comentarios';
    pintarNav(); pintarSecoes();
    if(vista==='hoje'){
      pedirResumoFunil(); pedirConsumo(); pedirMusicas(); if(COMENTARIOS_LIGADOS) pedirComent(); pedirEntrega(); pedirLista(); pedirFila();
      $('resumo').textContent=hojeData();
      $('lista').innerHTML=''; $('lista').appendChild(hoje()); return;
    }
    if(vista==='pedidos'){ pedirEntrega(); $('resumo').textContent='pedidos com link, cupons e a lista de e-mails'; $('lista').innerHTML=''; $('lista').appendChild(paginaPedidos()); return; }
    if(vista==='lista'){ pedirLista(); $('resumo').textContent='pedidos com link, cupons e a lista de e-mails'; $('lista').innerHTML=''; $('lista').appendChild(paginaLista()); return; }
    if(vista==='perfil'){ pedirMusicas(); pedirNumeros(); $('resumo').textContent='o que aparece em /rideblan33'; $('lista').innerHTML=''; $('lista').appendChild(paginaPerfil()); return; }
    if(vista==='ajustes'){ pedirEntrega(); pedirMusicas(); pedirConsumo(); $('resumo').textContent='chaves do site e o consumo do plano grátis'; $('lista').innerHTML=''; $('lista').appendChild(paginaAjustes()); return; }
    if(vista==='comentarios'){
      if(!$('comentarios').dataset.montado && window.CaramujoComentarios){
        $('comentarios').dataset.montado='1';
        window.CaramujoComentarios.abrir($('comentarios'));
      } else if(window.CaramujoComentarios) window.CaramujoComentarios.carregar();
      if(!window.CaramujoComentarios) $('comentarios').innerHTML='<div class="vazio">carregando…</div>';
      return;
    }
    if(vista==='musicas'){
      // monta uma vez só; depois só redesenha (a lista de artistas recarrega sozinha)
      if(!$('musicas').dataset.montado && window.CaramujoMusicas){
        $('musicas').dataset.montado='1';
        window.CaramujoMusicas.abrir($('musicas'));
      } else if(window.CaramujoMusicas) window.CaramujoMusicas.pintar();
      if(!window.CaramujoMusicas) $('musicas').innerHTML='<div class="vazio">carregando…</div>';
      return;
    }
    if(vista==='gravou'){
      if(!$('gravou').dataset.montado && window.CaramujoGravou){
        $('gravou').dataset.montado='1';
        window.CaramujoGravou.abrir($('gravou'));
      } else if(window.CaramujoGravou) window.CaramujoGravou.carregar();
      if(!window.CaramujoGravou) $('gravou').innerHTML='<div class="vazio">carregando…</div>';
      return;
    }
    if(vit){
      // monta uma vez só (igual ao analytics): a lista de artistas recarrega sozinha
      // durante conversão e não pode apagar o que você está digitando aqui
      if(!$('vitrine').dataset.montado && window.CaramujoVitrine){
        $('vitrine').dataset.montado='1';
        window.CaramujoVitrine.abrir($('vitrine'),{semAbas:true,aba:VITRINE_ABA[vista]});
      } else if(window.CaramujoVitrine) window.CaramujoVitrine.aba(VITRINE_ABA[vista]);
      if(!window.CaramujoVitrine) $('vitrine').innerHTML='<div class="vazio">carregando…</div>';
      return;
    }
    if(vista==='analytics'){
      // monta uma vez só: a lista recarrega sozinha durante conversão e não pode
      // derrubar o período nem a aba que você escolheu
      if(!$('analytics').dataset.montado && window.CaramujoAnalytics){
        $('analytics').dataset.montado='1';
        window.CaramujoAnalytics.abrir($('analytics'),function(){ irPara('hoje'); });
      }
      if(!window.CaramujoAnalytics) $('analytics').innerHTML='<div class="vazio">carregando…</div>';
      return;
    }
    if(prateleira!=null) pintarResumo(prateleira);   // a vitrine escreve o resumo dela; aqui volta o das pastas
    var fonte = vista==='tapes' ? tapes : artistas;
    var alvo=fonte.filter(function(a){
      return !filtro || a.name.toLowerCase().indexOf(filtro)>-1;
    });
    alvo.sort(function(a,b){
      if(ordem==='modificado'){
        // faixa mais nova do Drive primeiro; catálogo sem faixa nenhuma vai pro fim
        if(!a.modificado && !b.modificado) return a.name.localeCompare(b.name,'pt-BR',{sensitivity:'base'});
        if(!a.modificado) return 1;
        if(!b.modificado) return -1;
        return a.modificado < b.modificado ? 1 : -1;
      }
      if(ordem==='az') return a.name.localeCompare(b.name,'pt-BR',{sensitivity:'base'});
      if(ordem==='faixas') return ((b.nb||0)+(b.ns||0)) - ((a.nb||0)+(a.ns||0));
      if(ordem==='perfil'){
        // fora do perfil (escondida ou ainda sem beat pronto) vai pro fim, em ordem alfabética
        var fa=a.perfil===0||!(a.nb>0), fb=b.perfil===0||!(b.nb>0);
        if(fa!==fb) return fa ? 1 : -1;
        if(fa) return a.name.localeCompare(b.name,'pt-BR',{sensitivity:'base'});
        return chavePerfil(a)-chavePerfil(b) || a.id-b.id;
      }
      // atividade: quem abriu mais recente primeiro, quem nunca abriu por último
      if(!a.visto && !b.visto) return a.name.localeCompare(b.name,'pt-BR',{sensitivity:'base'});
      if(!a.visto) return 1;
      if(!b.visto) return -1;
      return a.visto < b.visto ? 1 : -1;
    });
    $('lista').innerHTML='';

    if(vista==='tapes') cartaoRevisar();
    if(vista==='tapes') linhaPerfil();   // fixa: primeira linha sempre, com busca ou ordem que for

    if(!alvo.length){
      var v=document.createElement('div'); v.className='vazio';
      if(vista!=='tapes') v.textContent='Nenhum artista com esse nome.';
      else if(filtro) v.textContent='Nenhuma tape com esse nome.';
      else v.innerHTML='Nenhuma beat tape convertida ainda.<br>'+
        '<small>Roda <b>Catálogo — carga geral</b> no GitHub Actions. '+
        'Cada pasta em <b>@rideblan33 / Beat tapes</b> vira um catálogo, e os beats que o '+
        'cruzamento não resolver aparecem aqui pra você marcar na mão.</small>';
      $('lista').appendChild(v);
      return;
    }
    alvo.forEach(function(a){
      var row=document.createElement('div');
      row.className='item';
      var b=document.createElement('button');
      b.type='button';b.className='linha';
      b.innerHTML=capaLista(a)+'<span style="flex:1;min-width:0"><span class="nome">'+esc(a.name)+'</span>'+
        (rodando(a) ? barra(a) : '<span class="meta">'+conta(a)+' · '+tempo(a.visto)+(a.tipo==='tape'&&a.perfil===0?' · fora do perfil':'')+'</span>')+'</span>';
      b.addEventListener('click',function(){abrir(a)});
      var c=document.createElement('button');
      c.type='button';c.className='copiar';c.setAttribute('aria-label','Copiar link de '+a.name);
      c.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b7b7b7" stroke-width="1.7"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a1 1 0 011-1h9"/></svg>';
      c.addEventListener('click',function(e){e.stopPropagation();copiar(a)});
      row.appendChild(b);row.appendChild(c);
      $('lista').appendChild(row);
    });
  }
  function pintarResumo(usado){
    prateleira=usado;
    if(vista!=='tapes'&&vista!=='artistas') return;            // 12/10/2026: o resumo das pastas só nas listas (o resto tem o seu)
    var r=$('resumo');
    r.textContent = artistas.length+(artistas.length===1?' artista no ar':' artistas no ar')+
      (tapes.length?' · '+tapes.length+(tapes.length===1?' beat tape':' beat tapes'):'')+
      ' · prateleira '+gb(usado)+' de 8 GB';
    if(revisarErro){
      var e=document.createElement('button');
      e.type='button'; e.className='aviso';
      e.textContent='não consegui conferir os pendentes';
      e.addEventListener('click',function(){carregar(true)});
      r.appendChild(document.createTextNode(' · '));
      r.appendChild(e);
      return;
    }
    if(!revisar.length) return;
    var a=document.createElement('button');
    a.type='button'; a.className='aviso';
    a.textContent=revisar.length+(revisar.length===1?' beat pra revisar':' beats pra revisar');
    a.addEventListener('click',function(){
      irPara('tapes');
      var b=document.querySelector('.revisar'); if(b) b.scrollIntoView({block:'center'});
    });
    r.appendChild(document.createTextNode(' · '));
    r.appendChild(a);
  }

  /* ---------- funil de venda do site ---------- */
  var funilResumo=null, funilPedido=false;
  function pedirResumoFunil(){
    if(funilPedido) return; funilPedido=true;
    fetch('/api/painel?op=funil&dias=7').then(function(r){return r.json()}).then(function(j){
      funilResumo=(j&&j.etapas)?j:{erro:true}; refazer(['hoje']);
    }).catch(function(){ funilResumo={erro:true}; refazer(['hoje']); });
  }
  function nEtapa(j,e){ var x=(j.etapas||[]).filter(function(t){return t.etapa===e})[0]; return x?x.total:0; }
  // Quanto o banco já leu hoje (o limite gratuito é 5 milhões por dia, zera às 21h).
  function pedirConsumo(){
    if(consumoPedido) return; consumoPedido=true;
    fetch('/api/painel?op=consumo').then(function(r){return r.json()}).then(function(j){
      consumoHoje=(j&&typeof j.hoje==='number')?j:null; refazer(['hoje','ajustes']);
    }).catch(function(){});
  }
  function milhar(n){
    if(n>=1e6) return (n/1e6).toFixed(1).replace('.',',').replace(',0','')+' mi';
    if(n>=1e3) return Math.round(n/1e3)+' mil';
    return String(n);
  }
  function pintarConsumo(){
    var velho=$('consumo'); if(velho) velho.remove();
    return;   // 12/10/2026: o consumo mora em Ajustes (e no Hoje, quando passa da metade)
    var c=consumoHoje, pct=c.hoje/c.teto;
    var el=document.createElement('button');
    el.type='button'; el.id='consumo'; el.className='consumo'+(pct>=0.5?' alto':'');
    el.textContent='Banco hoje: '+milhar(c.hoje)+' de '+milhar(c.teto)+' leituras'+(pct>=0.5?' · passou da metade':'');
    el.addEventListener('click',abrirConsumo);
    $('resumo').parentNode.insertBefore(el,$('resumo').nextSibling);
  }
  function abrirConsumo(){
    var c=consumoHoje; if(!c) return;
    var card=$('card');
    card.innerHTML='<h2>Banco hoje</h2><p>'+milhar(c.hoje)+' de '+milhar(c.teto)+' linhas lidas (ontem: '+milhar(c.ontem)+'). '+
      'O limite gratuito zera às 21h. Passou dele, o banco trava até lá: site na lista guardada, painel e cupom fora.</p>'+
      '<div class="bloco"><div class="rot">O QUE MAIS LEU HOJE</div>'+
      (c.top&&c.top.length ? c.top.map(function(t){
        return '<div class="ev"><span>'+milhar(t.linhas)+'</span><span style="word-break:break-all">'+esc(t.rotulo)+' <i style="font-style:normal;color:var(--ink4)">('+t.chamadas+'x)</i></span></div>';
      }).join('') : '<div class="vazio" style="padding:10px 0">Nada anotado ainda hoje.</div>')+
      '</div><p style="margin-top:12px;font-size:12px">Conta aproximada, anotada pelo próprio site a cada minuto. Pra conferir: Cloudflare, D1, caramujo, Metrics.</p>'+
      '<div class="acoes"><button class="pill" data-close type="button">Fechar</button></div>';
    $('veil').hidden=false;
    card.querySelector('[data-close]').addEventListener('click',fechar);
  }

  // resumo da loja pro botão da home (a tela Vitrine mora em /assets/painel/vitrine.js)
  function pedirResumoLoja(){
    if(lojaPedida) return; lojaPedida=true;
    fetch('/api/painel?op=loja').then(function(r){return r.json()}).then(function(j){
      if(!j||!Array.isArray(j.beats)){ lojaResumo={erro:true}; }
      else lojaResumo={
        aVenda:j.beats.filter(function(b){return !b.sold}).length,
        cupons:(j.cupons||[]).filter(function(c){return c.ativo && !(c.max_usos!==null && c.usos>=c.max_usos)}).length
      };
      refazer(['hoje']);
    }).catch(function(){ lojaResumo={erro:true}; });
  }

  function cartaoRevisar(){
    if(revisarErro){
      var ruim=document.createElement('div');
      ruim.className='revisar';
      ruim.innerHTML='<b>Não consegui conferir os pendentes</b><small>A lista de revisão não '+
        'respondeu agora. Recarrega a página. Até lá, não confia na contagem: pode ter beat '+
        'sem pastilha esperando resposta.</small>';
      $('lista').appendChild(ruim);
      return;
    }
    if(!revisar.length){
      if(!tapes.length) return;
      var ok=document.createElement('div');
      ok.className='revisar limpo';
      ok.innerHTML='<b>Nada pra revisar</b><small>Todo beat das tapes está classificado como '+
        'disponível ou vendido. Quando o cruzamento não decidir, o beat aparece aqui com os '+
        'botões pra você marcar.</small>';
      $('lista').appendChild(ok);
      return;
    }
    var porTape={};
    revisar.forEach(function(f){ (porTape[f.tape]=porTape[f.tape]||{id:f.tape_id,itens:[]}).itens.push(f) });

    var d=document.createElement('div');
    d.className='revisar';
    var html='<b>'+revisar.length+(revisar.length===1?' beat pra revisar':' beats pra revisar')+'</b>'+
      '<small>O Drive não resolveu: caíram em Exclusivos e na pasta de um artista ao mesmo tempo, '+
      'ou em nenhum dos dois. Saem sem pastilha no catálogo até você responder aqui. '+
      'O que você marcar vence a pasta e não volta atrás.</small>';

    Object.keys(porTape).forEach(function(tape){
      var g=porTape[tape];
      html+='<div class="rev-tape"><div class="rev-topo"><b>'+esc(tape)+'</b>'+
        (g.itens.length>1
          ? '<span class="rev-tudo">todos: <button type="button" data-tape="'+g.id+'" data-v="disponivel">disponível</button>'+
            '<button type="button" data-tape="'+g.id+'" data-v="vendido">vendido</button></span>'
          : '')+'</div><ul>'+
        g.itens.map(function(f){
          var ficha=[f.mkey,f.bpm?f.bpm+'bpm':''].filter(Boolean).join(' · ');
          return '<li><span class="rev-nome">'+esc(f.title)+(ficha?' <i>'+esc(ficha)+'</i>':'')+'</span>'+
            '<small>'+esc(f.revisar)+'</small>'+
            '<span class="rev-acoes">'+
              '<button type="button" data-id="'+esc(f.id)+'" data-v="disponivel">disponível</button>'+
              '<button type="button" data-id="'+esc(f.id)+'" data-v="vendido">vendido</button>'+
            '</span></li>';
        }).join('')+'</ul></div>';
    });
    d.innerHTML=html;

    d.querySelectorAll('[data-v]').forEach(function(b){
      b.addEventListener('click',function(){
        var corpo={ valor:b.dataset.v };
        if(b.dataset.tape) corpo.tapeId=Number(b.dataset.tape); else corpo.ids=[b.dataset.id];
        d.querySelectorAll('[data-v]').forEach(function(x){x.disabled=true});
        acao('venda',corpo).then(function(j){
          if(j.ok){ flash('Marcado como '+b.dataset.v+'.'); carregar(true); }
          else { flash(j.erro||'Não consegui marcar.'); d.querySelectorAll('[data-v]').forEach(function(x){x.disabled=false}); }
        });
      });
    });
    $('lista').appendChild(d);
  }

  function conta(a){
    var p=[];
    if(a.nb) p.push(a.nb+(a.nb===1?' beat':' beats'));
    if(a.ns) p.push(a.ns+(a.ns===1?' música':' músicas'));
    return p.join(', ')||'sem faixa pronta';
  }
  function link(a){ return location.origin+'/'+a.slug+'/'+a.code }

  // primeira linha da lista de tapes, sempre: o perfil público. Toca = abre o card do
  // perfil (atividade + a ordem das tapes); o botão ao lado copia o link.
  // ícone do @rideblan33 no painel: o 33 da camisa (escolha B, 26/09/2026)
  var AVATAR='/assets/perfil/rideblan33-camisa.webp';
  function linhaPerfil(){
    var u=location.origin+'/rideblan33';
    var row=document.createElement('div'); row.className='item item-perfil';
    var b=document.createElement('button'); b.type='button'; b.className='linha';
    var n=noPerfil().length;
    b.innerHTML='<span class="capa-lista perfil"><img src="'+AVATAR+'" alt="" loading="lazy"></span>'+
      '<span style="flex:1;min-width:0"><span class="nome">@rideblan33</span>'+
      '<span class="meta">'+n+(n===1?' beat tape':' beat tapes')+' no perfil · '+tempo(perfilVisto)+'</span></span>';
    b.addEventListener('click',abrirPerfil);
    var c=document.createElement('button'); c.type='button'; c.className='copiar'; c.setAttribute('aria-label','Copiar link do perfil');
    c.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b7b7b7" stroke-width="1.7"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a1 1 0 011-1h9"/></svg>';
    c.addEventListener('click',function(e){ e.stopPropagation(); if(navigator.clipboard) navigator.clipboard.writeText(u); flash('Link do perfil copiado.') });
    row.appendChild(b); row.appendChild(c);
    $('lista').appendChild(row);
  }

  var ALCA='<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>';

  // Card do @rideblan33: link, atividade (igual às tapes) e a ordem das capas numa
  // lista numerada. Segura a alça e arrasta (no teclado: foca a alça e usa as setas);
  // salva sozinho. Tape nova sempre entra como 1ª.
  var pfPlays=null;
  function abrirPerfil(){
    var u=location.origin+'/rideblan33', c=$('card');
    c.innerHTML=
      '<div class="cab"><div class="capa-mini perfil"><img src="'+AVATAR+'" alt="@rideblan33"></div><div class="cab-txt">'+
        '<h2>@rideblan33</h2><div class="end">caramujorecords.com.br/rideblan33</div></div></div>'+
      '<div class="acoes">'+
        '<button class="pill solid" data-act="copiar" type="button">Copiar link</button>'+
        '<button class="pill" data-act="abrir" type="button">Abrir</button>'+
      '</div>'+
      '<div class="bloco"><div class="rot">ATIVIDADE</div>'+
        '<div class="numeros">'+
          '<div><b id="pfUltima">—</b><span>última<br>visita</span></div>'+
          '<div><b id="pfMes">—</b><span>visitas<br>no mês</span></div>'+
          '<div><b id="pfAno">—</b><span>visitas<br>no ano</span></div>'+
        '</div></div>'+
      '<div class="bloco"><div class="rot">ORDEM NO PERFIL</div>'+
        '<p class="pf-dica">Segura a alça e arrasta. Salva sozinho. Tape nova entra sempre como 1ª.</p>'+
        '<ol class="pf-lista" id="pfLista"></ol></div>'+
      '<div class="bloco" id="pfForaBloco" hidden><div class="rot">FORA DO PERFIL</div><ul class="pf-lista pf-fora" id="pfFora"></ul></div>'+
      '<div class="acoes"><button class="pill" data-close type="button">Fechar</button></div>';
    $('veil').hidden=false;
    c.querySelector('[data-close]').addEventListener('click',fechar);
    c.querySelector('[data-act=copiar]').addEventListener('click',function(){ if(navigator.clipboard) navigator.clipboard.writeText(u); flash('Link do perfil copiado.') });
    c.querySelector('[data-act=abrir]').addEventListener('click',function(){ window.open(u,'_blank','noopener') });
    fetch('/api/painel?op=perfil-resumo').then(function(x){return x.json()}).then(function(j){
      $('pfUltima').textContent=j.ultima?dia(j.ultima):'—'; $('pfMes').textContent=j.mes||0; $('pfAno').textContent=j.ano||0;
      pfPlays=j.plays||{}; pintaPlays();
    }).catch(function(){});
    montarOrdem();
  }
  function capaPf(a){
    return '<span class="pf-capa">'+(a.cover_key?'<img src="/capa/'+esc(a.cover_key)+'?p" alt="" loading="lazy">':'<img class="sem" src="/assets/brand/selo-creme.svg" alt="">')+'</span>';
  }
  function montarOrdem(){
    var ol=$('pfLista'); ol.innerHTML='';
    noPerfil().forEach(function(a){
      var li=document.createElement('li'); li.dataset.id=a.id;
      li.innerHTML='<span class="pf-n"></span>'+capaPf(a)+
        '<span class="pf-txt"><b>'+esc(a.name)+'</b><small>'+(a.nb||0)+((a.nb||0)===1?' beat':' beats')+'<span class="pf-plays"></span></small></span>'+
        '<button class="pf-alca" type="button" aria-label="Mover '+esc(a.name)+' (setas pra cima e pra baixo)">'+ALCA+'</button>';
      ol.appendChild(li);
    });
    renumera(); pintaPlays();
    var fora=tapes.filter(function(t){ return t.perfil===0 && (t.nb||0)>0 });
    $('pfForaBloco').hidden=!fora.length;
    var ul=$('pfFora'); ul.innerHTML='';
    fora.forEach(function(a){
      var li=document.createElement('li');
      li.innerHTML=capaPf(a)+'<span class="pf-txt"><b>'+esc(a.name)+'</b><small>escondida</small></span><button class="pill" type="button">Mostrar</button>';
      li.querySelector('button').addEventListener('click',function(e){
        var bt=e.currentTarget; bt.disabled=true;
        acao('perfil',{id:a.id,valor:1}).then(function(j){
          if(!j.ok){ bt.disabled=false; flash(j.erro||'Não consegui mudar.'); return; }
          a.perfil=1; montarOrdem(); flash('Aparece no perfil.');
        });
      });
      ul.appendChild(li);
    });
    if(!ol.dataset.ligado){ ol.dataset.ligado='1'; ligarOrdem(ol); }
  }
  function renumera(){
    [].slice.call($('pfLista').children).forEach(function(li,i){ li.querySelector('.pf-n').textContent=(i+1) });
  }
  function pintaPlays(){
    if(!pfPlays || !$('pfLista')) return;
    [].slice.call(document.querySelectorAll('#pfLista li')).forEach(function(li){
      var n=pfPlays[li.dataset.id]||0;
      li.querySelector('.pf-plays').textContent=' · '+n.toLocaleString('pt-BR')+(n===1?' play':' plays');
    });
  }
  var salvarOrdemT=null;
  function salvarOrdem(){
    clearTimeout(salvarOrdemT);
    salvarOrdemT=setTimeout(function(){
      var ids=[].slice.call($('pfLista').children).map(function(li){ return Number(li.dataset.id) });
      acao('perfil-ordem',{ids:ids}).then(function(j){
        if(!j.ok){ flash(j.erro||'Não consegui salvar a ordem.'); return; }
        ids.forEach(function(id,i){ var t=tapes.filter(function(x){return x.id===id})[0]; if(t) t.perfil_ordem=i+1; });
        flash('Ordem do perfil salva.');
      });
    },600);
  }
  // Arrastar suave: a tape pega segue o dedo (sem pular de linha em linha) e as outras
  // deslizam pro lugar novo (FLIP: mede antes, troca no DOM, anima a diferença).
  function ligarOrdem(ol){
    var pego=null, card=$('card'), dy=0, DUR=180;
    function topoLayout(li){ return ol.getBoundingClientRect().top + li.offsetTop; }
    function desliza(mudar){
      var outros=[].slice.call(ol.children).filter(function(li){ return li!==pego });
      var antes=outros.map(function(li){ return li.getBoundingClientRect().top });
      mudar();
      outros.forEach(function(li,i){
        var d=antes[i]-li.getBoundingClientRect().top;
        if(!d) return;
        li.style.transition='none'; li.style.transform='translateY('+d+'px)';
        li.getBoundingClientRect();
        li.style.transition='transform '+DUR+'ms cubic-bezier(.2,.7,.3,1)'; li.style.transform='';
      });
      renumera();
    }
    function segue(y){ if(pego) pego.style.transform='translateY('+(y-dy-topoLayout(pego))+'px)'; }
    ol.addEventListener('pointerdown',function(e){
      var h=e.target.closest('.pf-alca'); if(!h) return;
      pego=h.closest('li'); e.preventDefault();
      try{ h.setPointerCapture(e.pointerId); }catch(_){}
      dy=e.clientY-pego.getBoundingClientRect().top;
      pego.style.transition='box-shadow .15s, background .15s';
      pego.classList.add('pego');
    });
    ol.addEventListener('pointermove',function(e){
      if(!pego) return;
      var cr=card.getBoundingClientRect();
      if(e.clientY<cr.top+60) card.scrollTop-=10; else if(e.clientY>cr.bottom-60) card.scrollTop+=10;
      // meio da tape pega x meio das outras (posição de layout, sem a animação)
      var meio=e.clientY-dy+pego.offsetHeight/2;
      var outros=[].slice.call(ol.children).filter(function(li){ return li!==pego });
      var alvo=null;
      for(var i=0;i<outros.length;i++){ if(meio<topoLayout(outros[i])+outros[i].offsetHeight/2){ alvo=outros[i]; break; } }
      if(alvo ? pego.nextElementSibling!==alvo : ol.lastElementChild!==pego){
        desliza(function(){ if(alvo) ol.insertBefore(pego,alvo); else ol.appendChild(pego); });
      }
      segue(e.clientY);
    });
    function solta(){
      if(!pego) return;
      var li=pego; pego=null;
      li.style.transition='transform '+DUR+'ms cubic-bezier(.2,.7,.3,1), box-shadow .2s, background .2s';
      li.style.transform='';
      li.classList.remove('pego');
      setTimeout(function(){ li.style.transition=''; }, DUR+20);
      salvarOrdem();
    }
    ol.addEventListener('pointerup',solta); ol.addEventListener('pointercancel',solta);
    // teclado: alça focada + seta pra cima/baixo
    ol.addEventListener('keydown',function(e){
      var h=e.target.closest('.pf-alca'); if(!h) return;
      if(e.key!=='ArrowUp' && e.key!=='ArrowDown') return;
      e.preventDefault();
      var li=h.closest('li'); pego=li;
      desliza(function(){
        if(e.key==='ArrowUp' && li.previousElementSibling) ol.insertBefore(li,li.previousElementSibling);
        if(e.key==='ArrowDown' && li.nextElementSibling) ol.insertBefore(li.nextElementSibling,li);
      });
      pego=null; h.focus(); salvarOrdem();
    });
  }

  function rodando(a){
    if(a.job_estado!=='na fila' && a.job_estado!=='convertendo') return false;
    // some sozinho se algo travar no meio do caminho
    return !a.job_at || (Date.now() - new Date(a.job_at).getTime()) < 40*60*1000;
  }
  function barra(a){
    var total=a.job_total||0, feitos=a.job_feitos||0;
    var pct = total ? Math.round(feitos/total*100) : 0;
    var texto = a.job_estado==='na fila' ? 'na fila'
      : (total ? feitos+' de '+total : 'lendo a pasta');
    var indef = (a.job_estado==='na fila' || !total);
    // na fila / lendo a pasta: a barra que vai e volta (.trilho.indef i); a largura fixa por cima
    // escondia ela (achado na faxina de 04/10)
    return '<span class="andamento"><span class="trilho'+(indef?' indef':'')+'"><i'+(indef?'':' style="width:'+pct+'%"')+'></i></span>'+
      '<small>'+texto+'</small></span>';
  }

  function capaLista(a){
    return a.cover_key
      ? '<span class="capa-lista"><img src="/capa/'+esc(a.cover_key)+'?p" alt="" loading="lazy"></span>'
      : '<span class="capa-lista vazia"><img src="/assets/brand/selo-creme.svg" alt="" width="18" height="18"></span>';
  }

  function capaMini(a){
    return a.cover_key
      ? '<div class="capa-mini"><img src="/capa/'+esc(a.cover_key)+'?p" alt="capa de '+esc(a.name)+'" loading="lazy"></div>'
      : '<div class="capa-mini vazia">sem capa</div>';
  }

  function copiar(a){
    var u=link(a);
    if(navigator.clipboard) navigator.clipboard.writeText(u);
    flash('Link do '+a.name+' copiado.');
  }

  function abrir(a){
    var c=$('card');
    c.innerHTML=
      '<div class="cab">'+capaMini(a)+'<div class="cab-txt">'+
        '<h2>'+esc(a.name)+'</h2><div class="end">'+esc(link(a).replace(/^https?:\\/\\//,''))+'</div>'+
      '</div></div>'+
      '<div class="acoes">'+
        '<button class="pill solid" data-act="copiar" type="button">Copiar link</button>'+
        '<button class="pill" data-act="abrir" type="button">Abrir</button>'+
      '</div>'+
      (a.tipo==='tape'
        ? '<div class="bloco"><div class="rot">PERFIL @RIDEBLAN33</div>'+
          sw('perfil','Mostrar no perfil','a capa aparece em caramujorecords.com.br/rideblan33',a.perfil!==0)+
          '<div class="sw"><span><b id="perfilPos">'+esc(posicaoPerfil(a))+'</b><small>a ordem muda em <b>@rideblan33</b>, no topo da lista das tapes</small></span></div></div>'
        : '')+
      '<div class="bloco"><div class="rot">DESCRIÇÃO DO CATÁLOGO</div>'+
        '<label for="desc" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Descrição</label>'+
        '<textarea class="desc" id="desc" maxlength="280" placeholder="Um recado que aparece embaixo da contagem de faixas. Só você escreve — pode quebrar linha.">'+esc(a.descricao||'')+'</textarea>'+
        '<div class="desc-baixo"><small id="descConta"></small>'+
        '<button class="pill" data-act="salvardesc" type="button">Salvar</button></div>'+
      '</div>'+
      '<div class="bloco"><div class="rot">PODE BAIXAR</div>'+
        (a.tipo==='tape'
          ? sw('beats','Beats','os beats desta tape',a.dl_beats)
          : sw('beats','Beats','os beats reservados e os já gravados',a.dl_beats)+
            sw('sons','Músicas','os sons prontos, lançados e as guias',a.dl_sons))+
      '</div>'+
      (a.tipo!=='tape' && a.cover_origem==='artista'
        ? '<div class="bloco"><div class="rot">CAPA</div>'+
          '<div class="sw"><span><b>O artista trocou a capa</b>'+
          '<small>a imagem do Drive não sobrescreve enquanto ela estiver aqui</small></span>'+
          '<button class="pill" data-act="tirarcapa" type="button">Remover</button></div></div>'
        : '')+
      '<div class="bloco"><div class="rot">ATIVIDADE</div>'+
        '<div class="numeros">'+
          '<div><b id="nUltima">—</b><span>última<br>atividade</span></div>'+
          '<div><b id="nMes">—</b><span>aberturas<br>no mês</span></div>'+
          '<div><b id="nAno">—</b><span>aberturas<br>no ano</span></div>'+
        '</div>'+
        '<div id="eventos">carregando…</div>'+
        '<div class="pag" id="pag" hidden>'+
          '<button type="button" data-ir="-1" aria-label="Página anterior">‹</button>'+
          '<small id="pagInfo"></small>'+
          '<button type="button" data-ir="1" aria-label="Próxima página">›</button>'+
        '</div>'+
      '</div>'+
      '<div class="acoes">'+
        '<button class="pill" data-act="sync" type="button">Converter agora</button>'+
        '<button class="pill" data-close type="button">Fechar</button>'+
      '</div>';
    $('veil').hidden=false;
    c.querySelector('[data-close]').addEventListener('click',fechar);
    c.querySelector('[data-act=copiar]').addEventListener('click',function(){copiar(a)});

    var campo=$('desc'), conta=$('descConta'), salvar=c.querySelector('[data-act=salvardesc]');
    var mostrarConta=function(){ conta.textContent=campo.value.length+' de 280' };
    mostrarConta();
    campo.addEventListener('input',mostrarConta);
    salvar.addEventListener('click',function(){
      salvar.disabled=true;salvar.textContent='Salvando…';
      acao('descricao',{id:a.id,texto:campo.value}).then(function(j){
        salvar.disabled=false;salvar.textContent='Salvar';
        if(j.ok){ a.descricao=j.texto||''; flash(j.texto?'Descrição salva.':'Descrição apagada.'); }
        else flash(j.erro||'Não consegui salvar.');
      });
    });
    var tirar=c.querySelector('[data-act=tirarcapa]');
    if(tirar) tirar.addEventListener('click',function(){
      tirar.disabled=true;tirar.textContent='Removendo…';
      fetch('/api/capa?id='+a.id,{method:'DELETE'}).then(function(x){return x.json()}).then(function(j){
        if(j.ok){ a.cover_origem=null; flash('Capa removida. Na próxima conversão volta a do Drive.'); fechar(); carregar(true); }
        else { tirar.disabled=false;tirar.textContent='Remover';flash(j.erro||'Não consegui remover.') }
      });
    });
    c.querySelector('[data-act=abrir]').addEventListener('click',function(){window.open(link(a),'_blank','noopener')});
    c.querySelector('[data-act=sync]').addEventListener('click',function(e){
      var b=e.currentTarget;b.disabled=true;b.textContent='Mandando…';
      acao('sync',{artista:a.name}).then(function(j){
        b.disabled=false;b.textContent='Converter agora';
        if(!j.ok){ flash(j.erro||'Não consegui disparar.'); return; }
        flash('Conversão do '+a.name+' começou.');
        a.job_estado='na fila';a.job_total=0;a.job_feitos=0;a.job_at=new Date().toISOString();
        fechar();acompanhar();carregar(true);
      });
    });
    c.querySelectorAll('.toggle').forEach(function(t){
      t.addEventListener('click',function(){
        var on=t.getAttribute('aria-pressed')!=='true';
        t.setAttribute('aria-pressed',String(on));
        if(t.dataset.campo==='perfil'){
          acao('perfil',{id:a.id,valor:on?1:0}).then(function(j){
            if(!j.ok){ t.setAttribute('aria-pressed',String(!on)); flash(j.erro||'Não consegui mudar.'); return; }
            a.perfil=on?1:0;
            $('perfilPos').textContent=posicaoPerfil(a);
            flash(on?'Aparece no perfil.':'Escondida do perfil.');
          });
          return;
        }
        acao('perm',{id:a.id,campo:t.dataset.campo,valor:on?1:0}).then(function(){
          if(t.dataset.campo==='beats')a.dl_beats=on?1:0; else a.dl_sons=on?1:0;
          flash(on?'Liberado pra baixar.':'Agora é só ouvir.');
        });
      });
    });
    var pagina=0;
    function puxar(){
      fetch('/api/painel?op=eventos&id='+a.id+'&p='+pagina).then(function(r){return r.json()}).then(function(j){
        var r=j.resumo||{};
        $('nUltima').textContent = r.ultima ? dia(r.ultima) : '—';
        $('nMes').textContent = r.mes||0;
        $('nAno').textContent = r.ano||0;

        var e=$('eventos');
        if(!j.eventos||!j.eventos.length){
          e.innerHTML='<div class="vazio" style="padding:14px 0">Ninguém abriu ainda.</div>';
          $('pag').hidden=true;return;
        }
        e.innerHTML=j.eventos.map(function(x){
          return '<div class="ev"><span>'+quando(x.at)+'</span><span>'+rotulo(x)+'</span></div>';
        }).join('');

        var pg=$('pag');
        pg.hidden = j.paginas<=1;
        $('pagInfo').textContent = (j.pagina+1)+' de '+j.paginas+' · '+j.total+(j.total===1?' registro':' registros');
        pg.querySelector('[data-ir="-1"]').disabled = j.pagina<=0;
        pg.querySelector('[data-ir="1"]').disabled = j.pagina+1>=j.paginas;
      });
    }
    card.querySelectorAll('[data-ir]').forEach(function(btn){
      btn.addEventListener('click',function(){
        pagina=Math.max(0,pagina+Number(btn.dataset.ir));
        puxar();
        $('eventos').scrollIntoView({block:'nearest'});
      });
    });
    puxar();
  }
  function sw(campo,titulo,desc,valor){
    return '<div class="sw"><span><b>'+titulo+'</b><small>'+desc+'</small></span>'+
      '<button class="toggle" type="button" data-campo="'+campo+'" aria-pressed="'+(valor?'true':'false')+'" aria-label="'+titulo+'"><i></i></button></div>';
  }
  function dia(iso){
    var d=new Date(iso), h=new Date();
    var mesmoDia=function(a,b){return a.toDateString()===b.toDateString()};
    if(mesmoDia(d,h)) return 'hoje';
    var ontem=new Date(h.getTime()-86400e3);
    if(mesmoDia(d,ontem)) return 'ontem';
    return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}).replace('.','');
  }
  function quando(iso){
    var d=new Date(iso);
    return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})+' '+
           d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  }
  function rotulo(x){
    if(x.kind==='open') return 'abriu o catálogo';
    if(x.kind==='perfil-tape') return 'tocou na capa no perfil';
    if(x.kind==='play') return 'ouviu ' + esc(x.titulo||'uma faixa');
    if(x.kind && x.kind.indexOf('download')===0) return 'baixou ' + esc(x.titulo||'uma faixa') + ' em ' + x.kind.split('-')[1].toUpperCase();
    return x.kind;
  }

  function fechar(){ $('veil').hidden=true; $('card').innerHTML=''; desenhar(); }
  $('veil').addEventListener('click',function(e){ if(e.target===$('veil')) fechar() });

  function acao(op,body){
    return fetch('/api/painel?op='+op,{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify(body)}).then(function(r){return r.json()}).catch(function(){return {erro:'falhou'}});
  }

  $('q').addEventListener('input',function(e){filtro=e.target.value.toLowerCase();desenhar()});

  $('ordemBtn').addEventListener('click',function(){
    var c=$('card');
    c.innerHTML='<h2>Ordem</h2><p>Como a lista aparece</p><div class="card-list">'+
      Object.keys(ORDENS).filter(function(k){ return k!=='perfil' || vista==='tapes' }).map(function(k){
        return '<button type="button" data-ordem="'+k+'">'+
          '<span style="width:18px;display:flex">'+(ordem===k?'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4"><path d="M5 12.5l5 5 9-10"/></svg>':'')+'</span>'+
          ORDENS[k]+'</button>';
      }).join('')+
      '</div><button class="pill" data-close type="button" style="width:100%;justify-content:center;margin-top:14px">Fechar</button>';
    $('veil').hidden=false;
    c.querySelector('[data-close]').addEventListener('click',fechar);
    c.querySelectorAll('[data-ordem]').forEach(function(b){
      b.addEventListener('click',function(){
        ordem=b.dataset.ordem; if(ordemDe[vista]) ordemDe[vista]=ordem;
        $('ordemLabel').textContent=ORDENS[ordem];
        fechar();
      });
    });
  });
  $('syncTudo').addEventListener('click',function(e){
    var b=e.currentTarget;b.disabled=true;b.textContent='Mandando…';
    acao('sync',{}).then(function(j){
      b.disabled=false;b.textContent='Converter tudo';
      if(!j.ok){ flash(j.erro||'Não consegui disparar.'); return; }
      flash('Conversão de todo mundo começou.');
      artistas.forEach(function(x){ x.job_estado='na fila';x.job_total=0;x.job_feitos=0;x.job_at=new Date().toISOString() });
      desenhar();acompanhar();carregar(true);
    });
  });

  var tid;
  window.__painelFlash=function(m){ flash(m); };
  window.__painelFechar=function(){ fechar(); };
  function flash(m){
    clearTimeout(tid);
    var el=$('toast');el.textContent=m;el.hidden=false;el.style.opacity='1';
    tid=setTimeout(function(){el.style.opacity='0';setTimeout(function(){el.hidden=true},260)},2600);
  }

  carregar();
  // /painel#<seção> abre direto nela (o e-mail de comentário usa #comentarios); as telas que
  // vêm de arquivo à parte (defer) esperam o arquivo chegar
  (function(){
    // volta do atalho "Plays Caramujo" (rodada N): #gravou&plays=<id>:<n>,... (o gravou.js guarda)
    var hh=location.hash.replace('#','').split('&plays='); if(hh[1]) window.__gvPlays=hh[1];
    var h=hh[0];
    if(!h||!TITULOS[h]){ iniciarHistorico('hoje'); desenhar(); return; }
    iniciarHistorico(h);
    var precisa={comentarios:'CaramujoComentarios',musicas:'CaramujoMusicas',gravou:'CaramujoGravou',analytics:'CaramujoAnalytics',vitrine:'CaramujoVitrine',fila:'CaramujoVitrine',cupons:'CaramujoVitrine'}[h];
    var tenta=0;
    (function vai(){ if(!precisa||window[precisa]||tenta++>40){ irPara(h,true); return; } setTimeout(vai,50); })();
  })();
})();
</script>
</body></html>`;
}
