import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { hojeEmSaoPaulo } from "@/lib/datas";
import { FormConta } from "../form-conta";
import { instituicoesDoUsuario } from "../instituicoes";

export const metadata: Metadata = { title: "Nova conta · Sobra Vida", robots: { index: false } };

async function Formulario() {
  await connection();
  const instituicoes = await instituicoesDoUsuario();
  return <FormConta inicial={{}} hoje={hojeEmSaoPaulo()} instituicoes={instituicoes} />;
}

export default function PaginaNovaConta() {
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Nova conta</h1>
      <p className="text-muted">Informe o saldo de hoje. Os lançamentos vão atualizá-lo daqui para frente.</p>
      <Suspense fallback={<p className="text-muted">Carregando…</p>}>
        <Formulario />
      </Suspense>
    </div>
  );
}
