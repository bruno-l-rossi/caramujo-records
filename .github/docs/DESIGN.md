# DESIGN.md — Caramujo Records / rideblan

Sistema de marca extraído do site em produção (caramujorecords.com.br). Anexar este arquivo em qualquer prompt do Claude Design que envolva a Caramujo: landing, mockup, capa, deck.

## Quem é

Caramujo Records: estúdio popular e independente de São Carlos, SP, desde 2018. Porta aberta pro artista local, qualidade profissional a preço acessível. O produtor por trás é @rideblan33: rap/hip hop, estética de rua, artistas periféricos relatando cotidiano e luta. Relação 1:1 entre a marca Caramujo e o rideblan.

Prova social real: 40+ artistas, 200+ faixas lançadas, 2.500.000+ streams. Tag sonora: "atenção! você está ouvindo um beat do rideblan".

## Tom

De rua, direto, real. Fala com artista independente que compra pelo celular. Sem corporativês, sem hype vazio, sem emoji. Frases curtas. Português brasileiro com gíria natural da cena (beat, mix, master, na sorte, trampo). O site fala "a Caramujo", feminino.

## Paleta

Fundos (escuros, terrosos, quase pretos):
- `#14110d` black (fundo base)
- `#1A1815` deep (painéis)
- `#1e1a15` dark (seções)
- `#221e18` mole (cards, inputs)
- `#2a241c` earth (destaques de card)
- `#3a3127` loam (botões secundários)

Acentos (um só protagonista, os outros de apoio):
- `#b98f5e` fire — o acento principal (CTAs, destaques, selos)
- `#A87B4A` clay/ember — bordas ativas, hovers
- `#c3a074` amber — texto de destaque quente
- `#8C3B2E` blood — só pra "vendido" e erro

Texto:
- `#f2ecdf` cream (títulos)
- `#E8E0CF` bone (texto forte)
- `#b89e72` read (texto corrido)
- `#9e7c48` label (kickers, labels)
- `#6f6757` dim (apagado)
- `#332c22` wire (bordas de 1px em tudo)

Regra: nunca introduzir cor fora dessa paleta. Nada de azul, roxo, verde, neon.

## Tipografia

- Display/títulos: Cormorant Garamond (serif), peso 500-600, mixed-case, letter-spacing quase zero. Títulos grandes, presença editorial.
- UI/labels/botões: Helvetica Neue (sans), bold, caixa alta, letter-spacing largo (.12em a .3em), tamanhos pequenos.
- Dados/mono: IBM Plex Mono pra números, metadados (BPM, tom), inputs e microcopy técnica.
- Tapes, pastas, painel e perfil usam a Schibsted Grotesk num arquivo só (variável, pesos 400 a
  900; desde 04/10/2026, no lugar de quatro arquivos).

O contraste serif grande + sans miúda espaçada + mono técnica É a identidade tipográfica. Manter as três no papel de cada uma.

## Elementos de marca

- Selo do caramujo (espiral desenhada a traço) em creme ou sépia. Aparece no hero (grande, translúcido, à direita), no rodapé e no ícone da aba. No topo das páginas entra o logo horizontal (ver abaixo).
- Grão de filme sutil sobre os fundos (desligado no mobile).
- Bordas de 1px `#332c22` em cards, tabelas e botões ghost; cantos retos, zero border-radius (exceto o círculo do carrinho mobile).
- Interlude tipográfico: faixa escura com texto gigante em outline "ATENÇÃO! VOCÊ ESTÁ OUVINDO UM BEAT DO RIDEBLAN" (a palavra RIDEBLAN em contorno cor fire).
- Chips retangulares pequenos pra gênero/BPM/tom, caixa alta, mono.
- Selos de desconto: retângulo `fire` com texto escuro, canto superior direito do card ("8% OFF").

## O que nunca fazer

- Cara de IA padrão: gradientes roxos, glassmorphism, cantos arredondados grandes, ilustração 3D genérica, foto de banco de imagem.
- Trair a estética de rua pra parecer "tech" ou "clean demais".
- Mais de um acento gritando na mesma tela.
- Emoji no lugar de tipografia.
- Texto em inglês nas seções (só termos da cena: beat, mix, master).

## Contexto de uso

