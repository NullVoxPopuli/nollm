import { describe, expect, test } from "vitest";
import { comment, ids, prose, texts } from "../helpers.js";

describe("nothing-needed", () => {
  test("flags No X is necessary", () => {
    const findings = prose(
      "Use registerDestructor. No `willDestroy` hook or manual cleanup is necessary.\n",
    );
    expect(ids(findings)).toEqual(["nothing-needed"]);
    expect(texts(findings)).toEqual(["No `willDestroy` hook or manual cleanup is necessary"]);
  });

  test("flags needed and required", () => {
    expect(ids(prose("No config is needed.\n"))).toEqual(["nothing-needed"]);
    expect(ids(prose("No build step is required.\n"))).toEqual(["nothing-needed"]);
  });

  test("flags needs neither", () => {
    const findings = prose("The listener needs neither a copy nor a subscription.\n");
    expect(texts(findings)).toEqual(["needs neither"]);
  });

  test("flags a comment", () => {
    expect(ids(comment("No lock is needed here."))).toEqual(["nothing-needed"]);
  });

  test("leaves a sentence that says what is needed alone", () => {
    expect(ids(prose("A lock is needed here.\n"))).toEqual([]);
  });

  test("leaves No in a separate sentence alone", () => {
    expect(ids(prose("No. The config is needed.\n"))).toEqual([]);
  });
});
