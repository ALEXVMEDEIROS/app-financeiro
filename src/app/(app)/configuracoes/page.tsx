import type { Metadata } from "next";
import { EmConstrucao } from "@/components/em-construcao";

export const metadata: Metadata = { title: "Configurações · Sobra Vida", robots: { index: false } };

export default function PaginaConfiguracoes() {
  return (
    <EmConstrucao
      titulo="Configurações"
      texto="Aqui você vai ajustar seu plano de contas: criar, renomear e desativar grupos e categorias."
    />
  );
}
