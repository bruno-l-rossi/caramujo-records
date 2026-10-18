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
| **Pastas de artista** | `/<artista>/<código>` | Catálogo privado de cada artista (beats e músicas do Drive), com download e prévia pro story, e as pastilhas NOVA / VERSÃO NOVA desde a última visita. Abas "MÚSICAS | BEATS" com o número de cada, abrindo em Músicas (12/10/2026). Os comentários no segundo da faixa estão desligados desde 11/10/2026 (código mantido). Fora do Google. |
| **Link de faixa e de seleção** | `/f/<código>` e `/p/<código>` | Saem do ENVIAR da pasta de artista: marcou uma faixa, `/f/`; duas ou mais, `/p/`. Só aquelas faixas, ouvir sem conta (baixar segue a permissão da pasta). Prévia de uma faixa (04/10/2026): "faixa · artista" + "Produzido por @rideblan33 © Caramujo Records"; de várias: "artista · Caramujo Records" + "N faixas de artista com @rideblan33.". Fora do Google. |
| **Portfólio** | `/rideblan33` | Foto, apresentação, redes e duas abas: Músicas (destaques e recentes que o Bruno produziu, tocando inteiras, e a chamada pro portfólio no Spotify; o botão do topo vira "Ouça o último lançamento") e Beat tapes (a grade na ordem escolhida no painel, com as pastilhas NOVA e EM ALTA). A aba que abre depende de onde a pessoa veio. Toca a última tape direto do topo e tem o botão de compartilhar (story do perfil ou do catálogo, e o link). A vitrine leva pra cá pelo anel com a camisa 33 no topo e pelo 1º card do Sobre nós. |
| **Pedido** | `/pedido/<código>` | Desde 10/10/2026, a entrega na hora (chave no painel): pagou beat do catálogo, o WAV, o MP3 e o contrato saem neste link, no PEDIDO CONFIRMADO e no e-mail. Desde 12/10/2026 também os serviços: quem comprou manda o material por aqui e baixa a entrega quando o @rideblan33 cola o link no painel. Cabeçalho igual ao da vitrine. Privado, fora do Google. |
| **Painel** | `/painel` | Com senha. Desde 12/10/2026 em 5 seções (Hoje, Vendas, Catálogo, Perfil, Números) e Ajustes: barra embaixo no celular, menu do lado no computador. |

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
  api/                  pagamento, webhook, cupom, vitrine, funil, play, ingest, painel, comentario, lista
  _lib/                 banco, loja, perfil, músicas do perfil, e-mails, casamento de beats, sessão, erro,
                        origem dos cliques, comentários das pastas, pedidos e a página do pedido,
                        lista com cupom, cabeçalho das páginas (topo.js), serviços do pedido e os e-mails deles
