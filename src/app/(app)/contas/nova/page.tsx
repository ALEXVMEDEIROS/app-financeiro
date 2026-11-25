import type { Metadata } from "next";
import { EmConstrucao } from "@/components/em-construcao";

export const metadata: Metadata = { title: "Nova conta · Sobra Vida", robots: { index: false } };

export default function PaginaNovaConta() {
  return (
    <EmConstrucao
      titulo="Nova conta"
      texto="Aqui você vai informar o nome da conta, o tipo (banco, corretora, carteira ou caixa) e o saldo de hoje."
    />
  );
}
