import { describe, expect, test } from "vitest";
import { comment, ids, prose, texts } from "../helpers.js";

describe("dramatic-verb", () => {
  test("flags dramatic failure verbs", () => {
    const findings = comment("the parser blows up on this and the worker dies with a stack trace");
    expect(ids(findings)).toEqual(["dramatic-verb", "dramatic-verb"]);
    expect(texts(findings)).toEqual(["blows up", "dies with"]);
  });

  test("flags every tense", () => {
    expect(ids(comment("blew up, falls over, choked on, trips over, bit us"))).toHaveLength(5);
  });

  test("runs in prose", () => {
    expect(ids(prose("Older versions explode on empty input."))).toEqual(["dramatic-verb"]);
  });

  test("allows plain verbs", () => {
    expect(comment("throws on empty input, and the worker exits with code 1")).toEqual([]);
  });
});
