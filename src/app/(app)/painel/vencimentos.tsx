import Link from "next/link";
import { Ajuda } from "@/components/ui/ajuda";
import { Valor } from "@/components/ui/valor";
import { diaDaSemana, formatarData } from "@/lib/datas";
import { createClient } from "@/lib/supabase/server";

// A pagar e a receber (R2): o que está em aberto, atrasado ou vencendo nos
// próximos 7 dias. Transferências agendadas também aparecem, sem cor.

type Item = {
  id: string;
  tipo: "receita" | "despesa" | "transferencia";
  valor: number;
  vencimento: string;
  titulo: string;
  detalhe: string;
  parcela: string | null;
};

const LIMITE_POR_GRUPO = 6;

function somarDias(iso: string, dias: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

const soma = (itens: Item[], tipo: Item["tipo"]) =>
  itens.filter((i) => i.tipo === tipo).reduce((s, i) => s + Math.round(i.valor * 100), 0) / 100;

function Grupo({ titulo, itens, hoje, destaque }: { titulo: string; itens: Item[]; hoje: string; destaque?: boolean }) {
  if (itens.length === 0) return null;
  const visiveis = itens.slice(0, LIMITE_POR_GRUPO);
  return (
    <div className="flex flex-col gap-1">
      <h3 className={`text-sm font-semibold ${destaque ? "text-neg" : "text-muted"}`}>
        {titulo} ({itens.length})
      </h3>
      <ul className="divide-y divide-line rounded-lg border border-line">
        {visiveis.map((i) => (
          <li key={i.id}>
            <Link
              href={`/lancamentos/${i.id}?voltar=${encodeURIComponent("/painel")}`}
              className="flex items-start justify-between gap-3 px-3 py-2 hover:bg-bg"
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold">
                  {i.titulo}
                  {i.parcela && <span className="font-normal text-muted"> · {i.parcela}</span>}
                </span>
                <span className="block truncate text-xs text-muted">
                  {i.vencimento === hoje ? "hoje" : `${diaDaSemana(i.vencimento)}, ${formatarData(i.vencimento).slice(0, 5)}`}
                  {i.detalhe && ` · ${i.detalhe}`}
                </span>
              </span>
              <Valor valor={i.valor} tipo={i.tipo} className="shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
      {itens.length > visiveis.length && (
        <Link href="/lancamentos?aberto=1" className="text-xs font-semibold text-accent">
          e mais {itens.length - visiveis.length}…
        </Link>
      )}
    </div>
  );
}

export async function Vencimentos({ hoje }: { hoje: string }) {
  const supabase = await createClient();
  const ate = somarDias(hoje, 7);
  const { data, error } = await supabase
    .from("lancamentos")
    .select("id, tipo, valor, data_vencimento, categoria_id, pessoa_id, conta_id, conta_destino_id, parcela_num, parcela_total")
    .is("data_pagamento", null)
    .lte("data_vencimento", ate)
    .order("data_vencimento")
    .limit(200);

  if (error) {
    return (
      <p className="rounded-lg bg-neg/10 px-3 py-2 text-sm text-neg" role="alert">
        Não foi possível carregar os vencimentos agora.
      </p>
    );
  }

  const linhas = data ?? [];
  const ids = (campo: "categoria_id" | "pessoa_id") => [...new Set(linhas.map((l) => l[campo]).filter((x): x is string => Boolean(x)))];
  const idsContas = [...new Set(linhas.flatMap((l) => [l.conta_id, l.conta_destino_id]).filter((x): x is string => Boolean(x)))];
  const [categorias, pessoas, contas] = await Promise.all([
    ids("categoria_id").length ? supabase.from("categorias").select("id, nome").in("id", ids("categoria_id")) : { data: [] },
    ids("pessoa_id").length ? supabase.from("pessoas").select("id, nome").in("id", ids("pessoa_id")) : { data: [] },
    idsContas.length ? supabase.from("contas_financeiras").select("id, nome").in("id", idsContas) : { data: [] },
  ]);
  const nome = (lista: { id: string; nome: string }[] | null, id: string | null) =>
    (id && lista?.find((x) => x.id === id)?.nome) || "";

  const itens: Item[] = linhas.map((l) => {
    const tipo = l.tipo as Item["tipo"];
    return {
      id: l.id,
      tipo,
      valor: Number(l.valor),
      vencimento: l.data_vencimento,
      titulo: tipo === "transferencia" ? "Transferência" : nome(categorias.data, l.categoria_id) || "Sem categoria",
      detalhe:
        tipo === "transferencia"
          ? `${nome(contas.data, l.conta_id)} → ${nome(contas.data, l.conta_destino_id)}`
          : nome(pessoas.data, l.pessoa_id) || nome(contas.data, l.conta_id),
      parcela: l.parcela_num ? `${l.parcela_num}/${l.parcela_total}` : null,
    };
  });

  const atrasados = itens.filter((i) => i.vencimento < hoje);
  const deHoje = itens.filter((i) => i.vencimento === hoje);
  const proximos = itens.filter((i) => i.vencimento > hoje);
  const aPagar = soma(itens, "despesa");
  const aReceber = soma(itens, "receita");

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4" aria-label="A pagar e a receber">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          A pagar e a receber
          <Ajuda titulo="A pagar e a receber">
            O que ainda não foi pago ou recebido: atrasados, o que vence hoje e nos próximos 7 dias.
            Toque num item para marcar como pago.
          </Ajuda>
        </h2>
        <p className="flex gap-3 text-sm">
          <span>
            A pagar <Valor valor={aPagar} tipo="despesa" className="text-sm" />
          </span>
          <span>
            A receber <Valor valor={aReceber} tipo="receita" className="text-sm" />
          </span>
        </p>
      </div>
      {itens.length === 0 ? (
        <p className="text-sm text-muted">Nada atrasado nem vencendo nos próximos 7 dias.</p>
      ) : (
        <>
          <Grupo titulo="Atrasados" itens={atrasados} hoje={hoje} destaque />
          <Grupo titulo="Vencem hoje" itens={deHoje} hoje={hoje} />
          <Grupo titulo="Próximos 7 dias" itens={proximos} hoje={hoje} />
        </>
      )}
    </section>
  );
}
