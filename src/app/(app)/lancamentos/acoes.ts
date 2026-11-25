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
    pessoa?: string;
  };
  /** Escolhas devolvidas em caso de erro, para o formulário não perdê-las. */
  valores?: {
    tipo: string;
    categoria: string;
    conta: string;
    destino: string;
    centro: string;
    forma: string;
    pessoa: string;
    observacao: string;
  };
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const opcional = (t: string) => (UUID.test(t) ? t : null);

type Cliente = Awaited<ReturnType<typeof createClient>>;

/**
 * Acha a pessoa pelo nome (sem diferenciar maiúsculas) ou cria na hora.
 * Quem era só cliente e aparece numa despesa (ou o contrário) passa a "ambos".
 */
async function pessoaDoLancamento(
  supabase: Cliente,
  nome: string,
  papel: "cliente" | "fornecedor",
): Promise<{ id: string } | { erro: string }> {
  const { data: existentes, error } = await supabase
    .from("pessoas")
    .select("id, nome, tipo, ativa")
    .ilike("nome", nome.replace(/[\\%_]/g, (c) => "\\" + c))
    .order("ativa", { ascending: false })
    .order("criado_em")
    .limit(1);
  if (error) return { erro: mensagemDeErro(error) };

  const achada = existentes?.[0];
  if (achada) {
    const mudancas: { tipo?: string; ativa?: boolean } = {};
    if (achada.tipo !== papel && achada.tipo !== "ambos") mudancas.tipo = "ambos";
    if (!achada.ativa) mudancas.ativa = true;
    if (Object.keys(mudancas).length > 0) {
      await supabase.from("pessoas").update(mudancas).eq("id", achada.id);
    }
    return { id: achada.id };
  }

  const { data: nova, error: erroNova } = await supabase
    .from("pessoas")
    .insert({ nome, tipo: papel })
    .select("id")
    .single();
  if (erroNova || !nova) return { erro: mensagemDeErro(erroNova) };
  return { id: nova.id };
}

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
    pessoa: campo("pessoa").replace(/s+/g, " ").trim(),
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
  if (valores.pessoa.length > 120) erros.pessoa = "Use no máximo 120 caracteres.";
  if (observacao.length > 500) erros.observacao = "Use no máximo 500 caracteres.";
  if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 48) {
    erros.parcelas = "Informe de 1 a 48 parcelas.";
  } else if (transferencia && parcelas > 1) {
    erros.parcelas = "Transferências não podem ser parceladas.";
  } else if (parcelas > 1 && valor !== null && Math.round(valor * 100) < parcelas) {
    erros.parcelas = "O valor é pequeno demais para tantas parcelas.";
  }
  if (Object.keys(erros).length > 0) return { erros, valores };

  const supabase = await createClient();

  // Pessoa (R9): "Pago a" na despesa, "Recebido de" na receita.
  let pessoaId: string | null = null;
  if (!transferencia && valores.pessoa) {
    const resultado = await pessoaDoLancamento(supabase, valores.pessoa, tipo === "despesa" ? "fornecedor" : "cliente");
    if ("erro" in resultado) return { valores, mensagem: resultado.erro };
    pessoaId = resultado.id;
  }

  const base = {
    tipo,
    categoria_id: transferencia ? null : valores.categoria,
    conta_id: valores.conta,
    conta_destino_id: transferencia ? valores.destino : null,
    data_lancamento: hojeEmSaoPaulo(),
    centro_custo_id: transferencia ? null : opcional(valores.centro),
    forma_pagamento_id: transferencia ? null : opcional(valores.forma),
    pessoa_id: pessoaId,
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