scripts/                conversor do Drive e cálculo da onda de cada faixa
.github/                este README, docs/DESIGN*.md, prévia do e-mail de entrega, workflows
```

`.github/` fica no GitHub mas não vira endereço no site. `docs/`, `previews/` e `testes/` ficam só na máquina (`.gitignore`).

---

## Fluxos principais

**Compra.** `create-payment` refaz a conta do carrinho com os preços da própria página e o cupom do banco, e recusa se o valor não bater ou se o beat já foi vendido. Cartão responde na hora. PIX confirma pelo `payment-webhook`. No fim, o banco marca o beat como vendido e registra o uso do cupom, e saem os e-mails com o contrato. Nada vai pro GitHub.

**Entrega na hora (desde 10/10/2026).** Chave no painel (home > Entrega na hora), desligada até o Bruno ligar; o "Criar pedido de teste" mostra a página antes. Ligada: pagou (cartão na hora, PIX pelo webhook) um carrinho com beats, nasce um `/pedido/<código>` com o WAV (do Drive), o MP3 (do R2) e o contrato no nome de quem comprou. O link aparece no PEDIDO CONFIRMADO ("BAIXAR SEUS ARQUIVOS", no lugar do contrato) e no e-mail, e o prazo do beat no contrato e no e-mail vira "na hora". Cada arquivo baixa até 20 vezes. O botão entra por fora do código do pagamento (envelope no `vitrine.js`).

**Comentários das pastas (10/10/2026, desligados desde 11/10).** Chave no código: `COMENTARIOS.ligado` em `functions/_lib/comentarios.js`. Ligados: na pasta de artista, o Comentar da barra do player pausa e abre no segundo que tocava; o comentário fica na linha do tempo e vai pro painel (Comentários das pastas: responder, feito, apagar) e pro e-mail do Bruno (no máximo um a cada 15 min por pasta). "Aprovar versão" marca a faixa como APROVADA.

**Pedido de serviço (desde 12/10/2026).** Com a Entrega na hora ligada, quem compra mix, master ou beat personalizado também ganha o `/pedido/<código>`. Lá manda o material (link das vozes ou da faixa; no beat personalizado, a referência e a guia opcional), e o Bruno recebe um e-mail com tudo. Quando termina, ele cola o link do arquivo final em painel > Entrega na hora > Serviços dos pedidos: quem comprou recebe um e-mail e o botão de baixar aparece no pedido. Sem aprovação pelo site (ajuste é pelo Direct). Os campos de cada serviço moram em `functions/_lib/servicos.js`; os e-mails em `servicoemails.js`.

**Leve mais, pague menos (desde 11/10/2026; curva nova em 17/10/2026).** Preço por quantidade de beats do catálogo: o 1º R$119, o 2º R$99 e do 3º em diante R$79 cada (2 = 218, 3 = 297, 5 = 455, 10 = 850). Tabela `LEVE_MAIS={'2':218,'3':297,'+':79}` (o `'+'` é quanto soma cada beat depois do último degrau) no `index.html`, conta igual no `vitrine.js` e no servidor (`totalDosBeats` em `_lib/loja.js`). Desde 12/10/2026 a seção Pacotes saiu: a tabela aparece numa faixa em cima da lista de beats (1 a 5 com o % de desconto) e numa régua no carrinho (quanto falta pro próximo preço). No carrinho, o item com desconto mostra o preço riscado e o rodapé mostra total, desconto (em destaque) e cupom.

**Lista com cupom (desde 11/10/2026).** "Fique por dentro" na vitrine: o e-mail entra na tabela `lista` (`/api/lista`) e recebe um cupom LISTA-XXXX de 25%, uso único, válido por 15 dias, só nos beats do catálogo. A caixa aparece na vitrine e na página de cada beat tape. Sair da lista pelo link do e-mail. Painel: home > Lista de e-mails (desde 12/10/2026 com o resultado de cada e-mail do cupom: saiu, ou o motivo que o Resend deu).

**Leve mais na vitrine (16/10/2026).** "Leve 2 ou mais e pague menos" ao lado da contagem abre a tabela (total de 1 a 5 beats e o preço do 6º em diante, tudo do `LEVE_MAIS`). Com beat no carrinho, o botão dos outros mostra o preço do próximo (R$119 riscado, + R$100). Só aparência: a conta segue no carrinho e no servidor.

**Barra dos beats (16/10/2026).** Em cima da lista: busca, ✦ (Estou com sorte), Gênero e Ordem (menus; no celular sobem de baixo e o voltar fecha) e a chave Só à venda, desligada ao abrir. Os botões de gênero continuam sendo links `/beats/<gênero>` (o clique filtra ali mesmo).

**Quem já gravou, a leitura (16/10/2026).** `functions/_lib/gravou.js` descobre quem canta em cada música da aba Músicas do perfil pelas páginas públicas do Spotify (embed da faixa, página da faixa, álbum e artista), sem chave nem app de desenvolvedor, e traz nome e foto. `?op=gravou-teste` no painel só lê e responde (não grava).

**PIX com 5% (17/10/2026).** `PIX_OFF=5` no `index.html`: o carrinho e o checkout mostram o valor no PIX e o servidor cobra igual (`contaDoCarrinho(..., { pix })` em `functions/api/create-payment.js`, arredonda no centavo). Cupom e Leve mais valem antes, o PIX desconta em cima.

**De onde veio quem comprou (17/10/2026).** O navegador manda a origem da visita (`cr_origem`, a do funil) e a da 1ª visita do aparelho (`cr_primeira`, 90 dias) junto do pagamento; vão no metadata do Mercado Pago e, aprovado, entram na meta `vendas-origem` (`functions/_lib/vendasorigem.js`, últimas 300 vendas, sem dado pessoal). Painel > Vendas > Pedidos: "De onde vêm as vendas".

**Ordem da vitrine (17/10/2026).** Padrão, Mais novos (a beat tape do beat na ordem do perfil: `nv` em `/api/vitrine`), BPM e Aleatória.

**Topo único (18/10/2026, rodada Q).** Todas as páginas usam `functions/_lib/topo.js` (topo, Ajuda e o JS do menu). Páginas do servidor importam; `404.html` e a vitrine levam cópia gerada por `node testes/topo-estatico.mjs`. A consulta dos beats da tape do perfil usa `INDEXED BY tracks_beat_tape` (índice criado no `UMA_VEZ`).

**Quem já gravou, rodada N (17/10/2026).** O @rideblan33 entrou em `ARTISTAS` (ordem por ouvintes, foto do Spotify) e o cartão dele traz toda faixa em que aparece como artista. Plays: o painel tem "Atualizar plays", que entrega o favorito "Plays Caramujo" (roda no Spotify logado do Bruno, lê o número de cada faixa e volta pra `/painel#gravou&plays=...`); a op `gravou-plays` guarda na meta (`plays`, `playsEm`) e esses números valem no lugar dos da lista. O hero da vitrine usa o logo vetorizado (`assets/brand/caramujo-wordmark.svg`).

