-- Sobra Vida · F1, sessão 2 · tabelas de cadastro
-- perfis, contas_financeiras, grupos e categorias.
-- Cada tabela nasce com Row Level Security (RLS): cada usuário só enxerga e altera
-- as próprias linhas, e quem não está logado não lê nada.
-- Fonte: docs/PLANO-TECNICO-F1.md (regras R5 e R6 do documento de produto).

-- ---------------------------------------------------------------------------
-- perfis: um por usuário do Supabase Auth
-- ---------------------------------------------------------------------------
create table public.perfis (
  id          uuid primary key references auth.users (id) on delete cascade,
  nome        text not null default '' check (char_length(nome) <= 120),
  plano       text not null default 'gratis'
              check (plano in ('gratis', 'pessoal', 'profissional')),
  criado_em   timestamptz not null default now()
);

comment on table public.perfis is 'Dados do usuário no app. Criado no cadastro (sessão 6).';

-- ---------------------------------------------------------------------------
-- contas_financeiras: bancos, corretoras, carteiras e caixas (R6)
-- ---------------------------------------------------------------------------
create table public.contas_financeiras (
  id                  uuid primary key default gen_random_uuid(),
  usuario_id          uuid not null default auth.uid()
                      references auth.users (id) on delete cascade,
  nome                text not null check (char_length(btrim(nome)) between 1 and 80),
  tipo                text not null check (tipo in ('banco', 'corretora', 'carteira', 'caixa')),
  saldo_inicial       numeric(14, 2) not null default 0,
  data_saldo_inicial  date not null default current_date,
  ativa               boolean not null default true,
  criado_em           timestamptz not null default now(),
  -- permite que outras tabelas exijam "conta do mesmo usuário"
  unique (usuario_id, id)
);

create unique index contas_financeiras_nome_unico
  on public.contas_financeiras (usuario_id, lower(btrim(nome)));

comment on column public.contas_financeiras.saldo_inicial is
  'Pode ser negativo (conta que já começa no vermelho).';

-- ---------------------------------------------------------------------------
-- grupos: primeiro nível do plano de contas (R5)
-- ---------------------------------------------------------------------------
create table public.grupos (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null default auth.uid()
              references auth.users (id) on delete cascade,
  nome        text not null check (char_length(btrim(nome)) between 1 and 60),
  natureza    text not null check (natureza in ('receita', 'despesa')),
  ordem       integer not null default 0,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now(),
  unique (usuario_id, id)
);

create unique index grupos_nome_unico
  on public.grupos (usuario_id, natureza, lower(btrim(nome)));

-- ---------------------------------------------------------------------------
-- categorias: segundo nível do plano de contas (R5); herdam a natureza do grupo
-- ---------------------------------------------------------------------------
create table public.categorias (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null default auth.uid()
              references auth.users (id) on delete cascade,
  grupo_id    uuid not null,
  nome        text not null check (char_length(btrim(nome)) between 1 and 60),
  ativa       boolean not null default true,
  criado_em   timestamptz not null default now(),
  unique (usuario_id, id),
  -- o grupo precisa ser do mesmo usuário; grupo com categorias não pode ser apagado
  foreign key (usuario_id, grupo_id)
    references public.grupos (usuario_id, id) on delete restrict
);

create unique index categorias_nome_unico
  on public.categorias (usuario_id, grupo_id, lower(btrim(nome)));

create index categorias_grupo on public.categorias (grupo_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.perfis              enable row level security;
alter table public.contas_financeiras  enable row level security;
alter table public.grupos              enable row level security;
alter table public.categorias          enable row level security;

-- perfis: o dono lê e altera o próprio perfil. Criação e exclusão não são feitas
-- pelo app: o perfil nasce no cadastro (sessão 6) e some junto com o usuário.
create policy "perfil: dono le" on public.perfis
  for select to authenticated
  using (id = (select auth.uid()));

create policy "perfil: dono altera" on public.perfis
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- contas_financeiras
create policy "contas: dono le" on public.contas_financeiras
  for select to authenticated using (usuario_id = (select auth.uid()));
create policy "contas: dono cria" on public.contas_financeiras
  for insert to authenticated with check (usuario_id = (select auth.uid()));
create policy "contas: dono altera" on public.contas_financeiras
  for update to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));
create policy "contas: dono apaga" on public.contas_financeiras
  for delete to authenticated using (usuario_id = (select auth.uid()));

-- grupos
create policy "grupos: dono le" on public.grupos
  for select to authenticated using (usuario_id = (select auth.uid()));
create policy "grupos: dono cria" on public.grupos
  for insert to authenticated with check (usuario_id = (select auth.uid()));
create policy "grupos: dono altera" on public.grupos
  for update to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));
create policy "grupos: dono apaga" on public.grupos
  for delete to authenticated using (usuario_id = (select auth.uid()));

-- categorias
create policy "categorias: dono le" on public.categorias
  for select to authenticated using (usuario_id = (select auth.uid()));
create policy "categorias: dono cria" on public.categorias
  for insert to authenticated with check (usuario_id = (select auth.uid()));
create policy "categorias: dono altera" on public.categorias
  for update to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));
create policy "categorias: dono apaga" on public.categorias
  for delete to authenticated using (usuario_id = (select auth.uid()));

-- Sem login (papel anon) não há nenhuma política: nada é lido nem gravado.
-- Retira também a permissão de base do papel anon, como segunda barreira.
revoke all on public.perfis, public.contas_financeiras, public.grupos, public.categorias from anon;
