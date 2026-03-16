/**
 * Cloudflare Pages Function: payment-webhook
 * POST /api/payment-webhook
 *
 * Quando pagamento é aprovado:
 *  1. Envia email de notificação ao dono (com contrato em anexo)
 *  2. Atualiza index.html no GitHub em UM único commit:
 *     — Marca beat como sold:true  (se for beat de catálogo)
 *     — Incrementa uses do cupom   (se houver cupom)
 *     → dispara redeploy automático no Cloudflare Pages
 *
 * Variáveis de ambiente necessárias:
 *   MP_ACCESS_TOKEN  — Access Token do Mercado Pago
 *   NOTIFY_EMAIL     — email destinatário das notificações (dono)
 *   NOTIFY_FROM      — email remetente (ex: rideblan33@caramujorecords.com.br)
 *   RESEND_API_KEY   — API Key do Resend (re_...)
 *   GITHUB_TOKEN     — Personal Access Token do GitHub (scope: Contents Read & Write)
 */

const GITHUB_OWNER  = 'bruno-l-rossi';
const GITHUB_REPO   = 'caramujo-records';
const GITHUB_FILE   = 'index.html';
const GITHUB_BRANCH = 'main';

// ── Email de notificação ao dono ─────────────────────────────────────────────

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
      Itens: <strong style="color:#f0c060">${itemsDisplay}</strong>
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

// ── Atualiza index.html no GitHub (beat + cupom em UM único commit) ──────────

async function updateIndex({ githubToken, beatNames = [], couponCode }) {
  if (!githubToken) {
    console.error('[github] ❌ GITHUB_TOKEN não está configurado nas variáveis de ambiente do Cloudflare. Acesse Pages → Settings → Environment variables e adicione GITHUB_TOKEN.');
    return;
  }

  const needsBeat   = beatNames.length > 0;
  const needsCoupon = !!couponCode;
  if (!needsBeat && !needsCoupon) return;

  const apiBase = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE}`;
  const headers = {
    Authorization: `Bearer ${githubToken}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'caramujo-records-webhook/1.0',
  };

  // 1. UMA única busca do arquivo para ambas as operações
  console.log('[github] Buscando arquivo no GitHub…');
  const getRes = await fetch(`${apiBase}?ref=${GITHUB_BRANCH}`, { headers });

  if (!getRes.ok) {
    const errBody = await getRes.text();
    if (getRes.status === 401) throw new Error(`GitHub GET 401 — Token inválido ou expirado. Detalhe: ${errBody}`);
    if (getRes.status === 403) throw new Error(`GitHub GET 403 — Token sem permissão. Detalhe: ${errBody}`);
    if (getRes.status === 404) throw new Error(`GitHub GET 404 — Repositório ou arquivo não encontrado. Detalhe: ${errBody}`);
    throw new Error(`GitHub GET error: ${getRes.status} — ${errBody}`);
  }

  const fileData = await getRes.json();
  console.log(`[github] Arquivo obtido. SHA: ${fileData.sha}`);

  let content = decodeURIComponent(escape(atob(fileData.content.replace(/\n/g, ''))));
  const commitParts = [];

  // 2a. Aplica mudança dos beats (se necessário) — itera sobre todos os nomes
  if (needsBeat) {
    for (const beatName of beatNames) {
      const beatNameEscaped = beatName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const beatRegex = new RegExp(
        `(\\{id:\\d+,\\s*name:'${beatNameEscaped}'[^}]*?)sold:false`,
        'i'
      );

      if (!beatRegex.test(content)) {
        const existsRegex = new RegExp(`name:'${beatNameEscaped}'`, 'i');
        if (existsRegex.test(content)) {
          console.warn(`[github] ⚠️ Beat "${beatName}" já está como sold:true — sem alteração.`);
        } else {
          console.error(`[github] ❌ Beat "${beatName}" não encontrado no arquivo. Nome recebido: "${beatName}"`);
        }
      } else {
        content = content.replace(beatRegex, '$1sold:true');
        commitParts.push(`beat "${beatName}" vendido`);
        console.log(`[github] Beat "${beatName}": sold:false → sold:true`);
      }
    }
  }

  // 2b. Aplica incremento do cupom (se necessário) — sobre o content já modificado
  if (needsCoupon) {
    const couponEscaped = couponCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Regex específico: captura apenas "uses:" (não "maxUses:")
    const couponRegex = new RegExp(
      `('${couponEscaped}'\\s*:\\s*\\{[^}]*?(?<!max)Uses\\s*:\\s*)(\\d+)`,
      'i'
    );
    // Fallback sem lookbehind para engines que não suportam
    const couponRegexFallback = new RegExp(
      `('${couponEscaped}'\\s*:\\s*\\{[^}]*?,\\s*uses\\s*:\\s*)(\\d+)`,
      'i'
    );

    const match = content.match(couponRegex) || content.match(couponRegexFallback);
    if (!match) {
      console.error(`[github-coupon] ❌ Cupom "${couponCode}" não encontrado no código. Verifique se o nome bate exatamente com a chave no objeto COUPONS.`);
    } else {
      const currentUses = parseInt(match[2], 10);
      const newUses = currentUses + 1;
      const usedRegex = match[0].includes('maxUses') ? couponRegexFallback : couponRegex;
      content = content.replace(usedRegex, `$1${newUses}`);
      commitParts.push(`cupom "${couponCode}" uses: ${currentUses}→${newUses}`);
      console.log(`[github-coupon] Cupom "${couponCode}": uses ${currentUses} → ${newUses}`);
    }
  }

  // 3. Se não houve nenhuma alteração real, não commita
  if (commitParts.length === 0) {
    console.log('[github] Nenhuma alteração necessária — commit ignorado.');
    return;
  }

  // 4. UM único commit com todas as alterações → um único redeploy
  const commitMsg = `chore: ${commitParts.join(' + ')} [automated]`;
  console.log(`[github] Enviando commit: "${commitMsg}"…`);

  const encoded = btoa(unescape(encodeURIComponent(content)));
  const putRes = await fetch(apiBase, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: commitMsg,
      content: encoded,
      sha: fileData.sha,
      branch: GITHUB_BRANCH,
    }),
  });

  if (!putRes.ok) {
    const err = await putRes.text();
    if (putRes.status === 401) throw new Error(`GitHub PUT 401 — Token inválido. Detalhe: ${err}`);
    if (putRes.status === 403) throw new Error(`GitHub PUT 403 — Token sem permissão de escrita. Detalhe: ${err}`);
    if (putRes.status === 409) throw new Error(`GitHub PUT 409 — Conflito de SHA (commit concorrente improvável aqui). Detalhe: ${err}`);
    if (putRes.status === 422) throw new Error(`GitHub PUT 422 — SHA desatualizado ou conteúdo inválido. Detalhe: ${err}`);
    throw new Error(`GitHub PUT error: ${putRes.status} — ${err}`);
  }

  const putData = await putRes.json();
  console.log(`[github] ✅ Commit realizado: ${putData.commit?.sha} — Redeploy iniciado no Cloudflare Pages.`);
}

