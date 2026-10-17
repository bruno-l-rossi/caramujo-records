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

## Aba Músicas do perfil (desde 05/10/2026)

O bloco preto do /rideblan33 ganha duas abas: **MÚSICAS n | BEAT TAPES n** (Schibsted 700
caixa alta, espaçada; a ativa branca com traço branco embaixo, a outra cinza `#8a8a8a`; o n
em peso normal). Sem música no ar, o bloco volta a ser só "Beat tapes" como antes.
- **Destaques** (a ordem é do Bruno, no painel): fileira de capas grandes que desliza. 4 por
  linha no computador (setas redondas no cabeçalho quando passa de 4), 76% da largura no
  celular (a próxima aparece na beirada). Play branco redondo no canto de baixo da capa só
  quando tem áudio; sem áudio, a capa leva pro Spotify. Embaixo: nome (16px, 700),
  artistas em cinza e os botões redondos do Spotify/YouTube (só dos links que existem). A
  que está tocando ganha a barra fina branca do andamento embaixo.
- **Recentes** (FORA DO PERFIL desde 17/10/2026, teste do Bruno pra aba ficar mais enxuta;
  a chave é `RECENTES_NO_PERFIL` em functions/_lib/musicas.js e os dados seguem no painel.
  Sem nenhum destaque, a lista aparece pra aba não ficar vazia. Quando volta: a mais nova
  primeiro, pela data de lançamento; ou na ordem que o Bruno arrastar no painel): lista na caixa `#141414` com borda `#1f1f1f`: capinha 52px, nome,
  artistas, data "jul 2026" em mono (só no computador), botões e o play.
- **Chamada no fim:** caixa com borda `#2a2a2a`, ícone do Spotify, só o título "OUVIR O
  PORTFÓLIO COMPLETO" e a seta ↗ (desde 06/10/2026, sem subtítulo). Abre o perfil de
  artista no Spotify.
- **Música inteira** (desde 06/10/2026; antes eram 30 s): do arquivo da pasta do artista no
  catálogo. Toca no mesmo mini player do topo: capa da música, nome, artistas; tocar no
  player abre a música no Spotify. Acabou, vai pra próxima da página (destaques e depois
  recentes); depois da última, para.
- **Botão do topo muda com a aba:** em Músicas é "OUÇA O ÚLTIMO LANÇAMENTO" (toca o 1º
  destaque e segue em ordem até as recentes); em Beat tapes, "OUÇA A ÚLTIMA BEAT TAPE".
  Abaixo de 380px o logo do topo do perfil fica com 104px e o texto do botão mais junto,
  pra caber em 360px.
- **Prévia:** com o "No ar" desligado, só quem está logado no painel vê a aba, com uma faixa
  tracejada avisando.

Em que aba abre (escolha do Bruno): Beat tapes quando vem da página de beat ou de gênero, de
uma tape, do "Ver tudo"/"Portfólio completo" da pasta de artista, da página de erro ou do
story do catálogo. O resto (vitrine, @ da pasta, story do perfil, link, bio, Instagram,
Google, redes, direto) abre em Músicas.

