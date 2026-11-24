import { somarMeses } from "./datas";

// Contas em centavos (inteiros) para nunca perder 1 centavo com arredondamento.
const paraCentavos = (reais: number) => Math.round(reais * 100);
const paraReais = (centavos: number) => centavos / 100;

export type Parcela = { numero: number; total: number; valor: number; vencimento: string };

/**
 * Divide um valor total em N parcelas mensais (R11). A última parcela absorve
 * a diferença do arredondamento: R$ 100,00 em 3 = 33,33 + 33,33 + 33,34.
 * Vencimentos mensais a partir do primeiro, mantendo o dia (ou o último dia
 * do mês, em meses mais curtos).
 */
export function dividirParcelas(valorTotal: number, quantidade: number, primeiroVencimento: string): Parcela[] {
  if (!Number.isInteger(quantidade) || quantidade < 2 || quantidade > 48) {
    throw new Error("O número de parcelas deve ser de 2 a 48.");
  }
  const totalCentavos = paraCentavos(valorTotal);
  if (totalCentavos < quantidade) {
    throw new Error("O valor é pequeno demais para tantas parcelas.");
  }
  const base = Math.floor(totalCentavos / quantidade);
  return Array.from({ length: quantidade }, (_, i) => {
    const ultima = i === quantidade - 1;
    const centavos = ultima ? totalCentavos - base * (quantidade - 1) : base;
    return {
      numero: i + 1,
      total: quantidade,
      valor: paraReais(centavos),
      vencimento: somarMeses(primeiroVencimento, i),
    };
  });
}

/** Valor efetivamente pago ou recebido (R12): valor + juros + multa − desconto. */
export function valorEfetivo(valor: number, juros = 0, multa = 0, desconto = 0): number {
  return paraReais(paraCentavos(valor) + paraCentavos(juros) + paraCentavos(multa) - paraCentavos(desconto));
}
