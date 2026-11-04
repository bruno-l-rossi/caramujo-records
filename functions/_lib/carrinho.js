// Carrinho abandonado (04/11/2026, rodada AF, pedido do Bruno: "carrinho abandonado pode seguir").
// Só pra quem está na lista (deu o e-mail numa beat tape ou chegou pelo cupom do e-mail): o navegador
// manda os ids dos beats do carrinho pra /api/lista ({ carrinho, email | cupom }) a cada mudança. Na
// passada diária (/api/lembretes, 18h43 de SP), carrinho parado há CARR.paradoH sem pedido nenhum
// desse e-mail recebe 1 e-mail:
//   A (sem cupom): os beats, o total do Leve mais e o PIX, "Voltar pro carrinho"
//   B (cupom da lista valendo e sem uso): o cupom na cara, o total com 15% e o botão que já leva o cupom
// Regra do Bruno: 1 disparo em 7 dias. Depois, só dispara de novo se a pessoa mexer no carrinho (pôr ou
// tirar beat) DEPOIS dos 7 dias. Beat vendido sai do e-mail; todos vendidos = não sai. Quem gerou PIX ou
// pagou depois de mexer no carrinho fica de fora (o aviso do PIX cuida de quem gerou PIX).
// Estado na meta 'carrinhos': { <email>: { ids, s (assinatura), em (última mudança), ultimo (último
// e-mail), n (quantos já foram), pulado (em da mudança que não rendeu e-mail) } }. Sem tabela nova.
import { molde, par, botao, tabela, linhaBeat, reais, esc, enviar, dentroDoLimite } from './avisos.js';
import { emailLimpo } from './lista.js';
import { totalDosBeats, hojeSP } from './loja.js';
import { SITE } from './pedidos.js';

export const CARR = { paradoH: 20, intervaloD: 7, validadeD: 7, porVez: 8, guarda: 600, maxIds: 20 };
const CHAVE = 'carrinhos';
const DIA = 864e5;

async function lerEstado(d) {
  try { const r = await d.prepare('SELECT valor FROM meta WHERE chave = ?').bind(CHAVE).first(); const x = r ? JSON.parse(r.valor) : {}; return x && typeof x === 'object' ? x : {}; } catch (_) { return {}; }
}
async function gravarEstado(d, st, agora) {
  // teto: some quem não tem carrinho nem e-mail recente; depois, os mais antigos
  for (const [k, e] of Object.entries(st)) if (!(e.ids && e.ids.length) && !(e.ultimo && agora - e.ultimo < CARR.intervaloD * DIA * 2)) delete st[k];
  const ks = Object.keys(st);
  if (ks.length > CARR.guarda) ks.sort((a, b) => (st[a].em || 0) - (st[b].em || 0)).slice(0, ks.length - CARR.guarda).forEach((k) => delete st[k]);
  await d.prepare('INSERT OR REPLACE INTO meta (chave, valor) VALUES (?, ?)').bind(CHAVE, JSON.stringify(st)).run();
}

export const assinatura = (ids) => [...new Set((Array.isArray(ids) ? ids : []).map(Number).filter((n) => Number.isInteger(n) && n > 0))].sort((a, b) => a - b).slice(0, CARR.maxIds);

// POST /api/lista { carrinho: [ids], email | cupom }. Responde sempre {ok:true} (não diz quem está na lista).
export async function guardarCarrinho(d, { email, cupom, ids, ip = null, agora = Date.now() }) {
  const lista = assinatura(ids), s = lista.join('.');
  const e = emailLimpo(email), c = /^LISTA-[A-Z0-9]{4}$/.test(String(cupom || '').toUpperCase()) ? String(cupom).toUpperCase() : null;
  if (!e && !c) return { ok: true };
  const r = e
    ? await d.prepare('SELECT email, saiu_em FROM lista WHERE email = ?').bind(e).first()
    : await d.prepare('SELECT email, saiu_em FROM lista WHERE cupom = ?').bind(c).first();
  if (!r || r.saiu_em) return { ok: true };
  const st = await lerEstado(d);
  const x = st[r.email] || {};
  if ((x.s || '') === s) return { ok: true, igual: true };
  if (ip && !(await dentroDoLimite(d, [['carr:' + ip, 60, 3600e3]]))) return { ok: true };
  st[r.email] = { ...x, ids: lista, s, em: agora };
  await gravarEstado(d, st, agora);
  return { ok: true, guardado: lista.length };
}

