import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { collectFiles } from "../src/index.js";
import { copyFixture } from "./helpers.js";

let cleanup = async () => {};

afterEach(async () => {
  await cleanup();
});

async function fixture() {
  const copy = await copyFixture("project");
  cleanup = copy.cleanup;
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

  test("applies ignore globs", async () => {
    const dir = await fixture();
    const files = await collectFiles(["."], { cwd: dir, git: false, ignore: ["src/", "*.json"] });
    expect(files.sort()).toEqual([".gitignore", "README.md", "docs/notes.txt"]);
  });
});
