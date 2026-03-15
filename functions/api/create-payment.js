/**
 * Cloudflare Pages Function: create-payment
 * Variáveis de ambiente: MP_ACCESS_TOKEN, NOTIFY_EMAIL, NOTIFY_FROM, RESEND_API_KEY, GITHUB_TOKEN
 */

const GITHUB_OWNER  = 'bruno-l-rossi';
const GITHUB_REPO   = 'caramujo-records';
const GITHUB_FILE   = 'index.html';
const GITHUB_BRANCH = 'main';

// ── Valida cupom lendo uses atual direto do GitHub ────────────────────────────
async function validateCouponFromGitHub(couponCode, githubToken) {
  if (!couponCode || !githubToken) return { valid: false, reason: 'sem token' };
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE}?ref=${GITHUB_BRANCH}`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'caramujo-records-webhook/1.0',
        },
      }
    );
    if (!res.ok) return { valid: false, reason: 'github error' };
    const { content } = await res.json();
    const src = decodeURIComponent(escape(atob(content.replace(/\n/g, ''))));

    const codeEsc = couponCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Extrai uses e maxUses do objeto COUPONS no código
    const blockRe = new RegExp(`'${codeEsc}'\\s*:\\s*\\{([^}]+)\\}`, 'i');
    const block = src.match(blockRe);
    if (!block) return { valid: false, reason: 'not found' };

    const usesMatch    = block[1].match(/uses\s*:\s*(\d+)/);
    const maxUsesMatch = block[1].match(/maxUses\s*:\s*(\w+)/);

    const uses    = usesMatch    ? parseInt(usesMatch[1], 10)    : 0;
    const maxUsesRaw = maxUsesMatch ? maxUsesMatch[1] : 'Infinity';
    const maxUses = maxUsesRaw === 'Infinity' ? Infinity : parseInt(maxUsesRaw, 10);

    if (uses >= maxUses) return { valid: false, reason: 'expired' };
    return { valid: true };
  } catch (e) {
    console.warn('[coupon-check] Falha ao validar cupom via GitHub:', e.message);
    return { valid: true }; // em caso de falha técnica, não bloqueia o pagamento
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
function fmtCpf(cpf) {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// ── Contrato HTML ─────────────────────────────────────────────────────────────

function generateContractHtml({ name, cpf, email, items, category, amount, paymentId, termsTimestamp, artistName }) {
  const data = new Date(termsTimestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><style>
  body{font-family:'Courier New',monospace;background:#fff;color:#111;margin:0;padding:40px 32px;max-width:700px;}
  h1{color:#b82c08;font-size:1.5rem;letter-spacing:.1em;text-align:center;margin-bottom:4px;}
  .sub{text-align:center;font-size:.75rem;color:#666;margin-bottom:4px;}
  hr{border:none;border-top:2px solid #b82c08;margin:16px 0;}
  h2{text-align:center;font-size:1rem;letter-spacing:.06em;margin-bottom:4px;}
  h3{font-size:.82rem;color:#b82c08;letter-spacing:.1em;text-transform:uppercase;border-bottom:1px solid #e0c0b0;padding-bottom:4px;margin:20px 0 8px;}
  .row{display:flex;gap:8px;font-size:.8rem;margin-bottom:5px;}
  .row b{min-width:160px;color:#333;}
  h4{font-size:.8rem;color:#b82c08;margin:12px 0 3px;}
  p,li{font-size:.78rem;line-height:1.7;color:#222;margin:2px 0;}
  ul{margin:4px 0 4px 18px;}
  .aceite{background:#fff8f0;border:1px solid #e0c0b0;border-left:4px solid #b82c08;padding:12px 16px;margin:20px 0;}
  .aceite b{display:block;color:#b82c08;font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px;}
  .sigs{display:flex;gap:40px;margin-top:32px;}
  .sig{flex:1;border-top:1px solid #999;padding-top:8px;font-size:.76rem;color:#444;}
  .footer{text-align:center;font-size:.68rem;color:#999;margin-top:28px;border-top:1px solid #eee;padding-top:10px;}
</style></head><body>
  <h1>CARAMUJO RECORDS</h1>
  <p class="sub">Estúdio popular e Independente · São Carlos, SP</p>
  <hr/>
  <h2>CONTRATO DE LICENÇA EXCLUSIVA DE USO</h2>
  <p class="sub">Instrumento Particular de Cessão de Direitos de Uso</p>

  <h3>Dados da Transação</h3>
  <div class="row"><b>Data:</b><span>${data}</span></div>
  <div class="row"><b>ID do Pagamento:</b><span>${paymentId}</span></div>
  <div class="row"><b>Categoria:</b><span>${category || '—'}</span></div>
  <div class="row"><b>Itens:</b><span>${items}</span></div>
  <div class="row"><b>Valor Total:</b><span>R$ ${amount}</span></div>

  <h3>Identificação das Partes</h3>
  <p><b>PRODUTOR (LICENCIANTE)</b></p>
  <div class="row"><b>Nome artístico:</b><span>@rideblan33</span></div>
  <div class="row"><b>Nome completo:</b><span>Bruno Lanzoni Rossi</span></div>
  <div class="row"><b>Email:</b><span>contato@caramujorecords.com.br</span></div>
  <br/>
  <p><b>COMPRADOR (LICENCIADO)</b></p>
  <div class="row"><b>Nome artístico:</b><span>${artistName || '—'}</span></div>
  <div class="row"><b>Nome completo:</b><span>${name}</span></div>
  <div class="row"><b>CPF:</b><span>${fmtCpf(cpf)}</span></div>
  <div class="row"><b>Email:</b><span>${email}</span></div>

  <hr/>
  <h3>Termos e Condições</h3>
  <h4>1. Objeto do Contrato</h4>
  <p>O presente contrato tem por objeto a cessão, em caráter exclusivo e definitivo, do direito de uso do beat/serviço identificado acima, produzido por @rideblan33, para fins de gravação, distribuição e exploração comercial de uma única faixa musical pelo Licenciado.</p>
  <h4>2. Licença Exclusiva</h4>
  <p>A licença concedida é EXCLUSIVA: após a conclusão desta compra, a Obra será removida permanentemente do catálogo da Caramujo Records e não será vendida, licenciada ou disponibilizada a terceiros em nenhuma hipótese.</p>
  <h4>3. Entrega dos Arquivos</h4>
  <p>O Licenciado receberá no email informado os seguintes arquivos após confirmação do pagamento:</p>
  <ul><li>Arquivo MP3 em 320kbps</li><li>Arquivo WAV</li><li>Stems separados por instrumento (se contratado Beat + Stems)</li><li>Uma via deste contrato</li></ul>
  <h4>4. Prazos de Entrega</h4>
  <ul><li>Beat catálogo: até 24 horas</li><li>Beat personalizado: até 2 semanas</li><li>Mixagem, Masterização ou Mix + Master: até 3 semanas</li></ul>
  <h4>5. Crédito Obrigatório</h4>
  <p>Plataformas digitais: creditar @rideblan33 como artista principal. YouTube: adicionar "(prod. @rideblan33)" no título.</p>
  <h4>6. Royalties</h4>
  <p>Royalties Fonográficos (master): 90% Licenciado / 10% Produtor. O Licenciado deve realizar o split share de 10% ao Produtor no cadastro em distribuidoras digitais.</p>
  <h4>7. Vedações</h4>
  <ul><li>Revender, ceder ou sublicenciar a Obra a terceiros</li><li>Remover ou alterar créditos do Produtor</li><li>Utilizar a Obra em mais de uma faixa sem novo contrato</li><li>Registrar a Obra em nome próprio no ECAD/PRO sem o Produtor</li></ul>
  <h4>8. Disposições Gerais</h4>
  <p>As partes elegem o foro da Comarca de São Carlos/SP. Este contrato representa o acordo integral entre as partes.</p>

  <div class="aceite">
    <b>Registro do Aceite Eletrônico</b>
    O Licenciado aceitou eletronicamente os presentes termos antes de efetuar o pagamento. Validade jurídica conforme Art. 107 do Código Civil Brasileiro.<br/><br/>
    <div class="row"><b>Timestamp:</b><span>${termsTimestamp}</span></div>
    <div class="row"><b>Versão:</b><span>caramujo-termos-v1-2026</span></div>
    <div class="row"><b>Email:</b><span>${email}</span></div>
    <div class="row"><b>CPF:</b><span>${fmtCpf(cpf)}</span></div>
  </div>

  <div class="sigs">
    <div class="sig">Produtor — @rideblan33 / Bruno Lanzoni Rossi</div>
  </div>
  <div class="sigs" style="margin-top:24px;">
    <div class="sig">Licenciado — ${artistName ? `${artistName} / ` : ''}${name}</div>
  </div>
  <div class="footer">Caramujo Records · Desde 2018 · caramujorecords.com.br</div>
</body></html>`;
}

