# Caramujo Records

Site oficial do estúdio Caramujo Records — beats exclusivos, mixagem e masterização por @rideblan33.

**→ [caramujorecords.com.br](https://caramujorecords.com.br)**

---

## Visão Geral

Single-page application (SPA) em HTML/CSS/JS puro, sem frameworks. Hospedado no **Cloudflare Pages** com deploy automático via GitHub. Integra **SoundCloud** (preview dos beats + player contínuo via Widget API) e **Mercado Pago** para pagamentos via cartão de crédito e PIX.

Jornada do site: **hero → pacotes → catálogo de beats → serviços → contato**. Os pacotes vêm antes do catálogo de propósito: o visitante ancora o preço antes de mergulhar nos beats.

---

## Estrutura do Projeto

O GitHub (e portanto o deploy do Pages, que publica o repositório inteiro) recebe **só o que o site e o backend usam**, mais 3 exceções deliberadas: este `README.md`, o `docs/DESIGN.md` e o `previews/preview-email-entrega.html` (backup do e-mail de entrega, disparo manual). O resto do apoio fica nesta pasta local, segurado pelo `.gitignore`.

**No GitHub/deploy:** `index.html`, `og-image.png`, `_headers`, `robots.txt`, `llms.txt`, `.gitignore`, `assets/` (10 arquivos, todos referenciados pelo site), `functions/` (4 endpoints + `coupons.json`, que a validação de cupom e o webhook leem/gravam via GitHub API), `README.md`, `docs/DESIGN.md` e `previews/preview-email-entrega.html`.

**Só local (apoio):** o resto de `docs/` (análises, política de crawlers, planos, contexto de continuidade), o resto de `previews/` e `mockups-antigos/`.

```
/
├── index.html                     # Site (HTML + CSS + JS inline) — arquivo único que vai pro ar
├── og-image.png                   # Thumbnail de compartilhamento (fica na raiz: URL absoluta + cache das redes)
├── _headers                       # Headers HTTP do Cloudflare (CSP, segurança, noindex das pastas internas)
├── robots.txt                     # Crawlers: busca/IA/agentes liberados; /api e pastas internas bloqueados
├── llms.txt                       # Resumo do estúdio pra agentes de IA (preços, links, contato)
├── .gitignore                     # Ignora .DS_Store, .claude/, .obsidian/
├── README.md
│
├── assets/                        # Tudo que o site referencia, além do og-image
│   ├── brand/                     # selo-creme.svg · selo-sepia.svg · Caramujo_Records.png
│   ├── termos-de-licenca.pdf      # Termos de licença (download no checkout)
│   └── (mídia do "Por dentro do estúdio": studio-hero.jpg, depo-*, sessao.mp4, posters)
│
├── functions/                     # Backend (Cloudflare Pages Functions) — GERA os e-mails e o contrato
│   ├── coupons.json               # Cupons de desconto (não é servido publicamente)
│   └── api/
│       ├── create-payment.js      # Pagamento (cartão) + e-mails "compra recebida" e do comprador + contrato
│       ├── check-payment.js       # Consulta status de um pagamento
│       ├── validate-coupon.js     # Valida cupom digitado no carrinho (lê coupons.json via GitHub API)
│       └── payment-webhook.js     # Webhook: aprovação (PIX) + e-mails "compra confirmada" e do comprador
│
├── docs/                          # Documentação do projeto
│   ├── DESIGN.md                  # Sistema de marca (paleta, tipografia, tom)
│   ├── contexto-continuidade-compilado.md  # Contexto pra IA retomar o projeto
│   └── analise-usabilidade-mobile.md
│
├── previews/                      # Abrir no navegador pra conferir (fora do deploy)
│   ├── preview-mobile.html        # Site dentro de molduras de celular (iframe)
│   ├── preview-comprador.html     # E-mail do comprador (detalhes + prazos)
│   ├── preview-compra-recebida.html   # E-mail interno: compra criada (pode não estar paga)
│   ├── preview-compra-confirmada.html # E-mail interno: pagamento aprovado
│   └── preview-contrato.html
│
└── mockups-antigos/               # Referências antigas (só local)
    ├── (o e-mail de entrega virou previews/preview-email-entrega.html — AINDA usado no disparo manual)
    └── email-pedido.html          # Mockup antigo (não disparado por código)
```

> **Deploy:** o Cloudflare Pages publica o repositório inteiro (por isso `assets/brand/…` e `assets/termos-de-licenca.pdf` funcionam nas URLs). O apoio que não sobe passa a responder 404 em produção após o push. As 3 exceções que sobem (README, DESIGN, preview-email-entrega) têm URL pública, cobertas pelo noindex do `_headers` e pelos Disallow do `robots.txt`. A `og-image.png` fica na raiz de propósito (URL absoluta nas meta tags + cache das redes sociais). Os e-mails reais são gerados nos `functions/`, não nos arquivos de `mockups-antigos/`. Pra conferir o layout mobile antes de publicar, abra `previews/preview-mobile.html`.

### Os 4 e-mails (nomes amigáveis)

| Nome | Quem recebe | Quando | Onde é gerado |
|---|---|---|---|
| **Compra recebida** | Dono (@rideblan33) | Compra criada (pode não estar paga, ex.: PIX pendente) | `create-payment.js` |
| **Compra confirmada** | Dono (@rideblan33) | Pagamento aprovado | `payment-webhook.js` |
| **Comprador** | Cliente | Logo após finalizar a compra (detalhes + prazos) | `create-payment.js` / `payment-webhook.js` |
| **Entrega** | Cliente | Envio manual dos arquivos finais | `previews/preview-email-entrega.html` |

Os 3 primeiros + o contrato seguem a identidade do site (paleta do `docs/DESIGN.md`). O e-mail do comprador e o de entrega trazem o selo do caramujo (PNG) no canto superior direito.

---

## Funcionalidades

### Hero
- Prova social: 40+ artistas · 200+ faixas lançadas · 2.500.000+ streams
- CTAs: "Ouvir o catálogo" (#beats) e "Mix & master" (#services)
- Beat em destaque com **rodízio semanal automático** (1 por semana, catálogo inteiro, pula vendidos). Pra fixar um beat manualmente: `FEATURED_OVERRIDE_ID` (id do beat) e `FEATURED_OVERRIDE_ATE` ('AAAA-MM-DD', opcional) no index.html — vencido o prazo, o rodízio volta sozinho

### Catálogo de Beats
- Listagem paginada (9 por página) com player SoundCloud integrado
- **Player contínuo / modo rádio:** dar play num beat pausa os demais; quando um beat termina, o próximo toca automaticamente — inclusive virando de página sozinho até o fim do catálogo
- Adicionar/tirar do carrinho **não interrompe o beat tocando** (os botões dos cards sincronizam sem re-renderizar os players)
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

| E-mail | Destinatário | Quando | Conteúdo |
|---|---|---|---|
| **Compra recebida** | Produtor | Compra criada (cartão, ou PIX pendente) | Resumo da venda + contrato em anexo |
| **Compra confirmada** | Produtor | Pagamento aprovado | Resumo da venda + ação necessária |
| **Comprador** | Comprador | Após finalizar a compra | Confirmação + prazos + contrato em anexo |
| **Entrega** (manual) | Comprador | Envio dos arquivos finais | Arquivos + mensagem (previews/preview-email-entrega.html) |

Os 3 primeiros e o contrato seguem a identidade visual do site (paleta do `docs/DESIGN.md`: fundos terrosos, acento terracota `#b98f5e`, cream/bone no texto). O contrato é mantido em fundo claro pra impressão, com o selo do caramujo no cabeçalho e acento `#8C3B2E`. O e-mail do comprador e o de entrega trazem o selo (PNG) no canto superior direito. Fontes Georgia/Courier por compatibilidade de e-mail. Pra conferir o visual, abra os arquivos em `previews/` (o de entrega é o `preview-email-entrega.html`).

---

## SEO, Crawlers e Compartilhamento

- `<title>` descritivo: "Caramujo Records — Beats exclusivos, mix e master por @rideblan33"
- Meta description vendedora (preço, serviços, cidade, tamanho do catálogo) — é o texto que aparece no Google e que as IAs leem primeiro
- **Schema.org (JSON-LD), 2 blocos:** um `ProfessionalService` **estático** no `<head>` (negócio, preços, contato, sameAs — visível pra bots de IA que não executam JS) e o catálogo como `ItemList` de `Product` injetado via JS (Googlebot renderiza; atende as Listagens do Comerciante do GSC)
- **robots.txt:** busca, agentes e treinamento de IA liberados; `/api/` e pastas internas bloqueados. **Pendência:** desligar o robots.txt gerenciado do Cloudflare no painel, senão ele continua prefixando bloqueios de IA (política completa em `docs/politica-crawlers-ia.md`)
- **llms.txt** na raiz: resumo do estúdio pra agentes de IA
- Meta tags Open Graph no `<head>` para WhatsApp, Instagram e demais redes (og-image comprimida: 111 KB)

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
