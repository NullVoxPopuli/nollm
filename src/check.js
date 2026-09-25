import { classify } from "./languages.js";
import { extractComments, extractLines } from "./comments.js";
import { rules as builtinRules } from "./rules.js";
import { withoutCode } from "./shape.js";

const IGNORE_FILE = "nollm-ignore-file";
const IGNORE_NEXT = "nollm-ignore-next-line";

/**
 * Checks one file's content and returns its findings.
 *
 * A finding is { line, column, ruleId, message, text }.
 * Files this tool does not read return an empty array.
 * Comment lines that are code, such as commented-out statements, are not read.
 *
 * A line that contains nollm-ignore-next-line silences the line after it.
 * A file that contains nollm-ignore-file returns no findings.
 */
export function check(filePath, source, rules = builtinRules) {
  const kind = classify(filePath);
  if (!kind) return [];
  if (source.includes(IGNORE_FILE)) return [];

  const findings = collect(kind, source, rules);
  return source.includes(IGNORE_NEXT) ? withoutIgnored(findings, source) : findings;
}

function collect(kind, source, rules) {
  const findings = [];

  if (kind.kind === "prose") {
    const lines = extractLines(source);
    run(findings, lines, rules, "prose");
    run(findings, lines, rules, "everywhere");
    findings.sort(byPosition);
    return findings;
  }

  run(findings, withoutCode(extractComments(source, kind.language)), rules, "comments");
  run(findings, extractLines(source), rules, "everywhere");
  findings.sort(byPosition);
  return findings;
}

function run(findings, segments, rules, scope) {
  for (let r = 0; r < rules.length; r++) {
    const rule = rules[r];
    if (!applies(rule, scope)) continue;

    if (typeof rule.check === "function") {
      const found = rule.check(segments, scope);
      for (let f = 0; f < found.length; f++) {
        findings.push({
          line: found[f].line,
          column: found[f].column,
          ruleId: rule.id,
          message: rule.message,
          text: found[f].text,
        });
      }
      continue;
    }

    for (let s = 0; s < segments.length; s++) {
      const segment = segments[s];
      const pattern = rule.pattern;
      pattern.lastIndex = 0;

      let match;
      while ((match = pattern.exec(segment.text)) !== null) {
        findings.push({
          line: segment.line,
          column: segment.column + match.index,
          ruleId: rule.id,
          message: rule.message,
          text: match[0].trim(),
        });
        if (match[0].length === 0) pattern.lastIndex++;
      }
    }
  }
}

function withoutIgnored(findings, source) {
  const silenced = new Set();
  const lines = extractLines(source);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].text.includes(IGNORE_NEXT)) silenced.add(lines[i].line + 1);
  }
  return findings.filter((finding) => !silenced.has(finding.line));
}

function applies(rule, scope) {
  const own = rule.scope ?? "text";
  if (scope === "everywhere") return own === "everywhere";
  if (own === "text") return true;
  return own === scope;
}

function byPosition(a, b) {
  return a.line - b.line || a.column - b.column;
}
