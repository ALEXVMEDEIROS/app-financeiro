-- Sobra Vida · F1, sessão 5 · revisão
-- O verificador do Supabase apontou que as chaves estrangeiras compostas de
-- lancamentos (usuario_id, x_id) não tinham índice correspondente: os índices
-- da sessão 4 cobriam só a coluna x_id. Troca pelos índices do par.

drop index if exists public.lancamentos_conta;
drop index if exists public.lancamentos_destino;
drop index if exists public.lancamentos_categoria;

create index lancamentos_usuario_conta         on public.lancamentos (usuario_id, conta_id);
create index lancamentos_usuario_destino       on public.lancamentos (usuario_id, conta_destino_id);
create index lancamentos_usuario_categoria     on public.lancamentos (usuario_id, categoria_id);
create index lancamentos_usuario_centro_custo  on public.lancamentos (usuario_id, centro_custo_id);
create index lancamentos_usuario_pessoa        on public.lancamentos (usuario_id, pessoa_id);
create index lancamentos_usuario_forma         on public.lancamentos (usuario_id, forma_pagamento_id);

-- categorias (usuario_id, grupo_id) já é coberta pelo índice único de nome;
-- o índice só por grupo_id era redundante.
drop index if exists public.categorias_grupo;
