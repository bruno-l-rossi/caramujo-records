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

**Celular.** Barra com o logo, capa quadrada de ponta a ponta, nome grande com a lupa na
mesma linha, usuário, contagem, linha de ações (play cinza grande, ENVIAR, BAIXAR), abas
Beats e Músicas com a ordenação à direita, lista, rodapé. Player fixo embaixo.

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
- `...` da faixa: Tocar, Enviar só essa faixa, Baixar.

## Links

- Catálogo: `caramujorecords.com.br/[artista]/[codigo]`
- Faixa avulsa: `caramujorecords.com.br/f/[codigo]`
- Seleção: `caramujorecords.com.br/p/[codigo]`

Os avulsos valem para sempre. Dentro de uma prévia ou de um link avulso, quem recebe não
reenvia: o `...` perde a opção de enviar.

## Player

Barra de progresso arrastável com bolinha de 13px, botões de 15 segundos para trás e para
frente, play e pause. Na faixa avulsa o play é um círculo branco de 64px. Toda área de
toque tem no mínimo 44px.

## Logo

Duas versões, cada uma no seu lugar:
- **Horizontal** (selo à esquerda, CARAMUJO RECORDS à direita), a mesma do site: barra do
  topo (148px), rodapé (164px) e topo da faixa avulsa (128px).
- **Vertical** (selo em cima, CARAMUJO RECORDS embaixo): capa sem arte e mini-capa do player.

Creme `#E4DAC7` no CARAMUJO e no selo, sépia no RECORDS. Ambas com fundo transparente,
embutidas na página como WebP.

## Capa

Sem arte, é preto com o logo vertical no centro, ocupando 62% da largura. Quando houver
imagem na pasta do artista, ela vira a capa e o borrão do fundo no computador.

## Nunca

- Trazer a paleta terrosa, o Cormorant ou o selo espiral para dentro da ferramenta.
- Cor de acento competindo com a capa.
- Divisória entre itens da lista, capa por linha, sombra em card.
- Ícone decorativo ou emoji no lugar de tipografia.
