// A página do artista: caramujorecords.com.br/nome-do-artista/codigo

import { paginaErro } from '../_lib/erro.js';
import { db } from '../_lib/db.js';
import { pagina, faixa, textoGoogleTape } from '../_lib/page.js';
import { lerEstatico } from '../_lib/loja.js';
import { vitrine, indexar, achar } from '../_lib/vitrine.js';
import { tapesDoPerfil } from '../_lib/perfil.js';
import { MIDIA } from '../_lib/midia.js';
import { slug as slugDe } from '../_lib/casar.js';
import { SQL_PASTA, praPagina, COMENTARIOS } from '../_lib/comentarios.js';
import { CHAVE_GRAVOU, fotoDaPasta } from '../_lib/gravou.js';
import { lerAjuste, daTape, aplicarNaTape } from '../_lib/tapeajuste.js';

// caminhos do site que não são artista
const RESERVADO = new Set(['api', 'audio', 'assets', 'docs', 'previews', 'functions',
  'mockups-antigos', 'catalogo', 'painel', 'dl', 'f', 'p', 'b', 'beat', 'beats', 'capa', 'cdn-cgi', 'rideblan33', 'pedido']);

// preço do beat avulso, lido do index.html (o mesmo que a loja cobra); falhou = sem preço no texto
async function precoDoBeat(request, env) {
  try { return (await lerEstatico(request, env)).preco || null; } catch (_) { return null; }
}

