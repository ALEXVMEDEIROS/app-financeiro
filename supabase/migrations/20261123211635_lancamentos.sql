-- Sobra Vida · F1, sessão 4 · lançamentos
-- O registro central do app: receitas, despesas e transferências.
-- Regras do documento de produto gravadas no banco:
--   R1  três tipos; só receita e despesa usam categoria
--   R2  sem data de pagamento = em aberto
--   R4  transferência: conta de destino obrigatória e diferente da origem
--   R11 parcelas
--   R12 juros, multa e desconto (sugestão de testador, 23/11/2026)
-- e a natureza da categoria precisa bater com o tipo (receita x despesa).

create table public.lancamentos (
  id                  uuid primary key default gen_random_uuid(),
  usuario_id          uuid not null default auth.uid()
                      references auth.users (id) on delete cascade,
  tipo                text not null check (tipo in ('receita', 'despesa', 'transferencia')),

  data_lancamento     date not null default current_date,
  data_vencimento     date not null,
  data_pagamento      date,                         -- vazia = em aberto (R2)

  valor               numeric(14, 2) not null check (valor > 0),
  juros               numeric(14, 2) not null default 0 check (juros >= 0),
  multa               numeric(14, 2) not null default 0 check (multa >= 0),
  desconto            numeric(14, 2) not null default 0 check (desconto >= 0),

  categoria_id        uuid,
  conta_id            uuid not null,
  conta_destino_id    uuid,
  centro_custo_id     uuid,
  pessoa_id           uuid,
  forma_pagamento_id  uuid,

  observacao          text check (observacao is null or char_length(observacao) <= 500),

  parcela_num         integer,
  parcela_total       integer,
  grupo_parcelas_id   uuid,

  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now(),

  unique (usuario_id, id),

  -- Tudo o que o lançamento referencia precisa ser do mesmo usuário.
  -- Com a coluna vazia (null), a ligação simplesmente não é exigida.
  foreign key (usuario_id, categoria_id)
    references public.categorias (usuario_id, id) on delete restrict,
  foreign key (usuario_id, conta_id)
    references public.contas_financeiras (usuario_id, id) on delete restrict,
  foreign key (usuario_id, conta_destino_id)
    references public.contas_financeiras (usuario_id, id) on delete restrict,
  foreign key (usuario_id, centro_custo_id)
    references public.centros_custo (usuario_id, id) on delete restrict,
  foreign key (usuario_id, pessoa_id)
    references public.pessoas (usuario_id, id) on delete restrict,
  foreign key (usuario_id, forma_pagamento_id)
    references public.formas_pagamento (usuario_id, id) on delete restrict,

  -- R1 e R4: o que cada tipo exige
  constraint lancamento_tipo_coerente check (
    case tipo
      when 'transferencia' then
        categoria_id is null
        and conta_destino_id is not null
        and conta_destino_id <> conta_id
        and juros = 0 and multa = 0 and desconto = 0
      else
        categoria_id is not null
        and conta_destino_id is null
    end
  ),

  -- R12: o valor efetivo (valor + juros + multa - desconto) nunca é negativo
  constraint lancamento_valor_efetivo check (valor + juros + multa - desconto >= 0),

  -- R11: parcelas preenchidas juntas e coerentes
  constraint lancamento_parcelas check (
    (parcela_num is null and parcela_total is null and grupo_parcelas_id is null)
    or (
      parcela_num is not null and parcela_total is not null and grupo_parcelas_id is not null
      and parcela_total between 2 and 48
      and parcela_num between 1 and parcela_total
    )
  ),

  -- Datas passadas são permitidas (registrar algo já pago antes de usar o app);
  -- só recusamos datas fora de qualquer uso razoável, em geral erro de digitação.
  constraint lancamento_datas_razoaveis check (
    data_vencimento between date '2000-01-01' and date '2100-12-31'
    and (data_pagamento is null or data_pagamento between date '2000-01-01' and date '2100-12-31')
  )
);

comment on table public.lancamentos is
  'Receitas, despesas e transferências. Valor efetivo = valor + juros + multa - desconto (R12).';

