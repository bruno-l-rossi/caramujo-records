// Rodada Y (27/10/2026): "Mandar pro meu e-mail" da folha Guardar seus salvos.
//   POST /api/salvos { email, ids: [135, 122] }  manda a lista (link que abre em qualquer celular)
// Não guarda o e-mail em lugar nenhum (só a contagem do limite) e não põe ninguém na lista de novidades.
import { db, json } from '../_lib/db.js';
import { ipDe } from '../_lib/lista.js';
import { montarVitrine } from './vitrine.js';
import { lerEstatico } from '../_lib/loja.js';
import { emailOk, dentroDoLimite, emailSalvos, enviar } from '../_lib/avisos.js';

export const MAX_IDS = 60;

export async function onRequestPost({ request, env }) {
  const txt = await request.text().catch(() => '');
  if (!txt || txt.length > 2000) return json({ erro: 'pedido torto' }, 400);
  let b = null; try { b = JSON.parse(txt); } catch (_) { b = null; }
  if (!b || typeof b !== 'object') return json({ erro: 'pedido torto' }, 400);
  const email = emailOk(b.email);
  if (!email) return json({ erro: 'Esse e-mail não parece certo. Confere e tenta de novo.' }, 400);
  const ids = [...new Set((Array.isArray(b.ids) ? b.ids : []).map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, MAX_IDS);
  if (!ids.length) return json({ erro: 'Sua lista de salvos está vazia.' }, 400);
  const d = await db(env);
  const ip = await ipDe(request, env.PAINEL_SENHA || '');
  const ok = await dentroDoLimite(d, [['sv-ip:' + (ip || '?'), 5, 3600e3], ['sv-em:' + email, 3, 3600e3]]);
  if (!ok) return json({ erro: 'Muitos envios agora. Tenta de novo daqui a pouco.' }, 429);
  const vit = await montarVitrine(request, env);
  let preco = null; try { preco = (await lerEstatico(request, env)).precos.beat; } catch (_) { preco = null; }
  const m = emailSalvos(vit || [], ids, preco);
  if (!m) return json({ erro: 'Não achei esses beats no catálogo agora.' }, 404);
  const r = await enviar(env, { para: email, assunto: m.assunto, html: m.html, texto: m.texto });
  if (!r.ok) return json({ erro: 'Não deu pra mandar agora. Tenta de novo em instantes.' }, 502);
  return json({ ok: true, n: m.n });
}
