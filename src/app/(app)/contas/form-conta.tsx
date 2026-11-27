"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AvisoErro, Campo } from "@/components/campo";
import { Ajuda } from "@/components/ui/ajuda";
import { Botao } from "@/components/ui/botao";
import { CampoData, CampoValor, SelecaoAgrupada } from "@/components/ui/campos";
import { codigoDoBanco } from "@/lib/bancos";
import { excluirConta, salvarConta, type EstadoConta, type EstadoExcluir } from "./acoes";

export type DadosConta = {
  id?: string;
  instituicao?: string | null;
  codigo_banco?: string | null;
  agencia?: string | null;
  numero_conta?: string | null;
  nome?: string;
  tipo?: string;
  saldo?: number;
  data?: string;
};

const TIPOS = [
  { valor: "banco", rotulo: "Banco (conta corrente ou poupança)" },
  { valor: "corretora", rotulo: "Investimentos (fundo, CDB, corretora)" },
  { valor: "carteira", rotulo: "Carteira (dinheiro com você)" },
  { valor: "caixa", rotulo: "Caixa (dinheiro guardado, como o do escritório)" },
];

export function FormConta({
  inicial,
  hoje,
  instituicoes = [],
}: {
  inicial: DadosConta;
  hoje: string;
  instituicoes?: string[];
}) {
  const [estado, acao, salvando] = useActionState(salvarConta, {} as EstadoConta);
  const editando = Boolean(inicial.id);
  const erroInstituicao = estado.erros?.instituicao;
  const [codigo, setCodigo] = useState(inicial.codigo_banco ?? "");
  const temDadosBancarios = Boolean(
    inicial.codigo_banco || inicial.agencia || inicial.numero_conta ||
      estado.erros?.codigo_banco || estado.erros?.agencia || estado.erros?.numero_conta,
  );

  return (
    <form action={acao} noValidate className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
      {inicial.id && <input type="hidden" name="id" value={inicial.id} />}
      <div className="flex flex-col gap-1.5">
        <span className="flex items-center gap-2">
          <label htmlFor="instituicao" className="text-sm font-semibold">
            Instituição <span className="font-normal text-muted">(opcional)</span>
          </label>
          <Ajuda titulo="Instituição">
            O banco ou a corretora, como Santander ou XP. Contas da mesma instituição aparecem
            juntas, com o subtotal do banco. Deixe em branco para carteira e caixa.
          </Ajuda>
        </span>
        <input
          id="instituicao"
          name="instituicao"
          list="instituicoes-existentes"
          autoComplete="off"
          defaultValue={inicial.instituicao ?? ""}
          onBlur={(e) => {
            // Sugere o código do banco se ainda estiver vazio.
            if (!codigo) setCodigo(codigoDoBanco(e.target.value) ?? "");
          }}
          placeholder="Ex.: Santander"
          aria-invalid={Boolean(erroInstituicao)}
          aria-describedby={erroInstituicao ? "instituicao-ajuda" : undefined}
          className={`min-h-11 rounded-lg border bg-surface px-3 outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            erroInstituicao ? "border-neg" : "border-line"
          }`}
        />
        <datalist id="instituicoes-existentes">
          {instituicoes.map((i) => (
            <option key={i} value={i} />
          ))}
        </datalist>
        {erroInstituicao && (
          <p id="instituicao-ajuda" className="text-sm text-neg">{erroInstituicao}</p>
        )}
      </div>
      <details open={temDadosBancarios} className="rounded-lg border border-line p-3">
        <summary className="cursor-pointer text-sm font-semibold text-accent">
          Dados bancários <span className="font-normal text-muted">(opcional)</span>
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <CampoTexto
            id="codigo_banco"
            rotulo="Código do banco"
            valor={codigo}
            aoMudar={setCodigo}
            placeholder="033"
            maxLength={3}
            erro={estado.erros?.codigo_banco}
          />
          <CampoTexto
            id="agencia"
            rotulo="Agência"
            valorInicial={inicial.agencia ?? ""}
            placeholder="1234"
            maxLength={10}
            erro={estado.erros?.agencia}
          />
          <CampoTexto
            id="numero_conta"
            rotulo="Número da conta"
            valorInicial={inicial.numero_conta ?? ""}
            placeholder="01234567-8"
            maxLength={20}
            erro={estado.erros?.numero_conta}
          />
        </div>
        <p className="mt-2 text-xs text-muted">
          Só para identificar a conta. O Sobra Vida não acessa o banco nem movimenta dinheiro.
        </p>
      </details>
      <Campo
        id="nome"
        rotulo="Nome da conta"
        autoComplete="off"
        valorInicial={inicial.nome}
        erro={estado.erros?.nome}
        dica="Ex.: Conta corrente, Fundo DI, Poupança, Carteira."
      />
      <SelecaoAgrupada
        id="tipo"
        rotulo="Tipo"
        grupos={[{ grupo: "", opcoes: TIPOS }]}
        valorInicial={inicial.tipo}
        erro={estado.erros?.tipo}
        ajuda={
          <Ajuda titulo="Tipo da conta">
            Ajuda a separar o dinheiro do dia a dia (banco, carteira, caixa) do que está investido.
            No patrimônio, as contas de investimento aparecem à parte.
          </Ajuda>
        }
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
        ajuda={
          <Ajuda titulo="Data do saldo">
            O dia em que a conta tinha o saldo informado acima. Use a data do extrato que você
            consultou. Só os lançamentos a partir desse dia mexem no saldo.
          </Ajuda>
        }
      />
      <AvisoErro mensagem={estado.mensagem} />
      <div className="flex flex-wrap gap-3 pt-2">
        <Botao type="submit" disabled={salvando}>
          {salvando ? "Salvando…" : editando ? "Salvar alterações" : "Cadastrar conta"}
        </Botao>
        <Link href={inicial.id ? `/contas/${inicial.id}` : "/contas"} className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 font-semibold">
          Cancelar
        </Link>
      </div>
    </form>
  );
}

/** Campo curto numérico (código, agência, conta), com teclado numérico no celular. */
function CampoTexto({
  id,
  rotulo,
  valor,
  valorInicial,
  aoMudar,
  placeholder,
  maxLength,
  erro,
}: {
  id: string;
  rotulo: string;
  valor?: string;
  valorInicial?: string;
  aoMudar?: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  erro?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">{rotulo}</label>
      <input
        id={id}
        name={id}
        inputMode="numeric"
        autoComplete="off"
        {...(aoMudar ? { value: valor, onChange: (e) => aoMudar(e.target.value) } : { defaultValue: valorInicial })}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={Boolean(erro)}
        aria-describedby={erro ? `${id}-ajuda` : undefined}
        className={`min-h-11 w-full rounded-lg border bg-surface px-3 tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          erro ? "border-neg" : "border-line"
        }`}
      />
      {erro && <p id={`${id}-ajuda`} className="text-sm text-neg">{erro}</p>}
    </div>
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
