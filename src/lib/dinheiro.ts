// Funções de dinheiro do Sobra Vida. Valores trafegam como número em reais
// (ex.: 1234.56) e são exibidos no formato brasileiro (R$ 1.234,56).

export type TipoLancamento = "receita" | "despesa" | "transferencia";

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatoNumero = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** R$ 1.234,56 (sem sinal; negativos com "−"). */
export function formatarMoeda(valor: number) {
  const texto = formatoMoeda.format(Math.abs(valor));
  return valor < 0 ? `−${texto}` : texto;
}

/** 1.234,56 (sem "R$"), para preencher campos. */
export function formatarNumero(valor: number) {
  return formatoNumero.format(valor);
}

/**
 * Valor com sinal conforme o tipo do lançamento: receita "+", despesa "−",
 * transferência sem sinal.
 */
export function formatarComSinal(valor: number, tipo: TipoLancamento) {
  const texto = formatoMoeda.format(Math.abs(valor));
  if (tipo === "receita") return `+${texto}`;
  if (tipo === "despesa") return `−${texto}`;
  return texto;
}

/**
 * Lê o que o usuário digitou num campo de valor, aceitando o jeito brasileiro
 * ("1.234,56", "1234,5", "R$ 10") e também o ponto decimal ("1234.56").
 * Devolve o número em reais com 2 casas, ou null se não for um valor válido.
 */
export function lerValor(texto: string): number | null {
  let t = texto.replace(/R\$/gi, "").replace(/\s/g, "").trim();
  if (t === "") return null;
  if (!/^-?[\d.,]+$/.test(t)) return null;

  const temVirgula = t.includes(",");
  const ultimoPonto = t.lastIndexOf(".");
  if (temVirgula) {
    // vírgula é o decimal; pontos são separadores de milhar
    t = t.replace(/\./g, "").replace(",", ".");
  } else if (ultimoPonto !== -1) {
    // só pontos: se o último tem 3 dígitos depois, é milhar ("1.234");
    // senão é decimal ("12.5")
    const depois = t.length - ultimoPonto - 1;
    t = depois === 3 && (t.match(/\./g)?.length ?? 0) >= 1 ? t.replace(/\./g, "") : t;
  }
  if ((t.match(/\./g)?.length ?? 0) > 1 || (t.match(/,/g)?.length ?? 0) > 0) return null;

  const numero = Number(t);
  if (!Number.isFinite(numero)) return null;
  return Math.round(numero * 100) / 100;
}

/**
 * Maior valor aceito num lançamento ou saldo: R$ 999.999.999,99.
 * O banco guarda até 12 dígitos inteiros; o limite deixa folga para somas.
 */
export const VALOR_MAXIMO = 999_999_999.99;
export const TEXTO_VALOR_MAXIMO = "O valor máximo é R$ 999.999.999,99.";
