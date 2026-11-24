import { describe, expect, it } from "vitest";
import {
  dataValida,
  diasNoMes,
  formatarData,
  hojeEmSaoPaulo,
  intervaloDoMes,
  nomeDoMes,
  situacao,
  somarMeses,
} from "./datas";

describe("hojeEmSaoPaulo", () => {
  it("às 22h de São Paulo (01h UTC do dia seguinte) ainda é o mesmo dia", () => {
    // 25/11/2026 01:00 UTC = 24/11/2026 22:00 em São Paulo
    expect(hojeEmSaoPaulo(new Date("2026-11-25T01:00:00Z"))).toBe("2026-11-24");
  });

  it("à meia-noite de São Paulo já é o dia seguinte", () => {
    // 25/11/2026 03:00 UTC = 25/11/2026 00:00 em São Paulo
    expect(hojeEmSaoPaulo(new Date("2026-11-25T03:00:00Z"))).toBe("2026-11-25");
  });
});

describe("somarMeses", () => {
  it("mantém o dia em meses longos", () => {
    expect(somarMeses("2026-11-10", 1)).toBe("2026-12-10");
  });

  it("passa a virada do ano", () => {
    expect(somarMeses("2026-12-15", 1)).toBe("2027-01-15");
    expect(somarMeses("2026-11-30", 14)).toBe("2028-01-30");
  });

  it("usa o último dia em meses curtos e volta ao dia original", () => {
    expect(somarMeses("2027-01-31", 1)).toBe("2027-02-28");
    expect(somarMeses("2027-01-31", 2)).toBe("2027-03-31");
    expect(somarMeses("2027-01-31", 3)).toBe("2027-04-30");
  });

  it("conhece o ano bissexto", () => {
    expect(somarMeses("2028-01-31", 1)).toBe("2028-02-29");
  });

  it("zero meses devolve a mesma data", () => {
    expect(somarMeses("2026-11-24", 0)).toBe("2026-11-24");
  });
});

describe("mês", () => {
  it("dias no mês", () => {
    expect(diasNoMes(2027, 2)).toBe(28);
    expect(diasNoMes(2028, 2)).toBe(29);
    expect(diasNoMes(2026, 11)).toBe(30);
  });

  it("intervalo do mês", () => {
    expect(intervaloDoMes("2026-11-24")).toEqual({ inicio: "2026-11-01", fim: "2026-11-30" });
    expect(intervaloDoMes("2027-02-10")).toEqual({ inicio: "2027-02-01", fim: "2027-02-28" });
  });

  it("nome e formato brasileiro", () => {
    expect(nomeDoMes("2026-11-24")).toBe("novembro de 2026");
    expect(formatarData("2026-11-04")).toBe("04/11/2026");
  });
});

describe("dataValida", () => {
  it.each(["2026-11-24", "2028-02-29", "2000-01-01", "2100-12-31"])("aceita %s", (d) => {
    expect(dataValida(d)).toBe(true);
  });
  it.each(["2027-02-29", "2026-13-01", "2026-11-31", "1999-12-31", "24/11/2026", ""])("recusa %s", (d) => {
    expect(dataValida(d)).toBe(false);
  });
});

describe("situacao (R2)", () => {
  it("pago quando tem data de pagamento", () => {
    expect(situacao("2026-11-01", "2026-11-02", "2026-11-24")).toBe("pago");
  });
  it("atrasado quando venceu e não foi pago", () => {
    expect(situacao("2026-11-23", null, "2026-11-24")).toBe("atrasado");
  });
  it("em aberto quando vence hoje ou depois", () => {
    expect(situacao("2026-11-24", null, "2026-11-24")).toBe("em_aberto");
    expect(situacao("2026-12-10", null, "2026-11-24")).toBe("em_aberto");
  });
});
