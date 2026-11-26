"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { AvisoErro } from "@/components/campo";
import { Ajuda } from "@/components/ui/ajuda";
import { Botao } from "@/components/ui/botao";
import { CampoValor, SelecaoAgrupada, type GrupoDeOpcoes } from "@/components/ui/campos";
import { dataValida, formatarData } from "@/lib/datas";
import { formatarMoeda } from "@/lib/dinheiro";
import { dividirParcelas } from "@/lib/parcelas";
import { criarLancamento, editarLancamento, type EstadoLancamento } from "../acoes";

export type Opcao = { id: string; rotulo: string };
export type CategoriaOpcao = { id: string; nome: string; grupo: string; natureza: "receita" | "despesa"; ordem: number };
export type Tipo = "despesa" | "receita" | "transferencia";
/** Últimas escolhas por tipo, sugeridas ao abrir o formulário. */
/** Dados de um lançamento existente: com isso, o formulário edita em vez de criar. */
export type Edicao = {
  id: string;
  voltar: string;
  /** Onde o "Cancelar" leva (a tela do lançamento). */
  cancelar: string;
  valor: number;
  data: string;
  pago: boolean;
  categoria?: string;
  conta: string;
  destino?: string;
  centro?: string;
  forma?: string;
  pessoa?: string;
  observacao?: string;
  /** "2/3" quando é uma parcela. */
  parcela?: string;
};

/** Valores de partida para "Duplicar": cria um lançamento novo já preenchido. */
export type Modelo = Pick<Edicao, "valor" | "categoria" | "conta" | "destino" | "centro" | "forma" | "pessoa" | "observacao">;

export type Sugestoes = Partial<Record<Tipo, { categoria?: string; conta?: string; destino?: string }>>;

const TIPOS: { valor: Tipo; rotulo: string; cor: string }[] = [
  { valor: "despesa", rotulo: "− Despesa", cor: "bg-neg text-bg" },
  { valor: "receita", rotulo: "+ Receita", cor: "bg-pos text-bg" },
  { valor: "transferencia", rotulo: "⇄ Transferir", cor: "bg-fg text-bg" },
];

