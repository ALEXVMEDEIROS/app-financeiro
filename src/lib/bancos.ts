// Códigos COMPE dos bancos mais comuns, para sugerir o código a partir do nome
// da instituição. Usado só como sugestão: o usuário pode corrigir.
const BANCOS: [string[], string][] = [
  [["banco do brasil", "bb", "brasil"], "001"],
  [["santander"], "033"],
  [["banrisul"], "041"],
  [["inter", "banco inter"], "077"],
  [["xp", "xp investimentos"], "102"],
  [["caixa", "caixa economica", "caixa econômica", "cef"], "104"],
  [["btg", "btg pactual"], "208"],
  [["original", "banco original"], "212"],
  [["bradesco"], "237"],
  [["nubank", "nu"], "260"],
  [["pagbank", "pagseguro"], "290"],
  [["mercado pago"], "323"],
  [["c6", "c6 bank"], "336"],
  [["itau", "itaú", "itau unibanco", "itaú unibanco"], "341"],
  [["safra"], "422"],
  [["sicredi"], "748"],
  [["sicoob"], "756"],
];

/** Código do banco para o nome digitado, ou null se não reconhecer. */
export function codigoDoBanco(instituicao: string): string | null {
  const nome = instituicao.trim().toLowerCase();
  if (!nome) return null;
  for (const [nomes, codigo] of BANCOS) {
    if (nomes.includes(nome)) return codigo;
  }
  return null;
}

/** Linha curta para exibir: "Banco 033 · Ag. 1234 · Conta 01234-5". */
export function resumoDadosBancarios(d: {
  codigo_banco?: string | null;
  agencia?: string | null;
  numero_conta?: string | null;
}): string {
  return [
    d.codigo_banco && `Banco ${d.codigo_banco}`,
    d.agencia && `Ag. ${d.agencia}`,
    d.numero_conta && `Conta ${d.numero_conta}`,
  ]
    .filter(Boolean)
    .join(" · ");
}
