import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Configurações · Sobra Vida", robots: { index: false } };

const ITENS = [
  {
    href: "/configuracoes/pessoas",
    titulo: "Pessoas",
    texto: "Clientes e fornecedores: quem pagou você e a quem você pagou.",
  },
  {
    href: "/configuracoes/plano-de-contas",
    titulo: "Plano de contas",
    texto: "Grupos e categorias de receitas e despesas.",
  },
];

export default function PaginaConfiguracoes() {
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Configurações</h1>
      <ul className="flex flex-col gap-3">
        {ITENS.map((i) => (
          <li key={i.href}>
            <Link
              href={i.href}
              className="flex flex-col gap-1 rounded-xl border border-line bg-surface p-4 hover:border-muted focus-visible:outline-2 focus-visible:outline-accent"
            >
              <span className="font-semibold">{i.titulo}</span>
              <span className="text-sm text-muted">{i.texto}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