**Quem já gravou, rodada M (17/10/2026).** LD38 e Thiago S King juntam os perfis repetidos (64 artistas); cada faixa da lista guarda plays, data e a capa do Spotify (`[id, nome, álbum, [artistas], plays, 'AAAA-MM-DD', img]`), o que resolve as capas que faltavam; o cartão @rideblan33 abre a página com as faixas solo (fora dos números; a Nada de Novo Vol. I fica de fora); o painel tem a ordem manual (ops `gravou-ordem` e `gravou-ordem-modo`, meta `ordem`/`ordemManual`); o cupom da lista caiu pra 15% (`PCT` em `_lib/lista.js`).

**Quem já gravou, a página (16/10/2026, rodada K; revisada em 17/10/2026).** Desde 17/10: a lista inclui faixas com o @rideblan33 nos créditos de produção (varredura dos créditos com o Bruno logado), a página ordena por ouvintes mensais (diferença pequena = mais faixas), fotos e capas ficam no nosso R2 (`capa/grv-*`, `capa/gra-*`; a faxina do R2 guarda as usadas), o painel tem "Atualizar" e "Subir uma foto" por artista, e a vitrine mostra a fileira entre o catálogo e os serviços (`functions/_lib/gravouvitrine.js`, marcador `<!--QUEM-GRAVOU-->` no `index.html`). A lista Recentes saiu da aba Músicas do perfil (`RECENTES_NO_PERFIL` em `_lib/musicas.js`).

**Quem já gravou, a página (16/10/2026, rodada K).** A lista conferida à mão mora em `functions/_lib/gravou-lista.js` (57 artistas, 150 faixas em que o @rideblan33 aparece marcado no Spotify; quem tem pasta no Drive vem com o nome da pasta). O que o Bruno muda pelo painel fica na meta `gravou` (`noAr`, `escondidos`, `faixasFora`, `fotos`, `tipos`, `capas`; uma linha de JSON, sem tabela nova). `montarGravou()` junta as duas coisas. Página: `functions/rideblan33/artistas.js` + `functions/_lib/gravoupagina.js` em `/rideblan33/artistas` (fora do ar: 404 pra todo mundo e prévia sem índice pra quem está logado; no ar: entra no sitemap). No perfil, a linha "Quem já gravou" fica no fim da aba Músicas, no lugar do "Ouvir o portfólio completo" (saiu). Painel: Perfil > Quem já gravou (`assets/painel/gravou.js`; ops `gravou`, `gravou-no-ar`, `gravou-esconder`, `gravou-imagens`). Fotos e capas são o endereço do próprio Spotify (`i.scdn.co`), buscadas no painel em lotes de 40 páginas. Artista novo entra editando `gravou-lista.js`.

