import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clientIp, consumeMemory } from "./rate-limit-policy";

describe("rate limit", () => {
  it("usa x-real-ip y si no, el primer x-forwarded-for", () => {
    assert.equal(
      clientIp({ get: (name) => (name === "x-real-ip" ? "10.1.1.1" : "9.9.9.9, 10.1.1.1") }),
      "10.1.1.1",
    );
    assert.equal(
      clientIp({
        get: (name) => (name === "x-forwarded-for" ? " 203.0.113.8, 10.0.0.1" : null),
      }),
      "203.0.113.8",
    );
  });

  it("corta una ráfaga en memoria y deja pasar la ventana siguiente", () => {
    const buckets = new Map();
    const now = 1_000_000;
    for (let i = 0; i < 8; i += 1) {
      const result = consumeMemory(buckets, "ip:1", now, 8, 60_000);
      assert.equal(result.limited, false);
    }
    const blocked = consumeMemory(buckets, "ip:1", now, 8, 60_000);
    assert.equal(blocked.limited, true);
    const later = consumeMemory(buckets, "ip:1", now + 60_001, 8, 60_000);
    assert.equal(later.limited, false);
    assert.equal(later.count, 1);
  });
});
