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

- Selo do caramujo (espiral desenhada a traço) em creme ou sépia. Aparece na nav, no hero (grande, translúcido, à direita) e no rodapé.
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

Público acessa 80%+ pelo celular, vindo do Instagram (bio e Direct). Mobile-first sempre. Site atual é one-pager: hero → pacotes → catálogo de beats (com player SoundCloud por card) → serviços → contato. Compra via carrinho próprio com PIX e cartão (Mercado Pago).
