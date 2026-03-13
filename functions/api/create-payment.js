/**
 * Cloudflare Pages Function: create-payment
 *
 * Variáveis de ambiente:
 *   MP_ACCESS_TOKEN  — Access Token do Mercado Pago
 *   NOTIFY_EMAIL     — email destinatário das notificações
 *   NOTIFY_FROM      — email remetente (ex: rideblan33@caramujorecords.com.br)
 *   RESEND_API_KEY   — API Key do Resend
 */

import { PDFDocument, rgb, StandardFonts } from 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm';

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
function fmtCpf(cpf) {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// ── Gerador de contrato PDF ──────────────────────────────────────────────────

async function generateContract({ name, cpf, email, items, amount, paymentId, termsTimestamp }) {
  const pdfDoc   = await PDFDocument.create();
  const font     = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const RED   = rgb(0.722, 0.173, 0.031);
  const BLACK = rgb(0.067, 0.063, 0.024);
  const GRAY  = rgb(0.4, 0.4, 0.4);
  const W = 595.28, H = 841.89, ML = 50, MR = W - 50, COL = MR - ML;

  function makePage(doc) {
    const pg = doc.addPage([W, H]);
    const t = (str, x, yy, { size = 9, f = font, color = BLACK, align = 'left' } = {}) => {
      const w = f.widthOfTextAtSize(str, size);
      const xx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
      pg.drawText(str, { x: xx, y: yy, size, font: f, color });
    };
    const ln = (yy, { color = rgb(0.8, 0.8, 0.8), thickness = 0.5 } = {}) =>
      pg.drawLine({ start: { x: ML, y: yy }, end: { x: MR, y: yy }, thickness, color });
    const wrap = (str, mw, sz) => {
      const ws = str.split(' '); const ls = []; let c = '';
      for (const w of ws) { const tt = c ? c + ' ' + w : w; if (font.widthOfTextAtSize(tt, sz) > mw) { ls.push(c); c = w; } else c = tt; }
      if (c) ls.push(c); return ls;
    };
    const para = (str, yy, { size = 9, indent = 0, color = BLACK } = {}) => {
      for (const l of wrap(str, COL - indent, size)) { t(l, ML + indent, yy, { size, color }); yy -= size * 1.55; }
      return yy - 4;
    };
    const h2 = (str, yy) => {
      yy -= 8; t(str, ML, yy, { size: 10, f: fontBold, color: RED }); yy -= 13;
      ln(yy, { color: RED, thickness: 0.4 }); return yy - 10;
    };
    const field = (label, value, yy) => {
      t(label + ':', ML, yy, { size: 9, f: fontBold });
      t(value || '—', ML + fontBold.widthOfTextAtSize(label + ': ', 9) + 2, yy, { size: 9 });
      return yy - 15;
    };
    return { pg, t, ln, para, h2, field };
  }

  // Página 1
  const { t, ln, para, h2, field } = makePage(pdfDoc);
  let y = H - 50;

  t('CARAMUJO RECORDS', W / 2, y, { size: 18, f: fontBold, color: RED, align: 'center' }); y -= 20;
  t('Producao Musical Independente  .  Sao Carlos, SP', W / 2, y, { size: 9, color: GRAY, align: 'center' }); y -= 13;
  t('@rideblan33  .  contato@caramujorecords.com.br', W / 2, y, { size: 9, color: GRAY, align: 'center' }); y -= 15;
  ln(y, { color: RED, thickness: 1 }); y -= 16;
  t('CONTRATO DE LICENCA EXCLUSIVA DE USO', W / 2, y, { size: 13, f: fontBold, color: BLACK, align: 'center' }); y -= 14;
  t('Instrumento Particular de Cessao de Direitos de Uso', W / 2, y, { size: 9, color: GRAY, align: 'center' }); y -= 26;

  y = h2('DADOS DA TRANSACAO', y);
  y = field('Data', new Date(termsTimestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }), y);
  y = field('Pagamento ID', String(paymentId), y);
  y = field('Itens', items, y);
  y = field('Valor Total', 'R$ ' + amount, y);
  y -= 6;

  y = h2('IDENTIFICACAO DAS PARTES', y);
  t('PRODUTOR (LICENCIANTE)', ML, y, { size: 9, f: fontBold }); y -= 13;
  y = field('Nome artistico', '@rideblan33', y);
  y = field('Nome completo', 'Bruno Lanzoni Rossi', y);
  y = field('Email', 'contato@caramujorecords.com.br', y);
  y -= 8;
  t('COMPRADOR (LICENCIADO)', ML, y, { size: 9, f: fontBold }); y -= 13;
  y = field('Nome completo', name, y);
  y = field('CPF', fmtCpf(cpf), y);
  y = field('Email', email, y);
  y -= 8;
  ln(y, { color: RED, thickness: 0.8 }); y -= 16;

  t('TERMOS E CONDICOES', W / 2, y, { size: 12, f: fontBold, color: BLACK, align: 'center' }); y -= 18;

  y = h2('1. Objeto do Contrato', y);
  y = para('O presente contrato tem por objeto a cessao, em carater exclusivo e definitivo, do direito de uso do beat/servico identificado acima, produzido por @rideblan33, para fins de gravacao, distribuicao e exploracao comercial de uma unica faixa musical pelo Licenciado.', y);
  y = h2('2. Licenca Exclusiva', y);
  y = para('A licenca concedida e EXCLUSIVA: apos a conclusao desta compra, a Obra sera removida permanentemente do catalogo da Caramujo Records e nao sera vendida, licenciada ou disponibilizada a terceiros em nenhuma hipotese.', y);
  y = h2('3. Entrega dos Arquivos', y);
  y = para('O Licenciado recebera, no email informado no pedido, os seguintes arquivos apos a confirmacao do pagamento:', y);
  for (const v of ['Arquivo MP3 em 320kbps', 'Arquivo WAV', 'Stems separados por instrumento (somente se contratado Beat + Stems)', 'Uma via deste contrato'])
    y = para('- ' + v, y, { indent: 14 });
  y = h2('4. Prazos de Entrega', y);
  for (const v of ['Beat catalogo: ate 24 horas.', 'Beat personalizado: ate 2 semanas.', 'Mixagem, Masterizacao ou Mix + Master: ate 3 semanas.'])
    y = para('- ' + v, y, { indent: 14 });
  y = h2('5. Credito Obrigatorio', y);
  y = para('Plataformas digitais: creditar @rideblan33 como artista principal. YouTube: adicionar (prod. @rideblan33) no titulo.', y);

  // Página 2
  const p2 = makePage(pdfDoc);
  y = H - 50;

  y = p2.h2('6. Royalties e Divisao de Receitas', y);
  y = p2.para('Royalties Fonograficos (master): 90% Licenciado / 10% Produtor. O Licenciado e obrigado a realizar o split share de 10% ao Produtor no cadastro da faixa em distribuidoras.', y);
  y = p2.h2('7. Vedacoes', y);
  for (const v of ['Revender, ceder ou sublicenciar a Obra a terceiros.', 'Remover ou alterar creditos do Produtor.', 'Utilizar a Obra em mais de uma faixa sem novo contrato.', 'Registrar a Obra em nome proprio no ECAD ou PRO sem o Produtor.'])
    y = p2.para('- ' + v, y, { indent: 14 });
  y = p2.h2('8. Vigencia', y);
  y = p2.para('Esta licenca e concedida por prazo indeterminado, permanecendo valida enquanto o Licenciado cumprir todas as obrigacoes previstas neste instrumento.', y);
  y = p2.h2('9. Rescisao', y);
  y = p2.para('O descumprimento de qualquer clausula confere ao Produtor o direito de rescindir a licenca mediante notificacao por escrito, sem direito a reembolso.', y);
  y = p2.h2('10. Disposicoes Gerais', y);
  y = p2.para('As partes elegem o foro da Comarca de Sao Carlos/SP para dirimir eventuais litigios.', y);

  y -= 8; p2.ln(y, { color: RED, thickness: 0.8 }); y -= 16;
  p2.t('REGISTRO DO ACEITE ELETRONICO', W / 2, y, { size: 10, f: fontBold, color: RED, align: 'center' }); y -= 16;
  y = p2.para('O Licenciado aceitou eletronicamente os presentes termos antes de efetuar o pagamento. Este aceite possui validade juridica nos termos do Art. 107 do Codigo Civil Brasileiro.', y, { color: GRAY });
  y -= 4;
  y = p2.field('Timestamp', termsTimestamp, y);
  y = p2.field('Versao dos termos', 'caramujo-termos-v1-2026', y);
  y = p2.field('Email do comprador', email, y);
  y = p2.field('CPF do comprador', fmtCpf(cpf), y);

  y -= 20; p2.ln(y); y -= 14;
  p2.t('As partes declaram ter lido, compreendido e concordado com todos os termos deste contrato.', ML, y, { size: 9, color: GRAY }); y -= 34;
  p2.ln(y, { thickness: 0.6 }); y -= 11;
  p2.t('Produtor - @rideblan33 / Bruno Lanzoni Rossi', ML, y, { size: 9, color: GRAY }); y -= 34;
  p2.ln(y, { thickness: 0.6 }); y -= 11;
  p2.t('Licenciado - ' + name, ML, y, { size: 9, color: GRAY }); y -= 22;
  p2.ln(y, { color: RED, thickness: 0.4 }); y -= 13;
  p2.t('Caramujo Records  .  Sao Carlos, SP  .  @rideblan33  .  caramujorecords.com.br', W / 2, y, { size: 8, color: GRAY, align: 'center' });

  const pdfBytes = await pdfDoc.save();
  let binary = '';
  for (let i = 0; i < pdfBytes.length; i++) binary += String.fromCharCode(pdfBytes[i]);
  return btoa(binary);
}

