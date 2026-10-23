# DESIGN-catalogo.md — Catálogo do artista

Identidade visual da ferramenta de catálogo (`caramujorecords.com.br/[artista]/[codigo]`).
Vale só para esta ferramenta. O site de vendas continua no `DESIGN.md` da marca (terroso,
Cormorant, selo). Aqui a referência é o Offtop, copiado de perto, porque a tela precisa
sumir na frente do áudio.

## Quem usa

O artista que recebe o link no WhatsApp ou no Direct, abre no celular e quer ouvir em um
toque. Não cria conta, não instala nada. Mais de 80% abre pelo telefone, muitas vezes no 4G.

## Direção

Preto puro, tipografia grotesca apertada, zero ornamento. A capa manda no clima, a
interface some. Nada da paleta terrosa da Caramujo entra aqui: a marca aparece só no
logo do topo, na capa sem arte e no rodapé.

## Paleta

Fundo e superfícies:
- `#000000` ground (celular)
- `#050505` base do borrão de fundo (computador)
- `rgba(17,17,17,.72)` painel flutuante, com blur de 26px
- `rgba(255,255,255,.09)` borda do painel
- `#141414` folhas e menus · `#1f1f1f` divisórias · `#232323` bordas de campo

Texto:
- `#ffffff` títulos e nome da faixa
- `#b7b7b7` apoio (usuário, botões de texto)
- `#8a8a8a` metadados (BPM, tom, tags, duração)
- `#6a6a6a` números da lista e rótulos de grupo
- `#454545` rodapé e apagados

Sem cor de acento. O branco é o acento: botão sólido, aba ativa, barra do player.
Vermelho só existe dentro do logo.

## Tipografia

Schibsted Grotesk (Google Fonts), com `-apple-system` e Helvetica Neue de reserva.
- Nome do artista: 40px mobile, 44px desktop, peso 700, `letter-spacing: -.03em`
- Nome da faixa: 16px, peso 500
- Metadados e duração: 13px, `tabular-nums`
- Botões de texto: 13px, caixa alta, `letter-spacing: .1em`
- Rótulo de grupo: 11px, caixa alta, `letter-spacing: .2em`

## Layout

**Celular.** Barra com o logo, capa quadrada ocupando 88% da largura (teto de 46vh), nome
grande com a lupa na mesma linha, usuário, contagem, linha de ações (play cinza grande,
ENVIAR, BAIXAR), abas Beats e Músicas com a ordenação à direita, lista, rodapé. Player fixo
embaixo. Abaixo da capa, um degradê escurece até o preto em 300px: a arte do fundo aparece
em volta da capa e some atrás do texto, que nunca perde contraste.

**Computador.** O borrão da capa cobre a tela. Capa nítida à esquerda, painel flutuante de
cantos arredondados à direita com todo o conteúdo, rolagem dentro do painel. Player fixo
na base, largura inteira.

## Lista

Número de dois dígitos, nome em branco, linha de baixo menor em cinza, duração à direita,
`...` de opções no fim. Sem capa por linha, sem divisória entre itens.

- Beats: `150 BPM · Abm`
- Músicas: `mastered` ou `demo`

Grupos na ordem padrão, com rótulo em caixa alta:
- Beats: reservados (sem rótulo), depois JÁ GRAVADOS
- Músicas: prontas (sem rótulo), depois GUIAS, depois JÁ LANÇADAS

Na faixa tocando, o número vira um equalizador de três barras.

## Ações

- **Play grande**: toca a lista inteira do começo.
- **ENVIAR** e **BAIXAR**: entram no mesmo modo de seleção, com caixas por faixa. A barra
  de baixo mostra Cancelar à esquerda e o botão da ação à direita, com a contagem.
- **Baixar** abre duas opções, com o tamanho de cada uma: `MP3 · pra ouvir` e `WAV · pra estúdio`.
- **Enviar** mostra o link com o botão Copiar e a prévia "Ver como a pessoa vê".
- `...` da faixa: Enviar só essa faixa, Baixar. Tocar sai dali: o toque na linha já toca.

## O fundo

A capa vira o fundo da tela, ampliada só 1,06x e desfocada em 26px, com saturação alta e
um toque de contraste. A ampliação é pequena de propósito: aparece quase a imagem inteira,
então capa clara dá tela clara e capa escura dá tela escura — a arte muda o clima da página,
que é o ponto (é assim no Offtop). Borrão liso e zoom grande viram névoa cinza igual pra
todo mundo.

