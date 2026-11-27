/** Endereço do detalhe de um valor do Resultado do ano (mês 1 a 12; categoria opcional). */
export function linkDetalhe(base: string, mes: number, grupo: string, categoria?: string) {
  return `${base}&mes=${mes}&grupo=${encodeURIComponent(grupo)}${categoria ? `&categoria=${encodeURIComponent(categoria)}` : ""}`;
}
