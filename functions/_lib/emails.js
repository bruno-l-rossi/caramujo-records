// Contrato e e-mail do comprador: um lugar só (25/09/2026). Antes cada um estava
// copiado em create-payment.js (cartão) e payment-webhook.js (PIX), com o logo em
// base64 duas vezes. teste16 confere que a saída ficou igual à de antes.

export function fmtCpf(cpf) {
  return String(cpf || '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// naHora (11/10/2026): entrega na hora ligada no painel. O beat do catálogo sai na hora, pelo
// link do pedido; desligada, volta o "até 1 dia útil". Stems saíram do contrato (descontinuados).
export function contratoHtml({ name, cpf, email, items, category, amount, paymentId, termsTimestamp, artistName, naHora = false }) {
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
  <div class="row"><b>Email:</b><span>rideblan33@caramujorecords.com.br</span></div>
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
  <p>${naHora ? 'O Licenciado receberá os seguintes arquivos após a confirmação do pagamento, pelo link do pedido enviado ao email informado:' : 'O Licenciado receberá, no email informado no pedido, os seguintes arquivos após a confirmação do pagamento:'}</p>
  <ul><li>Arquivo MP3</li><li>Arquivo WAV</li><li>Uma via deste contrato assinado pelo Produtor</li></ul>
  <h4>4. Prazos de Entrega</h4>
  <ul><li>Beat catálogo (disponível no site): ${naHora ? 'na hora, pelo link do pedido' : 'até 1 dia útil'}</li><li>Beat personalizado (produção sob encomenda): até 2 semanas</li><li>Mixagem, Masterização ou Mix + Master: até 3 semanas</li></ul>
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

// Corpo do e-mail "Pedido confirmado" do comprador.
// pedidoUrl (10/10/2026, entrega na hora): o link com os arquivos do beat. Sem ele, o e-mail
// sai exatamente como antes (teste16 confere com as cópias guardadas).
export function htmlComprador({ greeting, itemsList, contractHtml, pedidoUrl = null, pedidoTudo = false, pedidoTipo = null, naHora = false }) {
  // 12/10/2026: pedido com serviço também tem link (pra mandar as vozes ou a referência)
  const soServico = pedidoTipo === 'servico', misto = pedidoTipo === 'misto';
  return `<!DOCTYPE html>
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
              <img src="https://caramujorecords.com.br/assets/brand/selo-email.png" width="72" height="72" alt="Caramujo Records" style="display:block;border:0;"/>
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
            ${pedidoUrl ? `Recebemos seu pedido de <strong style="color:#f2ecdf;">${itemsList}</strong>.
            ${soServico ? 'O próximo passo é seu: na página do pedido você manda o que o @rideblan33 precisa pra começar (as vozes, a faixa ou a referência).' : pedidoTudo ? 'Os arquivos já estão prontos: WAV, MP3 e o contrato, no link abaixo.' : misto ? 'Os arquivos do beat já estão prontos: WAV, MP3 e o contrato, no link abaixo. Na mesma página você manda o que o @rideblan33 precisa pros serviços.' : 'Os arquivos do beat já estão prontos: WAV, MP3 e o contrato, no link abaixo.'}
          </p>
          <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;"><tr>
            <td style="background:#b98f5e;"><a href="${pedidoUrl}" style="display:inline-block;padding:14px 22px;
              font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;font-weight:bold;letter-spacing:0.18em;
              color:#14110d;text-decoration:none;text-transform:uppercase;">${soServico ? 'Abrir seu pedido' : 'Baixar seus arquivos'}</a></td>
          </tr></table>
          <p style="font-family:'Courier New',Courier,monospace;font-size:11px;
            color:#6f6757;line-height:1.7;margin:-16px 0 28px;">
            O link é só seu. Guarda este e-mail pra baixar de novo quando precisar.` : `Recebemos seu pedido de <strong style="color:#f2ecdf;">${itemsList}</strong> e ele já está
            em preparação. Em breve você receberá seus arquivos neste email.`}
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
                ${pedidoUrl ? 'Os prazos de cada parte do pedido:' : 'Seus arquivos serão entregues via email conforme os prazos abaixo:'}
              </p>
              <table cellpadding="0" cellspacing="0" border="0"
                style="font-family:'Courier New',Courier,monospace;font-size:11px;color:#b89e72;">
                <tr>
                  <td style="padding:3px 16px 3px 0;white-space:nowrap;">&mdash; Beat catálogo</td>
                  <td style="padding:3px 0;white-space:nowrap;">${pedidoUrl || naHora ? 'na hora' : 'até 1 dia útil'}</td>
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
              rideblan33@caramujorecords.com.br</div></td>
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
}

// Manda o "Pedido confirmado" pro comprador, com a via do contrato em anexo.
// Chamado pelo create-payment (cartão aprovado na hora) e pelo webhook (PIX).
export async function enviarEmailComprador(env, { name, artistName, email, itemsList, contractHtml, pedidoUrl = null, pedidoTudo = false, pedidoTipo = null, naHora = false }) {
  const resendKey = env.RESEND_API_KEY;
  const fromEmail = env.NOTIFY_FROM || 'rideblan33@caramujorecords.com.br';
  if (!resendKey) { console.warn('[email-buyer] RESEND_API_KEY não configurado — skip.'); return; }
  if (!email || email === '—') { console.warn('[email-buyer] Email do comprador ausente — skip.'); return; }

  const greeting = (artistName || '').trim() || String(name || '').split(' ')[0] || 'músico';
  console.log(`[email-buyer] Enviando para: "${email}" | Nome artístico: "${greeting}" | Itens: "${itemsList}"`);

  const emailPayload = {
    from: `Caramujo Records <${fromEmail}>`,
    to: [email],
    subject: `Caramujo Records — Pedido confirmado ✓`,
    html: htmlComprador({ greeting, itemsList, contractHtml, pedidoUrl, pedidoTudo, pedidoTipo, naHora }),
  };
  if (contractHtml) {
    const safeName = (name || 'comprador').replace(/[^a-zA-Z0-9À-ÿ\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60);
    emailPayload.attachments = [{
      filename: `contrato-caramujo-${safeName}.html`,
      content: btoa(unescape(encodeURIComponent(contractHtml))),
    }];
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(emailPayload),
  });
  if (!res.ok) throw new Error(`Resend buyer email error ${res.status}: ${await res.text()}`);
  console.log(`[email-buyer] ✅ Confirmação enviada para ${email}${contractHtml ? ' (com contrato em anexo)' : ''}`);
}
