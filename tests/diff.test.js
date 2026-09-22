import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { ALL_LINES, changedLines } from "../src/index.js";
import { copyFixtureRepo, git } from "./helpers.js";

const cleanups = [];

afterEach(async () => {
  while (cleanups.length > 0) await cleanups.pop()();
});

async function repo() {
  const copy = await copyFixtureRepo("project");
  cleanups.push(copy.cleanup);
  return copy.dir;
}

/** A depth 1 clone of a repository, the shape a CI checkout has by default. */
async function shallowCloneOf(source) {
  const parent = await mkdtemp(join(tmpdir(), "nollm-shallow-"));
  cleanups.push(() => rm(parent, { recursive: true, force: true }));

  const target = join(parent, "clone");
  git(parent, "clone", "-q", "--depth", "1", "--no-single-branch", `file://${source}`, target);
  git(target, "fetch", "-q", "--depth", "1", "origin", "main:refs/remotes/origin/main");
  return target;
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

  test("says how to fetch a ref that is not here", async () => {
    const dir = await repo();
    git(dir, "remote", "add", "origin", "https://example.com/repo.git");

    await expect(changedLines("origin/develop", { cwd: dir })).rejects
      .toThrowErrorMatchingInlineSnapshot(`
        [Error: Could not find "origin/develop".
        Fetch it with: git fetch origin develop
        In GitHub Actions, set fetch-depth: 0 on actions/checkout.]
      `);
  });

  test("keeps a slash in a branch name out of the fetch line", async () => {
    const dir = await repo();
    git(dir, "remote", "add", "origin", "https://example.com/repo.git");

    // The repository has remotes and none is called "release", so the whole
    // thing is a branch name.
    await expect(changedLines("release/1.0", { cwd: dir })).rejects.toThrow(
      "git fetch origin release/1.0",
    );
  });

  test("says when there is no repository at all", async () => {
    const copy = await copyFixtureRepo("project");
    cleanups.push(copy.cleanup);
    await rm(join(copy.dir, ".git"), { recursive: true, force: true });

    await expect(changedLines("main", { cwd: copy.dir })).rejects.toThrow(
      'Not a git repository, so there is nothing to compare "main" against.',
    );
  });

  test("says when the two sides share no history", async () => {
    const dir = await repo();
    git(dir, "checkout", "-q", "--orphan", "lonely");
    await writeFile(join(dir, "only.md"), "# Only\n");
    git(dir, "add", "-A");
    git(dir, "commit", "-qm", "lonely");
    git(dir, "checkout", "-q", "feature");

    await expect(changedLines("lonely", { cwd: dir })).rejects.toThrow(
      '"lonely" and the current branch share no history',
    );
  });

  test("says the clone is shallow when that is why there is no merge base", async () => {
    const source = await repo();
    await writeFile(join(source, "docs", "notes.txt"), "Plain notes.\n\nDelve into it.\n");
    git(source, "commit", "-qam", "work on the branch");

    const clone = await shallowCloneOf(source);
    await expect(changedLines("origin/main", { cwd: clone })).rejects
      .toThrowErrorMatchingInlineSnapshot(`
        [Error: No merge base with "origin/main". This clone is shallow, so the shared commit is missing.
        Deepen it with: git fetch --unshallow
        In GitHub Actions, set fetch-depth: 0 on actions/checkout.]
      `);
  });
});
