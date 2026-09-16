import { resolve } from "node:path";
import { Tinypool } from "tinypool";
import { findConfig, loadConfig } from "./config.js";
import { collectFiles } from "./files.js";

/**
 * Checks every file under the given roots.
 *
 * onResult runs once per file, as soon as that file is done.
 * The returned promise resolves after the last file.
 */
export async function lint({
  roots = ["."],
  cwd = process.cwd(),
  configPath,
  git = true,
  jobs,
  onResult = () => {},
} = {}) {
  const resolvedConfig = configPath ? resolve(cwd, configPath) : await findConfig(cwd);
  const config = await loadConfig(resolvedConfig);
  const files = await collectFiles(roots, { cwd, git, ignore: config.ignore });

  const pool = new Tinypool({
    filename: new URL("./worker.js", import.meta.url).href,
    workerData: { configPath: resolvedConfig, cwd },
    maxThreads: jobs,
  });

  const summary = { files: files.length, checked: 0, findings: 0, filesWithFindings: 0 };

  try {
    const pending = [];
    for (let i = 0; i < files.length; i++) {
      const done = pool.run(files[i]).then((result) => {
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
  } finally {
    await pool.destroy();
  }

  return summary;
}
