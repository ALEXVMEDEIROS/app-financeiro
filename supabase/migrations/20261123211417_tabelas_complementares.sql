-- Sobra Vida · F1, sessão 3 · tabelas complementares
-- centros_custo, pessoas, formas_pagamento e bens.
-- Mesmo padrão da sessão 2: usuario_id = dono, RLS ligado na criação,
-- políticas só para o dono, papel anon sem acesso.
-- Fonte: docs/PLANO-TECNICO-F1.md (regras R9 e R10 do documento de produto).

-- ---------------------------------------------------------------------------
-- centros_custo: ex.: Casa, Trabalho (R9)
-- ---------------------------------------------------------------------------
create table public.centros_custo (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null default auth.uid()
              references auth.users (id) on delete cascade,
  nome        text not null check (char_length(btrim(nome)) between 1 and 60),
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now(),
  unique (usuario_id, id)
);

create unique index centros_custo_nome_unico
  on public.centros_custo (usuario_id, lower(btrim(nome)));

-- ---------------------------------------------------------------------------
-- pessoas: clientes e fornecedores juntos (R9)
-- Documento (CPF/CNPJ) e contato são opcionais: coletar só o necessário (LGPD).
-- Nomes repetidos são permitidos (pode haver homônimos).
-- ---------------------------------------------------------------------------
create table public.pessoas (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null default auth.uid()
              references auth.users (id) on delete cascade,
  nome        text not null check (char_length(btrim(nome)) between 1 and 120),
  documento   text check (documento is null or char_length(documento) <= 20),
  tipo        text not null default 'ambos'
              check (tipo in ('cliente', 'fornecedor', 'ambos')),
  contato     text check (contato is null or char_length(contato) <= 200),
  ativa       boolean not null default true,
  criado_em   timestamptz not null default now(),
  unique (usuario_id, id)
);

create index pessoas_usuario_nome on public.pessoas (usuario_id, lower(nome));

-- ---------------------------------------------------------------------------
-- formas_pagamento: Pix, cartão, boleto... (taxas ficam para a fase 3)
-- ---------------------------------------------------------------------------
create table public.formas_pagamento (
  id                uuid primary key default gen_random_uuid(),
  usuario_id        uuid not null default auth.uid()
                    references auth.users (id) on delete cascade,
  nome              text not null check (char_length(btrim(nome)) between 1 and 60),
  parcelas_max      integer not null default 1 check (parcelas_max between 1 and 48),
  dias_recebimento  integer not null default 0 check (dias_recebimento between 0 and 365),
  ativa             boolean not null default true,
  criado_em         timestamptz not null default now(),
  unique (usuario_id, id)
);

create unique index formas_pagamento_nome_unico
  on public.formas_pagamento (usuario_id, lower(btrim(nome)));

-- ---------------------------------------------------------------------------
-- bens: imóveis, veículos e outros, para o patrimônio (R10)
-- O histórico de avaliações entra na F6.
-- ---------------------------------------------------------------------------
create table public.bens (
  id               uuid primary key default gen_random_uuid(),
  usuario_id       uuid not null default auth.uid()
                   references auth.users (id) on delete cascade,
  nome             text not null check (char_length(btrim(nome)) between 1 and 120),
  tipo             text not null check (tipo in ('imovel', 'veiculo', 'participacao', 'outro')),
  valor_avaliacao  numeric(14, 2) not null check (valor_avaliacao >= 0),
  data_avaliacao   date not null default current_date,
  ativo            boolean not null default true,
  criado_em        timestamptz not null default now(),
  unique (usuario_id, id)
);

-- ---------------------------------------------------------------------------
-- Row Level Security: as quatro tabelas recebem as mesmas quatro políticas
-- (ler, criar, alterar, apagar), todas restritas ao dono.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['centros_custo', 'pessoas', 'formas_pagamento', 'bens'] loop
    execute format('alter table public.%I enable row level security', t);

    execute format(
      'create policy "%s: dono le" on public.%I for select to authenticated
         using (usuario_id = (select auth.uid()))', t, t);
    execute format(
      'create policy "%s: dono cria" on public.%I for insert to authenticated
         with check (usuario_id = (select auth.uid()))', t, t);
    execute format(
      'create policy "%s: dono altera" on public.%I for update to authenticated
         using (usuario_id = (select auth.uid()))
         with check (usuario_id = (select auth.uid()))', t, t);
    execute format(
      'create policy "%s: dono apaga" on public.%I for delete to authenticated
         using (usuario_id = (select auth.uid()))', t, t);

    -- sem login: nenhuma permissão de base
    execute format('revoke all on public.%I from anon', t);
  end loop;
end
$$;
