import { readFile, rm, writeFile } from "node:fs/promises";
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

/**
 * The whole result as one block, so a snapshot shows which files are in it
 * and which are not.
 */
function report(changed) {
  const rows = [];
  for (const [file, lines] of changed) {
    const where = lines === ALL_LINES ? "all" : [...lines].sort((a, b) => a - b).join(" ");
    rows.push(`${file}: ${where}`);
  }
  return rows.sort().join("\n");
}

describe("changedLines", () => {
  test("reports the added lines of a committed change", async () => {
    const dir = await repo();
    await writeFile(join(dir, "docs", "notes.txt"), "Plain notes.\n\nSimply the best.\n");
    git(dir, "commit", "-qam", "edit");

    expect(report(await changedLines("main", { cwd: dir }))).toMatchInlineSnapshot(
      `"docs/notes.txt: 3"`,
    );
  });

  test("includes uncommitted edits", async () => {
    const dir = await repo();
    await writeFile(join(dir, "docs", "notes.txt"), "Plain notes.\n\nSimply the best.\n");

    expect(report(await changedLines("main", { cwd: dir }))).toMatchInlineSnapshot(
      `"docs/notes.txt: 3"`,
    );
  });

  test("reports every hunk of a file", async () => {
    const dir = await repo();
    const readme = await readFile(join(dir, "README.md"), "utf8");
    await writeFile(
      join(dir, "README.md"),
      readme
        .replace("This tool is simply the most robust option.", "Delve into it.\nTwice over.")
        .replace("Hope this helps!", "Let me know if"),
    );

    expect(report(await changedLines("main", { cwd: dir }))).toMatchInlineSnapshot(
      `"README.md: 3 4 10"`,
    );
  });

  test("reports a committed new file line by line", async () => {
    const dir = await repo();
    await writeFile(join(dir, "docs", "guide.md"), "# Guide\n\nDelve into it.\n");
    git(dir, "add", "-A");
    git(dir, "commit", "-qm", "add guide");

    expect(report(await changedLines("main", { cwd: dir }))).toMatchInlineSnapshot(
      `"docs/guide.md: 1 2 3"`,
    );
  });

  test("counts an untracked file as new in full", async () => {
    const dir = await repo();
    await writeFile(join(dir, "docs", "guide.md"), "# Guide\n\nDelve into it.\n");

    expect(report(await changedLines("main", { cwd: dir }))).toMatchInlineSnapshot(
      `"docs/guide.md: all"`,
    );
  });

  test("leaves out files that only lost lines", async () => {
    const dir = await repo();
    await writeFile(join(dir, "docs", "notes.txt"), "Plain notes.\n");

    expect(report(await changedLines("main", { cwd: dir }))).toMatchInlineSnapshot(`""`);
  });

  test("leaves out deleted files", async () => {
    const dir = await repo();
    await rm(join(dir, "docs", "notes.txt"));

    expect(report(await changedLines("main", { cwd: dir }))).toMatchInlineSnapshot(`""`);
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

    expect(report(await changedLines("main", { cwd: dir }))).toMatchInlineSnapshot(
      `"docs/notes.txt: 3"`,
    );
  });

  test("resolves paths against cwd", async () => {
    const dir = await repo();
    await writeFile(join(dir, "docs", "notes.txt"), "Plain notes.\n\nSimply the best.\n");
    await writeFile(join(dir, "README.md"), "# Sample\n\nDelve into it.\n");

    expect(report(await changedLines("main", { cwd: join(dir, "docs") }))).toMatchInlineSnapshot(
      `"notes.txt: 3"`,
    );
  });

  test("explains an unknown ref", async () => {
    const dir = await repo();
    await expect(changedLines("no-such-branch", { cwd: dir })).rejects.toThrow(
      /Could not diff against "no-such-branch"/,
    );
  });
});
