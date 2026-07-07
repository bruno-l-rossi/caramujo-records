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
const COUPONS_FILE  = 'functions/coupons.json';

// ── Contrato (mesma geração do create-payment; o webhook reconstrói a partir do metadata) ──

function fmtCpfDoc(cpf) {
  return String(cpf || '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function generateContractHtml({ name, cpf, email, items, category, amount, paymentId, termsTimestamp, artistName }) {
  const data = new Date(termsTimestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><style>
  body{font-family:'Courier New',monospace;background:#fff;color:#111;margin:0;padding:40px 32px;max-width:700px;}
  h1{color:#8C3B2E;font-size:1.5rem;letter-spacing:.1em;text-align:center;margin-bottom:4px;}
  .sub{text-align:center;font-size:.75rem;color:#666;margin-bottom:4px;}
  hr{border:none;border-top:2px solid #8C3B2E;margin:16px 0;}
  h2{text-align:center;font-size:1rem;letter-spacing:.06em;margin-bottom:4px;}
  h3{font-size:.82rem;color:#8C3B2E;letter-spacing:.1em;text-transform:uppercase;border-bottom:1px solid #e0c0b0;padding-bottom:4px;margin:20px 0 8px;}
  .row{display:flex;gap:8px;font-size:.8rem;margin-bottom:5px;}
  .row b{min-width:160px;color:#333;}
  h4{font-size:.8rem;color:#8C3B2E;margin:12px 0 3px;}
  p,li{font-size:.78rem;line-height:1.7;color:#222;margin:2px 0;}
  ul{margin:4px 0 4px 18px;}
  .aceite{background:#fff8f0;border:1px solid #e0c0b0;border-left:4px solid #8C3B2E;padding:12px 16px;margin:20px 0;}
  .aceite b{display:block;color:#8C3B2E;font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px;}
  .sigs{display:flex;gap:40px;margin-top:32px;}
  .sig{flex:1;border-top:1px solid #999;padding-top:8px;font-size:.76rem;color:#444;}
  .footer{text-align:center;font-size:.68rem;color:#999;margin-top:28px;border-top:1px solid #eee;padding-top:10px;}
</style></head><body>
  <div style="text-align:center;margin-bottom:2px;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="46" height="46"><g transform="rotate(180 50 50)"><path d="M50.00 51.30 L49.92 51.31 L49.84 51.32 L49.76 51.32 L49.68 51.33 L49.59 51.33 L49.50 51.33 L49.41 51.32 L49.32 51.31 L49.22 51.29 L49.13 51.27 L49.03 51.25 L48.94 51.21 L48.84 51.17 L48.74 51.13 L48.64 51.08 L48.55 51.02 L48.45 50.95 L48.36 50.88 L48.27 50.79 L48.18 50.71 L48.10 50.61 L48.02 50.51 L47.95 50.40 L47.88 50.28 L47.82 50.15 L47.76 50.02 L47.71 49.89 L47.67 49.74 L47.64 49.60 L47.61 49.44 L47.60 49.29 L47.59 49.12 L47.60 48.96 L47.61 48.79 L47.64 48.62 L47.68 48.45 L47.73 48.28 L47.79 48.10 L47.86 47.93 L47.95 47.76 L48.05 47.60 L48.16 47.43 L48.28 47.27 L48.42 47.12 L48.57 46.97 L48.73 46.83 L48.90 46.70 L49.08 46.58 L49.28 46.46 L49.48 46.36 L49.69 46.27 L49.92 46.19 L50.15 46.12 L50.39 46.06 L50.63 46.03 L50.89 46.00 L51.14 45.99 L51.41 46.00 L51.67 46.03 L51.94 46.07 L52.21 46.13 L52.48 46.21 L52.74 46.30 L53.01 46.42 L53.27 46.55 L53.53 46.70 L53.78 46.87 L54.02 47.06 L54.25 47.26 L54.48 47.48 L54.69 47.72 L54.89 47.98 L55.08 48.25 L55.25 48.53 L55.41 48.83 L55.55 49.15 L55.67 49.47 L55.77 49.81 L55.85 50.16 L55.92 50.52 L55.96 50.89 L55.97 51.26 L55.97 51.64 L55.94 52.02 L55.88 52.40 L55.81 52.79 L55.70 53.17 L55.57 53.55 L55.42 53.93 L55.24 54.30 L55.04 54.67 L54.81 55.03 L54.55 55.37 L54.28 55.71 L53.98 56.03 L53.65 56.33 L53.31 56.62 L52.94 56.89 L52.55 57.14 L52.14 57.36 L51.72 57.57 L51.28 57.74 L50.82 57.90 L50.35 58.02 L49.86 58.12 L49.37 58.19 L48.87 58.23 L48.36 58.24 L47.84 58.22 L47.32 58.16 L46.80 58.07 L46.29 57.95 L45.77 57.80 L45.26 57.61 L44.76 57.39 L44.26 57.14 L43.78 56.86 L43.31 56.54 L42.86 56.19 L42.42 55.81 L42.01 55.40 L41.61 54.96 L41.24 54.49 L40.90 54.00 L40.58 53.48 L40.29 52.94 L40.04 52.37 L39.82 51.79 L39.63 51.19 L39.47 50.57 L39.36 49.94 L39.28 49.29 L39.24 48.64 L39.24 47.98 L39.28 47.31 L39.37 46.64 L39.49 45.97 L39.66 45.31 L39.86 44.65 L40.11 43.99 L40.41 43.35 L40.74 42.72 L41.12 42.11 L41.53 41.52 L41.98 40.95 L42.48 40.40 L43.00 39.88 L43.57 39.39 L44.17 38.93 L44.80 38.50 L45.46 38.11 L46.15 37.75 L46.86 37.44 L47.60 37.17 L48.36 36.94 L49.14 36.76 L49.94 36.62 L50.74 36.53 L51.56 36.49 L52.39 36.50 L53.22 36.56 L54.05 36.67 L54.88 36.83 L55.71 37.05 L56.53 37.32 L57.33 37.63 L58.12 38.00 L58.90 38.42 L59.65 38.89 L60.38 39.41 L61.08 39.98 L61.75 40.59 L62.38 41.24 L62.98 41.94 L63.54 42.68 L64.06 43.46 L64.54 44.27 L64.96 45.12 L65.34 45.99 L65.67 46.90 L65.94 47.83 L66.16 48.78 L66.32 49.75 L66.42 50.73 L66.46 51.73 L66.44 52.73 L66.37 53.74 L66.23 54.74 L66.02 55.75 L65.76 56.74 L65.43 57.73 L65.04 58.70 L64.59 59.65 L64.08 60.58 L63.51 61.49 L62.89 62.36 L62.21 63.20 L61.47 64.00 L60.68 64.76 L59.84 65.47 L58.95 66.14 L58.02 66.76 L57.05 67.32 L56.03 67.83 L54.99 68.28 L53.91 68.66 L52.80 68.99 L51.67 69.24 L50.51 69.43 L49.34 69.55 L48.16 69.60 L46.97 69.57 L45.77 69.48 L44.58 69.31 L43.39 69.07 L42.21 68.75 L41.05 68.36 L39.90 67.90 L38.78 67.37 L37.68 66.77 L36.62 66.10 L35.59 65.36 L34.60 64.55 L33.66 63.68 L32.77 62.75 L31.93 61.77 L31.14 60.73 L30.42 59.63 L29.76 58.49 L29.17 57.30 L28.64 56.08 L28.19 54.81 L27.81 53.52 L27.51 52.19 L27.29 50.84 L27.15 49.48 L27.10 48.10 L27.12 46.71 L27.23 45.32 L27.43 43.93 L27.71 42.54 L28.08 41.17 L28.53 39.82 L29.06 38.48 L29.68 37.18 L30.38 35.91 L31.15 34.67 L32.01 33.48 L32.94 32.34 L33.94 31.24 L35.02 30.21 L36.16 29.24 L37.36 28.33 L38.62 27.49 L39.94 26.72 L41.31 26.04 L42.72 25.43 L44.18 24.91 L45.67 24.47 L47.20 24.12 L48.75 23.87 L50.32 23.70 L51.90 23.63 L53.50 23.66 L55.10 23.78 L56.69 24.00 L58.28 24.32 L59.86 24.74 L61.41 25.25 L62.94 25.86 L64.44 26.56 L65.89 27.36 L67.31 28.24 L68.68 29.22 L69.99 30.28 L71.24 31.42 L72.42 32.64 L73.54 33.94 L74.58 35.31 L75.54 36.74 L76.41 38.24 L77.20 39.80 L77.90 41.41 L78.50 43.06 L79.00 44.76 L79.40 46.49 L79.70 48.25 L79.89 50.04 L79.98 51.84 L79.96 53.65 L79.82 55.46 L79.58 57.28 L79.22 59.08 L78.76 60.87 L78.19 62.63 L77.50 64.36 L76.72 66.06 L75.82 67.71 L74.83 69.32 L73.73 70.87 L72.54 72.35 L71.25 73.77 L69.88 75.12 L68.42 76.38 L66.88 77.56 L65.27 78.65 L63.58 79.65 L61.83 80.54 L60.02 81.34 L58.16 82.02 L56.25 82.60 L54.31 83.06 L52.33 83.40 L50.32 83.63" fill="none" stroke="#8C3B2E" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"></path></g></svg></div>
  <h1>CARAMUJO RECORDS</h1>
  <p class="sub">Estúdio popular e independente · São Carlos, SP</p>
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
  <div class="row"><b>CPF:</b><span>${fmtCpfDoc(cpf)}</span></div>
  <div class="row"><b>Email:</b><span>${email}</span></div>

  <hr/>
  <h3>Termos e Condições</h3>
  <h4>1. Objeto do Contrato</h4>
  <p>O presente contrato tem por objeto a cessão, em caráter exclusivo e definitivo, do direito de uso do beat/serviço identificado acima, produzido por @rideblan33, para fins de gravação, distribuição e exploração comercial de uma única faixa musical pelo Licenciado.</p>
  <h4>2. Licença Exclusiva</h4>
  <p>A licença concedida é EXCLUSIVA: após a conclusão desta compra, a Obra será removida permanentemente do catálogo da Caramujo Records e não será vendida, licenciada ou disponibilizada a terceiros em nenhuma hipótese.</p>
  <h4>3. Entrega dos Arquivos</h4>
  <p>O Licenciado receberá, no email informado no pedido, os seguintes arquivos após a confirmação do pagamento:</p>
  <ul><li>Arquivo MP3 em 320kbps</li><li>Arquivo WAV</li><li>Stems separados por instrumento — somente se contratado o pacote Beat + Stems</li><li>Uma via deste contrato assinado pelo Produtor</li></ul>
  <h4>4. Prazos de Entrega</h4>
  <ul><li>Beat catálogo (disponível no site): até 24 horas</li><li>Beat personalizado (produção sob encomenda): até 2 semanas</li><li>Mixagem, Masterização ou Mix + Master: até 3 semanas</li></ul>
  <p>Em caso de imprevistos que possam impactar os prazos, o Produtor notificará o Licenciado por email com antecedência.</p>
  <h4>5. Crédito Obrigatório</h4>
  <p>O uso da Obra em qualquer plataforma digital exige a creditação do Produtor da seguinte forma:</p>
  <ul><li>Plataformas digitais (Spotify, Apple Music, Deezer, etc.): creditar @rideblan33 como um dos artistas principais ("performer") na faixa.</li><li>YouTube: adicionar "(prod. @rideblan33)" no título do vídeo.</li></ul>
  <p>O não cumprimento desta cláusula configura violação contratual e poderá ensejar rescisão da licença.</p>
  <h4>6. Royalties e Divisão de Receitas</h4>
  <p>O Licenciado é obrigado a realizar o split share de 10% dos royalties fonográficos para o Produtor no momento do cadastro da faixa em distribuidoras digitais. O não envio do split configura inadimplência contratual.</p>
  <h4>7. Vedações</h4>
  <p>É expressamente vedado ao Licenciado:</p>
  <ul><li>Revender, ceder, sublicenciar ou transferir a Obra ou este contrato a terceiros.</li><li>Remover ou alterar créditos do Produtor em qualquer plataforma ou material.</li><li>Utilizar a Obra em mais de uma faixa musical sem novo contrato.</li><li>Registrar a Obra em nome próprio em entidades de gestão coletiva (ECAD, PRO) sem inclusão do Produtor.</li></ul>
  <h4>8. Vigência</h4>
  <p>Esta licença é concedida por prazo indeterminado a partir da data de emissão, permanecendo válida enquanto o Licenciado cumprir todas as obrigações previstas neste instrumento.</p>
  <h4>9. Rescisão</h4>
  <p>O descumprimento de qualquer cláusula deste contrato, especialmente as relativas a crédito e royalties, confere ao Produtor o direito de rescindir a licença mediante notificação por escrito, sem direito a reembolso ao Licenciado.</p>
  <h4>10. Disposições Gerais</h4>
  <p>Este contrato representa o acordo integral entre as partes e substitui quaisquer entendimentos anteriores. Eventuais alterações somente terão validade se formalizadas por escrito e assinadas por ambas as partes. As partes elegem o foro da Comarca de São Carlos/SP para dirimir eventuais litígios.</p>

  <div class="aceite">
    <b>Registro do Aceite Eletrônico</b>
    O Licenciado aceitou eletronicamente os presentes termos antes de efetuar o pagamento. Validade jurídica conforme Art. 107 do Código Civil Brasileiro.<br/><br/>
    <div class="row"><b>Timestamp:</b><span>${termsTimestamp}</span></div>
    <div class="row"><b>Versão:</b><span>caramujo-termos-v1-2026</span></div>
    <div class="row"><b>Email:</b><span>${email}</span></div>
    <div class="row"><b>CPF:</b><span>${fmtCpfDoc(cpf)}</span></div>
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

// ── Atualiza index.html no GitHub (beats vendidos) ───────────────────────────

async function updateIndex({ githubToken, beatNames = [] }) {
  if (!githubToken) {
    console.error('[github] ❌ GITHUB_TOKEN não está configurado nas variáveis de ambiente do Cloudflare. Acesse Pages → Settings → Environment variables e adicione GITHUB_TOKEN.');
    return;
  }

  const needsBeat = beatNames.length > 0;
  if (!needsBeat) return;

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

// ── Incrementa uses do cupom em functions/coupons.json ───────────────────────

async function updateCouponUses({ githubToken, couponCode }) {
  if (!githubToken || !couponCode) return;

  const apiBase = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${COUPONS_FILE}`;
  const headers = {
    Authorization: `Bearer ${githubToken}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'caramujo-records-webhook/1.0',
  };

  const getRes = await fetch(`${apiBase}?ref=${GITHUB_BRANCH}`, { headers });
  if (!getRes.ok) throw new Error(`GitHub GET coupons.json error: ${getRes.status} — ${await getRes.text()}`);

  const fileData = await getRes.json();
  const coupons = JSON.parse(decodeURIComponent(escape(atob(fileData.content.replace(/\n/g, '')))));

  if (!coupons[couponCode]) {
    console.error(`[github-coupon] ❌ Cupom "${couponCode}" não encontrado em ${COUPONS_FILE}.`);
    return;
  }

  const currentUses = coupons[couponCode].uses || 0;
  coupons[couponCode].uses = currentUses + 1;

  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(coupons, null, 2) + '\n')));
  const putRes = await fetch(apiBase, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `chore: cupom "${couponCode}" uses: ${currentUses}→${currentUses + 1} [automated]`,
      content: encoded,
      sha: fileData.sha,
      branch: GITHUB_BRANCH,
    }),
  });
  if (!putRes.ok) throw new Error(`GitHub PUT coupons.json error: ${putRes.status} — ${await putRes.text()}`);
  console.log(`[github-coupon] ✅ Cupom "${couponCode}": uses ${currentUses} → ${currentUses + 1}`);
}

// ── E-mail do COMPRADOR (detalhes da compra + prazos) ─────────────────────────
// Vai pro cliente quando o pagamento (PIX) é aprovado.

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

  // Reconstrói o contrato a partir do metadata salvo no create-payment
  // (o comprador precisa da via dele mesmo se o botão de download falhar)
  let contractHtml = null;
  try {
    const cpfRaw = String(meta.buyer_cpf || payer.identification?.number || '').replace(/\D/g, '');
    if (name && cpfRaw) {
      contractHtml = generateContractHtml({
        name,
        cpf: cpfRaw,
        email,
        items: itemsList,
        category: meta.category_label || itemsList,
        amount: payment.transaction_amount,
        paymentId: payment.id,
        termsTimestamp: meta.terms_ts || payment.date_approved || payment.date_created,
        artistName,
      });
    }
  } catch (e) { console.error('[email-buyer] Erro ao gerar contrato:', e.message); }

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Caramujo Records — Pedido Recebido</title>
</head>
<body style="margin:0;padding:0;background:#14110d;font-family:'Courier New',Courier,monospace;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#14110d;min-height:100vh;">
  <tr><td align="center" style="padding:40px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
      style="max-width:560px;background:#1A1815;border:1px solid #332c22;">
      <tr><td style="background:#b98f5e;padding:4px 0;font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr>
        <td style="padding:40px 40px 28px;border-bottom:1px solid #332c22;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td valign="top">
              <div style="font-family:'Courier New',Courier,monospace;font-size:9px;
                letter-spacing:0.4em;text-transform:uppercase;color:#b98f5e;margin-bottom:10px;">
                // CARAMUJO RECORDS
              </div>
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:28px;
                font-weight:bold;color:#f2ecdf;letter-spacing:0.05em;
                text-transform:uppercase;line-height:1.1;">
                PEDIDO<br/><span style="color:#b98f5e;">CONFIRMADO.</span>
              </div>
            </td>
            <td align="right" valign="top" style="width:90px;">
              <img src="data:image/png;base64,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nwygHuUnqCPPNzzBVMGrF5xCsbInUKVKF0ldnxUS3I2e+hZEwmFXVlUXHmApBJJvA3AvethuojCrMoJy1o8hx6OalQVqjtQRMMAwCit0opth85UNa4HfQTnRaRTyOAX4XXJ1cVMCE8AGVu4A/oDixvdpFNp50v0coI4cDx+pJaCXvTiHemxbUebhDor7iHcgyfg4UtuHqLy0KS1YigoiHkST9a+iuHvuMHLAnkAZlkpTealBagkY4CB62i9H5LuBZKIC6IZdhki6BMXfDvX39Z4v508zGb04Xwfydu9Env4dwVutof/HiIC7a33s80VdiG1vudS1qDrmqygc42dKcsgzfh9lNR4laS5PZVgiULsdaHWmT6NwyyYKK12yKOTzFPC3yP4bgXQ/XLOhLggIBTfrClSY8ClkE3ZRKMnPISnxMrIfX0IB4mFSRERP6i1BD9MOlF67GUlBv8ZvCsUYdyKn4ylgNC3nMh/UBQGDKmAbZPlZtITqbUgy+iTMIZvwAPAfSF3tRRJyghLFpRfpHOw8rJJmBXqgvgj8KskSE3ZfbLLBEWTb/qP7uaANVLVEXRDQh7uRGUS6m1CP7b1IcoRVLOMoO3AckfFxpJ77mXlywYU8btCDshJNadjhzuE6pHLD+zGC7LynkQ38Dm7Nj3omnY+6I6DB3dBOVEBwPyLidczcRTeKyr1eRE7NB0itDeHsRBZYKnqka0XS7nIUv9yEFhT8iPs9TK1ZU9FupHZ3oiqheaf30oZ6J6BVJXcj++nrwMeRivJVGUhlnSOpVnkG9SRbyf2I+1yYUvNRal3gUn9bL7DNpu5Gdp7ZretIxtD5M6HNxBhDxbffQgH24yj2V1exzbmgbgkIBRLGFuczqXKj29bN8FFrVHofScERZB/a+r/9JON8J5hB8nj7z7hjaEeSzprqNyPydaGU2lYkBf3eYEPO7fMd5Dw9ix6OQeo3pjkr6pqAhsBJ6UE24QNI2qxA0ma2kWwTKKW1C9mLpp5HkcScpHABQhDxmpAkW4rU/xpEvBtQHnsd5Ytbc4jox9ADsBPld6tduLuusCgICAXSqIXE3roBEfEOFNooV2pv9X2jyCacJBk6VG4FJtuMjDb7uR2FWJqZ+TpbX/SzSOW+iSTzEN6ijZGAdQRPGtr4jVuRp3kNMvg3u62WKwQMIVX/Hslq7i/hLa26mEnno15ScdXABhQ9hXoluhEZ73PbCvc+k1gXYk01m9FsQyxtma43UWjleSTxRph/o1VdYtFJQB8lJhd0ISJuQNJxPWruvsX9XOhhTRNIwr2DQioW+jnhXh9A6r6qOTSLAYuagKXgqehO5CBsQ33H1yObrQlJRNusGcmWvLLwji2C7TclTVBoP55BDU9vuq0PBZIXPOZYr7hkCBgk/v04nU01MMJ1khS/diFJucq9vtS9pxERbwypz1NI3Q+4bQjlnscQGW0zpwYiAYFLiICzIUiVLUFkW0qyiLXZiRY49qXfORIP2sI258kWiRYRERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERExA/4ftt0J2qGir9UAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDctMDdUMTA6NDI6MzArMDA6MDBuBgpmAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA3LTA3VDEwOjQyOjMwKzAwOjAwH1uy2gAAAABJRU5ErkJggg==" width="80" height="80" alt="Caramujo Records" style="display:block;border-radius:4px;"/>
            </td>
          </tr></table>
        </td>
      </tr>
      <tr>
        <td style="padding:36px 40px 28px;">
          <div style="font-family:'Courier New',Courier,monospace;font-size:8px;
            letter-spacing:0.3em;color:#9e7c48;text-transform:uppercase;margin-bottom:28px;">
            -------- OBRIGADO PELA CONFIANÇA --------
          </div>
          <p style="font-family:Georgia,'Times New Roman',serif;font-size:15px;
            color:#b89e72;line-height:1.85;margin:0 0 16px;">
            Olá, ${greeting}.
          </p>
          <p style="font-family:Georgia,'Times New Roman',serif;font-size:15px;
            color:#b89e72;line-height:1.85;margin:0 0 28px;">
            Recebemos seu pedido de <strong style="color:#f2ecdf;">${itemsList}</strong> e ele já está
            em preparação. Em breve você receberá seus arquivos neste email.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0"
            style="background:#1A1815;border-left:2px solid #b98f5e;margin-bottom:28px;">
            <tr><td style="padding:16px 20px;">
              <div style="font-family:'Courier New',Courier,monospace;font-size:8px;
                letter-spacing:0.3em;color:#b98f5e;text-transform:uppercase;margin-bottom:10px;">
                // PRÓXIMOS PASSOS
              </div>
              <p style="font-family:Georgia,'Times New Roman',serif;font-size:13px;
                color:#b89e72;line-height:1.8;margin:0 0 10px;">
                Seus arquivos serão entregues via email conforme os prazos abaixo:
              </p>
              <table cellpadding="0" cellspacing="0" border="0"
                style="font-family:'Courier New',Courier,monospace;font-size:11px;color:#b89e72;">
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
          ${contractHtml ? `<p style="font-family:Georgia,'Times New Roman',serif;font-size:13px;
            color:#c3a074;line-height:1.8;margin:0 0 20px;">
            &#128206; Seu contrato de licen&ccedil;a assinado est&aacute; em anexo neste email.
            Ele &eacute; a sua garantia e prova do aceite dos termos — guarde em local seguro.
          </p>` : ''}
          <p style="font-family:Georgia,'Times New Roman',serif;font-size:14px;
            color:#b89e72;line-height:1.85;margin:0 0 8px;">
            Qualquer dúvida, estamos aqui.
          </p>
          <div style="margin-top:32px;padding-top:24px;border-top:1px solid #332c22;">
            <div style="font-family:'Courier New',Courier,monospace;font-size:8px;
              letter-spacing:0.3em;color:#9e7c48;text-transform:uppercase;margin-bottom:12px;">
              // DE
            </div>
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:18px;
              font-weight:bold;color:#f2ecdf;letter-spacing:0.08em;
              text-transform:uppercase;margin-bottom:4px;">
              Caramujo Records
            </div>
            <div style="font-family:'Courier New',Courier,monospace;font-size:10px;
              color:#6f6757;letter-spacing:0.15em;">
              @rideblan33
            </div>
          </div>
        </td>
      </tr>
      <tr>
        <td style="background:#1A1815;padding:20px 40px;border-top:1px solid #332c22;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td><div style="font-family:'Courier New',Courier,monospace;font-size:8px;
              letter-spacing:0.2em;color:#6f6757;text-transform:uppercase;">
              contato@caramujorecords.com.br</div></td>
            <td align="right"><div style="font-family:'Courier New',Courier,monospace;font-size:8px;
              letter-spacing:0.2em;color:#6f6757;">&copy; 2026</div></td>
          </tr></table>
        </td>
      </tr>
      <tr><td style="background:#b98f5e;padding:3px 0;font-size:0;line-height:0;">&nbsp;</td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
      style="max-width:560px;margin-top:20px;">
      <tr><td style="text-align:center;padding:0 40px;">
        <div style="font-family:'Courier New',Courier,monospace;font-size:9px;
          letter-spacing:0.15em;color:#6f6757;text-transform:uppercase;">
          Estúdio popular &middot; Produção independente &middot; São Carlos, SP
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const emailPayload = {
    from: `Caramujo Records <${fromEmail}>`,
    to: [email],
    subject: `Caramujo Records — Pedido confirmado ✓`,
    html,
  };

  if (contractHtml) {
    const safeName = (name || 'comprador').replace(/[^a-zA-Z0-9À-ÿ\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60);
    emailPayload.attachments = [
      {
        filename: `contrato-caramujo-${safeName}.html`,
        content: btoa(unescape(encodeURIComponent(contractHtml))),
      },
    ];
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(emailPayload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend buyer email error ${res.status}: ${err}`);
  }
  console.log(`[email-buyer] ✅ Confirmação enviada para ${email}${contractHtml ? ' (com contrato em anexo)' : ''}`);
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

      if (allBeatNames.length) {
        try {
          await updateIndex({ githubToken: env.GITHUB_TOKEN, beatNames: allBeatNames });
        } catch (ghErr) {
          console.error('[webhook] Falha ao atualizar index.html no GitHub:', ghErr.message);
        }
      }

      // 3. Incrementa uses do cupom em functions/coupons.json (commit separado)
      if (couponCode) {
        try {
          await updateCouponUses({ githubToken: env.GITHUB_TOKEN, couponCode });
        } catch (cpErr) {
          console.error('[webhook] Falha ao atualizar coupons.json no GitHub:', cpErr.message);
        }
      }
    }

    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('[webhook] Erro interno:', err.message);
    return new Response('internal error', { status: 500 });
  }
}
