# Caramujo Records

Site oficial do estúdio Caramujo Records — beats exclusivos, mixagem e masterização por @rideblan33.

**→ [caramujorecords.com.br](https://caramujorecords.com.br)**

---

## Visão Geral

Single-page application (SPA) em HTML/CSS/JS puro, sem frameworks. Hospedado no **Cloudflare Pages** com deploy automático via GitHub. Integra **SoundCloud** (preview dos beats + player contínuo via Widget API) e **Mercado Pago** para pagamentos via cartão de crédito e PIX.

Jornada do site: **hero → pacotes → catálogo de beats → serviços → contato**. Os pacotes vêm antes do catálogo de propósito: o visitante ancora o preço antes de mergulhar nos beats.

---

## Estrutura do Projeto

```
/
├── index.html                     # Aplicação completa (HTML + CSS + JS inline)
├── og-image.png                   # Thumbnail para compartilhamento (WhatsApp, redes sociais)
├── termos-de-licenca.pdf          # Termos de licença disponíveis para download
├── Caramujo_Records.png           # Logo do estúdio
├── selo-creme.svg / selo-sepia.svg# Selos da marca (favicon, hero, footer)
├── _headers                       # Headers HTTP do Cloudflare (CSP, segurança)
├── email-pedido.html              # Template de email — notificação de novo pedido (ao dono)
├── email-entrega.html             # Template de email — confirmação de pedido (ao comprador)
└── functions/
    ├── coupons.json               # Cupons de desconto (fora dos assets estáticos — não é servido publicamente)
    └── api/
        ├── create-payment.js      # Cria pagamento no Mercado Pago
        ├── check-payment.js       # Consulta status de um pagamento
        ├── validate-coupon.js     # Valida cupom digitado no carrinho (lê coupons.json via GitHub API)
        └── payment-webhook.js     # Webhook: processa aprovação e dispara ações pós-pagamento
```

---

## Funcionalidades

### Hero
- Prova social: 40+ artistas · 200+ faixas lançadas · 2.500.000+ streams
- CTAs: "Ouvir o catálogo" (#beats) e "Mix & master" (#services)

### Catálogo de Beats
- Listagem paginada (9 por página) com player SoundCloud integrado
- **Player contínuo / modo rádio:** dar play num beat pausa os demais; quando um beat termina, o próximo toca automaticamente — inclusive virando de página sozinho até o fim do catálogo
- Filtro por gênero (Trap, Boom Bap, Plug, Hood Trap, Drill, etc.)
- Ordenação: padrão ou aleatória (reembaralha a cada seleção)
- Busca por nome — sem distinção de maiúsculas/minúsculas nem de acentos
- Beats vendidos: exibidos por padrão como prova social (nome riscado + botão "✕ Vendido" desabilitado), com opção "Esconder vendidos"
- "Licença exclusiva" com balão explicativo no hover/clique

### Pacotes Promocionais
- Desconto progressivo para 1, 2 ou 3 beats (R$119 / R$219 / R$299)
- Modal de seleção de beats com busca integrada (também normalizada)

### Serviços por Encomenda
- Beat personalizado (R$149), Mixagem (R$149), Masterização (R$79) e Mix + Master (R$199)
- Adicionados ao carrinho e processados pelo mesmo fluxo de pagamento

### Carrinho e Checkout
- **Upsell inteligente:** o carrinho sempre aponta o próximo degrau de custo-benefício, com a economia em destaque
  - 1 beat avulso → pacote de 2 (−R$19) · 2 avulsos → pacote de 3 (−R$58)
  - Pacote de 1 → pacote de 2 (−R$19) · pacote de 2 → pacote de 3 (−R$39)
  - Só Mixagem ou só Masterização → Mix + Master (−R$29) · ambos separados → combo (−R$29)
  - Some quando o cliente já está no melhor degrau
- Validação de CPF, email e dados do comprador
- Cupons de desconto com controle de usos via GitHub API
- Aceite eletrônico dos termos de licença com timestamp registrado
- Pagamento via **cartão de crédito** (Mercado Pago Checkout Bricks) e **PIX**

### Contrato Digital
- Gerado automaticamente no momento do pagamento
- Inclui dados do comprador, itens, valor, ID do pagamento e timestamp do aceite
- Enviado ao comprador e ao produtor como anexo por email

---

## Fluxo de Pagamento

```
Comprador preenche dados → create-payment.js → Mercado Pago
                                                     ↓
                                         Cartão: resposta imediata
                                         PIX: QR Code gerado
                                                     ↓
                                         payment-webhook.js (aprovação)
                                                     ↓
                                    ┌────────────────┴────────────────┐
                                    ↓                                 ↓
                           Email ao comprador              Email ao produtor
                           (confirmação + prazos)          (resumo + contrato em anexo)
                                    ↓
                           GitHub API: commits automáticos
                           — index.html: beat marcado como sold:true
                           — functions/coupons.json: uses do cupom +1
                                    ↓
                           Cloudflare Pages: redeploy automático
                           (catálogo atualizado em produção)
```

> **Cartão:** emails disparados no `create-payment.js` (resposta síncrona).
> **PIX:** emails disparados no `payment-webhook.js` (após confirmação assíncrona do Mercado Pago).

---

## Variáveis de Ambiente

Configuradas no painel do Cloudflare Pages → **Settings → Environment variables**.

| Variável | Descrição |
|---|---|
| `MP_ACCESS_TOKEN` | Access Token do Mercado Pago (produção) |
| `RESEND_API_KEY` | API Key do [Resend](https://resend.com) para envio de emails |
| `NOTIFY_EMAIL` | Email do produtor que recebe as notificações de venda |
| `NOTIFY_FROM` | Email remetente (ex: `rideblan33@caramujorecords.com.br`) |
| `GITHUB_TOKEN` | Personal Access Token do GitHub com permissão `Contents: Read & Write` |

---

## Deploy

**Cloudflare Pages** com deploy contínuo via GitHub.

```bash
# Qualquer push para a branch main dispara o redeploy automaticamente
git add .
git commit -m "descrição da mudança"
git push
```

O webhook de pagamento também dispara commits automáticos (marcação de beats vendidos e controle de cupons), o que aciona um novo redeploy.

> **Atenção:** o `_headers` precisa liberar `https://w.soundcloud.com` no `script-src` da CSP. Sem isso, o player contínuo não funciona em produção (o script da Widget API é bloqueado pelo navegador).

---

## Adicionando Beats ao Catálogo

Os beats são definidos diretamente no `index.html`, no array `BEATS`:

```js
{ id: 112, name: 'NOME DO BEAT', bpm: 140, key: 'Am', genre: 'trap',
  sold: false, scUrl: 'https%3A//soundcloud.com/rideblan33/slug-da-faixa' }
```

| Campo | Descrição |
|---|---|
| `id` | Identificador único (não repetir) |
| `name` | Nome do beat (usado na busca e no contrato) |
| `bpm` | BPM do beat |
| `key` | Tom (ex: `Am`, `Ebm`) |
| `genre` | Um dos: `trap` `boombap` `plug` `hoodtrap` `experimental` `hard` `detroit` `drumless` `funk` `pluggnb` `bounce` `nomelody` `drill` |
| `sold` | `false` disponível · `true` vendido (fica visível, riscado e sem compra) |
| `scUrl` | URL da faixa no SoundCloud com `https:` codificado como `https%3A` |

---

## Cupons de Desconto

Definidos em `functions/coupons.json` (os códigos não aparecem no código-fonte da página; o front valida via `POST /api/validate-coupon`):

```json
{
  "CODIGO": { "pct": 20, "maxUses": 10, "uses": 0 },
  "FIXO":   { "fixedPrice": 99, "maxUses": 1, "uses": 0 }
}
```

| Campo | Descrição |
|---|---|
| `pct` | Desconto percentual sobre o subtotal |
| `fixedPrice` | Alternativa ao `pct`: trava o total no valor definido |
| `uses` | Usos atuais (atualizado automaticamente via webhook, em commit próprio) |
| `maxUses` | Limite de usos (`null` para ilimitado) |

> O arquivo fica dentro de `functions/` de propósito: o Cloudflare Pages não serve essa pasta como asset estático, então os códigos não vazam pela URL. Depois de qualquer deploy, conferir que `caramujorecords.com.br/functions/coupons.json` responde 404.

---

## Emails Transacionais

Enviados via **[Resend](https://resend.com)**:

| Evento | Destinatário | Conteúdo |
|---|---|---|
| Novo pedido (cartão) | Produtor | Resumo da venda + contrato em anexo |
| Pagamento aprovado (PIX) | Produtor | Resumo da venda + contrato em anexo |
| Pedido confirmado (cartão) | Comprador | Confirmação + prazos + contrato em anexo |
| Pagamento aprovado (PIX) | Comprador | Confirmação + prazos + contrato em anexo |

---

## SEO e Compartilhamento

- `<title>` descritivo: "Caramujo Records — Beats exclusivos, mix e master por @rideblan33"
- **Schema.org (JSON-LD):** o catálogo é injetado como `ItemList` de `Product`, cada um com nome, imagem, descrição, marca e oferta (preço, disponibilidade, política de devolução e entrega) — atende os requisitos de Listagens do Comerciante do Google Search Console
- Meta tags Open Graph no `<head>` para WhatsApp, Instagram e demais redes

Após atualizar o `og-image.png`, forçar releitura em
**[developers.facebook.com/tools/debug](https://developers.facebook.com/tools/debug)** → Scrape Again.

---

## Acessibilidade e Performance

- Grão de filme animado desligado no mobile e sob `prefers-reduced-motion` (bateria e acessibilidade); a textura estática permanece
- Iframes do SoundCloud com lazy loading
- Cursor customizado desativado em dispositivos touch

---

## Segurança

- Headers HTTP de segurança no `_headers` (CSP, X-Frame-Options, etc.)
- Validação de CPF e email no servidor (`create-payment.js`)
- Validação de cupons lida do GitHub em tempo real (evita reuso após expiração)
- Chave de idempotência em todos os pagamentos (previne cobranças duplicadas)
- Sanitização de todos os inputs antes de enviar ao Mercado Pago

---

## Contato

**@rideblan33** · [contato@caramujorecords.com.br](mailto:contato@caramujorecords.com.br) · São Carlos, SP — Desde 2018