export function FormLancamento({
  hoje,
  tipoInicial,
  contas,
  categorias,
  centros,
  formas,
  pessoas,
  sugestoes,
  edicao,
  modelo,
}: {
  hoje: string;
  tipoInicial: Tipo;
  contas: Opcao[];
  categorias: CategoriaOpcao[];
  centros: Opcao[];
  formas: Opcao[];
  /** Nomes das pessoas ativas, para completar o campo "Pago a" / "Recebido de". */
  pessoas: string[];
  sugestoes: Sugestoes;
  edicao?: Edicao;
  modelo?: Modelo;
}) {
  const preenchido = edicao ?? modelo;
  const [estado, acao, salvando] = useActionState(edicao ? editarLancamento : criarLancamento, {} as EstadoLancamento);
  const [tipo, setTipo] = useState<Tipo>(tipoInicial);
  const [data, setData] = useState(edicao?.data ?? hoje);
  // "Já pago" acompanha a data (hoje ou antes = pago) até o usuário mexer nele.
  const [pagoManual, setPagoManual] = useState<boolean | null>(null);
  const pago = pagoManual ?? data <= hoje;
  const transferencia = tipo === "transferencia";
  const [valor, setValor] = useState<number | null>(preenchido?.valor ?? null);
  const [qtdParcelas, setQtdParcelas] = useState("1");
  const n = Number(qtdParcelas);
  const parcelado = !edicao && !transferencia && Number.isInteger(n) && n >= 2 && n <= 48;

  // Prévia das parcelas (mesma conta que o servidor faz ao gravar).
  const previa = useMemo(() => {
    if (!parcelado || !valor || !dataValida(data)) return null;
    try {
      return dividirParcelas(valor, n, data);
    } catch {
      return null;
    }
  }, [parcelado, valor, n, data]);

  // Depois de um erro, vale o que o usuário tinha escolhido; senão, a sugestão do tipo.
  const voltouComErro = estado.valores?.tipo === tipo;
  // O modelo só vale para o tipo original; trocando o tipo, voltam as sugestões.
  const sugestao = edicao ?? (modelo && tipo === tipoInicial ? modelo : undefined) ?? sugestoes[tipo] ?? {};
  const inicial = {
    categoria: voltouComErro ? estado.valores?.categoria : sugestao.categoria,
    conta: voltouComErro ? estado.valores?.conta : sugestao.conta ?? (contas.length === 1 ? contas[0].id : undefined),
    destino: voltouComErro ? estado.valores?.destino : sugestao.destino,
  };

  const gruposDeCategoria = useMemo<GrupoDeOpcoes[]>(() => {
    if (transferencia) return [];
    const porGrupo = new Map<string, { ordem: number; opcoes: { valor: string; rotulo: string }[] }>();
    for (const c of categorias.filter((c) => c.natureza === tipo)) {
      const g = porGrupo.get(c.grupo) ?? { ordem: c.ordem, opcoes: [] };
      g.opcoes.push({ valor: c.id, rotulo: c.nome });
      porGrupo.set(c.grupo, g);
    }
    return [...porGrupo.entries()]
      .sort(([, a], [, b]) => a.ordem - b.ordem)
      .map(([grupo, g]) => ({ grupo, opcoes: g.opcoes }));
  }, [categorias, tipo, transferencia]);

  // Depois de um erro valem os valores devolvidos; senão, os do lançamento em edição.
  const textoInicial = (campo: "pessoa" | "observacao" | "centro" | "forma") =>
    estado.valores ? estado.valores[campo] : preenchido?.[campo];

  const opcoesContas = [{ grupo: "", opcoes: contas.map((c) => ({ valor: c.id, rotulo: c.rotulo })) }];
  const textoPago = tipo === "despesa" ? "Já paguei" : tipo === "receita" ? "Já recebi" : "Já foi feita";

  return (
    <form action={acao} noValidate className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
      {edicao && (
        <>
          <input type="hidden" name="id" value={edicao.id} />
          <input type="hidden" name="voltar" value={edicao.voltar} />
          <input type="hidden" name="tipo" value={tipo} />
          <p className="text-sm text-muted">
            <span className={`mr-2 rounded px-2 py-1 text-sm font-semibold ${TIPOS.find((t) => t.valor === tipo)?.cor}`}>
              {TIPOS.find((t) => t.valor === tipo)?.rotulo}
            </span>
            {edicao.parcela && <>Parcela {edicao.parcela}</>}
          </p>
        </>
      )}
      {!edicao && (
      <fieldset className="grid grid-cols-3 gap-1 rounded-lg bg-bg p-1">
        <legend className="sr-only">Tipo do lançamento</legend>
        {TIPOS.map((t) => (
          <label
            key={t.valor}
            className={`flex min-h-11 cursor-pointer items-center justify-center rounded-md text-sm font-semibold sm:text-base ${
              tipo === t.valor ? t.cor : "text-muted"
            }`}
          >
            <input
              type="radio"
              name="tipo"
              value={t.valor}
              checked={tipo === t.valor}
              onChange={() => setTipo(t.valor)}
              className="sr-only"
            />
            {t.rotulo}
          </label>
        ))}
      </fieldset>
      )}

      <CampoValor
        id="valor"
        rotulo={parcelado ? "Valor total da compra" : edicao?.parcela ? "Valor da parcela" : "Valor"}
        valorInicial={preenchido?.valor}
        erro={estado.erros?.valor}
        aoMudar={setValor}
        ajuda={
          <Ajuda titulo="Valor">
            O valor original, sem juros nem multa. Se pagar com atraso ou desconto, informe isso na
            hora de marcar como pago.
          </Ajuda>
        }
      />

      {!transferencia && (
        // key: ao trocar o tipo, a lista recomeça com a sugestão daquele tipo
        <SelecaoAgrupada
          key={`categoria-${tipo}`}
          id="categoria"
          rotulo="Categoria"
          grupos={gruposDeCategoria}
          valorInicial={inicial.categoria}
          erro={estado.erros?.categoria}
          ajuda={
            <Ajuda titulo="Categoria">
              Só aparecem as categorias de {tipo}. Para criar, renomear ou desativar, vá em
              Configurações → Plano de contas.
            </Ajuda>
          }
        />
      )}

      <SelecaoAgrupada
        key={`conta-${tipo}`}
        id="conta"
        rotulo={tipo === "receita" ? "Entrou na conta" : "Saiu da conta"}
        grupos={opcoesContas}
        valorInicial={inicial.conta}
        erro={estado.erros?.conta}
        ajuda={
          <Ajuda titulo="Conta">
            {tipo === "receita"
              ? "Onde o dinheiro entrou: o banco, a carteira ou o caixa."
              : "De onde o dinheiro saiu: o banco, a carteira ou o caixa."}
          </Ajuda>
        }
      />

      {transferencia && (
        <SelecaoAgrupada
          key="destino"
          id="destino"
          rotulo="Entrou na conta"
          grupos={opcoesContas}
          valorInicial={inicial.destino}
          erro={estado.erros?.destino}
          ajuda={
            <Ajuda titulo="Transferência">
              Dinheiro que passa de uma conta sua para outra, como da conta corrente para a poupança.
              Não conta como receita nem como despesa: só muda o saldo das duas contas.
            </Ajuda>
          }
        />
      )}

      <div className="flex flex-col gap-1.5">
        <span className="flex items-center gap-2">
          <label htmlFor="data" className="text-sm font-semibold">
            {parcelado ? "Vencimento da 1ª parcela" : edicao ? (edicao.pago ? "Data" : "Vencimento") : pago ? "Data" : "Vencimento"}
          </label>
          <Ajuda titulo="Data">
            Para o que já aconteceu, a data em que aconteceu. Para o que ainda vai vencer, a data de
            vencimento: o lançamento fica em aberto até você marcar como pago.
          </Ajuda>
        </span>
        <input
          id="data"
          name="data"
          type="date"
          value={data}
          min="2000-01-01"
          max="2100-12-31"
          onChange={(e) => setData(e.target.value)}
          aria-invalid={Boolean(estado.erros?.data)}
          className={`min-h-11 rounded-lg border bg-surface px-3 outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            estado.erros?.data ? "border-neg" : "border-line"
          }`}
        />
        {estado.erros?.data && <p className="text-sm text-neg">{estado.erros.data}</p>}
      </div>

      {!edicao && (
      <div className="flex items-center gap-2">
      <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3 rounded-lg border border-line px-3">
        <input
          type="checkbox"
          name="pago"
          checked={pago}
          onChange={(e) => setPagoManual(e.target.checked)}
          className="h-5 w-5 accent-[var(--accent)]"
        />
        <span className="font-semibold">{parcelado ? `${textoPago} a 1ª parcela` : textoPago}</span>
        <span className="text-sm text-muted">
          {parcelado ? "as demais ficam em aberto" : pago ? "" : "fica em aberto"}
        </span>
      </label>
      <Ajuda titulo={textoPago}>
        Marcado: o valor já entra no saldo de hoje. Desmarcado: fica em aberto e entra só no saldo
        previsto, até você marcar como pago na lista de lançamentos.
      </Ajuda>
      </div>
      )}

      {/* Abre sozinho quando o erro está num campo daqui de dentro, para ele não ficar escondido. */}
      <details
        open={
          Boolean(
            estado.erros?.parcelas ||
              estado.erros?.pessoa ||
              estado.erros?.observacao ||
              preenchido?.pessoa ||
              preenchido?.centro ||
              preenchido?.forma ||
              preenchido?.observacao,
          ) || undefined
        }
        className="rounded-lg border border-line p-3"
      >
        <summary className="cursor-pointer text-sm font-semibold text-accent">
          Mais detalhes
          {parcelado && <span className="font-normal text-muted"> · {n} parcelas</span>}
        </summary>
        <div className="mt-3 flex flex-col gap-4">
          {!transferencia && (
            <>
              <div className="flex flex-col gap-1.5">
                <span className="flex items-center gap-2">
                  <label htmlFor="pessoa" className="text-sm font-semibold">
                    {tipo === "despesa" ? "Pago a" : "Recebido de"}
                  </label>
                  <Ajuda titulo={tipo === "despesa" ? "Pago a" : "Recebido de"}>
                    {tipo === "despesa"
                      ? "Quem recebeu o seu dinheiro: a loja, o fornecedor, o prestador."
                      : "Quem pagou você: o cliente, a empresa, o inquilino."}{" "}
                    Comece a digitar para escolher alguém já usado. Um nome novo é cadastrado na hora.
                  </Ajuda>
                </span>
                <input
                  id="pessoa"
                  name="pessoa"
                  list="lista-pessoas"
                  autoComplete="off"
                  maxLength={120}
                  defaultValue={textoInicial("pessoa")}
                  placeholder="Opcional"
                  aria-invalid={Boolean(estado.erros?.pessoa)}
                  className={`min-h-11 rounded-lg border bg-surface px-3 outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    estado.erros?.pessoa ? "border-neg" : "border-line"
                  }`}
                />
                <datalist id="lista-pessoas">
                  {pessoas.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
                {estado.erros?.pessoa && <p className="text-sm text-neg">{estado.erros.pessoa}</p>}
              </div>
              {!edicao && (
              <div className="flex flex-col gap-1.5">
                <span className="flex items-center gap-2">
                  <label htmlFor="parcelas" className="text-sm font-semibold">Parcelas</label>
                  <Ajuda titulo="Parcelas">
                    Digite o valor total da compra e o número de parcelas. O Sobra Vida divide o
                    valor e cria uma parcela por mês. Os centavos que sobram da divisão vão para a
                    última parcela.
                  </Ajuda>
                </span>
                <input
                  id="parcelas"
                  name="parcelas"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={48}
                  value={qtdParcelas}
                  onChange={(e) => setQtdParcelas(e.target.value)}
                  aria-invalid={Boolean(estado.erros?.parcelas)}
                  className={`min-h-11 w-28 rounded-lg border bg-surface px-3 tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    estado.erros?.parcelas ? "border-neg" : "border-line"
                  }`}
                />
                {estado.erros?.parcelas && <p className="text-sm text-neg">{estado.erros.parcelas}</p>}
                {previa && (
                  <div className="rounded-lg bg-bg p-3 text-sm" aria-live="polite">
                    <p className="font-semibold">
                      {previa.length}× de {formatarMoeda(previa[0].valor)}
                      {previa.at(-1)!.valor !== previa[0].valor && ` (a última de ${formatarMoeda(previa.at(-1)!.valor)})`}
                    </p>
                    <p className="text-muted">
                      De {formatarData(previa[0].vencimento)} a {formatarData(previa.at(-1)!.vencimento)}
                    </p>
                  </div>
                )}
              </div>
              )}
              <SelecaoAgrupada
                id="centro_custo"
                rotulo="Centro de custo"
                vazio="Nenhum"
                opcional
                valorInicial={textoInicial("centro")}
                grupos={[{ grupo: "", opcoes: centros.map((c) => ({ valor: c.id, rotulo: c.rotulo })) }]}
                ajuda={
                  <Ajuda titulo="Centro de custo">
                    Separa o que é de casa e o que é do trabalho (ou de cada atividade). Os
                    relatórios mostram o resultado de cada centro.
                  </Ajuda>
                }
              />
              <SelecaoAgrupada
                id="forma_pagamento"
                rotulo="Forma de pagamento"
                vazio="Não informar"
                opcional
                valorInicial={textoInicial("forma")}
                grupos={[{ grupo: "", opcoes: formas.map((f) => ({ valor: f.id, rotulo: f.rotulo })) }]}
                ajuda={
                  <Ajuda titulo="Forma de pagamento">
                    Pix, boleto, cartão, dinheiro. Opcional: serve para saber, por exemplo, quanto
                    passou pelo cartão no mês.
                  </Ajuda>
                }
              />
            </>
          )}
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-2">
              <label htmlFor="observacao" className="text-sm font-semibold">Observação</label>
              <Ajuda titulo="Observação">
                Um detalhe para você lembrar depois, como o número da nota ou do pedido. A busca da
                lista de lançamentos também procura aqui.
              </Ajuda>
            </span>
            <textarea
              id="observacao"
              name="observacao"
              rows={2}
              maxLength={500}
              defaultValue={textoInicial("observacao")}
              className="rounded-lg border border-line bg-surface px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
            {estado.erros?.observacao && <p className="text-sm text-neg">{estado.erros.observacao}</p>}
          </div>
        </div>
      </details>

      {edicao?.parcela && (
        <fieldset className="flex flex-col gap-2 rounded-lg border border-line p-3">
          <legend className="px-1 text-sm font-semibold">Aplicar a alteração a</legend>
          {[
            { valor: "esta", rotulo: "Só esta parcela" },
            { valor: "seguintes", rotulo: "Esta e as seguintes" },
            { valor: "todas", rotulo: "Todas as parcelas" },
          ].map((o) => (
            <label key={o.valor} className="flex min-h-11 cursor-pointer items-center gap-3">
              <input
                type="radio"
                name="alcance"
                value={o.valor}
                defaultChecked={o.valor === "esta"}
                className="h-5 w-5 accent-[var(--accent)]"
              />
              <span className="font-semibold">{o.rotulo}</span>
            </label>
          ))}
          <p className="text-sm text-muted">
            Parcelas já pagas não mudam. Se mudar a data, as outras parcelas seguem mês a mês a
            partir da nova data.
          </p>
        </fieldset>
      )}

      <AvisoErro mensagem={estado.mensagem} />

      {edicao ? (
        <div className="flex flex-wrap gap-3 pt-1">
          <Botao type="submit" disabled={salvando} className="flex-1 sm:flex-none">
            {salvando ? "Salvando…" : "Salvar alterações"}
          </Botao>
          <Link href={edicao.cancelar} className="inline-flex min-h-11 items-center px-2 font-semibold text-muted">
            Cancelar
          </Link>
        </div>
      ) : (
      <div className="flex flex-wrap gap-3 pt-1">
        <Botao type="submit" name="depois" value="contas" disabled={salvando} className="flex-1 sm:flex-none">
          {salvando ? "Salvando…" : "Salvar"}
        </Botao>
        <Botao type="submit" name="depois" value="outro" variante="secundario" disabled={salvando} className="flex-1 sm:flex-none">
          Salvar e lançar outro
        </Botao>
        <Link href="/painel" className="inline-flex min-h-11 items-center px-2 font-semibold text-muted">
          Cancelar
        </Link>
      </div>
      )}
    </form>
  );
}
