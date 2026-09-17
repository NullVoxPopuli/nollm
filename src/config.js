import { lilconfig } from "lilconfig";
import { rules as builtinRules } from "./rules.js";

const SKIPPED = [
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "*.min.js",
  "*.min.css",
  "*.map",
];

export const SEARCH_PLACES = [
  "package.json",
  ".nollmrc",
  ".nollmrc.json",
  ".nollmrc.js",
  ".nollmrc.cjs",
  ".nollmrc.mjs",
  "nollm.config.js",
  "nollm.config.cjs",
  "nollm.config.mjs",
];

const explorer = lilconfig("nollm", { searchPlaces: SEARCH_PLACES });

/**
 * Finds the config for a directory with lilconfig.
 * Parent directories are searched too.
 *
 * Returns the path of the config file, or null.
 */
export async function findConfig(cwd) {
  const result = await explorer.search(cwd);
  return result?.filepath ?? null;
}

/**
 * Loads a config file and merges it with the defaults.
 *
 * The result has:
 *   rules  → the rules to run
 *   ignore → patterns of files to skip, in .gitignore syntax
 */
export async function loadConfig(configPath) {
  let user = {};
  if (configPath) {
    const result = await explorer.load(configPath);
    user = result?.config ?? {};
  }

  return {
    path: configPath,
    rules: resolveRules(user.rules, user.words),
    ignore: SKIPPED.concat(user.ignore ?? []),
    maxBytes: user.maxBytes ?? 2 * 1024 * 1024,
  };
}

function resolveRules(overrides = {}, words = []) {
  const rules = [];

  for (let i = 0; i < builtinRules.length; i++) {
    const rule = builtinRules[i];
    const override = overrideFor(overrides, rule);
    if (override === false) continue;
    rules.push(isObject(override) ? customRule(rule.id, override, rule) : rule);
  }

  for (const id in overrides) {
    const override = overrides[id];
    if (!isObject(override)) continue;
    if (builtinRules.some((rule) => namesOf(rule).includes(id))) continue;
    rules.push(customRule(id, override));
  }

  if (words.length > 0) {
    const escaped = words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    rules.push({
      id: "custom-word",
      message: "Banned word (nollm config)",
      pattern: new RegExp(String.raw`\b(?:${escaped.join("|")})\b`, "gi"),
    });
  }

  return rules;
}

/**
 * The config entry for a built in rule, under its id or one of its old ids.
 */
function overrideFor(overrides, rule) {
  const name = namesOf(rule).find((candidate) => candidate in overrides);
  return name === undefined ? undefined : overrides[name];
}

function namesOf(rule) {
  return [rule.id].concat(rule.aliases ?? []);
}

/**
 * Builds a rule from a config entry.
 * Keys that the entry leaves out come from the built in rule, when there is one.
 */
function customRule(id, override, base = {}) {
  const message = override.message ?? base.message ?? id;
  const scope = override.scope ?? base.scope;
  const check = override.check ?? (override.pattern === undefined ? base.check : undefined);

  if (typeof check === "function") {
    return { id, message, check, scope };
  }
  return {
    id,
    message,
    pattern: toGlobal(id, override.pattern ?? base.pattern, override.flags),
    scope,
  };
}

function toGlobal(id, pattern, flags = "") {
  if (typeof pattern === "string") {
    return new RegExp(pattern, flags.includes("g") ? flags : flags + "g");
  }
  if (pattern instanceof RegExp) {
    return pattern.global ? pattern : new RegExp(pattern.source, pattern.flags + "g");
  }
  throw new Error(
    `Rule "${id}" needs a pattern (a RegExp, or a string with optional flags) or a check function`,
  );
}

function isObject(value) {
  return typeof value === "object" && value !== null;
}
