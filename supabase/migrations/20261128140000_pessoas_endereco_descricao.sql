-- Sobra Vida · F4 extra · endereço e descrição das pessoas (pedido do dono, 28/11/2026)
-- Todos opcionais (LGPD: coletar só o que o usuário quiser guardar). Nenhuma
-- operação do app usa esses dados; ficam protegidos pela mesma regra de dono (RLS).
-- CEP guardado só com os 8 dígitos; UF com a sigla de 2 letras maiúsculas.

alter table public.pessoas
  add column logradouro text
    check (logradouro is null or char_length(logradouro) <= 150),
  add column numero text
    check (numero is null or char_length(numero) <= 20),
  add column complemento text
    check (complemento is null or char_length(complemento) <= 80),
  add column bairro text
    check (bairro is null or char_length(bairro) <= 80),
  add column cep text
    check (cep is null or cep ~ '^[0-9]{8}$'),
  add column cidade text
    check (cidade is null or char_length(cidade) <= 80),
  add column uf text
    check (uf is null or uf in (
      'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
      'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
    )),
  add column descricao text
    check (descricao is null or char_length(descricao) <= 1000);

comment on column public.pessoas.logradouro is 'Rua, avenida etc. (opcional).';
comment on column public.pessoas.numero is 'Número do endereço; aceita "s/n" (opcional).';
comment on column public.pessoas.complemento is 'Apartamento, sala, bloco (opcional).';
comment on column public.pessoas.bairro is 'Bairro (opcional).';
comment on column public.pessoas.cep is 'CEP só com os 8 dígitos (opcional).';
comment on column public.pessoas.cidade is 'Cidade (opcional).';
comment on column public.pessoas.uf is 'Sigla do estado (opcional).';
comment on column public.pessoas.descricao is 'Descrição livre da pessoa, até 1000 caracteres (opcional).';
