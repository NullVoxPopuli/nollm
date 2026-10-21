import { describe, expect, test } from "vitest";
import { comment, ids, prose } from "../helpers.js";

describe("same-way", () => {
  test("flags a sentence that ends on the same way", () => {
    expect(ids(prose("Both forms migrate the same way.\n"))).toEqual(["same-way"]);
  });

  test("flags the same thing", () => {
    expect(ids(prose("The imported `on()` did the same thing.\n"))).toEqual(["same-way"]);
  });

  test("flags a comment", () => {
    expect(ids(comment("Both branches work the same way."))).toEqual(["same-way"]);
  });

  test("leaves the same way in the middle of a sentence alone", () => {
    expect(ids(prose("Pass it the same way you pass a string.\n"))).toEqual([]);
  });
});
