import { describe, expect, test } from "vitest";
import { check } from "../src/index.js";
import { ids } from "./helpers.js";

describe("commented-out code", () => {
  test("skips commented-out statements", () => {
    const source = [
      "// const total = list.reduce((sum, item) => sum + item.value, 0);",
      "// const average = total / list.length;",
      "// if (average > limit) {",
      "//   report({ total, average, limit });",
      "// }",
      "// return { total, average };",
      "",
    ].join("\n");
    expect(check("a.js", source)).toEqual([]);
  });

  test("skips commented-out markup", () => {
    const source = [
      "{{!-- <button type='button' class='rounded px-3 py-2 text-sm' {{on 'click' this.save}}>",
      "  {{t 'Save changes'}}",
      "</button>",
      "<menu id='grant-menu' popover {{popover}} class='absolute right-0 mt-2 w-56 rounded shadow'>",
      "  {{#each this.grants as |grant|}}",
      "    <li role='menuitem' {{on 'click' (fn this.pick grant)}}>{{grant.displayName}}</li>",
      "  {{/each}}",
      "</menu>",
      "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'>",
      "  <path d='M22 9.81v1.04a2.06 2.06 0 0 0-.7-.12h-3.48c-1.55 0-2.8 1.26-2.8 2.8v1.66' />",
      "  <path d='M11.05 14.95L9.2 16.8c-.39.39-1.01.39-1.41.01-.11-.11-.22-.21-.33-.32a28.414 28.414 0 01-2.79-3.27' />",
      "</svg> --}}",
      '<!-- <td class="px-6 py-4 text-center">{{format value}}</td> -->',
      "",
    ].join("\n");
    expect(check("a.hbs", source)).toEqual([]);
  });

  test("skips a block comment of commented-out code", () => {
    const source = [
      "/*",
      "  msEntraGroupMappingList: {",
      "    read(_, { args }) {",
      "      return args.list.filter((entry) => entry.active).map((entry) => entry.id);",
      "    },",
      "    merge(existing = [], incoming, { readField }) {",
      "      return [...existing, ...incoming.filter((entry) => readField('id', entry) !== null)];",
      "    },",
      "  },",
      "*/",
      "",
    ].join("\n");
    expect(check("a.ts", source)).toEqual([]);
  });

  test("skips a diagram", () => {
    const source = [
      "//  ┌─────────┐    ┌─────────┐    ┌─────────┐",
      "//  │  login  │──▶ │ resolve │──▶ │  retry  │ ▼ (no error) → silent │ ▼ │ (error) → shown",
      "//  └────┬────┘    └────┬────┘    └────┬────┘",
      "//       │              │              │",
      "//       ▼              ▼              ▼",
      "//  ┌─────────┐    ┌─────────┐    ┌─────────┐",
      "//  │ session │    │  token  │    │  reload │",
      "//  └─────────┘    └─────────┘    └─────────┘",
      "",
    ].join("\n");
    expect(check("a.js", source)).toEqual([]);
  });

  test("a code line ends the paragraph, as a blank line does", () => {
    const source = "// Give the result to the\n// <br />\n// caller. Simply that.\n";
    expect(ids(check("a.js", source))).toEqual(["filler-word"]);
  });

  test("keeps a comment about the commented-out code below it", () => {
    const source = [
      "<!-- Simply not ready yet. -->",
      "<!-- <ul>",
      "  <li class='item'>One</li>",
      "</ul> -->",
      "",
    ].join("\n");
    expect(check("a.html", source)).toMatchObject([{ line: 1, ruleId: "filler-word" }]);
  });

  test("keeps prose that mentions code", () => {
    const source =
      '// Simply call `save()` (see foo.bar) with a value of 1.5 and/or the e.g. "default" name.\n';
    expect(ids(check("a.js", source))).toEqual(["filler-word"]);
  });

  test("keeps prose that is dense with identifiers", () => {
    const go =
      "// Simply put, len(m) >= len(s) holds, and `recalc_from = LEAST(a, b)` keeps the manual_telemetry rows.\n";
    const js =
      "// Note: organizationDisplayName, inviterDisplayName, inviteeDisplayName are simply in localStorage\n";
    expect(ids(check("a.go", go))).toEqual(["filler-word"]);
    expect(ids(check("a.js", js))).toEqual(["filler-word"]);
  });

  test("keeps prose with product names and emphasis", () => {
    const source = "// 3. **Excavator family.** TypeScript and GitHub simply read it this way.\n";
    expect(ids(check("a.js", source))).toEqual(["filler-word"]);
  });

  test("keeps the prose of a doc comment with tags", () => {
    const source =
      "/**\n * Simply returns the thing.\n * @param {string} name\n * @returns {Thing}\n */\n";
    expect(check("a.js", source)).toMatchObject([{ line: 2, ruleId: "filler-word" }]);
  });

  test("skips the lines of a commented-out block that read as prose", () => {
    const source = [
      "// const labels = {",
      "//   simply: 'Simply put',",
      "//   delve: 'Delve into it',",
      "// }",
      "",
    ].join("\n");
    expect(check("a.js", source)).toEqual([]);
  });

  test("skips a line of copy inside commented-out markup", () => {
    const source = [
      "<!-- <button type='button' class='rounded px-3 py-2 text-sm'>",
      "  Simply save",
      "</button>",
      "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'>",
      "  <path d='M22 9.81v1.04a2.06 2.06 0 0 0-.7-.12h-3.48c-1.55 0-2.8 1.26-2.8 2.8v1.66' />",
      "</svg> -->",
      "",
    ].join("\n");
    expect(check("a.html", source)).toEqual([]);
  });

  test("skips a diagram with words in it", () => {
    const source = [
      "//  ┌─────────┐    ┌─────────┐",
      "//  │  login  │──▶ │ resolve │ ▼ (no error) → simply silent",
      "//  └────┬────┘    └────┬────┘",
      "//       │ popup-blocked?     │ submit",
      "",
    ].join("\n");
    expect(check("a.js", source)).toEqual([]);
  });
});
