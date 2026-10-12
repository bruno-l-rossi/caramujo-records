/* ---------- Serviços no pedido (12/10/2026) ----------
   Pagou mix/master ou beat sob encomenda: a página do pedido pede o que o @rideblan33 precisa
   (as vozes, a faixa ou a referência), avisa o Bruno por e-mail, e mostra a entrega quando ele
   cola o link pelo painel. Sem aprovação no site (o Bruno combina ajuste pelo Direct).
   Tudo mora no JSON de itens do pedido: item.envio = { campos..., em } e item.entrega = { link, em }. */
export const SERVICOS = {
  'Beat Personalizado': {
    tipo: 'encomenda', curto: 'Beat personalizado', unidade: '1 beat', prazo: 'até 2 semanas depois que a referência chega',
    aguardando: 'Aguardando a referência', trabalho: 'Produção do beat', fim: 'Beat final entregue', fimSub: 'o link do beat, aqui nesta página',
    titulo: 'Manda a referência', texto: 'Uma música ou um beat com o som que você quer. Quanto mais perto, melhor: o @rideblan33 parte dela.',
    campos: [
      { k: 'ref', rot: 'Link da referência', ph: 'Música ou beat (YouTube, Spotify, SoundCloud…)', link: true, obrig: true },
      { k: 'guia', rot: 'Guia das vozes', ph: 'Já gravou uma guia? Cola o link aqui', link: true },
      { k: 'musica', rot: 'Nome da música', ph: 'Se já tiver' },
      { k: 'recado', rot: 'Recado pro @rideblan33', ph: 'BPM, clima, o que não pode faltar', alto: true }
    ]
  },
  'Mixagem': {
    tipo: 'vozes', curto: 'Mixagem', unidade: '1 faixa', prazo: 'até 3 semanas depois que as vozes chegam',
    aguardando: 'Aguardando suas vozes', trabalho: 'Mixagem', fim: 'Faixa mixada entregue', fimSub: 'o link da faixa, aqui nesta página',
    titulo: 'Manda as vozes', texto: 'Sobe os arquivos no Drive, WeTransfer ou Dropbox e cola o link aqui. O @rideblan33 recebe na hora.',
    dicas: ['Cada voz em WAV, começando no 0:00 do beat', 'Voz principal, dobras e ad-libs em arquivos separados'],
    campos: [
      { k: 'link', rot: 'Link das vozes', ph: 'Cole o link aqui', link: true, obrig: true },
      { k: 'musica', rot: 'Nome da música', ph: 'Como a faixa vai se chamar', obrig: true },
      { k: 'ref', rot: 'Referência de som', ph: 'Link de uma música com o som que você quer', link: true },
      { k: 'recado', rot: 'Recado pro @rideblan33', ph: 'O que é importante nessa faixa', alto: true }
    ]
  },
  'Masterização': {
    tipo: 'faixa', curto: 'Masterização', unidade: '1 faixa', prazo: 'até 3 semanas depois que a faixa chega',
    aguardando: 'Aguardando sua faixa', trabalho: 'Masterização', fim: 'Faixa masterizada entregue', fimSub: 'o link da faixa, aqui nesta página',
    titulo: 'Manda a faixa mixada', texto: 'Sobe a faixa no Drive, WeTransfer ou Dropbox e cola o link aqui. O @rideblan33 recebe na hora.',
    dicas: ['A faixa mixada em WAV, sem limitador no master', 'Deixa uns 3 a 6 dB de folga no pico'],
    campos: [
      { k: 'link', rot: 'Link da faixa', ph: 'Cole o link aqui', link: true, obrig: true },
      { k: 'musica', rot: 'Nome da música', ph: 'Como a faixa vai se chamar', obrig: true },
      { k: 'ref', rot: 'Referência de som', ph: 'Link de uma música com o som que você quer', link: true },
      { k: 'recado', rot: 'Recado pro @rideblan33', ph: 'O que é importante nessa faixa', alto: true }
    ]
  }
};
SERVICOS['Mix + Master'] = { ...SERVICOS['Mixagem'], curto: 'Mix + Master', trabalho: 'Mixagem e master', fim: 'Faixa final entregue' };
export const servicoDe = (nome) => SERVICOS[String(nome || '').replace(/ x\d+$/, '').trim()] || null;

export const RE_LINK = /^https?:\/\/[^\s<>"']+\.[^\s<>"']{2,}$/i;
// valida e limpa o que veio do formulário. { ok, envio } ou { erro }
export function limparEnvio(nome, corpo) {
  const sv = servicoDe(nome);
  if (!sv) return { erro: 'Esse item não pede envio.' };
  const envio = {};
  for (const c of sv.campos) {
    let v = String((corpo && corpo[c.k]) || '').trim().slice(0, c.alto ? 1500 : 400);
    if (c.link && v && !/^https?:\/\//i.test(v)) v = 'https://' + v;
    if (c.obrig && !v) return { erro: `Falta preencher: ${c.rot.toLowerCase()}.` };
    if (c.link && v && !RE_LINK.test(v)) return { erro: `${c.rot} não parece um link. Copia o endereço inteiro e cola de novo.` };
    if (v) envio[c.k] = v;
  }
  return { ok: true, envio };
}

