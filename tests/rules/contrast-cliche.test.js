import { describe, expect, test } from "vitest";
import { check } from "../../src/index.js";
import { comment, ids, prose, texts } from "../helpers.js";

describe("contrast-cliche", () => {
  test("flags 'not just X, but Y'", () => {
    expect(ids(prose("It is not just fast, but also safe."))).toEqual(["contrast-cliche"]);
  });

  test("flags 'it's not X, it's Y'", () => {
    expect(ids(prose("It's not a bug, it's a feature."))).toEqual(["contrast-cliche"]);
  });

  test("flags 'X, not Y:' in a comment", () => {
    const findings = comment("`dev`, not `start`: expanded text");
    expect(ids(findings)).toEqual(["contrast-cliche"]);
    expect(texts(findings)).toEqual(["// `dev`, not `start`:"]);
  });

  test("flags 'X, not Y:' in prose", () => {
    expect(texts(prose("Returns the count, not the list: callers want a number."))).toEqual([
      "Returns the count, not the list:",
    ]);
  });

  test("leaves a plain contrast without a label colon alone", () => {
    expect(ids(comment("Pass a string, not a number, to keep it simple."))).toEqual([]);
  });

  test("leaves the colon in a URL alone", () => {
    expect(ids(comment("see http://a, not https://b for details"))).toEqual([]);
  });

  test("does not join two lines of a block comment into a match", () => {
    const source = [
      "/*",
      " * built from runtime state, not",
      " * statically on the server):",
      " */",
      "",
    ].join("\n");
    expect(ids(check("code.js", source))).toEqual([]);
  });
});
