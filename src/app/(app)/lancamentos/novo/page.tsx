import type { Metadata } from "next";
import { EmConstrucao } from "@/components/em-construcao";

export const metadata: Metadata = { title: "Novo lançamento · Sobra Vida", robots: { index: false } };

export default function PaginaNovoLancamento() {
  return (
    <EmConstrucao
      titulo="Novo lançamento"
      texto="Aqui vai ficar o lançamento rápido: tipo, valor, categoria, conta, data e se já foi pago."
    />
  );
}
