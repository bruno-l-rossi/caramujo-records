/**
 * Cloudflare Pages Function: create-payment
 * Variáveis de ambiente: MP_ACCESS_TOKEN, NOTIFY_EMAIL, NOTIFY_FROM, RESEND_API_KEY
 *
 * Desde 24/09/2026 cupom e "vendido" moram no D1 (_lib/loja.js). Antes de cobrar:
 *  - o cupom é conferido no banco (esgotado ou pausado = recusa);
 *  - beat que já foi vendido é recusado com aviso (janela de até 1 minuto em que
 *    a lista de quem está com a página aberta ainda não atualizou).
 * Falha técnica do banco NÃO bloqueia a venda sem cupom.
 * Desde 25/09/2026 o VALOR também é conferido aqui: a conta do carrinho é refeita
 * com a tabela de preço da própria página (PRICE_BEAT, PRICE_STEMS, addPkg, addSvc)
 * e o cupom do banco. Se o valor do navegador não bater, recusa; a cobrança usa
 * sempre o valor do servidor. Antes, quem mexesse na página pagava o que quisesse.
 */

import { db } from '../_lib/db.js';
import { lerCupom, situacaoCupom, vendidosEntre, lerEstatico } from '../_lib/loja.js';
import { fmtCpf, contratoHtml, enviarEmailComprador } from '../_lib/emails.js';

async function conferirCupom(request, env, couponCode) {
  if (!couponCode) return { valid: false, reason: 'sem cupom' };
  try {
    const d = await db(env);
    const cupom = await lerCupom(d, couponCode);
    const situacao = situacaoCupom(cupom);
    if (situacao === 'not_found') return { valid: false, reason: 'not found' };
    if (situacao === 'expired') return { valid: false, reason: 'expired' };
    return { valid: true, cupom };
  } catch (e) {
    // sem banco não dá pra saber o desconto: o pagamento com cupom espera o banco voltar
    console.warn('[coupon-check] Falha ao validar cupom no banco:', e.message);
    return { valid: false, reason: 'falhou' };
  }
}

// A conta do carrinho refeita no servidor, com os preços que a página mostra.
// Mesma regra do front: cupom % arredonda o desconto; cupom de preço fixo trava o total.
// Devolve { total } ou { erro } (item que a página não vende, pacote torto).
export function contaDoCarrinho(itens, precos, cupom) {
  let subtotal = 0;
  for (const it of Array.isArray(itens) ? itens : []) {
    const nome = String(it && it.name || '').trim();
    const mQtd = nome.match(/ x(\d+)$/);
    const qtd = mQtd ? Number(mQtd[1]) : 1;
    const base = nome.replace(/ x\d+$/, '');
    if (it.type === 'Beat') {
      const preco = / \+ Stems$/.test(base) ? precos.stems : precos.beat;
      if (!preco) return { erro: 'preço do beat não encontrado' };
      subtotal += preco;
    } else if (it.type === 'Pacote') {
      const preco = precos.pacotes[base];
      if (!preco) return { erro: 'pacote desconhecido: ' + base };
      const grupos = Array.isArray(it.pkgBeats) ? it.pkgBeats : [];
      const precisa = Number((base.match(/^(\d+)/) || [])[1]) || 0;
      if (!grupos.length || grupos.length !== qtd || grupos.some((g) => !Array.isArray(g) || g.length !== precisa)) {
        return { erro: 'pacote com beats faltando: ' + base };
      }
      subtotal += preco * grupos.length;
    } else if (it.type === 'Servico') {
      const preco = precos.servicos[base];
      if (!preco) return { erro: 'serviço desconhecido: ' + base };
      subtotal += preco * qtd;
    } else {
      return { erro: 'item desconhecido: ' + nome };
    }
  }
  if (!subtotal) return { erro: 'carrinho vazio' };
  let desconto = 0;
  if (cupom) {
    if (cupom.preco_fixo !== null && cupom.preco_fixo !== undefined) desconto = Math.max(0, subtotal - Number(cupom.preco_fixo));
    else desconto = Math.round(subtotal * Number(cupom.pct || 0) / 100);
  }
  return { total: Math.round((subtotal - desconto) * 100) / 100, subtotal, desconto };
}

