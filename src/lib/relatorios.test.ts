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

import { escalaComZero, passoRedondo, serieDeMeses, ultimosMeses } from "./relatorios";

describe("ultimosMeses", () => {
  it("6 meses atravessando o ano", () => {
    expect(ultimosMeses("2027-02-10", 6)).toEqual([
      { ano: 2026, mes: 9 }, { ano: 2026, mes: 10 }, { ano: 2026, mes: 11 },
      { ano: 2026, mes: 12 }, { ano: 2027, mes: 1 }, { ano: 2027, mes: 2 },
    ]);
  });
});

describe("serieDeMeses", () => {
  it("resume cada mês e marca a virada do ano no rótulo", () => {
    const s = serieDeMeses([{ ano: 2026, mes: 12 }, { ano: 2027, mes: 1 }], {
      2026: [{ natureza: "receita", mes: 12, valor: "100" }, { natureza: "despesa", mes: 12, valor: "30.5" }],
      2027: [{ natureza: "despesa", mes: 1, valor: 50 }],
    });
    expect(s).toEqual([
      { ano: 2026, mes: 12, rotulo: "dez", receitas: 100, despesas: 30.5, resultado: 69.5 },
      { ano: 2027, mes: 1, rotulo: "jan/27", receitas: 0, despesas: 50, resultado: -50 },
    ]);
  });
});

describe("escala do gráfico", () => {
  it("passos redondos", () => {
    expect(passoRedondo(3750)).toBe(1000);
    expect(passoRedondo(9000)).toBe(2500);
    expect(passoRedondo(120)).toBe(50);
  });
  it("inclui o zero e cobre negativos", () => {
    expect(escalaComZero([112.47, 326.67])).toEqual({ min: 0, max: 400, marcas: [0, 100, 200, 300, 400] });
    expect(escalaComZero([-500, 1500])).toEqual({ min: -500, max: 1500, marcas: [-500, 0, 500, 1000, 1500] });
    expect(escalaComZero([0, 0])).toEqual({ min: 0, max: 1, marcas: [0, 0.25, 0.5, 0.75, 1] });
  });
});

import { media, mesesParaMedia, montarDre } from "./relatorios";

describe("montarDre", () => {
  const linhas = [
    { natureza: "receita", grupo: "Trabalho", grupo_ordem: 1, categoria: "Honorários", mes: 11, valor: "3750.00" },
    { natureza: "despesa", grupo: "Moradia", grupo_ordem: 4, categoria: "Aluguel", mes: 11, valor: "1800" },
    { natureza: "despesa", grupo: "Moradia", grupo_ordem: 4, categoria: "Condomínio", mes: 11, valor: "450" },
    { natureza: "despesa", grupo: "Moradia", grupo_ordem: 4, categoria: "Aluguel", mes: 10, valor: "1800" },
    { natureza: "despesa", grupo: "Despesas financeiras", grupo_ordem: 11, categoria: "Juros e multas por atraso", mes: 11, valor: "14.20" },
  ];
  const dre = montarDre(linhas);
  it("grupos na ordem do plano, com categorias", () => {
    expect(dre.despesas.map((g) => g.grupo)).toEqual(["Moradia", "Despesas financeiras"]);
    expect(dre.despesas[0].total).toBe(4050);
    expect(dre.despesas[0].categorias[0]).toEqual({ nome: "Aluguel", meses: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1800, 1800, 0], total: 3600 });
  });
  it("totais e resultado por mês", () => {
    expect(dre.totalReceitas[10]).toBe(3750);
    expect(dre.totalDespesas[10]).toBe(2264.2);
    expect(dre.resultado[10]).toBe(1485.8);
    expect(dre.resultado[9]).toBe(-1800);
    expect(dre.resultado[0]).toBe(0);
  });
});

describe("média", () => {
  it("meses que entram na média", () => {
    expect(mesesParaMedia(2026, "2026-11-27")).toBe(11);
    expect(mesesParaMedia(2025, "2026-11-27")).toBe(12);
    expect(mesesParaMedia(2027, "2026-11-27")).toBe(0);
  });
  it("divide e arredonda", () => {
    expect(media(1000, 3)).toBe(333.33);
    expect(media(1000, 0)).toBe(0);
  });
});