// Pode mandar agora? (a regra do Bruno)
export function podeMandar(x, agora = Date.now()) {
  if (!x || !Array.isArray(x.ids) || !x.ids.length || !x.em) return false;
  if (agora - x.em < CARR.paradoH * 3600e3) return false;            // ainda pode voltar sozinho
  if (agora - x.em > CARR.validadeD * DIA) return false;             // o carrinho do navegador já venceu
  if (x.pulado && x.pulado === x.em) return false;                   // essa mudança já foi vista e não rendeu e-mail
  if (x.ultimo) {
    if (agora - x.ultimo < CARR.intervaloD * DIA) return false;      // 1 disparo em 7 dias
    if (!(x.em > x.ultimo + CARR.intervaloD * DIA)) return false;    // de novo só se mexeu DEPOIS dos 7 dias
  }
  return true;
}

const SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
export function venceEm(valeAte, hoje = hojeSP()) {
  const dias = Math.round((Date.parse(valeAte + 'T12:00:00Z') - Date.parse(hoje + 'T12:00:00Z')) / DIA);
  if (dias <= 0) return 'vence hoje';
  if (dias === 1) return 'vence amanhã';
  if (dias < 7) return 'vence ' + SEMANA[new Date(valeAte + 'T12:00:00Z').getUTCDay()];
  return 'vale até ' + valeAte.slice(8, 10) + '/' + valeAte.slice(5, 7);
}
const cent = (v) => Math.round(v * 100 + 1e-6) / 100;
const fichaDe = (b) => [b.genero || b.generoLabel || '', b.bpm ? b.bpm + ' BPM' : '', b.key || ''].filter(Boolean).join(' · ');
export const linkCarrinho = (ids, cupom) => `${SITE}/?de=carrinho-email${cupom ? '&cupom=' + encodeURIComponent(cupom) : ''}#volta=${ids.join('.')}`;

