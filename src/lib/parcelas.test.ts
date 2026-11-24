import { describe, expect, it } from "vitest";
import { dividirParcelas, valorEfetivo } from "./parcelas";

const soma = (vs: number[]) => Math.round(vs.reduce((a, b) => a + b * 100, 0)) / 100;

describe("dividirParcelas (R11)", () => {
  it("R$ 100,00 em 3: a última absorve o centavo", () => {
    const p = dividirParcelas(100, 3, "2026-12-10");
    expect(p.map((x) => x.valor)).toEqual([33.33, 33.33, 33.34]);
    expect(soma(p.map((x) => x.valor))).toBe(100);
  });

  it("numera e data as parcelas mensalmente", () => {
    const p = dividirParcelas(300, 3, "2027-01-31");
    expect(p.map((x) => `${x.numero}/${x.total} ${x.vencimento}`)).toEqual([
      "1/3 2027-01-31",
      "2/3 2027-02-28",
      "3/3 2027-03-31",
    ]);
  });

  it.each([
    [1000, 12],
    [99.99, 7],
    [1234.56, 48],
    [0.48, 48],
  ])("a soma das parcelas de %d em %d é exata", (total, n) => {
    const p = dividirParcelas(total, n, "2026-11-24");
    expect(p).toHaveLength(n);
    expect(soma(p.map((x) => x.valor))).toBe(total);
    expect(p.every((x) => x.valor > 0)).toBe(true);
  });

  it.each([1, 49, 2.5])("recusa %d parcelas", (n) => {
    expect(() => dividirParcelas(100, n, "2026-11-24")).toThrow();
  });

  it("recusa valor menor que 1 centavo por parcela", () => {
    expect(() => dividirParcelas(0.01, 2, "2026-11-24")).toThrow();
  });
});

describe("valorEfetivo (R12)", () => {
  it("soma juros e multa e tira o desconto", () => {
    expect(valorEfetivo(100, 5, 2, 10)).toBe(97);
  });
  it("sem acréscimos é o próprio valor", () => {
    expect(valorEfetivo(386.4)).toBe(386.4);
  });
  it("não perde centavos", () => {
    expect(valorEfetivo(0.1, 0.2)).toBe(0.3);
  });
});
