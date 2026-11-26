"use client";

import { useEffect, useRef, useState } from "react";
import { formatarMoeda } from "@/lib/dinheiro";
import { escalaComZero, type MesDoGrafico } from "@/lib/relatorios";

// Resultado (receitas − despesas) dos últimos meses, em colunas que sobem (sobrou)
// ou descem (faltou) a partir do zero. O sinal é lido pela posição e pelo rótulo;
// a cor só reforça. Passar o dedo ou o mouse (ou o foco do teclado) mostra o mês
// inteiro; a tabela logo abaixo tem os mesmos números.

// O desenho acompanha a largura real da tela (1 unidade = 1 pixel), para o texto
// ficar sempre com 12 px, no celular e no computador.
const ALTURA = 220;
const MARGEM = { topo: 16, direita: 8, base: 28, esquerda: 52 };
const COLUNA_MAX = 24;
const RAIO = 4;

const curto = (v: number) => {
  const abs = Math.abs(v);
  const s = abs >= 10_000 ? `${(abs / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil` : abs.toLocaleString("pt-BR");
  return v < 0 ? `−${s}` : s;
};

/** Coluna com 4 px arredondados só na ponta (a base fica reta no zero). */
function caminhoColuna(x: number, largura: number, yZero: number, yPonta: number) {
  const altura = Math.abs(yZero - yPonta);
  const r = Math.min(RAIO, altura, largura / 2);
  if (altura < 0.5) return "";
  if (yPonta < yZero) {
    return `M${x},${yZero} V${yPonta + r} Q${x},${yPonta} ${x + r},${yPonta} H${x + largura - r} Q${x + largura},${yPonta} ${x + largura},${yPonta + r} V${yZero} Z`;
  }
  return `M${x},${yZero} V${yPonta - r} Q${x},${yPonta} ${x + r},${yPonta} H${x + largura - r} Q${x + largura},${yPonta} ${x + largura},${yPonta - r} V${yZero} Z`;
}

