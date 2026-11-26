# Plano técnico da F3: Painel e relatórios

Sobra Vida · escrito em 26/11/2026 · fontes: documento de produto (regras R3, R5, R6, R7 e R12, telas), as notas da fase e o que a F2 deixou pronto. A planilha original não foi consultada.

## Objetivo e critério de pronto

A F3 responde às perguntas que motivam o app: quanto sobrou no mês, para onde foi o dinheiro no ano, como o saldo vai andar até o fim do mês e quanto foi perdido com juros e multas.

**Pronto quando:** os números do painel, do resultado do ano, do fluxo de caixa e do extrato conferem com uma conta feita à mão. A conferência usa o mês do teste de aceite da F2 (novembro de 2026, nota "Teste de aceite F2" do cofre do projeto), cujos totais já foram calculados à mão e bateram.

Estimativa do plano de execução: 25 horas, prevista de 22/02 a 28/03/2027 (pode começar já, porque a F2 terminou em 26/11/2026).

## Telas

| Endereço | Tela | Principais ações |
| --- | --- | --- |
| `/painel` | Saldo de hoje e previsto no fim do mês; resultado do mês (receitas, despesas, sobra); a pagar e a receber nos próximos 7 dias e atrasados; juros e multas pagos no mês; gráfico dos últimos 6 meses | Abrir um vencimento, ir para o relatório |
| `/relatorios/resultado` | Resultado do ano (DRE): grupos e categorias nas linhas, meses de janeiro a dezembro nas colunas, total e média; receitas, despesas, resultado e lucratividade (R7) | Trocar o ano, alternar caixa ou previsto (R3), abrir um grupo para ver as categorias, tocar num valor para ver os lançamentos |
| `/relatorios/fluxo` | Fluxo de caixa diário do mês: saldo inicial, entradas, saídas e saldo de cada dia; o que já aconteceu e o que está previsto | Trocar o mês, filtrar por conta |
| `/contas/[id]/extrato` | Extrato de uma conta com saldo corrido (R6) | Trocar o mês, abrir um lançamento |
| `/relatorios/juros` | Juros e multas pagos (e recebidos) no ano, por mês e por categoria de origem (R12) | Trocar o ano |

O menu ganha **Relatórios** (Resultado, Fluxo de caixa, Juros e multas). No celular, a barra inferior troca Configurações por Relatórios, e Configurações vai para o menu do topo.

## Decisões técnicas

| Tema | Decisão | Por quê |
| --- | --- | --- |
| Onde calcular | Funções no banco, como a `saldos_contas` da F2, com `security invoker` (a proteção por usuário vale) e "hoje" enviado pelo app | Um único cálculo, igual em todas as telas; o ano inteiro é somado no banco, sem trazer milhares de lançamentos ao celular |
| Visão caixa (R3) | Só lançamentos pagos, pela **data de pagamento**, pelo valor efetivo (valor + juros + multa − desconto) | É o dinheiro que de fato entrou e saiu |
| Visão previsto (R3) | Todos os lançamentos, pela **data de vencimento**: valor efetivo se pago, valor original se em aberto | Mostra o mês como planejado, inclusive o que falta pagar |
| Juros e multas na DRE (R12) | Juros e multas saem da categoria de origem e aparecem numa linha própria: "Juros e multas por atraso" (grupo Despesas financeiras) nas despesas, "Juros e multas recebidos" nas receitas. O desconto reduz a própria categoria | O documento de produto pede os juros em Despesas financeiras; assim o IPTU continua mostrando o valor do imposto, e o custo do atraso fica visível. Decidido pelo usuário em 26/11/2026 |
| Transferências (R4) | Não entram no resultado; entram no fluxo de caixa e no extrato de cada conta | Mudam o saldo das contas, não o resultado |
| Lucratividade (R7) | Resultado ÷ receitas do período, em %; "—" quando não houve receita | Evita divisão por zero e número sem sentido |
| Gráfico | Barras simples em SVG próprio (receitas, despesas e resultado por mês), nas cores do tema claro e escuro | Sem biblioteca nova para um gráfico só; leve no celular |
| Tabela larga no celular | DRE com a primeira coluna fixa e rolagem lateral só dentro da tabela; opção "mês a mês" mostrando um mês por vez | 13 colunas não cabem em 375 px |
| Testes | Funções SQL testadas em `supabase/tests` com dados criados e desfeitos no mesmo teste (rollback), sempre com autorização; funções de tela em Vitest | Pegar erro de conta antes de publicar |

## Regras de cálculo

### Resultado (R7)

