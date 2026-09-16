import { describe, expect, test } from "vitest";
import { comment, ids, prose } from "../helpers.js";

describe("rhetorical-question", () => {
  test("flags 'Why? Because'", () => {
    expect(ids(prose("Why? Because the cache is cold."))).toEqual(["rhetorical-question"]);
  });

  test("does not run in comments", () => {
    expect(comment("The result? A faster build.")).toEqual([]);
  });
});
