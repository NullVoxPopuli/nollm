import { execFile } from "node:child_process";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, test } from "vitest";
import { bin, copyFixture, copyFixtureRepo } from "./helpers.js";

const run = promisify(execFile);
let cleanup = async () => {};
const outside = [];

afterEach(async () => {
  await cleanup();
  while (outside.length > 0) await rm(outside.pop(), { recursive: true, force: true });
});

async function nollm(args, cwd) {
  try {
    const result = await run(process.execPath, [bin].concat(args), {
      cwd,
      env: { ...process.env, NO_COLOR: "1" },
    });
    return { code: 0, ...result };
  } catch (error) {
    return { code: error.code, stdout: error.stdout, stderr: error.stderr };
  }
}

async function project() {
  const copy = await copyFixture("project");
  cleanup = copy.cleanup;
  return copy.dir;
}

async function repo() {
  const copy = await copyFixtureRepo("project");
  cleanup = copy.cleanup;
  return copy.dir;
}

/**
 * A directory that is not under the project, with one file in it.
 *
 * The path is the real one, since that is how nollm reports it.
 */
async function elsewhere() {
  const made = await mkdtemp(join(tmpdir(), "nollm-outside-"));
  outside.push(made);
  const dir = await realpath(made);
  await writeFile(join(dir, "notes.md"), "# Notes\n\nThis is simply the best.\n");
  return dir;
}

/**
 * Takes the elapsed time out of the summary, and the temp directory out of
 * absolute paths, so output can be snapshotted.
 */
function stable(stdout, dir = null) {
  const timeless = stdout.replace(/, [\d.]+s\)/, ", Xs)");
  return dir === null ? timeless : timeless.split(dir).join("<outside>");
}

