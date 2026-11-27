# Plano técnico da F4: Teste com seus dados

Sobra Vida · escrito em 27/11/2026 · fontes: documento de produto, as notas da fase e o que as fases F1 a F3 deixaram pronto.

## Objetivo e critério de pronto

A F4 coloca o Sobra Vida à prova com dados reais: os lançamentos de 2026 da planilha do dono entram num **login novo** (conta privada) e o relatório Resultado do ano é comparado com a planilha.

**Pronto quando:** a DRE do app bate com a da planilha, centavo a centavo, mês a mês e por grupo.

Estimativa do plano de execução: 15 horas, prevista de 29/03 a 18/04/2027 (pode começar já, porque a F3 terminou em 27/11/2026).

## Regras desta fase (direito autoral e privacidade)

- **A planilha é só fonte de dados.** Ela é lida no computador do dono apenas para extrair os lançamentos (data, valor, categoria, conta, situação). Fórmulas, layout e textos dela não entram no app. As regras de cálculo continuam vindo do documento de produto.
- **Os dados reais não saem do computador do dono, a não ser para o login dele.** O arquivo convertido (CSV) fica numa pasta do dono fora do projeto e nunca vai para o GitHub. O Claude não envia esses dados a nenhum outro serviço.
- **Login novo:** decisão do usuário em 27/11/2026. O login atual continua como ambiente de teste, com os dados fictícios.

## Como os dados entram

| Etapa | Onde | Quem |
| --- | --- | --- |
| 1. Ler a planilha e listar as abas e colunas de lançamentos | Computador do dono | Claude |
| 2. Montar o mapa "categoria da planilha → categoria do Sobra Vida" | Nota no cofre, aprovada pelo dono | Claude propõe, dono aprova |
| 3. Converter os lançamentos para o modelo CSV do app | Computador do dono (arquivo fora do projeto) | Claude, com um script local |
| 4. Importar o CSV pela tela "Importar lançamentos" | App, no login novo | Dono |
| 5. Exportar o Resultado do ano em CSV e comparar com a planilha | Computador do dono | Claude, com um script local |

A tela de importação é um recurso do app (não um atalho só para esta fase): ela fica disponível para qualquer usuário e prepara a importação de extratos da F6.

## Telas

| Endereço | Tela | Principais ações |
| --- | --- | --- |
| `/configuracoes/importar` | Importar lançamentos (CSV): baixar o modelo, enviar o arquivo, ver a prévia com os erros de cada linha | Importar, desfazer uma importação |
| `/relatorios/resultado` | Botão "Exportar CSV" no Resultado do ano | Baixar o arquivo do ano, na visão escolhida |

## Modelo CSV de importação

Uma linha por lançamento, separador ponto e vírgula, valores no formato brasileiro (1.234,56), datas DD/MM/AAAA:

| Coluna | Obrigatória | Exemplo |
| --- | --- | --- |
| tipo | sim | despesa, receita ou transferencia |
| vencimento | sim | 10/03/2026 |
| pagamento | não (vazio = em aberto) | 12/03/2026 |
| valor | sim | 1.234,56 |
| juros, multa, desconto | não | 12,30 |
| categoria | sim, menos em transferência | Supermercado |
| conta | sim | Santander · Conta corrente |
| conta_destino | só em transferência | Santander · Fundo aplicação |
| pessoa, centro_custo, forma_pagamento, observacao | não | |

Regras: a categoria e as contas precisam existir no login (a prévia aponta as que faltam); pessoas novas são cadastradas na hora, como no lançamento rápido; valores e datas inválidos são recusados linha a linha, sem gravar nada até o dono confirmar.

## Decisões técnicas

| Tema | Decisão | Por quê |
| --- | --- | --- |
| Gravação | Todas as linhas num único comando; se uma falhar, nenhuma é gravada | Não deixar meia importação |
| Desfazer | Cada importação ganha um identificador (`importacao_id` no lançamento); "Desfazer importação" apaga só aquele lote | Corrigir o mapa e importar de novo sem limpar à mão |
| Validação | Função pura em `src/lib/importacao.ts`, com testes (formatos, datas, valores, tipo x categoria) | Os erros de cada linha aparecem antes de gravar |
| Tamanho | Até 5.000 linhas por arquivo | Um ano de uso pessoal cabe com folga |
| Saldo inicial | Cada conta do login novo começa com o saldo de 01/01/2026 (ou do dia em que a planilha começa) | A DRE só usa lançamentos; o saldo inicial deixa os saldos e o fluxo certos também |
| Comparação | Script local soma a planilha por mês e grupo e compara com o CSV exportado do app; a diferença aparece linha a linha | Centavo a centavo, sem conferir no olho |

## Mudanças no banco

- Coluna `importacao_id` (uuid, opcional) em `lancamentos`, com índice; tabela `importacoes` (id, dono, data, nome do arquivo, quantidade de linhas), com a mesma proteção por usuário.
- Nenhuma mudança nas funções de relatório.

## Sessões da F4

| # | Sessão | Entrega |
| --- | --- | --- |
| 1 | Plano técnico | Este documento |
| 2 | Login novo | Dono cria o login, as contas reais com o saldo inicial e confere o plano de contas |
| 3 | Leitura da planilha | Lista das abas e colunas com lançamentos; nenhum dado sai do computador |
| 4 | Mapa de categorias | Tabela "planilha → Sobra Vida" aprovada; categorias que faltam criadas no login novo |
| 5 | Modelo e validação | `importacao.ts` com testes; modelo CSV para baixar |
| 6 | Importar (1) | Tela com envio e prévia, erros linha a linha |
| 7 | Importar (2) | Gravação em lote, histórico e desfazer importação (migração `importacoes`) |
| 8 | Conversão | Script local que gera o CSV da planilha, numa pasta fora do projeto |
| 9 | Importação (1) | Janeiro a junho no login novo; contagens conferidas |
| 10 | Importação (2) | Julho a dezembro |
| 11 | Exportar | "Exportar CSV" no Resultado do ano |
| 12 | Comparação | Script compara app x planilha por mês e grupo; lista de diferenças |
| 13 | Correções | Ajuste dos dados (mapa, lançamentos) ou das regras, se a diferença for do app |
| 14 | Revisão da F4 | Conferir o critério de pronto e encerrar |

São 14 sessões, dentro das 15 horas previstas.

## Decisões em aberto (para o usuário, na sessão 2)

1. **Data de início:** começar em 01/01/2026 (recomendado) ou noutra data em que a planilha tenha saldos confiáveis.
2. **Lançamentos futuros da planilha** (vencimentos de dezembro de 2026 em diante): importar como em aberto (recomendado) ou só até hoje.
3. **Contas da planilha:** quais contas reais entram no login novo e com que nome (o nome precisa ser igual no CSV).

## Pontos de atenção

- **Diferenças esperadas:** a planilha pode tratar juros, transferências e parcelas de outro jeito. Cada diferença é anotada com a causa (dado, regra do app ou regra da planilha) antes de corrigir.
- **Privacidade:** o CSV com dados reais fica fora da pasta do projeto; o `.gitignore` ganha a extensão `.csv` por segurança.
- **Desempenho:** importação de um ano (estimativa de 1.000 a 3.000 linhas) num único comando; já medimos relatórios com 6.000 lançamentos.
