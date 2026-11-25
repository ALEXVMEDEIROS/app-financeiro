import { describe, expect, it } from "vitest";
import { combinaBusca, enderecoComFiltros, lerFiltros, normalizar, temFiltro } from "./filtros";

describe("lerFiltros", () => {
  it("aceita valores válidos", () => {
    expect(lerFiltros({ tipo: "despesa", aberto: "1", busca: "  padaria   são  " })).toEqual({
      tipo: "despesa",
      aberto: true,
      busca: "padaria são",
    });
  });
  it("ignora o que não é válido", () => {
    expect(lerFiltros({ tipo: "xyz", aberto: "sim" })).toEqual({ tipo: undefined, aberto: false, busca: "" });
  });
  it("limita a busca a 60 caracteres", () => {
    expect(lerFiltros({ busca: "a".repeat(100) }).busca).toHaveLength(60);
  });
});

describe("temFiltro e enderecoComFiltros", () => {
  it("sem filtro", () => {
    const f = lerFiltros({});
    expect(temFiltro(f)).toBe(false);
    expect(enderecoComFiltros(undefined, f)).toBe("");
    expect(enderecoComFiltros("2026-12", f)).toBe("?mes=2026-12");
  });
  it("com filtros", () => {
    const f = lerFiltros({ tipo: "receita", aberto: "1", busca: "são josé" });
    expect(temFiltro(f)).toBe(true);
    expect(enderecoComFiltros("2026-12", f)).toBe("?mes=2026-12&tipo=receita&aberto=1&busca=s%C3%A3o+jos%C3%A9");
  });
});

describe("busca", () => {
  it("normaliza acento e maiúscula", () => {
    expect(normalizar("Padaria São José")).toBe("padaria sao jose");
  });
  it("todas as palavras precisam aparecer, em qualquer campo", () => {
    expect(combinaBusca("sao jose", ["Alimentação", "Padaria São José"])).toBe(true);
    expect(combinaBusca("padaria itau", ["Padaria São José", "Itaú · Conta corrente"])).toBe(true);
    expect(combinaBusca("padaria bradesco", ["Padaria São José", "Itaú"])).toBe(false);
  });
  it("busca vazia combina com tudo; textos nulos são ignorados", () => {
    expect(combinaBusca("", [null])).toBe(true);
    expect(combinaBusca("x", [null, undefined])).toBe(false);
  });
});
