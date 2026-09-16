import { describe, expect, test } from "vitest";
import { ids, prose, texts } from "../helpers.js";

describe("llm-vocabulary", () => {
  test("flags typical model vocabulary", () => {
    const findings = prose("Let's dive into this crucial, game-changer tapestry.");
    expect(ids(findings)).toContain("llm-vocabulary");
    expect(texts(findings)).toContain("tapestry");
  });
});
