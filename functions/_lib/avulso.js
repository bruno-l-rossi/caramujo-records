// Página de um link avulso: uma faixa (/f/codigo) ou uma seleção (/p/codigo).

import { db } from './db.js';
import { pagina, faixa } from './page.js';

export async function avulso(kind, { params, request, env }) {
  const c = String(params.codigo || '').toLowerCase();
  const d = await db(env);

  const link = await d.prepare('SELECT * FROM links WHERE code = ? AND kind = ?').bind(c, kind).first();
  if (!link) return new Response('link nao encontrado', { status: 404 });

  const ids = link.track_ids.split(',').filter(Boolean);
  const marcas = ids.map(() => '?').join(',');

  const artist = await d.prepare('SELECT * FROM artists WHERE id = ?').bind(link.artist_id).first();
  const { results } = await d.prepare(
    `SELECT * FROM tracks WHERE id IN (${marcas}) AND ready = 1`
  ).bind(...ids).all();

  const tracks = (results || []).map(faixa);
  if (!tracks.length) return new Response('essas faixas sairam do ar', { status: 404 });

  const url = new URL(request.url);
  const umaSo = tracks.length === 1;
  const podeBaixar = tracks.some((t) => (t.kind === 'beat' ? artist.dl_beats : artist.dl_sons));

  return pagina(request, env, {
    titulo: umaSo ? `${tracks[0].title} · prod. rideblan33` : `${artist.name} · Caramujo Records`,
    descricao: umaSo
      ? `${tracks[0].title}, produzido pelo rideblan33. Toca direto, sem baixar nada.`
      : `${tracks.length} faixas de ${artist.name} com o rideblan33.`,
    url: url.origin + url.pathname,
    capa: artist.cover_key ? `${url.origin}/capa/${artist.cover_key}` : `${url.origin}/og-image.png`,
    cat: {
      artist: {
        id: artist.id, name: artist.name, who: '@rideblan33',
        cover: artist.cover_key ? `/capa/${artist.cover_key}` : null,
        descricao: artist.descricao || null
      },
      code: link.code,
      preview: true,
      owner: false,
      perm: { download: !!podeBaixar, beats: !!artist.dl_beats, sons: !!artist.dl_sons },
      tracks
    }
  });
}
