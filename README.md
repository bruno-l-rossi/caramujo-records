# Caramujo Records

Site oficial do estúdio Caramujo Records — beats exclusivos, mixagem e masterização por @rideblan33.

**→ [caramujorecords.com.br](https://caramujorecords.com.br)**

---

## Visão Geral

Single-page application (SPA) em HTML/CSS/JS puro, sem frameworks. Hospedado no **Cloudflare Pages** com deploy automático via GitHub. Integra **SoundCloud** para preview dos beats e **Mercado Pago** para processamento de pagamentos via cartão de crédito e PIX.

---

## Estrutura do Projeto

```
/
├── index.html                     # Aplicação completa (HTML + CSS + JS inline)
├── og-image.png                   # Thumbnail para compartilhamento (WhatsApp, redes sociais)
├── termos-de-licenca.pdf          # Termos de licença disponíveis para download
├── Caramujo_Records.png           # Logo do estúdio
├── _headers                       # Headers HTTP do Cloudflare (CSP, segurança)
├── email-pedido.html              # Template de email — notificação de novo pedido (ao dono)
├── email-entrega.html             # Template de email — confirmação de pedido (ao comprador)
└── functions/
    └── api/
        ├── create-payment.js      # Cria pagamento no Mercado Pago
        ├── check-payment.js       # Consulta status de um pagamento
        └── payment-webhook.js     # Webhook: processa aprovação e dispara ações pós-pagamento
```

---

## Funcionalidades

### Catálogo de Beats
- Listagem paginada dos beats disponíveis com player SoundCloud integrado
- Filtro por gênero (Trap, Boom Bap, Plug, Hood Trap, etc.)
- Busca por nome — sem distinção de maiúsculas/minúsculas e sem distinção de acentos
- Beats marcados como `sold: true` são removidos automaticamente do catálogo após a venda

### Pacotes Promocionais
- Desconto progressivo para compra de 1, 2 ou 3 beats
- Opção de adicionar stems separados por instrumento
- Modal de seleção de beat com busca integrada (também normalizada)

### Serviços por Encomenda
- Beat personalizado, Mixagem, Masterização e Mix + Master
- Adicionados ao carrinho e processados pelo mesmo fluxo de pagamento

### Carrinho e Checkout
- Validação de CPF, email e dados do comprador
- Suporte a cupons de desconto com controle de usos via GitHub API
- Aceite eletrônico dos termos de licença com timestamp registrado
- Pagamento via **cartão de crédito** (Mercado Pago Checkout Bricks) e **PIX**

### Contrato Digital
- Gerado automaticamente no momento do pagamento
- Inclui dados do comprador, itens adquiridos, valor, ID do pagamento e timestamp do aceite
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
                           GitHub API: commit automático
                           — beat marcado como sold:true
                           — uses do cupom incrementado
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

O projeto usa **Cloudflare Pages** com deploy contínuo via GitHub.

```bash
# Qualquer push para a branch main dispara o redeploy automaticamente
git add .
git commit -m "descrição da mudança"
git push
```

O webhook de pagamento também dispara commits automáticos (marcação de beats vendidos e controle de cupons), o que por sua vez aciona um novo redeploy.

---

## Adicionando Beats ao Catálogo

Os beats são definidos diretamente no `index.html`, no array `BEATS`:

```js
{ id: 99, name: 'Nome do Beat', genre: 'trap', bpm: 140, key: 'Am',
  sc: 'SOUNDCLOUD_TRACK_ID', sold: false }
```

| Campo | Descrição |
|---|---|
| `id` | Identificador único (não repetir) |
| `name` | Nome do beat (usado na busca e no contrato) |
| `genre` | Gênero: `trap`, `boom-bap`, `plug`, `hood-trap`, `outro` |
| `bpm` | BPM do beat |
| `key` | Tom (ex: `Am`, `C#`) |
| `sc` | ID da faixa no SoundCloud |
| `sold` | `false` disponível · `true` vendido (removido do catálogo) |

---

## Cupons de Desconto

Definidos no objeto `COUPONS` no `index.html`:

```js
const COUPONS = {
  'CODIGO': { discount: 20, type: 'percent', uses: 0, maxUses: 10 }
}
```

| Campo | Descrição |
|---|---|
| `discount` | Valor do desconto |
| `type` | `'percent'` (%) ou `'fixed'` (R$) |
| `uses` | Quantidade de usos atual (atualizado automaticamente via webhook) |
| `maxUses` | Limite de usos (`Infinity` para ilimitado) |

---

## Emails Transacionais

Enviados via **[Resend](https://resend.com)**:

| Evento | Destinatário | Conteúdo |
|---|---|---|
| Novo pedido (cartão) | Produtor | Resumo da venda + contrato em anexo |
| Pagamento aprovado (PIX) | Produtor | Resumo da venda + contrato em anexo |
| Pedido confirmado (cartão) | Comprador | Confirmação + prazos de entrega |
| Pagamento aprovado (PIX) | Comprador | Confirmação + prazos de entrega |

---

## Meta Tags (Compartilhamento)

Configuradas no `<head>` do `index.html` para WhatsApp, Instagram e demais redes:

```html
<meta property="og:title"       content="Caramujo Records" />
<meta property="og:description" content="Estúdio popular e independente. Idealizado por @rideblan33. Todos os direitos reservados." />
<meta property="og:image"       content="https://caramujorecords.com.br/og-image.png" />
```

Após atualizar o `og-image.png` no servidor, forçar releitura em:  
**[developers.facebook.com/tools/debug](https://developers.facebook.com/tools/debug)** → Scrape Again.

---

## Segurança

- Headers HTTP de segurança configurados no `_headers` (CSP, X-Frame-Options, etc.)
- Validação de CPF e email no servidor (`create-payment.js`)
- Validação de cupons lida diretamente do GitHub em tempo real (evita reuso após expiração)
- Chave de idempotência em todos os pagamentos (previne cobranças duplicadas)
- Sanitização de todos os inputs antes de enviar ao Mercado Pago

---

## Contato

**@rideblan33** · [contato@caramujorecords.com.br](mailto:contato@caramujorecords.com.br) · São Carlos, SP — Desde 2018
