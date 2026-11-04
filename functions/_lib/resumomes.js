// E-mail do mês (04/11/2026, pedido do Bruno: "email pode implementar mensal"). Todo dia 1º, a partir
// das 9h de São Paulo, a passada de hora em hora (/api/lembretes) manda pro NOTIFY_EMAIL o resumo do
// mês que fechou: R$ e vendas (com o mês de antes), visitas, quantos compraram, o R$ de cada semana, as
// vendas com o estado de cada pedido, os 3 beats mais tocados na vitrine e o que espera por ele.
// Só pro Bruno: nada sai pra lista.
// De onde vem cada número (o mesmo do Hoje do painel):
//   R$ e vendas = pagamentos aprovados na meta 'vendas-origem' (cartão na hora e PIX pelo webhook,
//                 registrados desde 17/10/2026; pedido de teste fica de fora; estorno depois não desconta)
//   visitas     = funil, etapa 'visita' (dia de São Paulo)
//   plays       = beat_evento tipo 'play' (uma vez por beat por visita)
//   a lista     = pedidos pagos no mês (entrega na hora; venda sem link entra só na soma)
// Estado na meta 'resumo-mensal': { ligado, enviado: 'AAAA-MM', falhas: { 'AAAA-MM': n }, ultimo }.
// 1ª leitura (a meta não existe): conta o mês que fechou como enviado. O 1º e-mail sai no dia 1º seguinte
// (o mês de outubro só tem venda registrada desde o dia 17). Pra ver como fica antes: "Mandar um agora",
// em Ajustes, manda o mês corrente até hoje.
// Não deu no dia 1º (Actions parado, Resend fora): tenta de hora em hora até o dia 7, no máximo 6 falhas.
import { CHAVE_ORIGEM } from './vendasorigem.js';
import { GENEROS } from './generos.js';
import { lerAvisos } from './avisovenda.js';
import { SITE } from './pedidos.js';
import { esc, molde, par, botao, linhaBeat, tabela, enviar } from './avisos.js';

