// A página do artista: caramujorecords.com.br/nome-do-artista/codigo

import { paginaErro } from '../_lib/erro.js';
import { db } from '../_lib/db.js';
import { pagina, faixa } from '../_lib/page.js';
import { vitrine, indexar, achar } from '../_lib/vitrine.js';
import { tapesDoPerfil } from '../_lib/perfil.js';

// caminhos do site que não são artista
const RESERVADO = new Set(['api', 'audio', 'assets', 'docs', 'previews', 'functions',
  'mockups-antigos', 'catalogo', 'painel', 'dl', 'f', 'p', 'b', 'capa', 'cdn-cgi', 'rideblan33']);

export async function onRequestGet({ params, request, env }) {
  const slug = String(params.artista || '').toLowerCase();
  const codigo = String(params.codigo || '').toLowerCase();

  // caminho do site que não é artista: devolve pro conteúdo estático
  if (RESERVADO.has(slug)) return env.ASSETS.fetch(request);

  const d = await db(env);
  const artist = await d.prepare('SELECT * FROM artists WHERE slug = ?').bind(slug).first();

  // a prateleira interna da vitrine não é catálogo de ninguém: não abre página
  if (!artist || artist.code !== codigo || artist.tipo === 'vitrine') {
    return paginaErro(request, env, 404, {
      titulo: 'Esse link não abre',
      texto: 'Ou ele veio cortado, ou o catálogo mudou de endereço. Pede o link de novo pro {ig}.'
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
  // Numa tape, o site manda: beat vendido lá sai com pastilha de vendido aqui, mesmo
  // que a última conversão ainda não tenha acertado isso.
  // Carrinho só em tape com download DESLIGADO: tape de graça (a "Nada de novo") tem
  // beat sem licença exclusiva, ninguém compra.
  if (artist.tipo === 'tape') {
    const mapa = indexar(await vitrine(request, env));
    for (const t of tracks) {
      if (t.kind !== 'beat') continue;
      const b = achar(mapa, t);
      if (!b) continue;
      // o gênero só existe na loja: beat da tape com par lá leva o gênero pro compartilhar
      // (beat sem par fica sem, nunca adivinhado)
      if (b.generoLabel) t.genero = b.generoLabel;
      if (b.sold) { t.tag = 'vendido'; continue; }
      if (!artist.dl_beats && t.tag === 'disponivel') t.buy = b.slug;
    }
  }
  const capa = artist.cover_key ? `${url.origin}/capa/${artist.cover_key}` : `${url.origin}/og-image.png`;

  const tape = artist.tipo === 'tape';

  // Tape: "Mais do @rideblan33" no fim da lista (as outras tapes do perfil, na ordem
  // do perfil, até 12). Sai da mesma lista guardada do perfil: nenhuma consulta a mais
  // na maioria das aberturas. Falhou = a tape abre sem o bloco.
  let mais = null;
  if (tape) {
    try {
      mais = (await tapesDoPerfil(request, env)).filter((t) => t.id !== artist.id).slice(0, 12)
        .map((t) => ({ name: t.name, url: `/${t.slug}/${t.code}?de=mais`, capa: t.capa ? `/capa/${t.capa}` : null, n: t.n }));
    } catch (_) { mais = null; }
  }
  const nBeats = tracks.filter((t) => t.kind === 'beat').length;

  return pagina(request, env, {
    // Tape vai pro Google (pedido de 26/09/2026); pasta de artista segue privada
    indexar: tape,
    descricaoGoogle: tape
      ? `${artist.name}: beat tape do @rideblan33 com ${nBeats} ${nBeats === 1 ? 'beat' : 'beats'} de rap pra ouvir. Beats exclusivos e produção completa na Caramujo Records, São Carlos, SP.`
      : null,
    // textos da prévia no Direct/WhatsApp (formato do Bruno, 25/09/2026)
    titulo: tape ? `${artist.name} · @rideblan33` : `${artist.name} · Caramujo Records`,
    descricao: tape
      ? 'Catálogo completo com beats exclusivos. © Caramujo Records'
      : `Beats e músicas de ${artist.name} com @rideblan33.`,
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
      tracks,
      ...(tape ? { perfil: '/rideblan33', mais } : {})
    }
  });
}

