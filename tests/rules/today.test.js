import { describe, expect, test } from "vitest";
import { comment, ids, prose } from "../helpers.js";

describe("today", () => {
  test("flags today at the end of a sentence", () => {
    expect(ids(prose("You can remove the subscription today. Override the hook.\n"))).toEqual([
      "today",
    ]);
  });

  test("flags a comment", () => {
    expect(ids(comment("Nothing calls this today."))).toEqual(["today"]);
  });

  test("leaves today at the start of a sentence alone", () => {
    expect(ids(prose("Today, integration tests spend time in the resolver.\n"))).toEqual([]);
  });

  test("leaves today's alone", () => {
    expect(ids(prose("Read today's date from the clock.\n"))).toEqual([]);
  });
});