// beats = os que seguem à venda, na ordem do carrinho; saiu = quantos o carrinho tinha e foram vendidos
export function emailCarrinho({ beats, saiu = 0, precos, cupom = null, token, hoje = hojeSP() }) {
  if (!beats || !beats.length) return null;
  const n = beats.length, unit = (precos && precos.beat) || 119, pixOff = Number(precos && precos.pixOff) || 0;
  const total = totalDosBeats(n, { ...precos, beat: unit }) || unit * n;
  const linhas = beats.map((b, i) => {
    const p = totalDosBeats(i + 1, { ...precos, beat: unit }) - (i ? totalDosBeats(i, { ...precos, beat: unit }) : 0);
    return linhaBeat(esc(b.name), esc(fichaDe(b)), p < unit ? `<s style="color:#6f6757;">${reais(unit)}</s> ${reais(p)}` : reais(p));
  }).join('');
  const ids = beats.map((b) => b.id);
  const qtd = n === 1 ? '1 beat' : n + ' beats';
  const vendido = saiu ? par(saiu === 1 ? '1 beat que você tinha escolhido já foi vendido e saiu da lista.' : `${saiu} beats que você tinha escolhido já foram vendidos e saíram da lista.`, 18, 13, '#c3a074') : '';
  const sairUrl = `${SITE}/api/lista?sair=${token}`;
  const rodape = `Esse aviso sai uma vez por carrinho, porque você está na lista da Caramujo e deixou beats no carrinho. <a href="${esc(sairUrl)}" style="color:#6f6757;">Sair da lista</a>.`;
  const pix = (v) => (pixOff ? ` No PIX, ${reais(cent(v * (1 - pixOff / 100)))}.` : '');
  let assunto, html, texto, link;
  if (cupom) {
    const pct = Number(cupom.pct) || 15, com = cent(total * (1 - pct / 100)), quando = venceEm(cupom.valeAte, hoje);
    link = linkCarrinho(ids, cupom.codigo);
    assunto = `Seu cupom de ${pct}% ${quando}`;
    html = molde({
      titulo: assunto, h1: 'Seu cupom', h2: quando + '.',
      corpo: par(`Você deixou ${qtd} no carrinho e o cupom da lista ainda não foi usado. Ele vale até <strong style="color:#f2ecdf;">${cupom.valeAte.slice(8, 10)}/${cupom.valeAte.slice(5, 7)}</strong>.`, 18) +
        `<table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px;"><tr><td style="border:1px dashed #b98f5e;padding:12px 18px;font-family:'Courier New',Courier,monospace;font-size:16px;letter-spacing:0.2em;color:#f2ecdf;">${esc(cupom.codigo)}</td><td style="padding-left:14px;font-family:'Courier New',Courier,monospace;font-size:11px;color:#9e7c48;">${pct}% nos beats<br/>já vai no link</td></tr></table>` +
        tabela(linhas) + vendido +
        par(`Com o cupom: <strong style="color:#f2ecdf;">${reais(com)}</strong>${n > 1 ? ` nos ${n}` : ''}.${pix(com)}`, 22, 14, '#c3a074') +
        botao(`Fechar com ${pct}% &rarr;`, link) +
        par('Cada beat é vendido uma vez só. O cupom é seu, uso único, só nos beats do catálogo.', 0, 13),
      rodape
    });
    texto = [assunto, '', `Você deixou ${qtd} no carrinho. Cupom ${cupom.codigo}: ${pct}% nos beats, até ${cupom.valeAte.slice(8, 10)}/${cupom.valeAte.slice(5, 7)}.`, '', ...beats.map((b) => `- ${b.name}`), '', `Com o cupom: ${reais(com)}`, `Fechar com ${pct}%: ${link}`, '', `Sair da lista: ${sairUrl}`].join('\n');
  } else {
    link = linkCarrinho(ids, null);
    assunto = n === 1 ? `O ${beats[0].name} ficou no carrinho` : 'Seus beats ficaram no carrinho';
    html = molde({
      titulo: assunto, h1: 'Seu carrinho', h2: 'ficou montado.',
      corpo: par(`Você deixou ${qtd} no carrinho e não fechou. ${n === 1 ? 'Ele segue' : 'Eles seguem'} à venda, por enquanto.`, 18) +
        tabela(linhas) + vendido +
        par(n > 1 ? `Os ${n} juntos saem por <strong style="color:#f2ecdf;">${reais(total)}</strong> (Leve ${n}).${pix(total)}` : `<strong style="color:#f2ecdf;">${reais(total)}</strong>.${pix(total)}`, 14, 14, '#c3a074') +
        par('Cada beat é vendido uma vez só. Se outra pessoa comprar antes, ele sai da loja.', 22, 13, '#c3a074') +
        botao('Voltar pro carrinho &rarr;', link) +
        par('O carrinho volta do jeito que você deixou. Dúvida, chama no Direct do @rideblan33.', 0, 13),
      rodape
    });
    texto = [assunto, '', `Você deixou ${qtd} no carrinho e não fechou.`, '', ...beats.map((b) => `- ${b.name}`), '', `Total: ${reais(total)}`, `Voltar pro carrinho: ${link}`, '', `Sair da lista: ${sairUrl}`].join('\n');
  }
  return { assunto, html, texto, link, variante: cupom ? 'B' : 'A' };
}

