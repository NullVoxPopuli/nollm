import { describe, expect, test } from "vitest";
import { comment, ids, prose } from "../helpers.js";

describe("chat-opener", () => {
  test("flags an opener at the start of a line", () => {
    expect(ids(prose("Great question! The answer is yes."))).toEqual(["chat-opener"]);
    expect(ids(prose("Certainly, here is the code."))).toEqual(["chat-opener"]);
  });

  test("flags an opener at the start of a comment", () => {
    expect(ids(comment("Sure, this can be improved."))).toEqual(["chat-opener"]);
  });

  test("allows the same words mid sentence", () => {
    expect(prose("Make sure the file exists.")).toEqual([]);
  });
});
