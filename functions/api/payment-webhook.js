/**
 * Cloudflare Pages Function: payment-webhook
 * POST /api/payment-webhook
 *
 * Quando pagamento é aprovado:
 *  1. Avisa o dono ("✅ VENDA") e o comprador, uma vez por pagamento: PIX e cartão que saiu da análise
 *     (04/11/2026, _lib/avisovenda.js; o cartão aprovado na hora já foi avisado no create-payment)
 *  2. Marca os beats como vendidos no D1 (tabela beats)
 *  3. Conta o uso do cupom no D1 (tabela cupom_uso, um por pagamento)
 * Desde 24/09/2026 nada disso vira commit no GitHub: sem redeploy a cada venda
 * e sem conflito no rebase do Bruno. A lista do site atualiza em até 1 minuto.
 *
 * Variáveis de ambiente necessárias:
 *   MP_ACCESS_TOKEN  — Access Token do Mercado Pago
 *   NOTIFY_EMAIL     — email destinatário das notificações (dono)
 *   NOTIFY_FROM      — email remetente (ex: rideblan33@caramujorecords.com.br)
 *   RESEND_API_KEY   — API Key do Resend (re_...)
 */

import { registrarOrigem } from '../_lib/vendasorigem.js';
import { db } from '../_lib/db.js';
import { marcarVendidos, usarCupom, esquecerLoja } from '../_lib/loja.js';
import { esquecerVitrine } from '../_lib/vitrine.js';
import { contratoHtml, enviarEmailComprador } from '../_lib/emails.js';
import { marcarPago, pedidoDoPagamento, entregaLigada } from '../_lib/pedidos.js';
import { emailVendaAprovada, lerAvisos, anotarAviso, anotarFalha } from '../_lib/avisovenda.js';




// ── E-mail interno "COMPRA CONFIRMADA" (pro dono) ─────────────────────────────
// Dispara quando o pagamento é APROVADO.

// O e-mail "✅ VENDA" pro Bruno mora em _lib/avisovenda.js desde 04/11/2026 (também usado de hora em hora).

// ── Venda e cupom no banco ───────────────────────────────────────────────────

async function gravarVenda({ request, env, payment, beatNames, couponCode }) {
  const d = await db(env);
  if (beatNames.length) {
    const r = await marcarVendidos(d, beatNames, payment.id);
    esquecerVitrine();
    await esquecerLoja(request);
    if (r.marcados.length) console.log(`[loja] Vendidos: ${r.marcados.join(', ')}`);
    if (r.naoAchei.length) console.error(`[loja] ❌ Beat não encontrado no banco: ${r.naoAchei.join(', ')}`);
  }
  if (couponCode) {
    const contou = await usarCupom(d, couponCode, payment.id, payment.transaction_amount);
    console.log(`[loja] Cupom "${couponCode}": ${contou ? 'uso contado' : 'esse pagamento já tinha contado'}`);
  }
}

// ── E-mail do COMPRADOR (detalhes da compra + prazos) ─────────────────────────
// Vai pro cliente quando o pagamento (PIX) é aprovado.

