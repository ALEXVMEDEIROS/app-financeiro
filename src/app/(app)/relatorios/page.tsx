import type { Metadata } from "next";
import Link from "next/link";
import { RELATORIOS } from "./abas";

export const metadata: Metadata = { title: "Relatórios · Sobra Vida", robots: { index: false } };

export default function PaginaRelatorios() {
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Relatórios</h1>
      <ul className="flex flex-col gap-3">
        {RELATORIOS.map((r) => (
          <li key={r.href}>
            <Link
              href={r.href}
              className="flex flex-col gap-1 rounded-xl border border-line bg-surface p-4 hover:border-muted focus-visible:outline-2 focus-visible:outline-accent"
            >
              <span className="font-semibold">{r.rotulo}</span>
              <span className="text-sm text-muted">{r.texto}</span>
            </Link>
          </li>
        ))}
        <li>
          <Link
            href="/contas"
            className="flex flex-col gap-1 rounded-xl border border-line bg-surface p-4 hover:border-muted focus-visible:outline-2 focus-visible:outline-accent"
          >
            <span className="font-semibold">Extrato por conta</span>
            <span className="text-sm text-muted">Em Contas, toque numa conta para ver os movimentos com o saldo acumulado.</span>
          </Link>
        </li>
      </ul>
    </div>
  );
}
