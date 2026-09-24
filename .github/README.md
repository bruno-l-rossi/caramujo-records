# Caramujo Records

Site oficial do estúdio Caramujo Records — beats exclusivos, mixagem e masterização por @rideblan33.

**→ [caramujorecords.com.br](https://caramujorecords.com.br)**

---

## Visão Geral

Single-page application (SPA) em HTML/CSS/JS puro, sem frameworks. Hospedado no **Cloudflare Pages** com deploy automático via GitHub. O som dos beats vem do **R2** (MP3 convertido do Drive, `/audio/<id>`, um `<audio>` só pra página inteira) e o pagamento é **Mercado Pago** (cartão e PIX). O SoundCloud saiu em 23/09/2026.

Jornada do site: **hero → catálogo de beats → pacotes → serviços → sobre nós → contato**.

---

## Estrutura do Projeto

O GitHub recebe **só o que o site e o backend usam**. O apoio que precisa existir no GitHub (este `README.md`, os `DESIGN.md` e o backup do e-mail de entrega) mora em **`.github/`**, que o Cloudflare Pages não publica — pasta começando com ponto não vira URL. Assim nada de apoio tem endereço público. O resto do apoio fica só na máquina, segurado pelo `.gitignore`.

**No GitHub e no deploy:** `index.html`, `404.html`, `og-image.png`, `_headers`, `_routes.json`, `robots.txt`, `llms.txt`, `.gitignore`, `assets/`, `catalogo/app.html`, `functions/` e `scripts/`.
**No GitHub mas FORA do deploy:** `.github/` — `README.md`, `docs/DESIGN.md`, `docs/DESIGN-catalogo.md`, `previews/preview-email-entrega.html` e os workflows.

**Só local (apoio):** `docs/` (análises, política de crawlers, planos, contexto compilado), `previews/`, `mockups-antigos/` e `testes/` (os 8 arquivos de conferência; ver `testes/LEIAME.md`).

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
│   ├── contexto-continuidade-compilado.md  # Contexto pra IA retomar o site de vendas
│   ├── contexto-catalogo-compilado.md      # Contexto pra IA retomar o catálogo de entrega
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

> **Deploy:** o Cloudflare Pages publica o repositório inteiro, menos o que começa com ponto (por isso `assets/brand/…` funciona nas URLs e `.github/…` não). O apoio que não sobe responde 404 de verdade desde que existe o `404.html` na raiz — sem ele o Pages tratava o site como SPA e devolvia a home com status 200 pra qualquer endereço errado. A `og-image.png` fica na raiz de propósito (URL absoluta nas meta tags + cache das redes sociais). Os e-mails reais são gerados nos `functions/`, não nos arquivos de `mockups-antigos/`. Pra conferir o layout mobile antes de publicar, abra `previews/preview-mobile.html`.

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
- "Ouvir o catálogo" desce pro começo do catálogo e já toca a primeira faixa da lista (celular e computador). No celular o card do destaque some
- Menu e botões param a seção colada no menu fixo: um recuo só, igual à altura real do menu (`--nav-h`)
- Beat em destaque com **rodízio semanal automático** (1 por semana, catálogo inteiro, pula vendidos). Pra fixar um beat manualmente: `FEATURED_OVERRIDE_ID` (id do beat) e `FEATURED_OVERRIDE_ATE` ('AAAA-MM-DD', opcional) no index.html — vencido o prazo, o rodízio volta sozinho

### Catálogo de Beats
- Listagem paginada (10 por página): linha com número/play, capa da beat tape, nome, ficha e preço
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

> **CSP (`_headers`):** script externo só entra se estiver na lista do `script-src`. Hoje a lista é Mercado Pago, EmailJS (jsdelivr) e o Web Analytics do Cloudflare (`static.cloudflareinsights.com`, com `cloudflareinsights.com` no `connect-src`). CSP quebra calada: depois de mexer, testar o checkout de ponta a ponta e olhar o console.

---

## Adicionando Beats ao Catálogo

Os beats são definidos diretamente no `index.html`, no array `BEATS`:

```js
{id:137, name:'NOME DO BEAT', bpm:140, key:'Am', genre:'trap', sold:false},
```

| Campo | Descrição |
|---|---|
| `id` | Identificador único (não repetir) |
| `name` | Nome do beat (usado na busca e no contrato) |
| `bpm` | BPM do beat |
| `key` | Tom (ex: `Am`, `Ebm`) |
| `genre` | Um dos: `trap` `boombap` `plug` `hoodtrap` `experimental` `hard` `detroit` `drumless` `funk` `pluggnb` `bounce` `nomelody` `drill` |
| `sold` | `false` disponível · `true` vendido (fica visível, riscado e sem compra) |

O áudio não vai aqui: a `/api/vitrine` casa o beat pelo nome, BPM e tom com o MP3 que o conversor guardou no R2. Beat sem MP3 não aparece na lista. O webhook marca `sold:true` procurando `{id:N, name:'NOME'...sold:false`, então manter essa ordem dos campos.

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
- **robots.txt:** busca, agentes e treinamento de IA liberados; `/api/` e pastas internas bloqueados. O robots.txt gerenciado do Cloudflare está desligado e os crawlers liberados no AI Crawl Control (conferido em 23/09/2026; política completa em `docs/politica-crawlers-ia.md`)
- **llms.txt** na raiz: resumo do estúdio pra agentes de IA
- Meta tags Open Graph no `<head>` para WhatsApp, Instagram e demais redes (og-image comprimida: 111 KB)

Após atualizar o `og-image.png`, forçar releitura em
**[developers.facebook.com/tools/debug](https://developers.facebook.com/tools/debug)** → Scrape Again.

---

## Acessibilidade e Performance

- Grão de filme animado desligado no mobile e sob `prefers-reduced-motion` (bateria e acessibilidade); a textura estática permanece
- Cursor customizado desativado em dispositivos touch
- **Nada de terceiro no load.** Fontes servidas do próprio site (`assets/fonts/`, subset latin, `font-display:swap`, preload das 3 que o hero usa; licença OFL na mesma pasta). O SDK do Mercado Pago só baixa quando o checkout abre (`carregarMP()`); o EmailJS só quando a pessoa toca no formulário de contato (`carregarEmailJS()`). Se o SDK do MP falhar, o checkout cai no PIX manual, como sempre caiu.
- **Capa pequena na lista.** A lista, a barra do player, o destaque e o painel pedem `/capa/<id>?p` (200×200, uns 10 KB). A arte de 1000×1000 fica pra página da tape e pra tela de bloqueio do celular.
- Vídeo da sessão (`video[data-loop]`) com `preload="none"`: só baixa e roda quando aparece na tela, e para quando sai.
- Cache: `/assets/*` e `og-image.png` ficam 1 dia frescos e mais 7 servidos enquanto revalidam. `/capa/` e `/audio/` são imutáveis por 1 ano; a capa também fica guardada na borda do Cloudflare.
- Analytics: só o Web Analytics do Cloudflare (sem cookie). O Google Analytics saiu em 23/09/2026.

---

## Segurança

- Headers HTTP de segurança no `_headers` (CSP, X-Frame-Options, etc.)
- Validação de CPF e email no servidor (`create-payment.js`)
- Validação de cupons lida do GitHub em tempo real (evita reuso após expiração)
- Chave de idempotência em todos os pagamentos (previne cobranças duplicadas)
- Sanitização de todos os inputs antes de enviar ao Mercado Pago

---

## Catálogo dos artistas

Camada de envio por cima do Google Drive: cada artista tem um link privado
(`caramujorecords.com.br/[artista]/[codigo]`) que toca os beats e as músicas dele no
celular, sem conta e sem app. O Drive continua sendo a fonte da verdade; o site nunca
escreve nada lá.

### Como funciona, de ponta a ponta

```
Drive (WAV, pastas do rideblan33)
   │
   │  GitHub Actions (.github/workflows/catalogo.yml)
   │  scripts/sync.mjs: lê as pastas, converte o que mudou (ffmpeg, MP3 192k)
   ▼
POST /api/ingest   (protegido por INGEST_TOKEN)
   ├── MP3 vai pro R2 (binding AUDIO), chave mp3/<id do arquivo no Drive>.mp3
   └── metadados vão pro D1 (binding DB): artists, tracks, links, events
   │
   ▼
/[artista]/[codigo]  →  catalogo/app.html + dados injetados
/audio/<id>.mp3      →  toca do R2, com Range pra pular trecho
/dl/<id>?f=mp3|wav   →  MP3 do R2; WAV direto do Drive, se a pasta permitir
/f/<codigo>          →  link de uma faixa só
/p/<codigo>          →  link de uma seleção
```

### As pastas do Drive e o que cada uma vira

| Pasta | Aba | Grupo na lista | Tag |
|---|---|---|---|
| `Beats/` | Beats | (topo) | — |
| `Beats/Já gravados/` | Beats | JÁ GRAVADOS | — |
| `Sons/` | Músicas | (topo) | mastered |
| `Sons/Guias/` | Músicas | GUIAS | demo |
| `Sons/Já lançados/` | Músicas | JÁ LANÇADAS | mastered |

Dentro de `Já gravados/`, `Já lançados/` e `Guias/`, uma pasta de álbum (`MK Jr > Sons >
Já lançados > O Mais Pesado de Sanka`) também entra: o conversor desce **um nível** e trata
as faixas como se estivessem soltas ali. Um nível só — o que está mais fundo (`Remastered`,
`Artes`) fica de fora. Se a mesma faixa aparece solta e dentro do álbum, fica a solta.

`Shows/`, `Vídeos/` e `Sessão de stu/` são ignoradas. O nome do arquivo vira título, BPM
e tom (`scripts/parse.mjs`): o sufixo técnico é descartado em qualquer das formas que
aparecem no Drive — `(mastered -12 lufs) prod. @rideblan33`, `prod. @rideblan33` solto,
ou o rabo inteiro dentro do parêntese (`intro (prod. @rideblan33).wav`). Se um parêntese
ficar aberto depois do corte, o título é cortado ali, pra nunca sobrar `intro (`. Cópia do
Drive (`_2`, `(1)`) sai do fim. O tom aceita `Abm`, `Bbmin`, `Cmaj`, `Emajor` e sai sempre
como `Abm` (menor) ou `Abmaj` (maior). Arquivo fora do padrão aparece com o nome limpo,
sem tag.

O título é regravado a cada conversão. Corrigir o parser e rodar a carga geral de novo
arruma o nome de todos os catálogos sem reconverter áudio nenhum.

### A capa do catálogo

Qualquer imagem solta na pasta do artista (`Projetos > [artista] > capa.jpg`, o nome não
importa) vira a capa. Se houver mais de uma, vale a mais recente. O conversor recorta num
quadrado de 1000×1000 e guarda em `capa/<id do arquivo>.jpg` no R2; a página serve por
`/capa/<id>`. Junto sai a miniatura de 200×200 (`capa/<id>-p.jpg`, servida em `/capa/<id>?p`).
Capa que subiu antes de existir miniatura ganha a pequena na próxima conversão, sem baixar a
grande de novo; enquanto isso, `?p` devolve a grande com cache de 1 hora. Sem imagem na pasta, aparece o logo vertical da Caramujo. A mesma arte vira o
borrão do fundo no computador e a mini-capa do player.

### Nome do arquivo baixado

| Tipo | Como chega no computador de quem baixa |
|---|---|
| Beat | `buraco negro Abm 150bpm (prod. @rideblan33).wav` |
| Música | `ice candy (mastered) prod. @rideblan33.wav` |
| Guia | `metade maquina metade animal (demo) prod. @rideblan33.wav` |

Beat sem tom sai só com o BPM. O nome vem do título limpo, nunca do arquivo original do
Drive (que pode estar truncado).

### O portfólio do @rideblan33

A pasta `@rideblan33` não vira um catálogo só: cada pasta dentro de `Beat tapes/` vira um
catálogo próprio, com link próprio, capa própria e só a aba Beats. Criar uma pasta nova no
Drive é tudo que precisa — a passada da madrugada acha e publica sozinha.

| Pasta | O que vira |
|---|---|
| `@rideblan33/Beat tapes/<nome>/` | um catálogo, com a capa que estiver solta dentro dela |
| `@rideblan33/Beats disponíveis/Exclusivos/` | não vira catálogo: é a fonte da verdade do que está à venda |
| `@rideblan33/Beats`, `Sons`, `Shows` | ignoradas |

Tape nasce com o download **desligado** nos dois lados, e ninguém troca a capa pela página:
a arte é a que está na pasta da tape.

### Disponível, vendido, ou pra eu revisar

Beat de tape não recebe tag da pasta. A tag sai do cruzamento, feito pelo site na hora do
`plan`:

| Onde o beat aparece | Tag |
|---|---|
| Só em `Exclusivos` | **disponível** |
| Só como **beat** na pasta de algum artista (solto ou em `Já gravados`) | **vendido** |
| Nos dois, só como música gravada, ou em lugar nenhum | sem pastilha, e entra na lista de revisão do painel |

Quem decide **vendido** é o beat. Música com o mesmo nome na pasta do artista não decide
sozinha, porque nome repetido entre beat e som acontece: o beat vai pra revisão com o motivo
escrito ("aparece só como música gravada, na pasta de fulano").

**O site manda no vendido.** Antes de qualquer cruzamento: se o beat está `sold:true` na
lista do site, a pastilha na tape é **vendido**, ponto. Isso vale na conversão (fica gravado)
e na hora de montar a página (vale na hora, sem esperar a próxima rodada). Anunciar
DISPONÍVEL um beat que já saiu é o pior erro possível aqui, e o mesmo beat costuma aparecer
em duas tapes diferentes.

O que casa é o título limpo; quando os dois lados têm BPM ou tom, eles também têm que bater
(senão dois `intro` viravam a mesma faixa). O casamento é tolerante onde precisa ser:
acento não conta (`dígitos` = `digitos`), `F#` e `Gb` são a mesma tecla, `F#` casa com
`F#maj`, e o BPM tem 1 de folga (exportação com casa decimal arredonda diferente).

A lista de revisão é a mesma conta do catálogo: **beat de tape sem pastilha**. Não importa
se o cruzamento anotou o motivo ou se nem chegou a passar por ele, o que a página mostra sem
pastilha aparece aqui. Ela vive em dois lugares no painel: o total vira um link âmbar na
linha de cima (ao lado da prateleira), e o bloco completo, agrupado por tape e com o motivo
de cada caso, fica no topo do portfólio.

Quando a lista não responde, o painel diz que **não conseguiu conferir**. Ele nunca mais
desenha "nada pra revisar" em cima de uma resposta que falhou.

Cada beat da lista tem dois botões, **disponível** e **vendido**, e cada tape com mais de um
pendente tem o par pra marcar todos de uma vez. A resposta vai pra `tracks.venda_manual` e
**vence o cruzamento pra sempre**: a conversão seguinte não desfaz. É a saída pros casos que
o Drive não conta — beat vendido que está na pasta do artista com outro nome, ou beat
disponível que de propósito não entra em Exclusivos (tape sem licença de exclusividade).

Na carga geral, as seis frentes rodam ao mesmo tempo e uma tape pode ser lida antes de o
artista dela entrar no banco. Por isso o workflow fecha com um job `tapes`, que roda depois
de todos e só acerta as tags — não reconverte áudio nenhum.

### Botão de carrinho na tape

Beat com pastilha **disponível** ganha um botão de carrinho na linha. Ele abre o site em
`/#add=<slug-do-beat>`: o site acha o beat pelo nome, joga no carrinho, abre o carrinho e
toca. Beat que já estava no carrinho não é tirado de lá, e a URL vira `#beat=` depois de
adicionar, pra recarregar a página não repetir a ação.

A aba de destino é **nomeada** (`caramujo-carrinho`), não `_blank`: o segundo beat cai na
mesma aba e soma no carrinho. Com `_blank` cada clique abria uma aba nova, e o beat anterior
parecia ter sumido. Sem `noopener` de propósito: com ele o navegador ignora o nome da janela
e abre aba nova assim mesmo. É a nossa própria origem.

O menu `...` da faixa só aparece quando tem o que oferecer (baixar, ou enviar só essa faixa).
Numa tape sem download a faixa é só pra ouvir, então fica o carrinho e mais nada.

**Tape de graça:** tape com o download LIGADO não recebe botão de carrinho. Beat que a pessoa
baixa de graça não está à venda. É uma chave só, a do download, no painel. A `Nada de novo
(vol. I)` é assim: beats sem licença exclusiva, todos marcados como disponíveis e liberados
pra baixar.

O botão só aparece quando o beat existe na vitrine do site e continua à venda lá. Quem faz
essa ponte é `functions/_lib/vitrine.js`: ele lê a lista `const BEATS` do próprio index.html
servido (`env.ASSETS`, sem sair pra internet), guarda por 10 minutos e casa cada faixa pelo
mesmo cruzamento das tapes (`functions/_lib/casar.js`: título limpo, BPM com 1 de folga, tom
enarmônico). Nada de de-para escrito na mão.

No painel, dentro do portfólio, o card **Vitrine do site** mostra quantos beats do site já
têm o áudio guardado no R2, quais não acharam par, e a **fila de postagem**: beat com pastilha
disponível numa tape que ainda não existe na vitrine do site. Fila não é alarme, é o que falta
subir. Tape de graça e beat vendido no site ficam fora dessa conta. Pra cada beat sem áudio ele diz o motivo, que é o que vira conserto no Drive:

| Motivo | O que fazer |
|---|---|
| O nome bate (caixa e acento não contam). Não fecha o tom: o site diz Bbm e o Drive diz Bm, em Fulano | Acertar o BPM/tom no nome do arquivo, ou no site |
| Está em Fulano, mas ainda não foi convertido | Rodar a conversão |
| Está só em Exclusivos, que não vira catálogo | Nada: a passada da vitrine converte esse sozinha |
| Não achei esse nome em nenhuma pasta convertida | Nome diferente em todo lugar |

### A prateleira interna da vitrine

Beat que o site vende e que não existe em NENHUM catálogo (só em `Exclusivos`) ganha o MP3
puxado direto de lá, pra uma linha interna `artists.tipo='vitrine'`: sem página (a rota
devolve 404), sem tag de venda, sem download. O conversor pergunta ao site quais beats estão
sem áudio (`/api/ingest?op=faltando`) e puxa **só** esses, então nada é duplicado: o que já
está guardado por causa de uma tape ou da pasta de um artista continua sendo reaproveitado.

Roda na passada da madrugada e no job `tapes` da carga geral, nunca dentro de um lote (senão
as 6 frentes fariam a mesma coisa ao mesmo tempo).

### Permissão de download

Catálogo novo já nasce com o download ligado nos beats e nas músicas. Desligar é decisão
minha, no painel, artista por artista — e fica desligado: o conversor não mexe nisso.

### Quem manda na capa

Duas origens, guardadas em `artists.cover_origem`:

- `drive`: a imagem que está solta na pasta do artista. O conversor sobe a cada passada e,
  se a imagem sumir do Drive, a capa é apagada da prateleira.
- `artista`: o artista trocou pelo botão na própria página. **Essa vence**: o conversor
  passa reto e não sobrescreve, e tirar a imagem do Drive não apaga.

Pra retomar o controle, o painel tem "Remover" no bloco CAPA do artista. Depois disso a
próxima conversão volta a mandar a do Drive.

O botão de trocar só aparece no catálogo do artista (`/artista/codigo`), nunca num link
avulso (`/f/`, `/p/`). O navegador corta no centro, reduz pra 1000×1000 e manda um JPEG de
uns 150 KB; o endpoint (`functions/api/capa.js`) confere o código do link, limita a 3 MB e
registra o evento `capa`, que aparece na atividade do painel.

### Bindings e variáveis

| Nome | Onde | Pra quê |
|---|---|---|
| `AUDIO` | Pages → Bindings → R2 | bucket `caramujo-audio`, a prateleira do MP3 |
| `DB` | Pages → Bindings → D1 | banco `caramujo`, catálogo e atividade |
| `INGEST_TOKEN` | Pages (secret) e GitHub (secret) | senha entre o conversor e o site |
| `GDRIVE_SA_JSON` | Pages (secret) e GitHub (secret) | conta de serviço com leitura em `Projetos` |
| `PAINEL_SENHA` | Pages (secret) | senha do `/painel` — e também a chave que assina o cookie |

### Trocar a senha do painel

1. `dash.cloudflare.com` → **Workers & Pages** → projeto do site → **Settings** → **Variables and Secrets**.
2. Editar `PAINEL_SENHA` (ou criar, se sumiu). Guardar como **Secret**, não como texto simples.
3. **Redeploy obrigatório**: em Deployments, no último deploy, *Retry deployment* / *Redeploy*. Variável do Pages só passa a valer no deploy seguinte.
4. Efeito colateral de graça: a senha É a chave HMAC que assina o cookie (`functions/_lib/sessao.js`), então trocar a senha derruba TODAS as sessões abertas, em qualquer aparelho. Não existe "sair" no painel; trocar a senha é o botão de sair.
5. O cookie dura 30 dias (`DIAS` em `sessao.js`). Errar a senha devolve 401 e a mesma tela de login, sem dizer nada além de "Senha errada."

### Custo e limites

Só o R2 pode virar cobrança. O plano gratuito dá 10 GB; o catálogo inteiro cabe em 3 a 4 GB,
e `functions/api/ingest.js` recusa faixa nova a partir de 8 GB (`TETO_BYTES`). D1 (5 M de
linhas lidas por dia) e Workers (100 mil visitas por dia) param quando estouram, sem cobrar.
Actions é ilimitado em repositório público.

### Rodar a conversão

- Sozinha, toda madrugada às 3h (cron no workflow). Pega tudo que mudou no Drive desde a
  última passada, artista por artista.
- Na mão, pelo painel: "Converter agora" no artista, ou "Converter tudo". O painel mostra
  uma barra com o andamento (`job_estado`, `job_total`, `job_feitos` na tabela `artists`,
  atualizados pelo próprio conversor a cada faixa).
- Na mão, pelo GitHub: Actions → "Catálogo dos artistas" → Run workflow. O campo aceita
  nomes separados por vírgula (`nico2b, PUMA`, e também o nome de uma beat tape); `tapes`
  converte só o portfólio do @rideblan33; vazio converte tudo.
- Carga geral: Actions → "Catálogo — carga geral" → Run workflow. Divide as pastas em 6
  frentes que rodam ao mesmo tempo (`scripts/sync.mjs "" 3/6`). Quem já está pronto é
  pulado, então repetir depois de uma falha continua de onde parou.

### Quando o Drive tropeça

O Drive devolve 500 e 429 de vez em quando numa carga grande. Toda chamada ao Drive e ao
site passa por `insiste()`: até 4 tentativas, esperando 1,5s, 3s e 6s entre elas. Se mesmo
assim um artista quebrar, o conversor anota o nome, segue para o próximo e só no fim marca
a rodada como falha — os outros do mesmo lote terminam normalmente. Rodar de novo pega só
quem ficou faltando.

### Cuidados

- `_routes.json` mantém a home e os assets fora das Functions: menos gasto de cota e o site
  de vendas continua estático.
- A pasta `functions/_lib/` começa com `_` de propósito: o Pages não transforma em página.
- Antes de subir mudança em `functions/`, vale compilar com esbuild; o build do Pages
  rejeita o deploy inteiro por um erro de sintaxe em um arquivo só.

---

## Link de beat e funil de venda

### Link de beat: `caramujorecords.com.br/b/<nome-do-beat>`
`functions/b/[slug].js`. Mandado no Direct, no WhatsApp ou no story, mostra a prévia com a capa da beat tape, o nome, a ficha e o preço. Quem toca cai no site com o beat na barra do player. O botão de compartilhar da barra do pé gera esse link (no celular abre a folha de compartilhar do sistema). O slug é o mesmo do `#beat=`.

### Funil de venda (painel → "Funil de venda do site")
O site avisa `POST /api/funil` em que etapa cada visita chegou: **visita → play → carrinho → checkout → pagamento → pago**. Uma linha por etapa por visita, na tabela `funil` do D1. Nada pessoal: sem cookie, sem IP; a visita é um número aleatório que morre quando a aba fecha. Robô não conta.

**Origem:** o site lê `?de=<rótulo>` no endereço. Usar rótulos nos links que você divulga pra saber o que traz gente e venda:

| Onde | Link |
|---|---|
| Bio do Instagram | `caramujorecords.com.br/?de=bio` |
| Story | `caramujorecords.com.br/?de=story` |
| Descrição do YouTube | `caramujorecords.com.br/?de=youtube` |
| Link de beat | automático (`beat`) |

Sem `?de=`, o site deduz pelo app (Instagram, WhatsApp, TikTok) ou pelo site anterior (google, outro-site); nada disso = `direto`. O "pago" do funil conta cartão aprovado e PIX confirmado com a aba aberta; a venda oficial continua sendo o webhook e o e-mail.

---

## Contato

**@rideblan33** · [contato@caramujorecords.com.br](mailto:contato@caramujorecords.com.br) · São Carlos, SP — Desde 2018
