-- Sobra Vida · F3, sessão 2 · resultado mensal (R3, R5, R7, R12)
-- Soma receitas e despesas do ano por grupo, categoria e mês, em duas visões:
--   caixa    : só o que foi pago, pela data de pagamento, pelo valor efetivo
--   previsto : tudo, pela data de vencimento (pago: valor efetivo; em aberto: valor)
-- Juros e multas saem da categoria de origem e vão para uma linha própria
-- (decisão do usuário em 26/11/2026): "Juros e multas por atraso" nas despesas e
-- "Juros e multas recebidos" nas receitas. Se o usuário tiver uma categoria com
-- esse nome, os valores entram nela; senão, numa linha sem categoria com esse rótulo.
-- O desconto reduz a própria categoria. Transferências não entram (R4).

create function public.resultado_mensal(p_ano integer, p_visao text default 'caixa')
returns table (
  natureza         text,
  grupo_id         uuid,
  grupo            text,
  grupo_ordem      integer,
  grupo_ativo      boolean,
  categoria_id     uuid,
  categoria        text,
  categoria_ativa  boolean,
  mes              integer,
  valor            numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with base as (
    select
      l.tipo as natureza,
      l.categoria_id,
      l.valor, l.juros, l.multa, l.desconto,
      l.data_pagamento is not null as pago,
      case when p_visao = 'previsto' then l.data_vencimento else l.data_pagamento end as data_ref
    from public.lancamentos l
    where l.tipo in ('receita', 'despesa')
      and (p_visao = 'previsto' or l.data_pagamento is not null)
  ),
  no_ano as (
    select * from base
    where data_ref >= make_date(p_ano, 1, 1) and data_ref < make_date(p_ano + 1, 1, 1)
  ),
  -- Onde ficam juros e multas: a categoria do usuário com o nome combinado, se existir.
  alvo as (
    select n.natureza, c.id as categoria_id
    from (values ('despesa', 'juros e multas por atraso'), ('receita', 'juros e multas recebidos')) as n (natureza, nome)
    left join lateral (
      select c.id
      from public.categorias c
      join public.grupos g on g.id = c.grupo_id
      where g.natureza = n.natureza and lower(btrim(c.nome)) = n.nome
      order by c.ativa desc, g.ativo desc, c.criado_em
      limit 1
    ) c on true
  ),
  linhas as (
    -- valor principal na categoria de origem (com o desconto, se pago)
    select b.natureza, b.categoria_id, false as encargo,
           extract(month from b.data_ref)::integer as mes,
           case when b.pago then b.valor - b.desconto else b.valor end as valor
    from no_ano b
    union all
    -- juros + multa na linha própria
    select b.natureza, a.categoria_id, true,
           extract(month from b.data_ref)::integer,
           b.juros + b.multa
    from no_ano b
    join alvo a on a.natureza = b.natureza
    where b.pago and b.juros + b.multa > 0
  )
  select
    l.natureza,
    g.id,
    coalesce(g.nome, case when l.natureza = 'despesa' then 'Despesas financeiras' else 'Outras receitas' end),
    coalesce(g.ordem, 999),
    coalesce(g.ativo, true),
    c.id,
    coalesce(c.nome, case when l.natureza = 'despesa' then 'Juros e multas por atraso' else 'Juros e multas recebidos' end),
    coalesce(c.ativa, true),
    l.mes,
    sum(l.valor)
  from linhas l
  left join public.categorias c on c.id = l.categoria_id
  left join public.grupos g on g.id = c.grupo_id
  group by 1, 2, 3, 4, 5, 6, 7, 8, 9
  having sum(l.valor) <> 0
  order by l.natureza desc, 4, 3, 7, 9;
$$;

comment on function public.resultado_mensal(integer, text) is
  'Resultado do ano do usuário logado por grupo, categoria e mês (R7). Visão caixa (data de pagamento) ou previsto (vencimento) (R3); juros e multas em linha própria (R12).';

revoke execute on function public.resultado_mensal(integer, text) from public, anon;
grant execute on function public.resultado_mensal(integer, text) to authenticated, service_role;
