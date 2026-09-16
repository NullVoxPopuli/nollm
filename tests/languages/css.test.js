import { describe, expect, test } from "vitest";
import { commentTexts, expectEmDashInComments } from "../helpers.js";

describe("stylesheets", () => {
  test("css uses /* */ only", () => {
    const source = "/* one */\na { background: url(//cdn/x.png); }\n";
    expect(commentTexts("a.css", source)).toEqual(["/* one */"]);
  });

  test.each(["scss", "sass", "less"])("%s also uses //", (ext) => {
    expect(commentTexts(`a.${ext}`, "// one\n/* two */\n")).toEqual(["// one", "/* two */"]);
  });

  test("strings hide markers", () => {
    expect(commentTexts("a.css", 'a::before { content: "/* no */"; } /* yes */\n')).toEqual([
      "/* yes */",
    ]);
  });

  test("flags an em dash in a comment and not in code", () => {
    expect(
      expectEmDashInComments("a.css", "/* a — b */", 'a::before { content: "a — b"; }'),
    ).toEqual({
      inComment: ["em-dash"],
      inCode: [],
    });
  });
});
