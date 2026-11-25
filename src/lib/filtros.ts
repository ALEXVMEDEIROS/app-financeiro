// Filtros da lista de lançamentos (R9, primeira parte): tipo, só em aberto e busca.
// Tudo vem do endereço (?tipo=&aberto=1&busca=), para o filtro sobreviver a
// "voltar", recarregar e trocar de mês.

export type TipoFiltro = "receita" | "despesa" | "transferencia";

export type Filtros = {
  tipo?: TipoFiltro;
  aberto: boolean;
  busca: string;
};

const TIPOS: TipoFiltro[] = ["receita", "despesa", "transferencia"];

/** Lê e limpa os filtros do endereço; o que não for válido é ignorado. */
export function lerFiltros(p: { tipo?: string; aberto?: string; busca?: string }): Filtros {
  return {
    tipo: TIPOS.includes(p.tipo as TipoFiltro) ? (p.tipo as TipoFiltro) : undefined,
    aberto: p.aberto === "1",
    busca: (p.busca ?? "").replace(/\s+/g, " ").trim().slice(0, 60),
  };
}

export const temFiltro = (f: Filtros) => Boolean(f.tipo || f.aberto || f.busca);

/** Monta o "?mes=...&tipo=..." mantendo só o que está preenchido. */
export function enderecoComFiltros(mes: string | undefined, f: Filtros): string {
  const p = new URLSearchParams();
  if (mes) p.set("mes", mes);
  if (f.tipo) p.set("tipo", f.tipo);
  if (f.aberto) p.set("aberto", "1");
  if (f.busca) p.set("busca", f.busca);
  const texto = p.toString();
  return texto ? `?${texto}` : "";
}

/** Minúsculas e sem acento: "Padaria São José" → "padaria sao jose". */
export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Todas as palavras da busca precisam aparecer em algum dos textos. */
export function combinaBusca(busca: string, textos: (string | null | undefined)[]): boolean {
  const palavras = normalizar(busca).split(" ").filter(Boolean);
  if (palavras.length === 0) return true;
  const alvo = normalizar(textos.filter(Boolean).join(" "));
  return palavras.every((p) => alvo.includes(p));
}
