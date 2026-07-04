# Roteiro de validação — Rodada 8

Como testar cada mudança, uma a uma. Divide em 3 blocos: o que dá pra ver **antes do push** (arquivo local no navegador), o que precisa do **site no ar**, e o que precisa de **uma compra de verdade**.

Pra testar como celular no desktop: Chrome → F12 → ícone de celular (Ctrl+Shift+M) → escolhe "iPhone 12 Pro" ou similar. Mas o teste que vale é no teu celular mesmo, depois do deploy.

---

## Bloco A — dá pra validar já, abrindo o index.html local (ou no site após deploy)

**1. Menu clica em qualquer altura da barra**
No celular, toque nos links Pacotes / Beats / Serviços / Contato mirando de propósito um pouco acima e um pouco abaixo do texto. Todos os toques devem funcionar. Antes, só o toque exato em cima do texto (10px) pegava.

**2. Botão do carrinho some quando vazio e vira círculo no mobile**
Abra o site: sem item no carrinho, não existe botão flutuante. Adicione um beat: aparece um círculo com ícone de carrinho e o número. Confira que ele não cobre mais o "ENVIAR MENSAGEM" do contato nem os botões dos pacotes (as seções ganharam respiro no fim).

**3. Campo de texto sem zoom forçado (iPhone)**
No teu iPhone, toque na busca do catálogo e depois nos campos do checkout. A tela não deve mais dar zoom sozinha. (No Android e no desktop nunca deu; esse teste só faz sentido no iOS.)

**4. Todos os 13 gêneros visíveis**
Na seção de beats, os filtros agora quebram em linhas. Confere que Drill, No Melody, Bounce e cia aparecem sem precisar arrastar nada, e que "Todos" tá na mesma grade.

**5. Paginação numerada**
Abaixo da busca: ← 1 2 … 14 →. Toca no 14: vai direto pro fim do catálogo. Navega pro meio (página 7): deve mostrar "1 … 6 7 8 … 14" com a atual preenchida em vermelho.

**6. Chips legíveis**
Os chips TRAP / 128 BPM / EMAJ nos cards devem estar legíveis no celular (~11px). Antes tinham 8px.

**7. Balão da licença**
No celular, toca em "licença exclusiva ⓘ". O balão deve abrir fixo no rodapé da tela, sem cobrir a frase. Toca fora dele pra fechar.

**8. "Esconder vendidos" com estado visível**
Toca no botão: ele fica preenchido (fundo caramelo) e o texto muda pra "Mostrar vendidos". Toca de novo: volta ao normal e os vendidos reaparecem.

**9. ✦ Estou com sorte**
Toca no botão ao lado dos filtros. Deve: pular pra página do beat sorteado, rolar até o card, acender uma borda vermelha por ~3s, mostrar o toast com o nome e dar play sozinho. Testa também com um filtro ativo (ex: Boom Bap): o sorteio respeita o gênero. Obs: o play automático depende do player do SoundCloud já ter carregado; em conexão lenta pode só destacar sem tocar, aí é dar o play manual.

**10. Carrinho abre 1 vez só**
Adiciona um beat: painel abre (upsell aparece). Fecha. Adiciona outro beat: agora só um toast "✓ ... no carrinho" e o número do círculo sobe. O badge conta unidades: pacote de 3 beats marca 3, não 1.

**11. Cupom colapsado**
No carrinho, o campo de cupom virou o link "Tem cupom?". Toca: campo abre com foco.

**12. Modo rádio sem roubo de scroll**
Dá play num beat, rola até o formulário de contato e espera a faixa acabar. A próxima deve começar a tocar sem a página pular de volta pro catálogo. Se você estiver com o catálogo na tela, aí sim ele acompanha (rola até o próximo card).

**13. Miúdos**
Select de "Assunto" no contato tem setinha ▾. O primeiro contato é "Chamar no Direct" (abre teu DM do Instagram). Tocar num link do menu para a seção logo abaixo da nav, sem esconder o título. O pacote 1 Beat avisa "= mesmo preço do beat avulso".

---

## Bloco B — precisa do site no ar (após o push)

**14. Cupom validando no servidor**
No carrinho, "Tem cupom?" → digita `RIDE20` → APLICAR. Deve aplicar 20% (esse cupom é ilimitado). Digita um código inventado: "Cupom inválido". Digita `SABER50` (já esgotado): "Cupom expirado".
Depois confirma que os códigos sumiram do fonte: no site, Ctrl+U (ver código-fonte) e busca por "CARAMUJO25". Não pode aparecer.

**15. coupons.json não é público**
Acessa `caramujorecords.com.br/functions/coupons.json` no navegador. Tem que dar 404. Se por algum motivo abrir o arquivo, me avisa que a gente muda a abordagem (o arquivo estaria vazando).

**16. Variável de ambiente**
Nada novo pra configurar: o `validate-coupon` usa o mesmo `GITHUB_TOKEN` que já existe no painel do Cloudflare.

---

## Bloco C — precisa de uma compra real (custa R$1)

A forma mais barata de validar o fluxo inteiro: cria um cupom de teste antes do push. Em `functions/coupons.json`, adiciona:

```json
"TESTE1": { "fixedPrice": 1, "maxUses": 1, "uses": 0 }
```

Aí faz uma compra PIX de um beat qualquer com esse cupom (total: R$1) e confere, nesta ordem:

**17. Contrato no email do comprador**
Usa um email teu de teste como comprador. Após pagar o PIX, o email "Pedido confirmado" deve chegar com o contrato `.html` em anexo e o aviso "Seu contrato de licença assinado está em anexo". Abre o anexo: dados do comprador, itens e timestamp do aceite preenchidos.

**18. Emails do produtor seguem chegando**
Teu email de notificação chega igual antes, com contrato em anexo.

**19. Webhook: beat vendido + cupom incrementado**
Alguns minutos após o pagamento, o repositório deve ter 2 commits automáticos: um marcando o beat como `sold:true` no index.html, outro com `"uses": 1` no TESTE1 do coupons.json. Confere no histórico do GitHub.

**20. Cupom esgotado bloqueia**
Tenta aplicar TESTE1 de novo no site: "Cupom expirado". Depois pode apagar o cupom de teste do JSON.

Se qualquer um dos itens 17-20 falhar, me traz o print do log do Cloudflare (Pages → o projeto → Functions → Logs) que eu corrijo.

---

## O que os testes automáticos daqui já cobriram

Rodei o site em navegador headless com viewport de iPhone (390×844) e medi: área de toque da nav = 54px em qualquer ponto; carrinho oculto com 0 itens e círculo de 58px com item; inputs a 16px; filtros com largura total visível (sem scroll escondido); paginação numerada com página atual destacada; balão da licença fixo no rodapé; sorte destacando card e trocando de página; carrinho abrindo só na 1ª adição; badge somando unidades; toggle de vendidos preenchido. Sintaxe das 4 functions e do JSON validada. O que sobra pra você é o que depende de iOS real, SoundCloud carregado e pagamento de verdade.
