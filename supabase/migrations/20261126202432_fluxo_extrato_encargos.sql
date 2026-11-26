-- Sobra Vida · F3, sessão 3 · fluxo de caixa, extrato e encargos (R3, R6, R12)
-- Mesmas regras de saldo da função saldos_contas (F2): um movimento só conta a
-- partir da data do saldo inicial da conta; valor efetivo = valor + juros + multa − desconto.

-- ---------------------------------------------------------------------------
-- Movimentos de cada conta (uma linha por conta afetada; a transferência gera duas)
-- ---------------------------------------------------------------------------
create function public.movimentos_contas()
returns table (
  lancamento_id    uuid,
  conta_id         uuid,
  outra_conta_id   uuid,
  tipo             text,
  categoria_id     uuid,
  pessoa_id        uuid,
  observacao       text,
  data_vencimento  date,
  data_pagamento   date,
  delta            numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select l.id, l.conta_id, l.conta_destino_id, l.tipo, l.categoria_id, l.pessoa_id, l.observacao,
         l.data_vencimento, l.data_pagamento,
         case l.tipo
           when 'receita' then  (l.valor + l.juros + l.multa - l.desconto)
           when 'despesa' then -(l.valor + l.juros + l.multa - l.desconto)
           else -l.valor
         end
  from public.lancamentos l
  union all
  select l.id, l.conta_destino_id, l.conta_id, l.tipo, null, null, l.observacao,
         l.data_vencimento, l.data_pagamento, l.valor
  from public.lancamentos l
  where l.tipo = 'transferencia';
$$;

revoke execute on function public.movimentos_contas() from public, anon;
grant execute on function public.movimentos_contas() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Extrato de uma conta (R6): só o que já aconteceu, pela data de pagamento,
-- com o saldo corrido. A primeira linha é o saldo anterior ao período.
-- ---------------------------------------------------------------------------
create function public.extrato_conta(p_conta uuid, p_inicio date, p_fim date)
returns table (
  ordem            integer,
  lancamento_id    uuid,
  data             date,
  tipo             text,
  categoria        text,
  pessoa           text,
  outra_conta      text,
  observacao       text,
  valor            numeric,
  saldo            numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with conta as (
    select c.id, c.saldo_inicial, c.data_saldo_inicial
    from public.contas_financeiras c
    where c.id = p_conta
  ),
  validos as (
    select m.*
    from public.movimentos_contas() m
    join conta c on c.id = m.conta_id
    where m.data_pagamento is not null and m.data_pagamento >= c.data_saldo_inicial
  ),
  anterior as (
    select c.saldo_inicial + coalesce((select sum(v.delta) from validos v where v.data_pagamento < p_inicio), 0) as saldo
    from conta c
  ),
  periodo as (
    select v.*, row_number() over (order by v.data_pagamento, v.lancamento_id) as n
    from validos v
    where v.data_pagamento between p_inicio and p_fim
  )
  select 0, null::uuid, p_inicio, 'saldo_anterior', null, null, null, null, 0::numeric, a.saldo
  from anterior a
  union all
  select p.n::integer, p.lancamento_id, p.data_pagamento, p.tipo,
         cat.nome, pes.nome,
         case when oc.id is null then null else coalesce(oc.instituicao || ' · ', '') || oc.nome end,
         p.observacao, p.delta,
         a.saldo + sum(p.delta) over (order by p.n)
  from periodo p
  cross join anterior a
  left join public.categorias cat on cat.id = p.categoria_id
  left join public.pessoas pes on pes.id = p.pessoa_id
  left join public.contas_financeiras oc on oc.id = p.outra_conta_id
  order by 1;
$$;

comment on function public.extrato_conta(uuid, date, date) is
  'Extrato de uma conta do usuário logado com saldo corrido (R6). Linha 0 = saldo anterior ao período.';

revoke execute on function public.extrato_conta(uuid, date, date) from public, anon;
grant execute on function public.extrato_conta(uuid, date, date) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Fluxo de caixa diário (R3, R6): um dia por linha, de p_inicio a p_fim.
-- Pago conta na data do pagamento; em aberto conta no vencimento, e o que está
-- atrasado conta em "hoje". Sem conta escolhida: todas as contas ativas, sem as
-- transferências entre elas (que não mudam o total).
-- ---------------------------------------------------------------------------
create function public.fluxo_diario(p_inicio date, p_fim date, p_hoje date, p_conta uuid default null)
returns table (
  dia       date,
  entradas  numeric,
  saidas    numeric,
  saldo     numeric,
  previsto  boolean
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
           coalesce(-sum(m.delta) filter (where m.delta < 0), 0) as saidas
    from dias d
    left join movs m on m.data_ef = d.dia
    group by d.dia
  )
  select p.dia, p.entradas, p.saidas,
         i.saldo + sum(p.entradas - p.saidas) over (order by p.dia),
         p.dia > p_hoje
  from por_dia p
  cross join inicial i
  order by p.dia;
$$;

comment on function public.fluxo_diario(date, date, date, uuid) is
  'Fluxo de caixa diário do usuário logado (R3, R6): entradas, saídas e saldo de cada dia; atrasados entram em hoje.';

revoke execute on function public.fluxo_diario(date, date, date, uuid) from public, anon;
grant execute on function public.fluxo_diario(date, date, date, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Juros, multas e descontos por mês (R12), pela data de pagamento.
-- ---------------------------------------------------------------------------
create function public.encargos_por_mes(p_ano integer)
returns table (
  mes                   integer,
  juros_pagos           numeric,
  multas_pagas          numeric,
  descontos_obtidos     numeric,
  juros_recebidos       numeric,
  multas_recebidas      numeric,
  descontos_concedidos  numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select extract(month from l.data_pagamento)::integer,
         coalesce(sum(l.juros)    filter (where l.tipo = 'despesa'), 0),
         coalesce(sum(l.multa)    filter (where l.tipo = 'despesa'), 0),
         coalesce(sum(l.desconto) filter (where l.tipo = 'despesa'), 0),
         coalesce(sum(l.juros)    filter (where l.tipo = 'receita'), 0),
         coalesce(sum(l.multa)    filter (where l.tipo = 'receita'), 0),
         coalesce(sum(l.desconto) filter (where l.tipo = 'receita'), 0)
  from public.lancamentos l
  where l.data_pagamento >= make_date(p_ano, 1, 1)
    and l.data_pagamento <  make_date(p_ano + 1, 1, 1)
    and l.juros + l.multa + l.desconto > 0
  group by 1
  order by 1;
$$;

comment on function public.encargos_por_mes(integer) is
  'Juros, multas e descontos pagos e recebidos pelo usuário logado, por mês do pagamento (R12).';

revoke execute on function public.encargos_por_mes(integer) from public, anon;
grant execute on function public.encargos_por_mes(integer) to authenticated, service_role;
