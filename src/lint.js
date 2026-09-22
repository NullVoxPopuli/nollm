import { resolve } from "node:path";
import { Tinypool } from "tinypool";
import { findConfig, loadConfig } from "./config.js";
import { ALL_LINES, changedLines } from "./diff.js";
import { collectFiles } from "./files.js";

/**
 * Checks every file under the given roots.
 *
 * With diff set to a git ref, only the files that changed since the merge base
 * are read, and only findings on added or changed lines are reported.
 *
 * onResult runs once per file, as soon as that file is done.
 * The returned promise resolves after the last file.
 */
export async function lint({
  roots = ["."],
  cwd = process.cwd(),
  configPath,
  git = true,
  diff,
  jobs,
  onResult = () => {},
} = {}) {
  const resolvedConfig = configPath ? resolve(cwd, configPath) : await findConfig(cwd);
  const config = await loadConfig(resolvedConfig);
  let files = await collectFiles(roots, { cwd, git, ignore: config.ignore });

  let changed = null;
  if (diff) {
    changed = await changedLines(diff, { cwd });
    files = files.filter((file) => changed.has(file));
  }

  // The pool is torn down when this function ends, however it ends.
  await using pool = Object.assign(
    new Tinypool({
      filename: new URL("./worker.js", import.meta.url).href,
      workerData: { configPath: resolvedConfig, cwd },
      maxThreads: jobs,
    }),
    { [Symbol.asyncDispose]: () => pool.destroy() },
  );

  const summary = { files: files.length, checked: 0, findings: 0, filesWithFindings: 0 };

  const pending = [];
  for (let i = 0; i < files.length; i++) {
    const done = pool.run(files[i]).then((result) => {
      if (changed) result = onlyChanged(result, changed.get(result.file));
      if (!result.skipped) summary.checked++;
      if (result.findings.length > 0) {
        summary.findings += result.findings.length;
        summary.filesWithFindings++;
      }
      onResult(result);
    });
    pending.push(done);
  }
  await Promise.all(pending);

  return summary;
}

/**
 * Keeps the findings that sit on a line the branch adds or changes.
 *
 * A finding is placed by the line it points at. A rule that reports at the top
 * of a paragraph, such as wall-of-text, is therefore quiet when the branch
 * extends that paragraph further down.
 */
function onlyChanged(result, lines) {
  if (lines === ALL_LINES || result.findings.length === 0) return result;
  return { ...result, findings: result.findings.filter((finding) => lines.has(finding.line)) };
}
