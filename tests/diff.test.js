import { rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { ALL_LINES, changedLines } from "../src/index.js";
import { copyFixtureRepo, git } from "./helpers.js";

let cleanup = async () => {};

afterEach(async () => {
  await cleanup();
});

async function repo() {
  const copy = await copyFixtureRepo("project");
  cleanup = copy.cleanup;
  return copy.dir;
}

function lines(changed, file) {
  const set = changed.get(file);
  return set ? [...set].sort((a, b) => a - b) : null;
}

describe("changedLines", () => {
  test("reports the added lines of a committed change", async () => {
    const dir = await repo();
    await writeFile(join(dir, "docs", "notes.txt"), "Plain notes.\n\nSimply the best.\n");
    git(dir, "commit", "-qam", "edit");

    const changed = await changedLines("main", { cwd: dir });
    expect([...changed.keys()]).toEqual(["docs/notes.txt"]);
    expect(lines(changed, "docs/notes.txt")).toEqual([3]);
  });

  test("includes uncommitted edits", async () => {
    const dir = await repo();
    await writeFile(join(dir, "docs", "notes.txt"), "Plain notes.\n\nSimply the best.\n");

    const changed = await changedLines("main", { cwd: dir });
    expect(lines(changed, "docs/notes.txt")).toEqual([3]);
  });

  test("reports a committed new file line by line", async () => {
    const dir = await repo();
    await writeFile(join(dir, "docs", "guide.md"), "# Guide\n\nDelve into it.\n");
    git(dir, "add", "-A");
    git(dir, "commit", "-qm", "add guide");

    const changed = await changedLines("main", { cwd: dir });
    expect(lines(changed, "docs/guide.md")).toEqual([1, 2, 3]);
  });

  test("counts an untracked file as new in full", async () => {
    const dir = await repo();
    await writeFile(join(dir, "docs", "guide.md"), "# Guide\n\nDelve into it.\n");

    const changed = await changedLines("main", { cwd: dir });
    expect(changed.get("docs/guide.md")).toBe(ALL_LINES);
  });

  test("leaves out files that only lost lines", async () => {
    const dir = await repo();
    await writeFile(join(dir, "docs", "notes.txt"), "Plain notes.\n");

    const changed = await changedLines("main", { cwd: dir });
    expect(changed.has("docs/notes.txt")).toBe(false);
  });

  test("leaves out deleted files", async () => {
    const dir = await repo();
    await rm(join(dir, "docs", "notes.txt"));

    const changed = await changedLines("main", { cwd: dir });
    expect(changed.size).toBe(0);
  });

  test("diffs from the merge base, not the tip of the base branch", async () => {
    const dir = await repo();
    await writeFile(join(dir, "docs", "notes.txt"), "Plain notes.\n\nSimply the best.\n");
    git(dir, "commit", "-qam", "edit");

    // A commit on main after the branch point must not show up as our change.
    git(dir, "checkout", "-q", "main");
    await writeFile(join(dir, "docs", "other.md"), "Delve into it.\n");
    git(dir, "add", "-A");
    git(dir, "commit", "-qm", "moved on");
    git(dir, "checkout", "-q", "feature");

    const changed = await changedLines("main", { cwd: dir });
    expect([...changed.keys()]).toEqual(["docs/notes.txt"]);
  });

  test("resolves paths against cwd", async () => {
    const dir = await repo();
    await writeFile(join(dir, "docs", "notes.txt"), "Plain notes.\n\nSimply the best.\n");
    await writeFile(join(dir, "README.md"), "# Sample\n\nDelve into it.\n");

    const changed = await changedLines("main", { cwd: join(dir, "docs") });
    expect([...changed.keys()]).toEqual(["notes.txt"]);
  });

  test("explains an unknown ref", async () => {
    const dir = await repo();
    await expect(changedLines("no-such-branch", { cwd: dir })).rejects.toThrow(
      /Could not diff against "no-such-branch"/,
    );
  });
});
