# Redesenho · progresso da revisão v2 (16/11/2026)
Pedido do Bruno: revisar e otimizar o plano (jornada fluida, minimalismo, função, fazer a pessoa voltar), incluir painel e página de artistas, salvar em etapas.
Como retomar: abrir conversa nova, apontar pra pasta do site, pedir pra ler docs/redesenho/PROGRESSO.md e seguir da 1ª etapa sem [x].
- [x] 1. Levantar o painel e as páginas de artista como estão hoje
- [x] 2. Plano v2 (jornada da loja otimizada) salvo em redesenho-v2-2026-11-16.md
- [x] 3. Painel: ideias + mockups
- [x] 4. Páginas de artista: ideias + mockups
- [x] 5. Canvas atualizado e resumo final

## Etapa 1 · o que eu levantei (16/11)
- Painel hoje (já revisado em 03 e 04/11, ver docs/revisao-painel-2026-11-03.md): Hoje · Vendas (Pedidos, Cupons, Lista) · Catálogo (No site, Pra publicar, Tapes, Artistas) · Perfil (perfil, músicas, quem já gravou) · Números · Ajustes. Código: functions/painel/index.js + assets/painel/{painel,vitrine,musicas,gravou,analytics}.js (4.286 linhas).
- "Página de artistas" lida de 2 jeitos, cobrir os 2: (A) pasta privada do artista em /[artista]/[codigo] (catalogo/app.html): trocar capa, nome, "3 músicas", ENVIAR · PRÉVIA · BAIXAR, lista com etiquetas NOVO e mastered, Ordem, "Explorar beats", portfólio. (B) /rideblan33/artistas: "Quem já gravou", 65 artistas, 185 músicas, busca, artista em destaque com lista de músicas e Spotify, grade "Todos" com "mostrar mais".
- Ideias centrais da v2 (antes de escrever): casca única com o som que não para ao trocar de aba; 4 abas (Salvos vira pílula); ficha e player aberto viram 1 coisa; adicionar sem meia tela; busca e filtros numa tela só; pagamento em 2 passos com os 4 campos; faixa de retorno (novos desde a última visita, salvos, salvo que foi vendido); "Já comprei" à vista.

## Etapa 2 (16/11)
- redesenho-v2-2026-11-16.md salvo: o que muda da v1, jornadas J1 a J6, casca unica, painel P1 a P12, artistas A e B, medir, plano e decisoes 13 a 20. Falta: mockups O a W (gerador gen6.py, ainda nao existe) e publicar no canvas.

## Etapas 3 e 4 (16/11)
- 9 mockups novos em mockups/ (o-beats-v2, p-buscar, q-pagar, r/s/t/u painel, v-artista-area, w-quem-gravou) + gerador gen6.py (depende do gen5.py; ROOT aponta pra pasta do container, trocar antes de rodar). Falta: publicar no canvas (fileiras em y 5600+).

## Etapa 5 (16/11)
- Canvas f319e807 com as 9 pranchas novas (O a W) em 3 fileiras a partir de y 5600. Revisão v2 CONCLUÍDA. Próximo: conversa nova lê redesenho-do-zero (v1) + redesenho-v2 e faz as perguntas de <primeira_resposta_da_conversa_nova> da v2.

# Fase 2 · decisões de 17/11 e execução
Decisões do Bruno:
- "Página dos artistas" = a página PRIVADA que ele manda pros artistas (/[artista]/[codigo], catalogo/app.html). "Quem já gravou" é outra coisa e ele chama assim.
- Começar pelos GANHOS RÁPIDOS no site atual.
- Construir o site NOVO em paralelo, sem afetar o site no ar, pra ele testar fora do ar antes de migrar.
Etapas:
- [x] F2.1 Adicionar sem a meia tela: faixa curta em cima do player, 6 s, "Carrinho ›" (teste69 reescrito)
- [x] F2.2 Pílula ♡ N no começo da fileira de gêneros (teste66 ajustado)
- [x] F2.3 Faixa de retorno (teste77 novo)
- [x] F2.4 Ganhos da loja entregues no Mac em 17/11 (79 testes ok). Falta o push do Bruno
- [x] F2.5 Painel: o Hoje já era caixa de entrada (revisão 03/11); entrou o prazo dos serviços (21 dias desde o material, teste78). Entregue no Mac, falta o push
- [x] F2.6 Site novo v1 em OUTPUTS/caramujo-novo (2 cliques no index.html): Beats, buscar e filtrar, salvos, retorno, ficha, Tapes, tape, Serviços, Carrinho, Fechar pedido, pedido pago (simulado), perfil, tema claro na Ajuda. Testado 390 e 1280 sem erro.

