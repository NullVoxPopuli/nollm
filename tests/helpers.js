import { execFileSync } from "node:child_process";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { check, classify, extractComments } from "../src/index.js";

export const fixtures = join(import.meta.dirname, "fixtures");
export const bin = join(import.meta.dirname, "..", "bin", "nollm.js");

/**
 * Copies a fixture project into a fresh temp directory.
 * Returns the directory and a cleanup function.
 */
export async function copyFixture(name) {
  const dir = await mkdtemp(join(tmpdir(), "nollm-"));
  await cp(join(fixtures, name), dir, { recursive: true });
  return { dir, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

/**
 * Copies a fixture project, commits it on a branch named main,
 * and checks out a branch named feature.
 *
 * Whatever the caller writes next is the diff that --diff main reports.
 */
export async function copyFixtureRepo(name) {
  const copy = await copyFixture(name);
  git(copy.dir, "init", "-q", "-b", "main");
  git(copy.dir, "config", "user.email", "test@example.com");
  git(copy.dir, "config", "user.name", "Test");
  git(copy.dir, "add", "-A");
  git(copy.dir, "commit", "-qm", "base");
  git(copy.dir, "checkout", "-q", "-b", "feature");
  return copy;
}

export function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" });
}

/**
 * Checks text as a markdown file.
 */
export function prose(text) {
  return check("doc.md", text);
}

/**
 * Checks text as one line comment in a JavaScript file.
 */
export function comment(text) {
  return check("code.js", `// ${text}\n`);
}

export function ids(findings) {
  return findings.map((finding) => finding.ruleId);
}

export function texts(findings) {
  return findings.map((finding) => finding.text);
}

/**
 * The comment texts the scanner finds in a source file.
 */
export function commentTexts(file, source) {
  return extractComments(source, classify(file).language).map((segment) => segment.text);
}

/**
 * The comment segments, with positions.
 */
export function comments(file, source) {
  return extractComments(source, classify(file).language);
}

/**
 * Checks that an em dash inside a comment is reported for a file name,
 * and that the same em dash outside a comment is not.
 */
export function expectEmDashInComments(file, commentLine, codeLine) {
  const inComment = check(file, `${commentLine}\n`);
  const inCode = check(file, `${codeLine}\n`);
  return { inComment: inComment.map((f) => f.ruleId), inCode: inCode.map((f) => f.ruleId) };
}
