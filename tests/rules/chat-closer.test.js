import { describe, expect, test } from "vitest";
import { ids, prose } from "../helpers.js";

describe("chat-closer", () => {
  test("flags a closer", () => {
    expect(ids(prose("Hope this helps! Let me know if you need more."))).toEqual([
      "chat-closer",
      "chat-closer",
    ]);
  });

  test("allows 'anything else' in ordinary prose", () => {
    expect(prose("Anything else is an error.")).toEqual([]);
  });
});