create index lancamentos_vencimento on public.lancamentos (usuario_id, data_vencimento);
create index lancamentos_pagamento  on public.lancamentos (usuario_id, data_pagamento);
create index lancamentos_conta      on public.lancamentos (conta_id);
create index lancamentos_destino    on public.lancamentos (conta_destino_id);
create index lancamentos_categoria  on public.lancamentos (categoria_id);
create index lancamentos_parcelas   on public.lancamentos (grupo_parcelas_id);

-- ---------------------------------------------------------------------------
-- Natureza da categoria x tipo do lançamento
-- Uma despesa não pode usar categoria de receita, e vice-versa.
-- ---------------------------------------------------------------------------
create function public.verificar_natureza_lancamento()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_natureza text;
begin
  if new.tipo = 'transferencia' then
    return new;
  end if;

  select g.natureza
    into v_natureza
    from public.categorias c
    join public.grupos g on g.id = c.grupo_id and g.usuario_id = c.usuario_id
   where c.id = new.categoria_id
     and c.usuario_id = new.usuario_id;

  if v_natureza is distinct from new.tipo then
    raise exception 'A categoria escolhida é de %, mas o lançamento é de %.',
      coalesce(v_natureza, '(categoria não encontrada)'), new.tipo
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger lancamentos_natureza
  before insert or update of tipo, categoria_id on public.lancamentos
  for each row execute function public.verificar_natureza_lancamento();

-- Uma categoria só pode mudar para um grupo da mesma natureza,
-- para não invalidar lançamentos já feitos.
create function public.verificar_troca_grupo_categoria()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_antiga text;
  v_nova   text;
begin
  if new.grupo_id = old.grupo_id then
    return new;
  end if;
  select natureza into v_antiga from public.grupos where id = old.grupo_id;
  select natureza into v_nova   from public.grupos where id = new.grupo_id;
  if v_antiga is distinct from v_nova then
    raise exception 'Uma categoria de % não pode ir para um grupo de %.', v_antiga, v_nova
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger categorias_troca_grupo
  before update of grupo_id on public.categorias
  for each row execute function public.verificar_troca_grupo_categoria();

-- A natureza de um grupo não muda se ele já tem categorias.
create function public.verificar_troca_natureza_grupo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.natureza <> old.natureza
     and exists (select 1 from public.categorias where grupo_id = old.id) then
    raise exception 'Este grupo já tem categorias; a natureza (receita ou despesa) não pode mudar.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger grupos_troca_natureza
  before update of natureza on public.grupos
  for each row execute function public.verificar_troca_natureza_grupo();

-- ---------------------------------------------------------------------------
-- atualizado_em automático
-- ---------------------------------------------------------------------------
create function public.marcar_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger lancamentos_atualizado_em
  before update on public.lancamentos
  for each row execute function public.marcar_atualizado_em();

-- ---------------------------------------------------------------------------
-- Row Level Security (mesmo padrão das demais tabelas)
-- ---------------------------------------------------------------------------
alter table public.lancamentos enable row level security;

create policy "lancamentos: dono le" on public.lancamentos
  for select to authenticated using (usuario_id = (select auth.uid()));
create policy "lancamentos: dono cria" on public.lancamentos
  for insert to authenticated with check (usuario_id = (select auth.uid()));
create policy "lancamentos: dono altera" on public.lancamentos
  for update to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));
create policy "lancamentos: dono apaga" on public.lancamentos
  for delete to authenticated using (usuario_id = (select auth.uid()));

revoke all on public.lancamentos from anon;

-- As funções dos gatilhos não devem ser chamadas diretamente pela API.
revoke execute on function public.verificar_natureza_lancamento()   from public, anon, authenticated;
revoke execute on function public.verificar_troca_grupo_categoria() from public, anon, authenticated;
revoke execute on function public.verificar_troca_natureza_grupo()  from public, anon, authenticated;
revoke execute on function public.marcar_atualizado_em()            from public, anon, authenticated;
