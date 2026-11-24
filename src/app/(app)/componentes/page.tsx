import type { Metadata } from "next";
import { Ajuda } from "@/components/ui/ajuda";
import { Botao } from "@/components/ui/botao";
import { CampoData, CampoValor, SelecaoAgrupada } from "@/components/ui/campos";
import { Valor } from "@/components/ui/valor";

export const metadata: Metadata = {
  title: "Componentes · Sobra Vida",
  robots: { index: false, follow: false },
};

// Página de amostra dos componentes da F2, só na área logada, para conferir
// o visual no celular e no computador. Não aparece no menu.
export default function PaginaComponentes() {
  return (
    <div className="flex max-w-xl flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Componentes</h1>
        <p className="text-muted">Amostra das peças das telas de lançamento (F2). Nada aqui é gravado.</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-bold">Valores com sinal e cor</h2>
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
          <div className="flex justify-between"><span>Honorários</span><Valor valor={4500} tipo="receita" /></div>
          <div className="flex justify-between"><span>Supermercado</span><Valor valor={386.4} tipo="despesa" /></div>
          <div className="flex justify-between"><span>Transferência para a poupança</span><Valor valor={1000} tipo="transferencia" /></div>
          <div className="flex justify-between border-t border-line pt-2"><span>Saldo positivo</span><Valor valor={12345.67} /></div>
          <div className="flex justify-between"><span>Saldo negativo</span><Valor valor={-250} /></div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-bold">Campos</h2>
        <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4">
          <CampoValor
            id="valor"
            rotulo="Valor"
            dica="Digite 1234,56 ou 1.234,56 e saia do campo."
            ajuda={
              <Ajuda titulo="Valor">
                O valor original da conta. Juros, multa e desconto são informados na hora de pagar.
              </Ajuda>
            }
          />
          <CampoData
            id="vencimento"
            rotulo="Vencimento"
            valorInicial="2026-11-24"
            ajuda={<Ajuda titulo="Vencimento">A data em que a conta deve ser paga ou recebida.</Ajuda>}
          />
          <SelecaoAgrupada
            id="categoria"
            rotulo="Categoria"
            grupos={[
              { grupo: "Moradia", opcoes: [{ valor: "1", rotulo: "Condomínio" }, { valor: "2", rotulo: "Energia" }] },
              { grupo: "Alimentação", opcoes: [{ valor: "3", rotulo: "Supermercado" }, { valor: "4", rotulo: "Restaurantes e delivery" }] },
            ]}
          />
          <CampoValor id="valor-erro" rotulo="Campo com erro" erro="Informe um valor maior que zero." />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-bold">Botões</h2>
        <div className="flex flex-wrap gap-3">
          <Botao>Salvar</Botao>
          <Botao variante="secundario">Cancelar</Botao>
          <Botao variante="perigo">Excluir</Botao>
          <Botao variante="discreto">Mais detalhes</Botao>
          <Botao disabled>Salvando…</Botao>
        </div>
      </section>
    </div>
  );
}
