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

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export type MesDoGrafico = {
  ano: number;
  mes: number;
  rotulo: string;
  receitas: number;
  despesas: number;
  resultado: number;
};

/** Os n meses que terminam no mês de `hoje` (AAAA-MM-DD), do mais antigo ao atual. */
export function ultimosMeses(hoje: string, n: number): { ano: number; mes: number }[] {
  const ano = Number(hoje.slice(0, 4));
  const mes = Number(hoje.slice(5, 7));
  const lista: { ano: number; mes: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const total = ano * 12 + (mes - 1) - i;
    lista.push({ ano: Math.floor(total / 12), mes: (total % 12) + 1 });
  }
  return lista;
}

/** Resumo de cada mês do gráfico, a partir das linhas de resultado_mensal de cada ano. */
export function serieDeMeses(
  meses: { ano: number; mes: number }[],
  linhasPorAno: Record<number, LinhaResultado[]>,
): MesDoGrafico[] {
  return meses.map(({ ano, mes }) => {
    const r = resumir(linhasPorAno[ano] ?? [], mes);
    const rotulo = MESES_CURTOS[mes - 1] + (mes === 1 ? `/${String(ano).slice(2)}` : "");
    return { ano, mes, rotulo, receitas: r.receitas, despesas: r.despesas, resultado: r.resultado };
  });
}

/** Passo "redondo" (1, 2, 2,5 ou 5 × 10^k) para dividir `amplitude` em cerca de `partes`. */
export function passoRedondo(amplitude: number, partes = 4): number {
  if (amplitude <= 0) return 1;
  const bruto = amplitude / partes;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const fator = [1, 2, 2.5, 5, 10].find((f) => f * potencia >= bruto) ?? 10;
  return fator * potencia;
}

/** Escala do eixo: sempre inclui o zero; limites múltiplos do passo. */
export function escalaComZero(valores: number[], partes = 4): { min: number; max: number; marcas: number[] } {
  const menor = Math.min(0, ...valores);
  const maior = Math.max(0, ...valores);
  const passo = passoRedondo(maior - menor || 1, partes);
  const min = Math.floor(menor / passo) * passo;
  // Tudo zero (mês sem movimento): mostra um eixo de 0 a 1 em vez de achatar.
  const max = menor === 0 && maior === 0 ? passo * partes : Math.ceil(maior / passo) * passo;
  const marcas: number[] = [];
  for (let v = min; v <= max + passo / 2; v += passo) marcas.push(Math.round(v * 100) / 100);
  return { min, max, marcas };
}
