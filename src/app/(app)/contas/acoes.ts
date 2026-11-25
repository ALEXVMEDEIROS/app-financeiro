"use server";

import { redirect } from "next/navigation";
import { dataValida } from "@/lib/datas";
import { lerValor } from "@/lib/dinheiro";
import { mensagemDeErro } from "@/lib/erros-banco";
import { createClient } from "@/lib/supabase/server";

export type EstadoConta = {
  mensagem?: string;
  erros?: {
    instituicao?: string;
    codigo_banco?: string;
    agencia?: string;
    numero_conta?: string;
    nome?: string;
    tipo?: string;
    saldo?: string;
    data?: string;
  };
};

const TIPOS = ["banco", "corretora", "carteira", "caixa"] as const;
type TipoConta = (typeof TIPOS)[number];

/** Cria (sem id) ou altera (com id) uma conta. */
export async function salvarConta(_anterior: EstadoConta, formData: FormData): Promise<EstadoConta> {
  const id = String(formData.get("id") ?? "");
  const instituicao = String(formData.get("instituicao") ?? "").trim().replace(/\s+/g, " ");
  const codigoBanco = String(formData.get("codigo_banco") ?? "").replace(/\s/g, "");
  const agencia = String(formData.get("agencia") ?? "").replace(/\s/g, "");
  const numeroConta = String(formData.get("numero_conta") ?? "").replace(/\s/g, "");
  const nome = String(formData.get("nome") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "");
  const textoSaldo = String(formData.get("saldo") ?? "").trim();
  const data = String(formData.get("data") ?? "");

  const erros: EstadoConta["erros"] = {};
  if (instituicao.length > 60) erros.instituicao = "Use no máximo 60 caracteres.";
  if (codigoBanco && !/^[0-9]{3}$/.test(codigoBanco))
    erros.codigo_banco = "O código do banco tem 3 números, como 033 (Santander) ou 341 (Itaú).";
  if (agencia && !/^[0-9][0-9xX.-]{0,9}$/.test(agencia))
    erros.agencia = "Use só números, com dígito se houver: 1234 ou 1234-5.";
  if (numeroConta && !/^[0-9][0-9xX.-]{0,19}$/.test(numeroConta))
    erros.numero_conta = "Use só números, com dígito: 012345-6.";
  if (!nome) erros.nome = "Dê um nome à conta, como \"Itaú\" ou \"Carteira\".";
  else if (nome.length > 80) erros.nome = "Use no máximo 80 caracteres.";
  if (!TIPOS.includes(tipo as TipoConta)) erros.tipo = "Escolha o tipo da conta.";
  const saldo = textoSaldo === "" ? 0 : lerValor(textoSaldo);
  if (saldo === null) erros.saldo = "Informe um valor como 1.234,56 (use - na frente se estiver negativo).";
  if (!dataValida(data)) erros.data = "Escolha uma data válida.";
  if (Object.keys(erros).length > 0) return { erros };

  const supabase = await createClient();
  const dados = {
    instituicao: instituicao || null,
    codigo_banco: codigoBanco || null,
    agencia: agencia || null,
    numero_conta: numeroConta || null,
    nome,
    tipo: tipo as TipoConta,
    saldo_inicial: saldo as number,
    data_saldo_inicial: data,
  };
  const { error } = id
    ? await supabase.from("contas_financeiras").update(dados).eq("id", id)
    : await supabase.from("contas_financeiras").insert(dados);

  if (error) {
    if (error.code === "23505") {
      return {
        erros: {
          nome: instituicao
            ? `Você já tem uma conta com esse nome em ${instituicao}.`
            : "Você já tem uma conta com esse nome sem instituição.",
        },
      };
    }
    return { mensagem: mensagemDeErro(error) };
  }
  redirect("/contas");
}

/** Desativa ou reativa uma conta (contas com lançamentos não são apagadas). */
export async function alternarAtiva(id: string, ativa: boolean) {
  const supabase = await createClient();
  await supabase.from("contas_financeiras").update({ ativa }).eq("id", id);
  redirect("/contas");
}

export type EstadoExcluir = { mensagem?: string };

/** Apaga uma conta sem lançamentos. Com lançamentos, o banco recusa. */
export async function excluirConta(_anterior: EstadoExcluir, formData: FormData): Promise<EstadoExcluir> {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.from("contas_financeiras").delete().eq("id", id);
  if (error) {
    return {
      mensagem: mensagemDeErro(error, {
        "23503": "Esta conta já tem lançamentos e não pode ser excluída. Desative-a para que ela saia das listas.",
      }),
    };
  }
  redirect("/contas");
}