async function jaVendidos(request, env, nomes) {
  if (!nomes.length) return [];
  try {
    const d = await db(env);
    return await vendidosEntre(d, nomes);
  } catch (e) {
    console.warn('[sold-check] Falha ao conferir vendidos no banco:', e.message);
    return []; // falha técnica não bloqueia o pagamento
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// Contrato e e-mail do comprador moram em _lib/emails.js (o webhook usa os mesmos).

// ── E-mail interno "COMPRA RECEBIDA" (pro dono) ───────────────────────────────
// Dispara quando a compra é criada (pode ainda NÃO estar paga, ex.: PIX pendente).

async function sendNotificationEmail({ env, payment, name, artistName, email, cpf, itemsList, categoryLabel, couponCode, amount, selectedPaymentMethod, termsAcceptance, contractHtml }) {
  const resendKey   = env.RESEND_API_KEY;
  const notifyEmail = env.NOTIFY_EMAIL || 'rideblan33@gmail.com';
  const fromEmail   = env.NOTIFY_FROM  || 'rideblan33@caramujorecords.com.br';

  if (!resendKey) { console.warn('[email] RESEND_API_KEY não configurado — skip.'); return; }

  const statusPt = { approved: '✅ APROVADO', pending: '⏳ PENDENTE (PIX)', in_process: '🔄 EM ANÁLISE', rejected: '❌ RECUSADO' };
  const statusLabel = statusPt[payment.status] || payment.status.toUpperCase();
  const dataHora = new Date(termsAcceptance.timestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const notifHtml = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><style>
  body{font-family:'Courier New',monospace;background:#14110d;color:#E8E0CF;margin:0;padding:24px 0;}
  .wrap{max-width:560px;margin:0 auto;}
  .bar{background:#b98f5e;height:4px;font-size:0;line-height:0;}
  .hd{background:#1A1815;padding:24px;border:1px solid #332c22;border-bottom:none;}
  .kick{font-size:.58rem;letter-spacing:.34em;text-transform:uppercase;color:#b98f5e;margin-bottom:8px;}
  .hd h1{margin:0;font-family:Georgia,'Times New Roman',serif;font-size:1.4rem;letter-spacing:.03em;color:#f2ecdf;text-transform:uppercase;}
  .hd p{margin:6px 0 0;font-size:.7rem;color:#9e7c48;}
  .bdy{background:#221e18;padding:24px;border:1px solid #332c22;border-top:none;}
  .status{font-size:1rem;font-weight:700;margin-bottom:16px;padding:10px 14px;background:#1A1815;border-left:3px solid #b98f5e;color:#f2ecdf;}
  table{width:100%;border-collapse:collapse;margin-bottom:16px;}
  td{padding:7px 4px;font-size:.8rem;border-bottom:1px solid #2a241c;vertical-align:top;color:#E8E0CF;}
  td:first-child{color:#c3a074;width:38%;white-space:nowrap;font-weight:700;}
  .sect{color:#b98f5e;font-size:.65rem;letter-spacing:.2em;text-transform:uppercase;padding:12px 0 4px;border-top:1px solid #332c22;}
  .ft{margin-top:24px;padding-top:16px;border-top:1px solid #332c22;font-size:.68rem;color:#9e7c48;text-align:center;}
  </style></head><body><div class="wrap">
  <div class="bar">&nbsp;</div>
  <div class="hd"><div class="kick">// Caramujo Records</div><h1>Nova venda</h1><p>${dataHora}</p></div>
  <div class="bdy">
    <div class="status">${statusLabel} — R$ ${amount}</div>
    <table>
      <tr class="sect"><td colspan="2">PEDIDO</td></tr>
      <tr><td>ID</td><td>${payment.id}</td></tr>
      <tr><td>Categoria</td><td>${categoryLabel || '—'}</td></tr>
      <tr><td>Itens</td><td>${itemsList}</td></tr>
      <tr><td>Valor</td><td>R$ ${amount}</td></tr>
      <tr><td>Método</td><td>${selectedPaymentMethod === 'bank_transfer' ? 'PIX' : 'Cartão'}</td></tr>
      ${couponCode ? `<tr><td>Cupom</td><td>${couponCode}</td></tr>` : ''}
      <tr class="sect"><td colspan="2">CLIENTE</td></tr>
      <tr><td>Nome artístico</td><td>${artistName || '—'}</td></tr>
      <tr><td>Nome</td><td>${name}</td></tr>
      <tr><td>Email</td><td>${email}</td></tr>
      <tr><td>CPF</td><td>${fmtCpf(cpf)}</td></tr>
      <tr class="sect"><td colspan="2">ACEITE</td></tr>
      <tr><td>Versão</td><td>${termsAcceptance.version}</td></tr>
      <tr><td>Timestamp</td><td>${termsAcceptance.timestamp}</td></tr>
    </table>
    ${contractHtml ? '<p style="font-size:.76rem;color:#c3a074;">Contrato assinado em anexo.</p>' : ''}
  </div>
  <div class="ft">Caramujo Records · São Carlos, SP · @rideblan33</div>
</div></body></html>`;

  // Email único — resumo da venda + contrato como anexo
  const isPending = payment.status === 'pending';
  const emailPayload = {
    from: `Caramujo Records <${fromEmail}>`,
    to: [notifyEmail],
    subject: isPending
      ? `🐌 Novo pedido R$${amount} — ${itemsList} [${statusLabel}]`
      : `🐌 PAGO R$${amount} — ${itemsList} — ENVIAR ARQUIVOS`,
    html: notifHtml,
  };

  // Anexa o contrato como .html se disponível
  if (contractHtml) {
    const safeName = name.replace(/[^a-zA-Z0-9\u00C0-\u00FF\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60);
    const fileName = `contrato-${safeName}-ID${payment.id}.html`;
    emailPayload.attachments = [
      {
        filename: fileName,
        content: btoa(unescape(encodeURIComponent(contractHtml))),
      },
    ];
  }

  const r1 = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(emailPayload),
  });
  if (!r1.ok) throw new Error(`Resend error (notif): ${r1.status} — ${await r1.text()}`);
  console.log(`[email] Notificação enviada para ${notifyEmail} via Resend${contractHtml ? ' (com contrato em anexo)' : ''}`);
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function onRequestPost({ request, env }) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: 'Dados inválidos.' }, { status: 400, headers: cors }); }

  const { formData, selectedPaymentMethod, amount: amountCliente, description, email: rawEmail, name: rawName, artistName: rawArtist, cpf: rawCpf, items, termsAcceptance, couponCode: rawCoupon } = body;
  const email      = sanitize(rawEmail, 254);
  const name       = sanitize(rawName, 120);
  const artistName = sanitize(rawArtist || '', 80);
  const cpf        = String(rawCpf ?? '').replace(/\D/g, '').slice(0, 11);
  const couponCode = rawCoupon ? sanitize(rawCoupon, 30).toUpperCase() : null;

  if (!amountCliente || isNaN(Number(amountCliente)) || Number(amountCliente) < 1)
    return Response.json({ error: 'Valor inválido.' }, { status: 400, headers: cors });
  if (!isValidEmail(email))
    return Response.json({ error: 'Email inválido.' }, { status: 400, headers: cors });

  // Valida cupom no servidor (lê os usos atuais do banco para evitar reuso após esgotar)
  let cupom = null;
  if (couponCode) {
    const couponCheck = await conferirCupom(request, env, couponCode);
    if (couponCheck.reason === 'falhou') {
      return Response.json({ error: 'Não consegui conferir o cupom agora. Tenta de novo em instantes ou compra sem o cupom.' }, { status: 400, headers: cors });
    }
    cupom = couponCheck.cupom || null;
    if (!couponCheck.valid && couponCheck.reason === 'expired') {
      return Response.json({ error: 'Cupom expirado ou já utilizado o número máximo de vezes.' }, { status: 400, headers: cors });
    }
    if (!couponCheck.valid && couponCheck.reason === 'not found') {
      return Response.json({ error: 'Cupom inválido.' }, { status: 400, headers: cors });
    }
  }
  if (!name || name.length < 3)
    return Response.json({ error: 'Nome inválido.' }, { status: 400, headers: cors });
  if (!isValidCpf(cpf))
    return Response.json({ error: 'CPF inválido.' }, { status: 400, headers: cors });
  if (!formData || typeof formData !== 'object')
    return Response.json({ error: 'Dados de pagamento incompletos.' }, { status: 400, headers: cors });
  if (!termsAcceptance?.accepted)
    return Response.json({ error: 'Aceite dos termos de licença é obrigatório.' }, { status: 400, headers: cors });

  // O valor cobrado é o do servidor. O do navegador só serve pra conferir.
  let conta;
  try {
    conta = contaDoCarrinho(items, (await lerEstatico(request, env)).precos, cupom);
  } catch (e) {
    console.error('[preco] Falha ao montar a conta:', e.message);
    conta = { erro: 'tabela de preço indisponível' };
  }
  if (conta.erro) {
    console.warn('[preco] Recusado:', conta.erro);
    return Response.json({ error: 'Não consegui conferir o valor do carrinho. Recarrega a página e tenta de novo.' }, { status: 400, headers: cors });
  }
  if (Math.abs(conta.total - Number(amountCliente)) > 0.009) {
    console.warn(`[preco] Valor do navegador (${amountCliente}) diferente do servidor (${conta.total}).`);
    return Response.json({ error: 'O valor do carrinho mudou. Recarrega a página e tenta de novo.' }, { status: 400, headers: cors });
  }
  if (conta.total < 1) {
    return Response.json({ error: 'O valor mínimo pra pagar é R$1.' }, { status: 400, headers: cors });
  }
  const amount = conta.total;

  const ACCESS_TOKEN = env.MP_ACCESS_TOKEN;
  if (!ACCESS_TOKEN)
    return Response.json({ error: 'Configuração de pagamento incompleta. Entre em contato via @rideblan33.' }, { status: 500, headers: cors });

  try {
    const idempotencyKey = `caramujo-${Date.now()}-${btoa(email).slice(0, 12)}`;

    // Constrói lista de itens e categorias ANTES do payload (usados no metadata do MP)
    const itemsList = (Array.isArray(items) ? items : []).map(i => sanitize(i.name, 80)).join(' + ');
    const itemsDetailed = (Array.isArray(items) ? items : []).map(i => {
      if (i.type === 'Pacote' && i.pkgBeats && i.pkgBeats.length > 0) {
        const beatNames = i.pkgBeats.flat().map(b => sanitize(b.name, 80));
        return { category: 'Pacotes promocionais', names: beatNames, label: i.name };
      }
      if (i.type === 'Beat') return { category: 'Catálogo de beats', names: [sanitize(i.name, 80)], label: i.name };
      return { category: 'Serviços por encomenda', names: [sanitize(i.name, 80)], label: i.name };
    });
    const categoryLabel = [...new Set(itemsDetailed.map(i => i.category))].join(', ');
    const itemsForEmail = itemsDetailed.flatMap(i => i.names).join(', ') || itemsList;
    const pkgBeatsList  = (Array.isArray(items) ? items : [])
      .filter(i => i.pkgBeats && Array.isArray(i.pkgBeats))
      .flatMap(i => i.pkgBeats.flat().map(b => b.name));

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
    // Beats avulsos do catálogo (type=Beat)
    const catalogBeatsList = (Array.isArray(items) ? items : [])
      .filter(i => i.type === 'Beat')
      .map(i => sanitize(i.name, 80).replace(' + Stems', '').trim());

    if (couponCode) mpPayload.metadata = { coupon_code: couponCode };
    mpPayload.metadata = {
      ...(mpPayload.metadata || {}),
      buyer_email:    email,
      buyer_name:     name,
      buyer_artist:   artistName || name,
      buyer_cpf:      cpf,
      items_display:  itemsForEmail,
      category_label: categoryLabel,
      terms_ts:       termsAcceptance.timestamp, // permite ao webhook gerar o contrato do comprador (PIX)
      ...(couponCode ? { coupon_code: couponCode } : {}),
      ...(pkgBeatsList.length > 0    ? { pkg_beats:     pkgBeatsList.join('||')     } : {}),
      ...(catalogBeatsList.length > 0 ? { catalog_beats: catalogBeatsList.join('||') } : {}),
    };

    // Beat que alguém acabou de comprar (ou que saiu do site) não pode ser vendido.
    const vendidos = await jaVendidos(request, env, [...catalogBeatsList, ...pkgBeatsList]);
    if (vendidos.length) {
      const erro = vendidos.length === 1
        ? `O beat ${vendidos[0]} acabou de sair do catálogo. Tira ele do carrinho e tenta de novo.`
        : `Os beats ${vendidos.slice(0, -1).join(', ')} e ${vendidos[vendidos.length - 1]} acabaram de sair do catálogo. Tira eles do carrinho e tenta de novo.`;
      return Response.json({ error: erro, vendidos }, { status: 400, headers: cors });
    }

    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(mpPayload),
    });

    const payment = await mpRes.json();
    if (!mpRes.ok || payment.error)
      return Response.json({ error: payment.message || 'Erro ao processar pagamento.' }, { status: 400, headers: cors });
    if (payment.status === 'rejected')
      return Response.json({ error: `Pagamento recusado: ${payment.status_detail || 'tente outro método.'}` }, { status: 400, headers: cors });

    const pixInfo   = payment.point_of_interaction?.transaction_data;

    console.log(JSON.stringify({ event: 'NOVA_VENDA', paymentId: payment.id, status: payment.status, amount, name, email, cpf: cpf.slice(0,3)+'***', items: itemsList, coupon: couponCode || null }));

    // Gera contrato HTML
    let contractHtml = null;
    try {
      contractHtml = contratoHtml({ name, cpf, email, items: itemsForEmail, category: categoryLabel, amount, paymentId: payment.id, termsTimestamp: termsAcceptance.timestamp, artistName });
    } catch (e) { console.error('[contrato] Erro:', e.message); }

    // Envia email de notificação ao dono (com contrato em anexo)
    try {
      await sendNotificationEmail({ env, payment, name, artistName, email, cpf, itemsList: itemsForEmail, categoryLabel, couponCode, amount, selectedPaymentMethod, termsAcceptance, contractHtml });
    } catch (e) { console.error('[email] Erro notificação:', e.message); }

    // Envia email de confirmação de pedido ao comprador (apenas quando aprovado)
    if (payment.status === 'approved') {
      try {
        await enviarEmailComprador(env, { name, artistName, email, itemsList: itemsForEmail, contractHtml });
      } catch (e) { console.error('[email] Erro confirmação comprador:', e.message); }
    }

    return Response.json({
      success: true,
      paymentId: payment.id,
      status: payment.status,
      contractPdf: contractHtml ? btoa(unescape(encodeURIComponent(contractHtml))) : null,
      pix: pixInfo ? { qrCode: pixInfo.qr_code, qrCodeBase64: pixInfo.qr_code_base64, expiresAt: pixInfo.date_of_expiration } : null,
    }, { status: 200, headers: cors });

  } catch (err) {
    console.error('[create-payment] Erro interno:', err);
    return Response.json({ error: 'Erro interno. Tente novamente ou entre em contato via @rideblan33.' }, { status: 500, headers: cors });
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
