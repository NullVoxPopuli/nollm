import { describe, expect, test } from "vitest";
import { commentTexts, expectEmDashInComments } from "../helpers.js";

describe("double dash comments", () => {
  test.each(["sql", "hs", "elm", "ada"])("%s uses --", (ext) => {
    expect(commentTexts(`a.${ext}`, "-- one\nselect '-- no' -- two\n")).toEqual([
      "-- one",
      "-- two",
    ]);
  });

  test("lua uses -- and --[[ ]]", () => {
    const source = "-- one\n--[[ two\nthree ]]\nlocal s = '-- no'\n";
    expect(commentTexts("a.lua", source)).toEqual(["-- one", "--[[ two", "three ]]"]);
  });

  test.each(["sql", "lua", "hs"])("%s flags an em dash in a comment and not in code", (ext) => {
    const result = expectEmDashInComments(`a.${ext}`, "-- a — b", "x = 'a — b'");
    expect(result).toEqual({ inComment: ["em-dash"], inCode: [] });
  });
});

describe("lisp family", () => {
  test.each(["clj", "cljs", "edn", "lisp", "el", "scm", "rkt"])("%s uses ;", (ext) => {
    expect(commentTexts(`a.${ext}`, '; one\n(str "; no") ;; two\n')).toEqual(["; one", ";; two"]);
  });

  test("flags an em dash in a comment and not in code", () => {
    expect(expectEmDashInComments("a.clj", "; a — b", '(def s "a — b")')).toEqual({
      inComment: ["em-dash"],
      inCode: [],
    });
  });
});
