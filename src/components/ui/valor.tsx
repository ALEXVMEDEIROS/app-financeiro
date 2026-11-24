import { formatarComSinal, formatarMoeda, type TipoLancamento } from "@/lib/dinheiro";

// Exibe um valor com sinal e cor (sugestão do testador André Vianna):
// receita "+" verde · despesa "−" vermelha · transferência neutra.
// Sem tipo: positivo verde, negativo vermelho (ex.: saldos e resultados).
export function Valor({
  valor,
  tipo,
  className = "",
}: {
  valor: number;
  tipo?: TipoLancamento;
  className?: string;
}) {
  let texto: string;
  let cor: string;
  if (tipo) {
    texto = formatarComSinal(valor, tipo);
    cor = tipo === "receita" ? "text-pos" : tipo === "despesa" ? "text-neg" : "text-fg";
  } else {
    texto = formatarMoeda(valor);
    cor = valor < 0 ? "text-neg" : valor > 0 ? "text-pos" : "text-fg";
  }
  return <span className={`font-semibold tabular-nums ${cor} ${className}`}>{texto}</span>;
}
