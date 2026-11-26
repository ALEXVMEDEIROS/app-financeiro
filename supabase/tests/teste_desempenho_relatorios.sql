-- Teste de desempenho das funções de relatório (F3, sessão 4). Termina com um erro
-- proposital que desfaz tudo (rollback): nada fica gravado.
-- Rodar com: npx supabase db query --remote --yes -f supabase/tests/teste_desempenho_relatorios.sql
--
-- Cenário: um usuário com 3 contas e 6.000 lançamentos espalhados por 2025 e 2026
-- (cerca de 8 por dia, bem acima do uso de uma pessoa). Mede o tempo de cada função.
-- Meta: cada chamada abaixo de 300 ms.
do $$
declare
  a uuid := gen_random_uuid();
  c1 uuid; c2 uuid; c3 uuid;
  cats uuid[];
  t0 timestamptz;
  ms numeric;
  res text := '';
  lentas int := 0;
  n int;
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values (a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'desempenho@exemplo.invalid', '{"nome":"D"}'::jsonb, now(), now());

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', a::text, true);
  execute 'set local role authenticated';

  insert into public.contas_financeiras (nome, tipo, saldo_inicial, data_saldo_inicial) values ('C1', 'banco', 10000, '2025-01-01') returning id into c1;
  insert into public.contas_financeiras (nome, tipo, saldo_inicial, data_saldo_inicial) values ('C2', 'banco', 0, '2025-01-01') returning id into c2;
  insert into public.contas_financeiras (nome, tipo, saldo_inicial, data_saldo_inicial) values ('C3', 'carteira', 500, '2025-01-01') returning id into c3;

  select array_agg(c.id) into cats
  from public.categorias c join public.grupos g on g.id = c.grupo_id
  where g.natureza = 'despesa';

  -- 5.000 despesas, 800 receitas, 200 transferências; 85% pagas
  insert into public.lancamentos (tipo, data_vencimento, data_pagamento, valor, juros, categoria_id, conta_id)
  select 'despesa', d, case when random() < 0.85 then d + (random() * 5)::int else null end,
         round((10 + random() * 990)::numeric, 2), case when random() < 0.05 then 3.5 else 0 end,
         cats[1 + floor(random() * array_length(cats, 1))::int],
         case when random() < 0.7 then c1 else c3 end
  from (select date '2025-01-01' + (random() * 700)::int as d from generate_series(1, 5000)) s;

  insert into public.lancamentos (tipo, data_vencimento, data_pagamento, valor, categoria_id, conta_id)
  select 'receita', d, case when random() < 0.85 then d else null end, round((500 + random() * 5000)::numeric, 2),
         (select c.id from public.categorias c where c.nome = 'Honorários e serviços'), c1
  from (select date '2025-01-01' + (random() * 700)::int as d from generate_series(1, 800)) s;

  insert into public.lancamentos (tipo, data_vencimento, data_pagamento, valor, conta_id, conta_destino_id)
  select 'transferencia', d, d, round((50 + random() * 500)::numeric, 2), c1, c2
  from (select date '2025-01-01' + (random() * 700)::int as d from generate_series(1, 200)) s;

  select count(*) into n from public.lancamentos;
  res := res || format('lancamentos=%s ', n);

  t0 := clock_timestamp(); perform count(*) from public.resultado_mensal(2026, 'caixa');
  ms := round(extract(epoch from clock_timestamp() - t0)::numeric * 1000, 1);
  res := res || format('resultado_caixa=%sms ', ms); if ms > 300 then lentas := lentas + 1; end if;

  t0 := clock_timestamp(); perform count(*) from public.resultado_mensal(2026, 'previsto');
  ms := round(extract(epoch from clock_timestamp() - t0)::numeric * 1000, 1);
  res := res || format('resultado_previsto=%sms ', ms); if ms > 300 then lentas := lentas + 1; end if;

  t0 := clock_timestamp(); perform count(*) from public.fluxo_diario('2026-11-01', '2026-11-30', '2026-11-26');
  ms := round(extract(epoch from clock_timestamp() - t0)::numeric * 1000, 1);
  res := res || format('fluxo_todas=%sms ', ms); if ms > 300 then lentas := lentas + 1; end if;

  t0 := clock_timestamp(); perform count(*) from public.fluxo_diario('2026-11-01', '2026-11-30', '2026-11-26', c1);
  ms := round(extract(epoch from clock_timestamp() - t0)::numeric * 1000, 1);
  res := res || format('fluxo_conta=%sms ', ms); if ms > 300 then lentas := lentas + 1; end if;

  t0 := clock_timestamp(); perform count(*) from public.extrato_conta(c1, '2026-11-01', '2026-11-30');
  ms := round(extract(epoch from clock_timestamp() - t0)::numeric * 1000, 1);
  res := res || format('extrato=%sms ', ms); if ms > 300 then lentas := lentas + 1; end if;

  t0 := clock_timestamp(); perform count(*) from public.encargos_por_mes(2026);
  ms := round(extract(epoch from clock_timestamp() - t0)::numeric * 1000, 1);
  res := res || format('encargos=%sms ', ms); if ms > 300 then lentas := lentas + 1; end if;

  t0 := clock_timestamp(); perform count(*) from public.saldos_contas('2026-11-26', '2026-11-30');
  ms := round(extract(epoch from clock_timestamp() - t0)::numeric * 1000, 1);
  res := res || format('saldos=%sms ', ms); if ms > 300 then lentas := lentas + 1; end if;

  execute 'reset role';
  raise exception 'RESULTADO lentas=% | %', lentas, res;
end
$$;
