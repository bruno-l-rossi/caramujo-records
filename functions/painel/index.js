// Painel privado do rideblan33. Só abre com a senha guardada em PAINEL_SENHA.
// Mostra os artistas, o link de cada um, a permissão de download e quem ouviu o quê.

import { COOKIE, DIAS, assinar, igual, autenticado, cookieEu } from '../_lib/sessao.js';
import { ICONES } from '../_lib/icones.js';

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
  .barra[hidden],#resumo[hidden],#lista[hidden],#analytics[hidden],#vitrine[hidden],#musicas[hidden],#gravou[hidden]{display:none}
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
  /* beats da tape (24/10/2026): ordem, gênero, BPM e escondidos */
  .tb-lista li{flex-wrap:wrap}
  .tb-lista li.oculto .pf-txt b{color:var(--ink4);text-decoration:line-through}
  .tb-nome{flex:1;min-width:0;display:block;text-align:left;background:none;border:0;padding:6px 0;color:inherit;font:inherit;cursor:pointer}
  .tb-olho{width:44px;height:44px;flex:none;display:flex;align-items:center;justify-content:center;background:none;border:0;color:#8a8a8a;cursor:pointer;border-radius:8px}
  .tb-olho:hover{color:#fff;background:#1a1a1a}
  .tb-olho[aria-pressed="true"]{color:#e0a96d}
  .tb-ed{flex-basis:100%;display:grid;grid-template-columns:minmax(0,1fr) 96px auto;gap:8px;align-items:end;padding:4px 0 10px 36px}
  .tb-ed[hidden]{display:none}
  .tb-ed label{display:block;font-size:11px;color:var(--ink4);margin-bottom:4px}
  .tb-ed select,.tb-ed input{width:100%;height:44px;border-radius:10px;border:1px solid #2a2a2a;background:#0f0f0f;color:#fff;padding:0 10px;font:inherit;font-size:16px}
  .tb-ed .pill{height:44px}
  .tb-ed small{grid-column:1/-1;font-size:12px;color:var(--ink4)}
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
  /* ---------- revisão do painel (04/11/2026) ----------
     1 cor só pra "precisa de você": o âmbar (--at) que o painel já usava; o vermelho (--erro) só pro que
     apaga ou dá erro. Superfícies sem borda (--s1..3), rótulos em letra normal, um seletor só pra filtro,
     abas que grudam no topo, esqueleto no carregamento e, no computador, folha em gaveta à direita. */
  :root{--s1:#131313;--s2:#1b1b1b;--s3:#242424;--at:#e0b155;--at-bg:rgba(224,177,85,.13);--erro:#e08d7e}
  .so-leitor{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  .topo-bts{display:flex;gap:8px}
  .rot{text-transform:lowercase;letter-spacing:0;font-size:13px;font-weight:650;color:var(--ink2)}
  .rot::first-letter{text-transform:uppercase}
  .rot2{display:flex;align-items:center;gap:8px;margin:26px 0 10px;font-size:15px;font-weight:650}
  .rot-ir{margin-left:auto;border:0;background:none;padding:4px 0;font-size:13px;font-weight:500;color:var(--ink3);cursor:pointer}
  .n-at{font-style:normal;font-size:11.5px;font-weight:800;color:#000;background:var(--at);border-radius:9px;min-width:19px;height:19px;padding:0 6px;display:inline-flex;align-items:center;justify-content:center;font-variant-numeric:tabular-nums}
  .n-cz{font-style:normal;font-size:12px;font-weight:600;color:var(--ink4);font-variant-numeric:tabular-nums}
  .secoes{position:sticky;top:0;z-index:15;background:#0a0a0a}
  .secoes i{background:var(--at)}
  .secoes i.cz{background:transparent;color:var(--ink4);padding:0;min-width:0}
  .nav-p em{background:var(--at)}
  .nav-p em.cz{background:transparent;color:var(--ink4)}
  /* Hoje: a semana, as tarefas, as vendas e os atalhos */
  .hoje-grade .hoje-col{display:contents}
  .hoje-grade{display:flex;flex-direction:column}
  .sem{display:block;width:100%;margin-top:16px;padding:16px 16px 14px;border:0;border-radius:18px;background:var(--s1);color:var(--ink);text-align:left;cursor:pointer}
  .sem-k{display:flex;align-items:center;font-size:13px;color:var(--ink3)}
  .sem-ir{margin-left:auto}
  .sem-v{display:flex;align-items:center;gap:10px;margin-top:6px;font-size:40px;font-weight:750;letter-spacing:-.035em;font-variant-numeric:tabular-nums}
  .sobe{font-size:12.5px;font-weight:700;letter-spacing:0;color:#fff;background:var(--s3);border-radius:8px;padding:4px 8px}
  .sobe.desce{color:var(--ink2)}
  .sem-l{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:4px;font-size:13px;color:var(--ink3)}
  .sem-l b{color:#fff;font-weight:650;font-variant-numeric:tabular-nums}
  .barras{display:flex;align-items:flex-end;gap:7px;height:58px;margin-top:16px}
  .barras i{flex:1;border-radius:5px 5px 2px 2px;background:#fff;min-height:3px}
  .barras i.z{background:#262626}
  .barras-l{display:flex;gap:7px;margin-top:7px}
  .barras-l span{flex:1;text-align:center;font-size:10.5px;color:var(--ink4)}
  .barras-l span.h{color:#fff;font-weight:700}
  .cx{background:var(--s1);border-radius:18px;overflow:hidden}
  .lin{display:flex;align-items:center;gap:12px;padding:12px 14px;min-height:64px;border-top:1px solid var(--linha)}
  .lin:first-child{border-top:0}
  .lin .ico{width:40px;height:40px;border-radius:12px;background:var(--s2);display:flex;align-items:center;justify-content:center;color:#d9d9d9;flex:none}
  .lin.quente .ico{background:var(--at);color:#000}
  .lin .t{flex:1;min-width:0;cursor:pointer}
  .lin b{display:block;font-size:15px;font-weight:600;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .lin small{display:block;margin-top:3px;font-size:12.5px;color:var(--ink3);line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .lin.ped{cursor:pointer}
  .lin.ped:hover{background:#161616}
  .cx .nada{margin:0;padding:16px 14px}
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;height:36px;padding:0 15px;border:0;border-radius:999px;background:var(--s3);color:#fff;font-size:13.5px;font-weight:650;white-space:nowrap;flex:none;cursor:pointer}
  .btn.solid{background:#fff;color:#000}
  .btn.conf{background:var(--at);color:#000}
  .btn:disabled{opacity:.5;cursor:default}
  .av{width:40px;height:40px;border-radius:50%;background:var(--s2);font-size:12px;font-weight:750;color:#bdbdbd;display:flex;align-items:center;justify-content:center;flex:none}
  .chip{flex:none;font-size:11px;font-weight:650;padding:4px 9px;border-radius:999px;border:0;color:var(--ink2);background:var(--s2);white-space:nowrap}
  .chip.at{color:var(--at);background:var(--at-bg)}
  .atalhos{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .atl{display:flex;align-items:center;gap:10px;height:54px;padding:0 14px;border:0;border-radius:14px;background:var(--s1);color:var(--ink);font-size:14px;font-weight:600;text-align:left;cursor:pointer}
  .atl:hover{background:#181818}
  .atl svg{color:var(--ink2);flex:none}
  /* esqueleto no lugar do "carregando…" (o texto fica pro leitor de tela) */
  .esq{display:flex;flex-direction:column;gap:10px;padding:14px}
  .esq i{display:block;height:14px;border-radius:7px;background:linear-gradient(90deg,#181818,#222,#181818);background-size:200% 100%;animation:esq 1.2s linear infinite}
  .esq i:nth-child(2){width:72%}.esq i:nth-child(3){width:46%}
  .sem .esq{padding:12px 0 0}
  @keyframes esq{to{background-position:-200% 0}}
  @media (prefers-reduced-motion:reduce){.esq i{animation:none}}
  /* um seletor só pra todo filtro (Pedidos, Beats, Cupons) */
  .linha-f{display:flex;align-items:center;gap:8px;margin:14px 0 12px}
  .seg{flex:1;display:flex;gap:2px;padding:3px;border-radius:12px;background:var(--s1);min-width:0}
  .seg button{flex:1;display:flex;align-items:center;justify-content:center;gap:5px;min-height:36px;padding:0 10px;border:0;border-radius:9px;background:transparent;color:var(--ink3);font-size:13.5px;font-weight:600;white-space:nowrap;cursor:pointer;min-width:0}
  .seg button[aria-pressed="true"]{background:#2a2a2a;color:#fff}
  .seg button i{font-style:normal;font-weight:500;color:var(--ink4);font-variant-numeric:tabular-nums}
  .seg button[aria-pressed="true"] i{color:var(--ink2)}
  .icb{width:42px;height:42px;flex:none;border:0;border-radius:12px;background:var(--s1);color:#d9d9d9;display:flex;align-items:center;justify-content:center;cursor:pointer}
  .barra .icb{height:auto;align-self:stretch;min-height:44px}
  /* folhas: título com o ✕ */
  .f-cab{display:flex;align-items:flex-start;gap:12px;margin-bottom:4px}
  .f-cab .t{flex:1;min-width:0}
  .f-cab h2{margin:0 0 3px}
  .f-x{width:36px;height:36px;flex:none;border:0;border-radius:50%;background:var(--s3);color:var(--ink2);display:flex;align-items:center;justify-content:center;cursor:pointer}
  details.como{margin:6px 0 0}
  details.como summary{display:inline-block;font-size:12.5px;color:var(--ink3);cursor:pointer;list-style:none;text-decoration:underline;text-underline-offset:3px}
  details.como summary::-webkit-details-marker{display:none}
  details.como[open] summary{margin-bottom:6px}
  .revisar{border:0;background:#17130c}
  .revisar.limpo{background:var(--s1)}
  .ac,.tile,.home button{border:0;background:var(--s1)}
  /* busca única: tela cheia no celular, caixa no meio no computador */
  .busca{position:fixed;inset:0;z-index:50;background:#0a0a0a;display:flex;justify-content:center}
  .busca[hidden]{display:none}
  .busca-cx{width:100%;max-width:640px;display:flex;flex-direction:column;min-height:0}
  .busca-topo{display:flex;align-items:center;gap:10px;padding:14px 16px 8px;padding-top:calc(14px + env(safe-area-inset-top,0px))}
  .busca-topo .campo{margin:0;border-color:#3a3a3a}
  .busca-x{border:0;background:none;color:var(--ink2);font-size:14.5px;font-weight:600;cursor:pointer;padding:8px 0}
  .busca-res{flex:1;overflow-y:auto;padding:0 16px 40px;overscroll-behavior:contain}
  .bq-rot{display:flex;align-items:center;gap:6px;margin:18px 0 6px;font-size:12.5px;font-weight:650;color:var(--ink4)}
  .bq-l{display:flex;align-items:center;gap:12px;padding:9px 0;min-height:58px;border-bottom:1px solid #161616;cursor:pointer}
  .bq-l.lin{padding:9px 0;border-top:0}
  .bq-l .t{flex:1;min-width:0}
  .bq-l b{display:block;font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .bq-l small{display:block;margin-top:2px;font-size:12.5px;color:var(--ink3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .bt-th{width:42px;height:42px;flex:none;border-radius:10px;overflow:hidden;background:#1a1a1a url('/assets/brand/selo-creme.svg') center/55% no-repeat}
  .bt-th img{width:100%;height:100%;object-fit:cover;display:block}
  .busca-dica{margin:18px 0 0;font-size:13px;line-height:1.5;color:var(--ink4)}
  html.busca-aberta{overflow:hidden}
  .nav-p .np-busca{display:none}
  input[type=search]::-webkit-search-cancel-button{-webkit-appearance:none;appearance:none;width:16px;height:16px;cursor:pointer;background:center/14px no-repeat url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238a8a8a' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M6 6l12 12M18 6L6 18'/%3E%3C/svg%3E")}
  @media (max-width:420px){.secoes{gap:18px}.secoes button{font-size:14.5px}}
  @media (min-width:900px){
    .hoje-grade{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);gap:0 26px;align-items:start}
    .hoje-grade .hoje-col{display:flex;flex-direction:column}
    .hoje-grade .hoje-col > .sem:first-child{margin-top:16px}
    .barras{height:84px}
    .nav-p .np-busca{display:flex;align-items:center;gap:10px;margin:-10px 4px 16px;padding:9px 10px;border:1px solid var(--borda);border-radius:10px;background:#111;color:var(--ink4);font-size:13.5px;cursor:pointer;text-align:left}
    .nav-p .np-busca span{flex:1}
    .nav-p .np-busca kbd{font-family:inherit;font-size:11px;color:var(--ink3);border:1px solid #333;border-radius:5px;padding:1px 5px}
    .busca{background:rgba(0,0,0,.6);align-items:flex-start;padding-top:9vh}
    .busca-cx{max-height:78vh;background:#141414;border:1px solid var(--borda);border-radius:18px;overflow:hidden}
    .busca-topo{padding:14px 16px 10px}
    /* a folha vira gaveta à direita: a lista fica à vista */
    .veil{align-items:stretch;justify-content:flex-end;background:rgba(0,0,0,.4)}
    .card{max-width:460px;height:100%;max-height:none;border-radius:0;border-width:0 0 0 1px;padding:22px 22px 28px}
  }
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
  <div class="topo"><a class="marca" href="/" aria-label="Voltar pro site"></a><span class="topo-bts"><button type="button" class="eng" id="buscaBtn" aria-label="Buscar"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.6-4.6"/></svg></button><button type="button" class="eng" id="engBtn" aria-label="Ajustes"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg></button></span></div>
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
    <!-- 04/11/2026 (revisão do painel, item 10): o "Converter tudo" foi pro ⋯, com confirmação -->
    <button class="icb" id="barraMais" type="button" aria-label="Mais: converter tudo"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg></button>
  </div>

  <div id="lista"><div class="vazio">carregando…</div></div>
  <div id="analytics" hidden></div>
  <div id="vitrine" hidden></div>
  <div id="musicas" hidden></div>
  <div id="gravou" hidden></div>
</div>
<script src="/assets/painel/analytics.js?v=5a2c419e9e" defer></script>
<script src="/assets/painel/vitrine.js?v=d97862cb81" defer></script>
<script src="/assets/painel/musicas.js?v=a54b446b13" defer></script>
<script src="/assets/painel/gravou.js?v=018001c9a1" defer></script>

<nav class="nav-p" id="navP" aria-label="Seções do painel"></nav>
<div class="veil" id="veil" hidden><div class="card" id="card" role="dialog" aria-modal="true"></div></div>
<div class="toast" id="toast" hidden></div>

<script src="/assets/painel/painel.js?v=07097b9100"></script>
</body></html>`;
}
