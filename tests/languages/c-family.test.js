import { describe, expect, test } from "vitest";
import { commentTexts, expectEmDashInComments } from "../helpers.js";

const extensions = [
  "c",
  "h",
  "cc",
  "cpp",
  "cxx",
  "hpp",
  "hh",
  "m",
  "mm",
  "cs",
  "go",
  "swift",
  "dart",
  "php",
  "zig",
  "java",
  "kt",
  "kts",
  "scala",
  "groovy",
  "gradle",
  "proto",
];

describe("c family", () => {
  test.each(extensions)("%s uses // and /* */", (ext) => {
    const source = '// one\n/* two\n three */\nchar *s = "// no"; // four\n';
    expect(commentTexts(`a.${ext}`, source)).toEqual(["// one", "/* two", " three */", "// four"]);
  });

  test("char literals do not swallow comments", () => {
    expect(commentTexts("a.c", "char c = '/'; // ok\n")).toEqual(["// ok"]);
  });

  test("go raw strings hide markers", () => {
    expect(commentTexts("a.go", "s := `// no`\n// yes\n")).toEqual(["// yes"]);
  });

  test.each(extensions)("%s flags an em dash in a comment and not in code", (ext) => {
    const result = expectEmDashInComments(`a.${ext}`, "// a — b", 'x = "a — b";');
    expect(result).toEqual({ inComment: ["em-dash"], inCode: [] });
  });
});
