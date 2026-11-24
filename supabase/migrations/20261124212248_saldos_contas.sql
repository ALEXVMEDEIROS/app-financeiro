-- Sobra Vida · F2, sessão 5 · saldo das contas (R6)
--
-- Saldo = saldo inicial + receitas − despesas − transferências enviadas
--         + transferências recebidas.
-- Receitas e despesas entram pelo valor efetivo (valor + juros + multa − desconto, R12).
--
-- Dois saldos por conta:
--   saldo_atual    : só o que foi pago até p_data_atual (visão caixa);
--   saldo_previsto : o pago até p_data_prevista + o que está em aberto com
--                    vencimento até p_data_prevista (inclui os atrasados).
-- Lançamentos anteriores à data do saldo inicial não contam: o saldo inicial
-- já representa a conta naquela data.
--
-- É uma função (e não uma visão) porque "hoje" é o dia de São Paulo, enviado
-- pelo app; o relógio do banco está em UTC.
-- Roda com os direitos de quem chama (security invoker): a proteção por usuário
-- (RLS) de contas e lançamentos vale aqui também.

create function public.saldos_contas(p_data_atual date, p_data_prevista date)
returns table (
  conta_id        uuid,
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
    -- conta de origem: receita soma, despesa e transferência enviada subtraem
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
    -- conta de destino das transferências: soma
    select l.conta_destino_id, l.data_pagamento, l.data_vencimento, l.valor
    from public.lancamentos l
    where l.tipo = 'transferencia'
  )
  select
    c.id,
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
  order by c.ativa desc, lower(c.nome);
$$;

comment on function public.saldos_contas(date, date) is
  'Saldo de hoje e previsto de cada conta do usuário logado (R6). O app envia as datas no horário de São Paulo.';

revoke execute on function public.saldos_contas(date, date) from public, anon;
grant execute on function public.saldos_contas(date, date) to authenticated, service_role;
