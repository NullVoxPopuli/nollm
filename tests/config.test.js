import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { findConfig, loadConfig, rules } from "../src/index.js";
import { copyFixture } from "./helpers.js";

let cleanup = async () => {};

afterEach(async () => {
  await cleanup();
});

async function withConfig(source) {
  const copy = await copyFixture("project");
  cleanup = copy.cleanup;
  const path = join(copy.dir, "nollm.config.js");
  await writeFile(path, source);
  return { dir: copy.dir, path };
}

describe("config", () => {
  test("uses the built in rules without a config file", async () => {
    const config = await loadConfig(null);
    expect(config.rules).toEqual(rules);
    expect(config.ignore).toContain("pnpm-lock.yaml");
  });

  test("finds nollm.config.js in a directory", async () => {
    const { dir, path } = await withConfig("export default {};\n");
    expect(await findConfig(dir)).toBe(path);
  });

  test("finds a nollm key in package.json", async () => {
    const copy = await copyFixture("project");
    cleanup = copy.cleanup;
    const path = join(copy.dir, "package.json");
    await writeFile(
      path,
      '{ "name": "fixture", "nollm": { "rules": { "chat-opener": false } } }\n',
    );
    expect(await findConfig(copy.dir)).toBe(path);
    const config = await loadConfig(path);
    expect(config.rules.map((rule) => rule.id)).not.toContain("chat-opener");
  });

  test("reads string patterns from JSON configs", async () => {
    const copy = await copyFixture("project");
    cleanup = copy.cleanup;
    const path = join(copy.dir, ".nollmrc.json");
    await writeFile(
      path,
      '{ "rules": { "todo": { "pattern": "\\\\bTODO\\\\b", "flags": "i", "message": "Open TODO" } } }\n',
    );
    const config = await loadConfig(path);
    const todo = config.rules.find((rule) => rule.id === "todo");
    expect(todo.pattern.flags).toBe("gi");
    expect("a todo".match(todo.pattern)).toEqual(["todo"]);
  });

  test("accepts a rule under an old id", async () => {
    const off = await withConfig('export default { rules: { "diff-comment": false } };\n');
    const disabled = await loadConfig(off.path);
    expect(disabled.rules.map((rule) => rule.id)).not.toContain("pr-comment");
    await cleanup();

    const renamed = await withConfig(
      'export default { rules: { "diff-comment": { message: "Old name" } } };\n',
    );
    const config = await loadConfig(renamed.path);
    const matching = config.rules.filter((rule) => /comment$/.test(rule.id));
    expect(matching.map((rule) => rule.id)).toEqual(["pr-comment", "what-comment"]);
    expect(matching[0].message).toBe("Old name");
  });

  test("disables rules, adds rules, and adds words", async () => {
    const { path } = await withConfig(`export default {
      ignore: ["docs/**"],
      words: ["synergy"],
      rules: {
        "emoji-list": false,
        "todo": { pattern: /TODO/, message: "Open TODO", scope: "comments" },
      },
    };\n`);
    const config = await loadConfig(path);
    const ids = config.rules.map((rule) => rule.id);
    expect(ids).not.toContain("emoji-list");
    expect(ids).toContain("todo");
    expect(ids).toContain("custom-word");
    expect(config.ignore).toContain("docs/**");

    const todo = config.rules.find((rule) => rule.id === "todo");
    expect(todo.pattern.flags).toContain("g");
    expect(todo.scope).toBe("comments");
  });

  test("changes the scope of a built in rule and keeps its pattern", async () => {
    const { path } = await withConfig(
      'export default { rules: { "em-dash": { scope: "text" } } };\n',
    );
    const config = await loadConfig(path);
    const emDash = config.rules.find((rule) => rule.id === "em-dash");
    expect(emDash.scope).toBe("text");
    expect(emDash.pattern.source).toBe(rules.find((rule) => rule.id === "em-dash").pattern.source);
    expect(emDash.message).toContain("Em dash");
  });

  test("rejects a rule without a RegExp", async () => {
    const { path } = await withConfig("export default { rules: { bad: { pattern: 1 } } };\n");
    await expect(loadConfig(path)).rejects.toThrow('Rule "bad" needs a pattern');
  });
});
