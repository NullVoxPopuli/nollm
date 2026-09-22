import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

/** Stands for every line of a file, used for files that are new in full. */
export const ALL_LINES = true;

/**
 * The lines a branch adds or changes, per file.
 *
 * Returns a Map from path to a Set of line numbers in the new file, or to
 * ALL_LINES when the whole file is new.
 * Paths are relative to cwd, so they match what collectFiles returns.
 *
 * The comparison starts at the merge base of base and the working tree, so
 * commits that land on base after the branch point stay out of the result.
 * Uncommitted edits and files git does not track yet count as part of the
 * branch, so the same call works before a push.
 *
 * Files with no added or changed lines are left out. So are deleted files.
 */
export async function changedLines(base, { cwd = process.cwd() } = {}) {
  const args = [
    "diff",
    "--no-color",
    "--no-ext-diff",
    "--no-renames",
    "--no-prefix",
    "--relative",
    "--unified=0",
    "--diff-filter=ACM",
    "--merge-base",
    base,
  ];

  let stdout;
  try {
    ({ stdout } = await run("git", args, { cwd, maxBuffer: 256 * 1024 * 1024 }));
  } catch (error) {
    const reason = firstLine(error.stderr) ?? error.message;
    throw new Error(`Could not diff against "${base}": ${reason}`);
  }

  const changed = parse(stdout);
  for (const file of await untracked(cwd)) changed.set(file, ALL_LINES);
  return changed;
}

/**
 * Files git does not track yet.
 *
 * collectFiles lists these, so a file a branch adds but has not committed
 * still counts as part of the diff.
 */
async function untracked(cwd) {
  let stdout;
  try {
    ({ stdout } = await run("git", ["ls-files", "-z", "--others", "--exclude-standard"], {
      cwd,
      maxBuffer: 256 * 1024 * 1024,
    }));
  } catch {
    return [];
  }

  const files = [];
  const parts = stdout.split("\0");
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].length > 0) files.push(parts[i]);
  }
  return files;
}

/**
 * Reads a unified diff produced with --unified=0 and --no-prefix.
 *
 * Every file starts with a "diff --git" line, so that line marks where the
 * next "+++" is a header and not a line of added content that starts with "++".
 */
function parse(patch) {
  const changed = new Map();
  const lines = patch.split("\n");

  let file = null;
  let expectHeader = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("diff --git ")) {
      file = null;
      expectHeader = true;
      continue;
    }

    if (expectHeader && line.startsWith("+++ ")) {
      const path = line.slice(4);
      expectHeader = false;
      if (path === "/dev/null") continue;
      file = path;
      if (!changed.has(file)) changed.set(file, new Set());
      continue;
    }

    if (file === null || !line.startsWith("@@")) continue;

    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (!hunk) continue;

    const start = Number(hunk[1]);
    const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
    const set = changed.get(file);
    for (let n = 0; n < count; n++) set.add(start + n);
  }

  for (const [path, set] of changed) {
    if (set.size === 0) changed.delete(path);
  }
  return changed;
}

function firstLine(text) {
  if (!text) return null;
  const trimmed = text.trim();
  return trimmed.length > 0 ? trimmed.split("\n")[0] : null;
}
