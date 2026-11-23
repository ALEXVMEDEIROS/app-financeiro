-- Sobra Vida · F1, sessão 6 · cadastro automático
-- Quando o Supabase Auth cria um usuário, o banco cria:
--   1. o perfil (com o nome informado no cadastro, se houver);
--   2. o plano de contas padrão (grupos e categorias, escrito do zero para o app,
--      aprovado em 19/11/2026 e ampliado com "Despesas financeiras" em 23/11/2026);
--   3. os centros de custo Casa e Trabalho;
--   4. as formas de pagamento padrão.
-- Contas financeiras não são criadas: o usuário cadastra as dele (F5).
--
-- As funções ficam no esquema "interno", que a API não expõe, e rodam com os
-- privilégios do dono (security definer) só para poder gravar em nome do novo
-- usuário antes de ele ter sessão.

create schema if not exists interno;
revoke all on schema interno from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Dados iniciais de um usuário
-- ---------------------------------------------------------------------------
create function interno.criar_dados_iniciais(p_usuario uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plano jsonb := $json$
  [
    {"natureza": "receita", "grupo": "Trabalho",
     "categorias": ["Honorários e serviços", "Salário ou pró-labore", "Comissões", "Distribuição de lucros"]},
    {"natureza": "receita", "grupo": "Rendimentos",
     "categorias": ["Rendimentos de aplicações", "Aluguéis recebidos"]},
    {"natureza": "receita", "grupo": "Outras receitas",
     "categorias": ["Reembolsos", "Presentes recebidos", "Juros e multas recebidos", "Outras receitas"]},

    {"natureza": "despesa", "grupo": "Moradia",
     "categorias": ["Aluguel ou financiamento", "Condomínio", "Energia", "Água", "Internet e telefone", "Manutenção da casa"]},
    {"natureza": "despesa", "grupo": "Alimentação",
     "categorias": ["Supermercado", "Restaurantes e delivery"]},
    {"natureza": "despesa", "grupo": "Transporte",
     "categorias": ["Combustível", "Aplicativos e transporte público", "Manutenção do veículo", "Seguro do veículo"]},
    {"natureza": "despesa", "grupo": "Saúde",
     "categorias": ["Plano de saúde", "Consultas e exames", "Farmácia"]},
    {"natureza": "despesa", "grupo": "Educação",
     "categorias": ["Escola e cursos", "Livros e materiais"]},
    {"natureza": "despesa", "grupo": "Trabalho",
     "categorias": ["Aluguel de sala", "Softwares e assinaturas", "Contabilidade", "Anuidade do conselho de classe", "Material de escritório"]},
    {"natureza": "despesa", "grupo": "Impostos e taxas",
     "categorias": ["Imposto de renda e carnê-leão", "IPTU", "IPVA"]},
    {"natureza": "despesa", "grupo": "Despesas financeiras",
     "categorias": ["Juros e multas por atraso", "Juros de cheque especial", "Juros de cartão de crédito", "Tarifas bancárias"]},
    {"natureza": "despesa", "grupo": "Pessoal e lazer",
     "categorias": ["Lazer e viagens", "Vestuário", "Cuidados pessoais", "Assinaturas pessoais"]},
    {"natureza": "despesa", "grupo": "Família",
     "categorias": ["Filhos", "Animais de estimação", "Presentes e doações"]}
  ]
  $json$;
  v_item   jsonb;
  v_ordem  integer := 0;
  v_grupo  uuid;
begin
  for v_item in select * from jsonb_array_elements(v_plano) loop
    v_ordem := v_ordem + 1;

    insert into public.grupos (usuario_id, nome, natureza, ordem)
    values (p_usuario, v_item ->> 'grupo', v_item ->> 'natureza', v_ordem)
    returning id into v_grupo;

    insert into public.categorias (usuario_id, grupo_id, nome)
    select p_usuario, v_grupo, cat
      from jsonb_array_elements_text(v_item -> 'categorias') as cat;
  end loop;

  insert into public.centros_custo (usuario_id, nome)
  values (p_usuario, 'Casa'), (p_usuario, 'Trabalho');

  insert into public.formas_pagamento (usuario_id, nome, parcelas_max, dias_recebimento)
  values
    (p_usuario, 'Dinheiro',               1,  0),
    (p_usuario, 'Pix',                    1,  0),
    (p_usuario, 'Cartão de débito',       1,  0),
    (p_usuario, 'Cartão de crédito',     12, 30),
    (p_usuario, 'Boleto',                 1,  0),
    (p_usuario, 'Transferência bancária', 1,  0);
end;
$$;

-- ---------------------------------------------------------------------------
-- Gatilho no cadastro do Supabase Auth
-- ---------------------------------------------------------------------------
create function interno.ao_criar_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (id, nome)
  values (
    new.id,
    left(btrim(coalesce(new.raw_user_meta_data ->> 'nome', '')), 120)
  );

  perform interno.criar_dados_iniciais(new.id);
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function interno.ao_criar_usuario();

-- Ninguém chama essas funções pela API; só o gatilho as usa.
revoke execute on function interno.criar_dados_iniciais(uuid) from public, anon, authenticated;
revoke execute on function interno.ao_criar_usuario()        from public, anon, authenticated;
