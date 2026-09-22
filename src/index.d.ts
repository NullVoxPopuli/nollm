export type Scope = "prose" | "comments" | "text" | "everywhere";

export interface PatternRule {
  id: string;
  /** Old ids of this rule. A config may still refer to the rule by one of them. */
  aliases?: string[];
  message: string;
  pattern: RegExp;
  scope?: Scope;
}

export interface ShapeFinding {
  line: number;
  column: number;
  text: string;
}

export interface CheckRule {
  id: string;
  /** Old ids of this rule. A config may still refer to the rule by one of them. */
  aliases?: string[];
  message: string;
  check: (segments: Segment[], scope: Scope) => ShapeFinding[];
  scope?: Scope;
}

export type Rule = PatternRule | CheckRule;

export interface Finding {
  line: number;
  column: number;
  ruleId: string;
  message: string;
  text: string;
}

export interface FileResult {
  file: string;
  findings: Finding[];
  skipped: string | null;
}

export interface Summary {
  files: number;
  checked: number;
  findings: number;
  filesWithFindings: number;
}

export interface Segment {
  text: string;
  line: number;
  column: number;
}

export interface Language {
  comments: [start: string, end: string][];
  strings: string[];
  regions: [start: string, end: string, language: Language][];
}

export interface Config {
  path: string | null;
  rules: Rule[];
  ignore: string[];
  maxBytes: number;
}

export interface RuleConfig {
  pattern?: RegExp | string;
  flags?: string;
  check?: (segments: Segment[], scope: Scope) => ShapeFinding[];
  message?: string;
  scope?: Scope;
}

export interface UserConfig {
  ignore?: string[];
  words?: string[];
  maxBytes?: number;
  rules?: Record<string, boolean | RuleConfig>;
}

export interface LintOptions {
  roots?: string[];
  cwd?: string;
  configPath?: string;
  git?: boolean;
  /** A git ref. Only lines added or changed since the merge base are reported. */
  diff?: string;
  jobs?: number;
  onResult?: (result: FileResult) => void;
}

export const rules: Rule[];
export const SEARCH_PLACES: string[];

export function check(filePath: string, source: string, rules?: Rule[]): Finding[];
export function classify(
  filePath: string,
): { kind: "prose" } | { kind: "code"; language: Language } | null;
export const ALL_LINES: true;
export function changedLines(
  base: string,
  options?: { cwd?: string },
): Promise<Map<string, Set<number> | typeof ALL_LINES>>;
export function collectFiles(
  roots: string[],
  options?: { cwd?: string; git?: boolean; ignore?: string[] },
): Promise<string[]>;
export function extractComments(source: string, language: Language): Segment[];
export function extractLines(source: string): Segment[];
export function paragraphs(segments: Segment[], options?: { inComments?: boolean }): Paragraph[];

export interface Paragraph {
  line: number;
  column: number;
  words: number;
  sentences: number[];
  preview: string;
}
export function findConfig(cwd: string): Promise<string | null>;
export function loadConfig(configPath: string | null): Promise<Config>;
export function lint(options?: LintOptions): Promise<Summary>;
