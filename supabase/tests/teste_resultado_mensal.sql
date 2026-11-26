-- Teste da função resultado_mensal (F3, sessão 2). Termina com um erro proposital
-- que desfaz tudo (rollback): nada fica gravado.
-- Rodar com: npx supabase db query --remote --yes -f supabase/tests/teste_resultado_mensal.sql
--
-- Cenário (usuário A, ano 2026):
--   R1 receita Honorários 1.000, vence e paga 05/03
--   R2 receita Honorários   500, vence 20/03, em aberto            (só no previsto)
--   R3 receita Honorários   300 + juros 3, vence 05/04, paga 10/04 (juros recebidos)
--   D1 despesa IPTU 320 + juros 5,01 + multa 6,40, vence 10/02, paga 26/03
--   D2 despesa Supermercado 200 − desconto 10, vence e paga 10/03
--   D3 despesa Supermercado  50, vence 30/12/2025, paga 02/01/2026
--   T1 transferência 999 em 15/03                                   (não entra)
-- Esperado, caixa:    Honorários mar 1.000, abr 300; Juros e multas recebidos abr 3;
--                     IPTU mar 320; Juros e multas por atraso mar 11,41;
--                     Supermercado jan 50, mar 190. Receitas 1.303; despesas 571,41.
-- Esperado, previsto: Honorários mar 1.500, abr 300; recebidos abr 3; IPTU fev 320;
--                     juros por atraso fev 11,41; Supermercado mar 190 (D3 é de 2025).
--                     Receitas 1.803; despesas 521,41.
--   Usuário B não vê nada de A.
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  conta_a uuid; conta_b uuid; cat_hon uuid; cat_iptu uuid; cat_mer uuid;
  res text := '';
  falhas int := 0;
  v numeric;
  n int;
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values
    (a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'resultado-a@exemplo.invalid', '{"nome":"A"}'::jsonb, now(), now()),
    (b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'resultado-b@exemplo.invalid', '{"nome":"B"}'::jsonb, now(), now());

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', a::text, true);
  execute 'set local role authenticated';

  insert into public.contas_financeiras (nome, tipo, saldo_inicial, data_saldo_inicial)
  values ('Conta A', 'banco', 0, '2025-01-01') returning id into conta_a;
  insert into public.contas_financeiras (nome, tipo, saldo_inicial, data_saldo_inicial)
  values ('Conta B de A', 'banco', 0, '2025-01-01') returning id into conta_b;
  select id into cat_hon  from public.categorias where nome = 'Honorários e serviços';
  select id into cat_iptu from public.categorias where nome = 'IPTU';
  select id into cat_mer  from public.categorias where nome = 'Supermercado';

  insert into public.lancamentos (tipo, data_vencimento, data_pagamento, valor, juros, multa, desconto, categoria_id, conta_id, conta_destino_id) values
    ('receita',       '2026-03-05', '2026-03-05', 1000, 0,    0,    0,  cat_hon,  conta_a, null),
    ('receita',       '2026-03-20', null,          500, 0,    0,    0,  cat_hon,  conta_a, null),
    ('receita',       '2026-04-05', '2026-04-10',  300, 3,    0,    0,  cat_hon,  conta_a, null),
    ('despesa',       '2026-02-10', '2026-03-26',  320, 5.01, 6.40, 0,  cat_iptu, conta_a, null),
    ('despesa',       '2026-03-10', '2026-03-10',  200, 0,    0,    10, cat_mer,  conta_a, null),
    ('despesa',       '2025-12-30', '2026-01-02',   50, 0,    0,    0,  cat_mer,  conta_a, null),
    ('transferencia', '2026-03-15', '2026-03-15',  999, 0,    0,    0,  null,     conta_a, conta_b);

  -- ---------- caixa ----------
  select coalesce(sum(r.valor), -1) into v from public.resultado_mensal(2026, 'caixa') r
    where r.categoria = 'Honorários e serviços' and r.mes = 3;
  if v = 1000 then res := res || 'caixa_hon_mar:ok '; else res := res || format('caixa_hon_mar:FALHA(%s) ', v); falhas := falhas + 1; end if;

  select coalesce(sum(r.valor), -1) into v from public.resultado_mensal(2026, 'caixa') r
    where r.categoria = 'Juros e multas recebidos' and r.mes = 4;
  if v = 3 then res := res || 'caixa_juros_recebidos:ok '; else res := res || format('caixa_juros_recebidos:FALHA(%s) ', v); falhas := falhas + 1; end if;

  select coalesce(sum(r.valor), -1) into v from public.resultado_mensal(2026, 'caixa') r
    where r.categoria = 'IPTU' and r.mes = 3;
  if v = 320 then res := res || 'caixa_iptu_sem_juros:ok '; else res := res || format('caixa_iptu_sem_juros:FALHA(%s) ', v); falhas := falhas + 1; end if;

  select coalesce(sum(r.valor), -1) into v from public.resultado_mensal(2026, 'caixa') r
    where r.categoria = 'Juros e multas por atraso' and r.grupo = 'Despesas financeiras' and r.mes = 3;
  if v = 11.41 then res := res || 'caixa_juros_por_atraso:ok '; else res := res || format('caixa_juros_por_atraso:FALHA(%s) ', v); falhas := falhas + 1; end if;

  select coalesce(sum(r.valor), -1) into v from public.resultado_mensal(2026, 'caixa') r
    where r.categoria = 'Supermercado' and r.mes = 3;
  if v = 190 then res := res || 'caixa_desconto:ok '; else res := res || format('caixa_desconto:FALHA(%s) ', v); falhas := falhas + 1; end if;

  select coalesce(sum(r.valor), -1) into v from public.resultado_mensal(2026, 'caixa') r
    where r.categoria = 'Supermercado' and r.mes = 1;
  if v = 50 then res := res || 'caixa_pago_no_ano:ok '; else res := res || format('caixa_pago_no_ano:FALHA(%s) ', v); falhas := falhas + 1; end if;

  select coalesce(sum(r.valor) filter (where r.natureza = 'receita'), 0) into v from public.resultado_mensal(2026, 'caixa') r;
  if v = 1303 then res := res || 'caixa_receitas:ok '; else res := res || format('caixa_receitas:FALHA(%s) ', v); falhas := falhas + 1; end if;
  select coalesce(sum(r.valor) filter (where r.natureza = 'despesa'), 0) into v from public.resultado_mensal(2026, 'caixa') r;
  if v = 571.41 then res := res || 'caixa_despesas:ok '; else res := res || format('caixa_despesas:FALHA(%s) ', v); falhas := falhas + 1; end if;

  -- ---------- previsto ----------
  select coalesce(sum(r.valor), -1) into v from public.resultado_mensal(2026, 'previsto') r
    where r.categoria = 'Honorários e serviços' and r.mes = 3;
  if v = 1500 then res := res || 'prev_hon_mar:ok '; else res := res || format('prev_hon_mar:FALHA(%s) ', v); falhas := falhas + 1; end if;

  select coalesce(sum(r.valor), -1) into v from public.resultado_mensal(2026, 'previsto') r
    where r.categoria = 'IPTU' and r.mes = 2;
  if v = 320 then res := res || 'prev_iptu_fev:ok '; else res := res || format('prev_iptu_fev:FALHA(%s) ', v); falhas := falhas + 1; end if;

  select coalesce(sum(r.valor), -1) into v from public.resultado_mensal(2026, 'previsto') r
    where r.categoria = 'Juros e multas por atraso' and r.mes = 2;
  if v = 11.41 then res := res || 'prev_juros_fev:ok '; else res := res || format('prev_juros_fev:FALHA(%s) ', v); falhas := falhas + 1; end if;

  select count(*) into n from public.resultado_mensal(2026, 'previsto') r
    where r.categoria = 'Supermercado' and r.mes = 1;
  if n = 0 then res := res || 'prev_vencido_em_2025_fora:ok '; else res := res || 'prev_vencido_em_2025_fora:FALHA '; falhas := falhas + 1; end if;

  select coalesce(sum(r.valor) filter (where r.natureza = 'receita'), 0) into v from public.resultado_mensal(2026, 'previsto') r;
  if v = 1803 then res := res || 'prev_receitas:ok '; else res := res || format('prev_receitas:FALHA(%s) ', v); falhas := falhas + 1; end if;
  select coalesce(sum(r.valor) filter (where r.natureza = 'despesa'), 0) into v from public.resultado_mensal(2026, 'previsto') r;
  if v = 521.41 then res := res || 'prev_despesas:ok '; else res := res || format('prev_despesas:FALHA(%s) ', v); falhas := falhas + 1; end if;

  -- Sem categoria "Juros e multas por atraso": vai para a linha sem categoria com o mesmo rótulo
  update public.categorias set nome = 'Juros antigos' where nome = 'Juros e multas por atraso';
  select coalesce(sum(r.valor), -1) into v from public.resultado_mensal(2026, 'caixa') r
    where r.categoria = 'Juros e multas por atraso' and r.categoria_id is null and r.mes = 3;
  if v = 11.41 then res := res || 'linha_sem_categoria:ok '; else res := res || format('linha_sem_categoria:FALHA(%s) ', v); falhas := falhas + 1; end if;

  -- B não vê nada de A
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', b::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.resultado_mensal(2026, 'caixa');
  if n = 0 then res := res || 'isolamento:ok '; else res := res || format('isolamento:FALHA(B viu %s linhas) ', n); falhas := falhas + 1; end if;

  execute 'reset role';
  raise exception 'RESULTADO falhas=% | %', falhas, res;
end
$$;
