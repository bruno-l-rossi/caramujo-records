# Site otimizado — o que mudou (v8, revisado)

## Rodada 8 — usabilidade mobile + botão da sorte + cupons no servidor

Baseada no relatório `analise-usabilidade-mobile.md`. Roteiro de teste item a item em `VALIDACAO.md`.

**Mobile (P1)**
- Links da nav com área de toque de 54px (antes o alvo real tinha 10px de altura; o toque errava 3 de 4 vezes).
- Botão CARRINHO: escondido com carrinho vazio; no mobile vira círculo de 58px com badge, cobrindo bem menos conteúdo. Seções de serviços e contato ganharam respiro no fim.
- Inputs, selects e textareas com 16px no mobile: mata o zoom automático do iOS ao focar.
- Filtros de gênero em linhas com wrap: os 13 gêneros + "Todos" visíveis de uma vez (antes 9 ficavam escondidos num scroll sem indicação).

**Catálogo**
- Paginação numerada (1 … 6 7 8 … 14): pula direto pra qualquer página, inclusive o fim do catálogo.
- Botão "✦ Estou com sorte": sorteia um beat disponível respeitando o filtro ativo, rola até o card, destaca e dá play.
- Chips de gênero/BPM/tom com piso de ~11px (estavam em 8px).
- Balão da licença no mobile abre como folha fixa no rodapé (não cobre mais a frase que o cliente tava lendo).
- "Esconder vendidos" com estado ativo preenchido.

**Carrinho e checkout**
- Painel abre sozinho só na 1ª adição; das seguintes, toast "✓ ... no carrinho" (antes cobria a tela toda a cada item).
- Badge conta unidades (pacote de 3 + 2 mixagens = 5).
- Modo rádio não rouba mais o scroll: só acompanha a música se o catálogo estiver visível na tela.
- Selos de desconto real vs avulso: 8% OFF no pacote 2 Beats, 16% OFF no 3 Beats, 13% OFF no Mix + Master.
- Pop-up do contrato bloqueado agora mostra toast avisando que o contrato foi por email (antes era um alert pedindo pra liberar pop-up).

**Backend (functions)**
- Cupons saíram do código-fonte da página: agora vivem em `functions/coupons.json` (não é servido publicamente). Validação via novo endpoint `/api/validate-coupon`; incremento de uso pelo webhook direto no JSON.
- Contrato assinado agora vai em anexo também no email do comprador (cartão no create-payment, PIX no webhook). Antes só o produtor recebia o anexo; se o botão de download falhasse, o cliente ficava sem via.

**Miúdos**
- Instagram Direct como canal principal de contato (`ig.me/m/rideblan33`), com selo "resposta mais rápida".
- Seta no select de assunto do formulário (tava invisível).
- `scroll-padding-top`: âncoras não encostam mais na nav fixa.
- Pacote "1 Beat" avisa que é o mesmo preço do avulso.
- Subtítulo dos serviços não repete mais o título.

## Rodada 7 — SEO: correção do diagnóstico do Search Console

Google Search Console apontou 2 erros de "Snippets do produto" e 4 de "Listagens do comerciante" no schema.org dos beats.

- **image (crítico):** cada `Product` agora leva `og-image.png` como capa. Beats não têm arte individual; usar a imagem oficial do site resolve o erro sem depender de 121 artes novas.
- **description:** gerada por beat a partir do gênero, BPM e tom (ex: "Beat trap, 128 BPM, tom Emaj...").
- **hasMerchantReturnPolicy:** declarado como `MerchantReturnNotPermitted` — condiz com a licença exclusiva e definitiva do contrato (a faixa sai do catálogo na venda).
- **shippingDetails:** entrega digital, frete R$0, `handlingTime` 0 dia e `transitTime` até 1 dia — alinhado ao prazo de "até 24 horas" pro beat de catálogo no `termos-de-licenca.pdf`.
- **aggregateRating / review:** não críticos, deixados de fora de propósito. Preencher com nota/depoimento fabricado viola as diretrizes do Google (risco de penalização). Voltar aqui quando houver depoimento real de comprador.

## Rodada 6 — mobile e busca

- Nav mobile: CTA "OUVIR BEATS" escondido em telas ≤860px (já existe no hero) e, abaixo de 480px, o nome escrito da logo some (fica só o selo). Os 4 links cabem inteiros na tela — verificado com screenshot em 390px.
- Busca do catálogo em destaque: barra esticada ocupando o espaço livre da linha, borda sépia (era quase invisível no marrom escuro), texto e placeholder maiores e mais claros, brilho âmbar no foco. Vale pras barras de cima e de baixo.
- og-image.png nova na pasta (lockup oficial: selo + CARAMUJO RECORDS em serif, fundo carvão limpo).


## Rodada 5

- Hero em crescendo: 40+ artistas · 200+ faixas · 2.500.000+ streams (saiu "8 anos de estúdio").
- 2 beats avulsos no carrinho agora sugere o terceiro: "Leve 3! No pacote saem por R$299 — economize R$58".
- Upsell de serviços: só Mixagem sugere o combo ("o master sai por R$50 em vez de R$79"), só Masterização idem ("a mix sai por R$120"), e mix + master separados mostra o combo por R$199 em vez de R$228. Todos com economia de R$29 em selo, link "Ver Mix + Master →". Some se o combo já está no carrinho.
- Upsell de beats e de serviços podem aparecer juntos se o carrinho tiver os dois casos.


