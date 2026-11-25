import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Botao } from "@/components/ui/botao";
import { hojeEmSaoPaulo } from "@/lib/datas";
import { createClient } from "@/lib/supabase/server";
import { alternarAtiva } from "../acoes";
import { ExcluirConta, FormConta } from "../form-conta";
import { instituicoesDoUsuario } from "../instituicoes";

export const metadata: Metadata = { title: "Editar conta · Sobra Vida", robots: { index: false } };

async function Edicao({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const supabase = await createClient();
  const { data: conta } = await supabase
    .from("contas_financeiras")
    .select("id, instituicao, nome, tipo, saldo_inicial, data_saldo_inicial, ativa")
    .eq("id", id)
    .maybeSingle();

  // A proteção por usuário faz a conta de outra pessoa simplesmente não aparecer.
  if (!conta) notFound();

  const alternar = alternarAtiva.bind(null, conta.id, !conta.ativa);
  const instituicoes = await instituicoesDoUsuario();

  return (
    <div className="flex flex-col gap-6">
      {!conta.ativa && (
        <p className="rounded-lg bg-warn/10 px-3 py-2 text-sm" role="status">
          Esta conta está desativada: ela não aparece nas listas de escolha nem soma nos totais.
        </p>
      )}
      <FormConta
        hoje={hojeEmSaoPaulo()}
        instituicoes={instituicoes}
        inicial={{
          id: conta.id,
          instituicao: conta.instituicao,
          nome: conta.nome,
          tipo: conta.tipo,
          saldo: Number(conta.saldo_inicial),
          data: conta.data_saldo_inicial,
        }}
      />
      <section className="flex flex-col gap-3 rounded-xl border border-line p-5">
        <h2 className="font-display text-lg font-bold">{conta.ativa ? "Desativar" : "Reativar"}</h2>
        <p className="text-sm text-muted">
          {conta.ativa
            ? "Use quando a conta não for mais usada. O histórico continua nos relatórios."
            : "A conta volta a aparecer nas listas e a somar nos totais."}
        </p>
        <form action={alternar}>
          <Botao type="submit" variante="secundario">
            {conta.ativa ? "Desativar conta" : "Reativar conta"}
          </Botao>
        </form>
      </section>
      <ExcluirConta id={conta.id} />
    </div>
  );
}

export default function PaginaEditarConta({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Editar conta</h1>
      <Suspense fallback={<p className="text-muted">Carregando…</p>}>
        <Edicao params={params} />
      </Suspense>
    </div>
  );
}
