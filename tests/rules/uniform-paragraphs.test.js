import { describe, expect, test } from "vitest";
import { check } from "../../src/index.js";
import { ids, prose } from "../helpers.js";

const SENTENCE_LENGTHS = [9, 14, 7];

/**
 * A paragraph of the given word count, in sentences of varied length,
 * so that only the paragraph rules have anything to say about it.
 */
function paragraph(words) {
  const sentences = [];
  for (let i = 0; words > 0; i++) {
    const count = Math.min(words, SENTENCE_LENGTHS[i % SENTENCE_LENGTHS.length]);
    sentences.push("word ".repeat(count - 1) + "end.");
    words -= count;
  }
  return sentences.join(" ");
}

describe("uniform-paragraphs", () => {
  test("flags three paragraphs in a row with almost the same length", () => {
    const findings = prose([paragraph(30), paragraph(33), paragraph(31)].join("\n\n"));
    expect(ids(findings)).toEqual(["uniform-paragraphs"]);
    expect(findings[0]).toMatchObject({ line: 1, text: "3 paragraphs of 30, 33, 31 words" });
  });

  test("reports a longer run once", () => {
    const findings = prose(
      [paragraph(40), paragraph(42), paragraph(38), paragraph(41)].join("\n\n"),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].text).toBe("4 paragraphs of 40, 42, 38, 41 words");
  });

  test("allows paragraphs of different lengths", () => {
    expect(prose([paragraph(30), paragraph(60), paragraph(30)].join("\n\n"))).toEqual([]);
  });

  test("allows short paragraphs", () => {
    expect(prose([paragraph(10), paragraph(10), paragraph(10)].join("\n\n"))).toEqual([]);
  });

  test("allows two paragraphs", () => {
    expect(prose([paragraph(30), paragraph(30)].join("\n\n"))).toEqual([]);
  });

  test("does not run in comments", () => {
    const source = `// ${paragraph(30)}\n\n// ${paragraph(30)}\n\n// ${paragraph(30)}\n`;
    expect(check("a.js", source)).toEqual([]);
  });
});
