"use server";

import { redirect } from "next/navigation";
import { mensagemDeErro } from "@/lib/erros-banco";
import { createClient } from "@/lib/supabase/server";

export type EstadoPessoa = {
  mensagem?: string;
  erros?: { nome?: string; tipo?: string; documento?: string; contato?: string };
};

const TIPOS = ["cliente", "fornecedor", "ambos"] as const;
type TipoPessoa = (typeof TIPOS)[number];

const escaparBusca = (t: string) => t.replace(/[\\%_]/g, (c) => "\\" + c);

/** Cria (sem id) ou altera (com id) uma pessoa (R9). */
export async function salvarPessoa(_anterior: EstadoPessoa, formData: FormData): Promise<EstadoPessoa> {
  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").replace(/\s+/g, " ").trim();
  const tipo = String(formData.get("tipo") ?? "");
  const documento = String(formData.get("documento") ?? "").replace(/\s/g, "");
  const contato = String(formData.get("contato") ?? "").trim();

  const erros: EstadoPessoa["erros"] = {};
  if (!nome) erros.nome = "Informe o nome, como \"Padaria São José\" ou \"Maria Souza\".";
  else if (nome.length > 120) erros.nome = "Use no máximo 120 caracteres.";
  if (!TIPOS.includes(tipo as TipoPessoa)) erros.tipo = "Escolha se é cliente, fornecedor ou os dois.";
  if (documento && !/^[0-9][0-9./-]{0,19}$/.test(documento))
    erros.documento = "Use só números e pontuação, como 123.456.789-00 ou 12.345.678/0001-90.";
  if (contato.length > 200) erros.contato = "Use no máximo 200 caracteres.";
  if (Object.keys(erros).length > 0) return { erros };

  const supabase = await createClient();

  // O lançamento acha a pessoa pelo nome: dois cadastros com o mesmo nome confundiriam.
  let busca = supabase.from("pessoas").select("id").ilike("nome", escaparBusca(nome)).limit(1);
  if (id) busca = busca.neq("id", id);
  const { data: repetida } = await busca;
  if (repetida && repetida.length > 0) {
    return {
      erros: { nome: "Já existe uma pessoa com esse nome. Use um nome diferente, como \"Maria Souza (dentista)\"." },
    };
  }

  const dados = { nome, tipo: tipo as TipoPessoa, documento: documento || null, contato: contato || null };
  const { error } = id
    ? await supabase.from("pessoas").update(dados).eq("id", id)
    : await supabase.from("pessoas").insert(dados);
  if (error) return { mensagem: mensagemDeErro(error) };
  // Ao editar, volta para a ficha da pessoa; ao cadastrar, para a lista.
  redirect(id ? `/configuracoes/pessoas/${id}?aviso=salvo` : "/configuracoes/pessoas");
}

/** Desativa ou reativa: desativada some das sugestões, mas continua nos lançamentos antigos. */
export async function alternarPessoa(id: string, ativa: boolean) {
  const supabase = await createClient();
  await supabase.from("pessoas").update({ ativa }).eq("id", id);
  redirect(`/configuracoes/pessoas/${id}?aviso=${ativa ? "reativada" : "desativada"}`);
}

export type EstadoExcluirPessoa = { mensagem?: string };

/** Apaga uma pessoa sem lançamentos. Com lançamentos, o banco recusa. */
export async function excluirPessoa(
  _anterior: EstadoExcluirPessoa,
  formData: FormData,
): Promise<EstadoExcluirPessoa> {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.from("pessoas").delete().eq("id", id);
  if (error) {
    return {
      mensagem: mensagemDeErro(error, {
        "23503": "Esta pessoa já aparece em lançamentos e não pode ser excluída. Desative-a para que ela saia das sugestões.",
      }),
    };
  }
  redirect("/configuracoes/pessoas");
}
