import { describe, expect, test } from "vitest";
import { check } from "../../src/index.js";
import { comment, ids, prose, texts } from "../helpers.js";

describe("points-back", () => {
  test("flags a short This sentence that reports what the one before achieved", () => {
    const findings = prose(
      "Read the value from the source. This removes the subscription entirely.\n",
    );
    expect(ids(findings)).toEqual(["points-back"]);
    expect(texts(findings)).toEqual(["This removes the subscription entirely"]);
  });

  test("flags That at the start of a line and before a comma", () => {
    const findings = prose("That clears the deprecation, and the rest can wait.\n");
    expect(texts(findings)).toEqual(["That clears the deprecation"]);
  });

  test("flags a list item", () => {
    expect(ids(prose("1. Derive the state. This keeps it simple.\n"))).toEqual(["points-back"]);
  });

  test("flags a claim that something already does this", () => {
    const findings = prose("Tracked properties already do this. Read them directly.\n");
    expect(texts(findings)).toEqual(["already do this"]);
  });

  test("flags a comment", () => {
    expect(ids(comment("Cache the parse. This avoids the second pass."))).toEqual(["points-back"]);
  });

  test("flags a sentence inside a block comment", () => {
    const source = ["/**", " * Sort first. That makes it fast.", " */", ""].join("\n");
    expect(ids(check("code.js", source))).toEqual(["points-back"]);
  });

  test("leaves a This sentence that carries its own fact alone", () => {
    expect(ids(prose("This means the cache is empty after every deploy.\n"))).toEqual([]);
  });

  test("leaves This followed by a noun alone", () => {
    expect(ids(prose("This function removes the file.\n"))).toEqual([]);
  });

  test("leaves This in the middle of a sentence alone", () => {
    expect(ids(prose("Run the step that removes it.\n"))).toEqual([]);
  });
});