export const CHAVE_RESUMO = 'resumo-mensal';
export const REGISTRO_DESDE = '2026-10-17';
const SP = 3 * 3600e3;
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const diaSP = (t) => new Date(t - SP).toISOString().slice(0, 10);
export const mesSP = (t = Date.now()) => diaSP(t).slice(0, 7);
export const mesAntes = (ym) => { const [a, m] = ym.split('-').map(Number); return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, '0')}`; };
const diasNoMes = (ym) => { const [a, m] = ym.split('-').map(Number); return new Date(Date.UTC(a, m, 0)).getUTCDate(); };
const nomeMes = (ym) => MESES[Number(ym.slice(5, 7)) - 1];
const dd = (n) => String(n).padStart(2, '0');
const dm = (dia) => dia.slice(8, 10) + '/' + dia.slice(5, 7);
const inicioUTC = (dia) => new Date(Date.parse(dia + 'T00:00:00Z') + SP).toISOString();
const fimUTC = (dia) => new Date(Date.parse(dia + 'T00:00:00Z') + SP + 864e5).toISOString();
export const reaisInt = (v) => 'R$ ' + Math.round(Number(v || 0)).toLocaleString('pt-BR');
const rotGenero = (g) => { const s = String(g || '').toLowerCase(); const x = GENEROS.find(([k]) => k === s || k.replace(/-/g, '') === s); return x ? x[1] : s ? cap(s) : ''; };
const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);

/* ---------- estado ---------- */
export async function lerResumo(d) {
  const r = await d.prepare('SELECT valor FROM meta WHERE chave = ?').bind(CHAVE_RESUMO).first();
  if (!r) return { ligado: true, enviado: null, falhas: {}, ultimo: null, novo: true };
  let x = {};
  try { x = JSON.parse(r.valor) || {}; } catch (_) { x = {}; }
  return { ligado: x.ligado !== false, enviado: x.enviado || null, falhas: x.falhas && typeof x.falhas === 'object' ? x.falhas : {}, ultimo: x.ultimo || null };
}
async function gravarResumo(d, x) {
  const v = JSON.stringify({ ligado: x.ligado !== false, enviado: x.enviado || null, falhas: x.falhas || {}, ultimo: x.ultimo || null });
  await d.prepare('INSERT OR REPLACE INTO meta (chave, valor) VALUES (?, ?)').bind(CHAVE_RESUMO, v).run();
}
export async function ligarResumo(d, ligado, { agora = Date.now() } = {}) {
  const x = await lerResumo(d);
  // a 1ª vez que alguém mexe: o mês que fechou conta como enviado (igual à passada de hora em hora)
  if (x.novo) x.enviado = mesAntes(mesSP(agora));
  x.ligado = !!ligado;
  await gravarResumo(d, x);
  return x;
}
// o que o painel mostra em Ajustes
export async function estadoResumo(d, env) {
  const x = await lerResumo(d);
  return { ligado: x.ligado, enviado: x.enviado, ultimo: x.ultimo, para: env.NOTIFY_EMAIL || 'rideblan33@gmail.com' };
}

/* ---------- os números ---------- */
// ini e fim = dias de São Paulo ('AAAA-MM-DD'), fim incluído
async function somaVendas(d, ini, fim) {
  const r = await d.prepare('SELECT valor FROM meta WHERE chave = ?').bind(CHAVE_ORIGEM).first();
  let l = [];
  try { l = JSON.parse((r && r.valor) || '[]'); } catch (_) { l = []; }
  const por = {};
  let valor = 0, vendas = 0;
  for (const x of Array.isArray(l) ? l : []) {
    const t = new Date(x && x.em).getTime();
    if (isNaN(t)) continue;
    const k = diaSP(t);
    if (k < ini || k > fim) continue;
    const v = Number(x.v || 0);
    valor += v; vendas++;
    por[k] = (por[k] || 0) + v;
  }
  return { valor: Math.round(valor * 100) / 100, vendas, por };
}
async function contaVisitas(d, ini, fim) {
  const r = await d.prepare("SELECT COUNT(*) AS n FROM funil WHERE etapa = 'visita' AND dia BETWEEN ? AND ?").bind(ini, fim).first();
  return Number(r && r.n) || 0;
}
async function maisTocados(d, ini, fim, n = 3) {
  const { results } = await d.prepare(
    "SELECT beat_id AS id, COUNT(*) AS n FROM beat_evento WHERE tipo = 'play' AND dia BETWEEN ? AND ? GROUP BY beat_id ORDER BY n DESC LIMIT ?"
  ).bind(ini, fim, n).all();
  const top = results || [];
  if (!top.length) return [];
  const ids = top.map((x) => Number(x.id));
  const { results: bs } = await d.prepare(
    `SELECT id, name, bpm, mkey, genre, sold FROM beats WHERE id IN (${ids.map(() => '?').join(',')})`
  ).bind(...ids).all();
  const por = new Map((bs || []).map((b) => [Number(b.id), b]));
  return top.map((x) => ({ ...(por.get(Number(x.id)) || { name: 'beat ' + x.id }), plays: Number(x.n) || 0 }));
}
function estadoDoPedido(itens, baixados) {
  const sv = itens.filter((i) => i.t === 'servico');
  const abertos = sv.filter((s) => !s.entrega);
  if (abertos.some((s) => s.envio)) return 'material chegou, falta entregar';
  if (abertos.length) return 'esperando o material';
  if (sv.length) return 'serviço entregue';
  const n = Object.values(baixados || {}).reduce((a, v) => a + Number(v || 0), 0);
  return n ? 'baixou ' + plural(n, 'arquivo', 'arquivos') : 'ainda não baixou';
}
async function pedidosDoMes(d, ini, fim) {
  const { results } = await d.prepare(
    "SELECT nome, artista, itens, valor, baixados, pago_em FROM pedidos WHERE status = 'pago' AND pago_em >= ? AND pago_em < ? ORDER BY pago_em DESC LIMIT 40"
  ).bind(inicioUTC(ini), fimUTC(fim)).all();
  return (results || []).map((r) => {
    let itens = [], baixados = {};
    try { itens = JSON.parse(r.itens) || []; } catch (_) { itens = []; }
    try { baixados = JSON.parse(r.baixados || '{}') || {}; } catch (_) { baixados = {}; }
    return {
      quem: r.artista || r.nome || '', valor: r.valor, dia: diaSP(new Date(r.pago_em).getTime()),
      itens: itens.map((i) => i.nome).filter(Boolean), estado: estadoDoPedido(itens, baixados)
    };
  });
}
// o que espera pelo Bruno (todos os pedidos pagos recentes, não só os do mês)
async function pendencias(d) {
  const { results } = await d.prepare(
    "SELECT itens FROM pedidos WHERE status = 'pago' ORDER BY pago_em DESC LIMIT 60"
  ).all();
  const out = { entregar: [], material: 0 };
  for (const r of results || []) {
    let itens = [];
    try { itens = JSON.parse(r.itens) || []; } catch (_) { itens = []; }
    for (const s of itens) if (s.t === 'servico' && !s.entrega) { if (s.envio) out.entregar.push(s.nome); else out.material++; }
  }
  let falhou = [];
  try { falhou = (await lerAvisos(d)).falhou || []; } catch (_) { falhou = []; }
  out.avisos = falhou.length;
  return out;
}

// ym = mês ('AAAA-MM'); ate = último dia (número) quando é o mês corrente até hoje
export async function dadosDoMes(d, ym, { ate = null } = {}) {
  const n = ate || diasNoMes(ym);
  const ini = ym + '-01', fim = ym + '-' + dd(n);
  const ant = mesAntes(ym);
  const nAnt = ate ? Math.min(n, diasNoMes(ant)) : diasNoMes(ant);
  const iniA = ant + '-01', fimA = ant + '-' + dd(nAnt);
  const [atual, antes, visitas, tocados, pedidos, pend] = await Promise.all([
    somaVendas(d, ini, fim), somaVendas(d, iniA, fimA), contaVisitas(d, ini, fim),
    maisTocados(d, ini, fim), pedidosDoMes(d, ini, fim), pendencias(d)
  ]);
  // o R$ de cada semana do mês: 1 a 7, 8 a 14, 15 a 21, 22 a 28 e o resto
  const semanas = [];
  for (let a = 1; a <= n; a += 7) {
    const b = Math.min(n, a + 6);
    let v = 0;
    for (let k = a; k <= b; k++) v += atual.por[ym + '-' + dd(k)] || 0;
    semanas.push({ de: a, ate: b, valor: Math.round(v * 100) / 100 });
  }
  return {
    ym, ate, ini, fim, valor: atual.valor, vendas: atual.vendas, visitas,
    antes: { ym: ant, valor: antes.valor, vendas: antes.vendas, parcial: iniA < REGISTRO_DESDE, ini: iniA, fim: fimA },
    semanas, tocados, pedidos, pend
  };
}

/* ---------- o e-mail ---------- */
const mono = (t, c = '#b98f5e', m = 10) => `<div style="font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.3em;color:${c};text-transform:uppercase;margin-bottom:${m}px;">${t}</div>`;
const num = (v, r) => `<td width="33%" style="padding:12px 0;border-top:1px solid #332c22;"><div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:bold;color:#f2ecdf;">${v}</div><div style="font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.16em;color:#9e7c48;text-transform:uppercase;margin-top:4px;">${r}</div></td>`;
const pct = (vendas, visitas) => (visitas ? String(Math.round(vendas / visitas * 1000) / 10).replace('.', ',') : '0') + '%';
const ficha = (b) => [rotGenero(b.genre), b.bpm ? b.bpm + ' BPM' : '', b.mkey || ''].filter(Boolean).join(' · ');

