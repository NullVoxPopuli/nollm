import { createRequire } from "node:module";
import { resolve } from "node:path";
import { text as readAll } from "node:stream/consumers";
import { parseArgs, styleText } from "node:util";
import { check } from "./check.js";
import { findConfig, loadConfig } from "./config.js";
import { classify } from "./languages.js";
import { lint } from "./lint.js";
import { rules } from "./rules.js";

const STDIN_FILENAME = "stdin.md";

const HELP = `Usage: nollm [options] [paths...]

Checks files for LLMisms and prints each finding as soon as it is found.
Paths may be relative or absolute. Files that git ignores are skipped.
The path - reads the text from stdin instead.

Options:
  --jobs, -j <n>     Number of worker threads (default: cpu count)
  --config <path>    Config file (default: nollm.config.js in the current directory)
  --diff <ref>       Check only the lines this branch adds or changes since <ref>
  --no-git           Do not ask git for the file list. Read .gitignore files instead
  --stdin            Read the text from stdin. Same as the path -
  --stdin-filename <name>
                     Check stdin as if it were this file (default: ${STDIN_FILENAME})
  --quiet, -q        Print only the summary
  --list-rules       Print every rule and exit
  --version, -v      Print the version and exit
  --help, -h         Print this help and exit

Examples:
  nollm docs/guide.md            a path relative to the current directory
  nollm /srv/site/docs/guide.md  an absolute path
  pbpaste | nollm -              text from the clipboard, as markdown
  git show HEAD:a.py | nollm --stdin-filename a.py

Exit code 1 when there are findings. Exit code 2 on a usage error.
`;

export async function main(
  argv,
  {
    stdin = process.stdin,
    stdout = process.stdout,
    stderr = process.stderr,
    cwd = process.cwd(),
  } = {},
) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      allowNegative: true,
      options: {
        jobs: { type: "string", short: "j" },
        config: { type: "string" },
        diff: { type: "string" },
        git: { type: "boolean", default: true },
        stdin: { type: "boolean", default: false },
        "stdin-filename": { type: "string" },
        quiet: { type: "boolean", short: "q", default: false },
        "list-rules": { type: "boolean", default: false },
        version: { type: "boolean", short: "v", default: false },
        help: { type: "boolean", short: "h", default: false },
      },
    });
  } catch (error) {
    stderr.write(`${error.message}\n\n${HELP}`);
    return 2;
  }

  const { values, positionals } = parsed;

  if (values.help) {
    stdout.write(HELP);
    return 0;
  }

  if (values.version) {
    const require = createRequire(import.meta.url);
    stdout.write(`${require("../package.json").version}\n`);
    return 0;
  }

  if (values["list-rules"]) {
    for (let i = 0; i < rules.length; i++) {
      const scope = (rules[i].scope ?? "text").padEnd(10);
      stdout.write(`${rules[i].id.padEnd(24)} ${scope} ${rules[i].message}\n`);
    }
    return 0;
  }

  let jobs;
  if (values.jobs !== undefined) {
    jobs = Number(values.jobs);
    if (!Number.isInteger(jobs) || jobs < 1) {
      stderr.write(`--jobs needs a positive integer, got "${values.jobs}"\n`);
      return 2;
    }
  }

  const paint = (style, text) => styleText(style, text, { stream: stdout });
  const started = performance.now();
  const fromStdin =
    values.stdin || values["stdin-filename"] !== undefined || positionals.includes("-");

  if (fromStdin) {
    if (positionals.some((path) => path !== "-")) {
      stderr.write("Paths cannot be combined with stdin. Check one or the other\n");
      return 2;
    }
    if (values.diff !== undefined) {
      stderr.write("--diff cannot be combined with stdin, since stdin has no git history\n");
      return 2;
    }
  }

  const onResult = (result) => {
    if (values.quiet || result.findings.length === 0) return;
    stdout.write(formatFile(result.file, result.findings, paint));
  };

  let summary;
  try {
    summary = fromStdin
      ? await lintStdin({
          stdin,
          file: values["stdin-filename"] ?? STDIN_FILENAME,
          cwd,
          configPath: values.config,
          onResult,
        })
      : await lint({
          roots: positionals.length > 0 ? positionals : ["."],
          cwd,
          configPath: values.config,
          git: values.git,
          diff: values.diff,
          jobs,
          onResult,
        });
  } catch (error) {
    stderr.write(`${error.message}\n`);
    return 2;
  }

  const seconds = ((performance.now() - started) / 1000).toFixed(2);
  const problems = summary.findings === 1 ? "1 problem" : `${summary.findings} problems`;
  const files = summary.filesWithFindings === 1 ? "1 file" : `${summary.filesWithFindings} files`;
  const line = `${problems} in ${files} (${summary.checked} files checked, ${seconds}s)\n`;

  stdout.write(summary.findings > 0 ? paint("red", line) : paint("green", line));
  return summary.findings > 0 ? 1 : 0;
}

/**
 * Checks the text on stdin as if it were the named file.
 *
 * The name picks the language and labels the report. No file is read.
 * Returns the same summary as lint, for one file.
 */
async function lintStdin({ stdin, file, cwd, configPath, onResult }) {
  if (!classify(file)) {
    throw new Error(`nollm does not know how to check "${file}". Pass --stdin-filename a.md`);
  }

  const resolvedConfig = configPath ? resolve(cwd, configPath) : await findConfig(cwd);
  const config = await loadConfig(resolvedConfig);
  const findings = check(file, await readAll(stdin), config.rules);

  onResult({ file, findings, skipped: null });
  return {
    files: 1,
    checked: 1,
    findings: findings.length,
    filesWithFindings: findings.length > 0 ? 1 : 0,
  };
}

/**
 * One block per file:
 *
 *   README.md
 *     wall-of-text  Wall of text. Split the paragraph
 *       3:1   "131 words, 9 sentences: The linter reads every..."
 *       40:1  "202 words, 12 sentences: Each worker loads the..."
 *
 * Findings are grouped by rule, in order of first appearance.
 */
function formatFile(file, findings, paint) {
  let out = `${paint("underline", file)}\n`;

  for (const [ruleId, items] of Map.groupBy(findings, (finding) => finding.ruleId)) {
    out += `  ${paint("yellow", ruleId)}  ${items[0].message}\n`;

    const width = Math.max(...items.map((item) => `${item.line}:${item.column}`.length));
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const where = `${item.line}:${item.column}`.padEnd(width);
      out += `    ${paint("dim", where)}  ${JSON.stringify(item.text)}\n`;
    }
  }
  return out + "\n";
}
