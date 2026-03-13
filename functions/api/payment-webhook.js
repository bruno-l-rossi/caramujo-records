/**
 * Cloudflare Pages Function: payment-webhook
 * POST /api/payment-webhook
 *
 * Recebe notificações do Mercado Pago quando pagamento é aprovado.
 * Configura em: MP Developers → Sua aplicação → Webhooks
 * URL: https://caramujorecords.com.br/api/payment-webhook
 */

async function sendApprovalEmail({ notifyEmail, gmailUser, gmailPass, payment }) {
  if (!gmailUser || !gmailPass) return;

  const payer    = payment.payer || {};
  const name     = [payer.first_name, payer.last_name].filter(Boolean).join(' ') || '—';
  const email    = payer.email || '—';
  const cpf      = (payer.identification?.number || '—').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  const amount   = payment.transaction_amount;
  const methodMap = { bank_transfer: 'PIX', credit_card: 'Cartão de Crédito', debit_card: 'Cartão de Débito' };
  const method   = methodMap[payment.payment_type_id] || payment.payment_type_id || '—';
  const desc     = payment.description || '—';
  const dataHora = new Date(payment.date_approved || payment.date_last_updated)
    .toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><style>
  body{font-family:'Courier New',monospace;background:#1a1108;color:#f0e6c8;margin:0;padding:0;}
  .wrap{max-width:560px;margin:0 auto;padding:32px 24px;}
  .hd{background:#1a5c1a;padding:20px 24px;}
  .hd h1{margin:0;font-size:1.1rem;letter-spacing:.12em;color:#fff;text-transform:uppercase;}
  .hd p{margin:4px 0 0;font-size:.75rem;color:#80e080;}
  .bdy{background:#2a1e0e;padding:24px;border:1px solid #4a3010;border-top:none;}
  .status{font-size:1rem;font-weight:700;margin-bottom:16px;padding:10px 14px;background:#1a3a1a;border-left:3px solid #40c040;color:#80ff80;}
  .action{margin:20px 0;padding:14px 16px;background:#3a2000;border:1px solid #e84c18;border-left:4px solid #e84c18;font-size:.82rem;line-height:1.7;color:#f0e6c8;}
  .action strong{color:#f0c060;display:block;margin-bottom:4px;font-size:.72rem;letter-spacing:.15em;text-transform:uppercase;}
  table{width:100%;border-collapse:collapse;margin-bottom:16px;}
  td{padding:7px 4px;font-size:.8rem;border-bottom:1px solid #3a2810;vertical-align:top;color:#f0e6c8;}
  td:first-child{color:#d4a060;width:38%;white-space:nowrap;font-weight:700;}
  .sect{color:#40c040;font-size:.65rem;letter-spacing:.2em;text-transform:uppercase;padding:12px 0 4px;border-top:1px solid #4a3010;}
  .ft{margin-top:24px;padding-top:16px;border-top:1px solid #4a3010;font-size:.68rem;color:#a08050;text-align:center;}
  </style></head><body><div class="wrap">
  <div class="hd"><h1>✅ Caramujo Records — Pagamento Confirmado</h1><p>${dataHora}</p></div>
  <div class="bdy">
    <div class="status">✅ APROVADO — R$ ${amount}</div>
    <div class="action"><strong>⚡ Ação necessária</strong>
      Envie os arquivos para <strong style="color:#f0c060">${email}</strong><br/>
      Itens: <strong style="color:#f0c060">${desc.replace('Caramujo Records — ', '')}</strong>
    </div>
    <table>
      <tr class="sect"><td colspan="2">PEDIDO</td></tr>
      <tr><td>ID Pagamento</td><td>${payment.id}</td></tr>
      <tr><td>Itens</td><td>${desc.replace('Caramujo Records — ', '')}</td></tr>
      <tr><td>Valor Total</td><td>R$ ${amount}</td></tr>
      <tr><td>Método</td><td>${method}</td></tr>
      <tr class="sect"><td colspan="2">CLIENTE</td></tr>
      <tr><td>Nome</td><td>${name}</td></tr>
      <tr><td>Email</td><td>${email}</td></tr>
      <tr><td>CPF</td><td>${cpf}</td></tr>
    </table>
  </div>
  <div class="ft">Caramujo Records · São Carlos, SP · @rideblan33</div>
</div></body></html>`;

  // Cloudflare Workers não tem Node.js — usa fetch para SMTP via MailChannels (gratuito no CF)
  // ou via Gmail API. Aqui usamos MailChannels que é nativo no Cloudflare Pages.
  const mailRes = await fetch('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: notifyEmail }] }],
      from: { email: gmailUser, name: 'Caramujo Records' },
      subject: `✅ PAGO R$${amount} — ${desc.replace('Caramujo Records — ', '')} — ENVIAR ARQUIVOS`,
      content: [{ type: 'text/html', value: html }],
    }),
  });

  if (!mailRes.ok) {
    const err = await mailRes.text();
    throw new Error(`MailChannels error: ${mailRes.status} — ${err}`);
  }

  console.log(`[webhook] Email de aprovação enviado para ${notifyEmail}`);
}

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
    console.log(`[webhook] Pagamento ${payment.id} status: ${payment.status}`);

    if (payment.status === 'approved') {
      const notifyEmail = env.NOTIFY_EMAIL || 'rideblan33@gmail.com';
      const gmailUser   = env.NOTIFY_EMAIL || 'rideblan33@gmail.com';
      const gmailPass   = env.GMAIL_APP_PASS;
      await sendApprovalEmail({ notifyEmail, gmailUser, gmailPass, payment });
    }

    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('[webhook] Erro interno:', err.message);
    return new Response('internal error', { status: 500 });
  }
}
