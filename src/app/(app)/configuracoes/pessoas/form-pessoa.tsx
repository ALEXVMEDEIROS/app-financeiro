"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AvisoErro, Campo } from "@/components/campo";
import { Ajuda } from "@/components/ui/ajuda";
import { Botao } from "@/components/ui/botao";
import { SelecaoAgrupada } from "@/components/ui/campos";
import { excluirPessoa, salvarPessoa, type EstadoExcluirPessoa, type EstadoPessoa } from "./acoes";

export type DadosPessoa = {
  id?: string;
  nome?: string;
  tipo?: string;
  documento?: string | null;
  contato?: string | null;
};

const TIPOS = [
  { valor: "fornecedor", rotulo: "Fornecedor (você paga a ele)" },
  { valor: "cliente", rotulo: "Cliente (ele paga você)" },
  { valor: "ambos", rotulo: "Os dois" },
];

const estilo = (erro?: string) =>
  `min-h-11 rounded-lg border bg-surface px-3 outline-none focus-visible:ring-2 focus-visible:ring-accent ${
    erro ? "border-neg" : "border-line"
  }`;

export function FormPessoa({ inicial }: { inicial: DadosPessoa }) {
  const [estado, acao, salvando] = useActionState(salvarPessoa, {} as EstadoPessoa);
  const editando = Boolean(inicial.id);
  const e = estado.erros ?? {};

  return (
    <form action={acao} noValidate className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
      {inicial.id && <input type="hidden" name="id" value={inicial.id} />}
      <Campo id="nome" rotulo="Nome" autoComplete="off" valorInicial={inicial.nome} erro={e.nome} />
      <SelecaoAgrupada
        id="tipo"
        rotulo="Tipo"
        grupos={[{ grupo: "", opcoes: TIPOS }]}
        valorInicial={inicial.tipo ?? "fornecedor"}
        erro={e.tipo}
        ajuda={
          <Ajuda titulo="Tipo">
            Fornecedor aparece nas despesas (&quot;Pago a&quot;); cliente, nas receitas (&quot;Recebido
            de&quot;). Se a pessoa aparecer nos dois, o Sobra Vida muda para &quot;Os dois&quot; sozinho.
          </Ajuda>
        }
      />
      <div className="flex flex-col gap-1.5">
        <span className="flex items-center gap-2">
          <label htmlFor="documento" className="text-sm font-semibold">
            CPF ou CNPJ <span className="font-normal text-muted">(opcional)</span>
          </label>
          <Ajuda titulo="CPF ou CNPJ">
            Só se for útil para você, por exemplo para conferir notas e recibos. O Sobra Vida não
            consulta nem envia esse dado a ninguém.
          </Ajuda>
        </span>
        <input
          id="documento"
          name="documento"
          inputMode="numeric"
          autoComplete="off"
          maxLength={20}
          defaultValue={inicial.documento ?? ""}
          aria-invalid={Boolean(e.documento)}
          className={`${estilo(e.documento)} tabular-nums`}
        />
        {e.documento && <p className="text-sm text-neg">{e.documento}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contato" className="text-sm font-semibold">
          Contato <span className="font-normal text-muted">(opcional)</span>
        </label>
        <input
          id="contato"
          name="contato"
          autoComplete="off"
          maxLength={200}
          placeholder="Telefone, e-mail ou observação"
          defaultValue={inicial.contato ?? ""}
          aria-invalid={Boolean(e.contato)}
          className={estilo(e.contato)}
        />
        {e.contato && <p className="text-sm text-neg">{e.contato}</p>}
      </div>
      <AvisoErro mensagem={estado.mensagem} />
      <div className="flex flex-wrap gap-3 pt-2">
        <Botao type="submit" disabled={salvando}>
          {salvando ? "Salvando…" : editando ? "Salvar alterações" : "Cadastrar pessoa"}
        </Botao>
        <Link
          href="/configuracoes/pessoas"
          className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 font-semibold"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

/** Exclusão em dois passos, para evitar clique acidental. */
export function ExcluirPessoa({ id }: { id: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const [estado, acao, excluindo] = useActionState(excluirPessoa, {} as EstadoExcluirPessoa);

  if (!confirmando) {
    return (
      <Botao variante="secundario" onClick={() => setConfirmando(true)}>
        Excluir pessoa
      </Botao>
    );
  }
  return (
    <form action={acao} className="flex flex-col gap-3 rounded-xl border border-neg/40 bg-neg/5 p-4">
      <input type="hidden" name="id" value={id} />
      <p className="font-semibold">Excluir esta pessoa de vez?</p>
      <p className="text-sm text-muted">
        Só é possível excluir quem não aparece em nenhum lançamento. Se já foi usada, desative.
      </p>
      <AvisoErro mensagem={estado.mensagem} />
      <div className="flex flex-wrap gap-3">
        <Botao type="submit" variante="perigo" disabled={excluindo}>
          {excluindo ? "Excluindo…" : "Sim, excluir"}
        </Botao>
        <Botao variante="secundario" onClick={() => setConfirmando(false)}>
          Não excluir
        </Botao>
      </div>
    </form>
  );
}
