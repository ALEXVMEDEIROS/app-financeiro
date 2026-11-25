"use server";

import { redirect } from "next/navigation";
import { dataValida, hojeEmSaoPaulo } from "@/lib/datas";
import { lerValor } from "@/lib/dinheiro";
import { mensagemDeErro } from "@/lib/erros-banco";
import { createClient } from "@/lib/supabase/server";

export type EstadoLancamento = {
  mensagem?: string;
  erros?: { valor?: string; categoria?: string; conta?: string; data?: string; observacao?: string };
  /** Escolhas devolvidas em caso de erro, para o formulário não perdê-las. */
  valores?: { categoria: string; conta: string; centro: string; forma: string; observacao: string };
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const opcional = (v: FormDataEntryValue | null) => {
  const t = String(v ?? "");
  return UUID.test(t) ? t : null;
};

/** Grava uma receita ou despesa (R1, R2). Transferências e parcelas vêm depois. */
export async function criarLancamento(
  _anterior: EstadoLancamento,
  formData: FormData,
): Promise<EstadoLancamento> {
  const tipo = String(formData.get("tipo") ?? "");
  const valor = lerValor(String(formData.get("valor") ?? ""));
  const categoria = String(formData.get("categoria") ?? "");
  const conta = String(formData.get("conta") ?? "");
  const data = String(formData.get("data") ?? "");
  const pago = formData.get("pago") === "on";
  const observacao = String(formData.get("observacao") ?? "").trim();

  const valores = {
    categoria,
    conta,
    centro: String(formData.get("centro_custo") ?? ""),
    forma: String(formData.get("forma_pagamento") ?? ""),
    observacao,
  };

  if (tipo !== "receita" && tipo !== "despesa") {
    return { mensagem: "Escolha se é uma despesa ou uma receita.", valores };
  }

  const erros: EstadoLancamento["erros"] = {};
  if (valor === null || valor <= 0) erros.valor = "Informe um valor maior que zero, como 150,00.";
  if (!UUID.test(categoria)) erros.categoria = "Escolha a categoria.";
  if (!UUID.test(conta)) erros.conta = "Escolha a conta.";
  if (!dataValida(data)) erros.data = "Escolha uma data válida.";
  if (observacao.length > 500) erros.observacao = "Use no máximo 500 caracteres.";
  if (Object.keys(erros).length > 0) return { erros, valores };

  const supabase = await createClient();
  const { error } = await supabase.from("lancamentos").insert({
    tipo,
    valor: valor as number,
    categoria_id: categoria,
    conta_id: conta,
    data_lancamento: hojeEmSaoPaulo(),
    data_vencimento: data,
    data_pagamento: pago ? data : null,
    centro_custo_id: opcional(formData.get("centro_custo")),
    forma_pagamento_id: opcional(formData.get("forma_pagamento")),
    observacao: observacao || null,
  });

  if (error) {
    return {
      valores,
      mensagem: mensagemDeErro(error, {
        "23514":
          tipo === "despesa"
            ? "Confira os dados: a categoria precisa ser de despesa e o valor maior que zero."
            : "Confira os dados: a categoria precisa ser de receita e o valor maior que zero.",
        "23503": "A conta ou a categoria escolhida não está mais disponível. Atualize a página e escolha de novo.",
      }),
    };
  }

  redirect(`/contas?lancado=${tipo}`);
}
