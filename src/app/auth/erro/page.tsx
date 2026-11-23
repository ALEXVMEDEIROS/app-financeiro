import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Link inválido · Sobra Vida",
  robots: { index: false, follow: false },
};

export default function PaginaErroAuth() {
  return (
    <main className="flex flex-1 items-center px-4 py-12">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <Link href="/" className="font-display text-lg font-extrabold tracking-tight">
          Sobra Vida
        </Link>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          Este link não funcionou
        </h1>
        <p className="text-muted">
          O link pode ter expirado, já ter sido usado ou ter sido copiado pela metade. Links de
          confirmação valem por pouco tempo e funcionam uma vez só.
        </p>
        <p className="text-muted">
          Se você já confirmou o e-mail, é só entrar. Se não, faça o cadastro de novo para receber
          um link novo.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/entrar" className="rounded-lg bg-accent px-4 py-2.5 font-semibold text-bg">
            Entrar
          </Link>
          <Link href="/cadastrar" className="rounded-lg border border-line px-4 py-2.5 font-semibold">
            Cadastrar de novo
          </Link>
        </div>
      </div>
    </main>
  );
}
