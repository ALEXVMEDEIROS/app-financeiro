import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Ajuda } from "@/components/ui/ajuda";
import { hojeEmSaoPaulo } from "@/lib/datas";
import { formatarNumero } from "@/lib/dinheiro";
import { media, mesesParaMedia, montarDre, type LinhaDre } from "@/lib/relatorios";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Resultado do ano · Sobra Vida", robots: { index: false } };

type Parametros = Promise<{ ano?: string }>;

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Número sem "R$" (a tabela é larga); zero vira um traço discreto. */
function Celula({ valor, forte = false, sinal = false }: { valor: number; forte?: boolean; sinal?: boolean }) {
  if (valor === 0) return <td className="px-2 py-1.5 text-right text-muted">—</td>;
  const cor = sinal ? (valor < 0 ? "text-neg" : "text-pos") : "";
  return (
    <td className={`whitespace-nowrap px-2 py-1.5 text-right tabular-nums ${forte ? "font-semibold" : ""} ${cor}`}>
      {formatarNumero(valor)}
    </td>
  );
}

function LinhaGrupo({ g, mesesMedia }: { g: LinhaDre; mesesMedia: number }) {
  return (
    <tr className="border-t border-line">
      <th scope="row" className="sticky left-0 bg-surface px-2 py-1.5 text-left font-normal">
        {g.grupo}
      </th>
      {g.meses.map((v, i) => (
        <Celula key={i} valor={v} />
      ))}
      <Celula valor={g.total} forte />
      <Celula valor={media(g.total, mesesMedia)} />
    </tr>
  );
}

function LinhaTotal({ rotulo, meses, mesesMedia, sinal = false }: {
  rotulo: string;
  meses: number[];
  mesesMedia: number;
  sinal?: boolean;
}) {
  const total = Math.round(meses.reduce((s, v) => s + Math.round(v * 100), 0)) / 100;
  return (
    <tr className="border-t-2 border-line bg-bg">
      <th scope="row" className="sticky left-0 bg-bg px-2 py-1.5 text-left font-semibold">
        {rotulo}
      </th>
      {meses.map((v, i) => (
        <Celula key={i} valor={v} forte sinal={sinal} />
      ))}
      <Celula valor={total} forte sinal={sinal} />
      <Celula valor={media(total, mesesMedia)} forte sinal={sinal} />
    </tr>
  );
}

function CabecalhoSecao({ titulo }: { titulo: string }) {
  return (
    <tr>
      <th colSpan={15} scope="colgroup" className="sticky left-0 bg-surface px-2 pb-1 pt-4 text-left font-display text-base font-bold">
        {titulo}
      </th>
    </tr>
  );
}

async function Relatorio({ searchParams }: { searchParams: Parametros }) {
  await connection();
  const hoje = hojeEmSaoPaulo();
  const anoHoje = Number(hoje.slice(0, 4));
  const { ano: textoAno } = await searchParams;
  const pedido = Number(textoAno);
  const ano = Number.isInteger(pedido) && pedido >= 2000 && pedido <= 2100 ? pedido : anoHoje;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("resultado_mensal", { p_ano: ano, p_visao: "caixa" });
  const mesesMedia = mesesParaMedia(ano, hoje);
  const botao =
    "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line bg-surface px-3 font-semibold hover:border-muted";

  const navegacao = (
    <nav className="flex items-center gap-2" aria-label="Mudar de ano">
      <Link href={`/relatorios/resultado?ano=${ano - 1}`} className={botao} aria-label="Ano anterior">‹</Link>
      <p className="min-w-0 flex-1 text-center font-display text-xl font-bold">{ano}</p>
      <Link href={`/relatorios/resultado?ano=${ano + 1}`} className={botao} aria-label="Ano seguinte">›</Link>
      {ano !== anoHoje && (
        <Link href="/relatorios/resultado" className={`${botao} text-sm`}>Este ano</Link>
      )}
    </nav>
  );

  if (error) {
    return (
      <>
        {navegacao}
        <p className="rounded-lg bg-neg/10 px-3 py-2 text-neg" role="alert">
          Não foi possível montar o relatório agora. Atualize a página em alguns instantes.
        </p>
      </>
    );
  }

  const dre = montarDre(data ?? []);
  const vazio = dre.receitas.length === 0 && dre.despesas.length === 0;

  return (
    <>
      {navegacao}
      <p className="text-sm text-muted">
        Visão caixa: o que de fato entrou e saiu, pela data do pagamento. Valores em reais.
        {mesesMedia > 0 && mesesMedia < 12 && ` A média considera ${mesesMedia} meses (até o mês atual).`}
      </p>
      {vazio ? (
        <p className="rounded-xl border border-dashed border-line bg-surface p-6 text-muted">
          Nenhuma receita ou despesa paga em {ano}.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[60rem] border-collapse text-sm">
            <caption className="sr-only">Resultado de {ano} por grupo e mês, em reais</caption>
            <thead>
              <tr className="text-xs text-muted">
                <th scope="col" className="sticky left-0 bg-surface px-2 py-2 text-left font-semibold">Grupo</th>
                {MESES.map((m) => (
                  <th key={m} scope="col" className="px-2 py-2 text-right font-semibold">{m}</th>
                ))}
                <th scope="col" className="px-2 py-2 text-right font-semibold">Total</th>
                <th scope="col" className="px-2 py-2 text-right font-semibold">
                  <span className="inline-flex items-center gap-1">
                    Média
                    <Ajuda titulo="Média mensal">
                      Total dividido pelos meses do ano até agora (no ano atual) ou por 12 (anos passados).
                    </Ajuda>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              <CabecalhoSecao titulo="Receitas" />
              {dre.receitas.map((g) => (
                <LinhaGrupo key={g.grupo} g={g} mesesMedia={mesesMedia} />
              ))}
              <LinhaTotal rotulo="Total de receitas" meses={dre.totalReceitas} mesesMedia={mesesMedia} />
              <CabecalhoSecao titulo="Despesas" />
              {dre.despesas.map((g) => (
                <LinhaGrupo key={g.grupo} g={g} mesesMedia={mesesMedia} />
              ))}
              <LinhaTotal rotulo="Total de despesas" meses={dre.totalDespesas} mesesMedia={mesesMedia} />
              <LinhaTotal rotulo="Resultado" meses={dre.resultado} mesesMedia={mesesMedia} sinal />
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function PaginaResultadoDoAno({ searchParams }: { searchParams: Parametros }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold tracking-tight">
          Resultado do ano
          <Ajuda titulo="Resultado do ano">
            Receitas e despesas de cada mês, por grupo do plano de contas. Juros e multas pagos aparecem
            em Despesas financeiras. Transferências entre suas contas não entram.
          </Ajuda>
        </h1>
      </div>
      <Suspense fallback={<p className="text-muted">Montando o relatório…</p>}>
        <Relatorio searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
