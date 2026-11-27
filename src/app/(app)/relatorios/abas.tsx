import Link from "next/link";

// Atalhos entre os relatórios, no topo de cada um.
export const RELATORIOS = [
  {
    href: "/relatorios/resultado",
    rotulo: "Resultado do ano",
    texto: "Receitas e despesas de cada mês por grupo e categoria, realizado ou previsto, e a lucratividade.",
  },
  {
    href: "/relatorios/fluxo",
    rotulo: "Fluxo de caixa",
    texto: "O saldo dia a dia no mês, com o que já aconteceu e o que está previsto, de todas as contas ou de uma.",
  },
  {
    href: "/relatorios/juros",
    rotulo: "Juros e multas",
    texto: "Quanto os atrasos custaram no ano, de onde vieram e os descontos obtidos.",
  },
] as const;

export function AbasRelatorios({ atual }: { atual: (typeof RELATORIOS)[number]["href"] }) {
  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto px-4" aria-label="Relatórios">
      {RELATORIOS.map((r) => (
        <Link
          key={r.href}
          href={r.href}
          aria-current={r.href === atual ? "page" : undefined}
          className={`flex min-h-10 shrink-0 items-center rounded-full px-3 text-sm font-semibold ${
            r.href === atual ? "bg-accent/10 text-accent" : "text-muted hover:text-fg"
          }`}
        >
          {r.rotulo}
        </Link>
      ))}
    </nav>
  );
}
