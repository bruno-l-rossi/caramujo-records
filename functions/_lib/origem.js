// Origem do clique sem sujar o endereço (08/10/2026).
//
// Antes, os links internos já saíam com ?de=<origem> no href (/grito/9xycz?de=perfil).
// O Google seguia esses links e indexava a tape com o ?de=, deixando o endereço limpo
// em "Detectada, mas não indexada" (Search Console de 07/10). Agora o href é sempre o
// endereço limpo e a origem mora em data-de="<origem>". Este script põe o ?de= no
// link só quando alguém mexe nele de verdade (toque, clique, botão do meio, Enter,
// menu "abrir em nova aba"). Quem chega no destino recebe o mesmo ?de= de antes:
// analytics, funil e a aba inicial do perfil seguem iguais. Robô não clica, então
// só enxerga o endereço limpo.
//
// O mesmo <script> vai colado igual no index.html, no 404.html e no catalogo/app.html
// (entre os comentários leva-de); o teste42 confere que as cópias batem com esta.

export const LEVA_DE = `<script>/* leva-de: ?de= só no clique (functions/_lib/origem.js) */
(function(){
  function leva(e){
    if(e.type==='keydown'&&e.key!=='Enter') return;
    var t=e.target, a=t&&t.closest?t.closest('a[data-de]'):null;
    if(!a) return;
    var de=a.getAttribute('data-de'), h=a.getAttribute('href');
    if(!de||!h) return;
    try{
      var u=new URL(h,location.href);
      if(u.origin!==location.origin||u.searchParams.has('de')) return;
      u.searchParams.set('de',de);
      a.setAttribute('href',u.pathname+u.search+u.hash);
    }catch(_){}
  }
  ['pointerdown','mousedown','touchstart','keydown','contextmenu','auxclick','click'].forEach(function(n){
    document.addEventListener(n,leva,{capture:true,passive:true});
  });
})();
</script>`;

// atributo pronto pra colar no HTML do servidor: <a href="/x"${deAttr('perfil')}>
export const deAttr = (de) => (de ? ` data-de="${String(de).replace(/[^a-z0-9-]/gi, '')}"` : '');
