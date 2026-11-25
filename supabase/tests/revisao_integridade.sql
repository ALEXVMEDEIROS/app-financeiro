-- Revisão de integridade (só leitura, só contagens: nenhum dado pessoal sai daqui).
-- Uso: npx supabase db query --remote --read-only -f supabase/tests/revisao_integridade.sql
select 'lancamentos' as item, count(*)::text as valor from public.lancamentos
union all
select 'grupos de parcelas', count(distinct grupo_parcelas_id)::text from public.lancamentos where grupo_parcelas_id is not null
union all
-- cada grupo: parcelas 1..N sem buraco, mesmo total, mesmo dono, tipo, conta, categoria e pessoa
select 'grupos de parcelas inconsistentes', count(*)::text from (
  select grupo_parcelas_id
  from public.lancamentos where grupo_parcelas_id is not null
  group by grupo_parcelas_id
  having count(*) <> max(parcela_total)
      or count(distinct parcela_num) <> count(*)
      or min(parcela_num) <> 1
      or count(distinct parcela_total) > 1
      or count(distinct usuario_id) > 1
      or count(distinct tipo) > 1
      or count(distinct conta_id) > 1
      or count(distinct categoria_id) > 1
      or count(distinct coalesce(pessoa_id::text, '-')) > 1
) g
union all
select 'parcelas pagas além da 1ª no mesmo dia da criação', count(*)::text
  from public.lancamentos where parcela_num > 1 and data_pagamento is not null
union all
select 'transferências com categoria ou pessoa', count(*)::text
  from public.lancamentos where tipo = 'transferencia' and (categoria_id is not null or pessoa_id is not null)
union all
select 'lançamentos com pessoa', count(*)::text from public.lancamentos where pessoa_id is not null
union all
select 'pessoas', count(*)::text from public.pessoas
union all
select 'pessoas com nome repetido (mesmo usuário)', count(*)::text from (
  select usuario_id, lower(btrim(nome)) from public.pessoas group by 1, 2 having count(*) > 1
) r
union all
select 'categoria de natureza diferente do tipo', count(*)::text
  from public.lancamentos l join public.categorias c on c.id = l.categoria_id
  join public.grupos g on g.id = c.grupo_id
  where l.tipo in ('receita', 'despesa') and g.natureza <> l.tipo;
