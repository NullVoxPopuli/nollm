import { describe, expect, test } from "vitest";
import { classify } from "../../src/index.js";
import { commentTexts, expectEmDashInComments } from "../helpers.js";

const hashExtensions = ["sh", "bash", "zsh", "fish", "pl", "pm", "r", "ex", "exs", "nim", "ps1"];
const configExtensions = ["yml", "yaml", "toml", "ini", "cfg", "conf", "env", "properties"];
const names = [
  "Dockerfile",
  "Makefile",
  "GNUmakefile",
  "justfile",
  "Procfile",
  ".gitignore",
  "Dockerfile.dev",
];

describe("hash comments", () => {
  test.each(hashExtensions)("%s uses #", (ext) => {
    expect(commentTexts(`a.${ext}`, '# one\necho "# no" # two\n')).toEqual(["# one", "# two"]);
  });

  test("single quotes protect # in shell", () => {
    expect(commentTexts("a.sh", "echo '# no' # yes\n")).toEqual(["# yes"]);
  });

  test.each(configExtensions)("%s uses # and ignores apostrophes", (ext) => {
    expect(commentTexts(`a.${ext}`, "title: don't stop # note\n# top\n")).toEqual([
      "# note",
      "# top",
    ]);
  });

  test("double quotes protect # in config files", () => {
    expect(commentTexts("a.yml", 'color: "#fff" # hex\n')).toEqual(["# hex"]);
  });

  test.each(names)("%s is recognized by name", (name) => {
    expect(classify(name)?.kind).toBe("code");
    expect(commentTexts(name, "# one\nFROM x\n")).toEqual(["# one"]);
  });

  test.each(hashExtensions.concat(configExtensions))(
    "%s flags an em dash in a comment and not in code",
    (ext) => {
      const result = expectEmDashInComments(`a.${ext}`, "# a — b", 'x = "a — b"');
      expect(result).toEqual({ inComment: ["em-dash"], inCode: [] });
    },
  );
});
