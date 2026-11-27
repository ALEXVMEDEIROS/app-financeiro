import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Ajuda } from "@/components/ui/ajuda";
import { Valor } from "@/components/ui/valor";
import { formatarData, hojeEmSaoPaulo } from "@/lib/datas";
import { formatarNumero } from "@/lib/dinheiro";
import { diasDeAtraso } from "@/lib/encargos";
import { createClient } from "@/lib/supabase/server";
import { AbasRelatorios } from "../abas";

export const metadata: Metadata = { title: "Juros e multas · Sobra Vida", robots: { index: false } };

// Juros e multas do ano (R12): quanto os atrasos custaram, de onde vieram e
// quanto foi economizado com descontos. Tudo pela data do pagamento.

type Parametros = Promise<{ ano?: string }>;

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const c = (v: number | string | null | undefined) => Math.round(Number(v ?? 0) * 100);
const r = (centavos: number) => centavos / 100;

async function Relatorio({ searchParams }: { searchParams: Parametros }) {
  await connection();
  const hoje = hojeEmSaoPaulo();
  const anoHoje = Number(hoje.slice(0, 4));
  const { ano: textoAno } = await searchParams;
  const pedido = Number(textoAno);
  const ano = Number.isInteger(pedido) && pedido >= 2000 && pedido <= 2100 ? pedido : anoHoje;

  const supabase = await createClient();
  const [porMes, lancs, cats] = await Promise.all([
    supabase.rpc("encargos_por_mes", { p_ano: ano }),
    supabase
      .from("lancamentos")
      .select("id, tipo, valor, juros, multa, desconto, data_vencimento, data_pagamento, categoria_id, parcela_num, parcela_total")
      .eq("tipo", "despesa")
      .gte("data_pagamento", `${ano}-01-01`)
      .lte("data_pagamento", `${ano}-12-31`)
      .or("juros.gt.0,multa.gt.0")
      .order("data_pagamento", { ascending: false }),
    supabase.from("categorias").select("id, nome"),
  ]);

  const botao =
    "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line bg-surface px-3 font-semibold hover:border-muted";
  const navegacao = (
    <nav className="flex items-center gap-2" aria-label="Mudar de ano">
      <Link href={`/relatorios/juros?ano=${ano - 1}`} className={botao} aria-label="Ano anterior">‹</Link>
      <p className="min-w-0 flex-1 text-center font-display text-xl font-bold">{ano}</p>
      <Link href={`/relatorios/juros?ano=${ano + 1}`} className={botao} aria-label="Ano seguinte">›</Link>
      {ano !== anoHoje && <Link href="/relatorios/juros" className={`${botao} text-sm`}>Este ano</Link>}
    </nav>
  );

  if (porMes.error || lancs.error) {
    return (
      <>
        {navegacao}
        <p className="rounded-lg bg-neg/10 px-3 py-2 text-neg" role="alert">
          Não foi possível montar o relatório agora. Atualize a página em alguns instantes.
        </p>
      </>
    );
  }

  const meses = MESES.map((_, i) => (porMes.data ?? []).find((m) => m.mes === i + 1));
  const soma = (campo: "juros_pagos" | "multas_pagas" | "descontos_obtidos" | "juros_recebidos" | "multas_recebidas" | "descontos_concedidos") =>
    (porMes.data ?? []).reduce((s, m) => s + c(m[campo]), 0);
  const jurosAno = soma("juros_pagos");
  const multasAno = soma("multas_pagas");
  const custoAno = jurosAno + multasAno;
  const economia = soma("descontos_obtidos");
  const recebidos = soma("juros_recebidos") + soma("multas_recebidas");
  const concedidos = soma("descontos_concedidos");

  const nomeCat = new Map((cats.data ?? []).map((x) => [x.id, x.nome]));
  const atrasos = (lancs.data ?? []).map((l) => ({
    id: l.id,
    categoria: (l.categoria_id && nomeCat.get(l.categoria_id)) || "Sem categoria",
    parcela: l.parcela_num ? `${l.parcela_num}/${l.parcela_total}` : null,
    custo: c(l.juros) + c(l.multa),
    valor: c(l.valor),
    vencimento: l.data_vencimento,
    pagamento: l.data_pagamento as string,
    dias: diasDeAtraso(l.data_vencimento, l.data_pagamento as string),
  }));
  const porCategoria = [...atrasos.reduce((m, a) => {
    const atual = m.get(a.categoria) ?? { vezes: 0, custo: 0 };
    m.set(a.categoria, { vezes: atual.vezes + 1, custo: atual.custo + a.custo });
    return m;
  }, new Map<string, { vezes: number; custo: number }>())].sort((a, b) => b[1].custo - a[1].custo);
  const maiores = [...atrasos].sort((a, b) => b.custo - a.custo).slice(0, 5);
  const aqui = `/relatorios/juros?ano=${ano}`;

  return (
    <>
      {navegacao}

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Resumo do ano">
        <div className="col-span-2 flex flex-col gap-1 rounded-xl border border-line bg-surface p-4">
          <span className="text-sm font-semibold text-muted">Custo dos atrasos em {ano}</span>
          <Valor valor={r(custoAno)} tipo={custoAno > 0 ? "despesa" : undefined} className="font-display text-3xl" />
          <span className="text-xs text-muted tabular-nums">
            juros {formatarNumero(r(jurosAno))} · multas {formatarNumero(r(multasAno))} · {atrasos.length}{" "}
            {atrasos.length === 1 ? "conta paga com atraso" : "contas pagas com atraso"}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-line bg-surface p-4">
          <span className="flex items-center gap-1 text-sm font-semibold text-muted">
            Descontos obtidos
            <Ajuda titulo="Descontos obtidos">Abatimentos em despesas, por pagar antes ou à vista.</Ajuda>
          </span>
          <Valor valor={r(economia)} tipo={economia > 0 ? "receita" : undefined} className="text-xl" />
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-line bg-surface p-4">
          <span className="flex items-center gap-1 text-sm font-semibold text-muted">
            De clientes
            <Ajuda titulo="Juros e multas recebidos">
              Juros e multas que você cobrou de quem pagou atrasado (receitas). Descontos concedidos
              a clientes aparecem embaixo.
            </Ajuda>
          </span>
          <Valor valor={r(recebidos)} tipo={recebidos > 0 ? "receita" : undefined} className="text-xl" />
          {concedidos > 0 && (
            <span className="text-xs text-muted tabular-nums">descontos concedidos {formatarNumero(r(concedidos))}</span>
          )}
        </div>
      </section>

      {custoAno === 0 && economia === 0 && recebidos === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-surface p-6 text-muted">
          Nenhum juro, multa ou desconto em {ano}. Tudo pago em dia.
        </p>
      ) : (
        <>
          <section className="flex flex-col gap-2" aria-label="Mês a mês">
            <h2 className="font-display text-lg font-bold">Mês a mês</h2>
            <div className="overflow-x-auto rounded-xl border border-line bg-surface">
              <table className="w-full border-collapse text-sm tabular-nums">
                <thead>
                  <tr className="text-xs text-muted">
                    <th scope="col" className="px-3 py-2 text-left font-semibold">Mês</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">Juros</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">Multas</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">Total pago</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">Descontos</th>
                  </tr>
                </thead>
                <tbody>
                  {meses.map((m, i) => {
                    const total = c(m?.juros_pagos) + c(m?.multas_pagas);
                    const desc = c(m?.descontos_obtidos);
                    if (total === 0 && desc === 0) return null;
                    return (
                      <tr key={i} className="border-t border-line">
                        <th scope="row" className="px-3 py-2 text-left font-semibold">{MESES[i]}</th>
                        <td className="px-3 py-2 text-right">{c(m?.juros_pagos) ? formatarNumero(r(c(m?.juros_pagos))) : "—"}</td>
                        <td className="px-3 py-2 text-right">{c(m?.multas_pagas) ? formatarNumero(r(c(m?.multas_pagas))) : "—"}</td>
                        <td className="px-3 py-2 text-right font-semibold text-neg">{total ? formatarNumero(r(total)) : "—"}</td>
                        <td className="px-3 py-2 text-right text-pos">{desc ? formatarNumero(r(desc)) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {porCategoria.length > 0 && (
            <section className="flex flex-col gap-2" aria-label="Por categoria">
              <h2 className="font-display text-lg font-bold">De onde vieram</h2>
              <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
                {porCategoria.map(([nome, x]) => (
                  <li key={nome} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{nome}</span>
                      <span className="text-xs text-muted">{x.vezes} {x.vezes === 1 ? "atraso" : "atrasos"}</span>
                    </span>
                    <Valor valor={r(x.custo)} tipo="despesa" className="shrink-0" />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {maiores.length > 0 && (
            <section className="flex flex-col gap-2" aria-label="Atrasos que mais custaram">
              <h2 className="font-display text-lg font-bold">Atrasos que mais custaram</h2>
              <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
                {maiores.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/lancamentos/${a.id}?voltar=${encodeURIComponent(aqui)}`}
                      className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-bg"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">
                          {a.categoria}
                          {a.parcela && <span className="font-normal text-muted"> · {a.parcela}</span>}
                        </span>
                        <span className="block text-xs text-muted">
                          Venceu em {formatarData(a.vencimento)}, pago em {formatarData(a.pagamento)} ({a.dias}{" "}
                          {a.dias === 1 ? "dia" : "dias"} de atraso) · valor {formatarNumero(r(a.valor))}
                        </span>
                      </span>
                      <Valor valor={r(a.custo)} tipo="despesa" className="shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </>
  );
}

export default function PaginaJuros({ searchParams }: { searchParams: Parametros }) {
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold tracking-tight">
        Juros e multas
        <Ajuda titulo="Juros e multas">
          Quanto os atrasos custaram no ano, pela data do pagamento, e de onde vieram. Também mostra os
          descontos obtidos e os juros e multas cobrados de clientes.
        </Ajuda>
      </h1>
      <AbasRelatorios atual="/relatorios/juros" />
      <Suspense fallback={<p className="text-muted">Montando o relatório…</p>}>
        <Relatorio searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
