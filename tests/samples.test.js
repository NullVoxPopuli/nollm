import { describe, expect, test } from "vitest";
import { check } from "../src/index.js";
import { ids } from "./helpers.js";

/**
 * Whole comments seen in the wild, so that a rule change
 * cannot quietly stop catching a paragraph as a whole.
 */
describe("samples", () => {
  test("catches a workaround comment that quotes the error it avoids", () => {
    const source = `function render() {
      // A fresh owner per render, like gjs/hbs do: template instances (and
      // their compiled handles) are cached per owner, but each renderComponent
      // call has its own program artifacts. Sharing one owner across islands
      // would make glimmer reuse a compiled handle from another island's
      // program, blowing up with "Cannot read properties of null (reading
      // 'syscall')" the second time a singleton scope component is invoked.
}
`;
    expect(ids(check("render.js", source))).toEqual([
      "parenthetical-aside",
      "long-sentence",
      "dramatic-verb",
      "quoted-error",
    ]);
  });

  test("catches a yaml comment that argues the change is safe", () => {
    const source = `allowBuilds:
  '@sentry-internal/node-cpu-profiler': false
  # Was never built under pnpm 10 either (no onlyBuiltDependencies), and the
  # production image lacks libcairo. Keeping it off = no behavior change.
`;
    expect(ids(check("pnpm-workspace.yaml", source))).toEqual([
      "no-short-term-relevance",
      "no-short-term-relevance",
    ]);
  });

  test("catches a one sentence chain of but, so, and or", () => {
    const source = `function render() {
      // Each document renders as its own island with its own program
      // artifacts, but a component's template (and its compiled handle) is
      // cached per owner, so the islands must not share an owner, or the
      // second document dies with
      // "Cannot read properties of null (reading 'syscall')".
}
`;
    expect(ids(check("render.js", source))).toEqual([
      "long-sentence",
      "parenthetical-aside",
      "dramatic-verb",
      "quoted-error",
    ]);
  });
});
