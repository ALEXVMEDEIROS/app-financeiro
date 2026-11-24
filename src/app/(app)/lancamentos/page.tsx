import type { Metadata } from "next";
import { EmConstrucao } from "@/components/em-construcao";

export const metadata: Metadata = { title: "Lançamentos · Sobra Vida", robots: { index: false } };

export default function PaginaLancamentos() {
  return (
    <EmConstrucao
      titulo="Lançamentos"
      texto="Aqui vão aparecer as receitas, despesas e transferências do mês, agrupadas por dia, com totais e filtros."
    />
  );
}
