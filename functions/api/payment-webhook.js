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
  const name     = [payer.first_name, payer.last_name].filter(Boolean).join(' ') || '—';
  const email    = payer.email || '—';
  const cpf      = (payer.identification?.number || '—').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  const amount   = payment.transaction_amount;
  const methodMap = { bank_transfer: 'PIX', credit_card: 'Cartão de Crédito', debit_card: 'Cartão de Débito' };
  const method   = methodMap[payment.payment_type_id] || payment.payment_type_id || '—';
  const desc     = (payment.description || '—').replace('Caramujo Records — ', '');
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
      Itens: <strong style="color:#f0c060">${desc}</strong>
    </div>
    <table>
      <tr class="sect"><td colspan="2">PEDIDO</td></tr>
      <tr><td>ID Pagamento</td><td>${payment.id}</td></tr>
      <tr><td>Itens</td><td>${desc}</td></tr>
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

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Caramujo Records <${fromEmail}>`,
      to: [notifyEmail],
      subject: `✅ PAGO R$${amount} — ${desc} — ENVIAR ARQUIVOS`,
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

async function updateIndex({ githubToken, beatName, couponCode }) {
  if (!githubToken) {
    console.error('[github] ❌ GITHUB_TOKEN não está configurado nas variáveis de ambiente do Cloudflare. Acesse Pages → Settings → Environment variables e adicione GITHUB_TOKEN.');
    return;
  }

  const needsBeat   = !!beatName;
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

  // 2a. Aplica mudança do beat (se necessário)
  if (needsBeat) {
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

  // 2b. Aplica incremento do cupom (se necessário) — sobre o content já modificado
  if (needsCoupon) {
    const couponEscaped = couponCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const couponRegex = new RegExp(
      `('${couponEscaped}'\\s*:\\s*\\{[^}]*?uses\\s*:\\s*)(\\d+)`,
      'i'
    );

    const match = content.match(couponRegex);
    if (!match) {
      console.error(`[github-coupon] ❌ Cupom "${couponCode}" não encontrado no código. Verifique se o nome bate exatamente com a chave no objeto COUPONS.`);
    } else {
      const currentUses = parseInt(match[2], 10);
      const newUses = currentUses + 1;
      content = content.replace(couponRegex, `$1${newUses}`);
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
    console.log(`[webhook] Pagamento ${payment.id} status: ${payment.status}`);

    if (payment.status === 'approved') {

      // 1. Email de notificação ao dono
      try {
        await sendApprovalEmail({ env, payment });
      } catch (emailErr) {
        console.error('[webhook] Falha no email ao dono:', emailErr.message);
      }

      // 2. Atualiza index.html (beat + cupom) em UM único commit
      const desc = payment.description || '';
      console.log(`[webhook] Descrição do pagamento: "${desc}"`);

      const isCatalogBeat = desc.includes('Caramujo Records —')
        && !desc.includes('Beat Personalizado')
        && !desc.includes('Mixagem')
        && !desc.includes('Masterização')
        && !desc.includes('Mix + Master')
        && !desc.includes('2 Beats')
        && !desc.includes('3 Beats')
        && !desc.includes('faixa');

      console.log(`[webhook] isCatalogBeat: ${isCatalogBeat}`);

      const beatName   = isCatalogBeat ? extractBeatName(desc) : null;
      const couponCode = payment.metadata?.coupon_code || null;

      if (beatName)   console.log(`[webhook] Beat extraído da descrição: "${beatName}"`);
      if (couponCode) console.log(`[webhook] Cupom usado: "${couponCode}"`);

      if (beatName || couponCode) {
        try {
          await updateIndex({ githubToken: env.GITHUB_TOKEN, beatName, couponCode });
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
