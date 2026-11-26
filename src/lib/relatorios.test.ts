import { describe, expect, it } from "vitest";
import { formatarPercentual, resumir } from "./relatorios";

const linhas = [
  { natureza: "receita", mes: 11, valor: "4500.00" },
  { natureza: "receita", mes: 11, valor: "2035.40" },
  { natureza: "despesa", mes: 11, valor: "5065.42" },
  { natureza: "despesa", mes: 10, valor: "320.00" },
  { natureza: "despesa", mes: 10, valor: 11.41 },
];

describe("resumir", () => {
  it("soma um mês (gabarito de novembro do teste de aceite)", () => {
    expect(resumir(linhas, 11)).toEqual({ receitas: 6535.4, despesas: 5065.42, resultado: 1469.98, lucratividade: 22.5 });
  });
  it("mês só com despesas: lucratividade vazia", () => {
    expect(resumir(linhas, 10)).toEqual({ receitas: 0, despesas: 331.41, resultado: -331.41, lucratividade: null });
  });
  it("sem mês, soma o ano", () => {
    expect(resumir(linhas).resultado).toBe(1138.57);
  });
  it("mês sem nada", () => {
    expect(resumir(linhas, 1)).toEqual({ receitas: 0, despesas: 0, resultado: 0, lucratividade: null });
  });
});

describe("formatarPercentual", () => {
  it("formata em português", () => {
    expect(formatarPercentual(22.5)).toBe("22,5%");
    expect(formatarPercentual(-3)).toBe("-3,0%");
    expect(formatarPercentual(null)).toBe("—");
  });
});
