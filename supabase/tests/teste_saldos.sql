-- Teste da função saldos_contas (F2, sessão 5). Termina com um erro proposital
-- que desfaz tudo (rollback): nada fica gravado.
-- Rodar com: npx supabase db query --remote --yes -f supabase/tests/teste_saldos.sql
--
-- Cenário (usuário A, "hoje" = 24/11/2026, previsão até 30/11/2026):
--   Conta A: saldo inicial 1.000 em 01/11
--     + 500   receita paga em 05/11
--     − 105   despesa de 100 com 5 de juros, paga em 10/11 (valor efetivo)
--     − 200   transferência para a Poupança A, paga em 12/11
--     − 300   despesa em aberto, vence 28/11        (só no previsto)
--     + 50    receita em aberto, vence 05/12        (fora do período)
--     − 999   despesa paga em 20/10, antes do saldo inicial (não conta)
--   Esperado: atual = 1.000 + 500 − 105 − 200 = 1.195 ; previsto = 1.195 − 300 = 895
--   Poupança A: saldo inicial 0 em 01/11 ; recebe 200  -> atual 200 ; previsto 200
--   Usuário B não vê nenhuma conta de A.
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  conta_a uuid; poup_a uuid; cat_rec uuid; cat_desp uuid;
  r record;
  res text := '';
  falhas int := 0;
  n int;
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values
    (a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'saldo-a@exemplo.invalid', '{"nome":"A"}'::jsonb, now(), now()),
    (b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'saldo-b@exemplo.invalid', '{"nome":"B"}'::jsonb, now(), now());

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', a::text, true);
  execute 'set local role authenticated';

  insert into public.contas_financeiras (nome, tipo, saldo_inicial, data_saldo_inicial)
  values ('Conta A', 'banco', 1000, '2026-11-01') returning id into conta_a;
  insert into public.contas_financeiras (nome, tipo, saldo_inicial, data_saldo_inicial)
  values ('Poupança A', 'banco', 0, '2026-11-01') returning id into poup_a;
  select id into cat_rec  from public.categorias where nome = 'Honorários e serviços';
  select id into cat_desp from public.categorias where nome = 'Supermercado';

  insert into public.lancamentos (tipo, data_vencimento, data_pagamento, valor, juros, categoria_id, conta_id, conta_destino_id) values
    ('receita',       '2026-11-05', '2026-11-05', 500, 0, cat_rec,  conta_a, null),
    ('despesa',       '2026-11-08', '2026-11-10', 100, 5, cat_desp, conta_a, null),
    ('transferencia', '2026-11-12', '2026-11-12', 200, 0, null,     conta_a, poup_a),
    ('despesa',       '2026-11-28', null,         300, 0, cat_desp, conta_a, null),
    ('receita',       '2026-12-05', null,          50, 0, cat_rec,  conta_a, null),
    ('despesa',       '2026-10-20', '2026-10-20', 999, 0, cat_desp, conta_a, null);

  for r in select * from public.saldos_contas('2026-11-24', '2026-11-30') loop
    if r.nome = 'Conta A' then
      if r.saldo_atual = 1195 and r.saldo_previsto = 895 then res := res || 'conta_a:ok ';
      else res := res || format('conta_a:FALHA(atual=%s previsto=%s) ', r.saldo_atual, r.saldo_previsto); falhas := falhas + 1; end if;
    elsif r.nome = 'Poupança A' then
      if r.saldo_atual = 200 and r.saldo_previsto = 200 then res := res || 'poupanca_a:ok ';
      else res := res || format('poupanca_a:FALHA(atual=%s previsto=%s) ', r.saldo_atual, r.saldo_previsto); falhas := falhas + 1; end if;
    end if;
  end loop;

  -- previsão até 31/12: entra também a receita de 50 em aberto
  select saldo_previsto into r from public.saldos_contas('2026-11-24', '2026-12-31') where nome = 'Conta A';
  if r.saldo_previsto = 945 then res := res || 'previsto_dezembro:ok ';
  else res := res || format('previsto_dezembro:FALHA(%s) ', r.saldo_previsto); falhas := falhas + 1; end if;

  -- B não vê as contas de A
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', b::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.saldos_contas('2026-11-24', '2026-11-30');
  if n = 0 then res := res || 'isolamento:ok ';
  else res := res || format('isolamento:FALHA(B viu %s contas) ', n); falhas := falhas + 1; end if;

  execute 'reset role';
  raise exception 'RESULTADO falhas=% | %', falhas, res;
end
$$;