// A passada diária. vitrine() = a lista da loja (montarVitrine); precos = os do index.html.
export async function passarCarrinhos(d, env, { vitrine, precos, agora = Date.now() }) {
  const st = await lerEstado(d);
  const cand = Object.entries(st).filter(([, x]) => podeMandar(x, agora)).sort((a, b) => a[1].em - b[1].em).slice(0, CARR.porVez);
  const out = { vistos: cand.length, enviados: 0, pulados: [] };
  if (!cand.length) return out;
  const emails = cand.map(([e]) => e), vagas = emails.map(() => '?').join(',');
  const [ped, pessoas] = await Promise.all([
    d.prepare(`SELECT lower(email) AS e, MAX(criado_em) AS m FROM pedidos WHERE lower(email) IN (${vagas}) AND status IN ('pendente', 'pago') GROUP BY lower(email)`).bind(...emails).all(),
    d.prepare(`SELECT l.email, l.cupom, l.token, l.vale_ate, l.saiu_em, c.pct, c.usos, c.ativo FROM lista l LEFT JOIN cupons c ON c.codigo = l.cupom WHERE l.email IN (${vagas})`).bind(...emails).all()
  ]);
  const ultimoPedido = new Map((ped.results || []).map((r) => [r.e, r.m]));
  const porEmail = new Map((pessoas.results || []).map((r) => [r.email, r]));
  const vit = (await vitrine()) || [];
  const porId = new Map(vit.map((b) => [Number(b.id), b]));
  const hoje = hojeSP();
  for (const [email, x] of cand) {
    const p = porEmail.get(email);
    if (!p || p.saiu_em) { delete st[email]; out.pulados.push([email, 'fora da lista']); continue; }
    const ped1 = ultimoPedido.get(email);
    if (ped1 && Date.parse(ped1) >= x.em - 60e3) { x.pulado = x.em; out.pulados.push([email, 'pedido depois']); continue; }
    const vivos = x.ids.map((id) => porId.get(Number(id))).filter((b) => b && !b.sold && !b.removido);
    if (!vivos.length) { x.pulado = x.em; out.pulados.push([email, 'beats vendidos']); continue; }
    const vale = p.cupom && Number(p.ativo) && !Number(p.usos || 0) && (!p.vale_ate || hoje <= p.vale_ate) && p.vale_ate;
    const m = emailCarrinho({ beats: vivos, saiu: x.ids.length - vivos.length, precos, token: p.token, hoje,
      cupom: vale ? { codigo: p.cupom, valeAte: p.vale_ate, pct: p.pct } : null });
    const r = await enviar(env, { para: email, assunto: m.assunto, html: m.html, texto: m.texto });
    if (r.ok) { x.ultimo = agora; x.n = (x.n || 0) + 1; x.v = m.variante; out.enviados++; }
    else out.pulados.push([email, 'Resend falhou']);              // tenta na próxima passada
  }
  await gravarEstado(d, st, agora);
  return out;
}

// O mesmo trecho vai no vitrine.js, no catalogo/app.html e na página do beat (o teste73 confere as cópias):
// manda os ids dos beats do carrinho guardado quando a pessoa está na lista e o carrinho mudou.
export const AVISA_JS = `function avisaCarr(){try{var q=JSON.parse(localStorage.getItem('cr_avisa')||'null')||{},l=JSON.parse(localStorage.getItem('caramujo_lista_v1')||'null');if(l&&l.email)q.e=l.email;if(!q.e&&!q.c)return;var c=JSON.parse(localStorage.getItem('caramujo_carrinho_v1')||'null'),ids=((c&&c.itens)||[]).filter(function(x){return x&&x.type==='Beat'&&!x.stems&&x.beatId;}).map(function(x){return Number(x.beatId);}).sort(function(a,b){return a-b;}),s=ids.join('.');if(s===(q.s||''))return;fetch('/api/lista',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({carrinho:ids,email:q.e||undefined,cupom:q.c||undefined}),keepalive:true}).then(function(r){if(r.ok){q.s=s;localStorage.setItem('cr_avisa',JSON.stringify(q));}}).catch(function(){});}catch(_){}}`;
