-- Teste de extrato_conta, fluxo_diario e encargos_por_mes (F3, sessão 3).
-- Termina com um erro proposital que desfaz tudo (rollback): nada fica gravado.
-- Rodar com: npx supabase db query --remote --yes -f supabase/tests/teste_fluxo_extrato.sql
--
-- Cenário (usuário A, "hoje" = 24/11/2026):
--   Conta A: saldo inicial 1.000 em 01/11 · Conta B: saldo 0 em 01/11
--     +500  receita paga 05/11
--     −107  despesa 100 + juros 5 + multa 2, vence 08/11, paga 10/11
--     −200  transferência A → B paga 12/11
--     +290  receita 300 − desconto 10, paga 15/11
--      −80  despesa em aberto, venceu 20/11 (atrasada: conta em "hoje")
--     −300  despesa em aberto, vence 28/11
--      +50  receita em aberto, vence 05/12
--     −999  despesa paga 20/10, antes do saldo inicial (não conta)
-- Esperado:
--   Extrato A, novembro: anterior 1.000; 4 movimentos; saldo final 1.483
--   Extrato B, novembro: anterior 0; 1 movimento; saldo final 200
--   Fluxo (todas), novembro: 30 dias; saldo inicial 1.000; dia 24 saídas 80 (não previsto);
--     dia 28 saídas 300 (previsto); saldo final 1.303 = soma do previsto de saldos_contas;
--     transferência fora (dia 12 sem movimento)
--   Fluxo só da conta A, novembro: dia 12 saídas 200; saldo final 1.103
--   Fluxo (todas), dezembro: saldo do dia 05 = 1.353
--   Encargos 2026: novembro juros pagos 5, multas 2, descontos concedidos 10
--   Usuário B não vê nada de A.
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  conta_a uuid; conta_b uuid; cat_rec uuid; cat_desp uuid;
  r record;
  res text := '';
  falhas int := 0;
  v numeric; w numeric;
  n int;
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values
    (a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fluxo-a@exemplo.invalid', '{"nome":"A"}'::jsonb, now(), now()),
    (b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fluxo-b@exemplo.invalid', '{"nome":"B"}'::jsonb, now(), now());

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', a::text, true);
  execute 'set local role authenticated';

  insert into public.contas_financeiras (nome, tipo, saldo_inicial, data_saldo_inicial)
  values ('Conta A', 'banco', 1000, '2026-11-01') returning id into conta_a;
  insert into public.contas_financeiras (nome, tipo, saldo_inicial, data_saldo_inicial)
  values ('Conta B', 'banco', 0, '2026-11-01') returning id into conta_b;
  select id into cat_rec  from public.categorias where nome = 'Honorários e serviços';
  select id into cat_desp from public.categorias where nome = 'Supermercado';

  insert into public.lancamentos (tipo, data_vencimento, data_pagamento, valor, juros, multa, desconto, categoria_id, conta_id, conta_destino_id) values
    ('receita',       '2026-11-05', '2026-11-05', 500, 0, 0, 0,  cat_rec,  conta_a, null),
    ('despesa',       '2026-11-08', '2026-11-10', 100, 5, 2, 0,  cat_desp, conta_a, null),
    ('transferencia', '2026-11-12', '2026-11-12', 200, 0, 0, 0,  null,     conta_a, conta_b),
    ('receita',       '2026-11-15', '2026-11-15', 300, 0, 0, 10, cat_rec,  conta_a, null),
    ('despesa',       '2026-11-20', null,          80, 0, 0, 0,  cat_desp, conta_a, null),
    ('despesa',       '2026-11-28', null,         300, 0, 0, 0,  cat_desp, conta_a, null),
    ('receita',       '2026-12-05', null,          50, 0, 0, 0,  cat_rec,  conta_a, null),
    ('despesa',       '2026-10-20', '2026-10-20', 999, 0, 0, 0,  cat_desp, conta_a, null);

  -- ---------- extrato ----------
  select saldo into v from public.extrato_conta(conta_a, '2026-11-01', '2026-11-30') where ordem = 0;
  if v = 1000 then res := res || 'extrato_a_anterior:ok '; else res := res || format('extrato_a_anterior:FALHA(%s) ', v); falhas := falhas + 1; end if;
  select count(*) filter (where ordem > 0), max(saldo) filter (where ordem = (select max(ordem) from public.extrato_conta(conta_a, '2026-11-01', '2026-11-30')))
    into n, v from public.extrato_conta(conta_a, '2026-11-01', '2026-11-30');
  if n = 4 and v = 1483 then res := res || 'extrato_a_final:ok '; else res := res || format('extrato_a_final:FALHA(n=%s saldo=%s) ', n, v); falhas := falhas + 1; end if;
  select count(*) filter (where ordem > 0), max(saldo) into n, v from public.extrato_conta(conta_b, '2026-11-01', '2026-11-30');
  if n = 1 and v = 200 then res := res || 'extrato_b:ok '; else res := res || format('extrato_b:FALHA(n=%s saldo=%s) ', n, v); falhas := falhas + 1; end if;
  select outra_conta into r from public.extrato_conta(conta_b, '2026-11-01', '2026-11-30') where ordem = 1;
  if r.outra_conta = 'Conta A' then res := res || 'extrato_outra_conta:ok '; else res := res || 'extrato_outra_conta:FALHA '; falhas := falhas + 1; end if;

  -- ---------- fluxo, todas as contas ----------
  select count(*) into n from public.fluxo_diario('2026-11-01', '2026-11-30', '2026-11-24');
  if n = 30 then res := res || 'fluxo_30_dias:ok '; else res := res || format('fluxo_30_dias:FALHA(%s) ', n); falhas := falhas + 1; end if;
  select saldo into v from public.fluxo_diario('2026-11-01', '2026-11-30', '2026-11-24') where dia = '2026-11-01';
  if v = 1000 then res := res || 'fluxo_dia1:ok '; else res := res || format('fluxo_dia1:FALHA(%s) ', v); falhas := falhas + 1; end if;
  select * into r from public.fluxo_diario('2026-11-01', '2026-11-30', '2026-11-24') where dia = '2026-11-24';
  if r.saidas = 80 and not r.previsto then res := res || 'fluxo_atrasado_hoje:ok '; else res := res || format('fluxo_atrasado_hoje:FALHA(%s %s) ', r.saidas, r.previsto); falhas := falhas + 1; end if;
  select * into r from public.fluxo_diario('2026-11-01', '2026-11-30', '2026-11-24') where dia = '2026-11-28';
  if r.saidas = 300 and r.previsto then res := res || 'fluxo_previsto:ok '; else res := res || format('fluxo_previsto:FALHA(%s %s) ', r.saidas, r.previsto); falhas := falhas + 1; end if;
  select * into r from public.fluxo_diario('2026-11-01', '2026-11-30', '2026-11-24') where dia = '2026-11-12';
  if r.entradas = 0 and r.saidas = 0 then res := res || 'fluxo_sem_transferencia:ok '; else res := res || 'fluxo_sem_transferencia:FALHA '; falhas := falhas + 1; end if;
  select saldo into v from public.fluxo_diario('2026-11-01', '2026-11-30', '2026-11-24') where dia = '2026-11-30';
  select sum(saldo_previsto) into w from public.saldos_contas('2026-11-24', '2026-11-30');
  if v = 1303 and v = w then res := res || 'fluxo_bate_com_saldos:ok '; else res := res || format('fluxo_bate_com_saldos:FALHA(%s x %s) ', v, w); falhas := falhas + 1; end if;

  -- ---------- fluxo, só a conta A ----------
  select * into r from public.fluxo_diario('2026-11-01', '2026-11-30', '2026-11-24', conta_a) where dia = '2026-11-12';
  if r.saidas = 200 then res := res || 'fluxo_conta_transferencia:ok '; else res := res || format('fluxo_conta_transferencia:FALHA(%s) ', r.saidas); falhas := falhas + 1; end if;
  select saldo into v from public.fluxo_diario('2026-11-01', '2026-11-30', '2026-11-24', conta_a) where dia = '2026-11-30';
  if v = 1103 then res := res || 'fluxo_conta_final:ok '; else res := res || format('fluxo_conta_final:FALHA(%s) ', v); falhas := falhas + 1; end if;

  -- ---------- fluxo, mês seguinte ----------
  select saldo into v from public.fluxo_diario('2026-12-01', '2026-12-31', '2026-11-24') where dia = '2026-12-05';
  if v = 1353 then res := res || 'fluxo_dezembro:ok '; else res := res || format('fluxo_dezembro:FALHA(%s) ', v); falhas := falhas + 1; end if;

  -- ---------- encargos ----------
  select * into r from public.encargos_por_mes(2026) where mes = 11;
  if r.juros_pagos = 5 and r.multas_pagas = 2 and r.descontos_concedidos = 10 and r.descontos_obtidos = 0 then
    res := res || 'encargos:ok ';
  else
    res := res || format('encargos:FALHA(%s %s %s) ', r.juros_pagos, r.multas_pagas, r.descontos_concedidos); falhas := falhas + 1;
  end if;

  -- ---------- isolamento ----------
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', b::text, true);
  execute 'set local role authenticated';
  select count(*) filter (where ordem > 0) into n from public.extrato_conta(conta_a, '2026-11-01', '2026-11-30');
  if n = 0 then res := res || 'isolamento_extrato:ok '; else res := res || 'isolamento_extrato:FALHA '; falhas := falhas + 1; end if;
  select coalesce(max(saldo), 0) into v from public.fluxo_diario('2026-11-01', '2026-11-30', '2026-11-24');
  if v = 0 then res := res || 'isolamento_fluxo:ok '; else res := res || format('isolamento_fluxo:FALHA(%s) ', v); falhas := falhas + 1; end if;
  select count(*) into n from public.encargos_por_mes(2026);
  if n = 0 then res := res || 'isolamento_encargos:ok '; else res := res || 'isolamento_encargos:FALHA '; falhas := falhas + 1; end if;

  execute 'reset role';
  raise exception 'RESULTADO falhas=% | %', falhas, res;
end
$$;
