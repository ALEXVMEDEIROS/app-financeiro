# Plano técnico da F2: Lançamentos

Sobra Vida · escrito em 24/11/2026 · fontes: documento de produto (regras R1 a R12, telas) e as anotações da fase. A planilha original não foi consultada.

## Objetivo e critério de pronto

A F2 entrega o uso do dia a dia: cadastrar as contas e lançar receitas, despesas e transferências, pelo celular ou pelo computador.

**Pronto quando:** um mês inteiro de lançamentos (dados reais do dono ou de teste, à escolha dele) é registrado pelo celular sem erro, incluindo pelo menos uma transferência, uma compra parcelada e uma conta paga com juros.

Estimativa do plano de execução: 30 horas, prevista de 11/01 a 21/02/2027 (pode começar antes, já que a F1 terminou em 24/11/2026).

## Telas

| Endereço | Tela | Principais ações |
| --- | --- | --- |
| `/contas` | Lista de contas, com saldo de hoje e saldo previsto no fim do mês | Nova conta, editar, desativar |
| `/lancamentos` | Lançamentos do mês, agrupados por dia; em aberto e atrasados destacados; totais de receitas, despesas e diferença | Mudar de mês, filtrar (tipo, em aberto, busca), marcar como pago, editar, duplicar, excluir |
| `/lancamentos/novo` | Lançamento rápido: tipo, valor, categoria, conta, data, "já pago"; "Mais detalhes" recolhido com centro de custo, forma de pagamento, parcelas e observação | Salvar; salvar e criar outro |
| `/lancamentos/[id]` | Edição de um lançamento | Salvar, excluir |
| `/configuracoes/plano-de-contas` | Grupos e categorias de receita e de despesa | Criar, renomear, desativar e reativar |

O menu da área logada passa a ter: Painel · Lançamentos · Contas · Configurações. No celular, um botão "+" fixo abre o lançamento rápido de qualquer tela.

**Fora da F2:** cadastro de pessoas (clientes e fornecedores), relatórios, previsto x realizado e metas. O campo "pessoa" do lançamento fica para a fase em que pessoas forem cadastráveis (fase 3 do documento de produto).

## Decisões técnicas

| Tema | Decisão | Por quê |
| --- | --- | --- |
| Gravação | Ações no servidor (Server Actions) com o cliente do Supabase tipado | O banco já valida as regras; a tela só traduz o erro |
| Validação | A tela confere o básico antes de enviar (valor, data, categoria); o banco continua sendo a última palavra | Mensagem rápida para o usuário, sem confiar só na tela |
| Erros do banco | Tradução por código: 23514 regra, 23503 ligação, 23505 nome repetido, 42501 sem permissão, sempre em português e dizendo o que fazer | O usuário nunca vê mensagem técnica |
| Valores | Digitação no formato brasileiro (1.234,56), exibição com `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })` | Padrão do público |
| Sinal e cor | Receita com "+" em verde, despesa com "−" em vermelho, transferência neutra, em todas as telas | Pedido do testador; evita confusão de sinal |
| "Hoje" | Calculado no fuso de São Paulo (`America/Sao_Paulo`) e enviado explicitamente; não usar o padrão `current_date` do banco, que segue o horário UTC e erra a data à noite | Evita lançamento caindo no dia seguinte |
| Saldo das contas (R6) | Visão no banco (`saldos_contas`, com `security_invoker = true` para respeitar a proteção por usuário) somando saldo inicial, receitas, despesas e transferências | Um único cálculo, igual em todas as telas |
| Ajuda | Componente `Ajuda` com o "(?)" ao lado do rótulo, abrindo um texto curto; acessível por teclado e leitor de tela | Pedido do testador |
| Tela /entrar | Mostrar o formulário na hora; a verificação de "já logado" vai para o proxy | Achado da revisão de 23/11/2026 |
| Testes | Vitest para as funções puras (ler valor digitado, dividir parcelas, calcular datas); testes de banco seguem em `supabase/tests` | Pegar erro de conta antes de publicar |

## Regras de tela

### Parcelas (R11)

- O usuário informa o **valor total** e o número de parcelas (2 a 48).
- Cada parcela recebe o total dividido em centavos; a **última absorve a diferença** do arredondamento (ex.: R$ 100,00 em 3 = 33,33 + 33,33 + 33,34).
- Vencimentos mensais a partir do primeiro; em meses mais curtos, o dia vira o último do mês (31/01 → 28/02 → 31/03).
- Todas as parcelas compartilham um `grupo_parcelas_id`. Só a primeira pode nascer paga.
- **Editar ou excluir uma parcela** pergunta o alcance: só esta, esta e as seguintes, ou todas.

