import { describe, expect, test } from "vitest";
import { check } from "../../src/index.js";
import { ids, prose } from "../helpers.js";

const sentence = "The cache warms on the first request and stays warm after that. ";

describe("wall-of-text", () => {
  test("flags a paragraph with too many sentences", () => {
    const findings = prose(sentence.repeat(8));
    expect(ids(findings)).toContain("wall-of-text");
    expect(findings[0].text).toMatch(/^96 words, 8 sentences: The cache warms on the first\.\.\./);
  });

  test("flags a paragraph with too many words", () => {
    const lengths = [18, 25, 12, 20, 28, 10, 15];
    const long = lengths.map((count) => "word ".repeat(count - 1) + "end.").join(" ");
    const findings = prose(long);
    expect(ids(findings)).toEqual(["wall-of-text"]);
    expect(findings[0].text).toMatch(/^128 words, 7 sentences/);
  });

  test("allows several short paragraphs", () => {
    const text = `${sentence.repeat(2)}\n\n${sentence.repeat(3)}\n\n${sentence.repeat(1)}\n`;
    expect(prose(text)).toEqual([]);
  });

  test("allows a long fenced code block", () => {
    expect(prose("```\n" + sentence.repeat(12) + "\n```\n")).toEqual([]);
  });

  test("runs on block comments", () => {
    const source = `/**\n${` * ${sentence}\n`.repeat(8)} */\n`;
    expect(ids(check("a.js", source))).toContain("wall-of-text");
  });

  test("treats each JSDoc tag as its own paragraph", () => {
    const source = `/**\n${` * @param x ${sentence}\n`.repeat(8)} */\n`;
    expect(check("a.js", source)).toEqual([]);
  });
});
