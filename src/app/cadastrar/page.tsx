import type { Metadata } from "next";
import Link from "next/link";
import { FormCadastro } from "./form-cadastro";

export const metadata: Metadata = {
  title: "Criar conta · Sobra Vida",
  // Fase de testes: a página não deve aparecer em buscadores.
  robots: { index: false, follow: false },
};

export default function PaginaCadastrar() {
  return (
    <main className="flex flex-1 items-center px-4 py-12">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Link href="/" className="font-display text-lg font-extrabold tracking-tight">
            Sobra Vida
          </Link>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Criar sua conta</h1>
          <p className="text-muted">
            Você recebe o plano de contas pronto e pode ajustar depois.
          </p>
        </div>
        <FormCadastro />
        <p className="text-center text-sm text-muted">
          Já tem conta?{" "}
          <Link href="/entrar" className="font-semibold text-accent underline-offset-4 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
