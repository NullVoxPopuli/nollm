import { describe, expect, test } from "vitest";
import { comment, ids, prose, texts } from "../helpers.js";

describe("no-short-term-relevance", () => {
  test("flags comments that describe the change", () => {
    expect(ids(comment("no longer needed, as discussed"))).toEqual([
      "no-short-term-relevance",
      "no-short-term-relevance",
    ]);
  });

  test("flags comments that argue the change is safe", () => {
    expect(texts(comment("Keeping it off = no behavior change."))).toEqual([
      "Keeping it off",
      "no behavior change",
    ]);
    expect(texts(comment("Same as before, just moved to a helper"))).toEqual([
      "Same as before",
      "moved to",
    ]);
    expect(ids(comment("This preserves existing behaviour for callers"))).toEqual([
      "no-short-term-relevance",
    ]);
  });

  test("flags comments about how the code used to fail", () => {
    expect(ids(comment("This test was failing on the main branch"))).toEqual([
      "no-short-term-relevance",
      "no-short-term-relevance",
    ]);
    expect(ids(comment("never worked with node 22"))).toEqual(["no-short-term-relevance"]);
  });

  test("flags comments that explain a step that is not there", () => {
    expect(
      texts(comment("No corepack in the non-dev image, so there is nothing to disable here.")),
    ).toEqual(["nothing to disable"]);
    expect(ids(comment("The flag is off by default, so no need to turn off"))).toEqual([
      "no-short-term-relevance",
    ]);
  });

  test("flags scope and follow-up talk", () => {
    expect(ids(comment("disabled for now, will be removed in a follow-up"))).toEqual([
      "no-short-term-relevance",
      "no-short-term-relevance",
      "no-short-term-relevance",
    ]);
    expect(ids(comment("out of scope for this PR"))).toEqual([
      "no-short-term-relevance",
      "no-short-term-relevance",
    ]);
    expect(ids(comment("quick fix until the upstream release"))).toEqual([
      "no-short-term-relevance",
    ]);
  });

  test("flags the author narrating their own process", () => {
    expect(ids(comment("I tested this locally against staging"))).toEqual([
      "no-short-term-relevance",
    ]);
    expect(ids(comment("not sure if this is still needed"))).toEqual(["no-short-term-relevance"]);
    expect(ids(comment("Note for reviewers: the order matters here"))).toEqual([
      "no-short-term-relevance",
    ]);
  });

  test("flags previously, formerly, and originally at the start of a sentence", () => {
    expect(ids(comment("Previously this returned null"))).toEqual(["no-short-term-relevance"]);
    expect(ids(comment("Fast path. Formerly the slow one"))).toEqual(["no-short-term-relevance"]);
    expect(ids(comment("Originally a class, but hooks made it a function"))).toEqual([
      "no-short-term-relevance",
    ]);
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

  test("allows comments that explain the code as it is", () => {
    expect(comment("Retries three times because the upstream API drops idle connections")).toEqual(
      [],
    );
    expect(comment("Runs on the main thread, so it must not block")).toEqual([]);
    expect(comment("The lock is held while the buffer is flushed")).toEqual([]);
    expect(comment("Items pending review are hidden from the report")).toEqual([]);
  });

  test("does not run in prose", () => {
    expect(prose("This field is no longer required. No behavior change for now.")).toEqual([]);
  });
});
