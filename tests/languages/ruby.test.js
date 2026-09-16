import { describe, expect, test } from "vitest";
import { commentTexts, expectEmDashInComments } from "../helpers.js";

describe("ruby", () => {
  test.each(["a.rb", "a.rake", "Rakefile", "Gemfile", "Guardfile", "Vagrantfile", "Brewfile"])(
    "%s uses # and =begin blocks",
    (file) => {
      const source = "# one\n=begin\ntwo\n=end\nputs '#no' # three\n";
      expect(commentTexts(file, source)).toEqual(["# one", "=begin", "two", "=end", "# three"]);
    },
  );

  test("flags an em dash in a comment and not in code", () => {
    expect(expectEmDashInComments("a.rb", "# a — b", 's = "a — b"')).toEqual({
      inComment: ["em-dash"],
      inCode: [],
    });
  });
});
