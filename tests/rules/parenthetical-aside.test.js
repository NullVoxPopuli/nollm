import { describe, expect, test } from "vitest";
import { comment, ids, prose, texts } from "../helpers.js";

describe("parenthetical-aside", () => {
  test("flags a parenthetical that starts with a conjunction", () => {
    const findings = comment("templates (and their compiled handles) are cached per owner");
    expect(ids(findings)).toEqual(["parenthetical-aside"]);
    expect(texts(findings)).toEqual(["(and their compiled handles)"]);
  });

  test("flags an aside that wraps to the next line", () => {
    expect(texts(comment("template instances (and"))).toEqual(["(and"]);
  });

  test("runs in prose", () => {
    expect(ids(prose("It is fast (though not the fastest)."))).toEqual(["parenthetical-aside"]);
  });

  test("allows other parentheticals", () => {
    expect(comment("returns the id (or null) of the record")).toEqual([]);
    expect(comment("see the spec (section 4.2) for details")).toEqual([]);
    expect(comment("android (Android 12 and up) is supported")).toEqual([]);
  });
});
