# Caramujo Records

Site do estúdio Caramujo Records (São Carlos, SP): vitrine de beats exclusivos, serviços de produção, catálogo de entrega pros artistas e o portfólio do @rideblan33.

**→ [caramujorecords.com.br](https://caramujorecords.com.br)** · **→ [caramujorecords.com.br/rideblan33](https://caramujorecords.com.br/rideblan33)**

---

## O que tem no site

| Parte | Endereço | O que faz |
|---|---|---|
| **Vitrine** | `/` | Beats à venda com player contínuo, pacotes (1, 2 ou 3 beats), serviços (beat sob encomenda, mix, master), carrinho e checkout Mercado Pago (cartão e PIX) com contrato digital. |
| **Link de beat** | `/b/<beat>` | Prévia pro Direct/WhatsApp com capa, ficha e preço. Abre a vitrine com o beat tocando. |
| **Página do beat** | `/beat/<beat>` | Desde 03/10/2026, pro Google: capa, ficha, prévia, preço, pacotes com % off, beats parecidos. Vendido fica com o preço riscado e "Podem te interessar". O carrinho e o pagamento continuam na vitrine (`/#add=<beat>`, `/#carrinho`). |
| **Página do gênero** | `/beats/<gênero>` | Desde 03/10/2026: todos os beats do gênero (ex.: `/beats/boom-bap`), Tocar todos, ordem por BPM, pacotes. `/beats` sozinho vai pra vitrine. Gêneros e beats entram no `/sitemap.xml`. |
| **Beat tapes** | `/<tape>/<código>` | Cada tape do @rideblan33 é uma página pública: ouvir, comprar o beat disponível, compartilhar no story e seguir pras outras tapes. Indexada no Google. |
| **Pastas de artista** | `/<artista>/<código>` | Catálogo privado de cada artista (beats e músicas do Drive), com download e prévia pro story. Fora do Google. |
| **Portfólio** | `/rideblan33` | Foto, apresentação, redes e a grade de todas as beat tapes na ordem escolhida no painel, com as pastilhas NOVA e EM ALTA. Toca a última tape direto do topo e tem o botão de compartilhar (story do perfil ou do catálogo, e o link). A vitrine leva pra cá pelo anel com a camisa 33 no topo e pelo 1º card do Sobre nós. |
| **Painel** | `/painel` | Com senha. Artistas, Beat tapes (ordem do portfólio incluída), Vitrine (beats, fila, cupons) e Analytics. |

---

## Stack

- **Front:** HTML, CSS e JS puros. A vitrine é um `index.html` só; tapes e pastas usam o molde `catalogo/app.html`. Sem framework, de propósito.
- **Hospedagem:** Cloudflare Pages com deploy a cada push na `main`.
- **Backend:** Pages Functions (`functions/`).
- **Banco:** D1 (beats da vitrine, cupons, catálogos, eventos, funil).
- **Áudio e capas:** R2 (MP3 de 128k e capas de 1000px, com média de 480px e miniatura de 200px). Capa e áudio ficam copiados na borda da Cloudflare depois do primeiro pedido; a próxima faixa da lista é aquecida quando a atual passa da metade.
- **Conversão:** GitHub Actions lê o Google Drive, converte WAV em MP3 (ffmpeg) e manda pro site (`scripts/sync.mjs`).
- **Pagamento:** Mercado Pago. **E-mails:** Resend. **Contato:** EmailJS (carrega só quando a pessoa usa o formulário).

---

## Estrutura

```
index.html              vitrine (HTML + CSS + JS)
catalogo/app.html       molde das beat tapes e pastas de artista
404.html  _headers  _routes.json  robots.txt  llms.txt  og-image.png
assets/                 marca, fontes próprias, mídias do estúdio, perfil/, story.js,
                        mp4-muxer.js, painel/ (analytics.js, vitrine.js), termos-de-licenca.pdf
functions/
  index.js              serve a home com a lista de beats do banco
  [artista]/[codigo].js tapes e pastas de artista
  rideblan33/           portfólio
  sitemap.xml.js        home, portfólio e tapes
  b/ f/ p/              link de beat, de faixa e de seleção
  audio/ capa/ dl/      áudio, capas e downloads
  painel/               painel
  api/                  pagamento, webhook, cupom, vitrine, funil, play, ingest, painel
  _lib/                 banco, loja, perfil, e-mails, casamento de beats, sessão, erro
scripts/                conversor do Drive e cálculo da onda de cada faixa
.github/                este README, docs/DESIGN*.md, prévia do e-mail de entrega, workflows
```

`.github/` fica no GitHub mas não vira endereço no site. `docs/`, `previews/` e `testes/` ficam só na máquina (`.gitignore`).

---

## Fluxos principais

**Compra.** `create-payment` refaz a conta do carrinho com os preços da própria página e o cupom do banco, e recusa se o valor não bater ou se o beat já foi vendido. Cartão responde na hora. PIX confirma pelo `payment-webhook`. No fim, o banco marca o beat como vendido e registra o uso do cupom, e saem os e-mails com o contrato. Nada vai pro GitHub.

**PIX no celular.** O PIX gerado fica guardado no navegador por 2 horas. Voltou do app do banco: o site confere na hora. Se a página recarregou ou a pessoa fechou no X, aparece a faixa "Seu PIX de R$ X tá aguardando" (VER O PIX / DESCARTAR); se já pagou, abre o PEDIDO CONFIRMADO. O checkout lembra e-mail e nomes neste navegador (o CPF nunca fica guardado).

**Voltar do celular.** Em todas as páginas, o voltar do Android (e o gesto do iPhone) fecha a folha aberta (carrinho, pacote, checkout, mídia, menu, compartilhar, "...", ENVIAR/BAIXAR) em vez de sair. Com o PIX na tela ele não fecha.

**Beat tape nova.** Pasta nova em `@rideblan33 / Beat tapes` no Drive, com capa e beats (`nome Tom 140bpm`). A conversão da madrugada cria a página e a tape entra em 1º no portfólio. Pra vender os beats: painel > Vitrine > Fila > marcar, escolher o gênero e publicar.

**Vendido ou disponível.** O site manda: beat vendido na vitrine aparece vendido em toda tape. O resto sai do cruzamento com o Drive (`Exclusivos` = disponível; beat na pasta de um artista = vendido). O que não fecha vai pra revisão no painel.

**Compartilhar.** `assets/story.js` monta a arte (1080x1920) ou um vídeo de 15s do trecho mais forte do beat (30s nas pastas de artista), com o link pro sticker.

---

## Painel

- **Artistas:** conversão, download, capa e atividade de cada pasta.
- **Beat tapes:** a linha fixa do @rideblan33 abre a atividade do portfólio e a ordem das tapes (arrastar e soltar). Cada tape tem a chave "Mostrar no perfil".
- **Vitrine:** beats (editar, vender, destaque, tirar), fila de publicação e cupons.
- **Analytics:** Vitrine (funil de venda), Beat tapes, Artistas e Portfólio, com período livre e comparação.
- A home do painel mostra o consumo do banco no dia.

Origem das visitas: `?de=<rótulo>` nos links divulgados (ex.: `/rideblan33?de=bio`, `/?de=story`).

---

## SEO

- Vitrine, portfólio e tapes indexáveis, com `canonical`, descrição própria e dados estruturados (`ProfessionalService`, `Person`, `MusicPlaylist`).
- Pastas de artista, `/f/` e `/p/` com `noindex`.
- `sitemap.xml` gerado do banco. `robots.txt` aponta pro sitemap e libera buscadores e IAs. `llms.txt` resume o estúdio pra agentes.

---

## Variáveis e bindings (Cloudflare Pages)

| Nome | Tipo | Pra quê |
|---|---|---|
| `DB` | D1 | banco `caramujo` |
| `AUDIO` | R2 | bucket `caramujo-records` (prefixos `mp3/`, `capa/`, `onda/`; domínio público `som.caramujorecords.com.br`) |
| `MP_ACCESS_TOKEN` | secret | Mercado Pago |
| `RESEND_API_KEY`, `NOTIFY_EMAIL`, `NOTIFY_FROM` | secret | e-mails de venda |
| `PAINEL_SENHA` | secret | senha do painel e chave do cookie (trocar derruba as sessões; exige redeploy) |
| `INGEST_TOKEN` | secret (Pages e GitHub) | conversor → site |
| `GDRIVE_SA_JSON` | secret (Pages e GitHub) | leitura do Drive |
| `GITHUB_TOKEN` | secret | painel dispara a conversão no Actions |

**Áudio por domínio próprio (ligado em 03/10/2026).** `functions/_lib/midia.js` tem `MIDIA = 'https://som.caramujorecords.com.br'`: vitrine, tapes, pastas, links `/f/` e `/p/` e o perfil tocam o MP3 direto do R2 pela CDN, sem gastar chamada de função. Capas e ondas seguem pelas funções. O que está ligado na Cloudflare:
1. R2 > `caramujo-records` > Settings > Custom Domains: `som.caramujorecords.com.br` (o bucket só tem `mp3/`, `capa/` e `onda/`; o WAV vem do Drive pela `/dl`, nunca do R2).
2. No mesmo lugar, CORS Policy: `[{"AllowedOrigins":["https://caramujorecords.com.br","https://www.caramujorecords.com.br"],"AllowedMethods":["GET","HEAD"],"AllowedHeaders":["Range"],"ExposeHeaders":["Content-Range","Content-Length","Accept-Ranges","ETag"],"MaxAgeSeconds":86400}]`
3. Zona caramujorecords.com.br > Rules > Transform Rules > Response Header: "Audio som.caramujorecords: permissao de tocar no site", `http.host eq "som.caramujorecords.com.br"`, Set static `Access-Control-Allow-Origin: *` e `Access-Control-Expose-Headers: Content-Range, Content-Length, Accept-Ranges, ETag`. O R2 só põe o CORS quando o pedido traz Origin, e a cópia da CDN guarda o que veio primeiro: sem a regra, um play sem CORS deixava a tape (que toca com crossOrigin) muda. Não apagar.
Pra voltar ao caminho antigo: `MIDIA = ''` e publicar (as três coisas da Cloudflare podem ficar).

Workflows: **Catálogo dos artistas** (madrugada e manual), **Catálogo, carga geral** (6 frentes em paralelo) e **Catálogo, ondas das faixas**.

---

## Deploy

```bash
git add <arquivos> && git commit -m "mensagem" && git push
```

Todo push na `main` publica. Antes de subir mudança em `functions/`, compilar com esbuild: um erro de sintaxe derruba o deploy inteiro. Mexeu no `_headers` (CSP)? Testar o checkout de ponta a ponta.

---

## Plano B e limites

- Banco fora: a home usa a última lista boa guardada na Cloudflare (30 dias). Sem ela, o navegador usa a cópia local ou mostra o aviso de fora do ar.
- Página que quebra mostra a página de erro da casa (`_middleware.js`).
- Plano gratuito: 100 mil chamadas de função por dia, D1 com 5 mi de linhas lidas por dia, R2 com 10 GB (o ingest recusa acima de 8 GB). Os contadores zeram às 21h de Brasília.

---

## Regras do projeto

- Carrinho e pagamento não são reescritos. Sem migração pra framework.
- Link de pasta de artista nunca aparece em story, portfólio, sitemap ou Google.
- Cores e fontes só as de `.github/docs/DESIGN.md` (marca, terroso) e `DESIGN-catalogo.md` (páginas pretas).
- Números públicos só os reais: 40+ artistas, 200+ faixas, 2,5 mi de streams.

---

**@rideblan33** · [contato@caramujorecords.com.br](mailto:contato@caramujorecords.com.br) · São Carlos, SP · desde 2018
