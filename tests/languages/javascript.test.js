import { describe, expect, test } from "vitest";
import { classify } from "../../src/index.js";
import { commentTexts, comments, expectEmDashInComments } from "../helpers.js";

const extensions = ["js", "jsx", "mjs", "cjs", "ts", "tsx", "mts", "cts", "jsonc", "json5"];

describe("javascript family", () => {
  test.each(extensions)("%s uses // and /* */", (ext) => {
    expect(classify(`a.${ext}`)?.kind).toBe("code");
    expect(commentTexts(`a.${ext}`, "// one\n/* two */\n")).toEqual(["// one", "/* two */"]);
  });

  test("reports positions per line, and one segment per block comment line", () => {
    const source = "let a = 1; // one\n/* two\n   three */\nlet b;\n";
    expect(comments("a.js", source)).toEqual([
      { text: "// one", line: 1, column: 12 },
      { text: "/* two", line: 2, column: 1 },
      { text: "   three */", line: 3, column: 1 },
    ]);
  });

  test("ignores markers inside strings", () => {
    const source = 'const url = "https://x.y//z"; // real\nconst t = `a // b\n c`; // after\n';
    expect(commentTexts("a.js", source)).toEqual(["// real", "// after"]);
  });

  test("ignores markers inside single quoted strings and escapes", () => {
    const source = "const s = 'it\\'s // not'; // yes\n";
    expect(commentTexts("a.ts", source)).toEqual(["// yes"]);
  });

  test("tracks lines across template literals", () => {
    const source = "const t = `\n\n`; // here\n";
    expect(comments("a.js", source)).toEqual([{ text: "// here", line: 3, column: 4 }]);
  });

  test("does not let an unterminated quote swallow the next line", () => {
    const source = "const s = 'it\nlet b = 1; // kept\n";
    expect(commentTexts("a.js", source)).toEqual(["// kept"]);
  });

  test("keeps JSDoc blocks line by line", () => {
    const source = "/**\n * Adds.\n * @param a first\n */\n";
    expect(commentTexts("a.ts", source)).toEqual(["/**", " * Adds.", " * @param a first", " */"]);
  });

  test.each(extensions)("%s flags an em dash in a comment and not in code", (ext) => {
    const result = expectEmDashInComments(`a.${ext}`, "// a — b", 'const s = "a — b";');
    expect(result).toEqual({ inComment: ["em-dash"], inCode: [] });
  });
});
