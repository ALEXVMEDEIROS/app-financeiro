import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { destinoSeguro } from "@/components/campo";
import { Botao } from "@/components/ui/botao";
import { Valor } from "@/components/ui/valor";
import { formatarData, hojeEmSaoPaulo, situacao } from "@/lib/datas";
import { formatarMoeda } from "@/lib/dinheiro";
import { valorEfetivo } from "@/lib/parcelas";
import { createClient } from "@/lib/supabase/server";
import { desfazerPagamento } from "../quitar";
import { FormQuitar } from "./form-quitar";

export const metadata: Metadata = { title: "Lançamento · Sobra Vida", robots: { index: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ voltar?: string }> };

const NOME_TIPO = { receita: "Receita", despesa: "Despesa", transferencia: "Transferência" } as const;
type Tipo = keyof typeof NOME_TIPO;

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-sm text-muted">{rotulo}</dt>
      <dd className="min-w-0 text-right font-semibold">{children}</dd>
    </div>
  );
}

async function Detalhe({ params, searchParams }: Props) {
  await connection();
  const { id } = await params;
  const { voltar: textoVoltar } = await searchParams;
  const supabase = await createClient();
  const { data: l } = await supabase
    .from("lancamentos")
    .select(
      "id, tipo, valor, juros, multa, desconto, data_vencimento, data_pagamento, parcela_num, parcela_total, categoria_id, conta_id, conta_destino_id, pessoa_id, observacao",
    )
    .eq("id", id)
    .maybeSingle();

  // A proteção por usuário faz o lançamento de outra pessoa simplesmente não aparecer.
  if (!l) notFound();

  const hoje = hojeEmSaoPaulo();
  const tipo = l.tipo as Tipo;
  const voltar = destinoSeguro(textoVoltar, `/lancamentos?mes=${l.data_vencimento.slice(0, 7)}`);

  const idsContas = [l.conta_id, l.conta_destino_id].filter((x): x is string => Boolean(x));
  const [categoria, contas, pessoa] = await Promise.all([
    l.categoria_id
      ? supabase.from("categorias").select("nome").eq("id", l.categoria_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("contas_financeiras").select("id, instituicao, nome").in("id", idsContas),
    l.pessoa_id
      ? supabase.from("pessoas").select("nome").eq("id", l.pessoa_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const nomeConta = new Map(
    (contas.data ?? []).map((c) => [c.id, c.instituicao ? `${c.instituicao} · ${c.nome}` : c.nome]),
  );

  const valor = Number(l.valor);
  const efetivo = valorEfetivo(valor, Number(l.juros), Number(l.multa), Number(l.desconto));
  const sit = situacao(l.data_vencimento, l.data_pagamento, hoje);
  const textoPagar = tipo === "receita" ? "Marcar como recebido" : tipo === "despesa" ? "Marcar como pago" : "Marcar como feita";
  const desfazer = desfazerPagamento.bind(null, l.id, voltar);

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-1 rounded-xl border border-line bg-surface p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">{NOME_TIPO[tipo]}</p>
        <p className="font-display text-xl font-bold">
          {tipo === "transferencia" ? "Transferência" : categoria.data?.nome ?? "Sem categoria"}
          {l.parcela_num && <span className="font-normal text-muted"> · parcela {l.parcela_num}/{l.parcela_total}</span>}
        </p>
        <Valor valor={efetivo} tipo={tipo} className="font-display text-3xl" />
        <dl className="mt-2 divide-y divide-line">
          {tipo === "transferencia" ? (
            <>
              <Linha rotulo="Saiu de">{nomeConta.get(l.conta_id) ?? "—"}</Linha>
              <Linha rotulo="Entrou em">{(l.conta_destino_id && nomeConta.get(l.conta_destino_id)) ?? "—"}</Linha>
            </>
          ) : (
            <>
              <Linha rotulo={tipo === "receita" ? "Entrou na conta" : "Saiu da conta"}>
                {nomeConta.get(l.conta_id) ?? "—"}
              </Linha>
              {pessoa.data && (
                <Linha rotulo={tipo === "receita" ? "Recebido de" : "Pago a"}>{pessoa.data.nome}</Linha>
              )}
            </>
          )}
          <Linha rotulo="Vencimento">{formatarData(l.data_vencimento)}</Linha>
          {l.data_pagamento && <Linha rotulo="Pago em">{formatarData(l.data_pagamento)}</Linha>}
          {efetivo !== valor && (
            <>
              <Linha rotulo="Valor original">{formatarMoeda(valor)}</Linha>
              {Number(l.juros) > 0 && <Linha rotulo="Juros">+ {formatarMoeda(Number(l.juros))}</Linha>}
              {Number(l.multa) > 0 && <Linha rotulo="Multa">+ {formatarMoeda(Number(l.multa))}</Linha>}
              {Number(l.desconto) > 0 && <Linha rotulo="Desconto">− {formatarMoeda(Number(l.desconto))}</Linha>}
            </>
          )}
          {l.observacao && <Linha rotulo="Observação">{l.observacao}</Linha>}
          <Linha rotulo="Situação">
            <span className={sit === "atrasado" ? "text-neg" : sit === "em_aberto" ? "text-warn" : ""}>
              {sit === "pago" ? "Pago" : sit === "atrasado" ? "Atrasado" : "Em aberto"}
            </span>
          </Linha>
        </dl>
      </section>

      {l.data_pagamento ? (
        <section className="flex flex-col gap-3 rounded-xl border border-line p-5">
          <h2 className="font-display text-lg font-bold">Desfazer pagamento</h2>
          <p className="text-sm text-muted">
            Use se marcou por engano. O lançamento volta a ficar em aberto e juros, multa e desconto são zerados.
          </p>
          <form action={desfazer}>
            <Botao type="submit" variante="secundario">Desfazer pagamento</Botao>
          </form>
        </section>
      ) : (
        <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
          <h2 className="font-display text-lg font-bold">{textoPagar}</h2>
          <FormQuitar
            id={l.id}
            valor={valor}
            hoje={hoje}
            transferencia={tipo === "transferencia"}
            vencimento={l.data_vencimento}
            textoBotao={textoPagar}
            voltar={voltar}
          />
        </section>
      )}

      <Link href={voltar} className="inline-flex min-h-11 items-center font-semibold text-accent">
        ← Voltar para a lista
      </Link>
    </div>
  );
}

export default function PaginaLancamento(props: Props) {
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Lançamento</h1>
      <Suspense fallback={<p className="text-muted">Carregando…</p>}>
        <Detalhe {...props} />
      </Suspense>
    </div>
  );
}
