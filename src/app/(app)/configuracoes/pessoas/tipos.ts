// Nomes dos tipos de pessoa, usados na lista (servidor) e no formulário.
export const NOME_TIPO_PESSOA: Record<string, string> = {
  cliente: "Cliente",
  fornecedor: "Fornecedor",
  ambos: "Cliente e fornecedor",
};

/** Siglas dos estados, em ordem alfabética (a mesma lista que o banco aceita). */
export const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA",
  "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
];

/** "60150160" → "60150-160". */
export const formatarCep = (cep: string) => (cep.length === 8 ? `${cep.slice(0, 5)}-${cep.slice(5)}` : cep);

type Endereco = {
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cep?: string | null;
  cidade?: string | null;
  uf?: string | null;
};

/** Endereço em até duas linhas: "Rua X, 100 · Ap 2 · Centro" e "Fortaleza/CE · CEP 60150-160". */
export function linhasDoEndereco(e: Endereco): string[] {
  const rua = [e.logradouro, e.numero].filter(Boolean).join(", ");
  const linha1 = [rua, e.complemento, e.bairro].filter(Boolean).join(" · ");
  const lugar = [e.cidade, e.uf].filter(Boolean).join("/");
  const linha2 = [lugar, e.cep ? `CEP ${formatarCep(e.cep)}` : ""].filter(Boolean).join(" · ");
  return [linha1, linha2].filter(Boolean);
}
