import { describe, expect, test } from "vitest";
import { check, classify } from "../src/index.js";
import { ids } from "./helpers.js";

describe("check", () => {
  test("returns nothing for file types it does not read", () => {
    expect(check("data.json", '{ "simply": "genuinely" }')).toEqual([]);
    expect(check("image.png", "genuinely")).toEqual([]);
  });

  test("reads only comments in code files", () => {
    const source = 'const a = "simply";\n// simply\n';
    const findings = check("a.js", source);
    expect(findings).toEqual([
      {
        line: 2,
        column: 4,
        ruleId: "filler-word",
        message: "Filler. Delete it or replace it",
        text: "simply",
      },
    ]);
  });

  test("reads every line in prose files", () => {
    const findings = check("README.md", "one\ntwo simply\nthree\n");
    expect(findings[0]).toMatchObject({ line: 2, column: 5, text: "simply" });
  });

  test("sorts findings by position", () => {
    const findings = check("a.md", "delve, genuinely\nsimply\n");
    expect(ids(findings)).toEqual(["llm-vocabulary", "banned-word", "filler-word"]);
  });

  test("does not read fenced code, in comments or in prose", () => {
    const comment = [
      "// Add this when the flag is on:",
      "// ```ts",
      "// declare module 'x' {}",
      "// simply — really",
      "// ```",
      "",
    ];
    expect(check("a.ts", comment.join("\n"))).toEqual([]);
    expect(check("a.md", "Use it:\n\n```js\n// simply\n```\n")).toEqual([]);
  });

  test("honors nollm-ignore-next-line", () => {
    const source = "// nollm-ignore-next-line\n// genuinely\n// simply\n";
    expect(ids(check("a.js", source))).toEqual(["filler-word"]);
  });

  test("honors nollm-ignore-file", () => {
    expect(check("a.md", "genuinely\n<!-- nollm-ignore-file -->\n")).toEqual([]);
  });

  test("accepts a custom rule list", () => {
    const rules = [{ id: "todo", message: "Open TODO", pattern: /TODO/g }];
    expect(ids(check("a.js", "// TODO: fix\n// genuinely\n", rules))).toEqual(["todo"]);
  });
});

describe("classify", () => {
  test("recognizes prose by extension and by name", () => {
    expect(classify("docs/guide.md")).toEqual({ kind: "prose" });
    expect(classify("notes.txt")).toEqual({ kind: "prose" });
    expect(classify("LICENSE")).toEqual({ kind: "prose" });
  });

  test("recognizes code by extension and by name", () => {
    expect(classify("src/a.ts")?.kind).toBe("code");
    expect(classify("Dockerfile")?.kind).toBe("code");
    expect(classify("Dockerfile.dev")?.kind).toBe("code");
    expect(classify(".gitignore")?.kind).toBe("code");
  });

  test("returns null for everything else", () => {
    expect(classify("lock.json")).toBeNull();
    expect(classify("photo.jpg")).toBeNull();
    expect(classify("binary")).toBeNull();
  });
});