Por cima, três camadas: uma faixa escura só nos 130px de cima, que segura o logo; um radial
de 14% no miolo até 62% nas bordas; e um linear leve de apoio. O escuro global é o mínimo
possível — quem garante a leitura é o degradê do `.panel` no celular (preto sólido a partir
de 260px abaixo da capa) e o cartão do `.lista` no computador (`--panel` em 82%).

Sem arte, o mesmo tratamento cai sobre três manchas claras, que é o fundo neutro da casa.

## Links

- Catálogo: `caramujorecords.com.br/[artista]/[codigo]`
- Faixa avulsa: `caramujorecords.com.br/f/[codigo]`
- Seleção: `caramujorecords.com.br/p/[codigo]`

Os avulsos valem para sempre. Dentro de uma prévia ou de um link avulso, quem recebe não
reenvia: o `...` perde a opção de enviar.

## Tarja do sistema

Tocando no celular, a notificação e a tela de bloqueio mostram a capa do catálogo, o título
`nome da faixa (prod. @rideblan33)`, o artista e "Caramujo Records". Os botões de faixa
anterior e próxima navegam na lista que está aberta, e a barra arrasta.

## Player

Barra de progresso arrastável com bolinha de 13px, botões de 15 segundos para trás e para
frente, play e pause. Toda área de toque tem no mínimo 44px.

## Link avulso

`/f/codigo` (uma faixa) e `/p/codigo` (uma seleção) usam a MESMA página do catálogo, com a
lista filtrada: some a aba, a busca e o ENVIAR, a contagem vira "1 faixa" ou "N faixas", e
o `...` da faixa perde a opção de reenviar. Uma faixa e várias faixas têm o mesmo desenho.

## Logo

Duas versões, cada uma no seu lugar:
- **Horizontal** (selo à esquerda, CARAMUJO RECORDS à direita), a mesma do site: barra do
  topo (148px), rodapé (164px) e topo da faixa avulsa (128px).
- **Vertical** (selo em cima, CARAMUJO RECORDS embaixo): capa sem arte e mini-capa do player.

Creme `#E4DAC7` no CARAMUJO e no selo, sépia no RECORDS. Ambas com fundo transparente,
embutidas na página como WebP.

## Capa

Sem arte, é preto com o logo vertical no centro. Qualquer imagem solta na pasta do artista
vira a capa, recortada num quadrado de 1000×1000. Tirar a imagem do Drive e converter de
novo devolve o logo: a sincronia apaga a capa órfã da prateleira.

O artista também pode subir a dele pelo catálogo, e a escolha dele manda: enquanto existir,
a pasta do Drive não sobrescreve. Na primeira vez, um botão discreto em cima da arte convida
a trocar. Depois que ele troca, o botão some — a arte fica limpa para print e vídeo — e o
convite passa a ser a própria capa: tocar nela abre trocar a imagem ou voltar para a padrão.

## Recado

Um parágrafo curto embaixo da contagem de faixas, escrito só por mim no painel, teto de 280
caracteres. Aceita quebra de linha — no máximo uma linha em branco entre parágrafos, o resto
o painel aperta sozinho. Sem recado, nada aparece.

## Comentários e NOVA (pasta de artista, 10/10/2026)

Só na pasta do artista. Tape e link avulso (`/f/`, `/p/`) ficam como estão.

- **NOVO** e **VERSÃO NOVA**: pastilha creme `#E4DAC7` com texto preto (a mesma do DISPONÍVEL
  da tape), antes da linha cinza. NOVO = a faixa não estava na última visita deste aparelho
  (era "NOVA" até 23/10/2026); VERSÃO NOVA = o arquivo mudou (ou subiu arquivo novo com o mesmo
  nome). Dura 3 visitas ou 14 dias. Primeira visita no aparelho: só o que subiu nos últimos 7
  dias, e nada quando seria a pasta toda.
- **APROVADA**: pastilha cinza translúcida com aro (a do VENDIDO), quando a versão atual da
  música foi aprovada. Arquivo novo derruba a aprovação.
- A linha cinza ganha `· N comentários` no fim, em texto, sem ícone.
- Barra do player: na pasta, o lugar do Comprar da tape vira **Comentar** (ícone de balão +
  texto). Toca, pausa a música e abre a folha já no segundo que tocava ("Em 1:23" ou "Na faixa
  toda", chips brancos quando escolhidos), campo do comentário, "Seu nome" (lembrado no
  aparelho), Cancelar e Enviar. Na linha do tempo, um ponto branco de 4px em cada segundo
  comentado.
