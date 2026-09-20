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
`/capa/<id>`. Sem imagem na pasta, aparece o logo vertical da Caramujo. A mesma arte vira o
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
| Só na pasta de algum artista (gravado ou não) | **vendido** |
| Nos dois, ou em nenhum | sem tag, e entra na lista de revisão do painel |

O que casa é o título limpo; quando os dois lados têm BPM ou tom, eles também têm que bater
(senão dois `intro` viravam a mesma faixa). O casamento é tolerante onde precisa ser:
acento não conta (`dígitos` = `digitos`), `F#` e `Gb` são a mesma tecla, `F#` casa com
`F#maj`, e o BPM tem 1 de folga (exportação com casa decimal arredonda diferente).

A lista de revisão aparece em dois lugares no painel: o total vira um link âmbar na linha
de cima (ao lado da prateleira), e o bloco completo, agrupado por tape e com o motivo de
cada caso, fica no topo do portfólio.

Cada beat da lista tem dois botões, **disponível** e **vendido**, e cada tape com mais de um
pendente tem o par pra marcar todos de uma vez. A resposta vai pra `tracks.venda_manual` e
**vence o cruzamento pra sempre**: a conversão seguinte não desfaz. É a saída pros casos que
o Drive não conta — beat vendido que está na pasta do artista com outro nome, ou beat
disponível que de propósito não entra em Exclusivos (tape sem licença de exclusividade).

Na carga geral, as seis frentes rodam ao mesmo tempo e uma tape pode ser lida antes de o
artista dela entrar no banco. Por isso o workflow fecha com um job `tapes`, que roda depois
de todos e só acerta as tags — não reconverte áudio nenhum.

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

## Contato

**@rideblan33** · [contato@caramujorecords.com.br](mailto:contato@caramujorecords.com.br) · São Carlos, SP — Desde 2018
