import Link from "next/link";
import { formatarNumero } from "@/lib/dinheiro";
import { formatarPercentual, type Dre, type LinhaDre } from "@/lib/relatorios";
import { linkDetalhe } from "./links";

// Resultado do ano no celular: um mês por vez, sem rolagem lateral.
// Os grupos abrem nas categorias (details); cada valor abre os lançamentos.

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function Grupo({ g, i, base }: { g: LinhaDre; i: number; base: string }) {
  const v = g.meses[i];
  if (v === 0) return null;
  const cats = g.categorias.filter((c) => c.meses[i] !== 0);
  return (
    <li>
      <details className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-2">
          <span className="flex min-w-0 items-center gap-1.5">
            <span aria-hidden className="inline-block w-3 shrink-0 text-xs text-muted transition-transform group-open:rotate-90">▶</span>
            <span className="truncate">{g.grupo}</span>
          </span>
          <span className="shrink-0 tabular-nums">{formatarNumero(v)}</span>
        </summary>
        <ul className="mb-2 flex flex-col gap-1 pl-5">
          {cats.map((c) => (
            <li key={c.nome}>
              <Link
                href={linkDetalhe(base, i + 1, g.grupo, c.nome)}
                className="flex min-h-9 items-center justify-between gap-3 text-sm text-muted hover:text-accent"
              >
                <span className="min-w-0 truncate">{c.nome}</span>
                <span className="shrink-0 tabular-nums underline decoration-line decoration-dotted underline-offset-4">
                  {formatarNumero(c.meses[i])}
                </span>
              </Link>
            </li>
          ))}
          <li>
            <Link href={linkDetalhe(base, i + 1, g.grupo)} className="text-xs font-semibold text-accent">
              Ver os lançamentos do grupo
            </Link>
          </li>
        </ul>
      </details>
    </li>
  );
}

function Total({ rotulo, valor, sinal = false }: { rotulo: string; valor: number; sinal?: boolean }) {
  const cor = sinal ? (valor < 0 ? "text-neg" : valor > 0 ? "text-pos" : "") : "";
  return (
    <p className="flex items-center justify-between gap-3 border-t border-line py-2 font-semibold">
      <span>{rotulo}</span>
      <span className={`tabular-nums ${cor}`}>{valor === 0 ? "—" : formatarNumero(valor)}</span>
    </p>
  );
}

export function MesAMes({ dre, mes, ano, hrefMes, baseDetalhe }: {
  dre: Dre;
  /** 1 a 12 */
  mes: number;
  ano: number;
  hrefMes: (m: number) => string;
  baseDetalhe: string;
}) {
  const i = mes - 1;
  const receitas = dre.totalReceitas[i];
  const lucro = receitas > 0 ? Math.round((dre.resultado[i] / receitas) * 1000) / 10 : null;
  const vazio = receitas === 0 && dre.totalDespesas[i] === 0;
  return (
    <section className="flex flex-col gap-3" aria-label={`Resultado de ${MESES[i]} de ${ano}`}>
      <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1" aria-label="Escolher o mês">
        {MESES.map((m, n) => (
          <Link
            key={m}
            href={hrefMes(n + 1)}
            aria-current={n === i ? "page" : undefined}
            className={`flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg px-2 text-sm font-semibold ${
              n === i ? "bg-fg text-bg" : "border border-line bg-surface text-muted"
            }`}
          >
            {m}
          </Link>
        ))}
      </nav>
      {vazio ? (
        <p className="rounded-xl border border-dashed border-line bg-surface p-6 text-muted">Nada neste mês.</p>
      ) : (
        <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4">
          <div>
            <h2 className="font-display text-base font-bold">Receitas</h2>
            <ul className="divide-y divide-line">
              {dre.receitas.map((g) => (
                <Grupo key={g.grupo} g={g} i={i} base={`${baseDetalhe}&natureza=receita`} />
              ))}
            </ul>
            <Total rotulo="Total de receitas" valor={receitas} />
          </div>
          <div>
            <h2 className="font-display text-base font-bold">Despesas</h2>
            <ul className="divide-y divide-line">
              {dre.despesas.map((g) => (
                <Grupo key={g.grupo} g={g} i={i} base={`${baseDetalhe}&natureza=despesa`} />
              ))}
            </ul>
            <Total rotulo="Total de despesas" valor={dre.totalDespesas[i]} />
          </div>
          <div className="rounded-lg bg-bg px-3">
            <Total rotulo="Resultado" valor={dre.resultado[i]} sinal />
            <p className="flex items-center justify-between gap-3 border-t border-line py-2 text-sm text-muted">
              <span>Lucratividade</span>
              <span className="tabular-nums">{formatarPercentual(lucro)}</span>
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
