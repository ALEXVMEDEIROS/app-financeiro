-- Sobra Vida · F1, sessão 7 · revisão do banco
-- Três correções encontradas na revisão:
--
-- 1. Permissões de base. Neste projeto do Supabase, tabelas criadas por migração
--    não recebem permissões automáticas de leitura e escrita para usuários logados
--    (só TRUNCATE, REFERENCES, TRIGGER e MAINTAIN). Sem isto, nem o dono
--    conseguiria ler os próprios dados. As permissões abaixo são o "pode usar a
--    tabela"; as políticas de RLS continuam limitando cada um às próprias linhas.
--    As permissões administrativas que vieram por padrão são retiradas.
--
-- 2. Plano de assinatura. O usuário pode alterar só o próprio nome no perfil;
--    o campo "plano" (gratis, pessoal, profissional) fica fora do alcance dele,
--    para que ninguém se dê um plano pago. Quem muda o plano é o servidor
--    (service_role), na fase de cobrança.
--
-- 3. Exclusão de conta (LGPD). As ligações entre cadastros usavam ON DELETE
--    RESTRICT, que é verificado na hora e podia impedir apagar um usuário com
--    lançamentos (a exclusão em cascata passa pelas tabelas numa ordem qualquer).
--    Com NO ACTION a regra é a mesma no uso normal (não dá para apagar uma
--    categoria usada), mas é verificada no fim da operação, então apagar a conta
--    inteira funciona.

-- ---------------------------------------------------------------------------
-- 1. Permissões de base
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'contas_financeiras', 'grupos', 'categorias', 'centros_custo',
    'pessoas', 'formas_pagamento', 'bens', 'lancamentos', 'perfis'
  ] loop
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
  end loop;

  foreach t in array array[
    'contas_financeiras', 'grupos', 'categorias', 'centros_custo',
    'pessoas', 'formas_pagamento', 'bens', 'lancamentos'
  ] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- 2. Perfil: o usuário lê o próprio perfil e altera só o nome
-- ---------------------------------------------------------------------------
grant select on public.perfis to authenticated;
grant update (nome) on public.perfis to authenticated;

-- ---------------------------------------------------------------------------
-- Tabelas futuras: nada automático para anon e authenticated.
-- Cada migração concede o que a tabela nova precisa, de forma explícita.
-- ---------------------------------------------------------------------------
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Ligações entre cadastros: RESTRICT -> NO ACTION
-- ---------------------------------------------------------------------------
alter table public.categorias
  drop constraint categorias_usuario_id_grupo_id_fkey,
  add constraint categorias_usuario_id_grupo_id_fkey
    foreign key (usuario_id, grupo_id) references public.grupos (usuario_id, id);

alter table public.lancamentos
  drop constraint lancamentos_usuario_id_categoria_id_fkey,
  drop constraint lancamentos_usuario_id_conta_id_fkey,
  drop constraint lancamentos_usuario_id_conta_destino_id_fkey,
  drop constraint lancamentos_usuario_id_centro_custo_id_fkey,
  drop constraint lancamentos_usuario_id_pessoa_id_fkey,
  drop constraint lancamentos_usuario_id_forma_pagamento_id_fkey,
  add constraint lancamentos_usuario_id_categoria_id_fkey
    foreign key (usuario_id, categoria_id) references public.categorias (usuario_id, id),
  add constraint lancamentos_usuario_id_conta_id_fkey
    foreign key (usuario_id, conta_id) references public.contas_financeiras (usuario_id, id),
  add constraint lancamentos_usuario_id_conta_destino_id_fkey
    foreign key (usuario_id, conta_destino_id) references public.contas_financeiras (usuario_id, id),
  add constraint lancamentos_usuario_id_centro_custo_id_fkey
    foreign key (usuario_id, centro_custo_id) references public.centros_custo (usuario_id, id),
  add constraint lancamentos_usuario_id_pessoa_id_fkey
    foreign key (usuario_id, pessoa_id) references public.pessoas (usuario_id, id),
  add constraint lancamentos_usuario_id_forma_pagamento_id_fkey
    foreign key (usuario_id, forma_pagamento_id) references public.formas_pagamento (usuario_id, id);
