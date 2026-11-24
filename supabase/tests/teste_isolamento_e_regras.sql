-- Testes das sessões 14 a 16 da F1: isolamento entre dois usuários e regras dos
-- lançamentos. Cria dois usuários fictícios (A e B), age como cada um deles da
-- mesma forma que a API do Supabase faz (papel "authenticated" + identificação
-- do usuário) e confere o resultado de cada tentativa.
-- Termina com um erro proposital que desfaz tudo (rollback): nada fica gravado.
-- Rodar com: npx supabase db query --remote --yes -f supabase/tests/teste_isolamento_e_regras.sql
--
-- Códigos esperados: 23514 = regra violada · 23503 = ligação inválida ·
-- 23505 = nome repetido · 42501 = proibido pela proteção por usuário.
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  conta_a uuid; conta_a2 uuid; conta_b uuid;
  lanc_a uuid; lanc_b uuid;
  cat_desp_a uuid; cat_rec_a uuid; cat_desp_b uuid;
  grupo_desp_a uuid; grupo_rec_a uuid;
  g uuid := gen_random_uuid();
  n int;
  r text := '';
  falhas int := 0;
  total int := 0;
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values
    (a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'teste-a@exemplo.invalid', '{"nome": "Usuario A"}'::jsonb, now(), now()),
    (b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'teste-b@exemplo.invalid', '{"nome": "Usuario B"}'::jsonb, now(), now());

  -- =========================================================================
  -- Como A: dados válidos e regras (sessão 16)
  -- =========================================================================
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', a::text, true);
  execute 'set local role authenticated';

  insert into public.contas_financeiras (nome, tipo, saldo_inicial) values ('Conta A', 'banco', 1000) returning id into conta_a;
  insert into public.contas_financeiras (nome, tipo) values ('Poupança A', 'banco') returning id into conta_a2;
  select id into cat_desp_a from public.categorias where nome = 'Supermercado';
  select id into cat_rec_a from public.categorias where nome = 'Honorários e serviços';
  select id into grupo_desp_a from public.grupos where nome = 'Moradia';
  select id into grupo_rec_a from public.grupos where nome = 'Trabalho' and natureza = 'receita';

  -- V1: lançamentos válidos de todos os tipos
  total := total + 1;
  begin
    insert into public.lancamentos (tipo, data_vencimento, data_pagamento, valor, categoria_id, conta_id)
    values ('despesa', current_date, current_date, 100, cat_desp_a, conta_a) returning id into lanc_a;
    insert into public.lancamentos (tipo, data_vencimento, valor, categoria_id, conta_id)
    values ('receita', current_date, 5000, cat_rec_a, conta_a);                       -- em aberto (R2)
    insert into public.lancamentos (tipo, data_vencimento, data_pagamento, valor, conta_id, conta_destino_id)
    values ('transferencia', current_date, current_date, 300, conta_a, conta_a2);     -- R4
    insert into public.lancamentos (tipo, data_vencimento, valor, categoria_id, conta_id, parcela_num, parcela_total, grupo_parcelas_id)
    values ('despesa', current_date, 200, cat_desp_a, conta_a, 1, 3, g),
           ('despesa', current_date + 30, 200, cat_desp_a, conta_a, 2, 3, g),
           ('despesa', current_date + 60, 200, cat_desp_a, conta_a, 3, 3, g);         -- R11
    insert into public.lancamentos (tipo, data_vencimento, data_pagamento, valor, juros, multa, desconto, categoria_id, conta_id)
    values ('despesa', current_date, current_date, 100, 5, 2, 10, cat_desp_a, conta_a); -- R12
    r := r || 'V1-validos:ok ';
  exception when others then
    r := r || 'V1-validos:FALHA(' || sqlerrm || ') '; falhas := falhas + 1;
  end;

  -- R01 valor zero
  total := total + 1;
  begin
    insert into public.lancamentos (tipo, data_vencimento, valor, categoria_id, conta_id) values ('despesa', current_date, 0, cat_desp_a, conta_a);
    r := r || 'R01-valor_zero:FALHA(aceitou) '; falhas := falhas + 1;
  exception when others then
    if sqlstate = '23514' then r := r || 'R01-valor_zero:ok '; else r := r || 'R01:FALHA(' || sqlstate || ') '; falhas := falhas + 1; end if;
  end;

  -- R02 valor negativo
  total := total + 1;
  begin
    insert into public.lancamentos (tipo, data_vencimento, valor, categoria_id, conta_id) values ('despesa', current_date, -50, cat_desp_a, conta_a);
    r := r || 'R02-valor_negativo:FALHA(aceitou) '; falhas := falhas + 1;
  exception when others then
    if sqlstate = '23514' then r := r || 'R02-valor_negativo:ok '; else r := r || 'R02:FALHA(' || sqlstate || ') '; falhas := falhas + 1; end if;
  end;

  -- R03 juros negativos
  total := total + 1;
  begin
    insert into public.lancamentos (tipo, data_vencimento, valor, juros, categoria_id, conta_id) values ('despesa', current_date, 50, -1, cat_desp_a, conta_a);
    r := r || 'R03-juros_negativos:FALHA(aceitou) '; falhas := falhas + 1;
  exception when others then
    if sqlstate = '23514' then r := r || 'R03-juros_negativos:ok '; else r := r || 'R03:FALHA(' || sqlstate || ') '; falhas := falhas + 1; end if;
  end;

  -- R04 juros numa transferência
  total := total + 1;
  begin
    insert into public.lancamentos (tipo, data_vencimento, valor, juros, conta_id, conta_destino_id) values ('transferencia', current_date, 50, 1, conta_a, conta_a2);
    r := r || 'R04-juros_transferencia:FALHA(aceitou) '; falhas := falhas + 1;
  exception when others then
    if sqlstate = '23514' then r := r || 'R04-juros_transferencia:ok '; else r := r || 'R04:FALHA(' || sqlstate || ') '; falhas := falhas + 1; end if;
  end;

  -- R05 transferência para a mesma conta
  total := total + 1;
  begin
    insert into public.lancamentos (tipo, data_vencimento, valor, conta_id, conta_destino_id) values ('transferencia', current_date, 50, conta_a, conta_a);
    r := r || 'R05-transf_mesma_conta:FALHA(aceitou) '; falhas := falhas + 1;
  exception when others then
    if sqlstate = '23514' then r := r || 'R05-transf_mesma_conta:ok '; else r := r || 'R05:FALHA(' || sqlstate || ') '; falhas := falhas + 1; end if;
  end;

  -- R06 transferência sem destino
  total := total + 1;
  begin
    insert into public.lancamentos (tipo, data_vencimento, valor, conta_id) values ('transferencia', current_date, 50, conta_a);
    r := r || 'R06-transf_sem_destino:FALHA(aceitou) '; falhas := falhas + 1;
  exception when others then
    if sqlstate = '23514' then r := r || 'R06-transf_sem_destino:ok '; else r := r || 'R06:FALHA(' || sqlstate || ') '; falhas := falhas + 1; end if;
  end;

  -- R07 despesa sem categoria
  total := total + 1;
  begin
    insert into public.lancamentos (tipo, data_vencimento, valor, conta_id) values ('despesa', current_date, 50, conta_a);
    r := r || 'R07-despesa_sem_categoria:FALHA(aceitou) '; falhas := falhas + 1;
  exception when others then
    if sqlstate = '23514' then r := r || 'R07-despesa_sem_categoria:ok '; else r := r || 'R07:FALHA(' || sqlstate || ') '; falhas := falhas + 1; end if;
  end;

  -- R08 desconto maior que o valor
  total := total + 1;
  begin
    insert into public.lancamentos (tipo, data_vencimento, valor, desconto, categoria_id, conta_id) values ('despesa', current_date, 50, 60, cat_desp_a, conta_a);
    r := r || 'R08-desconto_maior:FALHA(aceitou) '; falhas := falhas + 1;
  exception when others then
    if sqlstate = '23514' then r := r || 'R08-desconto_maior:ok '; else r := r || 'R08:FALHA(' || sqlstate || ') '; falhas := falhas + 1; end if;
  end;

  -- R09 parcela 4 de 3
  total := total + 1;
  begin
    insert into public.lancamentos (tipo, data_vencimento, valor, categoria_id, conta_id, parcela_num, parcela_total, grupo_parcelas_id)
    values ('despesa', current_date, 50, cat_desp_a, conta_a, 4, 3, g);
    r := r || 'R09-parcela_fora:FALHA(aceitou) '; falhas := falhas + 1;
  exception when others then
    if sqlstate = '23514' then r := r || 'R09-parcela_fora:ok '; else r := r || 'R09:FALHA(' || sqlstate || ') '; falhas := falhas + 1; end if;
  end;

  -- R10 parcela sem grupo de parcelas
  total := total + 1;
  begin
    insert into public.lancamentos (tipo, data_vencimento, valor, categoria_id, conta_id, parcela_num, parcela_total)
    values ('despesa', current_date, 50, cat_desp_a, conta_a, 1, 2);
    r := r || 'R10-parcela_sem_grupo:FALHA(aceitou) '; falhas := falhas + 1;
  exception when others then
    if sqlstate = '23514' then r := r || 'R10-parcela_sem_grupo:ok '; else r := r || 'R10:FALHA(' || sqlstate || ') '; falhas := falhas + 1; end if;
  end;

  -- R11 data absurda
  total := total + 1;
  begin
    insert into public.lancamentos (tipo, data_vencimento, valor, categoria_id, conta_id) values ('despesa', date '1990-01-01', 50, cat_desp_a, conta_a);
    r := r || 'R11-data_absurda:FALHA(aceitou) '; falhas := falhas + 1;
  exception when others then
    if sqlstate = '23514' then r := r || 'R11-data_absurda:ok '; else r := r || 'R11:FALHA(' || sqlstate || ') '; falhas := falhas + 1; end if;
  end;

  -- R12 receita com categoria de despesa
  total := total + 1;
  begin
    insert into public.lancamentos (tipo, data_vencimento, valor, categoria_id, conta_id) values ('receita', current_date, 50, cat_desp_a, conta_a);
    r := r || 'R12-natureza_errada:FALHA(aceitou) '; falhas := falhas + 1;
  exception when others then
    if sqlstate = '23514' then r := r || 'R12-natureza_errada:ok '; else r := r || 'R12:FALHA(' || sqlstate || ') '; falhas := falhas + 1; end if;
  end;

  -- R13 mudar a natureza de um grupo com categorias
  total := total + 1;
  begin
    update public.grupos set natureza = 'receita' where id = grupo_desp_a;
    r := r || 'R13-grupo_muda_natureza:FALHA(aceitou) '; falhas := falhas + 1;
  exception when others then
    if sqlstate = '23514' then r := r || 'R13-grupo_muda_natureza:ok '; else r := r || 'R13:FALHA(' || sqlstate || ') '; falhas := falhas + 1; end if;
  end;

  -- R14 mover categoria de despesa para grupo de receita
  total := total + 1;
  begin
    update public.categorias set grupo_id = grupo_rec_a where id = cat_desp_a;
    r := r || 'R14-categoria_troca_natureza:FALHA(aceitou) '; falhas := falhas + 1;
  exception when others then
    if sqlstate = '23514' then r := r || 'R14-categoria_troca_natureza:ok '; else r := r || 'R14:FALHA(' || sqlstate || ') '; falhas := falhas + 1; end if;
  end;

  -- R15 apagar conta com lançamentos
  total := total + 1;
  begin
    delete from public.contas_financeiras where id = conta_a;
    r := r || 'R15-apagar_conta_usada:FALHA(aceitou) '; falhas := falhas + 1;
  exception when others then
    if sqlstate = '23503' then r := r || 'R15-apagar_conta_usada:ok '; else r := r || 'R15:FALHA(' || sqlstate || ') '; falhas := falhas + 1; end if;
  end;

  -- R16 conta com nome repetido (maiúsculas não importam)
  total := total + 1;
  begin
    insert into public.contas_financeiras (nome, tipo) values ('conta a', 'caixa');
    r := r || 'R16-nome_repetido:FALHA(aceitou) '; falhas := falhas + 1;
  exception when others then
    if sqlstate = '23505' then r := r || 'R16-nome_repetido:ok '; else r := r || 'R16:FALHA(' || sqlstate || ') '; falhas := falhas + 1; end if;
  end;

  -- =========================================================================
  -- Como B: tentativas contra os dados de A (sessões 14 e 15)
  -- =========================================================================
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', b::text, true);
  execute 'set local role authenticated';

  insert into public.contas_financeiras (nome, tipo) values ('Conta B', 'banco') returning id into conta_b;
  select id into cat_desp_b from public.categorias where nome = 'Supermercado';
  insert into public.lancamentos (tipo, data_vencimento, valor, categoria_id, conta_id)
  values ('despesa', current_date, 70, cat_desp_b, conta_b) returning id into lanc_b;

  -- I01 B não vê lançamentos de A (e vê só o dele)
  total := total + 1;
  select count(*) into n from public.lancamentos where usuario_id = a;
  if n = 0 and (select count(*) from public.lancamentos) = 1 then r := r || 'I01-ler_lancamentos:ok ';
  else r := r || 'I01-ler_lancamentos:FALHA(viu ' || n || ') '; falhas := falhas + 1; end if;

  -- I02 B não vê contas, categorias, grupos nem perfil de A
  total := total + 1;
  if (select count(*) from public.contas_financeiras where usuario_id = a) = 0
     and (select count(*) from public.categorias where usuario_id = a) = 0
     and (select count(*) from public.grupos) = 13
     and (select count(*) from public.perfis) = 1
  then r := r || 'I02-ler_cadastros:ok ';
  else r := r || 'I02-ler_cadastros:FALHA '; falhas := falhas + 1; end if;

  -- I03 B tenta alterar a conta de A
  total := total + 1;
  update public.contas_financeiras set nome = 'invadida' where id = conta_a;
  get diagnostics n = row_count;
  if n = 0 then r := r || 'I03-alterar_conta_de_A:ok '; else r := r || 'I03:FALHA(alterou) '; falhas := falhas + 1; end if;

  -- I04 B tenta apagar lançamento de A
  total := total + 1;
  delete from public.lancamentos where id = lanc_a;
  get diagnostics n = row_count;
  if n = 0 then r := r || 'I04-apagar_lancamento_de_A:ok '; else r := r || 'I04:FALHA(apagou) '; falhas := falhas + 1; end if;

  -- I05 B tenta alterar o perfil de A
  total := total + 1;
  update public.perfis set nome = 'invadido' where id = a;
  get diagnostics n = row_count;
  if n = 0 then r := r || 'I05-alterar_perfil_de_A:ok '; else r := r || 'I05:FALHA(alterou) '; falhas := falhas + 1; end if;

  -- I06 B lança usando a conta de A
  total := total + 1;
  begin
    insert into public.lancamentos (tipo, data_vencimento, valor, categoria_id, conta_id) values ('despesa', current_date, 10, cat_desp_b, conta_a);
    r := r || 'I06-usar_conta_de_A:FALHA(aceitou) '; falhas := falhas + 1;
  exception when others then
    if sqlstate = '23503' then r := r || 'I06-usar_conta_de_A:ok '; else r := r || 'I06:FALHA(' || sqlstate || ') '; falhas := falhas + 1; end if;
  end;

  -- I07 B lança usando a categoria de A
  total := total + 1;
  begin
    insert into public.lancamentos (tipo, data_vencimento, valor, categoria_id, conta_id) values ('despesa', current_date, 10, cat_desp_a, conta_b);
    r := r || 'I07-usar_categoria_de_A:FALHA(aceitou) '; falhas := falhas + 1;
  exception when others then
    if sqlstate in ('23503', '23514') then r := r || 'I07-usar_categoria_de_A:ok '; else r := r || 'I07:FALHA(' || sqlstate || ') '; falhas := falhas + 1; end if;
  end;

  -- I08 B cria uma conta "em nome" de A
  total := total + 1;
  begin
    insert into public.contas_financeiras (usuario_id, nome, tipo) values (a, 'Falsa', 'banco');
    r := r || 'I08-criar_em_nome_de_A:FALHA(aceitou) '; falhas := falhas + 1;
  exception when others then
    if sqlstate = '42501' then r := r || 'I08-criar_em_nome_de_A:ok '; else r := r || 'I08:FALHA(' || sqlstate || ') '; falhas := falhas + 1; end if;
  end;

  -- I09 B passa a própria conta para A
  total := total + 1;
  begin
    update public.contas_financeiras set usuario_id = a where id = conta_b;
    r := r || 'I09-transferir_dono:FALHA(aceitou) '; falhas := falhas + 1;
  exception when others then
    if sqlstate in ('42501', '23503') then r := r || 'I09-transferir_dono:ok '; else r := r || 'I09:FALHA(' || sqlstate || ') '; falhas := falhas + 1; end if;
  end;

  -- I10 B aponta o próprio lançamento para a conta de A
  total := total + 1;
  begin
    update public.lancamentos set conta_id = conta_a where id = lanc_b;
    r := r || 'I10-apontar_para_conta_de_A:FALHA(aceitou) '; falhas := falhas + 1;
  exception when others then
    if sqlstate = '23503' then r := r || 'I10-apontar_para_conta_de_A:ok '; else r := r || 'I10:FALHA(' || sqlstate || ') '; falhas := falhas + 1; end if;
  end;

  -- =========================================================================
  -- De volta ao servidor: os dados de A continuam intactos?
  -- =========================================================================
  execute 'reset role';
  total := total + 1;
  if (select count(*) from public.lancamentos where usuario_id = a) = 7
     and (select nome from public.contas_financeiras where id = conta_a) = 'Conta A'
     and (select nome from public.perfis where id = a) = 'Usuario A'
  then r := r || 'I11-dados_de_A_intactos:ok ';
  else r := r || 'I11-dados_de_A_intactos:FALHA '; falhas := falhas + 1; end if;

  raise exception 'RESULTADO testes=% falhas=% | %', total, falhas, r;
end
$$;
