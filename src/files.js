import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { glob, realpath, stat } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import ignore from "ignore";

const run = promisify(execFile);

const ALWAYS_SKIPPED = new Set([".git", "node_modules"]);

/**
 * glob leaves dotfiles out unless a pattern asks for them, and the tool checks
 * files such as .gitignore and everything under .github.
 */
const EVERYTHING = ["**/*", "**/.*", "**/.*/**"];

/**
 * Lists the files to check.
 *
 * Roots may be relative or absolute.
 * A file under cwd comes back relative to cwd, with forward slashes.
 * A file outside cwd keeps its absolute path, so a report never has to point
 * at it through a row of "..".
 *
 * Files that git ignores are left out.
 *
 * Inside a git work tree the list comes from git itself.
 * Elsewhere, or with git: false, the tool reads .gitignore files while it walks.
 * git only knows about its own work tree, so roots outside cwd are always
 * walked.
 *
 * The ignore option takes patterns in .gitignore syntax. They describe the
 * project, so they apply under cwd and leave paths outside cwd alone.
 *
 * Roots and cwd are compared after their symlinks are followed. On macOS a
 * temp directory is reached through /var and lives in /private/var, and
 * without this a path under cwd would look like a path outside it.
 */
export async function collectFiles(
  roots,
  { cwd = process.cwd(), git = true, ignore: patterns = [] } = {},
) {
  const base = await real(cwd);
  const inside = [];
  const outside = [];
  for (let i = 0; i < roots.length; i++) {
    const absolute = await real(resolve(cwd, roots[i]));
    if (isInside(base, absolute)) inside.push(absolute);
    else outside.push(absolute);
  }

  let list = [];
  if (inside.length > 0) {
    const tracked = git ? await fromGit(inside, cwd) : null;
    list = tracked ?? (await fromWalk(inside, base));
  }
  if (outside.length > 0) list = list.concat(await fromWalk(outside, base));

  if (patterns.length === 0) return list;

  const matcher = ignore().add(patterns);
  return list.filter((file) => isAbsolute(file) || !matcher.ignores(file));
}

async function fromGit(roots, cwd) {
  const args = [
    "ls-files",
    "-z",
    "--cached",
    "--others",
    "--exclude-standard",
    "--deduplicate",
    "--",
  ];
  for (let i = 0; i < roots.length; i++) args.push(roots[i]);

  let stdout;
  try {
    ({ stdout } = await run("git", args, { cwd, maxBuffer: 256 * 1024 * 1024 }));
  } catch {
    return null;
  }

  const files = [];
  const parts = stdout.split("\0");
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].length > 0) files.push(parts[i]);
  }
  return files;
}

async function fromWalk(roots, base) {
  const files = [];
  for (let i = 0; i < roots.length; i++) {
    const root = roots[i];
    const info = await stat(root);
    if (info.isFile()) {
      files.push(label(base, root));
      continue;
    }

    const entries = glob(EVERYTHING, { cwd: root, withFileTypes: true, exclude: skips(root) });
    for await (const entry of entries) {
      if (entry.isFile()) files.push(label(base, join(entry.parentPath, entry.name)));
    }
  }
  return files;
}

/**
 * Tells glob which entries to leave out. Saying yes to a directory prunes it,
 * so an ignored tree is never opened.
 *
 * A .gitignore applies to the directory that holds it and to everything below.
 * So each entry is matched against the chain of files from the root down to
 * its own directory. Chains are built once per directory and kept.
 *
 * glob asks this question synchronously, so the reads are synchronous. It is
 * one small file per directory, which is what the walk read before.
 */
function skips(root) {
  const chains = new Map();

  const chainFor = (dir) => {
    const known = chains.get(dir);
    if (known) return known;

    const parent = dir === root || dirname(dir) === dir ? [] : chainFor(dirname(dir));
    const local = readIgnore(dir);
    const chain = local ? parent.concat([local]) : parent;
    chains.set(dir, chain);
    return chain;
  };

  return (entry) => {
    if (ALWAYS_SKIPPED.has(entry.name)) return true;

    const isDir = entry.isDirectory();
    if (!isDir && !entry.isFile()) return true;

    const absolute = join(entry.parentPath, entry.name);
    return isIgnored(absolute, isDir, chainFor(entry.parentPath));
  };
}

function readIgnore(dir) {
  let content;
  try {
    content = readFileSync(join(dir, ".gitignore"), "utf8");
  } catch {
    return null;
  }
  return { base: dir, matcher: ignore().add(content) };
}

function isIgnored(absolute, isDir, filters) {
  for (let i = 0; i < filters.length; i++) {
    const { base, matcher } = filters[i];
    const rel = toPosix(relative(base, absolute)) + (isDir ? "/" : "");
    if (matcher.ignores(rel)) return true;
  }
  return false;
}

/**
 * How a file is named in a report: relative to the base directory when it sits
 * under it, absolute when it does not.
 */
function label(base, absolute) {
  return toPosix(isInside(base, absolute) ? relative(base, absolute) : absolute);
}

function isInside(base, absolute) {
  const rel = relative(base, absolute);
  return rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

/** The path with its symlinks followed, or the path itself if it is missing. */
async function real(path) {
  try {
    return await realpath(path);
  } catch {
    return path;
  }
}

function toPosix(path) {
  return sep === "/" ? path : path.split(sep).join("/");
}
