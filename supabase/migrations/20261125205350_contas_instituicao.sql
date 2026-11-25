-- Sobra Vida · F2, sessão extra (antes da 8) · instituição das contas
-- Pedido do dono do projeto (25/11/2026): agrupar contas por banco ou
-- corretora (ex.: Santander → Conta corrente, Fundo DI), com subtotal por
-- instituição. É um campo opcional; lançamentos e transferências continuam
-- usando a conta específica.

alter table public.contas_financeiras
  add column instituicao text
    check (instituicao is null or char_length(btrim(instituicao)) between 1 and 60);

comment on column public.contas_financeiras.instituicao is
  'Banco ou corretora da conta (opcional), para agrupar e subtotalizar.';

-- Nome único por instituição: "Conta corrente" pode existir no Santander e no Itaú.
drop index public.contas_financeiras_nome_unico;
create unique index contas_financeiras_nome_unico
  on public.contas_financeiras (usuario_id, lower(btrim(coalesce(instituicao, ''))), lower(btrim(nome)));

-- saldos_contas passa a devolver a instituição. Mudar as colunas de retorno
-- exige recriar a função; o cálculo é o mesmo da sessão 5.
drop function public.saldos_contas(date, date);

create function public.saldos_contas(p_data_atual date, p_data_prevista date)
returns table (
  conta_id        uuid,
  instituicao     text,
  nome            text,
  tipo            text,
  ativa           boolean,
  saldo_inicial   numeric,
  saldo_atual     numeric,
  saldo_previsto  numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with movimentos as (
    select
      l.conta_id as conta,
      l.data_pagamento,
      l.data_vencimento,
      case l.tipo
        when 'receita' then  (l.valor + l.juros + l.multa - l.desconto)
        when 'despesa' then -(l.valor + l.juros + l.multa - l.desconto)
        else -l.valor
      end as delta
    from public.lancamentos l
    union all
    select l.conta_destino_id, l.data_pagamento, l.data_vencimento, l.valor
    from public.lancamentos l
    where l.tipo = 'transferencia'
  )
  select
    c.id,
    c.instituicao,
    c.nome,
    c.tipo,
    c.ativa,
    c.saldo_inicial,
    c.saldo_inicial + coalesce(sum(m.delta) filter (
      where m.data_pagamento is not null
        and m.data_pagamento >= c.data_saldo_inicial
        and m.data_pagamento <= p_data_atual
    ), 0),
    c.saldo_inicial + coalesce(sum(m.delta) filter (
      where (m.data_pagamento is not null
             and m.data_pagamento >= c.data_saldo_inicial
             and m.data_pagamento <= p_data_prevista)
         or (m.data_pagamento is null
             and m.data_vencimento >= c.data_saldo_inicial
             and m.data_vencimento <= p_data_prevista)
    ), 0)
  from public.contas_financeiras c
  left join movimentos m on m.conta = c.id
  group by c.id
  order by c.ativa desc, lower(coalesce(c.instituicao, '')), lower(c.nome);
$$;

comment on function public.saldos_contas(date, date) is
  'Saldo de hoje e previsto de cada conta do usuário logado (R6), com a instituição. O app envia as datas no horário de São Paulo.';

revoke execute on function public.saldos_contas(date, date) from public, anon;
grant execute on function public.saldos_contas(date, date) to authenticated, service_role;
