import { describe, expect, test } from "vitest";
import { comment, ids, prose } from "../helpers.js";

describe("emoji-list", () => {
  test("flags list items that start with an emoji", () => {
    expect(ids(prose("- \u{1F680} Fast"))).toEqual(["emoji-list"]);
    expect(ids(prose("* ✅ Tested"))).toEqual(["emoji-list"]);
    expect(ids(prose("1. ⚠️ Careful"))).toEqual(["emoji-list"]);
    expect(ids(prose("  - \u{1F4E6} nested"))).toEqual(["emoji-list"]);
  });

  test("allows emoji elsewhere in prose", () => {
    expect(prose("Ship it \u{1F680}")).toEqual([]);
    expect(prose("\u{1F680} Ship it")).toEqual([]);
    expect(prose("- Ship it \u{1F680}")).toEqual([]);
  });

  test("allows text symbols like arrows", () => {
    expect(prose("- ↔ both ways")).toEqual([]);
  });

  test("does not run in comments", () => {
    expect(comment("- \u{1F680} Fast")).toEqual([]);
  });
});
