import { execFile } from "node:child_process";
import { readdir, readFile, realpath, stat } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import ignore from "ignore";

const run = promisify(execFile);

const ALWAYS_SKIPPED = new Set([".git", "node_modules"]);

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
    const absolute = roots[i];
    const info = await stat(absolute);
    if (info.isFile()) {
      files.push(label(base, absolute));
      continue;
    }
    await walk(absolute, base, [], files);
  }
  return files;
}

async function walk(dir, base, filters, files) {
  const local = await readIgnore(dir);
  const active = local ? filters.concat([local]) : filters;
  const entries = await readdir(dir, { withFileTypes: true });

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (ALWAYS_SKIPPED.has(entry.name)) continue;

    const absolute = join(dir, entry.name);
    const isDir = entry.isDirectory();
    if (!isDir && !entry.isFile()) continue;
    if (isIgnored(absolute, isDir, active)) continue;

    if (isDir) {
      await walk(absolute, base, active, files);
    } else {
      files.push(label(base, absolute));
    }
  }
}

async function readIgnore(dir) {
  let content;
  try {
    content = await readFile(join(dir, ".gitignore"), "utf8");
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
