import { execFile } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import ignore from "ignore";

const run = promisify(execFile);

const ALWAYS_SKIPPED = new Set([".git", "node_modules"]);

/**
 * Lists the files to check.
 *
 * Paths come back relative to cwd, with forward slashes.
 * Files that git ignores are left out.
 *
 * Inside a git work tree the list comes from git itself.
 * Elsewhere, or with git: false, the tool reads .gitignore files while it walks.
 *
 * The ignore option takes patterns in .gitignore syntax.
 */
export async function collectFiles(
  roots,
  { cwd = process.cwd(), git = true, ignore: patterns = [] } = {},
) {
  const files = git ? await fromGit(roots, cwd) : null;
  const list = files ?? (await fromWalk(roots, cwd));
  if (patterns.length === 0) return list;

  const matcher = ignore().add(patterns);
  return list.filter((file) => !matcher.ignores(file));
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

async function fromWalk(roots, cwd) {
  const files = [];
  for (let i = 0; i < roots.length; i++) {
    const absolute = resolve(cwd, roots[i]);
    const info = await stat(absolute);
    if (info.isFile()) {
      files.push(toPosix(relative(cwd, absolute)));
      continue;
    }
    await walk(absolute, cwd, [], files);
  }
  return files;
}

async function walk(dir, cwd, filters, files) {
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
      await walk(absolute, cwd, active, files);
    } else {
      files.push(toPosix(relative(cwd, absolute)));
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

function toPosix(path) {
  return sep === "/" ? path : path.split(sep).join("/");
}
