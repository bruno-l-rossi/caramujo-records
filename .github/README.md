# Caramujo Records

Site do estúdio Caramujo Records (São Carlos, SP): vitrine de beats exclusivos, serviços de produção, catálogo de entrega pros artistas e o portfólio do @rideblan33.

**→ [caramujorecords.com.br](https://caramujorecords.com.br)** · **→ [caramujorecords.com.br/rideblan33](https://caramujorecords.com.br/rideblan33)**

---

## O que tem no site

| Parte | Endereço | O que faz |
|---|---|---|
| **Vitrine** | `/` | Beats à venda com player contínuo, pacotes (1, 2 ou 3 beats), serviços (beat sob encomenda, mix, master), carrinho e checkout Mercado Pago (cartão e PIX) com contrato digital. |
| **Link de beat** | `/b/<beat>` | Prévia pro Direct/WhatsApp com capa, ficha e preço. Desde 04/10/2026 abre a página do beat (`/beat/<beat>`), guardando de onde a pessoa veio (story, link, compartilhar) pro funil. É o link do compartilhar da vitrine e da página do beat (beat da tape compartilha a tape, ver abaixo). |
| **Página do beat** | `/beat/<beat>` | Desde 03/10/2026, pro Google: capa, ficha, prévia, preço, pacotes com % off, beats parecidos. Vendido fica com o preço riscado e "Podem te interessar". O carrinho e o pagamento continuam na vitrine (`/#add=<beat>`, `/#carrinho`). |
| **Página do gênero** | `/beats/<gênero>` | Desde 03/10/2026: todos os beats do gênero (ex.: `/beats/boom-bap`), Tocar todos, ordem por BPM, pacotes. `/beats` sozinho vai pra vitrine. Gêneros e beats entram no `/sitemap.xml`. |
| **Beat tapes** | `/<tape>/<código>` | `?faixa=<beat>` (04/10/2026) abre a tape já no beat, com a prévia do beat no Direct/WhatsApp: é o link do compartilhar de uma faixa da tape, vendida ou não. Cada tape do @rideblan33 é uma página pública: ouvir, comprar o beat disponível, compartilhar no story e seguir pras outras tapes. Indexada no Google. |
| **Pastas de artista** | `/<artista>/<código>` | Catálogo privado de cada artista (beats e músicas do Drive), com download e prévia pro story. Desde 10/10/2026: comentário no segundo da faixa (marcas na linha do tempo, resposta do @rideblan33 pelo painel), "Aprovar versão" e as pastilhas NOVA / VERSÃO NOVA desde a última visita. Fora do Google. |
| **Link de faixa e de seleção** | `/f/<código>` e `/p/<código>` | Saem do ENVIAR da pasta de artista: marcou uma faixa, `/f/`; duas ou mais, `/p/`. Só aquelas faixas, ouvir sem conta (baixar segue a permissão da pasta). Prévia de uma faixa (04/10/2026): "faixa · artista" + "Produzido por @rideblan33 © Caramujo Records"; de várias: "artista · Caramujo Records" + "N faixas de artista com @rideblan33.". Fora do Google. |
| **Portfólio** | `/rideblan33` | Foto, apresentação, redes e duas abas: Músicas (destaques e recentes que o Bruno produziu, tocando inteiras, e a chamada pro portfólio no Spotify; o botão do topo vira "Ouça o último lançamento") e Beat tapes (a grade na ordem escolhida no painel, com as pastilhas NOVA e EM ALTA). A aba que abre depende de onde a pessoa veio. Toca a última tape direto do topo e tem o botão de compartilhar (story do perfil ou do catálogo, e o link). A vitrine leva pra cá pelo anel com a camisa 33 no topo e pelo 1º card do Sobre nós. |
| **Pedido** | `/pedido/<código>` | Desde 10/10/2026, a entrega na hora (chave no painel): pagou beat sem stems, o WAV, o MP3 e o contrato saem neste link, no PEDIDO CONFIRMADO e no e-mail. Privado, fora do Google. |
| **Painel** | `/painel` | Com senha. Artistas, Beat tapes (ordem do portfólio incluída), Vitrine (beats, fila, cupons), Analytics, Comentários das pastas e Entrega na hora. |

---

## Stack

- **Front:** HTML, CSS e JS puros. A vitrine é o `index.html` (marcação e os dados que o servidor escreve a cada visita) com o visual e o código em `assets/vitrine/` (desde 10/10/2026, guardados no navegador); tapes e pastas usam o molde `catalogo/app.html`. Sem framework, de propósito.
- **Hospedagem:** Cloudflare Pages com deploy a cada push na `main`.
- **Backend:** Pages Functions (`functions/`).
- **Banco:** D1 (beats da vitrine, cupons, catálogos, eventos, funil).
- **Áudio e capas:** R2 (MP3 de 128k e capas de 1000px, com média de 480px e miniatura de 200px), direto pelo domínio `som.caramujorecords.com.br` (capas desde 10/10/2026; a função `/capa/` fica de reserva quando o R2 falha). Ficam copiados na borda da Cloudflare depois do primeiro pedido; a próxima faixa da lista é aquecida quando a atual passa da metade.
- **Conversão:** GitHub Actions lê o Google Drive, converte WAV em MP3 (ffmpeg) e manda pro site (`scripts/sync.mjs`).
- **Pagamento:** Mercado Pago. **E-mails:** Resend. **Contato:** EmailJS (carrega só quando a pessoa usa o formulário).

---

## Estrutura

```
index.html              vitrine: marcação + os dados que o servidor escreve (lista, preços, gêneros, destaque)
assets/vitrine/         vitrine.css e vitrine.js: o visual e o código da vitrine (?v= no index.html)
catalogo/app.html       molde das beat tapes e pastas de artista
404.html  _headers  _routes.json  robots.txt  llms.txt  og-image.png
assets/                 marca, fontes próprias, mídias do estúdio, perfil/, story.js, mp4-muxer.js,
                        painel/ (analytics.js, vitrine.js, musicas.js, comentarios.js), termos-de-licenca.pdf
functions/
  index.js              serve a home com a lista de beats do banco
  [artista]/[codigo].js tapes e pastas de artista
  rideblan33/           portfólio
  sitemap.xml.js        home, portfólio e tapes
  b/ f/ p/              link de beat, de faixa e de seleção
  audio/ capa/ dl/      áudio, capas e downloads
  pedido/               entrega na hora (página do pedido, WAV, MP3 e contrato)
  painel/               painel
  api/                  pagamento, webhook, cupom, vitrine, funil, play, ingest, painel, comentario
  _lib/                 banco, loja, perfil, músicas do perfil, e-mails, casamento de beats, sessão, erro,
                        origem dos cliques, comentários das pastas, pedidos e a página do pedido
scripts/                conversor do Drive e cálculo da onda de cada faixa
.github/                este README, docs/DESIGN*.md, prévia do e-mail de entrega, workflows
```

`.github/` fica no GitHub mas não vira endereço no site. `docs/`, `previews/` e `testes/` ficam só na máquina (`.gitignore`).

---

## Fluxos principais

**Compra.** `create-payment` refaz a conta do carrinho com os preços da própria página e o cupom do banco, e recusa se o valor não bater ou se o beat já foi vendido. Cartão responde na hora. PIX confirma pelo `payment-webhook`. No fim, o banco marca o beat como vendido e registra o uso do cupom, e saem os e-mails com o contrato. Nada vai pro GitHub.

**Entrega na hora (desde 10/10/2026).** Chave no painel (home > Entrega na hora), desligada até o Bruno ligar; o "Criar pedido de teste" mostra a página antes. Ligada: pagou (cartão na hora, PIX pelo webhook) um carrinho de beats sem stems, nasce um `/pedido/<código>` com o WAV (do Drive), o MP3 (do R2) e o contrato no nome de quem comprou. O link aparece no PEDIDO CONFIRMADO ("BAIXAR SEUS ARQUIVOS") e no e-mail. Stems e serviços seguem os prazos do contrato. Cada arquivo baixa até 20 vezes. O botão entra por fora do código do pagamento (envelope no `vitrine.js`).

**Comentários das pastas (desde 10/10/2026).** Na pasta de artista, o Comentar da barra do player pausa e abre no segundo que tocava; o comentário fica na linha do tempo e vai pro painel (Comentários das pastas: responder, feito, apagar) e pro e-mail do Bruno (no máximo um a cada 15 min por pasta). "Aprovar versão" marca a faixa como APROVADA.

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
- **Músicas do perfil:** colar o link do Spotify ou do YouTube já lê (nome, artistas, data e capa vêm sozinhos; vários links de uma vez entram nas recentes), Destaque ou Recente, arrastar pra ordenar (destaques sempre; recentes pela data ou "Na minha ordem"), o áudio que toca inteiro no perfil (arquivo da pasta do artista, achado pelo nome), tirar e a chave "No ar" (desligada = só quem está logado vê a prévia).
- **Analytics:** Vitrine (funil de venda), Beat tapes, Artistas e Portfólio, com período livre e comparação. Desde 10/10/2026 não conta as visitas do Bruno (o aparelho fica marcado ao entrar no painel) e conta pessoa por aparelho (trocar de rede não vira outra pessoa).
- **Comentários das pastas** e **Entrega na hora:** linhas largas na home (ver Fluxos).
- A home do painel mostra o consumo do banco no dia.

Origem das visitas: `?de=<rótulo>` nos links divulgados (ex.: `/rideblan33?de=bio`, `/?de=story`). Links internos do site saem com o endereço limpo e a origem em `data-de` (desde 08/10/2026): o script leva-de (`functions/_lib/origem.js`, colado igual no `index.html` e no `catalogo/app.html`) põe o `?de=` só no clique, pra o Google indexar o endereço limpo. Link novo entre páginas do site: `href` limpo + `data-de`, nunca `?de=` no `href` (o teste42 reprova).

---

## SEO

- Vitrine, portfólio e tapes indexáveis, com `canonical`, descrição própria e dados estruturados (`ProfessionalService`, `Person`, `MusicPlaylist`).
- Pastas de artista, `/f/`, `/p/` e `/pedido/` com `noindex` (`/pedido/` e `/painel` também fora do `robots.txt`).
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

Todo push na `main` publica. Antes de subir mudança em `functions/`, compilar com esbuild: um erro de sintaxe derruba o deploy inteiro. Mexeu no `_headers` (CSP)? Testar o checkout de ponta a ponta. Mexeu no `assets/vitrine/vitrine.css` ou `vitrine.js`? Trocar o `?v=` deles no `index.html` (`node testes/vitrine-versao.mjs`): sem isso quem já visitou segue com o arquivo velho por até 1 dia.

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