function comparacao(m) {
  const a = m.antes, mesA = m.ate ? `${dm(a.ini)} a ${dm(a.fim)}` : nomeMes(a.ym);
  if (a.parcial) return `Sem comparação com ${mesA}: o registro de vendas começou em ${dm(REGISTRO_DESDE)}.`;
  if (!a.valor) return m.valor ? `${cap(mesA)} não teve venda.` : `${cap(mesA)} também não teve venda.`;
  const p = Math.round((m.valor - a.valor) / a.valor * 100);
  const quanto = p > 0 ? `${p}% a mais` : p < 0 ? `${-p}% a menos` : 'o mesmo valor';
  return `${reaisInt(a.valor)} em ${mesA}: <b style="color:#f2ecdf">${quanto}</b> agora.`;
}
function barras(semanas) {
  const max = Math.max(1, ...semanas.map((s) => s.valor));
  const td = semanas.map((s) => `<td width="20%" valign="bottom" align="center" style="padding:0 4px;"><div style="font-family:'Courier New',Courier,monospace;font-size:10px;color:${s.valor ? '#c3a074' : '#6f6757'};margin-bottom:5px;">${s.valor ? reaisInt(s.valor) : '·'}</div><div style="height:${s.valor ? Math.max(6, Math.round(s.valor / max * 64)) : 2}px;background:${s.valor ? '#b98f5e' : '#332c22'};"></div><div style="font-family:'Courier New',Courier,monospace;font-size:9px;color:#6f6757;margin-top:5px;">${s.de === s.ate ? s.de : s.de + ' a ' + s.ate}</div></td>`).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="height:104px;margin:0 0 24px;"><tr>${td}</tr></table>`;
}
function textoPendencias(p) {
  const l = [];
  if (p.entregar.length) l.push(p.entregar.length === 1 ? `1 ${esc(p.entregar[0])} pra entregar (o material já chegou)` : `${p.entregar.length} serviços pra entregar (o material já chegou)`);
  if (p.material) l.push(p.material === 1 ? '1 serviço esperando o material de quem comprou' : `${p.material} serviços esperando o material de quem comprou`);
  if (p.avisos) l.push(p.avisos === 1 ? '1 aviso de venda que não chegou no seu e-mail (tá no Hoje do painel)' : `${p.avisos} avisos de venda que não chegaram no seu e-mail (tão no Hoje do painel)`);
  if (!l.length) return 'Nenhum serviço esperando entrega.';
  return l.join('; ') + '.';
}

export function emailResumo(m) {
  const mes = nomeMes(m.ym), ano = m.ym.slice(0, 4);
  const periodo = `${dm(m.ini)} a ${dm(m.fim)}`;
  const titulo = m.ate ? `${cap(mes)} até agora` : `${cap(mes)} na Caramujo`;
  const vendasTxt = m.vendas ? `${reaisInt(m.valor)} em ${plural(m.vendas, 'venda', 'vendas')}` : 'nenhuma venda';
  const assunto = `${titulo}: ${vendasTxt}`;
  const lista = m.pedidos.slice(0, 8).map((p) => linhaBeat(esc((p.quem ? p.quem + ' · ' : '') + (p.itens.join(', ') || 'pedido')), esc(dm(p.dia) + ' · ' + p.estado), p.valor ? reaisInt(p.valor) : '')).join('');
  const fora = m.vendas - m.pedidos.length;
  const resto = m.pedidos.length > 8 ? par(`E mais ${m.pedidos.length - 8} no painel, em Vendas.`, 22, 13) : '';
  const semLink = fora > 0 ? par(`${fora === 1 ? '1 venda sem link de pedido entra' : fora + ' vendas sem link de pedido entram'} só na soma.`, 22, 13) : '';
  const corpo = mono(`${cap(mes)} de ${ano} · ${periodo}`) +
    par(comparacao(m), 14) +
    `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;"><tr>${num(String(m.vendas), m.vendas === 1 ? 'venda' : 'vendas')}${num(m.visitas.toLocaleString('pt-BR'), m.visitas === 1 ? 'visita' : 'visitas')}${num(pct(m.vendas, m.visitas), 'compraram')}</tr></table>` +
    (m.vendas && m.semanas.length > 1 ? mono('Por semana') + barras(m.semanas) : '') +
    (lista ? mono('Vendas') + tabela(lista) + resto : '') + semLink +
    (m.tocados.length ? mono('Mais tocados na vitrine') + tabela(m.tocados.map((b) => linhaBeat(b.sold ? `<s style="color:#8C3B2E;">${esc(b.name)}</s>` : esc(b.name), esc(ficha(b)), plural(b.plays, 'play', 'plays'))).join('')) : '') +
    mono('Precisa de você') + par(textoPendencias(m.pend), 16) +
    botao('Abrir o painel', SITE + '/painel');
  const rodape = m.ate
    ? 'Este saiu pelo botão em Ajustes. O de verdade sai todo dia 1º às 9h, com o mês que fechou.'
    : 'Sai todo dia 1º às 9h, só pra você. Pra parar, desliga em Ajustes no painel.';
  const html = molde({ titulo: assunto, h1: m.vendas ? reaisInt(m.valor) : 'Sem vendas', h2: m.vendas ? 'em ' + plural(m.vendas, 'venda', 'vendas') : 'em ' + mes, corpo, rodape });
  const texto = [
    `${titulo} (${periodo})`,
    `${vendasTxt}. ${comparacao(m).replace(/<[^>]+>/g, '')}`,
    `${plural(m.visitas, 'visita', 'visitas')}, ${pct(m.vendas, m.visitas)} compraram.`,
    m.pedidos.length ? 'Vendas:\n' + m.pedidos.slice(0, 8).map((p) => `- ${dm(p.dia)} ${p.quem ? p.quem + ': ' : ''}${p.itens.join(', ')} (${p.valor ? reaisInt(p.valor) : ''}, ${p.estado})`).join('\n') : '',
    m.tocados.length ? 'Mais tocados: ' + m.tocados.map((b) => `${b.name} (${b.plays})`).join(', ') : '',
    'Precisa de você: ' + textoPendencias(m.pend).replace(/<[^>]+>/g, ''),
    SITE + '/painel'
  ].filter(Boolean).join('\n\n');
  return { assunto, html, texto };
}

