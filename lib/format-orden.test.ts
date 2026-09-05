import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatTelefono, telefonosDigitos } from "./format-orden";

describe("teléfono", () => {
  it("formatea dos números separados por barra con el mismo estilo", () => {
    assert.equal(
      formatTelefono("+504 9276-3326 / 504987558"),
      "+504 9276-3326  /  +504 9875-58",
    );
    assert.deepEqual(telefonosDigitos("+504 9276-3326 / 504987558"), [
      "50492763326",
      "504987558",
    ]);
  });

  it("antepone +504 a dos celulares de 8 dígitos", () => {
    assert.equal(formatTelefono("92763326 / 98755858"), "+504 9276-3326  /  +504 9875-5858");
  });

  it("formatea dos números que ya traen 504", () => {
    assert.equal(
      formatTelefono("50492763326/50498755858"),
      "+504 9276-3326  /  +504 9875-5858",
    );
  });
});
