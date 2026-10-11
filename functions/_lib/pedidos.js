// Entrega na hora dos beats (10/10/2026, item 6 do Bruno: "vamos testar como ficaria para
// os beats"). Pagou, o beat já está no link do pedido (/pedido/<token>): o WAV (direto do
// Drive, o mesmo arquivo da tape), o MP3 (do R2) e o contrato. O link aparece na tela de
// PEDIDO CONFIRMADO e vai no e-mail do comprador. Stems e serviços seguem como antes (o Bruno
// manda). Liga e desliga no painel (meta 'entrega-na-hora'): desligada, o checkout fica
// exatamente como era. Qualquer falha aqui não derruba venda nenhuma: sem link, o Bruno
// manda os arquivos como sempre.

import { db, now } from './db.js';
import { limpo } from './casar.js';
import { montarVitrine } from '../api/vitrine.js';

export const SITE = 'https://caramujorecords.com.br';
export const CHAVE = 'entrega-na-hora';
export const TETO_DOWNLOADS = 20;          // por arquivo e por link, contra link espalhado
const RE_TOKEN = /^[A-Za-z0-9_-]{20,40}$/;

export async function entregaLigada(d) {
  const r = await d.prepare('SELECT valor FROM meta WHERE chave = ?').bind(CHAVE).first();
  return !!(r && r.valor === '1');
}
export async function ligarEntrega(d, ligada) {
  await d.prepare('INSERT OR REPLACE INTO meta (chave, valor) VALUES (?, ?)').bind(CHAVE, ligada ? '1' : '0').run();
}

