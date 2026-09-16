import { describe, expect, test } from "vitest";
import { comment, ids, prose } from "../helpers.js";

describe("diff-comment", () => {
  test("flags comments that describe the change", () => {
    expect(ids(comment("no longer needed, as discussed"))).toEqual([
      "diff-comment",
      "diff-comment",
    ]);
  });

  test("flags previously and formerly at the start of a sentence", () => {
    expect(ids(comment("Previously this returned null"))).toEqual(["diff-comment"]);
    expect(ids(comment("Fast path. Formerly the slow one"))).toEqual(["diff-comment"]);
  });

  test("allows previously inside a sentence", () => {
    const ember =
      "Uncaught (in promise) Error: Assertion Failed: You attempted to update `count` on `Demo`, " +
      "but it had already been used previously in the same computation.  Attempting to update a " +
      "value after using it in a computation can cause logical errors, infinite revalidation " +
      "bugs, and performance issues, and is not supported.";
    expect(comment(ember)).toEqual([]);
    expect(comment("the value computed previously is reused")).toEqual([]);
  });

  test("does not run in prose", () => {
    expect(prose("This field is no longer required.")).toEqual([]);
  });
});
