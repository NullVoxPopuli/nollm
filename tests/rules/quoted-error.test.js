import { describe, expect, test } from "vitest";
import { check } from "../../src/index.js";
import { comment, ids, prose, texts } from "../helpers.js";

describe("quoted-error", () => {
  test("flags a quoted error message", () => {
    const findings = comment(
      'without this, the second render throws "Cannot read properties of null"',
    );
    expect(ids(findings)).toEqual(["quoted-error"]);
    expect(texts(findings)).toEqual(['"Cannot read properties of null"']);
  });

  test("flags error names and curly quotes", () => {
    expect(ids(comment('fails with "TypeError: x is not a function"'))).toEqual(["quoted-error"]);
    expect(ids(comment("fails with “Unexpected token”"))).toEqual(["quoted-error"]);
    expect(ids(comment('fails with "foo is not defined"'))).toEqual(["quoted-error"]);
  });

  test("flags a quote that wraps to the next comment line", () => {
    const source = "// throws \"Cannot read properties of null (reading\n// 'syscall')\".\n";
    expect(ids(check("a.js", source))).toEqual(["quoted-error"]);
  });

  test("allows quotes that are not error messages", () => {
    expect(comment('the header is "Content-Type" for every request')).toEqual([]);
    expect(comment('users type "cannot" into the search box')).toEqual([]);
  });

  test("allows an error message that is not quoted", () => {
    expect(comment("Cannot be called twice per render")).toEqual([]);
  });

  test("does not run in prose", () => {
    expect(prose('The CLI prints "Cannot find module" and exits.')).toEqual([]);
  });
});
