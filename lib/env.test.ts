import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { corsAllowOrigin } from "./env";

describe("CORS", () => {
  it("en produccion no refleja un origen que no esta en la lista", () => {
    assert.equal(
      corsAllowOrigin("https://sitio-malo.example", [
        "https://recuperacionequipocable-color-production.up.railway.app",
      ]),
      "null",
    );
  });

  it("acepta el panel y deja pasar clientes sin Origin (app de campo)", () => {
    const allowed = ["https://panel.example"];
    assert.equal(corsAllowOrigin("https://panel.example", allowed), "https://panel.example");
    assert.equal(corsAllowOrigin(null, allowed), "https://panel.example");
  });
});