// ── Email via Resend ──────────────────────────────────────────────────────────

async function sendNotificationEmail({ env, payment, name, artistName, email, cpf, itemsList, categoryLabel, couponCode, amount, selectedPaymentMethod, termsAcceptance, contractHtml }) {
  const resendKey   = env.RESEND_API_KEY;
  const notifyEmail = env.NOTIFY_EMAIL || 'rideblan33@gmail.com';
  const fromEmail   = env.NOTIFY_FROM  || 'rideblan33@caramujorecords.com.br';

  if (!resendKey) { console.warn('[email] RESEND_API_KEY não configurado — skip.'); return; }

  const statusPt = { approved: '✅ APROVADO', pending: '⏳ PENDENTE (PIX)', in_process: '🔄 EM ANÁLISE', rejected: '❌ RECUSADO' };
  const statusLabel = statusPt[payment.status] || payment.status.toUpperCase();
  const dataHora = new Date(termsAcceptance.timestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const notifHtml = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><style>
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
    ${contractHtml ? '<p style="font-size:.76rem;color:#c49040;">📎 Contrato assinado em anexo.</p>' : ''}
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

// ── Email de confirmação de pedido ao comprador ──────────────────────────────

async function sendBuyerConfirmationEmail({ env, name, artistName, email, itemsList }) {
  const resendKey  = env.RESEND_API_KEY;
  const fromEmail  = env.NOTIFY_FROM || 'rideblan33@caramujorecords.com.br';

  if (!resendKey) { console.warn('[email-buyer] RESEND_API_KEY não configurado — skip.'); return; }
  if (!email || email === '—') { console.warn('[email-buyer] Email do comprador inválido — skip.'); return; }

  console.log(`[email-buyer] Enviando para: "${email}" | Nome: "${name}" | Itens: "${itemsList}"`);

  // Saudação: usa nome artístico se disponível, senão primeiro nome
  const greeting = (artistName || '').trim() || (name || '').split(' ')[0] || 'músico';

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Caramujo Records — Pedido Recebido</title>
</head>
<body style="margin:0;padding:0;background:#0a0905;font-family:'Courier New',Courier,monospace;">

<table width="100%" cellpadding="0" cellspacing="0" border="0"
  style="background:#0a0905;min-height:100vh;">
  <tr>
    <td align="center" style="padding:40px 16px;">

      <table width="100%" cellpadding="0" cellspacing="0" border="0"
        style="max-width:560px;background:#111009;border:1px solid #2a2415;">

        <!-- BARRA TOPO -->
        <tr><td style="background:#b82c08;padding:4px 0;font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- HEADER -->
        <tr>
          <td style="padding:40px 40px 28px;border-bottom:1px solid #2a2415;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td>
                  <div style="font-family:'Courier New',Courier,monospace;font-size:9px;
                    letter-spacing:0.4em;text-transform:uppercase;color:#b82c08;margin-bottom:10px;">
                    // CARAMUJO RECORDS
                  </div>
                  <div style="font-family:Georgia,'Times New Roman',serif;font-size:28px;
                    font-weight:bold;color:#f5f0e8;letter-spacing:0.05em;
                    text-transform:uppercase;line-height:1.1;">
                    PEDIDO<br/>
                    <span style="color:#b82c08;">CONFIRMADO.</span>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CORPO -->
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

            <!-- BLOCO PRAZOS -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
              style="background:#0f0d07;border-left:2px solid #b82c08;margin-bottom:28px;">
              <tr>
                <td style="padding:16px 20px;">
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
                </td>
              </tr>
            </table>

            <p style="font-family:Georgia,'Times New Roman',serif;font-size:14px;
              color:#8a8070;line-height:1.85;margin:0 0 8px;">
              Qualquer dúvida, estamos aqui.
            </p>

            <!-- ASSINATURA -->
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

        <!-- RODAPE -->
        <tr>
          <td style="background:#0f0d07;padding:20px 40px;border-top:1px solid #2a2415;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td>
                  <div style="font-family:'Courier New',Courier,monospace;font-size:8px;
                    letter-spacing:0.2em;color:#7a6e52;text-transform:uppercase;">
                    contato@caramujorecords.com.br
                  </div>
                </td>
                <td align="right">
                  <div style="font-family:'Courier New',Courier,monospace;font-size:8px;
                    letter-spacing:0.2em;color:#7a6e52;">
                    &copy; 2026
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- BARRA BASE -->
        <tr><td style="background:#b82c08;padding:3px 0;font-size:0;line-height:0;">&nbsp;</td></tr>

      </table>

      <!-- TAGLINE DISCRETA -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0"
        style="max-width:560px;margin-top:20px;">
        <tr>
          <td style="text-align:center;padding:0 40px;">
            <div style="font-family:'Courier New',Courier,monospace;font-size:9px;
              letter-spacing:0.15em;color:#6a5e3a;text-transform:uppercase;">
              Estúdio popular &middot; Produção independente &middot; São Carlos, SP
            </div>
          </td>
        </tr>
      </table>

    </td>
  </tr>
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

  const { formData, selectedPaymentMethod, amount, description, email: rawEmail, name: rawName, artistName: rawArtist, cpf: rawCpf, items, termsAcceptance, couponCode: rawCoupon } = body;
  const email      = sanitize(rawEmail, 254);
  const name       = sanitize(rawName, 120);
  const artistName = sanitize(rawArtist || '', 80);
  const cpf        = String(rawCpf ?? '').replace(/\D/g, '').slice(0, 11);
  const couponCode = rawCoupon ? sanitize(rawCoupon, 30).toUpperCase() : null;

  if (!amount || isNaN(Number(amount)) || Number(amount) < 1)
    return Response.json({ error: 'Valor inválido.' }, { status: 400, headers: cors });
  if (!isValidEmail(email))
    return Response.json({ error: 'Email inválido.' }, { status: 400, headers: cors });

  // Valida cupom no servidor (lê uses atual do GitHub para evitar reuso após expiração)
  if (couponCode) {
    const couponCheck = await validateCouponFromGitHub(couponCode, env.GITHUB_TOKEN);
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
      ...(couponCode ? { coupon_code: couponCode } : {}),
      ...(pkgBeatsList.length > 0    ? { pkg_beats:     pkgBeatsList.join('||')     } : {}),
      ...(catalogBeatsList.length > 0 ? { catalog_beats: catalogBeatsList.join('||') } : {}),
    };

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
      contractHtml = generateContractHtml({ name, cpf, email, items: itemsForEmail, category: categoryLabel, amount, paymentId: payment.id, termsTimestamp: termsAcceptance.timestamp, artistName });
    } catch (e) { console.error('[contrato] Erro:', e.message); }

    // Envia email de notificação ao dono (com contrato em anexo)
    try {
      await sendNotificationEmail({ env, payment, name, artistName, email, cpf, itemsList: itemsForEmail, categoryLabel, couponCode, amount, selectedPaymentMethod, termsAcceptance, contractHtml });
    } catch (e) { console.error('[email] Erro notificação:', e.message); }

    // Envia email de confirmação de pedido ao comprador (apenas quando aprovado)
    if (payment.status === 'approved') {
      try {
        await sendBuyerConfirmationEmail({ env, name, artistName, email, itemsList: itemsForEmail });
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