## Rodada 4 — upsell turbinado

- Bloco do carrinho com destaque: borda lateral acesa, fundo âmbar translúcido, etiqueta "MELHOR CUSTO-BENEFÍCIO" em cima.
- Economia em destaque: "economize R$X" vira selo âmbar com texto escuro — impossível não ver.
- Escada de upsell completa, sempre apontando o próximo degrau:
  - 1 beat avulso → "2 beats saem por R$219, economize R$19"
  - 2 avulsos → mesma economia, sobre os beats que já estão lá
  - 3+ avulsos → pacote de 3 (−R$58)
  - Pacote de 1 → "o segundo beat sai por R$100 em vez de R$119" (−R$19)
  - Pacote de 2 → "o terceiro sai por R$80 em vez de R$119" (−R$39)
  - Pacote de 3 → nada (já está no topo do custo-benefício; empurrar mais seria ruído)


## Rodada 3 de revisões

- Hero: "40+ artistas" virou "2.500.000+ streams" (número cheio chama mais que abreviação).
- CTA secundário: "Mix & master".
- Ordenação e "Esconder vendidos" agrupados lado a lado, mesma estética (mesmo componente visual), separados da busca e dos gêneros.
- **Novo — empurrão de pacote no carrinho:** com 1 beat avulso no carrinho, aparece "2 beats saem por R$219 — economiza R$19"; com 2, mostra a economia real; com 3+, aponta o pacote de 3 (−R$58). Link rola pros pacotes. É a resposta ao risco dos CTAs pularem os pacotes: o melhor vendedor de pacote é o carrinho, não o hero.


## Rodada 2 de revisões

- Balão da licença: 360px de largura, texto enxuto — só o que não está no parágrafo (contrato no seu nome + uso comercial liberado).
- Beat vendido: botão do mesmo tamanho do "Adicionar ao carrinho", fundo vermelho-tijolo com texto creme ("✕ Vendido"), desabilitado. Nome do beat segue riscado.
- Ordenação: só "Ordem padrão" e "Ordem aleatória" (a sequência do link do SoundCloud era posição dentro do álbum, não cronologia — descartada). Selecionar "aleatória" de novo reembaralha.
- Toggle "Esconder vendidos" saiu dos gêneros e ficou ao lado da ordenação.
- Instagram removido da nav (segue no contato e footer).
- CTA secundário do hero: "Ver pacotes" virou "Mix & master pra sua faixa" (#services). Razão: pacotes é a primeira seção após o hero, um scroll resolve; serviços é o que fica enterrado e mix/master é seu segundo produto. Fácil reverter se não curtir.


Substitua `index.html` e `_headers` no repo pelos desta pasta. Os SVGs estão aqui só pro preview local (abra o index.html no navegador).

## Revisões aplicadas nesta versão

- Quote do hero sem atribuição — quem conhece a tag reconhece, como você definiu.
- Filtro calmo/pesado removido.
- Seção "Quem faz o som" removida (a prova social ficou no hero).
- Ordenação: Padrão / Mais recentes / Mais antigos. A ordem vem do número sequencial no fim do link do SoundCloud de cada beat (`nocaute-1`, `retro-2`...), assumindo 1 = mais antigo. **Confirme se é isso**; se for o inverso, me avisa que é uma linha.
- Vendidos: visíveis por padrão, na ordem normal do catálogo, mesmo design dos outros — só o nome riscado em vermelho e, no lugar dos botões, a barra "✕ Vendido — licença exclusiva", sem ação possível. Botão "Esconder vendidos" nos filtros pra quem quiser ver só o disponível.
- Licença exclusiva: virou balãozinho. Abre no hover ou no clique do ⓘ, fecha sozinho quando a pessoa clica em qualquer outro lugar.
- Stems removidos de tudo que o usuário vê: cards de beat (botão único "Adicionar ao carrinho · R$119" ocupando a largura), pacotes (um botão por pacote), serviço de beat personalizado (R$149, botão único). A tubulação interna do carrinho/checkout ficou intacta — nada quebra.
- Título da aba: "Caramujo Records — Beats exclusivos, mix e master por @rideblan33".

## Sua dúvida: o que acontece no último beat da página

Antes: parava e morria. Agora é modo rádio — quando o último beat da página termina, o site avança pra próxima página sozinho, rola até o primeiro beat e dá play. Só para de verdade no último beat da última página. Quem deixar tocando ouve o catálogo inteiro.

## Da versão anterior (mantido)

- Ordem: hero → pacotes → beats → serviços → contato.
- Prova social no hero: 8 anos · 200+ faixas · 40+ artistas.
- Player contínuo dentro da página (play pausa os outros; fim toca o próximo).
- 9 beats por página.
- Nav: CTA "OUVIR BEATS", link do Instagram.
- Técnicos: schema.org dos produtos, grão estático no mobile e sob prefers-reduced-motion, CSP com SoundCloud no `_headers`.

## Pra testar

Player contínuo e modo rádio precisam de internet. Teste: play num beat → play em outro (primeiro pausa) → vá até o 9º beat da página, deixe acabar → deve virar a página e tocar o 10º. Balãozinho da licença, ordenação e "esconder vendidos" funcionam offline.
