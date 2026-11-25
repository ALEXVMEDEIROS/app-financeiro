"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AvisoErro, Campo } from "@/components/campo";
import { Ajuda } from "@/components/ui/ajuda";
import { Botao } from "@/components/ui/botao";
import { CampoData, CampoValor, SelecaoAgrupada } from "@/components/ui/campos";
import { excluirConta, salvarConta, type EstadoConta, type EstadoExcluir } from "./acoes";

export type DadosConta = {
  id?: string;
  nome?: string;
  tipo?: string;
  saldo?: number;
  data?: string;
};

const TIPOS = [
  { valor: "banco", rotulo: "Banco (conta corrente ou poupança)" },
  { valor: "corretora", rotulo: "Corretora (investimentos)" },
  { valor: "carteira", rotulo: "Carteira (dinheiro com você)" },
  { valor: "caixa", rotulo: "Caixa (dinheiro guardado, como o do escritório)" },
];

export function FormConta({ inicial, hoje }: { inicial: DadosConta; hoje: string }) {
  const [estado, acao, salvando] = useActionState(salvarConta, {} as EstadoConta);
  const editando = Boolean(inicial.id);

  return (
    <form action={acao} noValidate className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
      {inicial.id && <input type="hidden" name="id" value={inicial.id} />}
      <Campo
        id="nome"
        rotulo="Nome da conta"
        autoComplete="off"
        valorInicial={inicial.nome}
        erro={estado.erros?.nome}
        dica="Ex.: Itaú, Nubank, Poupança, Carteira."
      />
      <SelecaoAgrupada
        id="tipo"
        rotulo="Tipo"
        grupos={[{ grupo: "", opcoes: TIPOS }]}
        valorInicial={inicial.tipo}
        erro={estado.erros?.tipo}
      />
      <CampoValor
        id="saldo"
        rotulo={editando ? "Saldo inicial" : "Saldo de hoje"}
        valorInicial={inicial.saldo}
        erro={estado.erros?.saldo}
        dica="Se a conta estiver no negativo, digite o sinal de menos: -150,00."
        ajuda={
          <Ajuda titulo="Saldo inicial">
            O valor que a conta tinha na data abaixo. Daí em diante, o Sobra Vida soma e subtrai os
            lançamentos. Lançamentos anteriores a essa data não mudam o saldo.
          </Ajuda>
        }
      />
      <CampoData
        id="data"
        rotulo="Data do saldo"
        valorInicial={inicial.data ?? hoje}
        erro={estado.erros?.data}
      />
      <AvisoErro mensagem={estado.mensagem} />
      <div className="flex flex-wrap gap-3 pt-2">
        <Botao type="submit" disabled={salvando}>
          {salvando ? "Salvando…" : editando ? "Salvar alterações" : "Cadastrar conta"}
        </Botao>
        <Link href="/contas" className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 font-semibold">
          Cancelar
        </Link>
      </div>
    </form>
  );
}

/** Exclusão em dois passos, para evitar clique acidental. */
export function ExcluirConta({ id }: { id: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const [estado, acao, excluindo] = useActionState(excluirConta, {} as EstadoExcluir);

  if (!confirmando) {
    return (
      <Botao variante="secundario" onClick={() => setConfirmando(true)}>
        Excluir conta
      </Botao>
    );
  }
  return (
    <form action={acao} className="flex flex-col gap-3 rounded-xl border border-neg/40 bg-neg/5 p-4">
      <input type="hidden" name="id" value={id} />
      <p className="font-semibold">Excluir esta conta de vez?</p>
      <p className="text-sm text-muted">
        Só é possível excluir contas sem lançamentos. Se ela já foi usada, desative-a.
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
