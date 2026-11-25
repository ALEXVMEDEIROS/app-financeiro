import { createClient } from "@/lib/supabase/server";
import type { CategoriaOpcao, Opcao } from "./novo/form-lancamento";

/**
 * Listas de escolha do formulário de lançamento (contas, categorias, centros,
 * formas e pessoas), só com o que está ativo. Na edição, `manter` inclui as
 * contas e a categoria já usadas, mesmo que tenham sido desativadas depois.
 */
export async function opcoesDoFormulario(manter: { contas?: string[]; categoria?: string } = {}) {
  const supabase = await createClient();
  const contasMantidas = (manter.contas ?? []).filter(Boolean);
  const ativasOu = (ids: string[]) => (ids.length ? `ativa.eq.true,id.in.(${ids.join(",")})` : "ativa.eq.true");

  const [contas, grupos, categorias, centros, formas, pessoas] = await Promise.all([
    supabase.from("contas_financeiras").select("id, instituicao, nome").or(ativasOu(contasMantidas)),
    supabase.from("grupos").select("id, nome, natureza, ordem"),
    supabase
      .from("categorias")
      .select("id, nome, grupo_id")
      .or(ativasOu(manter.categoria ? [manter.categoria] : [])),
    supabase.from("centros_custo").select("id, nome").eq("ativo", true),
    supabase.from("formas_pagamento").select("id, nome").eq("ativa", true),
    supabase.from("pessoas").select("nome").eq("ativa", true).order("nome").limit(500),
  ]);

  const listaContas: Opcao[] = (contas.data ?? [])
    .map((c) => ({ id: c.id, rotulo: c.instituicao ? `${c.instituicao} · ${c.nome}` : c.nome }))
    .sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR"));

  const gruposPorId = new Map((grupos.data ?? []).map((g) => [g.id, g]));
  const listaCategorias: CategoriaOpcao[] = (categorias.data ?? [])
    .flatMap((c) => {
      const g = gruposPorId.get(c.grupo_id);
      return g
        ? [{ id: c.id, nome: c.nome, grupo: g.nome, natureza: g.natureza as "receita" | "despesa", ordem: g.ordem }]
        : [];
    })
    .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"));

  return {
    contas: listaContas,
    categorias: listaCategorias,
    centros: (centros.data ?? []).map((c) => ({ id: c.id, rotulo: c.nome })),
    formas: (formas.data ?? []).map((f) => ({ id: f.id, rotulo: f.nome })),
    pessoas: [...new Set((pessoas.data ?? []).map((p) => p.nome))],
  };
}
