/**
 * Cloudflare Pages Function: create-payment
 *
 * Variáveis de ambiente (Cloudflare Pages → Settings → Environment Variables):
 *   MP_ACCESS_TOKEN  — Access Token do Mercado Pago
 *   NOTIFY_EMAIL     — email do produtor para notificações
 *   NOTIFY_FROM      — email remetente (ex: rideblan33@caramujorecords.com.br)
 */

// ── Helpers ─────────────────────────────────────────────────────────────────

function isValidEmail(v) {
  return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}
function isValidCpf(v) {
  const d = String(v).replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += +d[i] * (10 - i);
  let r = (s * 10) % 11; if (r === 10 || r === 11) r = 0;
  if (r !== +d[9]) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += +d[i] * (11 - i);
  r = (s * 10) % 11; if (r === 10 || r === 11) r = 0;
  return r === +d[10];
}
function sanitize(v, maxLen = 200) {
  return String(v ?? '').trim().slice(0, maxLen).replace(/[<>"']/g, '');
}

// ── Envio de email via MailChannels (nativo no Cloudflare) ──────────────────

async function sendNotificationEmail({ env, payment, name, email, cpf, itemsList, amount, selectedPaymentMethod, termsAcceptance }) {
  const notifyEmail = env.NOTIFY_EMAIL || 'rideblan33@gmail.com';
  const fromEmail   = env.NOTIFY_FROM  || 'rideblan33@caramujorecords.com.br';

  const statusPt = { approved: '✅ APROVADO', pending: '⏳ PENDENTE (PIX)', in_process: '🔄 EM ANÁLISE', rejected: '❌ RECUSADO' };
  const statusLabel = statusPt[payment.status] || payment.status.toUpperCase();
  const dataHora = new Date(termsAcceptance.timestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const cpfFmt = cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><style>
  body{font-family:'Courier New',monospace;background:#1a1108;color:#f0e6c8;margin:0;padding:0;}
  .wrap{max-width:560px;margin:0 auto;padding:32px 24px;}
  .hd{background:#7a1a08;padding:20px 24px;}
  .hd h1{margin:0;font-size:1.1rem;letter-spacing:.12em;color:#fff;text-transform:uppercase;}
  .hd p{margin:4px 0 0;font-size:.75rem;color:#f0c060;}
  .bdy{background:#2a1e0e;padding:24px;border:1px solid #4a3010;border-top:none;}
  .status{font-size:1rem;font-weight:700;margin-bottom:16px;padding:10px 14px;background:#3a2810;border-left:3px solid #e84c18;color:#fff;}
  table{width:100%;border-collapse:collapse;margin-bottom:16px;}
  td{padding:7px 4px;font-size:.8rem;border-bottom:1px solid #3a2810;vertical-align:top;color:#f0e6c8;}
  td:first-child{color:#d4a060;width:38%;white-space:nowrap;font-weight:700;}
  .sect{color:#e84c18;font-size:.65rem;letter-spacing:.2em;text-transform:uppercase;padding:12px 0 4px;border-top:1px solid #4a3010;}
  .ft{margin-top:24px;padding-top:16px;border-top:1px solid #4a3010;font-size:.68rem;color:#a08050;text-align:center;}
</style></head><body><div class="wrap">
  <div class="hd"><h1>🐌 Caramujo Records — Nova Venda</h1><p>${dataHora}</p></div>
  <div class="bdy">
    <div class="status">${statusLabel} — R$ ${amount}</div>
    <table>
      <tr class="sect"><td colspan="2">PEDIDO</td></tr>
      <tr><td>ID Pagamento</td><td>${payment.id}</td></tr>
      <tr><td>Itens</td><td>${itemsList}</td></tr>
      <tr><td>Valor Total</td><td>R$ ${amount}</td></tr>
      <tr><td>Método</td><td>${selectedPaymentMethod === 'bank_transfer' ? 'PIX' : 'Cartão de Crédito'}</td></tr>
      <tr class="sect"><td colspan="2">CLIENTE</td></tr>
      <tr><td>Nome</td><td>${name}</td></tr>
      <tr><td>Email</td><td>${email}</td></tr>
      <tr><td>CPF</td><td>${cpfFmt}</td></tr>
      <tr class="sect"><td colspan="2">ACEITE DOS TERMOS</td></tr>
      <tr><td>Versão</td><td>${termsAcceptance.version}</td></tr>
      <tr><td>Timestamp</td><td>${termsAcceptance.timestamp}</td></tr>
    </table>
  </div>
  <div class="ft">Caramujo Records · São Carlos, SP · @rideblan33</div>
</div></body></html>`;

  const res = await fetch('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: notifyEmail }] }],
      from: { email: fromEmail, name: 'Caramujo Records' },
      subject: `🐌 Nova venda R$${amount} — ${itemsList} [${statusLabel}]`,
      content: [{ type: 'text/html', value: html }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`MailChannels error: ${res.status} — ${err}`);
  }
  console.log(`[email] Notificação enviada para ${notifyEmail}`);
}

// ── Handler principal ────────────────────────────────────────────────────────

export async function onRequestPost({ request, env }) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Parse body
  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: 'Dados inválidos.' }, { status: 400, headers: corsHeaders }); }

  const { formData, selectedPaymentMethod, amount, description, email: rawEmail, name: rawName, cpf: rawCpf, items, termsAcceptance } = body;

  const email = sanitize(rawEmail, 254);
  const name  = sanitize(rawName, 120);
  const cpf   = String(rawCpf ?? '').replace(/\D/g, '').slice(0, 11);

  if (!amount || isNaN(Number(amount)) || Number(amount) < 1)
    return Response.json({ error: 'Valor inválido.' }, { status: 400, headers: corsHeaders });
  if (!isValidEmail(email))
    return Response.json({ error: 'Email inválido.' }, { status: 400, headers: corsHeaders });
  if (!name || name.length < 3)
    return Response.json({ error: 'Nome inválido.' }, { status: 400, headers: corsHeaders });
  if (!isValidCpf(cpf))
    return Response.json({ error: 'CPF inválido.' }, { status: 400, headers: corsHeaders });
  if (!formData || typeof formData !== 'object')
    return Response.json({ error: 'Dados de pagamento incompletos.' }, { status: 400, headers: corsHeaders });
  if (!termsAcceptance?.accepted)
    return Response.json({ error: 'Aceite dos termos de licença é obrigatório.' }, { status: 400, headers: corsHeaders });

  const ACCESS_TOKEN = env.MP_ACCESS_TOKEN;
  if (!ACCESS_TOKEN)
    return Response.json({ error: 'Configuração de pagamento incompleta. Entre em contato via @rideblan33.' }, { status: 500, headers: corsHeaders });

  try {
    const idempotencyKey = `caramujo-${Date.now()}-${btoa(email).slice(0, 12)}`;
    const mpPayload = {
      transaction_amount: Number(amount),
      description: `Caramujo Records — ${sanitize(description, 200)}`,
      payment_method_id: formData.payment_method_id,
      payer: {
        email,
        first_name: name.split(' ')[0],
        last_name: name.split(' ').slice(1).join(' ') || '-',
        identification: { type: 'CPF', number: cpf },
      },
    };
    if (formData.token)        mpPayload.token = formData.token;
    if (formData.installments) mpPayload.installments = Number(formData.installments);
    if (formData.issuer_id)    mpPayload.issuer_id = formData.issuer_id;

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(mpPayload),
    });

    const payment = await mpResponse.json();
    if (!mpResponse.ok || payment.error)
      return Response.json({ error: payment.message || 'Erro ao processar pagamento.' }, { status: 400, headers: corsHeaders });
    if (payment.status === 'rejected')
      return Response.json({ error: `Pagamento recusado: ${payment.status_detail || 'tente outro método.'}` }, { status: 400, headers: corsHeaders });

    const itemsList = (Array.isArray(items) ? items : []).map(i => sanitize(i.name, 80)).join(' + ');
    const pixInfo   = payment.point_of_interaction?.transaction_data;

    // Log estruturado
    console.log(JSON.stringify({
      event: 'NOVA_VENDA',
      paymentId: payment.id,
      status: payment.status,
      method: selectedPaymentMethod,
      amount, name, email,
      cpf: cpf.slice(0, 3) + '***',
      items: itemsList,
      termsVersion: termsAcceptance.version,
      termsTimestamp: termsAcceptance.timestamp,
    }));

    // Email de notificação
    try {
      await sendNotificationEmail({ env, payment, name, email, cpf, itemsList, amount, selectedPaymentMethod, termsAcceptance });
    } catch (emailErr) {
      console.error('[email] Falha ao enviar notificação:', emailErr.message);
    }

    return Response.json({
      success: true,
      paymentId: payment.id,
      status: payment.status,
      contractPdf: null, // PDF gerado client-side ou omitido no CF Workers
      pix: pixInfo ? { qrCode: pixInfo.qr_code, qrCodeBase64: pixInfo.qr_code_base64, expiresAt: pixInfo.date_of_expiration } : null,
    }, { status: 200, headers: corsHeaders });

  } catch (err) {
    console.error('[create-payment] Erro interno:', err);
    return Response.json({ error: 'Erro interno. Tente novamente ou entre em contato via @rideblan33.' }, { status: 500, headers: corsHeaders });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
