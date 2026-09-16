import { describe, expect, test } from "vitest";
import { check } from "../../src/index.js";
import { comment, ids, prose } from "../helpers.js";

describe("em-dash", () => {
  test("flags the em dash character in comments", () => {
    expect(ids(comment("one \u2014 two"))).toEqual(["em-dash"]);
    expect(ids(check("a.py", "# one \u2014 two\n"))).toEqual(["em-dash"]);
  });

  test("allows em dashes in prose", () => {
    expect(prose("one \u2014 two")).toEqual([]);
  });

  test("allows hyphens and en dashes", () => {
    expect(comment("one - two \u2013 three")).toEqual([]);
  });
});
