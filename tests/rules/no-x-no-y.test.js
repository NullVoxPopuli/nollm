import { describe, expect, test } from "vitest";
import { check } from "../../src/index.js";
import { comment, ids, prose, texts } from "../helpers.js";

describe("no-x-no-y", () => {
  test("flags two sentences in a row that start with No", () => {
    const findings = prose("No config. No build step.\n");
    expect(ids(findings)).toEqual(["no-x-no-y"]);
    expect(texts(findings)).toEqual(["2 sentences: No config"]);
  });

  test("flags a longer run once", () => {
    expect(ids(prose("No config. No build step. No magic.\n"))).toEqual(["no-x-no-y"]);
  });

  test("flags a run that starts mid paragraph", () => {
    const findings = prose("It runs anywhere. No config. No build step.\n");
    expect(findings.map((f) => [f.line, f.column])).toEqual([[1, 19]]);
  });

  test("flags a run that wraps onto the next line", () => {
    const findings = prose("Install it and go. No config.\nNo build step.\n");
    expect(findings.map((f) => [f.ruleId, f.line, f.column])).toEqual([["no-x-no-y", 1, 20]]);
  });

  test("flags a run in a comment", () => {
    expect(ids(comment("No locks. No retries."))).toEqual(["no-x-no-y"]);
  });

  test("flags a run inside a block comment", () => {
    const source = ["/**", " * No locks.", " * No retries.", " */", ""].join("\n");
    expect(ids(check("code.js", source))).toEqual(["no-x-no-y"]);
  });

  test("leaves a single No sentence alone", () => {
    expect(ids(prose("No config file exists. Run the command.\n"))).toEqual([]);
  });

  test("leaves No sentences in separate paragraphs alone", () => {
    expect(ids(prose("No config file exists.\n\nNo build step runs.\n"))).toEqual([]);
  });

  test("leaves separate list items alone", () => {
    expect(ids(prose("- No config.\n- No build step.\n"))).toEqual([]);
  });

  test("leaves a bare No and words that start with No alone", () => {
    expect(ids(prose("No. Nobody asked. None of it runs. Nothing breaks.\n"))).toEqual([]);
  });
});
