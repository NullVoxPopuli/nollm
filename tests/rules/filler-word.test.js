import { describe, expect, test } from "vitest";
import { prose, texts } from "../helpers.js";

describe("filler-word", () => {
  test("flags filler words and phrases", () => {
    const findings = prose("Simply use the robust API. It works seamlessly.");
    expect(texts(findings)).toEqual(["Simply", "robust", "seamlessly"]);
  });

  test("allows common words that humans write too", () => {
    expect(
      prose("Utilize this powerful tool in order to leverage it. Keep in mind the cost."),
    ).toEqual([]);
  });
});