### Quitar (R2 e R12)

- "Marcar como pago" pede a data de pagamento (padrão: hoje) e, recolhidos, juros, multa e desconto.
- A tela mostra o valor efetivo (valor + juros + multa − desconto) antes de confirmar.
- Desfazer o pagamento volta o lançamento para "em aberto" e zera juros, multa e desconto.

### Transferências (R4)

- Origem e destino são escolhidos entre as contas ativas; o destino não pode ser a origem.
- Não têm categoria, juros nem multa; aparecem nas duas contas, saindo de uma e entrando na outra.

### Plano de contas (R5)

- Criar e renomear grupos e categorias; desativar em vez de apagar o que já foi usado; reativar.
- A natureza (receita ou despesa) é escolhida ao criar o grupo e não muda depois que ele tiver categorias.
- Nas listas de escolha, só aparecem categorias ativas da natureza certa, agrupadas pelo grupo.

### Lançamento rápido

- O app sugere a última categoria e a última conta usadas para aquele tipo.
- "Já pago" vem marcado para despesas e receitas com data de hoje ou anterior; desmarcado para datas futuras.

## Mudanças no banco

| Migração | Conteúdo |
| --- | --- |
| `saldos_contas` | Visão com o saldo de hoje e o previsto de cada conta (R6), `security_invoker = true`, com `grant select` para `authenticated` |
| (se necessário) | Ajustes que as telas revelarem; cada migração com `grant` explícito e `npm run tipos` em seguida |

Nenhuma tabela nova é esperada: o modelo da F1 já cobre a F2.

## Sessões da F2

| # | Sessão | Entrega |
| --- | --- | --- |
| 1 | Plano técnico | Este documento |
| 2 | Base visual | Componentes: botão, campo de valor (R$), seletor de data, seleção agrupada, `Ajuda` "(?)", formato de moeda com sinal e cor |
| 3 | Funções puras e testes | Ler valor digitado, dividir parcelas, datas mensais, "hoje" em São Paulo; Vitest |
| 4 | Menu e botão "+" | Menu da área logada e botão fixo no celular; /entrar mais rápida |
| 5 | Saldos | Migração `saldos_contas` e tipos |
| 6 | Contas (1) | Lista com saldos |
| 7 | Contas (2) | Criar, editar, desativar |
| 8 | Lançamento rápido (1) | Despesa e receita, pago ou em aberto |
| 9 | Lançamento rápido (2) | Transferência; "salvar e criar outro"; sugestão da última categoria e conta |
| 10 | Parcelas | Criação parcelada |
| 11 | Revisão da semana | Testar no celular o que existe até aqui |
| 12 | Lista do mês (1) | Lançamentos agrupados por dia, totais, mudar de mês |
| 13 | Lista do mês (2) | Filtros e busca; em aberto e atrasados destacados |
| 14 | Quitar | Marcar como pago com juros, multa e desconto; desfazer |
| 15 | Editar | Edição de lançamento comum e de transferência |
| 16 | Editar parcelas | Alcance: só esta, seguintes, todas |
| 17 | Excluir e duplicar | Com confirmação e alcance para parcelas |
| 18 | Plano de contas (1) | Lista de grupos e categorias |
| 19 | Plano de contas (2) | Criar, renomear, desativar, reativar |
| 20 | Textos de ajuda | Balões "(?)" em todos os campos que precisam |
| 21 | Revisão da semana | Testar tudo no celular e no computador |
| 22 | Erros e casos-limite | Mensagens de erro, telas vazias, conexão lenta |
| 23 | Teste de aceite (1) | O dono lança um mês pelo celular |
| 24 | Teste de aceite (2) | Correções do que o teste mostrar |
| 25–26 | Folga | Atrasos e ajustes |
| 27 | Revisão da F2 | Conferir o critério de pronto e encerrar |

São 27 sessões numeradas, dentro das 30 horas previstas.

## Pontos de atenção

- **Dados reais:** no teste de aceite, o dono decide se lança dados reais na conta dele ou dados de teste. Dados reais da planilha só entram de forma organizada na F4 (importação).
- **Desempenho no celular:** listas de um mês carregam só aquele mês; nada de carregar o histórico inteiro.
- **Acessibilidade:** campos com rótulo, erros ligados ao campo, foco visível, botões com área de toque de pelo menos 44 px.
- **Testadores:** em paralelo, mostrar o protótipo a mais profissionais liberais até 21/02/2027.
