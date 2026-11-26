import Link from "next/link";
import { Valor } from "@/components/ui/valor";
import { formatarData } from "@/lib/datas";
import { createClient } from "@/lib/supabase/server";

// De onde vieram os juros e multas do mês (pedido do usuário em 26/11/2026):
// cada despesa paga com atraso, com o vencimento, a data do pagamento e quanto
// custou o atraso. Toque abre o lançamento.

const LIMITE = 5;

export async function OrigemDosJuros({ inicio, fim }: { inicio: string; fim: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lancamentos")
    .select("id, juros, multa, data_vencimento, data_pagamento, categoria_id, pessoa_id, parcela_num, parcela_total")
    .eq("tipo", "despesa")
    .gte("data_pagamento", inicio)
    .lte("data_pagamento", fim)
    .or("juros.gt.0,multa.gt.0")
    .order("data_pagamento", { ascending: false });

  const linhas = data ?? [];
  if (linhas.length === 0) return null;

  const idsCat = [...new Set(linhas.map((l) => l.categoria_id).filter((x): x is string => Boolean(x)))];
  const idsPes = [...new Set(linhas.map((l) => l.pessoa_id).filter((x): x is string => Boolean(x)))];
  const [cats, pess] = await Promise.all([
    idsCat.length ? supabase.from("categorias").select("id, nome").in("id", idsCat) : { data: [] },
    idsPes.length ? supabase.from("pessoas").select("id, nome").in("id", idsPes) : { data: [] },
  ]);
  const nome = (lista: { id: string; nome: string }[] | null, id: string | null) =>
    (id && lista?.find((x) => x.id === id)?.nome) || "";

  const itens = linhas
    .map((l) => ({
      id: l.id,
      categoria: nome(cats.data, l.categoria_id) || "Sem categoria",
      pessoa: nome(pess.data, l.pessoa_id),
      parcela: l.parcela_num ? `${l.parcela_num}/${l.parcela_total}` : null,
      juros: Number(l.juros),
      multa: Number(l.multa),
      vencimento: l.data_vencimento,
      pagamento: l.data_pagamento as string,
    }))
    .sort((a, b) => b.juros + b.multa - (a.juros + a.multa));
  const visiveis = itens.slice(0, LIMITE);

  return (
    <div className="flex flex-col gap-1 border-t border-line pt-2">
      <p className="text-xs font-semibold text-muted">De onde vieram</p>
      <ul className="flex flex-col divide-y divide-line">
        {visiveis.map((i) => (
          <li key={i.id}>
            <Link
              href={`/lancamentos/${i.id}?voltar=${encodeURIComponent("/painel")}`}
              className="flex items-start justify-between gap-3 py-2 hover:bg-bg"
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold">
                  {i.categoria}
                  {i.parcela && <span className="font-normal text-muted"> · {i.parcela}</span>}
                  {i.pessoa && <span className="font-normal text-muted"> · {i.pessoa}</span>}
                </span>
                <span className="block text-xs text-muted">
                  Venceu em {formatarData(i.vencimento)}, pago em {formatarData(i.pagamento)}
                </span>
                <span className="block text-xs text-muted">
                  {[i.juros > 0 && `juros R$ ${i.juros.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                    i.multa > 0 && `multa R$ ${i.multa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`]
                    .filter(Boolean)
                    .join(" + ")}
                </span>
              </span>
              <Valor valor={i.juros + i.multa} tipo="despesa" className="shrink-0 text-sm" />
            </Link>
          </li>
        ))}
      </ul>
      {itens.length > LIMITE && (
        <p className="text-xs text-muted">e mais {itens.length - LIMITE} lançamentos com juros ou multa neste mês.</p>
      )}
    </div>
  );
}