**Cartão que não carrega (14/10/2026).** Se o módulo do cartão do Mercado Pago não abrir, o checkout oferece "GERAR O PIX": o mesmo pedido vai pro `create-payment` como PIX (o PIX não depende do módulo no navegador) e abre o QR de sempre, com pedido, e-mails e entrega. Antes pedia PIX manual pro contato@, que não é chave PIX.

**PIX no celular.** O PIX gerado fica guardado no navegador por 2 horas. Voltou do app do banco: o site confere na hora. Se a página recarregou ou a pessoa fechou no X, aparece a faixa "Seu PIX de R$ X tá aguardando" (VER O PIX / DESCARTAR); se já pagou, abre o PEDIDO CONFIRMADO. O checkout lembra e-mail e nomes neste navegador (o CPF nunca fica guardado).

**Voltar do celular.** Em todas as páginas, o voltar do Android (e o gesto do iPhone) fecha a folha aberta (carrinho, pacote, checkout, mídia, menu, compartilhar, "...", ENVIAR/BAIXAR) em vez de sair. Com o PIX na tela ele não fecha.

**Beat tape nova.** Pasta nova em `@rideblan33 / Beat tapes` no Drive, com capa e beats (`nome Tom 140bpm`). A conversão da madrugada cria a página e a tape entra em 1º no portfólio. Pra vender os beats: painel > Vitrine > Fila > marcar, escolher o gênero e publicar.

**Vendido ou disponível.** O site manda: beat vendido na vitrine aparece vendido em toda tape. O resto sai do cruzamento com o Drive (`Exclusivos` = disponível; beat na pasta de um artista = vendido). O que não fecha vai pra revisão no painel.

**Compartilhar.** `assets/story.js` monta a arte (1080x1920) ou um vídeo de 15s do trecho mais forte do beat (30s nas pastas de artista), com o link pro sticker.

---

## Painel

Desde 12/10/2026 o painel abre no **Hoje** e se divide em 5 seções (barra embaixo no celular, menu do lado no computador). O endereço guarda a seção (`/painel#pedidos`, `#fila`…). Desde 16/10/2026 o voltar sobe um nível (parte → página da seção → Hoje; trocar de aba ou de seção não empilha), as partes de cada seção são abas (linha embaixo) e os filtros um seletor menor, e no computador o menu do lado abre as partes embaixo da seção (Perfil: Músicas, Ordem das beat tapes, Números do site).

- **Hoje:** o que precisa do Bruno (serviço com material pra entregar, beats na Fila, beats pra revisar nas tapes, e-mail do cupom que não saiu, comentário aberto, banco passando da metade), os números dos últimos 7 dias e atalhos.
- **Vendas:** Pedidos (filtro Pra fazer / Todos / Testes; cada pedido abre com o material de cada serviço e o campo pra entregar pelo link; pedido de teste de beat e de serviço), Cupons e Lista (quem se cadastrou, copiar os e-mails, resultado de cada e-mail do cupom).
- **Catálogo:** Vitrine (beats: editar, vender, destaque, tirar), Fila (publicar beats das tapes), Beat tapes (revisão, linha do @rideblan33 e chave "Mostrar no perfil") e Artistas (as pastas; abre pela última atividade, desde 14/10/2026).
- **Perfil:** Músicas (colar o link do Spotify ou do YouTube, Destaque ou Recente, arrastar, o áudio que toca inteiro), Ordem das beat tapes, Números do site e Ver o perfil.
- **Números:** o Analytics (Vitrine, Beat tapes, Artistas e Portfólio, com período livre e comparação; não conta as visitas do Bruno nem troca de rede como outra pessoa).
- **Ajustes** (engrenagem): chaves Entrega na hora e Músicas no perfil, a situação dos Comentários das pastas (chave no código), o consumo do banco e da prateleira de arquivos.

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
