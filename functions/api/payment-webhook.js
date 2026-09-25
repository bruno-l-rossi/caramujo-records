/**
 * Cloudflare Pages Function: payment-webhook
 * POST /api/payment-webhook
 *
 * Quando pagamento é aprovado:
 *  1. Envia email de notificação ao dono (com contrato em anexo) — só PIX
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

import { db } from '../_lib/db.js';
import { marcarVendidos, usarCupom, esquecerLoja } from '../_lib/loja.js';
import { esquecerVitrine } from '../_lib/vitrine.js';
import { contratoHtml, enviarEmailComprador } from '../_lib/emails.js';




// ── E-mail interno "COMPRA CONFIRMADA" (pro dono) ─────────────────────────────
// Dispara quando o pagamento é APROVADO.

async function sendApprovalEmail({ env, payment }) {
  const resendKey   = env.RESEND_API_KEY;
  const notifyEmail = env.NOTIFY_EMAIL || 'rideblan33@gmail.com';
  const fromEmail   = env.NOTIFY_FROM  || 'rideblan33@caramujorecords.com.br';

  if (!resendKey) {
    console.warn('[email] RESEND_API_KEY não configurado — skip.');
    return;
  }

  const payer    = payment.payer || {};
  const meta     = payment.metadata || {};
  const name     = meta.buyer_name   || [payer.first_name, payer.last_name].filter(Boolean).join(' ') || '—';
  const artistName = meta.buyer_artist || meta.buyer_name || name;
  const email    = meta.buyer_email  || payer.email || '—';
  const rawCpf   = meta.buyer_cpf    || payer.identification?.number || '—';
  const cpf      = rawCpf.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') || rawCpf;
  const amount   = payment.transaction_amount;
  const methodMap = { bank_transfer: 'PIX', credit_card: 'Cartão de Crédito', debit_card: 'Cartão de Débito' };
  const method   = methodMap[payment.payment_type_id] || payment.payment_type_id || '—';
  const couponCode = meta.coupon_code || null;
  const dataHora = new Date(payment.date_approved || payment.date_last_updated)
    .toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  // Usa items_display e category_label salvos no metadata durante create-payment
  // (fallback para description caso o pagamento seja de versão anterior)
  const rawDesc        = (payment.description || '—').replace('Caramujo Records — ', '');
  const itemsDisplay   = meta.items_display   || rawDesc;
  const categoryDisplay = meta.category_label || rawDesc;

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><style>
  body{font-family:'Courier New',monospace;background:#14110d;color:#E8E0CF;margin:0;padding:24px 0;}
  .wrap{max-width:560px;margin:0 auto;}
  .bar{background:#b98f5e;height:4px;font-size:0;line-height:0;}
  .hd{background:#1A1815;padding:24px;border:1px solid #332c22;border-bottom:none;}
  .kick{font-size:.58rem;letter-spacing:.34em;text-transform:uppercase;color:#b98f5e;margin-bottom:8px;}
  .hd h1{margin:0;font-family:Georgia,'Times New Roman',serif;font-size:1.4rem;letter-spacing:.03em;color:#f2ecdf;text-transform:uppercase;}
  .hd p{margin:6px 0 0;font-size:.7rem;color:#9e7c48;}
  .bdy{background:#221e18;padding:24px;border:1px solid #332c22;border-top:none;}
  .status{font-size:1rem;font-weight:700;margin-bottom:16px;padding:10px 14px;background:#1A1815;border-left:3px solid #b98f5e;color:#f2ecdf;}
  .action{margin:20px 0;padding:14px 16px;background:#221e18;border:1px solid #A87B4A;border-left:4px solid #A87B4A;font-size:.82rem;line-height:1.7;color:#E8E0CF;}
  .action strong{color:#c3a074;display:block;margin-bottom:4px;font-size:.72rem;letter-spacing:.15em;text-transform:uppercase;}
  table{width:100%;border-collapse:collapse;margin-bottom:16px;}
  td{padding:7px 4px;font-size:.8rem;border-bottom:1px solid #2a241c;vertical-align:top;color:#E8E0CF;}
  td:first-child{color:#c3a074;width:38%;white-space:nowrap;font-weight:700;}
  .sect{color:#b98f5e;font-size:.65rem;letter-spacing:.2em;text-transform:uppercase;padding:12px 0 4px;border-top:1px solid #332c22;}
  .ft{margin-top:24px;padding-top:16px;border-top:1px solid #332c22;font-size:.68rem;color:#9e7c48;text-align:center;}
  </style></head><body><div class="wrap">
  <div class="bar">&nbsp;</div>
  <div class="hd"><div class="kick">// Caramujo Records</div><h1>Pagamento aprovado</h1><p>${dataHora}</p></div>
  <div class="bdy">
    <div class="status">APROVADO — R$ ${amount}</div>
    <div class="action"><strong>Ação necessária</strong>
      Envie os arquivos para <strong style="color:#c3a074">${email}</strong><br/>
      Itens: <strong style="color:#c3a074">${itemsDisplay}</strong>
    </div>
    <table>
      <tr class="sect"><td colspan="2">PEDIDO</td></tr>
      <tr><td>ID Pagamento</td><td>${payment.id}</td></tr>
      <tr><td>Categoria</td><td>${categoryDisplay}</td></tr>
      <tr><td>Itens</td><td>${itemsDisplay}</td></tr>
      <tr><td>Valor Total</td><td>R$ ${amount}</td></tr>
      <tr><td>Método</td><td>${method}</td></tr>
      ${couponCode ? `<tr><td>Cupom</td><td>${couponCode}</td></tr>` : ''}
      <tr class="sect"><td colspan="2">CLIENTE</td></tr>
      <tr><td>Nome artístico</td><td>${artistName || '—'}</td></tr>
      <tr><td>Nome</td><td>${name}</td></tr>
      <tr><td>Email</td><td>${email}</td></tr>
      <tr><td>CPF</td><td>${cpf}</td></tr>
    </table>
  </div>
  <div class="ft">Caramujo Records · São Carlos, SP · @rideblan33</div>
</div></body></html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Caramujo Records <${fromEmail}>`,
      to: [notifyEmail],
      subject: `✅ PAGO R$${amount} — ${itemsDisplay} — ENVIAR ARQUIVOS`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${res.status} — ${err}`);
  }
  console.log(`[email] Notificação enviada para ${notifyEmail} via Resend`);
}

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

async function sendBuyerConfirmationEmail({ env, payment }) {
  const payer     = payment.payer || {};
  const meta      = payment.metadata || {};
  const email     = meta.buyer_email || payer.email || '';
  const name      = meta.buyer_name  || [payer.first_name, payer.last_name].filter(Boolean).join(' ') || '';
  const artistName = meta.buyer_artist || meta.buyer_name || name;
  const rawDesc   = (payment.description || '').replace('Caramujo Records — ', '');
  const itemsList = meta.items_display || rawDesc;

  // Reconstrói o contrato a partir do metadata salvo no create-payment
  // (o comprador precisa da via dele mesmo se o botão de download falhar)
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
      });
    }
  } catch (e) { console.error('[email-buyer] Erro ao gerar contrato:', e.message); }

  await enviarEmailComprador(env, { name, artistName, email, itemsList, contractHtml });
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


      // ── Idempotência: evita processar o mesmo pagamento duas vezes ──────────
      // O MP dispara o webhook múltiplas vezes para o mesmo evento de pagamento.
      // Solução: marcamos o pagamento com webhook_processed=true via PUT no MP
      // antes de executar qualquer ação. Se já estiver marcado, ignoramos.
      if (payment.metadata?.webhook_processed === 'true') {
        console.log(`[webhook] Pagamento ${payment.id} já processado anteriormente — sem emails de novo.`);
        return new Response(vendaFalhou ? 'db error' : 'ok', { status: vendaFalhou ? 500 : 200 });
      }

      // Marca como processado ANTES de executar as ações (evita race condition)
      try {
        const patchRes = await fetch(`https://api.mercadopago.com/v1/payments/${payment.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            metadata: { ...payment.metadata, webhook_processed: 'true' },
          }),
        });
        if (!patchRes.ok) {
          console.warn(`[webhook] PUT metadata falhou (${patchRes.status}) — prosseguindo mesmo assim.`);
        } else {
          console.log(`[webhook] Pagamento ${payment.id} marcado como processado.`);
        }
      } catch (patchErr) {
        console.warn(`[webhook] Erro ao marcar pagamento: ${patchErr.message} — prosseguindo.`);
      }
      // ── fim idempotência ────────────────────────────────────────────────────

      // Emails só são enviados aqui para PIX — cartão já recebe os emails no create-payment
      const isPix = payment.payment_type_id === 'bank_transfer';
      console.log(`[webhook] isPix: ${isPix}`);

      // 1. Email de notificação ao dono (somente PIX — cartão já enviou no create-payment)
      if (isPix) {
        try {
          await sendApprovalEmail({ env, payment });
        } catch (emailErr) {
          console.error('[webhook] Falha no email ao dono:', emailErr.message);
        }
      }

      // 2. Email de confirmação ao comprador (somente PIX — cartão já enviou no create-payment)
      if (isPix) {
        try {
          await sendBuyerConfirmationEmail({ env, payment });
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
