"use server";

import { redirect } from "next/navigation";
import { destinoSeguro } from "@/components/campo";
import { dataValida, hojeEmSaoPaulo, somarMeses } from "@/lib/datas";
import { lerValor, TEXTO_VALOR_MAXIMO, VALOR_MAXIMO } from "@/lib/dinheiro";
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

/** Lê e confere os campos comuns a criar e editar. */
function lerFormulario(formData: FormData) {
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
    pessoa: campo("pessoa").replace(/\s+/g, " ").trim(),
    observacao,
  };

  const transferencia = tipo === "transferencia";
  const erros: NonNullable<EstadoLancamento["erros"]> = {};
  if (valor === null || valor <= 0) erros.valor = "Informe um valor maior que zero, como 150,00.";
  else if (valor > VALOR_MAXIMO) erros.valor = TEXTO_VALOR_MAXIMO;
  if (!transferencia && !UUID.test(valores.categoria)) erros.categoria = "Escolha a categoria.";
  if (!UUID.test(valores.conta)) erros.conta = "Escolha a conta.";
  if (transferencia) {
    if (!UUID.test(valores.destino)) erros.destino = "Escolha a conta que recebe o dinheiro.";
    else if (valores.destino === valores.conta) erros.destino = "Escolha uma conta diferente da conta de saída.";
  }
  if (!dataValida(data)) erros.data = "Escolha uma data válida.";
  if (valores.pessoa.length > 120) erros.pessoa = "Use no máximo 120 caracteres.";
  if (observacao.length > 500) erros.observacao = "Use no máximo 500 caracteres.";
  return { tipo, valor, data, pago, observacao, depois, parcelas, valores, transferencia, erros };
}

/** Pessoa (R9): "Pago a" na despesa, "Recebido de" na receita. */
async function idDaPessoa(
  supabase: Cliente,
  nome: string,
  tipo: string,
): Promise<{ id: string | null } | { erro: string }> {
  if (tipo === "transferencia" || !nome) return { id: null };
  return pessoaDoLancamento(supabase, nome, tipo === "despesa" ? "fornecedor" : "cliente");
}

/** Campos do lançamento que vêm do formulário (iguais ao criar e ao editar). */
function camposDoFormulario(f: ReturnType<typeof lerFormulario>, pessoaId: string | null) {
  const { transferencia, valores } = f;
  return {
    categoria_id: transferencia ? null : valores.categoria,
    conta_id: valores.conta,
    conta_destino_id: transferencia ? valores.destino : null,
    centro_custo_id: transferencia ? null : opcional(valores.centro),
    forma_pagamento_id: transferencia ? null : opcional(valores.forma),
    pessoa_id: pessoaId,
    observacao: f.observacao || null,
  };
}

const mensagensDoBanco = (tipo: string) => ({
  "23514":
    tipo === "transferencia"
      ? "Confira os dados: a conta de entrada precisa ser diferente da de saída e o valor maior que zero."
      : `Confira os dados: a categoria precisa ser de ${tipo} e o valor maior que zero (com o desconto, o valor final não pode ficar negativo).`,
  "23503": "Uma das contas ou a categoria não está mais disponível. Atualize a página e escolha de novo.",
});

/**
 * Grava uma receita, despesa (R1, R2) ou transferência entre contas (R4).
 * "Salvar e lançar outro" volta ao formulário; "Salvar" vai para Contas.
 */
export async function criarLancamento(
  _anterior: EstadoLancamento,
  formData: FormData,
): Promise<EstadoLancamento> {
  const f = lerFormulario(formData);
  const { tipo, valor, data, pago, depois, parcelas, valores, transferencia, erros } = f;
  if (tipo !== "receita" && tipo !== "despesa" && tipo !== "transferencia") {
    return { mensagem: "Escolha se é despesa, receita ou transferência.", valores };
  }
  if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 48) {
    erros.parcelas = "Informe de 1 a 48 parcelas.";
  } else if (transferencia && parcelas > 1) {
    erros.parcelas = "Transferências não podem ser parceladas.";
  } else if (parcelas > 1 && valor !== null && Math.round(valor * 100) < parcelas) {
    erros.parcelas = "O valor é pequeno demais para tantas parcelas.";
  }
  if (Object.keys(erros).length > 0) return { erros, valores };

  const supabase = await createClient();
  const pessoa = await idDaPessoa(supabase, valores.pessoa, tipo);
  if ("erro" in pessoa) return { valores, mensagem: pessoa.erro };

  const base = { tipo, data_lancamento: hojeEmSaoPaulo(), ...camposDoFormulario(f, pessoa.id) };

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

  if (error) return { valores, mensagem: mensagemDeErro(error, mensagensDoBanco(tipo)) };

  // "n" muda a cada salvamento, para o formulário recomeçar limpo.
  const sufixo = parcelas > 1 ? `&parcelas=${parcelas}` : "";
  if (depois === "outro") redirect(`/lancamentos/novo?salvo=${tipo}&tipo=${tipo}&n=${Date.now()}${sufixo}`);
  redirect(`/contas?lancado=${tipo}${sufixo}`);
}

/**
 * Edita um lançamento (sessões 15 e 16). O tipo não muda. O pagamento é tratado
 * em "Marcar como pago" / "Desfazer"; mas, se o lançamento nasceu pago
 * (pagamento no mesmo dia do vencimento), mudar a data move as duas juntas.
 * Parcelas (R11): alcance "esta", "seguintes" ou "todas". Parcelas já pagas,
 * além da que está sendo editada, não mudam. Com a data alterada, as demais
 * seguem mês a mês a partir da nova data.
 */
