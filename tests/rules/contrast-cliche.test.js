import { describe, expect, test } from "vitest";
import { ids, prose } from "../helpers.js";

describe("contrast-cliche", () => {
  test("flags 'not just X, but Y'", () => {
    expect(ids(prose("It is not just fast, but also safe."))).toEqual(["contrast-cliche"]);
  });

  test("flags 'it's not X, it's Y'", () => {
    expect(ids(prose("It's not a bug, it's a feature."))).toEqual(["contrast-cliche"]);
  });
});