- Receitas e despesas do período, por grupo e categoria, na visão escolhida.
- Resultado = receitas − despesas. Lucratividade = resultado ÷ receitas.
- Categorias e grupos desativados continuam aparecendo se tiverem valores no período.

### Saldo e fluxo (R6)

- Saldo de uma conta numa data = saldo inicial + receitas − despesas ± transferências, só com pagamentos a partir da data do saldo inicial (regra já usada em `saldos_contas`).
- Fluxo diário: saldo inicial do mês (saldo no fim do dia anterior), depois cada dia com entradas, saídas e saldo. Até hoje, pelo realizado; de amanhã em diante, somando o que está em aberto pelo vencimento (atrasados entram em "hoje").

### Juros e multas (R12)

- Juros + multa de cada lançamento pago, pela data de pagamento. O desconto aparece à parte, como economia.

## Mudanças no banco

| Função | Devolve |
| --- | --- |
| `resultado_mensal(p_ano, p_visao)` | grupo, categoria, natureza, mês e valor, já separando juros e multas (decisão 1) |
| `fluxo_diario(p_inicio, p_fim, p_hoje, p_conta)` | dia, entradas, saídas e saldo, realizado e previsto |
| `extrato_conta(p_conta, p_inicio, p_fim)` | cada movimento da conta com o saldo corrido |
| `encargos_por_mes(p_ano)` | mês, juros, multas e descontos, pagos e recebidos |

Nenhuma tabela nova. Índices novos só se a revisão de desempenho mostrar necessidade (`lancamentos (usuario_id, data_pagamento)` é o candidato).

## Sessões da F3

| # | Sessão | Entrega |
| --- | --- | --- |
| 1 | Plano técnico | Este documento |
| 2 | Banco (1) | `resultado_mensal` nas duas visões, com teste |
| 3 | Banco (2) | `fluxo_diario`, `extrato_conta` e `encargos_por_mes`, com testes |
| 4 | Revisão do banco | Isolamento entre usuários nas funções novas, alertas de segurança e desempenho |
| 5 | Painel (1) | Saldos e resultado do mês |
| 6 | Painel (2) | A pagar e a receber (7 dias e atrasados), juros do mês |
| 7 | Painel (3) | Gráfico dos últimos 6 meses |
| 8 | Revisão da semana | Testar no celular o que existe até aqui |
| 9 | Resultado do ano (1) | Tabela por grupo e mês, totais e média |
| 10 | Resultado do ano (2) | Abrir grupo em categorias; lucratividade |
| 11 | Resultado do ano (3) | Alternar caixa e previsto; linha de juros e multas |
| 12 | Resultado do ano (4) | Celular: coluna fixa e modo mês a mês; tocar num valor abre os lançamentos |
| 13 | Fluxo de caixa (1) | Fluxo diário do mês |
| 14 | Fluxo de caixa (2) | Realizado e previsto; filtro por conta |
| 15 | Extrato | Extrato por conta com saldo corrido |
| 16 | Revisão da semana | Testar tudo no celular e no computador |
| 17 | Juros e multas | Relatório do ano (R12) |
| 18 | Navegação | Menu Relatórios, ligações entre painel, relatórios e lançamentos |
| 19 | Ajuda e casos-limite | Balões "(?)", ano sem dados, conta sem movimento, valores muito altos |
| 20 | Teste de aceite (1) | Conferir com a conta feita à mão (mês do teste da F2) |
| 21 | Teste de aceite (2) | Correções do que o teste mostrar |
| 22–23 | Folga | Atrasos e ajustes |
| 24 | Revisão da F3 | Conferir o critério de pronto e encerrar |

São 24 sessões numeradas, dentro das 25 horas previstas.

## Decisões do usuário (26/11/2026)

1. **Juros e multas na DRE:** linha própria em Despesas financeiras ("Juros e multas por atraso") e em receitas ("Juros e multas recebidos"); a categoria de origem mostra o valor original menos o desconto.
2. **Visão padrão:** caixa (pela data de pagamento); a tela permite alternar para previsto.
3. **Dados do teste de aceite da F2:** ficam até o aceite da F3, como gabarito de novembro; apagar no fim da F3, com autorização.

## Pontos de atenção

- **Conferência à mão:** cada tela nova é comparada com os números do gabarito de novembro antes de seguir.
- **Desempenho:** somas do ano feitas no banco; o celular recebe no máximo 12 meses × número de categorias.
- **Acessibilidade:** tabelas com cabeçalhos de linha e coluna; o gráfico tem os mesmos números em texto para leitor de tela.
- **"Hoje" nas páginas:** como na F2, `await connection()` dentro de `<Suspense>` em toda tela que usa a data de hoje.
