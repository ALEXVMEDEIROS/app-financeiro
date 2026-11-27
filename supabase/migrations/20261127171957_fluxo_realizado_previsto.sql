-- Sobra Vida · F3, sessão 14 · fluxo de caixa com realizado e previsto separados
-- Mesma regra da sessão 3; acrescenta, em cada dia, quanto das entradas e das
-- saídas ainda está em aberto (previsto). O restante é o que já aconteceu.

drop function public.fluxo_diario(date, date, date, uuid);

create function public.fluxo_diario(p_inicio date, p_fim date, p_hoje date, p_conta uuid default null)
returns table (
  dia                 date,
  entradas            numeric,
  saidas              numeric,
  saldo               numeric,
  previsto            boolean,
  entradas_previstas  numeric,
  saidas_previstas    numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with contas as (
    select c.id, c.saldo_inicial, c.data_saldo_inicial
    from public.contas_financeiras c
    where (p_conta is null and c.ativa) or c.id = p_conta
  ),
  movs as (
    select
      case when m.data_pagamento is not null then m.data_pagamento
           else greatest(m.data_vencimento, p_hoje) end as data_ef,
      m.data_pagamento is null as aberto,
      m.delta
    from public.movimentos_contas() m
    join contas c on c.id = m.conta_id
    where (p_conta is not null or m.tipo <> 'transferencia')
      and coalesce(m.data_pagamento, m.data_vencimento) >= c.data_saldo_inicial
  ),
  inicial as (
    select (select coalesce(sum(saldo_inicial), 0) from contas)
         + coalesce((select sum(delta) from movs where data_ef < p_inicio), 0) as saldo
  ),
  dias as (
    select d::date as dia from generate_series(p_inicio, p_fim, interval '1 day') as d
  ),
  por_dia as (
    select d.dia,
           coalesce(sum(m.delta) filter (where m.delta > 0), 0) as entradas,
           coalesce(-sum(m.delta) filter (where m.delta < 0), 0) as saidas,
           coalesce(sum(m.delta) filter (where m.delta > 0 and m.aberto), 0) as entradas_previstas,
           coalesce(-sum(m.delta) filter (where m.delta < 0 and m.aberto), 0) as saidas_previstas
    from dias d
    left join movs m on m.data_ef = d.dia
    group by d.dia
  )
  select p.dia, p.entradas, p.saidas,
         i.saldo + sum(p.entradas - p.saidas) over (order by p.dia),
         p.dia > p_hoje,
         p.entradas_previstas, p.saidas_previstas
  from por_dia p
  cross join inicial i
  order by p.dia;
$$;

comment on function public.fluxo_diario(date, date, date, uuid) is
  'Fluxo de caixa diário do usuário logado (R3, R6): entradas, saídas e saldo de cada dia, com a parte ainda em aberto; atrasados entram em hoje.';

revoke execute on function public.fluxo_diario(date, date, date, uuid) from public, anon;
grant execute on function public.fluxo_diario(date, date, date, uuid) to authenticated, service_role;