export async function onRequestGet({ params, request, env }) {
  const slug = String(params.artista || '').toLowerCase();
  const codigo = String(params.codigo || '').toLowerCase();

  // caminho do site que não é artista: devolve pro conteúdo estático
  if (RESERVADO.has(slug)) return env.ASSETS.fetch(request);

  const d = await db(env);
  // As duas consultas saem juntas (03/10/2026): o banco fica longe do Brasil e cada
  // ida e volta custava ~150ms, uma atrás da outra. As faixas só vêm se o slug E o
  // código baterem (código errado = lista vazia, nada lido à toa).
  // A vitrine (só a tape usa) e a lista do perfil (o "Mais de") também já saem agora,
  // em paralelo: as duas costumam vir da cópia guardada, mas no servidor frio iam ao
  // banco depois das consultas da página.
  const pVitrine = vitrine(request, env).catch(() => []);
  const pPerfil = tapesDoPerfil(request, env).catch(() => null);
  // ordem, gênero, BPM e beats escondidos que o Bruno acertou no painel (24/10/2026; só vale pra tape)
  const pAjuste = lerAjuste(d);
  // os comentários da pasta (10/10/2026) vêm na mesma leva: tape e código errado = lista vazia
  const [artist, faixasDoBanco, doComentario] = await Promise.all([
    d.prepare('SELECT * FROM artists WHERE slug = ?').bind(slug).first(),
    d.prepare(
      `SELECT * FROM tracks WHERE ready = 1 AND artist_id =
         (SELECT id FROM artists WHERE slug = ? AND code = ? AND tipo != 'vitrine')`
    ).bind(slug, codigo).all(),
    // desligados (11/10/2026): nem consulta o banco
    COMENTARIOS.ligado ? d.prepare(SQL_PASTA).bind(slug, codigo).all().catch(() => ({ results: [] })) : null
  ]);

  // a prateleira interna da vitrine não é catálogo de ninguém: não abre página
  if (!artist || artist.code !== codigo || artist.tipo === 'vitrine') {
    return paginaErro(request, env, 404, {
      titulo: 'Esse link não abre',
      texto: 'Ou ele veio cortado, ou o catálogo mudou de endereço. Procure no {perfil} ou chame o {direct}.'
    });
  }

  const { results } = faixasDoBanco;

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
    const mapa = indexar(await pVitrine);
    for (const t of tracks) {
      if (t.kind !== 'beat') continue;
      const b = achar(mapa, t);
      if (!b) continue;
      // o gênero só existe na loja: beat da tape com par lá leva o gênero pro compartilhar
      // (beat sem par fica sem, nunca adivinhado)
      if (b.generoLabel) t.genero = b.generoLabel;
      // o beat existe na loja: o nome na barra do player leva pra página dele (04/10/2026)
      if (b.slug) t.pagina = b.slug;
      if (b.sold) { t.tag = 'vendido'; continue; }
      if (!artist.dl_beats && t.tag === 'disponivel') t.buy = b.slug;
    }
  }
  // ajustes do painel por cima (depois do par com a vitrine, que casa pelo BPM do arquivo)
  let tracksPagina = tracks;
  if (artist.tipo === 'tape') tracksPagina = aplicarNaTape(tracks, daTape(await pAjuste, artist.id));
  // rodada R (18/10/2026): pasta de artista sem capa nenhuma usa a foto do artista no Spotify
  // (Quem já gravou); quem já tem imagem (subida pelo artista ou no Drive) fica com a dele
  let fotoPadrao = null;
  if (artist.tipo !== 'tape' && !artist.cover_key) {
    try {
      const r = await d.prepare('SELECT valor FROM meta WHERE chave = ?').bind(CHAVE_GRAVOU).first();
      fotoPadrao = r && r.valor ? fotoDaPasta(JSON.parse(r.valor), artist.name) : null;
    } catch (_) { fotoPadrao = null; }
  }
  const capa = artist.cover_key ? `${url.origin}/capa/${artist.cover_key}` : fotoPadrao || `${url.origin}/og-image.png`;

  const tape = artist.tipo === 'tape';

  // "Mais de @rideblan33" no fim da lista: as outras tapes do perfil, na ordem do
  // perfil. Tape e pasta de artista (pasta entrou em 26/09/2026). Sai da mesma lista
  // guardada do perfil: nenhuma consulta a mais na maioria das aberturas. Falhou =
  // a página abre sem o bloco. A pasta só aponta pras tapes (públicas); nada da
  // pasta vai pra fora.
  let mais = null, totalPerfil = 0, lanc = null;
  {
    try {
      const todas = await pPerfil;     // null = falhou: cai no catch e a página abre sem o bloco
      totalPerfil = todas.length;
      // o lançamento de agora (1ª tape do perfil): a caixa da lista volta quando ele muda (rodada S)
      lanc = todas[0] ? todas[0].slug : null;
      // 5 tapes + o card do portfólio completo (26/09/2026)
      mais = todas.filter((t) => t.id !== artist.id).slice(0, 5)
        // endereço limpo; o app.html põe data-de="mais" no card (_lib/origem.js, 08/10/2026)
        .map((t) => ({ name: t.name, url: `/${t.slug}/${t.code}`, capa: t.capa ? `/capa/${t.capa}` : null, n: t.n }));
    } catch (_) { mais = null; }
  }

  // Link de um beat da tape (?faixa=<nome>, 04/10/2026): a prévia no Direct/WhatsApp mostra
  // o beat no formato do /b/ ("NOME · @rideblan33" + ficha). O Google segue vendo a tape
  // (canonical sem o ?faixa) e a página abre já na faixa.
  const pedida = tape ? String(url.searchParams.get('faixa') || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80) : '';
  const fx = pedida ? tracksPagina.find((t) => t.kind === 'beat' && slugDe(t.title) === pedida) : null;
  const fichaFx = fx ? [fx.genero, fx.bpm ? fx.bpm + ' BPM' : '', fx.key].filter(Boolean).join(' · ') : '';

  return pagina(request, env, {
    // Tape vai pro Google (pedido de 26/09/2026); pasta de artista segue privada
    indexar: tape,
    // texto do Google montado dos dados da tape (gêneros da loja, BPM, à venda; 10/10/2026)
    descricaoGoogle: tape
      ? textoGoogleTape(artist.name, tracksPagina, { preco: await precoDoBeat(request, env), gratis: !!artist.dl_beats })
      : null,
    // textos da prévia no Direct/WhatsApp (formato do Bruno, 25/09/2026)
    titulo: fx ? `${String(fx.title).toLocaleUpperCase('pt-BR')} · @rideblan33`
      : tape ? `${artist.name} · @rideblan33` : `${artist.name} · Caramujo Records`,
    descricao: fx
      ? `${fichaFx}${fx.tag === 'vendido' ? ' · vendido' : ''}${fichaFx || fx.tag === 'vendido' ? '. ' : ''}Beats e produção completa. © Caramujo Records`
      : tape
        ? 'Catálogo completo com beats exclusivos. © Caramujo Records'
        : `Beats e músicas de ${artist.name} com @rideblan33.`,
    url: url.origin + url.pathname,
    ogUrl: fx ? `${url.origin}${url.pathname}?faixa=${pedida}` : null,
    capa,
    cat: {
      artist: {
        id: artist.id, name: artist.name, who: '@rideblan33',
        tape,
        cover: artist.cover_key ? `/capa/${artist.cover_key}` : fotoPadrao,
        coverPadrao: fotoPadrao,
        capaDoArtista: !tape && artist.cover_origem === 'artista',
        descricao: artist.descricao || null
      },
      code: artist.code,
      owner: false,
      perm: { beats: !!artist.dl_beats, sons: !!artist.dl_sons },
      tracks: tracksPagina,
      // o @rideblan33 vira o chip do perfil nas tapes E nas pastas de artista (26/09/2026)
      perfil: '/rideblan33',
      mais, totalPerfil, lanc,
      // comentários no tempo da faixa (10/10/2026): só pasta de artista
      ...(tape || !COMENTARIOS.ligado ? {} : { comentarios: true, coment: praPagina(doComentario && doComentario.results, tracks) }),
      ...(MIDIA ? { midia: MIDIA } : {})
    }
  });
}

