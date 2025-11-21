import { describe, it } from "vitest";
import * as fc from "fast-check";

describe("Property-Based Testing Setup", () => {
  it("should run property-based tests with fast-check", () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        return a + b === b + a; // Commutative property of addition
      }),
      { numRuns: 100 }
    );
  });

  it("should generate random strings", () => {
    fc.assert(
      fc.property(fc.string(), (str) => {
        return str.length >= 0; // All strings have non-negative length
      }),
      { numRuns: 100 }
    );
  });
});
