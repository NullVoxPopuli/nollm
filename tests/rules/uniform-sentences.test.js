import { describe, expect, test } from "vitest";
import { check } from "../../src/index.js";
import { ids, prose } from "../helpers.js";

function sentence(words) {
  return "word ".repeat(words - 1) + "end. ";
}

describe("uniform-sentences", () => {
  test("flags a paragraph of same length sentences", () => {
    const findings = prose(sentence(12) + sentence(13) + sentence(12) + sentence(14));
    expect(ids(findings)).toEqual(["uniform-sentences"]);
    expect(findings[0].text).toBe("4 sentences of 12, 13, 12, 14 words");
  });

  test("allows varied sentence lengths", () => {
    expect(prose(sentence(10) + sentence(15) + sentence(12) + sentence(20))).toEqual([]);
  });

  test("allows short sentences", () => {
    expect(prose(sentence(5) + sentence(5) + sentence(5) + sentence(5))).toEqual([]);
  });

  test("allows fewer than four sentences", () => {
    expect(prose(sentence(12) + sentence(12) + sentence(12))).toEqual([]);
  });

  test("runs on block comments", () => {
    const source = `/**\n * ${sentence(12)}${sentence(12)}\n * ${sentence(12)}${sentence(12)}\n */\n`;
    expect(ids(check("a.js", source))).toEqual(["uniform-sentences"]);
  });
});
