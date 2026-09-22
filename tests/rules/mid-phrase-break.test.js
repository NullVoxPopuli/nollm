import { describe, expect, test } from "vitest";
import { check } from "../../src/index.js";
import { ids, texts } from "../helpers.js";

const only = (file, source) =>
  check(file, source).filter((finding) => finding.ruleId === "mid-phrase-break");

describe("mid-phrase-break", () => {
  test("flags a line that stops on a preposition", () => {
    expect(texts(only("doc.md", "They apply under the\ncurrent directory.\n"))).toEqual(["the"]);
  });

  test("flags a line that stops on a relative pronoun", () => {
    expect(texts(only("doc.md", "It names the command that\nfetches it.\n"))).toEqual(["that"]);
  });

  test("points at the word, not the end of the line", () => {
    const [finding] = only("doc.md", "They apply under the\ncurrent directory.\n");
    expect([finding.line, finding.column]).toEqual([1, 18]);
  });

  test("leaves a break at a pause alone", () => {
    expect(
      only("doc.md", "It applies under the current directory.\nNothing else changes.\n"),
    ).toEqual([]);
  });

  test("leaves a word that can end a clause alone", () => {
    expect(only("doc.md", "Run it and see what it can\ndo for you.\n")).toEqual([]);
  });

  test("leaves the last line of a paragraph alone", () => {
    expect(only("doc.md", "A line that ends with the\n\nNew paragraph here.\n")).toEqual([]);
  });

  test("leaves a line alone when a list item follows", () => {
    expect(only("doc.md", "Pick one of the\n- first\n- second\n")).toEqual([]);
  });

  test("leaves a line alone when a heading follows", () => {
    expect(only("doc.md", "Text ending with the\n## Heading\n")).toEqual([]);
  });

  test("leaves a line alone when a table row follows", () => {
    expect(only("doc.md", "Sizes are in the\n| a | b |\n")).toEqual([]);
  });

  test("skips fenced code", () => {
    const source = "Intro line.\n\n```js\nfor (const x of\n  list) {}\n```\n";
    expect(only("doc.md", source)).toEqual([]);
  });

  test("reads a run of line comments", () => {
    const source = "// the value comes from the\n// caller, not the cache\nconst a = 1;\n";
    expect(texts(only("code.js", source))).toEqual(["the"]);
  });

  test("reads a block comment", () => {
    expect(
      texts(only("code.js", "/*\n * It reads every file that\n * git tracks.\n */\n")),
    ).toEqual(["that"]);
  });

  test("leaves a comment alone when code follows it", () => {
    expect(only("code.js", "// ends with the\nconst a = 1;\n")).toEqual([]);
  });

  test("leaves code outside comments alone", () => {
    expect(ids(check("code.js", "for (const x of\n  list) {\n}\n"))).toEqual([]);
  });
});
