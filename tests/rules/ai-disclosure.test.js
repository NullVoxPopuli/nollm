import { describe, expect, test } from "vitest";
import { ids, prose } from "../helpers.js";

describe("ai-disclosure", () => {
  test("flags assistant self reference", () => {
    expect(ids(prose("As an AI, I cannot run this."))).toEqual(["ai-disclosure"]);
  });
});
