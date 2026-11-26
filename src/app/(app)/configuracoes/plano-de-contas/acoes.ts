"use server";

import { revalidatePath } from "next/cache";
import { mensagemDeErro } from "@/lib/erros-banco";
import { createClient } from "@/lib/supabase/server";

// Plano de contas (R5): grupos (com natureza receita ou despesa) e categorias.
// Nada é apagado: desativar tira das listas do lançamento e mantém o histórico.

export type EstadoNome = { erro?: string; ok?: number };

const CAMINHO = "/configuracoes/plano-de-contas";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function lerNome(formData: FormData): { nome: string } | { erro: string } {
  const nome = String(formData.get("nome") ?? "").replace(/\s+/g, " ").trim();
  if (!nome) return { erro: "Digite um nome." };
  if (nome.length > 60) return { erro: "Use no máximo 60 caracteres." };
  return { nome };
}

const repetido = (oQue: "categoria" | "grupo") =>
  oQue === "categoria" ? "Já existe uma categoria com esse nome neste grupo." : "Já existe um grupo com esse nome.";

/** Cria uma categoria dentro de um grupo. */
export async function criarCategoria(_anterior: EstadoNome, formData: FormData): Promise<EstadoNome> {
  const lido = lerNome(formData);
  if ("erro" in lido) return lido;
  const grupoId = String(formData.get("grupo_id") ?? "");
  if (!UUID.test(grupoId)) return { erro: "Grupo inválido. Atualize a página." };

  const supabase = await createClient();
  const { error } = await supabase.from("categorias").insert({ grupo_id: grupoId, nome: lido.nome });
  if (error) return { erro: mensagemDeErro(error, { "23505": repetido("categoria") }) };
  revalidatePath(CAMINHO);
  return { ok: Date.now() };
}

/** Cria um grupo novo, no fim da lista da natureza escolhida. */
export async function criarGrupo(_anterior: EstadoNome, formData: FormData): Promise<EstadoNome> {
  const lido = lerNome(formData);
  if ("erro" in lido) return lido;
  const natureza = String(formData.get("natureza") ?? "");
  if (natureza !== "receita" && natureza !== "despesa") return { erro: "Natureza inválida. Atualize a página." };

  const supabase = await createClient();
  const { data: ultimo } = await supabase
    .from("grupos")
    .select("ordem")
    .eq("natureza", natureza)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase
    .from("grupos")
    .insert({ nome: lido.nome, natureza, ordem: (ultimo?.ordem ?? 0) + 1 });
  if (error) return { erro: mensagemDeErro(error, { "23505": repetido("grupo") }) };
  revalidatePath(CAMINHO);
  return { ok: Date.now() };
}

/** Renomeia um grupo ou uma categoria (o histórico passa a mostrar o nome novo). */
export async function renomear(_anterior: EstadoNome, formData: FormData): Promise<EstadoNome> {
  const lido = lerNome(formData);
  if ("erro" in lido) return lido;
  const id = String(formData.get("id") ?? "");
  const oQue = formData.get("tabela") === "grupos" ? "grupo" : "categoria";

  const supabase = await createClient();
  const { error } =
    oQue === "grupo"
      ? await supabase.from("grupos").update({ nome: lido.nome }).eq("id", id)
      : await supabase.from("categorias").update({ nome: lido.nome }).eq("id", id);
  if (error) return { erro: mensagemDeErro(error, { "23505": repetido(oQue) }) };
  revalidatePath(CAMINHO);
  return { ok: Date.now() };
}

/** Desativa ou reativa uma categoria. */
export async function alternarCategoria(id: string, ativa: boolean) {
  const supabase = await createClient();
  await supabase.from("categorias").update({ ativa }).eq("id", id);
  revalidatePath(CAMINHO);
}

/** Desativa ou reativa um grupo: as categorias dele saem (ou voltam) das listas junto. */
export async function alternarGrupo(id: string, ativo: boolean) {
  const supabase = await createClient();
  await supabase.from("grupos").update({ ativo }).eq("id", id);
  revalidatePath(CAMINHO);
}
