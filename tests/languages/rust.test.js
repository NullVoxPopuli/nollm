import { describe, expect, test } from "vitest";
import { commentTexts, expectEmDashInComments } from "../helpers.js";

describe("rust", () => {
  test("uses // and /* */", () => {
    expect(commentTexts("a.rs", '// one\n/* two */\nlet s = "// no";\n')).toEqual([
      "// one",
      "/* two */",
    ]);
  });

  test("lifetimes do not open strings", () => {
    expect(commentTexts("a.rs", "fn f<'a>(x: &'a str) {} // ok\n")).toEqual(["// ok"]);
  });

  test("doc comments", () => {
    expect(commentTexts("a.rs", "/// Doc\n//! Inner\n")).toEqual(["/// Doc", "//! Inner"]);
  });

  test("flags an em dash in a comment and not in code", () => {
    expect(expectEmDashInComments("a.rs", "// a — b", 'let s = "a — b";')).toEqual({
      inComment: ["em-dash"],
      inCode: [],
    });
  });
});
