import { describe, expect, test } from "vitest";
import { ids, prose, texts } from "../helpers.js";

describe("banned-word", () => {
  test("flags each banned word once", () => {
    const findings = prose("This is genuinely load-bearing and fails loudly.");
    expect(texts(findings)).toEqual(["genuinely", "load-bearing", "fails loudly"]);
  });

  test("flags both spellings of load bearing", () => {
    expect(texts(prose("A load bearing wall and a Load-Bearing beam"))).toEqual([
      "load bearing",
      "Load-Bearing",
    ]);
  });

  test("is case insensitive", () => {
    expect(ids(prose("Spearheaded the effort"))).toEqual(["banned-word"]);
  });

  test("ignores words inside identifiers", () => {
    expect(prose("carryingCapacity")).toEqual([]);
  });
});
