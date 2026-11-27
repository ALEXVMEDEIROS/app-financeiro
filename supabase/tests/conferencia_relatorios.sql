-- Conferência cruzada dos relatórios com os dados do próprio usuário (F3, sessão 16).
-- Não grava nada: só lê, como o usuário logado, e termina com um erro proposital
-- que mostra o resultado e desfaz a sessão (rollback).
-- Rodar com: npx supabase db query --remote --yes -f supabase/tests/conferencia_relatorios.sql
-- O usuário é o dono da conta "BANCO TESTE" (dados do teste de aceite da F2).
do $$
declare
  u uuid;
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  ini date := date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date;
  fim date := (date_trunc('month', (now() at time zone 'America/Sao_Paulo')) + interval '1 month - 1 day')::date;
  res text := '';
  falhas int := 0;
  n int; v numeric; w numeric;
begin
  select distinct usuario_id into u from public.contas_financeiras where lower(btrim(nome)) = 'banco teste';
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', u::text, true);
  execute 'set local role authenticated';

  -- 1. saldo de hoje de cada conta: à mão = saldos_contas = fim do extrato do mês
  select count(*) into n
  from public.contas_financeiras c
  join public.saldos_contas(hoje, fim) s on s.conta_id = c.id
  where c.ativa and (
    s.saldo_atual <> c.saldo_inicial + coalesce((
      select sum(case when l.conta_id = c.id
                      then case l.tipo when 'receita' then 1 else -1 end * (l.valor + l.juros + l.multa - l.desconto)
                      else l.valor end)
      from public.lancamentos l
      where (l.conta_id = c.id or l.conta_destino_id = c.id)
        and l.data_pagamento between c.data_saldo_inicial and hoje), 0)
    or s.saldo_atual <> (select e.saldo from public.extrato_conta(c.id, ini, fim) e order by e.ordem desc limit 1)
  );
  if n = 0 then res := res || 'saldo_hoje_mao_funcao_extrato:ok '; else res := res || format('saldo_hoje:FALHA(%s contas) ', n); falhas := falhas + 1; end if;

  -- 2. fluxo no último dia = soma do previsto das contas ativas
  select f.saldo into v from public.fluxo_diario(ini, fim, hoje) f where f.dia = fim;
  select sum(s.saldo_previsto) into w from public.saldos_contas(hoje, fim) s where s.ativa;
  if v = w then res := res || format('fluxo_fim=previsto(%s):ok ', v); else res := res || format('fluxo_fim:FALHA(%s x %s) ', v, w); falhas := falhas + 1; end if;

  -- 3. fluxo por conta no último dia = previsto daquela conta
  select count(*) into n
  from public.saldos_contas(hoje, fim) s
  where s.ativa and s.saldo_previsto <> (select f.saldo from public.fluxo_diario(ini, fim, hoje, s.conta_id) f where f.dia = fim);
  if n = 0 then res := res || 'fluxo_por_conta:ok '; else res := res || format('fluxo_por_conta:FALHA(%s contas) ', n); falhas := falhas + 1; end if;

  -- 4. resultado do mês (realizado) à mão = resultado_mensal
  select coalesce(sum(case when l.tipo = 'receita' then 1 else -1 end * (l.valor + l.juros + l.multa - l.desconto)), 0) into v
  from public.lancamentos l where l.tipo in ('receita', 'despesa') and l.data_pagamento between ini and fim;
  select coalesce(sum(case when r.natureza = 'receita' then r.valor else -r.valor end), 0) into w
  from public.resultado_mensal(extract(year from hoje)::int, 'caixa') r where r.mes = extract(month from hoje);
  if v = w then res := res || format('resultado_mes(%s):ok ', v); else res := res || format('resultado_mes:FALHA(%s x %s) ', v, w); falhas := falhas + 1; end if;

  -- 5. juros e multas do mês: encargos_por_mes = linha própria da DRE
  select coalesce(sum(e.juros_pagos + e.multas_pagas), 0) into v from public.encargos_por_mes(extract(year from hoje)::int) e where e.mes = extract(month from hoje);
  select coalesce(sum(r.valor), 0) into w from public.resultado_mensal(extract(year from hoje)::int, 'caixa') r
    where r.mes = extract(month from hoje) and r.natureza = 'despesa' and r.categoria = 'Juros e multas por atraso';
  if v = w then res := res || format('juros_mes(%s):ok ', v); else res := res || format('juros_mes:FALHA(%s x %s) ', v, w); falhas := falhas + 1; end if;

  execute 'reset role';
  raise exception 'RESULTADO falhas=% | %', falhas, res;
end
$$;
