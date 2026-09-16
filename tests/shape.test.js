import { describe, expect, test } from "vitest";
import { extractLines, paragraphs } from "../src/index.js";

function of(text) {
  return paragraphs(extractLines(text));
}

describe("paragraphs", () => {
  test("splits on blank lines and counts words and sentences", () => {
    const result = of("One two three. Four five!\nSix seven?\n\nEight nine.\n");
    expect(result).toEqual([
      {
        line: 1,
        column: 1,
        words: 7,
        sentences: [3, 2, 2],
        preview: "One two three. Four five! Six...",
      },
      { line: 4, column: 1, words: 2, sentences: [2], preview: "Eight nine." },
    ]);
  });

  test("skips headings, tables, and fenced code", () => {
    const result = of("# Title\n\n| a | b |\n\n```\nnot prose at all\n```\n\nReal text.\n");
    expect(result.map((p) => p.line)).toEqual([9]);
  });

  test("starts a new paragraph at each list item and JSDoc tag", () => {
    const result = of("- one\n- two\n  wrapped\n@param x the x\n@returns y\n");
    expect(result.map((p) => [p.line, p.words])).toEqual([
      [1, 2],
      [2, 3],
      [4, 4],
      [5, 2],
    ]);
  });

  test("strips comment markers", () => {
    const segments = [
      { text: "/**", line: 1, column: 1 },
      { text: " * One two.", line: 2, column: 1 },
      { text: " * Three four.", line: 3, column: 1 },
      { text: " */", line: 4, column: 1 },
    ];
    expect(paragraphs(segments, { inComments: true })).toEqual([
      { line: 2, column: 1, words: 4, sentences: [2, 2], preview: "One two. Three four." },
    ]);
  });
});
