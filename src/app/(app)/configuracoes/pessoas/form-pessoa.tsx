"use client";

import Link from "next/link";
import { useActionState, useState, type InputHTMLAttributes } from "react";
import { AvisoErro, Campo } from "@/components/campo";
import { Ajuda } from "@/components/ui/ajuda";
import { Botao } from "@/components/ui/botao";
import { SelecaoAgrupada } from "@/components/ui/campos";
import { excluirPessoa, salvarPessoa, type EstadoExcluirPessoa, type EstadoPessoa } from "./acoes";
import { formatarCep, UFS } from "./tipos";

export type DadosPessoa = {
  id?: string;
  nome?: string;
  tipo?: string;
  documento?: string | null;
  contato?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cep?: string | null;
  cidade?: string | null;
  uf?: string | null;
  descricao?: string | null;
};

const LIMITE_DESCRICAO = 1000;

/** Campo de texto simples e opcional, com mensagem de erro embaixo. */
function CampoTexto({
  id,
  rotulo,
  valor,
  erro,
  maximo,
  className = "",
  ...resto
}: {
  id: string;
  rotulo: string;
  valor?: string | null;
  erro?: string;
  maximo: number;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className">) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-semibold">{rotulo}</label>
      <input
        id={id}
        name={id}
        autoComplete="off"
        maxLength={maximo}
        defaultValue={valor ?? ""}
        aria-invalid={Boolean(erro)}
        className={estilo(erro)}
        {...resto}
      />
      {erro && <p className="text-sm text-neg">{erro}</p>}
    </div>
  );
}

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
  // Depois de um erro valem os valores devolvidos; senão, os da pessoa em edição.
  const v: DadosPessoa = estado.valores ? { ...inicial, ...estado.valores } : inicial;
  const [tamanhoDescricao, setTamanhoDescricao] = useState((v.descricao ?? "").length);
  // O endereço fica recolhido; abre se já estiver preenchido ou se o erro estiver lá dentro.
  const abrirEndereco =
    Boolean(v.logradouro || v.numero || v.complemento || v.bairro) ||
    Boolean(v.cep || v.cidade || v.uf) ||
    Boolean(e.logradouro || e.numero || e.complemento || e.bairro || e.cep || e.cidade || e.uf);

  return (
    <form action={acao} noValidate className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
      {inicial.id && <input type="hidden" name="id" value={inicial.id} />}
      <Campo id="nome" rotulo="Nome" autoComplete="off" valorInicial={v.nome} erro={e.nome} />
      <SelecaoAgrupada
        id="tipo"
        rotulo="Tipo"
        grupos={[{ grupo: "", opcoes: TIPOS }]}
        valorInicial={v.tipo ?? "fornecedor"}
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
          defaultValue={v.documento ?? ""}
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
          defaultValue={v.contato ?? ""}
          aria-invalid={Boolean(e.contato)}
          className={estilo(e.contato)}
        />
        {e.contato && <p className="text-sm text-neg">{e.contato}</p>}
      </div>
      <details open={abrirEndereco || undefined} className="rounded-lg border border-line p-3">
        <summary className="cursor-pointer text-sm font-semibold text-accent">
          Endereço <span className="font-normal text-muted">(opcional)</span>
        </summary>
        <div className="mt-3 grid grid-cols-6 gap-3">
          <CampoTexto
            id="cep"
            rotulo="CEP"
            valor={v.cep ? formatarCep(v.cep) : ""}
            erro={e.cep}
            maximo={10}
            inputMode="numeric"
            placeholder="00000-000"
            className="col-span-3 sm:col-span-2"
          />
          <div className="col-span-6 hidden sm:col-span-4 sm:block" />
          <CampoTexto
            id="logradouro"
            rotulo="Rua"
            valor={v.logradouro}
            erro={e.logradouro}
            maximo={150}
            placeholder="Rua, avenida, travessa…"
            className="col-span-6 sm:col-span-4"
          />
          <CampoTexto
            id="numero"
            rotulo="Número"
            valor={v.numero}
            erro={e.numero}
            maximo={20}
            placeholder="123 ou s/n"
            className="col-span-2 sm:col-span-2"
          />
          <CampoTexto
            id="complemento"
            rotulo="Complemento"
            valor={v.complemento}
            erro={e.complemento}
            maximo={80}
            placeholder="Apto, sala, bloco"
            className="col-span-4 sm:col-span-3"
          />
          <CampoTexto
            id="bairro"
            rotulo="Bairro"
            valor={v.bairro}
            erro={e.bairro}
            maximo={80}
            className="col-span-6 sm:col-span-3"
          />
          <CampoTexto
            id="cidade"
            rotulo="Cidade"
            valor={v.cidade}
            erro={e.cidade}
            maximo={80}
            className="col-span-4"
          />
          <div className="col-span-2 flex flex-col gap-1.5">
            <label htmlFor="uf" className="text-sm font-semibold">Estado</label>
            <select
              id="uf"
              name="uf"
              defaultValue={v.uf ?? ""}
              aria-invalid={Boolean(e.uf)}
              className={estilo(e.uf)}
            >
              <option value="">—</option>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
            {e.uf && <p className="text-sm text-neg">{e.uf}</p>}
          </div>
        </div>
      </details>
      <div className="flex flex-col gap-1.5">
        <span className="flex items-center gap-2">
          <label htmlFor="descricao" className="text-sm font-semibold">
            Descrição <span className="font-normal text-muted">(opcional)</span>
          </label>
          <Ajuda titulo="Descrição">
            Anotações sobre a pessoa: quem é, o que ela faz para você, combinados, horários. Até{" "}
            {LIMITE_DESCRICAO} caracteres.
          </Ajuda>
        </span>
        <textarea
          id="descricao"
          name="descricao"
          rows={4}
          maxLength={LIMITE_DESCRICAO}
          defaultValue={v.descricao ?? ""}
          onChange={(ev) => setTamanhoDescricao(ev.target.value.length)}
          aria-invalid={Boolean(e.descricao)}
          aria-describedby="descricao-contador"
          className={`${estilo(e.descricao)} py-2`}
        />
        <p id="descricao-contador" className="text-right text-xs text-muted" aria-live="polite">
          {tamanhoDescricao} de {LIMITE_DESCRICAO}
        </p>
        {e.descricao && <p className="text-sm text-neg">{e.descricao}</p>}
      </div>
      <AvisoErro mensagem={estado.mensagem} />
      <div className="flex flex-wrap gap-3 pt-2">
        <Botao type="submit" disabled={salvando}>
          {salvando ? "Salvando…" : editando ? "Salvar alterações" : "Cadastrar pessoa"}
        </Botao>
        <Link
          href={inicial.id ? `/configuracoes/pessoas/${inicial.id}` : "/configuracoes/pessoas"}
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