async function sendBuyerConfirmationEmail({ env, payment, pedido = null }) {
  const payer     = payment.payer || {};
  const meta      = payment.metadata || {};
  const email     = meta.buyer_email || payer.email || '';
  const name      = meta.buyer_name  || [payer.first_name, payer.last_name].filter(Boolean).join(' ') || '';
  const artistName = meta.buyer_artist || meta.buyer_name || name;
  const rawDesc   = (payment.description || '').replace('Caramujo Records — ', '');
  const itemsList = meta.items_display || rawDesc;

  // Reconstrói o contrato a partir do metadata salvo no create-payment
  // (o comprador precisa da via dele mesmo se o botão de download falhar)
  // prazo "na hora" com a chave ligada (11/10/2026)
  let naHora = !!pedido;
  if (!naHora) { try { naHora = await entregaLigada(await db(env)); } catch (_) { naHora = false; } }
  let contractHtml = null;
  try {
    const cpfRaw = String(meta.buyer_cpf || payer.identification?.number || '').replace(/\D/g, '');
    if (name && cpfRaw) {
      contractHtml = contratoHtml({
        name, cpf: cpfRaw, email, items: itemsList,
        category: meta.category_label || itemsList,
        amount: payment.transaction_amount,
        paymentId: payment.id,
        termsTimestamp: meta.terms_ts || payment.date_approved || payment.date_created,
        artistName,
        naHora,
      });
    }
  } catch (e) { console.error('[email-buyer] Erro ao gerar contrato:', e.message); }

  await enviarEmailComprador(env, { name, artistName, email, itemsList, contractHtml, pedidoUrl: pedido ? pedido.url : null, pedidoTudo: !!(pedido && pedido.tudo), pedidoTipo: pedido ? pedido.tipo : null, naHora });
}

