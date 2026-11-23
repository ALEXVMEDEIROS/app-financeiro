# Plano técnico da F1: Fundação técnica

Sobra Vida · escrito em 19/11/2026 · fonte única: o documento de produto (regras R1 a R11 e modelo de dados). A planilha original não foi consultada.

## Objetivo e critério de pronto

A F1 entrega a base sobre a qual as telas serão construídas: login, as tabelas do banco com isolamento por usuário, o plano de contas padrão e a publicação automática (esta já funciona desde a sessão 6).

**Pronto quando:** duas contas de teste criadas pelo site não conseguem ler, criar, alterar nem apagar dados uma da outra, nem pelas telas nem chamando o banco diretamente com a chave pública.

Estimativa do plano de execução: 25 horas, de 07/12/2026 a 10/01/2027.

## Decisões técnicas

| Tema | Decisão | Por quê |
| --- | --- | --- |
| Telas | Next.js 16 (App Router), componentes de servidor por padrão | Já instalado; menos código rodando no navegador |
| Sessão de login | `src/proxy.ts` renova a sessão a cada acesso (no Next 16, `middleware` virou `proxy`) | Convenção da versão instalada |
| Acesso ao Supabase | `@supabase/ssr`: um cliente para o servidor (lê e grava cookies) e um para o navegador | Biblioteca oficial para Next.js |
| Login | E-mail e senha, com confirmação por e-mail. Google fica para a F5 | Menos configuração agora |
| Isolamento | Row Level Security (RLS) em todas as tabelas: cada linha tem `usuario_id` e só o dono a enxerga | A proteção fica no banco, não depende do código das telas |
| Mudanças no banco | Arquivos SQL versionados em `supabase/migrations/`, aplicados com a Supabase CLI (`npx supabase db push`) | Histórico no GitHub e banco reproduzível |
| Dinheiro | `numeric(14,2)`, sempre positivo; o tipo do lançamento define o sinal | Evita erro de arredondamento e de sinal |
| Datas | `date` (sem hora) para vencimento e pagamento | É o que as regras usam |
| Exclusão | Cadastros com lançamentos são desativados (`ativo = false`), não apagados | Relatórios antigos continuam fechando |

## Modelo de dados

A tabela `usuarios` do documento vira `perfis`, ligada ao usuário do Supabase Auth (`auth.users`). As demais seguem o documento.

| Tabela | Campos | Regras |
| --- | --- | --- |
| `perfis` | id (= id do usuário), nome, plano (`gratis`, `pessoal`, `profissional`), criado_em | Criado automaticamente no cadastro |
| `contas_financeiras` | id, usuario_id, nome, tipo (`banco`, `corretora`, `carteira`, `caixa`), saldo_inicial, data_saldo_inicial, ativa | R6 |
| `grupos` | id, usuario_id, nome, natureza (`receita`, `despesa`), ordem, ativo | R5, primeiro nível |
| `categorias` | id, usuario_id, grupo_id, nome, ativa | R5, segundo nível; herda a natureza do grupo |
| `centros_custo` | id, usuario_id, nome, ativo | R9 |
| `pessoas` | id, usuario_id, nome, documento (opcional), tipo (`cliente`, `fornecedor`, `ambos`), contato, ativa | R9; documento opcional (LGPD) |
| `formas_pagamento` | id, usuario_id, nome, parcelas_max, dias_recebimento, ativa | Taxas ficam para a fase 3 |
| `lancamentos` | id, usuario_id, tipo (`receita`, `despesa`, `transferencia`), data_lancamento, data_vencimento, data_pagamento, valor, juros, multa, desconto, categoria_id, conta_id, conta_destino_id, centro_custo_id, pessoa_id, forma_pagamento_id, observacao, parcela_num, parcela_total, grupo_parcelas_id, criado_em, atualizado_em | R1 a R4, R11, R12 |
| `bens` | id, usuario_id, nome, tipo (`imovel`, `veiculo`, `participacao`, `outro`), valor_avaliacao, data_avaliacao, ativo | R10; o histórico de avaliações entra na F6 |

### Regras gravadas no banco (verificações)

- `valor > 0` em lançamentos; `saldo_inicial` pode ser negativo (conta já no vermelho).
- **Receita e despesa** exigem `categoria_id` e não aceitam `conta_destino_id`; a natureza do grupo da categoria precisa bater com o tipo (R1).
- **Transferência** exige `conta_destino_id`, diferente de `conta_id`, e não aceita categoria (R1, R4).
- `data_pagamento` vazia = em aberto (R2).
- Parcelas: `parcela_num` entre 1 e `parcela_total`; as parcelas de um mesmo lançamento compartilham `grupo_parcelas_id` (R11).
- **Juros, multa e desconto (R12, sugestão de testador em 23/11/2026):** `juros`, `multa` e `desconto` são `numeric(14,2)`, padrão 0, nunca negativos, e não se aplicam a transferências. O `valor` continua sendo o valor original (o do vencimento). Valor efetivamente pago ou recebido = valor + juros + multa − desconto, e não pode ser negativo.
  - Visão **previsto** usa o `valor` original; visão **caixa** usa o valor efetivo.
  - No resultado do ano, o `valor` original (menos o desconto) fica na categoria do lançamento; juros e multa de **despesas** aparecem na categoria "Juros e multas por atraso" e os de **receitas** em "Juros e multas recebidos". Assim o usuário vê quanto perdeu (ou ganhou) com atrasos.
