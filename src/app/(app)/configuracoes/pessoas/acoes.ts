"use server";

import { redirect } from "next/navigation";
import { mensagemDeErro } from "@/lib/erros-banco";
import { createClient } from "@/lib/supabase/server";
import { UFS } from "./tipos";

export type EstadoPessoa = {
  mensagem?: string;
  erros?: Partial<Record<CampoPessoa, string>>;
  /** O que foi digitado, para o formulário não perder nada quando volta com erro. */
  valores?: Partial<Record<CampoPessoa, string>>;
};

type CampoPessoa =
  | "nome"
  | "tipo"
  | "documento"
  | "contato"
  | "logradouro"
  | "numero"
  | "complemento"
  | "bairro"
  | "cep"
  | "cidade"
  | "uf"
  | "descricao";

/** Texto do formulário sem espaços repetidos nas pontas. */
const texto = (formData: FormData, campo: string) => String(formData.get(campo) ?? "").replace(/[ \t]+/g, " ").trim();

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
  const logradouro = texto(formData, "logradouro");
  const numero = texto(formData, "numero");
  const complemento = texto(formData, "complemento");
  const bairro = texto(formData, "bairro");
  const cepDigitado = texto(formData, "cep");
  const cep = cepDigitado.replace(/\D/g, "");
  const cidade = texto(formData, "cidade");
  const uf = texto(formData, "uf").toUpperCase();
  // Na descrição, as quebras de linha ficam; só as pontas são aparadas.
  const descricao = String(formData.get("descricao") ?? "").replace(/\r\n/g, "\n").trim();

  const valores: EstadoPessoa["valores"] = {
    nome, tipo, documento, contato, logradouro, numero, complemento, bairro,
    cep: cepDigitado, cidade, uf, descricao,
  };
  const erros: EstadoPessoa["erros"] = {};
  if (!nome) erros.nome = "Informe o nome, como \"Padaria São José\" ou \"Maria Souza\".";
  else if (nome.length > 120) erros.nome = "Use no máximo 120 caracteres.";
  if (!TIPOS.includes(tipo as TipoPessoa)) erros.tipo = "Escolha se é cliente, fornecedor ou os dois.";
  if (documento && !/^[0-9][0-9./-]{0,19}$/.test(documento))
    erros.documento = "Use só números e pontuação, como 123.456.789-00 ou 12.345.678/0001-90.";
  if (contato.length > 200) erros.contato = "Use no máximo 200 caracteres.";
  if (logradouro.length > 150) erros.logradouro = "Use no máximo 150 caracteres.";
  if (numero.length > 20) erros.numero = "Use no máximo 20 caracteres.";
  if (complemento.length > 80) erros.complemento = "Use no máximo 80 caracteres.";
  if (bairro.length > 80) erros.bairro = "Use no máximo 80 caracteres.";
  if (cepDigitado && (cep.length !== 8 || !/^[0-9.\- ]+$/.test(cepDigitado)))
    erros.cep = "O CEP tem 8 números, como 60150-160.";
  if (cidade.length > 80) erros.cidade = "Use no máximo 80 caracteres.";
  if (uf && !UFS.includes(uf)) erros.uf = "Escolha o estado na lista.";
  if (descricao.length > 1000)
    erros.descricao = `Use no máximo 1000 caracteres (hoje são ${descricao.length}).`;
  if (Object.keys(erros).length > 0) return { erros, valores };

  const supabase = await createClient();

  // O lançamento acha a pessoa pelo nome: dois cadastros com o mesmo nome confundiriam.
  let busca = supabase.from("pessoas").select("id").ilike("nome", escaparBusca(nome)).limit(1);
  if (id) busca = busca.neq("id", id);
  const { data: repetida } = await busca;
  if (repetida && repetida.length > 0) {
    return {
      erros: { nome: "Já existe uma pessoa com esse nome. Use um nome diferente, como \"Maria Souza (dentista)\"." },
      valores,
    };
  }

  const dados = {
    nome,
    tipo: tipo as TipoPessoa,
    documento: documento || null,
    contato: contato || null,
    logradouro: logradouro || null,
    numero: numero || null,
    complemento: complemento || null,
    bairro: bairro || null,
    cep: cep || null,
    cidade: cidade || null,
    uf: uf || null,
    descricao: descricao || null,
  };
  const { error } = id
    ? await supabase.from("pessoas").update(dados).eq("id", id)
    : await supabase.from("pessoas").insert(dados);
  if (error) return { mensagem: mensagemDeErro(error), valores };
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
