# Análise de usabilidade: caramujorecords.com.br (foco mobile)

Data: 03/07/2026. Método: leitura completa do `index.html` (2.730 linhas) + renderização do site em viewport de iPhone (390×844) com testes de interação: carrinho, checkout, modal de pacotes, filtros, busca e tooltip de licença. Medi áreas de toque e tamanhos de fonte computados no navegador, então os números abaixo são medidos, sem achismo.

Nota: o sandbox não alcança o domínio em produção, então rendi o `index.html` local. O repositório tá limpo e sincronizado com a main que faz deploy, é o mesmo código que tá no ar. SoundCloud, Mercado Pago e GA não carregam no sandbox; o que depende deles eu validei pelo código.

O site tá bem acima da média pra estúdio independente: checkout próprio com PIX, contrato automático, upsell no carrinho, catálogo com player. A base é forte. Os problemas são quase todos de mobile, e mobile é onde teu cliente tá.

---

## Prioridade 1: tá custando venda hoje

### 1. Os links do menu têm 10px de altura de toque

O pior achado. Os `<a>` da nav são elementos inline: o `line-height:54px` desenha o texto no lugar certo, mas a área clicável é só a caixa do texto. Medi com hit-test: tocar 8px acima ou abaixo do texto "Beats" não faz nada (acerta o `<li>`, que não é clicável). Um polegar tem ~40px de precisão; o alvo tem 10px. Na prática o cliente tenta abrir "Pacotes" no celular, erra 3 de 4 toques e acha que o site travou.

**Correção (2 linhas de CSS):** `.nav-links a{display:flex;align-items:center;height:54px;}` e ajustar o `line-height`. Alvo de toque vira a barra inteira.

### 2. O botão CARRINHO fixo cobre botões de compra

O botão flutuante mede 188×39px e fica em cima de conteúdo em várias telas que capturei: cobre o "Adicionar · R$219" do pacote 2 Beats, o preço da Mixagem, o rodapé do último beat da página e metade do "ENVIAR MENSAGEM" do formulário de contato. O cliente rola até o CTA e o botão de finalizar tá embaixo do carrinho.

**Correção:** três mudanças que se somam. (a) Esconder o botão quando o carrinho tá vazio, ele só informa "0" e ocupa tela. (b) No mobile, encolher pra um círculo com ícone + badge numérico (~56px), no canto. (c) `padding-bottom` extra (~80px) nas seções `#contact` e `.packs` pra nada nascer embaixo dele.

### 3. Todo campo de texto dispara zoom automático no iPhone

O Safari do iOS dá zoom forçado em qualquer input com fonte menor que 16px. Medido: busca do catálogo 12,8px, cupom 12px, campos do checkout 13,6px, formulário de contato 13,1px. Ou seja: o cliente toca no campo de email do checkout, a tela dá zoom, o layout desloca, ele digita meio perdido e precisa pinçar pra voltar. Isso no passo mais sensível do funil.

**Correção:** no media query mobile, `font-size:16px` em `input, select, textarea`. Mantém o visual no desktop.

### 4. 9 dos 13 filtros de gênero ficam invisíveis

A régua de gêneros tem 1.344px de conteúdo numa janela de 356px: só Trap, Boom Bap, Plug e metade de Hood Trap aparecem. Dá pra arrastar, mas nada indica isso (sem fade, sem seta, sem meio-chip cortado de forma óbvia). Drill, Funk, Detroit e os outros 6 simplesmente não existem pra quem não descobre o gesto. E a linha do "Todos" em cima, sozinha com uma barra vazia do lado, parece elemento quebrado.

**Correção:** duas opções. Barata: gradiente de fade na borda direita + deixar o último chip visivelmente cortado ao meio (indica que continua). Melhor pra 13 gêneros: chips com `flex-wrap` em 2-3 linhas no mobile, tudo visível de uma vez, "Todos" incluído na mesma grade.

---

## Prioridade 2: encontrar beat dá trabalho demais

### 5. 121 beats em 14 páginas de 9

Pra ouvir o catálogo inteiro são 13 toques em "Próximo", e cada troca de página joga o scroll de volta pro topo da seção. Quem não sabe o nome do beat (todo mundo que chega de fora) desiste antes da página 5. A busca só serve pra quem já conhece o catálogo.

**Correção:** trocar a paginação por botão "Carregar mais 9" que anexa os cards embaixo (mantém o modo rádio funcionando, os widgets seguem na ordem). Alternativa mínima: subir pra 18 por página no mobile. Os iframes já têm lazy loading, o custo de performance é baixo.

### 6. Texto de 8px

Os chips de gênero/BPM/tom renderizam a 8px no viewport de 390px (`font-size:.5rem` no breakpoint 480). Labels do rodapé e metadados ficam entre 9 e 10px. BPM e tom são informação de decisão de compra pra quem vai gravar por cima, e tá ilegível.

**Correção:** piso de 11px pra qualquer texto no mobile. Nos chips, `.65rem` já resolve.

### 7. O tooltip da licença cobre o texto que o cliente tava lendo

Ao tocar em "licença exclusiva ⓘ", o balão abre por cima da própria frase (capturei isso em tela). A informação do balão é ótima, das melhores copy do site. Só o posicionamento atrapalha.

**Correção:** abrir o balão abaixo da linha, nunca sobre o trigger. No touch, um `bottom-sheet` simples seria ainda mais confortável.

