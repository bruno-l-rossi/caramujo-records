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
selo em SVG primeiro (`/assets/brand/selo-creme.svg`), depois o PNG de 180px pro iPhone
(`/assets/brand/icone-180.png`, também como `apple-touch-icon`). Em código: `FAVICON` em
`functions/_lib/perfil.js`.

## Logo do topo (padrão de todas as páginas)

Toda página do site, inclusive as que ainda vão existir, usa no cabeçalho o mesmo logo
horizontal: selo + CARAMUJO RECORDS em imagem (`/assets/brand/caramujo-h.webp`, 296x54).
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
  dias, fora a nova, com pelo menos 10. Sem ninguém com 10, não aparece.
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
  "@rideblan33", "X beat tapes completas" e o chip BEATS · MIX · MASTER.
Nenhuma das duas leva texto de cupom. Desenho em `assets/story.js` (artePerfil, arteCatalogo).

