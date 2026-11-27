import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Ajuda } from "@/components/ui/ajuda";
import { Valor } from "@/components/ui/valor";
import { diaDaSemana, formatarData, hojeEmSaoPaulo, intervaloDoMes, mesDoParametro, nomeDoMes, somarMeses } from "@/lib/datas";
import { formatarNumero } from "@/lib/dinheiro";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Fluxo de caixa · Sobra Vida", robots: { index: false } };

// Fluxo de caixa diário (R3, R6): o saldo de todas as contas ativas dia a dia.
// Até hoje vale o que aconteceu; de amanhã em diante, o que está em aberto pelo
// vencimento. Atrasados entram em "hoje". Transferências entre contas não entram.

type Parametros = Promise<{ mes?: string; todos?: string }>;

type Dia = { dia: string; entradas: number; saidas: number; saldo: number; previsto: boolean };

const mesNoEndereco = (iso: string) => iso.slice(0, 7);

async function Fluxo({ searchParams }: { searchParams: Parametros }) {
  await connection();
  const hoje = hojeEmSaoPaulo();
  const params = await searchParams;
  const mes = mesDoParametro(params.mes, hoje);
  const todos = params.todos === "1";
  const { inicio, fim } = intervaloDoMes(mes);
  const mesDeHoje = mesDoParametro(undefined, hoje);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fluxo_diario", { p_inicio: inicio, p_fim: fim, p_hoje: hoje });

  const botao =
    "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line bg-surface px-3 font-semibold hover:border-muted";
  const para = (m: string, mostrarTodos = todos) =>
    `/relatorios/fluxo?mes=${mesNoEndereco(m)}${mostrarTodos ? "&todos=1" : ""}`;

  const navegacao = (
    <nav className="flex items-center gap-2" aria-label="Mudar de mês">
      <Link href={para(somarMeses(mes, -1))} className={botao} aria-label="Mês anterior">‹</Link>
      <p className="min-w-0 flex-1 text-center font-display text-xl font-bold first-letter:uppercase">{nomeDoMes(mes)}</p>
      <Link href={para(somarMeses(mes, 1))} className={botao} aria-label="Mês seguinte">›</Link>
      {mes !== mesDeHoje && (
        <Link href="/relatorios/fluxo" className={`${botao} text-sm`}>Hoje</Link>
      )}
    </nav>
  );

  if (error) {
    return (
      <>
        {navegacao}
        <p className="rounded-lg bg-neg/10 px-3 py-2 text-neg" role="alert">
          Não foi possível montar o fluxo agora. Atualize a página em alguns instantes.
        </p>
      </>
    );
  }

  const dias: Dia[] = (data ?? []).map((d) => ({
    dia: d.dia,
    entradas: Number(d.entradas),
    saidas: Number(d.saidas),
    saldo: Number(d.saldo),
    previsto: d.previsto,
  }));
  if (dias.length === 0) return navegacao;

  const primeiro = dias[0];
  const saldoInicial = Math.round((primeiro.saldo - primeiro.entradas + primeiro.saidas) * 100) / 100;
  const centavos = (l: number[]) => l.reduce((s, v) => s + Math.round(v * 100), 0) / 100;
  const totalEntradas = centavos(dias.map((d) => d.entradas));
  const totalSaidas = centavos(dias.map((d) => d.saidas));
  const saldoFinal = dias[dias.length - 1].saldo;
  const menor = dias.reduce((m, d) => (d.saldo < m.saldo ? d : m), dias[0]);
  const visiveis = todos ? dias : dias.filter((d) => d.entradas !== 0 || d.saidas !== 0 || d.dia === hoje);

  return (
    <>
      {navegacao}

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Resumo do mês">
        {[
          { rotulo: "Saldo no início", valor: saldoInicial },
          { rotulo: "Entradas", valor: totalEntradas, tipo: "receita" as const },
          { rotulo: "Saídas", valor: totalSaidas, tipo: "despesa" as const },
          { rotulo: `Saldo em ${formatarData(fim).slice(0, 5)}`, valor: saldoFinal },
        ].map((c) => (
          <div key={c.rotulo} className="flex flex-col gap-1 rounded-xl border border-line bg-surface p-3">
            <span className="text-xs font-semibold text-muted">{c.rotulo}</span>
            <Valor valor={c.valor} tipo={c.tipo} className="text-base sm:text-lg" />
          </div>
        ))}
      </section>

      {menor.saldo < 0 && (
        <p className="rounded-lg bg-neg/10 px-3 py-2 text-sm font-semibold text-neg" role="alert">
          Atenção: o saldo fica negativo em {formatarData(menor.dia).slice(0, 5)} ({formatarNumero(menor.saldo)}). Veja o que
          dá para adiantar ou adiar.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-muted">
          {todos ? "Todos os dias do mês." : "Só os dias com movimento (e hoje)."}
        </p>
        <Link href={para(mes, !todos)} className="font-semibold text-accent underline-offset-4 hover:underline">
          {todos ? "Mostrar só os dias com movimento" : "Mostrar todos os dias"}
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full border-collapse text-sm tabular-nums">
          <caption className="sr-only">Fluxo de caixa diário de {nomeDoMes(mes)}</caption>
          <thead>
            <tr className="text-xs text-muted">
              <th scope="col" className="px-3 py-2 text-left font-semibold">Dia</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">Entradas</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">Saídas</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((d) => (
              <tr key={d.dia} className={`border-t border-line ${d.previsto ? "text-muted" : ""} ${d.dia === hoje ? "bg-accent/10" : ""}`}>
                <th scope="row" className="px-3 py-2 text-left font-normal">
                  <span className="font-semibold">{formatarData(d.dia).slice(0, 5)}</span>{" "}
                  <span className="text-xs text-muted">{diaDaSemana(d.dia).slice(0, 3)}</span>
                  {d.dia === hoje && <span className="ml-1 rounded bg-accent px-1.5 text-xs text-bg">hoje</span>}
                  {d.previsto && <span className="ml-1 text-xs italic">previsto</span>}
                </th>
                <td className="px-3 py-2 text-right">{d.entradas ? `+${formatarNumero(d.entradas)}` : "—"}</td>
                <td className="px-3 py-2 text-right">{d.saidas ? `−${formatarNumero(d.saidas)}` : "—"}</td>
                <td className={`px-3 py-2 text-right font-semibold ${d.saldo < 0 ? "text-neg" : ""}`}>{formatarNumero(d.saldo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function PaginaFluxo({ searchParams }: { searchParams: Parametros }) {
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold tracking-tight">
        Fluxo de caixa
        <Ajuda titulo="Fluxo de caixa">
          O saldo de todas as contas ativas, dia a dia. Até hoje, o que aconteceu; depois de hoje, o que
          está em aberto pelo vencimento (marcado como previsto). Contas atrasadas entram em hoje.
          Transferências entre suas contas não entram, porque não mudam o total.
        </Ajuda>
      </h1>
      <Suspense fallback={<p className="text-muted">Montando o fluxo…</p>}>
        <Fluxo searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
