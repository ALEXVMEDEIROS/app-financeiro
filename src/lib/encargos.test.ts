import { describe, expect, it } from "vitest";
import { diasDeAtraso, jurosAoMes, valorDoPercentual } from "./encargos";

describe("diasDeAtraso", () => {
  it("conta dias corridos", () => {
    expect(diasDeAtraso("2026-10-10", "2026-11-25")).toBe(46);
    expect(diasDeAtraso("2026-02-28", "2026-03-01")).toBe(1);
  });
  it("zero quando pago no dia ou antes", () => {
    expect(diasDeAtraso("2026-11-25", "2026-11-25")).toBe(0);
    expect(diasDeAtraso("2026-11-25", "2026-11-20")).toBe(0);
  });
});

describe("valorDoPercentual", () => {
  it("calcula e arredonda em centavos", () => {
    expect(valorDoPercentual(150, 2)).toBe(3);
    expect(valorDoPercentual(99.99, 2)).toBe(2);
    expect(valorDoPercentual(100, 0.5)).toBe(0.5);
  });
});

describe("jurosAoMes", () => {
  it("proporcional aos dias, mês de 30 dias", () => {
    expect(jurosAoMes(300, 1, 15)).toBe(1.5);
    expect(jurosAoMes(300, 1, 30)).toBe(3);
    expect(jurosAoMes(1000, 1, 46)).toBe(15.33);
  });
  it("sem atraso, sem juros", () => {
    expect(jurosAoMes(300, 1, 0)).toBe(0);
  });
});