- Toda chave estrangeira aponta para um registro do **mesmo usuário**, garantido por chaves estrangeiras compostas `(usuario_id, id)`: o banco recusa, por exemplo, uma categoria ligada ao grupo de outra pessoa. (Ajuste feito na sessão 2: mais simples e mais seguro que uma função de verificação.)

### Isolamento por usuário (RLS)

Em cada tabela com `usuario_id`:
- RLS ligado; `usuario_id` tem valor padrão `auth.uid()`.
- Quatro políticas (ler, criar, alterar, apagar), todas com a condição `usuario_id = auth.uid()`.
- Em `perfis`, a condição é `id = auth.uid()`.
- Nenhuma política para o papel anônimo, e as permissões de base do papel `anon` são retiradas: sem login, nada é lido nem gravado.
- **Cada tabela já nasce com RLS** na mesma migração que a cria (ajuste da sessão 2; antes o RLS estava previsto só na sessão 5). No Supabase, tabela sem RLS fica aberta a quem tem a chave pública.
- Para aplicar migrações: `npx supabase db push --remote` (sem `--remote`, a CLI 3.x tenta um banco local).
- Para revisar: `npx supabase db advisors --remote --level info` (verificador de segurança e desempenho do Supabase) e `npx supabase db query --remote --read-only "<sql>"` para consultas que só leem.
- **Permissões de base (sessão 7):** neste projeto, tabelas criadas por migração **não** recebem SELECT/INSERT/UPDATE/DELETE automáticos para `authenticated`. Toda tabela nova precisa de `grant ... to authenticated` explícito na própria migração, além do RLS. `perfis`: só `select` e `update (nome)`; o `plano` muda apenas pelo `service_role`. Ligações entre cadastros usam NO ACTION (não RESTRICT), para a exclusão de conta funcionar.
- Testes do banco em `supabase/tests/` (cada um desfaz tudo ao final; rodar só com autorização do dono): `teste_cadastro_automatico.sql` e `teste_usuario_logado.sql`.
- Revisão da sessão 5 (23/11/2026): RLS ligado nas 9 tabelas, políticas só para `authenticated` com `auth.uid()` em leitura e gravação, `anon` sem permissão; verificador sem alertas de segurança. Índices das chaves compostas de `lancamentos` corrigidos.

### Cadastro de um usuário novo

Feito na sessão 6 (migração `cadastro_automatico`), com as funções no esquema `interno`, fora da API. Teste em `supabase/tests/teste_cadastro_automatico.sql` (desfaz tudo ao final; rodar com `npx supabase db query --remote --yes -f ...`, com autorização do dono). Resultado em 23/11/2026: perfil com nome, 13 grupos (3 de receita, 10 de despesa), 46 categorias, 2 centros de custo, 6 formas de pagamento.

Uma função no banco, disparada quando o Supabase Auth cria o usuário:
1. cria o registro em `perfis`;
2. copia o plano de contas padrão (abaixo), os centros de custo e as formas de pagamento para esse usuário;
3. não cria contas financeiras: o usuário cadastra as dele na tela de boas-vindas (F5).

## Plano de contas padrão

Escrito do zero para o app, pensado para quem tem renda de trabalho e despesas de casa no mesmo bolso. O usuário pode renomear, esconder ou ampliar.

**Receitas**

| Grupo | Categorias |
| --- | --- |
| Trabalho | Honorários e serviços · Salário ou pró-labore · Comissões · Distribuição de lucros |
| Rendimentos | Rendimentos de aplicações · Aluguéis recebidos |
| Outras receitas | Reembolsos · Presentes recebidos · Juros e multas recebidos · Outras receitas |

**Despesas**

| Grupo | Categorias |
| --- | --- |
| Moradia | Aluguel ou financiamento · Condomínio · Energia · Água · Internet e telefone · Manutenção da casa |
| Alimentação | Supermercado · Restaurantes e delivery |
| Transporte | Combustível · Aplicativos e transporte público · Manutenção do veículo · Seguro do veículo |
| Saúde | Plano de saúde · Consultas e exames · Farmácia |
| Educação | Escola e cursos · Livros e materiais |
| Trabalho | Aluguel de sala · Softwares e assinaturas · Contabilidade · Anuidade do conselho de classe · Material de escritório |
| Impostos e taxas | Imposto de renda e carnê-leão · IPTU · IPVA |
| Despesas financeiras | Juros e multas por atraso · Juros de cheque especial · Juros de cartão de crédito · Tarifas bancárias |
| Pessoal e lazer | Lazer e viagens · Vestuário · Cuidados pessoais · Assinaturas pessoais |
| Família | Filhos · Animais de estimação · Presentes e doações |