Público acessa 80%+ pelo celular, vindo do Instagram (bio e Direct). Mobile-first sempre. Vitrine é one-pager: hero → catálogo de beats (player contínuo, áudio do R2) → pacotes → serviços → estúdio → contato. Tapes, pastas de artista e o perfil /rideblan33 são páginas à parte. Compra via carrinho próprio com PIX e cartão (Mercado Pago).

## Ícone da aba (padrão de todas as páginas)

Toda página do site, inclusive as que ainda vão existir, usa o mesmo bloco no `<head>`:
`ICONES` em `functions/_lib/icones.js` (desde 04/10/2026). As páginas `.html` fixas
(`index.html`, `404.html`, `catalogo/app.html`) levam o bloco colado igual.
- `/assets/brand/favicon.svg`: o selo creme (no navegador em tema claro, sépia `clay`).
- `/assets/brand/selo-32.png`: navegador que não lê SVG.
- `/assets/brand/selo-180.png`: iPhone e iPad (aba, favoritos, tela de início).
- `/site.webmanifest` com `selo-192.png` e `selo-512.png`: Android e Google.
- Os PNGs são a espiral creme (`bone`) sobre o fundo `black` (#14110d), sem texto.
- Na raiz: `/favicon.ico`, `/apple-touch-icon.png` e o manifesto, pra página sem o bloco.
- Até 04/10/2026 o PNG do celular (`icone-180.png`) ainda era o caramujo antigo: por isso
  a aba do celular mostrava o logo velho. O arquivo foi trocado pelo selo novo.
- Tela de bloqueio sem capa e logo do Google: `selo-512.png` (`SELO_GRANDE`).
- O `teste33` reprova página nova sem o bloco.

## Logo do topo (padrão de todas as páginas)

Toda página do site, inclusive as que ainda vão existir, usa no cabeçalho o mesmo logo
horizontal: selo + CARAMUJO RECORDS em imagem (`/assets/brand/caramujo-h.webp`, 504x90,
19 KB desde 03/10/2026: cobre 3x o maior uso, os 168px do perfil).
Nunca o selo sozinho e nunca o nome montado em texto. Tamanho: 148x27 no computador e
122x22 abaixo de 900px (o perfil usa 168/118 por causa do botão ao lado). Liga pra vitrine
(`/`), exceto na própria vitrine. Hoje: vitrine (`nav .nav-logo`), tapes e pastas
(`.brand-link .logo`), perfil (`.topo .logo`) e painel (`.marca`). Vale desde 26/09/2026.

## Perfil @rideblan33 (/rideblan33)

Moldura terrosa em cima (logo horizontal à esquerda, "Ouça a beat tape nova" em fogo à
direita, foto tratada em 3 tons com o 33 em fogo e o "33" gigante só no contorno atrás),
grade preta das tapes embaixo (regras do DESIGN-catalogo). Foto e avatar em
`assets/perfil/`. O avatar (costas, camisa 33) é a cara do @rideblan33 em chip, card e painel.

## Pastilhas do perfil (desde 27/09/2026)

Na grade do /rideblan33, canto de cima à esquerda da capa, o mesmo desenho do DISPONÍVEL
das tapes (Schibsted 700, caixa alta, cantos de 3px):
- **NOVA**: creme `#E4DAC7` com texto preto. Vai na 1ª tape da lista do perfil (a ordem do painel manda).
- **EM ALTA**: preta translúcida com aro branco e o foguinho. Tape com mais plays em 30
  dias; se for a própria NOVA, vai pra 2ª mais tocada.
Só essas duas. Nunca mais de uma de cada.

## O @rideblan33 na vitrine (desde 27/09/2026)

- Anel de story no topo: a camisa 33 (`assets/perfil/rideblan33-camisa.webp`) numa bolinha
  de 34px com anel em degradê fire → amber → clay. No computador fica do lado do Instagram;
  no celular é o único ícone do topo (o Instagram sai, segue no Contato).
  Leva pro `/rideblan33?de=anel`.
- 1º card do carrossel do Sobre nós: fundo preto, "33" gigante só no contorno, a foto
  recortada e a faixa "@rideblan33 · PORTFÓLIO →"; legenda "Quem faz o som" em fogo.
  Leva pro `/rideblan33?de=sobre`.
- Carrossel do Sobre nós: todos os cards com a mesma altura, no computador e no celular
  (celular: `min(82vw,400px)`); a largura segue a proporção de cada mídia, nada corta nem estica.

## Compartilhar o perfil (desde 27/09/2026)

5º botão redondo no fim das redes do perfil (aro creme claro, pra não parecer mais uma rede).
Abre a folha na pele da vitrine: "Compartilhar perfil", "@rideblan33 © Caramujo Records",
"POSTAR NO STORY" e as duas prévias lado a lado, depois "Enviar o link" e "Fechar". Tocar
numa prévia posta aquela imagem (só imagem, sem som) e copia o link do sticker.
- **Perfil:** foto recortada com o 33 gigante só no contorno, "@rideblan33" e a bio em
  itálico. Embaixo fica livre pro sticker de link.
- **Catálogo:** mosaico 3x3 das tapes mais novas na ordem do perfil (NOVA na 1ª),
  "@rideblan33", "Catálogo de X beat tapes" (o número acompanha as tapes do perfil) e o chip
  BEATS · MIX · MASTER.
Nenhuma das duas leva texto de cupom. Desenho em `assets/story.js` (artePerfil, arteCatalogo).

## Números do site (desde 27/09/2026)

Artistas, faixas e streams mudam no painel (home, "Números do site") e aparecem no hero
da vitrine ("2.500.000+ streams", número cheio), no topo do perfil e na prévia do perfil
nas redes ("2,5 mi de streams", curto), nos dados pro Google ("2,5 milhões") e no
`/llms.txt`, o resumo pras IAs (número cheio). Sempre com o
"+" depois. A imagem da prévia do perfil (`rideblan33-og-2.jpg`) não tem números desenhados.

## @rideblan33 no hero (desde 27/09/2026)

Na frase "Beats exclusivos, mixagem e masterização por @rideblan33." o @ é o link do perfil,
igual ao das tapes: bone em negrito, sublinhado discreto e a setinha, que anda no hover.

## Hero no notebook (desde 03/10/2026)

Entre 901 e 1500px de largura o "Caramujo" encolhe um pouco (6,6% da largura, até 7,4rem)
e o card do Beat em destaque vai pros 56% da tela com até 400px, pra um nunca encostar
no outro. Acima de 1500px e no celular o hero segue como era. Escolha do Bruno (opção B
das prévias de 03/10).

## Checkout na paleta (desde 03/10/2026)

O formulário do cartão (Mercado Pago) usa as cores da casa: botão e destaques em `fire`,
hover em âmbar claro, campo `#221e18`, fundo `#1A1815`, texto `cream`/`read`. Caixa de
erro do pagamento: fundo `mole`, borda `wire` e fio de 3px em `blood` à esquerda, texto
`bone` (o `blood` sozinho não dá pra ler no escuro). Sem emoji em lugar nenhum do checkout:
o PEDIDO CONFIRMADO leva o selo creme de 56px no lugar do 🐌, e os avisos não têm ⚠.

## Página de cada beat e de cada gênero (desde 03/10/2026)

`/beat/<nome>` e `/beats/<genero>`, pra quem chega pelo Google. Topo e rodapé iguais aos da
vitrine (logo, seções, anel do @rideblan33, carrinho, ☰ no celular). Linhas de beat iguais às
da vitrine (número que vira play, capinha, nome em serif, ficha em mono, botão de preço creme,
VENDIDO em `blood` com o nome riscado).
- **Beat:** capa grande com o play em `fire` no canto, kicker "Beat exclusivo · Gênero", nome
  em serif grande, "prod. @rideblan33", chips em mono (BPM, tom no formato "Bbm // Si bemol
  menor" desde 04/10/2026, duração), tocador com trilha e compartilhar, preço em serif com "Licença exclusiva", os
  pacotes de 2 e 3 com o selo de % off (`fire`, texto escuro, caixa alta) e o botão creme
  "Adicionar ao carrinho" e a lista "Só seu / Contrato no seu nome / MP3 + WAV, entrega em até
  1 dia útil" (o site não fala mais em MP3 320). Sem texto descritivo. No computador o card da beat tape fica
  embaixo da capa. Embaixo, "Beats parecidos".
- **Beat vendido:** selo VENDIDO na capa, preço riscado em `blood`, a caixa "Esse beat já tem
  dono" (fio `blood` à esquerda) e "Podem te interessar".
- **Gênero:** "Beats de <Gênero>" com o gênero em `clay`, texto curto (quantos à venda, faixa
  de BPM, licença), "Tocar todos", preço avulso e pacotes com selo, as capas das tapes no
  computador (4 ou mais: grade 2x2; 3 ou 2: capas em escada, uma por cima da outra, a primeira
  na frente, com sombra; 1: a capa inteira, desde 04/10/2026), gêneros em pílulas (o atual em `fire`), lista na ordem da vitrine (vendidos no lugar deles, desde 04/10/2026), bloco de
  pacotes e a barra do player no pé.
- **Texto pro Google (desde 04/10/2026, texto do Bruno):** só na descrição da busca/prévia e na
  ficha do Product; nada disso aparece na tela. À venda: "NOME: beat de gênero exclusivo
  produzido por @rideblan33, 152 BPM em Ré menor (Dm). Licença exclusiva com contrato, MP3 + WAV,
  por R$ 119." Vendido: "NOME: beat de gênero produzido por @rideblan33 (172 BPM, Lá bemol
  menor), já vendido com licença exclusiva. Ouça e descubra beats parecidos à venda." A ficha
  diz duração, BPM, tom, a tape ("Faz parte da beat tape X, produzida por @rideblan33." ou, sem
  tape, "Produzido por @rideblan33.") e a licença ("... em MP3 e WAV, com entrega em até 1 dia
  útil."). Faltou BPM, tom ou duração: o pedaço some.

## Player do rodapé da vitrine (desde 04/10/2026)

- Capa e nome do beat que está tocando são o link da página dele (`/beat/<nome>`), com a seta
  `›` em `clay` do lado (vira `fire` e o nome sublinha com o mouse em cima).
- Botão de preço: `+ R$119` (creme) põe no carrinho; com o beat lá dentro vira `✓ No carrinho ›`
  (aceso em `fire`) e abre o carrinho. Tirar fica dentro do carrinho. A lista segue com o
  carrinho com `+` e o liga/desliga de sempre.
- Lista: no computador o nome do beat é link da página dele (sublinha em `fire` com o mouse);
  no celular o toque em qualquer parte da linha toca, como sempre.
- Páginas de beat e de gênero: no celular, tocar em qualquer parte da linha toca, inclusive
  no nome. No computador (desde 04/10/2026, como na vitrine) o nome abre a página do beat e
  sublinha em `fire` com o mouse (o vendido não sublinha); o resto da linha toca. A página de
  um beat também abre pela barra do pé (capinha, nome e `›`), que na página do beat aparece
  quando toca um dos parecidos.
- Barra da tape (desde 04/10/2026): o nome e a capa do beat que está tocando levam pra página
  dele (`/beat/<nome>?de=tape`), com a `›` do lado (só beat que existe na loja). Link de um
  beat da tape abre tocando; se o navegador não deixar tocar sem um toque (celular), a barra
  fica no beat e o play pulsa num anel branco até a pessoa tocar (com menos movimento: anel
  parado).

## Gêneros no site (desde 04/10/2026)

- Pílulas de gênero da vitrine: mesma cara de sempre, mas são links da página do gênero (o
  clique filtra ali mesmo; Ctrl/⌘+clique ou segurar abre a página).
- Menu do BEATS (computador, mouse em cima): caixa no fundo do topo, `TODOS OS BEATS` em
  sans caixa alta com fio `wire` embaixo, e os 13 gêneros em duas colunas em serif `read`
  (vira `fire`). Na página de gênero o atual fica em `fire`. No celular não aparece.
- Rodapé (vitrine, perfil, páginas de beat e de gênero): linha "BEATS POR GÊNERO" (mono
  `clay`, caixa alta espaçada) e os gêneros em serif `read`, acima do selo, com fio `wire`.
- A lista de gêneros mora em `functions/_lib/generos.js` (a vitrine leva o mesmo HTML colado).

## Faixa do PIX aguardando (desde 03/10/2026)

Barra embaixo, de ponta a ponta, fundo `deep` com o fio de cima em `fire`. Bolinha `fire`,
"Seu PIX de R$ X tá aguardando" em bone negrito, os itens embaixo em IBM Plex Mono `read`.
Dois botões de 48px: VER O PIX (creme `bone`, texto escuro) e DESCARTAR (fantasma com
borda `wire`). No computador o miolo fica com 560px no centro. Mockup no artifact "PIX no
celular". O layout da tela do PIX segue o de sempre (escolha de 03/10), com o COPIAR em
creme e 44px de altura.
