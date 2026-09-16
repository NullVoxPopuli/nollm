import { describe, expect, test } from "vitest";
import { comment, ids, prose } from "../helpers.js";

describe("bold-list-item", () => {
  test("flags a bold label followed by plain text in a list item", () => {
    expect(ids(prose("- **Fast:** it uses workers"))).toEqual(["bold-list-item"]);
    expect(ids(prose("* **Fast**: it uses workers"))).toEqual(["bold-list-item"]);
    expect(ids(prose("1. **Fast** because it uses workers"))).toEqual(["bold-list-item"]);
    expect(ids(prose("  - __Fast__: nested item"))).toEqual(["bold-list-item"]);
  });

  test("allows bold outside of lists", () => {
    expect(prose("**Note:** the file must exist")).toEqual([]);
    expect(prose("Run it. **Then** read the log.")).toEqual([]);
  });

  test("allows a list item that is bold all the way through", () => {
    expect(prose("- **Fast**")).toEqual([]);
    expect(prose("- **Fast** **and** **safe**")).toEqual([]);
  });

  test("allows a list item with bold in the middle", () => {
    expect(prose("- run **this** first")).toEqual([]);
  });

  test("does not run in comments", () => {
    expect(comment("- **Note:** the file must exist")).toEqual([]);
  });
});