export async function editarLancamento(
  _anterior: EstadoLancamento,
  formData: FormData,
): Promise<EstadoLancamento> {
  const id = String(formData.get("id") ?? "");
  const voltar = destinoSeguro(String(formData.get("voltar") ?? ""), "/lancamentos");
  const supabase = await createClient();
  const { data: atual } = await supabase
    .from("lancamentos")
    .select("id, tipo, data_vencimento, data_pagamento, grupo_parcelas_id, parcela_num, parcela_total")
    .eq("id", id)
    .maybeSingle();
  if (!atual) return { mensagem: "Não encontramos esse lançamento. Ele pode ter sido removido." };
  const alcance = String(formData.get("alcance") ?? "esta");

  // O tipo vem do banco, não do formulário.
  formData.set("tipo", atual.tipo);
  const f = lerFormulario(formData);
  if (Object.keys(f.erros).length > 0) return { erros: f.erros, valores: f.valores };

  const pessoa = await idDaPessoa(supabase, f.valores.pessoa, atual.tipo);
  if ("erro" in pessoa) return { valores: f.valores, mensagem: pessoa.erro };

  const campos = { ...camposDoFormulario(f, pessoa.id), valor: f.valor as number };
  const agora = new Date().toISOString();
  // Nasceu pago (pagamento = vencimento): a data do pagamento acompanha, mas nunca vai para o futuro.
  const pagamentoJunto =
    atual.data_pagamento !== null && atual.data_pagamento === atual.data_vencimento && f.data <= hojeEmSaoPaulo();
  let alteradas = 1;

  if (atual.grupo_parcelas_id && atual.parcela_num && (alcance === "seguintes" || alcance === "todas")) {
    const { data: grupo, error: erroGrupo } = await supabase
      .from("lancamentos")
      .select("id, parcela_num, parcela_total, data_vencimento, data_pagamento")
      .eq("grupo_parcelas_id", atual.grupo_parcelas_id);
    if (erroGrupo || !grupo) return { valores: f.valores, mensagem: mensagemDeErro(erroGrupo) };

    const mudouData = f.data !== atual.data_vencimento;
    const numAtual = atual.parcela_num;
    const linhas = grupo
      .filter((p) => (alcance === "todas" || (p.parcela_num ?? 0) >= numAtual))
      .filter((p) => p.id === atual.id || p.data_pagamento === null)
      .map((p) => {
        const vencimento =
          p.id === atual.id ? f.data : mudouData ? somarMeses(f.data, (p.parcela_num ?? 0) - numAtual) : p.data_vencimento;
        return {
          id: p.id,
          tipo: atual.tipo,
          ...campos,
          data_vencimento: vencimento,
          data_pagamento: p.id === atual.id && pagamentoJunto ? f.data : p.data_pagamento,
          parcela_num: p.parcela_num,
          parcela_total: p.parcela_total,
          grupo_parcelas_id: atual.grupo_parcelas_id,
          atualizado_em: agora,
        };
      });
    // Um único comando: ou todas as parcelas mudam, ou nenhuma.
    const { error } = await supabase.from("lancamentos").upsert(linhas, { onConflict: "id" });
    if (error) return { valores: f.valores, mensagem: mensagemDeErro(error, mensagensDoBanco(atual.tipo)) };
    alteradas = linhas.length;
  } else {
    const { error } = await supabase
      .from("lancamentos")
      .update({
        ...campos,
        data_vencimento: f.data,
        ...(pagamentoJunto ? { data_pagamento: f.data } : {}),
        atualizado_em: agora,
      })
      .eq("id", id);
    if (error) return { valores: f.valores, mensagem: mensagemDeErro(error, mensagensDoBanco(atual.tipo)) };
  }

  const url = new URL(voltar, "http://x");
  url.searchParams.set("aviso", "editado");
  if (alteradas > 1) url.searchParams.set("alteradas", String(alteradas));
  redirect(`${url.pathname}${url.search}`);
}

export type EstadoExcluirLancamento = { mensagem?: string };

/**
 * Exclui um lançamento (sessão 17). Numa parcela, o alcance diz quais saem:
 * "esta", "seguintes" (esta e as de número maior) ou "todas" (a compra inteira,
 * inclusive as já pagas: a tela avisa antes).
 */
export async function excluirLancamento(
  _anterior: EstadoExcluirLancamento,
  formData: FormData,
): Promise<EstadoExcluirLancamento> {
  const id = String(formData.get("id") ?? "");
  const alcance = String(formData.get("alcance") ?? "esta");
  const voltar = destinoSeguro(String(formData.get("voltar") ?? ""), "/lancamentos");
  const supabase = await createClient();
  const { data: atual } = await supabase
    .from("lancamentos")
    .select("id, grupo_parcelas_id, parcela_num")
    .eq("id", id)
    .maybeSingle();
  if (!atual) return { mensagem: "Não encontramos esse lançamento. Ele pode ter sido removido." };

  let consulta = supabase.from("lancamentos").delete({ count: "exact" });
  if (atual.grupo_parcelas_id && alcance === "todas") {
    consulta = consulta.eq("grupo_parcelas_id", atual.grupo_parcelas_id);
  } else if (atual.grupo_parcelas_id && atual.parcela_num && alcance === "seguintes") {
    consulta = consulta.eq("grupo_parcelas_id", atual.grupo_parcelas_id).gte("parcela_num", atual.parcela_num);
  } else {
    consulta = consulta.eq("id", id);
  }
  const { error, count } = await consulta;
  if (error) return { mensagem: mensagemDeErro(error) };

  const url = new URL(voltar, "http://x");
  url.searchParams.set("aviso", "excluido");
  if ((count ?? 1) > 1) url.searchParams.set("alteradas", String(count));
  redirect(`${url.pathname}${url.search}`);
}
