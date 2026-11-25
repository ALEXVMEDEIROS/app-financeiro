// Juros, multa e desconto informados em percentual (R12).
// O banco guarda sempre o valor em reais; o percentual só ajuda a calcular.

const centavos = (v: number) => Math.round(v * 100) / 100;

/** Dias corridos entre duas datas ISO (b − a); zero se b não for depois de a. */
export function diasDeAtraso(vencimento: string, pagamento: string): number {
  const ms = Date.parse(`${pagamento}T00:00:00Z`) - Date.parse(`${vencimento}T00:00:00Z`);
  return Number.isFinite(ms) && ms > 0 ? Math.round(ms / 86_400_000) : 0;
}

/** Percentual simples sobre o valor: multa de 2% sobre R$ 150,00 = R$ 3,00. */
export function valorDoPercentual(valor: number, percentual: number): number {
  return centavos((valor * percentual) / 100);
}

/**
 * Juros de mora "% ao mês", proporcionais aos dias de atraso (mês de 30 dias),
 * como nos boletos: 1% ao mês sobre R$ 300,00 com 15 dias = R$ 1,50.
 */
export function jurosAoMes(valor: number, percentualAoMes: number, dias: number): number {
  return centavos((valor * percentualAoMes * dias) / 3000);
}