// ── Handler principal ────────────────────────────────────────────────────────

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); }
  catch { return new Response('Invalid JSON', { status: 400 }); }

  const { type, data } = body || {};
  if (type !== 'payment' || !data?.id) return new Response('ignored', { status: 200 });

  const ACCESS_TOKEN = env.MP_ACCESS_TOKEN;
  if (!ACCESS_TOKEN) return new Response('Config error', { status: 500 });

  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    });

    if (!res.ok) {
      console.error(`[webhook] Erro ao consultar pagamento ${data.id}: ${res.status}`);
      return new Response('fetch error', { status: 200 });
    }

    const payment = await res.json();
    console.log(`[webhook] Pagamento ${payment.id} status: ${payment.status} | método: ${payment.payment_type_id}`);

    if (payment.status === 'approved') {
      let vendaFalhou = false;
      // Beats e cupom deste pagamento
      const desc = payment.description || '';
      console.log(`[webhook] Descrição do pagamento: "${desc}"`);

      // Beats avulsos do catálogo — salvos no metadata pelo create-payment
      const catalogBeatsRaw = payment.metadata?.catalog_beats || null;
      const catalogBeatNames = catalogBeatsRaw
        ? catalogBeatsRaw.split('||').map(n => n.trim()).filter(Boolean)
        : [];

      // Beats de pacote — salvos no metadata como "NOME1||NOME2||NOME3"
      const pkgBeatsRaw  = payment.metadata?.pkg_beats || null;
      const pkgBeatNames = pkgBeatsRaw
        ? pkgBeatsRaw.split('||').map(n => n.trim()).filter(Boolean)
        : [];

      // Unifica todos os beats a marcar como vendidos (sem duplicatas)
      const allBeatNames = [...new Set([...catalogBeatNames, ...pkgBeatNames])];

      const couponCode = payment.metadata?.coupon_code || null;

      if (allBeatNames.length) console.log(`[webhook] Beats a marcar como vendidos: ${allBeatNames.join(', ')}`);
      if (couponCode)          console.log(`[webhook] Cupom usado: "${couponCode}"`);

      // Vendido e uso do cupom no banco. Roda ANTES da trava de repetição: as
      // duas gravações são idempotentes (vendido não "vende de novo", cupom conta
      // uma vez por pagamento). Se o banco falhar, respondo 500 e o Mercado Pago
      // manda de novo; na repetição os emails já não saem, só a gravação.
      if (allBeatNames.length || couponCode) {
        try {
          await gravarVenda({ request, env, payment, beatNames: allBeatNames, couponCode });
        } catch (dbErr) {
          console.error('[webhook] Falha ao gravar venda/cupom no banco:', dbErr.message);
          vendaFalhou = true;
        }
      }


      // Entrega na hora (10/10/2026): o link do pedido vira "pago" (idempotente) e vai nos
      // e-mails do PIX. Falhou = e-mails como antes, sem link.
      let pedido = null;
      try {
        const d = await db(env);
        await marcarPago(d, payment.id);
        pedido = await pedidoDoPagamento(d, payment.id);
      } catch (pedErr) { console.error('[webhook] Pedido com link:', pedErr.message); }

      // De onde veio quem comprou (17/10/2026): idempotente pelo id do pagamento; falhou = segue
      try {
        await registrarOrigem(await db(env), { pagamento: payment.id, valor: payment.transaction_amount,
          metodo: payment.payment_type_id === 'bank_transfer' ? 'pix' : 'cartao',
          visita: payment.metadata?.origem_visita, primeira: payment.metadata?.origem_primeira });
      } catch (oErr) { console.warn('[webhook] Origem da venda:', oErr.message); }

      // ── Quem já foi avisado (04/11/2026, _lib/avisovenda.js) ──────────────────
      // A meta 'avisos-venda' diz se o Bruno e o comprador já receberam o e-mail deste pagamento: vale
      // pra PIX e pra cartão (o cartão que saiu da análise do Mercado Pago não era avisado). Se o banco
      // não responder, vale a marca antiga no metadata do Mercado Pago (webhook_processed).
      let avisos = null;
      try { avisos = await lerAvisos(await db(env)); } catch (aErr) { console.warn('[webhook] Avisos no banco:', aErr.message); }
      const marcaAntiga = payment.metadata?.webhook_processed === 'true';
      const idS = String(payment.id);
      const avisouDono = avisos ? avisos.ok.includes(idS) : marcaAntiga;
      const avisouComprador = avisos ? avisos.c.includes(idS) : marcaAntiga;
      if (avisouDono && avisouComprador) {
        console.log(`[webhook] Pagamento ${payment.id} já avisado — sem e-mails de novo.`);
        return new Response(vendaFalhou ? 'db error' : 'ok', { status: vendaFalhou ? 500 : 200 });
      }

      // A marca no Mercado Pago segue (reserva pra quando o banco cair)
      if (!marcaAntiga) {
        try {
          const patchRes = await fetch(`https://api.mercadopago.com/v1/payments/${payment.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ACCESS_TOKEN}` },
            body: JSON.stringify({ metadata: { ...payment.metadata, webhook_processed: 'true' } }),
          });
          if (!patchRes.ok) console.warn(`[webhook] PUT metadata falhou (${patchRes.status}) — prosseguindo mesmo assim.`);
        } catch (patchErr) { console.warn(`[webhook] Erro ao marcar pagamento: ${patchErr.message} — prosseguindo.`); }
      }

      // 1. "✅ VENDA" pro Bruno: todo pagamento aprovado que ainda não foi avisado (PIX ou cartão)
      if (!avisouDono) {
        try {
          await emailVendaAprovada({ env, payment, pedido });
          try { await anotarAviso(await db(env), payment.id, 'ok'); } catch (_) { /* o de hora em hora confere */ }
        } catch (emailErr) {
          console.error('[webhook] Falha no email ao dono:', emailErr.message);
          try { await anotarFalha(await db(env), payment.id, { valor: payment.transaction_amount, itens: payment.metadata?.items_display || '', erro: emailErr.message }); } catch (_) { /* segue */ }
        }
      }

      // 2. Confirmação pro comprador (o cartão aprovado na hora já recebeu no create-payment e está anotado)
      if (!avisouComprador) {
        try {
          await sendBuyerConfirmationEmail({ env, payment, pedido });
          try { await anotarAviso(await db(env), payment.id, 'c'); } catch (_) { /* segue */ }
        } catch (emailErr) {
          console.error('[webhook] Falha no email ao comprador:', emailErr.message);
        }
      }

      if (vendaFalhou) return new Response('db error', { status: 500 });
    }

    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('[webhook] Erro interno:', err.message);
    return new Response('internal error', { status: 500 });
  }
}
