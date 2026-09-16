import { describe, expect, test } from "vitest";
import { check } from "../../src/index.js";
import { ids, prose } from "../helpers.js";

function sentence(words) {
  return "word ".repeat(words - 1) + "end. ";
}

describe("long-sentence", () => {
  test("flags a sentence over thirty words", () => {
    const findings = prose(sentence(31));
    expect(ids(findings)).toEqual(["long-sentence"]);
    expect(findings[0].text).toBe("31 words: word word word word word word...");
  });

  test("allows a sentence of thirty words", () => {
    expect(prose(sentence(30))).toEqual([]);
  });

  test("points at the sentence, not the paragraph", () => {
    const source = `/**\n * ${sentence(5)}\n * ${sentence(4)}${sentence(31)}\n */\n`;
    const findings = check("a.js", source);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ line: 3, column: 4 + "word word word end. ".length });
  });

  test("counts across wrapped comment lines", () => {
    const words = "word ".repeat(30) + "end.";
    const source = `// ${words.slice(0, 80)}\n// ${words.slice(80)}\n`;
    expect(ids(check("a.js", source))).toEqual(["long-sentence"]);
  });

  test("allows a long fenced code block", () => {
    expect(prose("```\n" + sentence(40) + "\n```\n")).toEqual([]);
  });
});
