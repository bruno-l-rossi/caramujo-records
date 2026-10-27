// Rodada Y (27/10/2026): "Comprou um beat e perdeu o link?" da Ajuda.
//   POST /api/recuperar { email }  manda pro MESMO e-mail os links dos pedidos pagos dele.
// A resposta é igual tendo pedido ou não: ninguém descobre pelo site se um e-mail comprou na Caramujo.
import { db, json } from '../_lib/db.js';
import { ipDe } from '../_lib/lista.js';
import { emailOk, dentroDoLimite, pedidosDoEmail, emailPedidos, enviar } from '../_lib/avisos.js';

export async function onRequestPost({ request, env }) {
  const txt = await request.text().catch(() => '');
  if (!txt || txt.length > 500) return json({ erro: 'pedido torto' }, 400);
  let b = null; try { b = JSON.parse(txt); } catch (_) { b = null; }
  const email = emailOk(b && b.email);
  if (!email) return json({ erro: 'Esse e-mail não parece certo. Confere e tenta de novo.' }, 400);
  const d = await db(env);
  const ip = await ipDe(request, env.PAINEL_SENHA || '');
  const ok = await dentroDoLimite(d, [['rc-ip:' + (ip || '?'), 5, 3600e3], ['rc-em:' + email, 2, 600e3]]);
  if (!ok) return json({ erro: 'Muitos pedidos agora. Tenta de novo daqui a pouco.' }, 429);
  try {
    const m = emailPedidos(await pedidosDoEmail(d, email));
    if (m) await enviar(env, { para: email, assunto: m.assunto, html: m.html, texto: m.texto });
  } catch (e) { console.error('[recuperar]', e && e.message); }
  return json({ ok: true });
}
