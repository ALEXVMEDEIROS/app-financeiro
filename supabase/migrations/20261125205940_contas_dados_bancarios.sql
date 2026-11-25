-- Sobra Vida · F2 · dados bancários das contas (pedido do dono, 25/11/2026)
-- Três campos opcionais, só para identificação: código do banco (COMPE, 3
-- dígitos, ex.: 033 Santander), agência e número da conta. Nenhuma operação
-- do app usa esses dados; eles ficam protegidos pela mesma regra de dono (RLS).
-- Formatos aceitos são folgados de propósito: cada banco escreve de um jeito
-- (ex.: agência 1234-5, conta 01.234567-8, dígito X).

alter table public.contas_financeiras
  add column codigo_banco text
    check (codigo_banco is null or codigo_banco ~ '^[0-9]{3}$'),
  add column agencia text
    check (agencia is null or agencia ~ '^[0-9][0-9xX.-]{0,9}$'),
  add column numero_conta text
    check (numero_conta is null or numero_conta ~ '^[0-9][0-9xX.-]{0,19}$');

comment on column public.contas_financeiras.codigo_banco is 'Código COMPE do banco, 3 dígitos (opcional).';
comment on column public.contas_financeiras.agencia is 'Número da agência, com dígito se houver (opcional).';
comment on column public.contas_financeiras.numero_conta is 'Número da conta, com dígito (opcional).';
