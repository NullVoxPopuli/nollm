import { describe, expect, test } from "vitest";
import { ids, prose, texts } from "../helpers.js";

describe("path-comment", () => {
  test("flags a code block that opens with a file path comment", () => {
    const findings = prose("```js\n// app/services/session.js\nexport default class {}\n```\n");
    expect(ids(findings)).toEqual(["path-comment"]);
    expect(texts(findings)).toEqual(["// app/services/session.js"]);
    expect(findings.map((f) => [f.line, f.column])).toEqual([[2, 1]]);
  });

  test("flags Handlebars, HTML, and hash comments", () => {
    const source = [
      "```hbs",
      "{{! app/templates/application.hbs}}",
      "```",
      "",
      "```html",
      "<!-- public/index.html -->",
      "```",
      "",
      "```py",
      "# app/models.py",
      "```",
      "",
    ].join("\n");
    expect(ids(prose(source))).toEqual(["path-comment", "path-comment", "path-comment"]);
  });

  test("leaves a path comment further down the block alone", () => {
    const source = "```js\nimport a from 'a';\n// app/services/cart.js\n```\n";
    expect(ids(prose(source))).toEqual([]);
  });

  test("leaves a comment with words besides the path alone", () => {
    expect(ids(prose("```js\n// see app/services/session.js\n```\n"))).toEqual([]);
  });

  test("leaves a path without a directory alone", () => {
    expect(ids(prose("```js\n// session.js\n```\n"))).toEqual([]);
  });

  test("leaves a path comment after a closing fence alone", () => {
    expect(ids(prose("```js\nlet a;\n```\n// app/a.js\n"))).toEqual([]);
  });
});
