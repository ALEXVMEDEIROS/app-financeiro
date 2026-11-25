"use server";

import { redirect } from "next/navigation";
import { destinoSeguro } from "@/components/campo";
import { dataValida, hojeEmSaoPaulo } from "@/lib/datas";
import { lerValor } from "@/lib/dinheiro";
import { mensagemDeErro } from "@/lib/erros-banco";
import { valorEfetivo } from "@/lib/parcelas";
import { createClient } from "@/lib/supabase/server";

export type EstadoQuitar = {
  mensagem?: string;
  erros?: { data?: string; juros?: string; multa?: string; desconto?: string };
};

/** Volta para a lista de onde o usuário veio, com o aviso do que aconteceu. */
function voltarCom(voltar: string, aviso: "quitado" | "desfeito"): never {
  const url = new URL(destinoSeguro(voltar, "/lancamentos"), "http://x");
  url.searchParams.set("aviso", aviso);
  redirect(`${url.pathname}${url.search}`);
}

/** Lê um valor opcional: vazio vale zero; negativo ou inválido é erro. */
function valorOpcional(texto: string): number | null {
  if (texto.trim() === "") return 0;
  const v = lerValor(texto);
  return v === null || v < 0 ? null : v;
}

/**
 * Marca como pago (R2), com juros, multa e desconto (R12).
 * Transferências não têm juros, multa nem desconto (regra do banco).
 */
export async function quitarLancamento(_anterior: EstadoQuitar, formData: FormData): Promise<EstadoQuitar> {
  const id = String(formData.get("id") ?? "");
  const voltar = String(formData.get("voltar") ?? "");
  const data = String(formData.get("data_pagamento") ?? "");
  const juros = valorOpcional(String(formData.get("juros") ?? ""));
  const multa = valorOpcional(String(formData.get("multa") ?? ""));
  const desconto = valorOpcional(String(formData.get("desconto") ?? ""));
  const hoje = hojeEmSaoPaulo();

  const supabase = await createClient();
  const { data: lanc } = await supabase
    .from("lancamentos")
    .select("id, tipo, valor, data_pagamento")
    .eq("id", id)
    .maybeSingle();
  if (!lanc) return { mensagem: "Não encontramos esse lançamento. Ele pode ter sido removido." };
  if (lanc.data_pagamento) return { mensagem: "Este lançamento já está pago. Atualize a página." };
  const transferencia = lanc.tipo === "transferencia";

  const erros: EstadoQuitar["erros"] = {};
  if (!dataValida(data)) erros.data = "Escolha uma data válida.";
  else if (data > hoje) erros.data = "A data do pagamento não pode ser depois de hoje.";
  if (!transferencia) {
    const msg = "Informe um valor como 12,50, ou deixe em branco.";
    if (juros === null) erros.juros = msg;
    if (multa === null) erros.multa = msg;
    if (desconto === null) erros.desconto = msg;
    if (juros !== null && multa !== null && desconto !== null && valorEfetivo(Number(lanc.valor), juros, multa, desconto) < 0) {
      erros.desconto = "O desconto não pode ser maior que o valor com juros e multa.";
    }
  }
  if (Object.keys(erros).length > 0) return { erros };

  const { error } = await supabase
    .from("lancamentos")
    .update({
      data_pagamento: data,
      juros: transferencia ? 0 : (juros as number),
      multa: transferencia ? 0 : (multa as number),
      desconto: transferencia ? 0 : (desconto as number),
    })
    .eq("id", id)
    .is("data_pagamento", null);
  if (error) return { mensagem: mensagemDeErro(error) };

  voltarCom(voltar, "quitado");
}

/** Desfaz o pagamento: volta a "em aberto" e zera juros, multa e desconto. */
export async function desfazerPagamento(id: string, voltar: string) {
  const supabase = await createClient();
  await supabase
    .from("lancamentos")
    .update({ data_pagamento: null, juros: 0, multa: 0, desconto: 0 })
    .eq("id", id);
  voltarCom(voltar, "desfeito");
}
