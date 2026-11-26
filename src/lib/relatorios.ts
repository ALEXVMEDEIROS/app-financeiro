// Somas dos relatórios a partir das linhas da função resultado_mensal (R7).
// Tudo em centavos inteiros, para não acumular erro de arredondamento.

export type LinhaResultado = {
  natureza: string;
  mes: number;
  valor: number | string;
};

export type Resumo = {
  receitas: number;
  despesas: number;
  resultado: number;
  /** Resultado ÷ receitas, em %; null quando não houve receita. */
  lucratividade: number | null;
};

const centavos = (v: number | string) => Math.round(Number(v) * 100);

/** Receitas, despesas, resultado e lucratividade de um mês (1 a 12) ou do ano inteiro (sem mês). */
export function resumir(linhas: LinhaResultado[], mes?: number): Resumo {
  let rec = 0;
  let desp = 0;
  for (const l of linhas) {
    if (mes !== undefined && l.mes !== mes) continue;
    if (l.natureza === "receita") rec += centavos(l.valor);
    else if (l.natureza === "despesa") desp += centavos(l.valor);
  }
  const resultado = rec - desp;
  return {
    receitas: rec / 100,
    despesas: desp / 100,
    resultado: resultado / 100,
    lucratividade: rec > 0 ? Math.round((resultado / rec) * 1000) / 10 : null,
  };
}

/** "12,3%" ou "—". */
export function formatarPercentual(p: number | null): string {
  if (p === null) return "—";
  return `${p.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}
