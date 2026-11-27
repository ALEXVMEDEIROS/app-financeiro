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

// ---------------------------------------------------------------------------
// Resultado do ano (DRE, R7): grupos nas linhas, meses nas colunas.
// ---------------------------------------------------------------------------

export type LinhaDreBruta = LinhaResultado & {
  grupo: string;
  grupo_ordem: number;
  categoria: string;
};

export type LinhaDre = {
  grupo: string;
  ordem: number;
  /** Valor de cada mês, janeiro (0) a dezembro (11). */
  meses: number[];
  total: number;
  categorias: { nome: string; meses: number[]; total: number }[];
};

export type Dre = {
  receitas: LinhaDre[];
  despesas: LinhaDre[];
  totalReceitas: number[];
  totalDespesas: number[];
  resultado: number[];
};

const doze = () => Array.from({ length: 12 }, () => 0);
const reais = (centavosLista: number[]) => centavosLista.map((c) => c / 100);
const somaLista = (l: number[]) => Math.round(l.reduce((s, v) => s + Math.round(v * 100), 0)) / 100;

/** Agrupa as linhas de resultado_mensal por natureza, grupo e categoria. */
export function montarDre(linhas: LinhaDreBruta[]): Dre {
  const porNatureza = { receita: new Map<string, { ordem: number; meses: number[]; cats: Map<string, number[]> }>(), despesa: new Map<string, { ordem: number; meses: number[]; cats: Map<string, number[]> }>() };
  for (const l of linhas) {
    const mapa = l.natureza === "receita" ? porNatureza.receita : l.natureza === "despesa" ? porNatureza.despesa : null;
    if (!mapa || l.mes < 1 || l.mes > 12) continue;
    const g = mapa.get(l.grupo) ?? { ordem: l.grupo_ordem, meses: doze(), cats: new Map() };
    const c = centavos(l.valor);
    g.meses[l.mes - 1] += c;
    const cat = g.cats.get(l.categoria) ?? doze();
    cat[l.mes - 1] += c;
    g.cats.set(l.categoria, cat);
    mapa.set(l.grupo, g);
  }
  const lista = (mapa: typeof porNatureza.receita): LinhaDre[] =>
    [...mapa.entries()]
      .map(([grupo, g]) => {
        const meses = reais(g.meses);
        return {
          grupo,
          ordem: g.ordem,
          meses,
          total: somaLista(meses),
          categorias: [...g.cats.entries()]
            .map(([nome, m]) => ({ nome, meses: reais(m), total: somaLista(reais(m)) }))
            .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, "pt-BR")),
        };
      })
      .sort((a, b) => a.ordem - b.ordem || a.grupo.localeCompare(b.grupo, "pt-BR"));
  const receitas = lista(porNatureza.receita);
  const despesas = lista(porNatureza.despesa);
  const somaMes = (grupos: LinhaDre[]) =>
    doze().map((_, i) => grupos.reduce((s, g) => s + Math.round(g.meses[i] * 100), 0) / 100);
  const totalReceitas = somaMes(receitas);
  const totalDespesas = somaMes(despesas);
  const resultado = totalReceitas.map((r, i) => Math.round((r - totalDespesas[i]) * 100) / 100);
  return { receitas, despesas, totalReceitas, totalDespesas, resultado };
}

/** Quantos meses entram na média: até o mês atual no ano corrente, 12 nos anos passados, 0 no futuro. */
export function mesesParaMedia(ano: number, hoje: string): number {
  const anoHoje = Number(hoje.slice(0, 4));
  if (ano < anoHoje) return 12;
  if (ano > anoHoje) return 0;
  return Number(hoje.slice(5, 7));
}

export const media = (total: number, meses: number) => (meses > 0 ? Math.round((total / meses) * 100) / 100 : 0);
