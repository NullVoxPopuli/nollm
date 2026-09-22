import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { collectFiles } from "../src/index.js";
import { copyFixture } from "./helpers.js";

const cleanups = [];

afterEach(async () => {
  while (cleanups.length > 0) await cleanups.pop()();
});

let cleanup = (fn) => cleanups.push(fn);

async function fixture() {
  const copy = await copyFixture("project");
  cleanup(copy.cleanup);
  const dir = copy.dir;
  await mkdir(join(dir, "ignored"), { recursive: true });
  await writeFile(join(dir, "ignored", "secret.md"), "genuinely\n");
  await writeFile(join(dir, "debug.log"), "genuinely\n");
  await mkdir(join(dir, "src", "vendor"), { recursive: true });
  await writeFile(join(dir, "src", ".gitignore"), "vendor/\n");
  await writeFile(join(dir, "src", "vendor", "lib.js"), "// genuinely\n");
  return dir;
}

const expected = [
  ".gitignore",
  "README.md",
  "docs/notes.txt",
  "package.json",
  "src/.gitignore",
  "src/index.js",
  "src/math.py",
];

/**
 * A directory that is not under the project, with one file in it.
 *
 * The path is the real one, since that is how collectFiles reports it.
 */
async function elsewhere() {
  const made = await mkdtemp(join(tmpdir(), "nollm-outside-"));
  cleanup(() => rm(made, { recursive: true, force: true }));
  const dir = await realpath(made);
  await writeFile(join(dir, "notes.md"), "genuinely\n");
  return dir;
}

describe("collectFiles", () => {
  test("walks directories and reads nested .gitignore files", async () => {
    const dir = await fixture();
    const files = await collectFiles(["."], { cwd: dir, git: false });
    expect(files.sort()).toEqual(expected);
  });

  test("asks git inside a repository", async () => {
    const dir = await fixture();
    execFileSync("git", ["init", "-q"], { cwd: dir });
    const files = await collectFiles(["."], { cwd: dir, git: true });
    expect(files.sort()).toEqual(expected);
  });

  test("accepts files and subdirectories as roots", async () => {
    const dir = await fixture();
    const files = await collectFiles(["README.md", "src"], { cwd: dir, git: false });
    expect(files.sort()).toEqual(["README.md", "src/.gitignore", "src/index.js", "src/math.py"]);
  });

  test("accepts an absolute root under cwd and reports relative paths", async () => {
    const dir = await fixture();
    const files = await collectFiles([join(dir, "src")], { cwd: dir, git: false });
    expect(files.sort()).toMatchInlineSnapshot(`
      [
        "src/.gitignore",
        "src/index.js",
        "src/math.py",
      ]
    `);
  });

  test("keeps the absolute path for a root outside cwd", async () => {
    const dir = await fixture();
    const other = await elsewhere();
    const files = await collectFiles([other], { cwd: dir, git: false });
    expect(files).toEqual([join(other, "notes.md")]);
  });

  test("walks a root outside cwd and still asks git about the rest", async () => {
    const dir = await fixture();
    execFileSync("git", ["init", "-q"], { cwd: dir });
    const other = await elsewhere();

    // Only git knows about .git/info/exclude, so a walk would list this file.
    await writeFile(join(dir, "excluded.md"), "genuinely\n");
    await writeFile(join(dir, ".git", "info", "exclude"), "excluded.md\n");

    const files = await collectFiles([".", other], { cwd: dir, git: true });
    expect(files.sort()).toEqual(expected.concat([join(other, "notes.md")]).sort());
  });

  test("leaves paths outside cwd alone when applying ignore globs", async () => {
    const dir = await fixture();
    const other = await elsewhere();
    const files = await collectFiles([".", other], {
      cwd: dir,
      git: false,
      ignore: ["*.md", "src/", "*.json", "*.txt"],
    });
    expect(files.sort()).toEqual([".gitignore", join(other, "notes.md")].sort());
  });

  test("applies ignore globs", async () => {
    const dir = await fixture();
    const files = await collectFiles(["."], { cwd: dir, git: false, ignore: ["src/", "*.json"] });
    expect(files.sort()).toEqual([".gitignore", "README.md", "docs/notes.txt"]);
  });
});