**Centros de custo:** Casa · Trabalho.
**Formas de pagamento:** Dinheiro · Pix · Cartão de débito · Cartão de crédito · Boleto · Transferência bancária.

## Estrutura de pastas

```
src/
  proxy.ts                  renova a sessão de login a cada acesso
  app/
    page.tsx                página pública (hoje: "em construção")
    entrar/page.tsx         login
    cadastrar/page.tsx      criar conta
    auth/confirmar/route.ts retorno do e-mail de confirmação
    (app)/                  área logada, protegida
      layout.tsx            confere a sessão; sem login, manda para /entrar
      painel/page.tsx       primeira tela logada (na F1, só "Olá, <nome>")
  lib/supabase/
    client.ts               cliente do navegador (já existe)
    server.ts               cliente do servidor (cookies)
supabase/
  migrations/               arquivos SQL numerados, um por mudança
  tests/                    testes de isolamento entre usuários
```

## Sessões da F1

Cada sessão tem cerca de 1 hora e termina com algo testado e salvo no GitHub.

| # | Sessão | Entrega |
| --- | --- | --- |
| 1 | Supabase CLI | `npx supabase login` e `link` ao projeto (o usuário digita a senha do banco no terminal, nunca no chat) |
| 2 | Tabelas de cadastro | Migração: `perfis`, `contas_financeiras`, `grupos`, `categorias` |
| 3 | Demais tabelas | Migração: `centros_custo`, `pessoas`, `formas_pagamento`, `bens` |
| 4 | Lançamentos | Migração: `lancamentos` com todas as verificações |
| 5 | RLS (revisão) | Conferir as políticas das 9 tabelas, já criadas junto com cada tabela |
| 6 | Cadastro automático | Função que cria o perfil e copia o plano de contas padrão |
| 7 | Revisão do banco | Revisão de segurança das migrações; correções |
| 8 | Clientes Supabase | `lib/supabase/server.ts` e `proxy.ts` |
| 9 | Tela de cadastro | `/cadastrar` com nome, e-mail e senha |
| 10 | Confirmação de e-mail | `/auth/confirmar` e textos do e-mail em português |
| 11 | Tela de login | `/entrar`, "esqueci a senha" |
| 12 | Área logada | Layout protegido, `/painel` com o nome do usuário, botão sair |
| 13 | Revisão da semana | Testar o fluxo completo no celular e no computador |
| 14 | Teste de isolamento (1) | Script que cria dois usuários de teste |
| 15 | Teste de isolamento (2) | Script tenta ler, criar, alterar e apagar dados do outro, e deve falhar em tudo |
| 16 | Teste das verificações | Tenta gravar lançamentos inválidos (valor zero, transferência sem destino, categoria de receita numa despesa, juros negativos, juros numa transferência, desconto maior que o valor) |
| 17 | Correções | O que os testes 14 a 16 apontarem |
| 18 | Tipos TypeScript | Tipos gerados a partir do banco, para as telas da F2 |
| 19 | Folga | Atrasos de fim de ano |
| 20 | Folga | Atrasos de fim de ano |
| 21 | Revisão da F1 | Conferir o critério de pronto e atualizar o ANDAMENTO.md |

São 21 sessões numeradas mais as revisões semanais já previstas na rotina: cerca de 25 horas no total.

## Sugestões de testadores incorporadas

| Data | Testador | Sugestão | Onde |
| --- | --- | --- | --- |
| 23/11/2026 | André Vianna (advogado) | Registrar juros e multa ao pagar com atraso; ver quanto se paga de juros | Campos `juros`, `multa`, `desconto` e regra R12 nesta fase; grupo "Despesas financeiras" no plano de contas padrão |

As demais sugestões dele (balões de ajuda, sinal e cor em positivo e negativo) entram nas telas da F2 e da F3; a sugestão de datas de vencimento fica para depois da venda.

## Pontos de atenção

- **E-mail de confirmação:** o envio padrão do Supabase tem limite baixo de mensagens por hora e **não permite editar os modelos** (confirmado na sessão 10). Enquanto isso, o e-mail sai no modelo padrão, em inglês, com link no formato `?code=` (PKCE), que só funciona no **mesmo navegador** do cadastro. Na F5, com envio próprio (SMTP) no domínio sobravida.com.br, aplicar o modelo em português de `docs/email-confirmacao.html` (link com `token_hash`, que funciona em qualquer aparelho). A rota `/auth/confirmar` já aceita os dois formatos.
- **URLs no Supabase (sessão 10):** Site URL `https://www.sobravida.com.br`; Redirect URLs `https://www.sobravida.com.br/**`, `https://app-financeiro-zeta-lake.vercel.app/**`, `http://localhost:3000/**`.
- **Chaves:** a chave `service_role` e a senha do banco nunca vão para o código, para o GitHub nem para o chat. Os testes de isolamento usam só a chave pública e usuários de teste.
- **Variáveis na Vercel:** hoje só em Production. Se a F1 usar branches de teste, estender para Preview.
- **Sem dados reais na F1:** as contas de teste usam dados inventados. Os dados reais do dono entram só na F4, numa conta privada.