## F2.6 decisões técnicas (17/11)
- Site novo em OUTPUTS/caramujo-novo/ (pasta irmã, FORA do repo do site: nunca é publicado). Abre com 2 cliques no index.html (file://), sem servidor.
- Dados: retrato do /api/vitrine tirado pelo navegador embutido em 17/11 (150 beats) em dados.js. Áudio e capas vêm do som.caramujorecords.com.br (precisa de internet pra tocar).
- Pagamento DESLIGADO no site de teste (o botão Pagar só avisa). Nada toca D1, Mercado Pago ou o site no ar.
- Estrutura: index.html + estilo.css + app.js + dados.js + LEIA-ME.md. Casca única por hash (#/beats, #/tapes, #/tape/x, #/servicos, #/carrinho, #/pagar, #/perfil): o <audio> nunca recarrega.
- Trabalho no container em /home/claude/novo; entrega por tgz como o site.

## Próximos passos (depois do teste do Bruno no site novo)
- Ouvir o que ele achou do site novo e ajustar.
- Site novo: Quem já gravou com folha do artista (W), tabela com colunas no computador (K), página do beat pro Google, área do artista (V), painel (R a U).
- Decisões abertas: tema (escuro/claro/os dois), logo, foto do perfil, "Atenção!", linha da tape, .zip, e-mail de beat novo (ver redesenho-v2 <decisoes_abertas_v2>).
- Pra migrar: o site novo vira as páginas do repositório por partes (plano_v2), com os testes. Não migrar sem ok.

# Fase 3 · 18/11: site novo com a identidade do DESIGN.md + Netlify
Pedido: adaptar o visual do site novo ao .github/docs/DESIGN.md (Cormorant + Helvetica caixa alta + Plex Mono, marrons, fire, cantos retos, borda wire, logo caramujo-h) e subir num Netlify pra comparar lado a lado no celular.
- [x] F3.1 Visual do DESIGN.md no site novo (fontes embutidas no estilo.css pra abrir com 2 cliques; caixa alta só no gênero, nunca no tom)
- [ ] F3.2 Netlify (pasta pronta, com _headers e robots.txt de noindex; esperando o Bruno ligar o conector; 18/11: o conector aparece como 'connect_incomplete', a entrada na conta não terminou): o daqui não alcança api.netlify.com (container e Mac). Caminho: conector oficial do Netlify (cartão mostrado ao Bruno em 18/11). Depois de conectado: criar site "caramujo-novo-teste" (ou parecido), noindex, publicar a pasta.
- [ ] F3.3 Link pro Bruno + o que conferir no celular

## F3.2 situação (18/11)
- Conector do Netlify ligado. Site criado: caramujo-novo-teste (id a463abb4-aee3-4fb3-a5a9-81b6cfbb1bd7, time bruno-l-rossi), endereço https://caramujo-novo-teste.netlify.app, ainda SEM deploy.
- Daqui não dá pra enviar arquivos: o deploy do conector é por linha de comando (npx @netlify/mcp) e api/mcp.netlify.com são bloqueados no container e no Mac. O import por URL pede link público; o compartilhamento público no Drive foi barrado pela segurança.
- Pasta pronta pro Bruno arrastar: OUTPUTS/caramujo-novo-netlify (index.html único com tudo dentro + _headers + robots.txt, noindex). Arrastar em app.netlify.com/projects/caramujo-novo-teste/deploys.
- Ficou no Drive do Bruno (privado) o arquivo caramujo-novo-teste.html (id 1Njwmj2p0uBZLyO733YWg0vrBXxlXlbbt). Pode ir pro lixo depois.
- Pra republicar depois de mudança: gerar o arquivo único de novo (script em /home/claude/novo → /home/claude/unico) e arrastar de novo.

## 18/11 abertura
- Site novo ganhou a abertura do site no ar (caramujo se desenha, "Atenção! Você está ouvindo um beat do @rideblan33", logo voa pro topo, frase pousa no topo da aba Beats) e o topo com a tag e os números. Pasta caramujo-novo e caramujo-novo-netlify atualizadas. Netlify ainda sem deploy (Bruno arrasta a pasta).

# Fase 4 · 18/11: pacote completo do site novo (pedido: "termine os pontos pendentes do site novo")
- [x] F4.1 Dados do perfil e do Quem já gravou (retrato das páginas públicas /rideblan33 e /rideblan33/artistas pelo navegador embutido)
  - feito 18/11: novo/gravou.js, 64 artistas e 189 músicas, sha256 3aa5f1f4… igual ao bloco qgDados do site.
- [x] F4.2 Quem já gravou: grade com foto, busca, folha do artista (músicas, Spotify, "Quero um som assim"); perfil com músicas produzidas
  - feito 18/11: #/artistas (grade 24 por vez, busca sem acento, folha com 6 músicas e "Ver as N", Spotify, Compartilhar, "Quero um som assim"); #/artistas/<slug> abre a folha; perfil com 6 artistas e 5 músicas.
- [x] F4.3 Computador: lista em colunas (gênero, BPM, tom, tempo) que ordena pelo título
  - feito 18/11: cabeçalho Beat · Gênero · BPM · Tom · Tempo em Beats e na tape (só no computador); clicar inverte a ordem; vendidos seguem no fim; não conta como filtro.
- [x] F4.4 Endereço do beat (#/beat/slug abre a ficha por cima da lista; é o que vira a página do beat pro Google na migração)
  - feito 18/11: #/beat/<slug> abre a ficha por cima; fechar volta pra #/beats sem passo a mais no histórico; slug que não existe cai na lista.
- [x] F4.5 Área do artista (pasta privada) com artista de EXEMPLO (nunca dado real de pasta privada)
  - feito 18/11: #/area com MC Exemplo (inventado; som de beats públicos): AGORA com etapas e previsão, Suas músicas com Baixar e ⋯, Próximo som (3 beats + 2 serviços). Recado por faixa ficou fora (precisa de ok).
- [x] F4.6 Painel com números de EXEMPLO: Hoje (caixa de entrada), Vendas (serviços com prazo), Publicar em pilha, Números (funil)
  - feito 18/11: #/painel/hoje|vendas|catalogo|numeros com abas próprias e botão +; prazo de 21 dias contado do material; pilha de publicar com gênero obrigatório; funil com frase calculada. Tudo marcado como exemplo.
- [x] F4.7 Arquivo único pro Netlify, testes, entrega
  - feito 18/11: caramujo-novo e caramujo-novo-netlify (index.html único, 465 KB) sincronizados e conferidos por md5; novo4 (telas novas) e novo5 (loja) sem falha em 390 e 1280, na pasta e no arquivo único; novo1 a novo3 sem erro; fotos do som.caramujorecords conferidas (640x640). Script e testes em caramujo-novo/ferramentas/. Falta: o Bruno arrastar caramujo-novo-netlify no Netlify.