// ── Envio de email via Resend ────────────────────────────────────────────────

async function sendNotificationEmail({ env, payment, name, email, cpf, itemsList, amount, selectedPaymentMethod, termsAcceptance, contractBase64 }) {
  const resendKey   = env.RESEND_API_KEY;
  const notifyEmail = env.NOTIFY_EMAIL || 'rideblan33@gmail.com';
  const fromEmail   = env.NOTIFY_FROM  || 'rideblan33@caramujorecords.com.br';

  if (!resendKey) {
    console.warn('[email] RESEND_API_KEY não configurado — skip.');
    return;
  }

  const statusPt = { approved: '✅ APROVADO', pending: '⏳ PENDENTE (PIX)', in_process: '🔄 EM ANÁLISE', rejected: '❌ RECUSADO' };
  const statusLabel = statusPt[payment.status] || payment.status.toUpperCase();
  const dataHora = new Date(termsAcceptance.timestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><style>
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
      <tr><td>CPF</td><td>${fmtCpf(cpf)}</td></tr>
      <tr class="sect"><td colspan="2">ACEITE DOS TERMOS</td></tr>
      <tr><td>Versão</td><td>${termsAcceptance.version}</td></tr>
      <tr><td>Timestamp</td><td>${termsAcceptance.timestamp}</td></tr>
    </table>
    ${contractBase64
      ? '<p style="font-size:.78rem;color:#c49040;">📎 Contrato PDF anexado a este email.</p>'
      : '<p style="font-size:.78rem;color:#e84c18;">⚠️ Erro ao gerar contrato PDF.</p>'}
  </div>
  <div class="ft">Caramujo Records · São Carlos, SP · @rideblan33</div>
</div></body></html>`;

  const payload = {
    from: `Caramujo Records <${fromEmail}>`,
    to: [notifyEmail],
    subject: `🐌 Nova venda R$${amount} — ${itemsList} [${statusLabel}]`,
    html,
  };

  if (contractBase64) {
    payload.attachments = [{
      filename: `contrato-caramujo-${payment.id}.pdf`,
      content: contractBase64,
    }];
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${res.status} — ${err}`);
  }
  console.log(`[email] Notificação enviada para ${notifyEmail} via Resend${contractBase64 ? ' (com contrato PDF)' : ''}`);
}

// ── Handler principal ────────────────────────────────────────────────────────

export async function onRequestPost({ request, env }) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

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

    // Gera contrato PDF
    let contractBase64 = null;
    try {
      contractBase64 = await generateContract({
        name, cpf, email,
        items: itemsList,
        amount,
        paymentId: payment.id,
        termsTimestamp: termsAcceptance.timestamp,
      });
      console.log('[pdf] Contrato gerado com sucesso');
    } catch (pdfErr) {
      console.error('[pdf] Erro ao gerar contrato:', pdfErr.message);
    }

    // Envia email com contrato anexado
    try {
      await sendNotificationEmail({ env, payment, name, email, cpf, itemsList, amount, selectedPaymentMethod, termsAcceptance, contractBase64 });
    } catch (emailErr) {
      console.error('[email] Falha ao enviar notificação:', emailErr.message);
    }

    return Response.json({
      success: true,
      paymentId: payment.id,
      status: payment.status,
      contractPdf: contractBase64,
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