export function GraficoResultado({ meses }: { meses: MesDoGrafico[] }) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const [LARGURA, setLargura] = useState(343);
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const medir = () => setLargura(Math.max(280, Math.round(el.clientWidth)));
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const escala = escalaComZero(meses.map((m) => m.resultado));
  const areaW = LARGURA - MARGEM.esquerda - MARGEM.direita;
  const areaH = ALTURA - MARGEM.topo - MARGEM.base;
  const y = (v: number) => MARGEM.topo + ((escala.max - v) / (escala.max - escala.min)) * areaH;
  const faixa = areaW / meses.length;
  const largura = Math.min(COLUNA_MAX, faixa * 0.5);
  const yZero = y(0);
  const atual = meses.length - 1;
  const mostrado = ativo ?? atual;
  const m = meses[mostrado];

  return (
    <figure className="flex flex-col gap-2">
      <div ref={caixa} className="relative w-full">
        <svg
          viewBox={`0 0 ${LARGURA} ${ALTURA}`}
          width={LARGURA}
          height={ALTURA}
          className="block max-w-full touch-pan-y"
          role="img"
          aria-label={`Resultado dos últimos ${meses.length} meses. Os valores estão na tabela abaixo.`}
          onPointerLeave={() => setAtivo(null)}
        >
          {/* grade e eixo: linhas finas e discretas */}
          {escala.marcas.map((v) => (
            <g key={v}>
              <line
                x1={MARGEM.esquerda}
                x2={LARGURA - MARGEM.direita}
                y1={y(v)}
                y2={y(v)}
                stroke={v === 0 ? "var(--muted)" : "var(--grafico-grade)"}
                strokeWidth={1}
              />
              <text x={MARGEM.esquerda - 8} y={y(v)} dy="0.32em" textAnchor="end" className="fill-[var(--muted)] text-[12px] tabular-nums">
                {curto(v)}
              </text>
            </g>
          ))}

          {meses.map((mes, i) => {
            const cx = MARGEM.esquerda + faixa * i + faixa / 2;
            const sobrou = mes.resultado >= 0;
            const destaque = mostrado === i;
            return (
              <g
                key={`${mes.ano}-${mes.mes}`}
                tabIndex={0}
                role="button"
                aria-label={`${mes.rotulo}: ${sobrou ? "sobrou" : "faltou"} ${formatarMoeda(Math.abs(mes.resultado))}`}
                onPointerEnter={() => setAtivo(i)}
                onFocus={() => setAtivo(i)}
                onBlur={() => setAtivo(null)}
                onClick={() => setAtivo(i)}
                className="cursor-pointer outline-none"
              >
                {/* área de toque: a faixa inteira do mês, maior que a coluna */}
                <rect x={cx - faixa / 2} y={MARGEM.topo} width={faixa} height={areaH} fill="transparent" />
                {destaque && (
                  <rect x={cx - faixa / 2 + 2} y={MARGEM.topo} width={faixa - 4} height={areaH} rx={6} fill="var(--grafico-grade)" opacity={0.6} />
                )}
                <path
                  d={caminhoColuna(cx - largura / 2, largura, yZero, y(mes.resultado))}
                  fill={sobrou ? "var(--grafico-pos)" : "var(--grafico-neg)"}
                />
                <text
                  x={cx}
                  y={ALTURA - 8}
                  textAnchor="middle"
                  className={`text-[12px] ${i === atual ? "fill-[var(--fg)] font-semibold" : "fill-[var(--muted)]"}`}
                >
                  {mes.rotulo}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* leitura do mês tocado (ou do mês atual): valor primeiro, rótulo depois */}
      <div className="grid grid-cols-3 gap-2 rounded-lg bg-bg p-3 text-sm tabular-nums" aria-live="polite">
        <p className="col-span-3 text-xs font-semibold text-muted">
          {m.rotulo} {m.ano}
          {mostrado === atual && " (mês atual, até hoje)"}
        </p>
        <p className="flex flex-col">
          <span className="font-semibold text-fg">{formatarMoeda(m.receitas)}</span>
          <span className="text-xs text-muted">receitas</span>
        </p>
        <p className="flex flex-col">
          <span className="font-semibold text-fg">{formatarMoeda(m.despesas)}</span>
          <span className="text-xs text-muted">despesas</span>
        </p>
        <p className="flex flex-col">
          <span className="font-semibold text-fg">{formatarMoeda(m.resultado)}</span>
          <span className="flex items-center gap-1 text-xs text-muted">
            <span
              aria-hidden
              className="inline-block h-0.5 w-3 rounded"
              style={{ background: m.resultado >= 0 ? "var(--grafico-pos)" : "var(--grafico-neg)" }}
            />
            {m.resultado >= 0 ? "sobrou" : "faltou"}
          </span>
        </p>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer font-semibold text-accent">Ver em tabela</summary>
        <table className="mt-2 w-full tabular-nums">
          <thead>
            <tr className="text-xs text-muted">
              <th scope="col" className="py-1 text-left font-semibold">Mês</th>
              <th scope="col" className="py-1 text-right font-semibold">Receitas</th>
              <th scope="col" className="py-1 text-right font-semibold">Despesas</th>
              <th scope="col" className="py-1 text-right font-semibold">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {meses.map((mes) => (
              <tr key={`${mes.ano}-${mes.mes}`} className="border-t border-line">
                <th scope="row" className="py-1 text-left font-semibold">
                  {mes.rotulo} {mes.ano}
                </th>
                <td className="py-1 text-right">{formatarMoeda(mes.receitas)}</td>
                <td className="py-1 text-right">{formatarMoeda(mes.despesas)}</td>
                <td className="py-1 text-right font-semibold">{formatarMoeda(mes.resultado)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <figcaption className="text-xs text-muted">
        Realizado: pela data do pagamento. Toque numa coluna para ver o mês.
      </figcaption>
    </figure>
  );
}
