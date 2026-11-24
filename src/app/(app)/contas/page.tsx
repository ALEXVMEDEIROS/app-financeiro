import type { Metadata } from "next";
import { EmConstrucao } from "@/components/em-construcao";

export const metadata: Metadata = { title: "Contas · Sobra Vida", robots: { index: false } };

export default function PaginaContas() {
  return (
    <EmConstrucao
      titulo="Contas"
      texto="Aqui vão aparecer seus bancos, corretoras, carteira e caixa, com o saldo de hoje e o previsto para o fim do mês."
    />
  );
}