// 18 bytes aleatórios = 24 letras no link (ninguém adivinha)
export function novoToken() {
  const b = crypto.getRandomValues(new Uint8Array(18));
  let s = '';
  for (const n of b) s += String.fromCharCode(n);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const faixaDe = (b) => { const m = /\/mp3\/([A-Za-z0-9_-]+)\.mp3$/.exec((b && b.mp3) || ''); return m ? m[1] : null; };
const beatDe = (b, extra) => ({
  t: 'beat', id: b.id, nome: b.name, faixa: faixaDe(b), genero: b.genero || '', bpm: b.bpm || null, key: b.key || null,
  capa: b.capa ? String(b.capa).replace(/^\/capa\//, '') : null, ...extra
});

// O que o carrinho comprou, com o arquivo de cada beat (o mesmo cruzamento da vitrine:
// a tape mais nova do perfil dá a faixa). vit = montarVitrine().
export function itensDoPedido(items, vit) {
  const lista = Array.isArray(vit) ? vit : [];
  const porId = new Map(lista.map((b) => [Number(b.id), b]));
  const porNome = new Map();
  for (const b of lista) if (!porNome.has(limpo(b.name))) porNome.set(limpo(b.name), b);
  const out = [];
  for (const it of Array.isArray(items) ? items : []) {
    const nome = String((it && it.name) || '').replace(/ x\d+$/, '').trim();
    if (it.type === 'Beat') {
      const stems = / \+ Stems$/.test(nome);
      const puro = nome.replace(/ \+ Stems$/, '');
      const b = porNome.get(limpo(puro));
      out.push(b ? beatDe(b, { stems }) : { t: 'beat', id: null, nome: puro, faixa: null, stems });
    } else if (it.type === 'Pacote') {
      for (const g of Array.isArray(it.pkgBeats) ? it.pkgBeats : []) {
        for (const x of Array.isArray(g) ? g : []) {
          const b = porId.get(Number(x && x.id)) || porNome.get(limpo(x && x.name));
          out.push(b ? beatDe(b, { pacote: nome }) : { t: 'beat', id: null, nome: String((x && x.name) || ''), faixa: null, pacote: nome });
        }
      }
    } else if (it.type === 'Servico') {
      out.push({ t: 'servico', nome: String(it.name || '').slice(0, 80) });
    }
  }
  return out;
}

export const temBeat = (itens) => (itens || []).some((i) => i.t === 'beat' && i.faixa);
// tudo entregue na hora: só beats com arquivo e sem stems (stems e serviços o Bruno manda)
export const tudoNaHora = (itens) => (itens || []).length > 0 && itens.every((i) => i.t === 'beat' && i.faixa && !i.stems);

export async function criarPedido(d, { pagamento = null, status, nome, artista, email, itens, valor = null }) {
  const token = novoToken();
  const agora = now();
  await d.prepare(
    `INSERT INTO pedidos (token, pagamento, status, nome, artista, email, itens, valor, criado_em, pago_em)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(token, pagamento == null ? null : String(pagamento), status, nome || null, artista || null, email || null,
    JSON.stringify(itens || []), valor, agora, status === 'pago' ? agora : null).run();
  return token;
}

// Chamado pelo create-payment logo depois do Mercado Pago aceitar. null = sem link (chave
// desligada, carrinho sem beat, ou o beat não achou arquivo): a venda segue igual.
export async function abrirPedido(request, env, { payment, items, name, artistName, email, amount }) {
  const d = await db(env);
  if (!(await entregaLigada(d))) return null;
  const vit = await montarVitrine(request, env);
  const itens = itensDoPedido(items, vit);
  if (!temBeat(itens)) return null;
  const status = payment.status === 'approved' ? 'pago' : 'pendente';
  const token = await criarPedido(d, { pagamento: payment.id, status, nome: name, artista: artistName, email, itens, valor: amount });
  return { token, caminho: '/pedido/' + token, url: SITE + '/pedido/' + token, tudo: tudoNaHora(itens) };
}

export async function lerPedido(d, token) {
  if (!RE_TOKEN.test(String(token || ''))) return null;
  const r = await d.prepare('SELECT * FROM pedidos WHERE token = ?').bind(token).first();
  if (!r) return null;
  try { r.itens = JSON.parse(r.itens); } catch (_) { r.itens = []; }
  try { r.baixados = JSON.parse(r.baixados || '{}') || {}; } catch (_) { r.baixados = {}; }
  return r;
}

export async function pedidoDoPagamento(d, pagamento) {
  const r = await d.prepare('SELECT token, status, itens FROM pedidos WHERE pagamento = ?').bind(String(pagamento)).first();
  if (!r) return null;
  let itens = [];
  try { itens = JSON.parse(r.itens); } catch (_) { itens = []; }
  return { token: r.token, status: r.status, itens, url: SITE + '/pedido/' + r.token, tudo: tudoNaHora(itens) };
}

// pendente -> pago (o webhook do PIX e a própria página, quando confere o Mercado Pago)
export async function marcarPago(d, pagamento) {
  await d.prepare("UPDATE pedidos SET status = 'pago', pago_em = ? WHERE pagamento = ? AND status = 'pendente'")
    .bind(now(), String(pagamento)).run();
}

// +1 no arquivo; devolve quantas vezes já foi baixado (antes deste)
export async function contarDownload(d, pedido, chave) {
  const antes = Number((pedido.baixados || {})[chave] || 0);
  const caminho = '$."' + String(chave).replace(/[^a-z0-9-]/gi, '') + '"';
  await d.prepare('UPDATE pedidos SET baixados = json_set(COALESCE(baixados, \'{}\'), ?, ?) WHERE token = ?')
    .bind(caminho, antes + 1, pedido.token).run();
  return antes;
}

// Pedido de teste do painel: o 1º beat à venda que tem arquivo, sem pagamento nenhum
export async function pedidoDeTeste(request, env) {
  const d = await db(env);
  const vit = await montarVitrine(request, env);
  const b = (vit || []).find((x) => !x.sold && faixaDe(x));
  if (!b) return null;
  const itens = [beatDe(b, { stems: false })];
  const token = await criarPedido(d, { status: 'teste', nome: 'Pedido de teste', artista: '@rideblan33', itens, valor: 0 });
  return { token, caminho: '/pedido/' + token, url: SITE + '/pedido/' + token, beat: b.name };
}

// Os últimos pedidos com link (painel): quem comprou, os beats e o que já baixou
export async function ultimosPedidos(d, n = 20) {
  const { results } = await d.prepare(
    'SELECT token, pagamento, status, nome, artista, itens, valor, baixados, criado_em, pago_em FROM pedidos ORDER BY criado_em DESC LIMIT ?'
  ).bind(n).all();
  return (results || []).map((r) => {
    let itens = [], baixados = {};
    try { itens = JSON.parse(r.itens); } catch (_) { itens = []; }
    try { baixados = JSON.parse(r.baixados || '{}') || {}; } catch (_) { baixados = {}; }
    return {
      token: r.token, status: r.status, quem: r.artista || r.nome || '', valor: r.valor, em: r.pago_em || r.criado_em,
      beats: itens.filter((i) => i.t === 'beat').map((i) => i.nome), baixou: Object.values(baixados).reduce((a, v) => a + Number(v || 0), 0)
    };
  });
}