describe("cli", () => {
  test("groups findings by file and rule and exits with 1", async () => {
    const dir = await project();
    const { code, stdout } = await nollm(["--no-git", "--jobs", "2"], dir);
    expect(code).toBe(1);
    expect(stdout).toContain(
      [
        "src/math.py",
        "  filler-word  Filler. Delete it or replace it",
        '    2:8  "Simply"',
        "  llm-vocabulary  LLM vocabulary",
        '    2:39  "crucial"',
        "  what-comment  Comment narrates what the code does. Say why, or delete it",
        '    3:19  "# increment"',
        "",
      ].join("\n"),
    );
    expect(stdout).toContain(
      [
        "src/index.js",
        "  what-comment  Comment narrates what the code does. Say why, or delete it",
        '    1:1  "// This function"',
        "  no-short-term-relevance  Comment only makes sense while the change is under review. Say it in the PR",
        '    3:6   "no longer"',
        '    3:29  "the refactor"',
      ].join("\n"),
    );
    expect(stdout).toContain('    3:14  "simply"');
    expect(stdout).not.toContain("notes.txt");
    expect(stdout).toMatch(/\d+ problems in 3 files \(5 files checked, [\d.]+s\)\n$/);
  });

  test("pads coordinates within a rule group", async () => {
    const dir = await project();
    const { stdout } = await nollm(["--no-git", "README.md"], dir);
    expect(stdout).toContain('    3:14  "simply"\n    3:30  "robust"\n');
    expect(stdout).toMatch(/^ {4}\d+:\d+ {2,3}"/m);
  });

  test("skips files that git ignores", async () => {
    const dir = await project();
    await writeFile(join(dir, "debug.log"), "genuinely\n");
    const { stdout } = await nollm(["--no-git"], dir);
    expect(stdout).not.toContain("debug.log");
  });

  test("checks only the given paths", async () => {
    const dir = await project();
    const { stdout } = await nollm(["--no-git", "src/math.py"], dir);
    expect(stdout).not.toContain("README.md");
    expect(stdout).toContain("src/math.py");
  });

  test("checks an absolute path under the current directory", async () => {
    const dir = await project();
    const { code, stdout } = await nollm(["--no-git", join(dir, "src", "math.py")], dir);
    expect(code).toBe(1);
    expect(stable(stdout)).toMatchInlineSnapshot(`
      "src/math.py
        filler-word  Filler. Delete it or replace it
          2:8  "Simply"
        llm-vocabulary  LLM vocabulary
          2:39  "crucial"
        what-comment  Comment narrates what the code does. Say why, or delete it
          3:19  "# increment"

      3 problems in 1 file (1 files checked, Xs)
      "
    `);
  });

  test("checks an absolute path outside the current directory", async () => {
    const dir = await project();
    const other = await elsewhere();
    const { code, stdout } = await nollm(["--no-git", join(other, "notes.md")], dir);
    expect(code).toBe(1);
    expect(stable(stdout, other)).toMatchInlineSnapshot(`
      "<outside>/notes.md
        filler-word  Filler. Delete it or replace it
          3:9  "simply"

      1 problem in 1 file (1 files checked, Xs)
      "
    `);
  });

  test("checks an absolute directory outside the current directory", async () => {
    const dir = await project();
    const other = await elsewhere();
    const { stdout } = await nollm(["--no-git", other], dir);
    expect(stable(stdout, other)).toContain("<outside>/notes.md");
  });

  test("mixes a relative root with an absolute one outside", async () => {
    const dir = await project();
    const other = await elsewhere();
    const { stdout } = await nollm(["--no-git", "src/math.py", join(other, "notes.md")], dir);
    expect(stable(stdout, other)).toContain("src/math.py");
    expect(stable(stdout, other)).toContain("<outside>/notes.md");
    expect(stdout).toContain("2 files checked");
  });

  test("a config ignore glob does not reach outside the current directory", async () => {
    const dir = await project();
    const other = await elsewhere();
    await writeFile(join(dir, ".nollmrc"), '{ "ignore": ["*.md"] }\n');

    const { stdout } = await nollm(["--no-git", "README.md", join(other, "notes.md")], dir);
    expect(stdout).not.toContain("README.md");
    expect(stable(stdout, other)).toContain("<outside>/notes.md");
  });

  test("--diff reports only the lines the branch touched", async () => {
    const dir = await repo();

    // Line 3 of README.md already has findings. Edit line 9 and leave it alone.
    const readme = await readFile(join(dir, "README.md"), "utf8");
    await writeFile(join(dir, "README.md"), readme.replace("Hope this helps!", "Let me know if"));

    const { code, stdout } = await nollm(["--diff", "main"], dir);
    expect(code).toBe(1);
    expect(stable(stdout)).toMatchInlineSnapshot(`
      "README.md
        chat-opener  Chat opener. Start with the answer
          9:1  "Let me"
        chat-closer  Chat closer. Stop when the content stops
          9:1  "Let me know if"

      2 problems in 1 file (1 files checked, Xs)
      "
    `);
  });

  test("--diff exits with 0 when the branch adds nothing to report", async () => {
    const dir = await repo();
    await writeFile(join(dir, "docs", "notes.txt"), "Plain notes.\n\nStill nothing.\n");

    const { code, stdout } = await nollm(["--diff", "main"], dir);
    expect(code).toBe(0);
    expect(stable(stdout)).toMatchInlineSnapshot(`
      "0 problems in 0 files (1 files checked, Xs)
      "
    `);
  });

  test("--diff narrows to the given paths", async () => {
    const dir = await repo();
    await writeFile(join(dir, "docs", "notes.txt"), "Plain notes.\n\nDelve into it.\n");
    await writeFile(join(dir, "src", "math.py"), "# Delve into it\n");

    const { stdout } = await nollm(["--diff", "main", "docs"], dir);
    expect(stable(stdout)).toMatchInlineSnapshot(`
      "docs/notes.txt
        llm-vocabulary  LLM vocabulary
          3:1  "Delve"

      1 problem in 1 file (1 files checked, Xs)
      "
    `);
  });

  test("--diff rejects an unknown ref", async () => {
    const dir = await repo();
    const { code, stderr } = await nollm(["--diff", "no-such-branch"], dir);
    expect(code).toBe(2);
    expect(stderr).toContain('Could not diff against "no-such-branch"');
  });

  test("--diff outside a git repository is a usage error", async () => {
    const dir = await project();
    const { code, stderr } = await nollm(["--diff", "main"], dir);
    expect(code).toBe(2);
    expect(stderr).toContain('Could not diff against "main"');
  });

  test("respects the config file", async () => {
    const dir = await project();
    await writeFile(
      join(dir, ".nollmrc"),
      '{ "ignore": ["src/"], "rules": { "chat-opener": false } }\n',
    );
    const { stdout } = await nollm(["--no-git"], dir);
    expect(stdout).not.toContain("src/");
    expect(stdout).not.toContain("chat-opener");
    expect(stdout).toContain("chat-closer");
  });

  test("exits with 0 when there is nothing to report", async () => {
    const dir = await project();
    const { code, stdout } = await nollm(["--no-git", "docs"], dir);
    expect(code).toBe(0);
    expect(stdout).toBe(
      "0 problems in 0 files (1 files checked, ".concat(
        stdout.slice(stdout.indexOf("(1 files checked, ") + 18),
      ),
    );
  });

  test("--quiet prints only the summary", async () => {
    const dir = await project();
    const { stdout } = await nollm(["--no-git", "--quiet"], dir);
    expect(stdout.trim().split("\n")).toHaveLength(1);
  });

  test("--help shows the options and a relative and an absolute example", async () => {
    const { code, stdout } = await nollm(["--help"], process.cwd());
    expect(code).toBe(0);
    expect(stdout).toMatchInlineSnapshot(`
      "Usage: nollm [options] [paths...]

      Checks files for LLMisms and prints each finding as soon as it is found.
      Paths may be relative or absolute. Files that git ignores are skipped.

      Options:
        --jobs, -j <n>     Number of worker threads (default: cpu count)
        --config <path>    Config file (default: nollm.config.js in the current directory)
        --diff <ref>       Check only the lines this branch adds or changes since <ref>
        --no-git           Do not ask git for the file list. Read .gitignore files instead
        --quiet, -q        Print only the summary
        --list-rules       Print every rule and exit
        --version, -v      Print the version and exit
        --help, -h         Print this help and exit

      Examples:
        nollm docs/guide.md            a path relative to the current directory
        nollm /srv/site/docs/guide.md  an absolute path

      Exit code 1 when there are findings. Exit code 2 on a usage error.
      "
    `);
  });

  test("--list-rules prints every rule", async () => {
    const { code, stdout } = await nollm(["--list-rules"], process.cwd());
    expect(code).toBe(0);
    expect(stdout).toContain("banned-word");
    expect(stdout).toContain("what-comment");
  });

  test("rejects a bad --jobs value", async () => {
    const { code, stderr } = await nollm(["--jobs", "zero"], process.cwd());
    expect(code).toBe(2);
    expect(stderr).toContain("--jobs needs a positive integer");
  });
});