## Quem já gravou (desde 16/10/2026)
Página `/rideblan33/artistas` e a linha no fim da aba Músicas (mockup aprovado: canvas linha M). Fundo preto do bloco do perfil (`--preto`, `--folha` nos cartões, `--div` nas linhas), texto em Schibsted Grotesk; nada de cor fora da paleta.
- Topo: logo `caramujo-h` (132px no celular, 168px no computador) e o botão-pílula "@rideblan33" que volta pro perfil. Kicker "PORTFÓLIO DO @RIDEBLAN33", h1 "Quem já gravou" 40/56px 800, frase com os números da lista (nunca inventar), busca em pílula.
- Cartão do artista aberto: foto redonda (96px celular, 180px computador; sem foto = iniciais em `#1c1c1c`), "N músicas com @rideblan33" (sem o "o" desde 17/10/2026), botão branco "Spotify". Faixas com capa 48px, nome, quem canta e a seta ↗; 6 no celular e 8 no computador (2 colunas) + pílula "Ver as N músicas".
- Grade: fotos redondas, 3 colunas no celular, 4 a partir de 600px, 6 no computador; o artista aberto ganha aro branco. Ordem (desde 17/10/2026) = mais ouvintes mensais no Spotify primeiro; diferença pequena (menos de 35%) conta como empate e vence quem tem mais faixas.
- Linha da aba Músicas: título "Quem já gravou", "N artistas ›", até 7 fotos sobrepostas (quem tem foto primeiro) + "+N", e a frase "A, B, C e mais N artistas cantaram em músicas produzidas pelo @rideblan33." Entrou no lugar do "Ouvir o portfólio completo" (saiu em 16/10/2026). Desde 17/10/2026 termina na chamada "VER TODOS OS N ARTISTAS →": pílula de borda branca 50% (48px de altura, Schibsted 700 12px caixa alta espaçada), a linha toda no celular e do tamanho do texto a partir de 601px; no mouse vira branca com texto preto (igual ao "Mix & Master" do "Quer um som assim?").
- Fotos e capas saem do nosso R2 (capa/grv-*, capa/gra-*), não do endereço do Spotify (desde 17/10/2026). Faixa sem capa no R2 usa a capa do Spotify anotada na lista.
- Cartão @rideblan33 (rodada N, 17/10/2026): artista da lista como os outros (ordem por ouvintes, foto do Spotify), kicker "PRODUTOR E ARTISTA", "N músicas como artista". Fica fora da fileira do perfil e das frases "A, B, C e mais".
- Linha do perfil (rodada N, opção D): fileira que desliza com até 20 fotos (desde a rodada O) redondas grandes (96px celular, 128px computador) e o nome embaixo; último cartão branco com "+N" e "ver todos", nome "Ver todos"; no título, link "Ver todos ›" sublinhado. Cada foto abre o artista na página.
- Rodapé: o mesmo da vitrine (gêneros em Cormorant 1.05rem cor --read, kicker em IBM Plex Mono --clay).
- Faixas do cartão: as mais tocadas primeiro (faixas de 30% nos plays); plays parecidos ou abaixo de mil, a mais nova antes. A ordem dos artistas pode ser a do Bruno (painel: arrastar) ou a padrão por ouvintes.

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
o PEDIDO CONFIRMADO leva o selo creme de 48px no lugar do 🐌, e os avisos não têm ⚠.
Desde 11/10/2026 o PEDIDO CONFIRMADO é centrado: selo, "Pagamento aprovado" em IBM Plex
Mono `fire`, "Pedido confirmado" em Bebas `cream`, uma frase em `read`, o botão principal e
FECHAR fantasma; assinatura "@rideblan33 · Caramujo Records" em `dim`. Termos não marcados:
aviso dentro da caixa dos termos, com a mesma caixa de erro (fio `blood`).
Carrinho: item com desconto mostra o preço cheio riscado em `dim` e o novo em `cream`; o
rodapé lista Total sem desconto, Desconto e Cupom (em `fire`) antes do TOTAL.
Barra dos beats (16/10/2026, opção A): busca (borda `clay`, lupa `amber`, IBM Plex Mono) + ✦ (46×46, `amber`) + Gênero e Ordem (botões `deep` com rótulo pequeno em `dim`, valor em `bone`, ▾ em `amber`; gênero escolhido em `fire`) + chave Só à venda (trilho `wire`, ligada em `fire`; desligada ao abrir). Embaixo: "N BEATS" e "página X de Y". Menus: no computador descem do botão (fundo `deep`, borda `clay`, sombra; Gênero em 2 colunas com ✓ em `fire`); no celular (≤860px) viram folha que sobe de baixo com fundo escuro, alça, título e ×, gêneros em botões (o escolhido cheio de `fire`). No celular: busca e ✦ na 1ª linha; Gênero, Ordem e Só à venda na 2ª, sem os rótulos pequenos. Sem a paginação de cima (fica a de baixo).

Leve mais (16/10/2026, opções B e D): a faixa de cima saiu. Na linha da contagem, link em IBM Plex Mono `fire` com sublinhado tracejado `clay` ("Leve 2 ou mais e pague menos ▾") que abre a tabela (mesmo menu da barra: desce no computador, folha no celular): 1 a 5 beats com o total e o % off em `fire`, e o pé em `read`. No botão de comprar, com beat no carrinho: R$119 pequeno riscado (`dim`, risco `blood`) em cima e "+ R$100" embaixo. O texto abaixo é do desenho antigo (12/10).