/* ---------- a passada de hora em hora ---------- */
export async function passarResumo(d, env, { agora = Date.now() } = {}) {
  const x = await lerResumo(d);
  const alvo = mesAntes(mesSP(agora));
  if (x.novo) { x.enviado = alvo; await gravarResumo(d, x); return { semeado: alvo }; }
  if (!x.ligado) return { desligado: true };
  if (x.enviado && x.enviado >= alvo) return { feito: x.enviado };
  const sp = new Date(agora - SP), dia = sp.getUTCDate(), hora = sp.getUTCHours();
  if (dia === 1 && hora < 9) return { cedo: true };
  if (dia > 7 || (x.falhas[alvo] || 0) >= 6) return { desistiu: alvo };
  const m = emailResumo(await dadosDoMes(d, alvo));
  const r = await enviar(env, { para: env.NOTIFY_EMAIL || 'rideblan33@gmail.com', assunto: m.assunto, html: m.html, texto: m.texto });
  const em = new Date(agora).toISOString();
  if (r.ok) { x.enviado = alvo; x.falhas = {}; x.ultimo = { em, mes: alvo, ok: true }; }
  else { x.falhas = { [alvo]: (x.falhas[alvo] || 0) + 1 }; x.ultimo = { em, mes: alvo, ok: false, erro: r.erro || 'falhou' }; }
  await gravarResumo(d, x);
  return { mes: alvo, ok: r.ok };
}

// "Mandar um agora" (Ajustes): o mês corrente até hoje, sem mexer no que a passada já mandou
export async function resumoAgora(d, env, { agora = Date.now() } = {}) {
  const ym = mesSP(agora), ate = Number(diaSP(agora).slice(8, 10));
  const m = emailResumo(await dadosDoMes(d, ym, { ate }));
  const r = await enviar(env, { para: env.NOTIFY_EMAIL || 'rideblan33@gmail.com', assunto: m.assunto, html: m.html, texto: m.texto });
  return { ok: r.ok, erro: r.erro || null, assunto: m.assunto };
}