### 8. "Esconder vendidos" não mostra estado

O botão é de alternância, mas o estado ativo só muda a cor da borda. Cliente toca, some um monte de beat, e ele não entende o que aconteceu nem como desfazer. Mostrar vendidos por padrão como prova social é uma boa decisão, o problema é só a legibilidade do toggle.

**Correção:** estado ativo com fundo preenchido + texto trocado ("Mostrando só disponíveis ✓"). Já dá contexto de onde está e do que acontece ao tocar de novo.

---

## Prioridade 3: fricções de checkout e fluxo

### 9. O carrinho abre em tela cheia a cada item adicionado

No mobile o painel ocupa 100% da largura. Cliente quer 3 beats avulsos: adiciona 1, carrinho cobre tudo, fecha, rola de volta, adiciona outro, carrinho cobre de novo. Abrir na primeira adição faz sentido (confirma que funcionou e mostra o upsell). Da segunda em diante, um toast "✓ No carrinho" + badge pulsando já confirma sem sequestrar a tela.

### 10. Campo de cupom sempre exposto

Campo de cupom aberto no carrinho ensina o cliente a sair do site pra caçar código no Google (e teu funil morre lá). Colapsar num link discreto "Tem cupom?" mantém a função sem o convite à fuga.

Relacionado, de negócio: os códigos e limites de uso estão legíveis no código-fonte da página (`CARAMUJO25`, `RIDE20` etc. no objeto `COUPONS`). Qualquer pessoa que aperte F12 vê. A validação real acontece no servidor, mas os códigos em si vazam. Vale mover a lista pro backend e deixar no front só a chamada de validação.

### 11. Modo rádio rouba o scroll do usuário

Quando acaba a última faixa da página, o site vira a página sozinho e faz `scrollIntoView` pro topo do catálogo. Se o cliente tava lendo os serviços ou preenchendo o formulário de contato enquanto ouvia, a página pula no meio da digitação. O modo rádio é um baita diferencial; só o scroll automático que precisa de freio.

**Correção:** só rolar se o usuário já estiver com o catálogo visível (checar com `IntersectionObserver` ou comparar `scrollY` com a posição da seção). Fora dela, seguir tocando sem mexer no scroll.

### 12. Baixar o contrato depende de pop-up + diálogo de impressão

`window.open` + `print()` pra "salvar como PDF" é frágil justo no celular: bloqueador de pop-up, e o diálogo de impressão do iOS confunde quem nunca salvou PDF por ali. E aqui tem um agravante que confirmei nas functions: o anexo do contrato só vai no email do produtor (a única chamada com `attachments` no `create-payment.js` é a tua notificação). O comprador recebe só a confirmação com prazos. Se o botão de download falhar, o cliente fica sem nenhuma via do contrato, e o texto da tela diz que ele é "a sua garantia".

**Correção:** anexar o contrato também no email do comprador (a function já monta o HTML, é repetir o bloco de anexo no email de confirmação). Isso resolve o caso mesmo se o botão falhar. Depois, se quiser refinar, gerar PDF no servidor com link de download direto no lugar do `window.open`.

### 13. Sem WhatsApp

O formulário de contato + email + Instagram cobrem o caso "mandar mensagem formal". Só que teu público compra beat pelo celular e resolve a vida no WhatsApp; formulário tem atrito e latência de resposta. Um link `wa.me` com mensagem pré-pronta ("Salve! Vi o beat X no site...") tende a converter dúvida em conversa na hora. Decisão tua, expõe teu número; um número comercial separado resolve.

---

## Ajustes menores (baratos, faz junto)

**Texto duplicado nos serviços.** O título "Do beat ao lançamento" e o subtítulo repetem a mesma frase. Trocar o subtítulo por algo que agregue, tipo prazo médio de entrega.

**Select de assunto sem seta.** No formulário de contato, `appearance:none` removeu a seta do dropdown e nada foi colocado no lugar. "Compra de beat" parece texto fixo, cliente não descobre que tem opções. Adicionar um `▾`.

**Âncoras encostam na nav fixa.** Sem `scroll-padding-top`, o topo das seções fica a 2px da nav de 54px. `html{scroll-padding-top:64px;}` dá respiro.

**Pacote "1 Beat" igual ao avulso.** R$119 nos dois caminhos, com fluxos diferentes (card do pacote abre modal de escolha; card do beat adiciona direto). Faz papel de âncora de preço, ok, mas o card podia dizer "= preço avulso" pra não parecer pegadinha.

**Badge do carrinho conta itens, não unidades.** Pacote de 3 beats + 2 mixagens mostra "2". Cosmético, mas confunde na conferência.

---

## O que eu faria primeiro

Itens 1, 2, 3 e 4 são ~30 linhas de CSS/JS no total e atacam exatamente o celular na mão do teu cliente: menu que não clica, botão que cobre compra, zoom indesejado no checkout e 9 gêneros invisíveis. Dá pra resolver os quatro numa sessão só, sem tocar em nada de pagamento. Depois disso, item 5 (carregar mais) é a mudança com mais impacto em descoberta de beat, e o 13 (WhatsApp) a de maior potencial de conversa nova.

Os screenshots que embasam cada achado estão em `screenshots-analise/` nesta mesma pasta (m1 a m6: jornada completa; i1 a i6: carrinho, checkout, modal de pacotes, tooltip e filtros).
