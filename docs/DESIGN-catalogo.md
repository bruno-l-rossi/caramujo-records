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

A capa vira o fundo da tela, ampliada 1,28x e desfocada em 34px, com saturação levemente
alta. Por cima, duas camadas escuras: um radial que deixa o miolo em 42% de preto e as
bordas em 88%, mais um linear de apoio. O desfoque tem que deixar a forma da arte visível
(é assim no Offtop); borrão liso demais vira névoa cinza e perde a graça.

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

## Beat tape

Mesmo desenho do catálogo do artista, com três diferenças: só a aba Beats (a de Músicas
some sozinha quando não tem som), a capa não é clicável — a arte é minha, vem da pasta da
tape — e cada beat carrega, na linha de baixo junto do BPM e do tom, **disponível** ou
**vendido**. Beat que o cruzamento não resolveu sai sem tag nenhuma: melhor não dizer nada
do que dizer errado.

No painel, `@rideblan33` fica fixo no topo da lista, acima de qualquer ordenação, e abre a
lista das tapes. Lá dentro, antes das tapes, aparece o bloco âmbar de revisão quando tem
beat indefinido.

## Nunca

- Trazer a paleta terrosa, o Cormorant ou o selo espiral para dentro da ferramenta.
- Cor de acento competindo com a capa.
- Divisória entre itens da lista, capa por linha, sombra em card.
- Ícone decorativo ou emoji no lugar de tipografia.