- `...` da faixa: **Comentários (N)** em primeiro. A folha lista os comentários na ordem em que
  foram escritos: o tempo num chip que toca a faixa ali, o texto, nome e data, "versão anterior"
  quando o arquivo mudou depois, a resposta do @rideblan33 recuada com fio à esquerda, e
  "Apagar" só no que este aparelho escreveu. Música ganha "Aprovar versão".
- Sem divisória entre comentários, sem emoji, sem cor de acento: o branco segue sendo o acento.

## Beat tape

Mesmo desenho do catálogo do artista, com quatro diferenças:

- Só a aba Beats — a de Músicas some sozinha quando não tem som.
- A capa não é clicável: a arte é minha, vem da pasta da tape.
- **ENVIAR copia o link da tape inteira.** Não abre seleção de faixa, e o `...` da faixa
  perde o "Enviar só essa faixa". Tape se manda inteira, na ordem.
- Cada beat carrega uma pastilha antes do BPM: **DISPONÍVEL** em creme `#E4DAC7` sobre
  texto preto, **VENDIDO** em cinza translúcido com aro. Beat que o cruzamento não resolveu
  sai sem pastilha nenhuma: melhor não dizer nada do que dizer errado.

No painel, `@rideblan33` fica fixo no topo da lista, acima de qualquer ordenação, e abre a
lista das tapes. Lá dentro, antes das tapes, aparece o bloco âmbar de revisão quando tem
beat indefinido — agrupado por tape, com **disponível** e **vendido** em cada linha e um par
pra marcar a tape inteira. O que é marcado ali some do bloco e não volta.

## Nunca

- Trazer a paleta terrosa, o Cormorant ou o selo espiral para dentro da ferramenta.
- Cor de acento competindo com a capa.
- Divisória entre itens da lista, capa por linha, sombra em card.
- Ícone decorativo ou emoji no lugar de tipografia.

## Abas da pasta do artista e Fique por dentro da tape (12/10/2026)

Pasta com músicas e beats: as abas viram um botão duplo de ponta a ponta (borda `#333`, cantos
redondos), "MÚSICAS 4 | BEATS 3" em caixa alta com o número mais apagado; a aba aberta fica
cheia de branco com texto preto. Músicas vem primeiro e abre por padrão. "Ordem" desce pra
linha de baixo, à direita. Tape (só beats) segue com a aba simples sublinhada.

Página da tape: caixa "Fique por dentro" antes do "Mais de @rideblan33", fundo `#0b0b0b`, borda
`#2a2a2a`, cantos de 18px, kicker cinza, título 26px peso 800, campo e botão redondos (botão
branco cheio). Nunca na pasta de artista.

## Painel: abas, seletor e menu do lado (16/10/2026)

Partes da seção (Pedidos, Cupons, Lista; Vitrine, Fila, Beat tapes, Artistas) em abas: texto 15px `--ink3`, a escolhida em branco com linha de 2px embaixo, contador numa bolinha branca; linha `--linha` sob as abas. Filtros (Pra fazer, Todos, Testes) num seletor: caixa `#141414` com borda, botões de 13px, o escolhido em `#2a2a2a`. Computador: o menu do lado mostra as partes da seção aberta embaixo dela (recuo de 32px, fio `--linha` à esquerda, 13.5px; a parte atual em branco) e uma seta › que gira quando aberta.

## Painel novo e "Quer um som assim?" (12-14/10/2026)

Painel: barra de 5 seções fixa embaixo no celular (ícone + nome, bolinha branca com número) e
menu de 236px do lado no computador (logo em cima, Ajustes e Ver o site embaixo de um fio). Partes
de cada seção em pílulas redondas (a aberta cheia de branco). Pendências do Hoje em cartões
`#121212` com borda `#252525` e cantos de 16px; a mais urgente com o ícone em fundo branco.

Fim da aba Músicas do perfil: cartão com a foto do estúdio (gradiente pro preto embaixo), kicker
"Caramujo Records" cinza, "Quer um som assim?" em 28px peso 800 e dois botões redondos (Mix &
Master branco cheio, Beat personalizado com borda branca a 50%).

Fique por dentro da tape: 42px entre o fim dos beats e a caixa e 42px entre a caixa e o "Mais de"
(a medida conta o respiro da lista e do título).
