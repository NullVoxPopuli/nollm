import { createRequire } from "node:module";
import { parseArgs, styleText } from "node:util";
import { lint } from "./lint.js";
import { rules } from "./rules.js";

const HELP = `Usage: nollm [options] [paths...]

Checks files for LLMisms and prints each finding as soon as it is found.
Files that git ignores are skipped.

Options:
  --jobs, -j <n>     Number of worker threads (default: cpu count)
  --config <path>    Config file (default: nollm.config.js in the current directory)
  --no-git           Do not ask git for the file list. Read .gitignore files instead
  --quiet, -q        Print only the summary
  --list-rules       Print every rule and exit
  --version, -v      Print the version and exit
  --help, -h         Print this help and exit

Exit code 1 when there are findings. Exit code 2 on a usage error.
`;

export async function main(
  argv,
  { stdout = process.stdout, stderr = process.stderr, cwd = process.cwd() } = {},
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
        git: { type: "boolean", default: true },
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
      stdout.write(`${rules[i].id.padEnd(20)} ${scope} ${rules[i].message}\n`);
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

  let summary;
  try {
    summary = await lint({
      roots: positionals.length > 0 ? positionals : ["."],
      cwd,
      configPath: values.config,
      git: values.git,
      jobs,
      onResult(result) {
        if (values.quiet || result.findings.length === 0) return;
        stdout.write(formatFile(result.file, result.findings, paint));
      },
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
  const groups = new Map();
  for (let i = 0; i < findings.length; i++) {
    const finding = findings[i];
    let group = groups.get(finding.ruleId);
    if (!group) {
      group = { message: finding.message, items: [] };
      groups.set(finding.ruleId, group);
    }
    group.items.push(finding);
  }

  let out = `${paint("underline", file)}\n`;
  for (const [ruleId, group] of groups) {
    out += `  ${paint("yellow", ruleId)}  ${group.message}\n`;

    let width = 0;
    for (let i = 0; i < group.items.length; i++) {
      const item = group.items[i];
      width = Math.max(width, `${item.line}:${item.column}`.length);
    }

    for (let i = 0; i < group.items.length; i++) {
      const item = group.items[i];
      const where = `${item.line}:${item.column}`.padEnd(width);
      out += `    ${paint("dim", where)}  ${JSON.stringify(item.text)}\n`;
    }
  }
  return out + "\n";
}
