import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Ajuda } from "@/components/ui/ajuda";
import { hojeEmSaoPaulo } from "@/lib/datas";
import { formatarPercentual, media, mesesParaMedia, montarDre } from "@/lib/relatorios";
import { createClient } from "@/lib/supabase/server";
import { Celula, LinhaGrupo } from "./linhas";
import { MesAMes } from "./mes-a-mes";

export const metadata: Metadata = { title: "Resultado do ano · Sobra Vida", robots: { index: false } };

type Parametros = Promise<{ ano?: string; visao?: string; mes?: string }>;
type Visao = "caixa" | "previsto";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

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

/** Lucratividade (R7): resultado ÷ receitas, em %; "—" sem receita. */
function LinhaLucratividade({ receitas, resultado }: { receitas: number[]; resultado: number[] }) {
  const pct = (r: number, res: number) => (r > 0 ? Math.round((res / r) * 1000) / 10 : null);
  const somar = (l: number[]) => l.reduce((s, v) => s + Math.round(v * 100), 0) / 100;
  const celula = (chave: string, p: number | null, forte = false) => (
    <td key={chave} className={`whitespace-nowrap px-2 py-1.5 text-right tabular-nums ${forte ? "font-semibold" : ""} ${p === null ? "text-muted" : p < 0 ? "text-neg" : ""}`}>
      {formatarPercentual(p)}
    </td>
  );
  return (
    <tr className="border-t border-line">
      <th scope="row" className="sticky left-0 bg-surface px-2 py-1.5 text-left font-semibold">
        <span className="inline-flex items-center gap-1">
          Lucratividade
          <Ajuda titulo="Lucratividade">
            Quanto das receitas sobrou: resultado ÷ receitas. Nos meses sem receita aparece um traço.
          </Ajuda>
        </span>
      </th>
      {receitas.map((r, i) => celula(String(i), pct(r, resultado[i])))}
      {celula("total", pct(somar(receitas), somar(resultado)), true)}
      <td className="px-2 py-1.5 text-right text-muted">—</td>
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
  const { ano: textoAno, visao: textoVisao, mes: textoMes } = await searchParams;
  const visao: Visao = textoVisao === "previsto" ? "previsto" : "caixa";
  // Endereço mantendo a visão escolhida (caixa é o padrão e não aparece).
  const para = (a?: number, v: Visao = visao) => {
    const p = new URLSearchParams();
    if (a !== undefined) p.set("ano", String(a));
    if (v === "previsto") p.set("visao", "previsto");
    const t = p.toString();
    return `/relatorios/resultado${t ? `?${t}` : ""}`;
  };
  const pedido = Number(textoAno);
  const ano = Number.isInteger(pedido) && pedido >= 2000 && pedido <= 2100 ? pedido : anoHoje;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("resultado_mensal", { p_ano: ano, p_visao: visao });
  // No previsto o ano inteiro já tem valores (vencimentos futuros): média por 12.
  const mesesMedia = visao === "previsto" ? 12 : mesesParaMedia(ano, hoje);
  const botao =
    "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line bg-surface px-3 font-semibold hover:border-muted";

  const seletor = (
    <nav className="grid grid-cols-2 gap-1 rounded-lg bg-surface p-1 sm:w-80" aria-label="Visão">
      {(["caixa", "previsto"] as const).map((v) => (
        <Link
          key={v}
          href={para(ano === anoHoje ? undefined : ano, v)}
          aria-current={visao === v ? "page" : undefined}
          className={`flex min-h-11 items-center justify-center rounded-md text-sm font-semibold ${visao === v ? "bg-fg text-bg" : "text-muted"}`}
        >
          {v === "caixa" ? "Caixa" : "Previsto"}
        </Link>
      ))}
    </nav>
  );

  const navegacao = (
    <nav className="flex items-center gap-2" aria-label="Mudar de ano">
      <Link href={para(ano - 1)} className={botao} aria-label="Ano anterior">‹</Link>
      <p className="min-w-0 flex-1 text-center font-display text-xl font-bold">{ano}</p>
      <Link href={para(ano + 1)} className={botao} aria-label="Ano seguinte">›</Link>
      {ano !== anoHoje && (
        <Link href={para()} className={`${botao} text-sm`}>Este ano</Link>
      )}
    </nav>
  );

  if (error) {
    return (
      <>
        {navegacao}
        {seletor}
        <p className="rounded-lg bg-neg/10 px-3 py-2 text-neg" role="alert">
          Não foi possível montar o relatório agora. Atualize a página em alguns instantes.
        </p>
      </>
    );
  }

  const dre = montarDre(data ?? []);
  const baseDetalhe = `/relatorios/resultado/detalhe?ano=${ano}&visao=${visao}`;
  // Celular: um mês por vez (o atual no ano corrente; dezembro nos passados; janeiro nos futuros).
  const mesPedido = Number(textoMes);
  const mesCelular =
    Number.isInteger(mesPedido) && mesPedido >= 1 && mesPedido <= 12
      ? mesPedido
      : ano === anoHoje ? Number(hoje.slice(5, 7)) : ano < anoHoje ? 12 : 1;
  const hrefMes = (m: number) => {
    const base = para(ano);
    return `${base}${base.includes("?") ? "&" : "?"}mes=${m}`;
  };
  const vazio = dre.receitas.length === 0 && dre.despesas.length === 0;

  return (
    <>
      {navegacao}
      {seletor}
      <p className="text-sm text-muted">
        {visao === "caixa"
          ? "Caixa: o que de fato entrou e saiu, pela data do pagamento."
          : "Previsto: o ano pelo vencimento, incluindo o que ainda está em aberto; o que foi pago entra com juros e descontos."}{" "}
        Valores em reais.
        {mesesMedia > 0 && mesesMedia < 12 && ` A média considera ${mesesMedia} meses (até o mês atual).`}
      </p>
      {vazio ? (
        <p className="rounded-xl border border-dashed border-line bg-surface p-6 text-muted">
          {visao === "caixa" ? `Nenhuma receita ou despesa paga em ${ano}.` : `Nenhuma receita ou despesa com vencimento em ${ano}.`}
        </p>
      ) : (
        <>
        <div className="sm:hidden">
          <MesAMes dre={dre} mes={mesCelular} ano={ano} hrefMes={hrefMes} baseDetalhe={baseDetalhe} />
        </div>
        <div className="hidden overflow-x-auto rounded-xl border border-line bg-surface sm:block">
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
                <LinhaGrupo key={g.grupo} g={g} mesesMedia={mesesMedia} base={`${baseDetalhe}&natureza=receita`} />
              ))}
              <LinhaTotal rotulo="Total de receitas" meses={dre.totalReceitas} mesesMedia={mesesMedia} />
              <CabecalhoSecao titulo="Despesas" />
              {dre.despesas.map((g) => (
                <LinhaGrupo key={g.grupo} g={g} mesesMedia={mesesMedia} base={`${baseDetalhe}&natureza=despesa`} />
              ))}
              <LinhaTotal rotulo="Total de despesas" meses={dre.totalDespesas} mesesMedia={mesesMedia} />
              <LinhaTotal rotulo="Resultado" meses={dre.resultado} mesesMedia={mesesMedia} sinal />
              <LinhaLucratividade receitas={dre.totalReceitas} resultado={dre.resultado} />
            </tbody>
          </table>
        </div>
        </>
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
