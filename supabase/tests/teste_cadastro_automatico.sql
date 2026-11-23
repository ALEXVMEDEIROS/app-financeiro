-- Teste do cadastro automático. Termina com um erro proposital que
-- desfaz tudo (rollback): nada fica gravado no banco.
do $$
declare
  v_id        uuid := gen_random_uuid();
  v_perfil    int;
  v_nome      text;
  v_grupos    int;
  v_grec      int;
  v_gdesp     int;
  v_cats      int;
  v_crec      int;
  v_cdesp     int;
  v_centros   int;
  v_formas    int;
  v_despfin   int;
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'teste@exemplo.invalid', '{"nome": "Teste Sobra Vida"}'::jsonb, now(), now());

  select count(*), max(nome) into v_perfil, v_nome from public.perfis where id = v_id;
  select count(*), count(*) filter (where natureza = 'receita'), count(*) filter (where natureza = 'despesa')
    into v_grupos, v_grec, v_gdesp from public.grupos where usuario_id = v_id;
  select count(*), count(*) filter (where g.natureza = 'receita'), count(*) filter (where g.natureza = 'despesa')
    into v_cats, v_crec, v_cdesp
    from public.categorias c join public.grupos g on g.id = c.grupo_id
   where c.usuario_id = v_id;
  select count(*) into v_centros from public.centros_custo where usuario_id = v_id;
  select count(*) into v_formas  from public.formas_pagamento where usuario_id = v_id;
  select count(*) into v_despfin
    from public.categorias c join public.grupos g on g.id = c.grupo_id
   where c.usuario_id = v_id and g.nome = 'Despesas financeiras';

  raise exception 'RESULTADO perfil=% nome=% | grupos=% (receita=% despesa=%) | categorias=% (receita=% despesa=%) | despesas_financeiras=% | centros=% | formas=%',
    v_perfil, v_nome, v_grupos, v_grec, v_gdesp, v_cats, v_crec, v_cdesp, v_despfin, v_centros, v_formas;
end
$$;
