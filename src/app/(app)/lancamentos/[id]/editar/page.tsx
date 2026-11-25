import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { destinoSeguro } from "@/components/campo";
import { hojeEmSaoPaulo } from "@/lib/datas";
import { createClient } from "@/lib/supabase/server";
import { FormLancamento, type Tipo } from "../../novo/form-lancamento";
import { opcoesDoFormulario } from "../../opcoes";

export const metadata: Metadata = { title: "Editar lançamento · Sobra Vida", robots: { index: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ voltar?: string }> };

async function Edicao({ params, searchParams }: Props) {
  await connection();
  const { id } = await params;
  const { voltar: textoVoltar } = await searchParams;
  const supabase = await createClient();
  const { data: l } = await supabase
    .from("lancamentos")
    .select(
      "id, tipo, valor, data_vencimento, data_pagamento, categoria_id, conta_id, conta_destino_id, centro_custo_id, forma_pagamento_id, pessoa_id, observacao, parcela_num, parcela_total",
    )
    .eq("id", id)
    .maybeSingle();

  // A proteção por usuário faz o lançamento de outra pessoa simplesmente não aparecer.
  if (!l) notFound();

  const voltar = destinoSeguro(textoVoltar, `/lancamentos?mes=${l.data_vencimento.slice(0, 7)}`);
  const [opcoes, pessoa] = await Promise.all([
    opcoesDoFormulario({
      contas: [l.conta_id, l.conta_destino_id ?? ""],
      categoria: l.categoria_id ?? undefined,
    }),
    l.pessoa_id
      ? supabase.from("pessoas").select("nome").eq("id", l.pessoa_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <FormLancamento
      hoje={hojeEmSaoPaulo()}
      tipoInicial={l.tipo as Tipo}
      {...opcoes}
      sugestoes={{}}
      edicao={{
        id: l.id,
        voltar,
        cancelar: `/lancamentos/${l.id}?voltar=${encodeURIComponent(voltar)}`,
        valor: Number(l.valor),
        data: l.data_vencimento,
        pago: Boolean(l.data_pagamento),
        categoria: l.categoria_id ?? undefined,
        conta: l.conta_id,
        destino: l.conta_destino_id ?? undefined,
        centro: l.centro_custo_id ?? undefined,
        forma: l.forma_pagamento_id ?? undefined,
        pessoa: pessoa.data?.nome,
        observacao: l.observacao ?? undefined,
        parcela: l.parcela_num ? `${l.parcela_num}/${l.parcela_total}` : undefined,
      }}
    />
  );
}

export default function PaginaEditarLancamento(props: Props) {
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Editar lançamento</h1>
      <Suspense fallback={<p className="text-muted">Carregando…</p>}>
        <Edicao {...props} />
      </Suspense>
    </div>
  );
}
