import { describe, it, expect } from "vitest";
import { parseImperial, formatImperial, feetToMm } from "../domain/units.js";

describe("units", () => {
  it("parseImperial round-trips basic feet+inches", () => {
    expect(parseImperial("12'-6\"")).toBe(Math.round(12 * 304.8 + 6 * 25.4));
    expect(parseImperial("0'-3\"")).toBe(Math.round(3 * 25.4));
    expect(parseImperial("8'")).toBe(Math.round(8 * 304.8));
    expect(parseImperial("36\"")).toBe(Math.round(36 * 25.4));
  });

  it("parseImperial returns null for nonsense", () => {
    expect(parseImperial("nope")).toBeNull();
    expect(parseImperial("")).toBeNull();
  });

  it("formatImperial reads back as something sensible", () => {
    expect(formatImperial(feetToMm(12))).toBe("12'-0\"");
    expect(formatImperial(feetToMm(8))).toBe("8'-0\"");
    expect(formatImperial(feetToMm(-8))).toBe("-8'-0\"");
    expect(formatImperial(0)).toBe("0\"");
  });
});
