// A página do artista: caramujorecords.com.br/nome-do-artista/codigo

import { db } from '../_lib/db.js';
import { pagina, faixa } from '../_lib/page.js';
import { vitrine, indexar, achar } from '../_lib/vitrine.js';

// caminhos do site que não são artista
const RESERVADO = new Set(['api', 'audio', 'assets', 'docs', 'previews', 'functions',
  'mockups-antigos', 'catalogo', 'painel', 'dl', 'f', 'p', 'cdn-cgi']);

export async function onRequestGet({ params, request, env }) {
  const slug = String(params.artista || '').toLowerCase();
  const codigo = String(params.codigo || '').toLowerCase();

  // caminho do site que não é artista: devolve pro conteúdo estático
  if (RESERVADO.has(slug)) return env.ASSETS.fetch(request);

  const d = await db(env);
  const artist = await d.prepare('SELECT * FROM artists WHERE slug = ?').bind(slug).first();

  // a prateleira interna da vitrine não é catálogo de ninguém: não abre página
  if (!artist || artist.code !== codigo || artist.tipo === 'vitrine') {
    return new Response(semLink(), {
      status: 404,
      headers: { 'content-type': 'text/html; charset=utf-8' }
    });
  }

  const { results } = await d.prepare(
    'SELECT * FROM tracks WHERE artist_id = ? AND ready = 1'
  ).bind(artist.id).all();

  const tracks = (results || []).map(faixa);
  const url = new URL(request.url);

  // Beat de tape com pastilha DISPONÍVEL ganha o botão de carrinho, contanto que
  // o beat exista na vitrine do site e continue à venda lá. Sem par, sem botão:
  // ninguém clica pra cair numa aba que não faz nada.
  // Tape com download liberado é tape de graça (a "Nada de novo"): beat sem licença
  // exclusiva, ninguém compra, então não entra carrinho.
  if (artist.tipo === 'tape' && !artist.dl_beats) {
    const aVenda = tracks.filter((t) => t.tag === 'disponivel');
    if (aVenda.length) {
      const mapa = indexar(await vitrine(request, env));
      for (const t of aVenda) {
        const b = achar(mapa, t);
        if (b && !b.sold) t.buy = b.slug;
      }
    }
  }
  const capa = artist.cover_key ? `${url.origin}/capa/${artist.cover_key}` : `${url.origin}/og-image.png`;

  const tape = artist.tipo === 'tape';

  return pagina(request, env, {
    titulo: `${artist.name} · Caramujo Records`,
    descricao: tape
      ? `${artist.name}, beat tape do rideblan33. Toca direto, sem baixar nada.`
      : `Os beats e as músicas de ${artist.name} com o rideblan33. Toca direto, sem baixar nada.`,
    url: url.origin + url.pathname,
    capa,
    cat: {
      artist: {
        id: artist.id, name: artist.name, who: '@rideblan33',
        tape,
        cover: artist.cover_key ? `/capa/${artist.cover_key}` : null,
        capaDoArtista: !tape && artist.cover_origem === 'artista',
        descricao: artist.descricao || null
      },
      code: artist.code,
      owner: false,
      perm: { beats: !!artist.dl_beats, sons: !!artist.dl_sons },
      tracks
    }
  });
}

function semLink() {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Link nao encontrado · Caramujo Records</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
background:#000;color:#fff;font-family:-apple-system,"Helvetica Neue",Helvetica,Arial,sans-serif;
text-align:center;padding:24px}h1{font-size:22px;font-weight:600;margin:0 0 10px}
p{color:#8a8a8a;font-size:15px;line-height:1.5;margin:0 0 22px;max-width:340px}
a{color:#fff;font-size:14px}</style></head><body><div>
<h1>Esse link não abre</h1>
<p>Ou ele veio cortado, ou o catálogo mudou de endereço. Pede o link de novo pro rideblan.</p>
<a href="https://caramujorecords.com.br">caramujorecords.com.br</a>
</div></body></html>`;
}
