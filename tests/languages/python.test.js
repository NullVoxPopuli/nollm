import { describe, expect, test } from "vitest";
import { commentTexts, expectEmDashInComments } from "../helpers.js";

describe("python", () => {
  test.each(["py", "pyi"])("%s uses # and docstrings", (ext) => {
    const source = 'x = "#no"  # yes\ndef f():\n    """doc"""\n    \'\'\'also\'\'\'\n';
    expect(commentTexts(`a.${ext}`, source)).toEqual(["# yes", '"""doc"""', "'''also'''"]);
  });

  test("multi line docstrings produce one segment per line", () => {
    const source = 'def f():\n    """\n    One.\n    Two.\n    """\n';
    expect(commentTexts("a.py", source)).toEqual(['"""', "    One.", "    Two.", '    """']);
  });

  test("a # inside a string is not a comment", () => {
    expect(commentTexts("a.py", "color = '#fff'\n")).toEqual([]);
  });

  test("flags an em dash in a comment or docstring and not in code", () => {
    expect(expectEmDashInComments("a.py", "# a — b", 's = "a — b"')).toEqual({
      inComment: ["em-dash"],
      inCode: [],
    });
    expect(expectEmDashInComments("a.py", '"""a — b"""', 's = "a — b"').inComment).toEqual([
      "em-dash",
    ]);
  });
});
