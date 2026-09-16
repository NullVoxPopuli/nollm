import { describe, expect, test } from "vitest";
import { comment, ids } from "../helpers.js";

describe("what-comment", () => {
  test("flags comments that narrate the code", () => {
    expect(ids(comment("This function returns the user"))).toEqual(["what-comment"]);
    expect(ids(comment("Loop over the entries"))).toEqual(["what-comment"]);
  });

  test("allows comments that explain why", () => {
    expect(comment("The API returns null on weekends, so retry on Monday")).toEqual([]);
  });
});
