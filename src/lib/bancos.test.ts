import { describe, expect, it } from "vitest";
import { codigoDoBanco, resumoDadosBancarios } from "./bancos";

describe("codigoDoBanco", () => {
  it.each([
    ["Santander", "033"],
    ["  itaú ", "341"],
    ["Itau", "341"],
    ["Banco do Brasil", "001"],
    ["Nubank", "260"],
    ["Caixa", "104"],
  ])("%s → %s", (nome, codigo) => {
    expect(codigoDoBanco(nome)).toBe(codigo);
  });

  it("não inventa código para nome desconhecido", () => {
    expect(codigoDoBanco("Banco Imaginário")).toBeNull();
    expect(codigoDoBanco("")).toBeNull();
  });
});

describe("resumoDadosBancarios", () => {
  it("monta só com o que foi preenchido", () => {
    expect(resumoDadosBancarios({ codigo_banco: "033", agencia: "1234", numero_conta: "01234-5" })).toBe(
      "Banco 033 · Ag. 1234 · Conta 01234-5",
    );
    expect(resumoDadosBancarios({ agencia: "1234" })).toBe("Ag. 1234");
    expect(resumoDadosBancarios({})).toBe("");
  });
});
