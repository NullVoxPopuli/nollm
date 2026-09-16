import { describe, expect, test } from "vitest";
import { commentTexts, expectEmDashInComments } from "../helpers.js";

const extensions = ["html", "htm", "xml", "svg", "vue", "svelte", "astro"];

describe("html family", () => {
  test.each(extensions)("%s uses <!-- -->", (ext) => {
    expect(commentTexts(`a.${ext}`, "<!-- one -->\n<p>// not a comment</p>\n")).toEqual([
      "<!-- one -->",
    ]);
  });

  test("multi line html comments produce one segment per line", () => {
    expect(commentTexts("a.html", "<!--\n  one\n  two\n-->\n")).toEqual([
      "<!--",
      "  one",
      "  two",
      "-->",
    ]);
  });

  test.each(["html", "vue", "svelte", "astro"])("%s reads script comments", (ext) => {
    const source = '<script lang="ts">\n// inner\nconst s = "//";\n/* block */\n</script>\n';
    expect(commentTexts(`a.${ext}`, source)).toEqual(["// inner", "/* block */"]);
  });

  test("reads style comments", () => {
    const source = "<style>\n/* css */\n.a { }\n</style>\n";
    expect(commentTexts("a.html", source)).toEqual(["/* css */"]);
  });

  test("apostrophes in text do not open strings", () => {
    expect(commentTexts("a.html", "<p>don't</p>\n<!-- kept -->\n")).toEqual(["<!-- kept -->"]);
  });

  test.each(extensions)("%s flags an em dash in a comment and not in text", (ext) => {
    const result = expectEmDashInComments(`a.${ext}`, "<!-- a — b -->", "<p>a — b</p>");
    expect(result).toEqual({ inComment: ["em-dash"], inCode: [] });
  });

  test("flags an em dash in a script comment", () => {
    const result = expectEmDashInComments(
      "a.vue",
      "<script>// a — b</script>",
      '<script>let s = "a — b"</script>',
    );
    expect(result).toEqual({ inComment: ["em-dash"], inCode: [] });
  });
});