// ── Email de confirmação de pedido ao comprador ──────────────────────────────

async function sendBuyerConfirmationEmail({ env, payment }) {
  const resendKey = env.RESEND_API_KEY;
  const fromEmail = env.NOTIFY_FROM || 'rideblan33@caramujorecords.com.br';

  if (!resendKey) { console.warn('[email-buyer] RESEND_API_KEY não configurado — skip.'); return; }

  const payer     = payment.payer || {};
  const meta      = payment.metadata || {};
  const email     = meta.buyer_email || payer.email || '';
  const name      = meta.buyer_name  || [payer.first_name, payer.last_name].filter(Boolean).join(' ') || '';
  const artistName = meta.buyer_artist || meta.buyer_name || name;
  const greeting  = (artistName || '').trim() || name.split(' ')[0] || 'músico';

  // Usa items_display salvo no metadata — mesma lógica do email de novo pedido
  const rawDesc   = (payment.description || '').replace('Caramujo Records — ', '');
  const itemsList = meta.items_display || rawDesc;

  console.log(`[email-buyer] Destinatário: "${email}" | Nome artístico: "${greeting}" | Itens: "${itemsList}"`);

  if (!email) { console.warn('[email-buyer] Email do comprador ausente no objeto payment.payer — skip.'); return; }

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Caramujo Records — Pedido Recebido</title>
</head>
<body style="margin:0;padding:0;background:#0a0905;font-family:'Courier New',Courier,monospace;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0905;min-height:100vh;">
  <tr><td align="center" style="padding:40px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
      style="max-width:560px;background:#111009;border:1px solid #2a2415;">
      <tr><td style="background:#b82c08;padding:4px 0;font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr>
        <td style="padding:40px 40px 28px;border-bottom:1px solid #2a2415;">
          <div style="font-family:'Courier New',Courier,monospace;font-size:9px;
            letter-spacing:0.4em;text-transform:uppercase;color:#b82c08;margin-bottom:10px;">
            // CARAMUJO RECORDS
          </div>
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:28px;
            font-weight:bold;color:#f5f0e8;letter-spacing:0.05em;
            text-transform:uppercase;line-height:1.1;">
            PEDIDO<br/><span style="color:#b82c08;">CONFIRMADO.</span>
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:36px 40px 28px;">
          <div style="font-family:'Courier New',Courier,monospace;font-size:8px;
            letter-spacing:0.3em;color:#8a7a54;text-transform:uppercase;margin-bottom:28px;">
            -------- OBRIGADO PELA CONFIANÇA --------
          </div>
          <p style="font-family:Georgia,'Times New Roman',serif;font-size:15px;
            color:#c8bfa0;line-height:1.85;margin:0 0 16px;">
            Olá, ${greeting}.
          </p>
          <p style="font-family:Georgia,'Times New Roman',serif;font-size:15px;
            color:#c8bfa0;line-height:1.85;margin:0 0 28px;">
            Recebemos seu pedido de <strong style="color:#f5f0e8;">${itemsList}</strong> e ele já está
            em preparação. Em breve você receberá seus arquivos neste email.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0"
            style="background:#0f0d07;border-left:2px solid #b82c08;margin-bottom:28px;">
            <tr><td style="padding:16px 20px;">
              <div style="font-family:'Courier New',Courier,monospace;font-size:8px;
                letter-spacing:0.3em;color:#b82c08;text-transform:uppercase;margin-bottom:10px;">
                // PRÓXIMOS PASSOS
              </div>
              <p style="font-family:Georgia,'Times New Roman',serif;font-size:13px;
                color:#8a8070;line-height:1.8;margin:0 0 10px;">
                Seus arquivos serão entregues via email conforme os prazos abaixo:
              </p>
              <table cellpadding="0" cellspacing="0" border="0"
                style="font-family:'Courier New',Courier,monospace;font-size:11px;color:#8a8070;">
                <tr>
                  <td style="padding:3px 16px 3px 0;white-space:nowrap;">&mdash; Beat catálogo</td>
                  <td style="padding:3px 0;white-space:nowrap;">até 24 horas</td>
                </tr>
                <tr>
                  <td style="padding:3px 16px 3px 0;white-space:nowrap;">&mdash; Beat personalizado</td>
                  <td style="padding:3px 0;white-space:nowrap;">até 2 semanas</td>
                </tr>
                <tr>
                  <td style="padding:3px 16px 3px 0;white-space:nowrap;">&mdash; Mixagem / Masterização</td>
                  <td style="padding:3px 0;white-space:nowrap;">até 3 semanas</td>
                </tr>
              </table>
            </td></tr>
          </table>
          <p style="font-family:Georgia,'Times New Roman',serif;font-size:14px;
            color:#8a8070;line-height:1.85;margin:0 0 8px;">
            Qualquer dúvida, estamos aqui.
          </p>
          <div style="margin-top:32px;padding-top:24px;border-top:1px solid #2a2415;">
            <div style="font-family:'Courier New',Courier,monospace;font-size:8px;
              letter-spacing:0.3em;color:#8a7a54;text-transform:uppercase;margin-bottom:12px;">
              // DE
            </div>
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:18px;
              font-weight:bold;color:#f5f0e8;letter-spacing:0.08em;
              text-transform:uppercase;margin-bottom:4px;">
              Caramujo Records
            </div>
            <div style="font-family:'Courier New',Courier,monospace;font-size:10px;
              color:#6a5e42;letter-spacing:0.15em;">
              @rideblan33
            </div>
          </div>
        </td>
      </tr>
      <tr>
        <td style="background:#0f0d07;padding:20px 40px;border-top:1px solid #2a2415;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td><div style="font-family:'Courier New',Courier,monospace;font-size:8px;
              letter-spacing:0.2em;color:#7a6e52;text-transform:uppercase;">
              contato@caramujorecords.com.br</div></td>
            <td align="right"><div style="font-family:'Courier New',Courier,monospace;font-size:8px;
              letter-spacing:0.2em;color:#7a6e52;">&copy; 2026</div></td>
          </tr></table>
        </td>
      </tr>
      <tr><td style="background:#b82c08;padding:3px 0;font-size:0;line-height:0;">&nbsp;</td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
      style="max-width:560px;margin-top:20px;">
      <tr><td style="text-align:center;padding:0 40px;">
        <div style="font-family:'Courier New',Courier,monospace;font-size:9px;
          letter-spacing:0.15em;color:#6a5e3a;text-transform:uppercase;">
          Estúdio popular &middot; Produção independente &middot; São Carlos, SP
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `Caramujo Records <${fromEmail}>`,
      to: [email],
      subject: `Caramujo Records — Pedido confirmado ✓`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend buyer email error ${res.status}: ${err}`);
  }
  console.log(`[email-buyer] ✅ Confirmação enviada para ${email}`);
}

// ── Extrai nome do beat da descrição ────────────────────────────────────────

function extractBeatName(description) {
  return description
    .replace('Caramujo Records — ', '')
    .replace(' + Stems', '')
    .replace(/ x\d+$/, '')
    .trim() || null;
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

      // ── Idempotência: evita processar o mesmo pagamento duas vezes ──────────
      // O MP dispara o webhook múltiplas vezes para o mesmo evento de pagamento.
      // Solução: marcamos o pagamento com webhook_processed=true via PUT no MP
      // antes de executar qualquer ação. Se já estiver marcado, ignoramos.
      if (payment.metadata?.webhook_processed === 'true') {
        console.log(`[webhook] Pagamento ${payment.id} já processado anteriormente — ignorando chamada duplicada.`);
        return new Response('ok', { status: 200 });
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

      // 2. Atualiza index.html (beats + cupom) em UM único commit
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

      if (allBeatNames.length || couponCode) {
        try {
          await updateIndex({ githubToken: env.GITHUB_TOKEN, beatNames: allBeatNames, couponCode });
        } catch (ghErr) {
          console.error('[webhook] Falha ao atualizar index.html no GitHub:', ghErr.message);
        }
      }
    }

    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('[webhook] Erro interno:', err.message);
    return new Response('internal error', { status: 500 });
  }
}
