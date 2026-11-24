import { describe, expect, it } from "vitest";
import { formatarComSinal, formatarMoeda, lerValor } from "./dinheiro";

describe("lerValor", () => {
  it.each([
    ["1.234,56", 1234.56],
    ["1234,5", 1234.5],
    ["R$ 10", 10],
    ["r$10,00", 10],
    ["1234.56", 1234.56],
    ["1.234", 1234],
    ["1.234.567,89", 1234567.89],
    ["12.5", 12.5],
    ["0,01", 0.01],
    ["100", 100],
    ["  45,9  ", 45.9],
  ])("lê %j como %d", (entrada, esperado) => {
    expect(lerValor(entrada)).toBe(esperado);
  });

  it.each(["", "abc", "1,2,3", "12,3a", "R$"])("recusa %j", (entrada) => {
    expect(lerValor(entrada)).toBeNull();
  });

  it("arredonda para centavos", () => {
    expect(lerValor("10,005")).toBe(10.01);
  });
});

describe("formatação", () => {
  it("formata em reais", () => {
    expect(formatarMoeda(1234.5)).toBe("R$ 1.234,50".replace(" ", " "));
    expect(formatarMoeda(-250)).toBe("−R$ 250,00".replace(" ", " "));
  });

  it("põe sinal conforme o tipo", () => {
    expect(formatarComSinal(386.4, "despesa").startsWith("−")).toBe(true);
    expect(formatarComSinal(4500, "receita").startsWith("+")).toBe(true);
    expect(formatarComSinal(300, "transferencia").startsWith("R$")).toBe(true);
  });
});
