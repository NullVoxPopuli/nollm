import { describe, expect, test } from "vitest";
import { check } from "../../src/index.js";
import { commentTexts, expectEmDashInComments } from "../helpers.js";

describe("glimmer", () => {
  test.each(["hbs", "handlebars"])("%s uses {{! }}, {{!-- --}}, and <!-- -->", (ext) => {
    const source = "{{! one }}\n{{!-- two --}}\n<!-- three -->\n{{yield}}\n";
    expect(commentTexts(`a.${ext}`, source)).toEqual([
      "{{! one }}",
      "{{!-- two --}}",
      "<!-- three -->",
    ]);
  });

  test("a {{!-- --}} comment may contain }}", () => {
    const source = "{{!-- {{foo}} --}}\n";
    expect(commentTexts("a.hbs", source)).toEqual(["{{!-- {{foo}} --}}"]);
  });

  test("apostrophes in template text do not open strings", () => {
    const source = "<p>don't</p>\n{{! kept }}\n";
    expect(commentTexts("a.hbs", source)).toEqual(["{{! kept }}"]);
  });

  test.each(["gjs", "gts"])("%s switches to template comments inside <template>", (ext) => {
    const source =
      "// js\n<template>\n  {{! hbs }}\n  {{!-- block --}}\n  <p>don't // text</p>\n</template>\n// after\n";
    expect(commentTexts(`a.${ext}`, source)).toEqual([
      "// js",
      "{{! hbs }}",
      "{{!-- block --}}",
      "// after",
    ]);
  });

  test("gjs class bodies with templates", () => {
    const source =
      "class A extends Component {\n  // field\n  <template>\n    <!-- html -->\n  </template>\n}\n";
    expect(commentTexts("a.gjs", source)).toEqual(["// field", "<!-- html -->"]);
  });

  test.each(["hbs", "gjs", "gts"])("%s flags an em dash in a comment and not in text", (ext) => {
    const inTemplate = ext === "hbs" ? "" : "<template>";
    const closing = ext === "hbs" ? "" : "</template>";
    const result = expectEmDashInComments(
      `a.${ext}`,
      `${inTemplate}{{! a — b }}${closing}`,
      `${inTemplate}<p>a — b</p>${closing}`,
    );
    expect(result).toEqual({ inComment: ["em-dash"], inCode: [] });
  });

  test("reads a comment without its {{! }} markers", () => {
    const source = [
      "{{! This org can be updated, so it is a valid choice for the energy audit onboarding }}",
      "{{! (We check this to avoid showing orgs that the user can see but cannot update, since updating is needed to turn on the feature) }}",
      "",
    ].join("\n");
    expect(check("a.hbs", source)).toMatchObject([{ line: 1, column: 5, ruleId: "long-sentence" }]);
  });
});