Leve mais, pague menos (12/10/2026): faixa em cima da lista com borda `clay` e fundo fire a 8%, kicker em `fire`, pílulas em IBM Plex Mono com o número em `fire` e o % em `read`. No carrinho, régua em `deep` com 5 barras (`fire` cheias, `loam` vazias) e os totais embaixo; a linha do desconto ganha faixa fire a 12% com o valor em `cream`.
Beat vendido na lista (12/10/2026): no lugar do preço, um link com borda `wire`, "VENDIDO" pequeno em `blood` clareado (`color-mix` de 68% `blood` com `bone`, desde 14/10/2026: o `blood` puro some em texto pequeno no fundo escuro) em cima e "Parecidos ›" em `bone` embaixo; hover com borda `fire`. Leva pros parecidos na página do beat (#parecidos).
Pedido de serviço (12/10/2026): passo a passo com bolinhas (`fire` feito, anel no atual, `loam` o que falta), formulário em `black` com campos `mole` e o botão `bone`; o que foi mandado num quadro com os links em `fire`.
Fique por dentro (vitrine, depois da lista de beats): caixa `deep` com borda `wire`, kicker
em `fire`, título em Bebas, campo de e-mail + botão `fire` lado a lado (empilhados no celular).

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
  sublinha em `fire` só com o mouse em cima do texto (o link tem a largura do nome; a cor não
  muda; o vendido não sublinha); o resto da linha toca. A página de
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
  (vira `fire`). Na página de gênero o atual fica em `fire`.
- Menu ☰ do celular (vitrine e páginas de beat/gênero, desde 04/10/2026, opção A): BEATS abre
  e fecha um acordeão (seta que vira pra cima; aberto, BEATS fica em `fire`). Dentro, primeiro
  "TODOS OS BEATS" em destaque: caixa com fio `clay`, fundo `fire` a 10%, texto `fire` em caixa
  alta espaçada, "N à venda" em mono `bone` e `›` em serif. Embaixo, os 13 gêneros em duas
  colunas em serif `read` com quantos estão à venda em mono `dim` (gênero sem beat à venda fica
  sem número). Na página de gênero o atual fica em `cream` sublinhado em `fire`. O número só
  aparece no celular.
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

## Onde mora o visual da vitrine (desde 10/10/2026)

O CSS da vitrine saiu do `index.html` e mora em `assets/vitrine/vitrine.css` (o código, em
`assets/vitrine/vitrine.js`). Os tokens desta página ficam no `:root` do topo desse arquivo.
Regra nova de visual na vitrine entra lá, nunca num `<style>` dentro do `index.html` (o
`teste46` reprova). Mexeu no arquivo: o `?v=` dele no `index.html` troca junto
(`node testes/vitrine-versao.mjs`), senão quem já visitou vê o visual velho por até 1 dia.

## Página do pedido (desde 10/10/2026)

`/pedido/<código>`, a entrega na hora dos beats (desenho aprovado no mockup do item 6, só a
parte dos beats). Marca terrosa, igual à vitrine: fundo `black`, topo com o logo padrão e fio
`wire`, kicker em sans caixa alta `fire`, nomes em Cormorant `cream` caixa alta, fichas e
avisos pequenos em IBM Plex Mono `read`/`dim`. Cada beat numa caixa `deep` com borda `wire`
de 1px e cantos retos: capa de 64px, nome, ficha e dois botões de 46px lado a lado (WAV
cheio em `bone` com texto `deep`; MP3 fantasma com borda `wire`). Contrato numa linha com
borda `wire`. Avisos (serviço, pedido de teste) com fio de 3px em `fire` à esquerda;
`blood` nunca aparece (não é erro nem vendido). No PEDIDO CONFIRMADO da vitrine, o botão
"↓ BAIXAR SEUS ARQUIVOS" é o botão principal do checkout (`fire`), e o contrato sai de lá (está na
página do pedido). Cabeçalho igual ao da vitrine (`_lib/topo.js`) e rodapé no fim da tela.

## Página do beat no computador (14/10/2026)

A partir de 861px as duas colunas terminam na mesma altura, à venda e vendido. O card "Da beat
tape" desce pro fim da coluna da esquerda; se a esquerda for mais alta, a compra (à venda) ou o
quadro "Esse beat já tem dono" (vendido) desce na direita. No celular nada muda.


## Hero da vitrine com o logo (17/10/2026, rodada N)
O nome do hero é o logo: `assets/brand/caramujo-wordmark.svg`, a letra do `caramujo-v.webp` vetorizada (CARAMUJO #eae2d0, RECORDS #ab7d4c espaçado e alinhado à esquerda, como no `caramujo-h`). Largura 4.55em do tamanho do título (o mesmo espaço do texto antigo). O texto fica no alt do h1.

## Ajuda na página do beat (17/10/2026, rodada O)
Botão-pílula creme "AJUDA" fixo no canto de baixo à direita (46px, ícone de balão com ?), sobe 66px quando a barra do tocador aparece. Abre uma folha (celular: de baixo, largura toda; computador: 380px acima do botão) com título em Cormorant "Dúvida sobre o <beat>?", o texto "Dúvidas sobre licença, entrega, ajustes no beat, etc." e um botão só: "Direct no Instagram" (@rideblan33). Sem WhatsApp no site.
