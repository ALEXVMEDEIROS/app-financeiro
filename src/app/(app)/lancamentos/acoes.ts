"use server";

import { redirect } from "next/navigation";
import { dataValida, hojeEmSaoPaulo } from "@/lib/datas";
import { lerValor } from "@/lib/dinheiro";
import { mensagemDeErro } from "@/lib/erros-banco";
import { dividirParcelas } from "@/lib/parcelas";
import { createClient } from "@/lib/supabase/server";

export type EstadoLancamento = {
  mensagem?: string;
  erros?: {
    valor?: string;
    categoria?: string;
    conta?: string;
    destino?: string;
    data?: string;
    observacao?: string;
    parcelas?: string;
  };
  /** Escolhas devolvidas em caso de erro, para o formulário não perdê-las. */
  valores?: {
    tipo: string;
    categoria: string;
    conta: string;
    destino: string;
    centro: string;
    forma: string;
    observacao: string;
  };
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const opcional = (t: string) => (UUID.test(t) ? t : null);

/**
 * Grava uma receita, despesa (R1, R2) ou transferência entre contas (R4).
 * "Salvar e lançar outro" volta ao formulário; "Salvar" vai para Contas.
 */
export async function criarLancamento(
  _anterior: EstadoLancamento,
  formData: FormData,
): Promise<EstadoLancamento> {
  const campo = (nome: string) => String(formData.get(nome) ?? "");
  const tipo = campo("tipo");
  const valor = lerValor(campo("valor"));
  const data = campo("data");
  const pago = formData.get("pago") === "on";
  const observacao = campo("observacao").trim();
  const depois = campo("depois");
  const textoParcelas = campo("parcelas").trim();
  const parcelas = textoParcelas === "" ? 1 : Number(textoParcelas);

  const valores = {
    tipo,
    categoria: campo("categoria"),
    conta: campo("conta"),
    destino: campo("destino"),
    centro: campo("centro_custo"),
    forma: campo("forma_pagamento"),
    observacao,
  };

  if (tipo !== "receita" && tipo !== "despesa" && tipo !== "transferencia") {
    return { mensagem: "Escolha se é despesa, receita ou transferência.", valores };
  }
  const transferencia = tipo === "transferencia";

  const erros: EstadoLancamento["erros"] = {};
  if (valor === null || valor <= 0) erros.valor = "Informe um valor maior que zero, como 150,00.";
  if (!transferencia && !UUID.test(valores.categoria)) erros.categoria = "Escolha a categoria.";
  if (!UUID.test(valores.conta)) erros.conta = "Escolha a conta.";
  if (transferencia) {
    if (!UUID.test(valores.destino)) erros.destino = "Escolha a conta que recebe o dinheiro.";
    else if (valores.destino === valores.conta) erros.destino = "Escolha uma conta diferente da conta de saída.";
  }
  if (!dataValida(data)) erros.data = "Escolha uma data válida.";
  if (observacao.length > 500) erros.observacao = "Use no máximo 500 caracteres.";
  if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 48) {
    erros.parcelas = "Informe de 1 a 48 parcelas.";
  } else if (transferencia && parcelas > 1) {
    erros.parcelas = "Transferências não podem ser parceladas.";
  } else if (parcelas > 1 && valor !== null && Math.round(valor * 100) < parcelas) {
    erros.parcelas = "O valor é pequeno demais para tantas parcelas.";
  }
  if (Object.keys(erros).length > 0) return { erros, valores };

  const base = {
    tipo,
    categoria_id: transferencia ? null : valores.categoria,
    conta_id: valores.conta,
    conta_destino_id: transferencia ? valores.destino : null,
    data_lancamento: hojeEmSaoPaulo(),
    centro_custo_id: transferencia ? null : opcional(valores.centro),
    forma_pagamento_id: transferencia ? null : opcional(valores.forma),
    observacao: observacao || null,
  };

  // R11: valor total dividido em centavos, última parcela com a diferença,
  // vencimentos mensais; só a primeira pode nascer paga.
  const grupo = crypto.randomUUID();
  const linhas =
    parcelas > 1
      ? dividirParcelas(valor as number, parcelas, data).map((p) => ({
          ...base,
          valor: p.valor,
          data_vencimento: p.vencimento,
          data_pagamento: pago && p.numero === 1 ? p.vencimento : null,
          parcela_num: p.numero,
          parcela_total: p.total,
          grupo_parcelas_id: grupo,
        }))
      : [{ ...base, valor: valor as number, data_vencimento: data, data_pagamento: pago ? data : null }];

  const supabase = await createClient();
  const { error } = await supabase.from("lancamentos").insert(linhas);

  if (error) {
    return {
      valores,
      mensagem: mensagemDeErro(error, {
        "23514": transferencia
          ? "Confira os dados: a conta de entrada precisa ser diferente da de saída e o valor maior que zero."
          : `Confira os dados: a categoria precisa ser de ${tipo} e o valor maior que zero.`,
        "23503": "Uma das contas ou a categoria não está mais disponível. Atualize a página e escolha de novo.",
      }),
    };
  }

  // "n" muda a cada salvamento, para o formulário recomeçar limpo.
  const sufixo = parcelas > 1 ? `&parcelas=${parcelas}` : "";
  if (depois === "outro") redirect(`/lancamentos/novo?salvo=${tipo}&tipo=${tipo}&n=${Date.now()}${sufixo}`);
  redirect(`/contas?lancado=${tipo}${sufixo}`);
}
