import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { destinoSeguro } from "@/components/campo";
import { FormEntrar } from "./form-entrar";

export const metadata: Metadata = {
  title: "Entrar · Sobra Vida",
  robots: { index: false, follow: false },
};

// Quem já está logado é levado para dentro do app pelo proxy (src/proxy.ts),
// então esta página não precisa consultar o login antes de mostrar o formulário.
async function Conteudo({ searchParams }: { searchParams: Promise<{ proxima?: string; senha?: string }> }) {
  const params = await searchParams;
  const proxima = destinoSeguro(params.proxima);
  return (
    <>
      {params.senha === "alterada" && (
        <p className="rounded-lg bg-pos/10 px-3 py-2 text-sm text-pos" role="status">
          Senha alterada. Entre com a senha nova.
        </p>
      )}
      <FormEntrar proxima={proxima} />
    </>
  );
}

export default function PaginaEntrar({
  searchParams,
}: {
  searchParams: Promise<{ proxima?: string; senha?: string }>;
}) {
  return (
    <main className="flex flex-1 items-center px-4 py-12">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Link href="/" className="font-display text-lg font-extrabold tracking-tight">
            Sobra Vida
          </Link>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Entrar</h1>
        </div>
        <Suspense fallback={<FormEntrar proxima="/painel" />}>
          <Conteudo searchParams={searchParams} />
        </Suspense>
        <p className="text-center text-sm text-muted">
          Ainda não tem conta?{" "}
          <Link href="/cadastrar" className="font-semibold text-accent underline-offset-4 hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  );
}
