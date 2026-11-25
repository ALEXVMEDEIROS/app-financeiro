"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

// Menu da área logada. No computador fica no cabeçalho; no celular vira uma
// barra fixa no rodapé, com o botão "+" (novo lançamento) no meio.

type Item = { href: string; rotulo: string; icone: React.ReactNode };

const traco = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const ITENS: Item[] = [
  {
    href: "/painel",
    rotulo: "Painel",
    icone: <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true"><path {...traco} d="M3 11.5 12 4l9 7.5M5.5 10v10h13V10" /></svg>,
  },
  {
    href: "/lancamentos",
    rotulo: "Lançamentos",
    icone: <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true"><path {...traco} d="M4 6h16M4 12h16M4 18h10" /></svg>,
  },
  {
    href: "/contas",
    rotulo: "Contas",
    icone: <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true"><rect {...traco} x="3" y="6" width="18" height="13" rx="2" /><path {...traco} d="M3 10h18M15.5 15h2.5" /></svg>,
  },
  {
    href: "/configuracoes",
    rotulo: "Ajustes",
    icone: <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true"><circle {...traco} cx="12" cy="12" r="3" /><path {...traco} d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" /></svg>,
  },
];

function ativo(caminho: string, href: string) {
  return caminho === href || caminho.startsWith(`${href}/`);
}

// O endereço atual (usePathname) só é conhecido na hora do acesso. Enquanto isso,
// o menu aparece sem item destacado (fallback do Suspense); o Next.js exige isso
// em páginas com parte variável no endereço, como /contas/[id].

/** Menu do cabeçalho (computador e tablet). */
export function MenuPrincipal() {
  return (
    <Suspense fallback={<MenuVisual caminho="" />}>
      <MenuComEndereco />
    </Suspense>
  );
}

function MenuComEndereco() {
  return <MenuVisual caminho={usePathname()} />;
}

function MenuVisual({ caminho }: { caminho: string }) {
  return (
    <nav aria-label="Principal" className="hidden items-center gap-1 sm:flex">
      {ITENS.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={ativo(caminho, i.href) ? "page" : undefined}
          className={`rounded-lg px-3 py-2 text-sm font-semibold ${
            ativo(caminho, i.href) ? "bg-accent/10 text-accent" : "text-muted hover:text-fg"
          }`}
        >
          {i.href === "/configuracoes" ? "Configurações" : i.rotulo}
        </Link>
      ))}
    </nav>
  );
}

/** Botão "Novo lançamento" do cabeçalho (computador e tablet). */
export function BotaoNovoCabecalho() {
  return (
    <Link
      href="/lancamentos/novo"
      className="hidden min-h-10 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-bg sm:inline-flex"
    >
      + Novo lançamento
    </Link>
  );
}

/** Barra fixa no rodapé do celular, com o "+" no meio. */
export function BarraInferior() {
  return (
    <Suspense fallback={<BarraVisual caminho="" />}>
      <BarraComEndereco />
    </Suspense>
  );
}

function BarraComEndereco() {
  return <BarraVisual caminho={usePathname()} />;
}

function BarraVisual({ caminho }: { caminho: string }) {
  const [a, b, c, d] = ITENS;
  const link = (i: Item) => (
    <Link
      key={i.href}
      href={i.href}
      aria-current={ativo(caminho, i.href) ? "page" : undefined}
      className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
        ativo(caminho, i.href) ? "text-accent" : "text-muted"
      }`}
    >
      {i.icone}
      {i.rotulo}
    </Link>
  );
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-20 flex items-center border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      {link(a)}
      {link(b)}
      <div className="flex flex-1 justify-center">
        <Link
          href="/lancamentos/novo"
          aria-label="Novo lançamento"
          className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-3xl leading-none text-bg shadow-lg"
        >
          +
        </Link>
      </div>
      {link(c)}
      {link(d)}
    </nav>
  );
}
