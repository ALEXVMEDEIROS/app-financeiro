-- Teste de um usuário logado (sessão 7 da F1).
-- Simula um usuário autenticado e confere permissões, regras e exclusão de conta.
-- Termina com um erro proposital que desfaz tudo (rollback): nada fica gravado.
-- Rodar com: npx supabase db query --remote --yes -f supabase/tests/teste_usuario_logado.sql
do $$
declare
  v_id        uuid := gen_random_uuid();
  v_grupos    int;
  v_formas    int;
  v_n         int;
  v_nome      text;
  v_plano     text;
  v_conta     uuid;
  v_cat_desp  uuid;
  v_cat_rec   uuid;
  v_lanc      text;
  v_natureza  text;
  v_transf    text;
  v_delcat    text;
  v_trunc     text;
  v_restante  int;
begin
  -- cadastro (como o Supabase Auth faria)
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'teste-logado@exemplo.invalid', '{"nome": "Teste Logado"}'::jsonb, now(), now());

  -- passa a agir como esse usuário logado
  perform set_config('request.jwt.claims',
                     json_build_object('sub', v_id, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_id::text, true);
  execute 'set local role authenticated';

  -- vê o próprio plano de contas e formas de pagamento
  select count(*) into v_grupos from public.grupos;
  select count(*) into v_formas from public.formas_pagamento;

  -- altera o próprio nome
  update public.perfis set nome = 'Nome alterado' where id = v_id;
  get diagnostics v_n = row_count;
  select nome into v_nome from public.perfis where id = v_id;

  -- não consegue mudar o próprio plano
  begin
    update public.perfis set plano = 'profissional' where id = v_id;
    v_plano := 'ALTEROU (falha)';
  exception when insufficient_privilege then
    v_plano := 'bloqueado';
  end;

  -- cria uma conta e um lançamento com juros e multa
  insert into public.contas_financeiras (nome, tipo, saldo_inicial)
  values ('Conta teste', 'banco', 100) returning id into v_conta;
  select id into v_cat_desp from public.categorias where nome = 'Supermercado';
  select id into v_cat_rec  from public.categorias where nome = 'Honorários e serviços';

  begin
    insert into public.lancamentos (tipo, data_vencimento, data_pagamento, valor, juros, multa,
                                    categoria_id, conta_id)
    values ('despesa', current_date, current_date, 100, 2.5, 1, v_cat_desp, v_conta);
    v_lanc := 'gravado';
  exception when others then
    v_lanc := 'ERRO: ' || sqlerrm;
  end;

  -- despesa com categoria de receita: deve ser recusada
  begin
    insert into public.lancamentos (tipo, data_vencimento, valor, categoria_id, conta_id)
    values ('despesa', current_date, 50, v_cat_rec, v_conta);
    v_natureza := 'ACEITOU (falha)';
  exception when check_violation then
    v_natureza := 'recusado';
  end;

  -- transferência sem conta de destino: deve ser recusada
  begin
    insert into public.lancamentos (tipo, data_vencimento, valor, conta_id)
    values ('transferencia', current_date, 10, v_conta);
    v_transf := 'ACEITOU (falha)';
  exception when check_violation then
    v_transf := 'recusado';
  end;

  -- apagar categoria em uso: deve ser bloqueado
  begin
    delete from public.categorias where id = v_cat_desp;
    v_delcat := 'APAGOU (falha)';
  exception when foreign_key_violation then
    v_delcat := 'bloqueado';
  end;

  -- esvaziar a tabela inteira: deve ser bloqueado
  begin
    execute 'truncate public.lancamentos';
    v_trunc := 'ESVAZIOU (falha)';
  exception when insufficient_privilege then
    v_trunc := 'bloqueado';
  end;

  -- volta ao papel do servidor e apaga a conta inteira (LGPD)
  execute 'reset role';
  delete from auth.users where id = v_id;

  select count(*) into v_restante from (
    select id from public.perfis where id = v_id
    union all select id from public.grupos where usuario_id = v_id
    union all select id from public.categorias where usuario_id = v_id
    union all select id from public.contas_financeiras where usuario_id = v_id
    union all select id from public.lancamentos where usuario_id = v_id
    union all select id from public.formas_pagamento where usuario_id = v_id
    union all select id from public.centros_custo where usuario_id = v_id
  ) x;

  raise exception 'RESULTADO grupos_visiveis=% formas=% | nome_alterado=% (%) | plano=% | lancamento_com_juros=% | despesa_com_categoria_de_receita=% | transferencia_sem_destino=% | apagar_categoria_usada=% | esvaziar_tabela=% | restou_apos_apagar_conta=%',
    v_grupos, v_formas, v_n, v_nome, v_plano, v_lanc, v_natureza, v_transf, v_delcat, v_trunc, v_restante;
end
$$;
