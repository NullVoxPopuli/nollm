# nollm

Lint against LLMisms in your codebase.

Pronounced "nollum": like gollum, with an n.

`nollm` reads every file that git tracks or does not ignore.
It checks prose files line by line, and code files comment by comment.
Each finding prints as soon as it is found.

![!this project was created with claude code](https://i.imgflip.com/4h68b2.jpg)

```
npx nollm
```

## Install

```
pnpm add -D nollm
```

Add a script to `package.json`:

```json
{
  "scripts": {
    "lint:prose": "nollm"
  }
}
```

Requires Node 24 or newer.

## Usage

```
nollm [options] [paths...]
```

With no paths, `nollm` checks the current directory.
Paths can be files or directories, and they can be relative or absolute:

```
nollm docs/guide.md
nollm /srv/site/docs/guide.md
```

A file under the current directory is reported by its relative path.
A file outside it keeps its absolute path, so the report never points at it
through a row of `..`.
Ignore patterns from the config describe the project, so they apply under the
current directory and leave paths outside it alone.

| Option            | Effect                                                             |
| ----------------- | ------------------------------------------------------------------ |
| `--jobs <n>`      | Number of worker threads. Defaults to the CPU count.               |
| `--config <path>` | Config file to use.                                                |
| `--diff <ref>`    | Check only the lines this branch adds or changes since `<ref>`.    |
| `--no-git`        | Do not ask git for the file list. Read `.gitignore` files instead. |
| `--quiet`         | Print only the summary.                                            |
| `--list-rules`    | Print every rule and exit.                                         |

The exit code is 1 when there are findings, and 2 on a usage error.

Output is one block per file, grouped by rule:

```
README.md
  filler-word  Filler. Delete it or replace it
    3:14  "simply"
    3:33  "robust"
  chat-opener  Chat opener. Start with the answer
    7:1   "Great question"

src/index.js
  what-comment  Comment narrates what the code does. Say why, or delete it
    1:1  "// This function"

4 problems in 2 files (5 files checked, 0.07s)
```

## Checking only a pull request

A large codebase written before you added `nollm` has findings everywhere.
`--diff` reports only the lines the current branch touches, so a pull request
is judged on what it adds:

```
nollm --diff origin/main
```

The comparison starts at the merge base, the same range the pull request shows.
Commits that landed on `origin/main` after you branched do not count as yours.
Uncommitted edits and new files count, so the command works before you push.

A finding is kept by the line it points at.
A rule that reports at the top of a block, such as `wall-of-text`, stays quiet
when the branch grows a paragraph further down.

The diff is read in the repository the paths point at, not the one you happen
to stand in, so `nollm --diff main /srv/site` works from anywhere.

The base ref has to be in that clone. A shallow checkout, or one that fetched
a single branch, does not have it, and `nollm` then names the command that
fetches it.

In GitHub Actions, fetch the base branch first:

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0
- run: npx nollm --diff origin/${{ github.base_ref }}
```

## What gets checked

Prose files: markdown, text, reStructuredText, AsciiDoc, and files named `README`, `CHANGELOG`, `LICENSE`, and similar.
Every line is checked.

Code files: JavaScript, TypeScript, Python, Ruby, Rust, Go, shell, YAML, TOML, HTML, Handlebars, `.gjs`, `.gts`, and many more.
Only comments are checked, so identifiers and string contents do not trigger rules.

Files of other types, binary files, lockfiles, minified files, and files over 2 MB are skipped.

## Rules

| Rule                      | Catches                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `banned-word`             | genuinely, load-bearing, crutch, spearheaded, fails loudly, and friends                                            |
| `em-dash`                 | The em dash character                                                                                              |
| `bold-list-item`          | List items like `- **Label:** plain text`                                                                          |
| `filler-word`             | simply, seamlessly, seamless, robust                                                                               |
| `llm-vocabulary`          | delve, tapestry, crucial, game-changer, battle-tested, and more                                                    |
| `chat-opener`             | Lines that start with "Great question", "Certainly", "Let me", and more                                            |
| `chat-closer`             | "Hope this helps", "Let me know if", "Feel free to", and more                                                      |
| `ai-disclosure`           | "As an AI", "my training data", and more                                                                           |
| `contrast-cliche`         | "not just X, but Y", "it's not X, it's Y", and "X, not Y: the rest"                                                |
| `rhetorical-question`     | "Why? Because" and "The result?"                                                                                   |
| `emoji-list`              | List items that start with an emoji                                                                                |
| `no-short-term-relevance` | Comments that stop making sense once the change lands: "no longer", "no behavior change", "for now", "Previously," |
| `what-comment`            | Comments that narrate the code: "This function returns", "Loop over"                                               |
| `quoted-error`            | Comments that quote an error message: `"Cannot read properties of..."`                                             |
| `dramatic-verb`           | blows up, dies with, falls over, chokes on, and friends                                                            |
| `parenthetical-aside`     | Asides like `(and their compiled handles)`                                                                         |
| `mid-phrase-break`        | A line that stops mid phrase, on a word such as the, of, or that                                                   |
| `long-sentence`           | A sentence over 30 words                                                                                           |
| `wall-of-text`            | A paragraph over 120 words or 7 sentences                                                                          |
| `uniform-paragraphs`      | Three or more paragraphs in a row of about the same length                                                         |
| `uniform-sentences`       | Four or more sentences of about the same length                                                                    |

Run `nollm --list-rules` for the full list with the scope of each rule.

Prose and comments get different rules.
For example, `em-dash` runs in code comments and not in markdown.
To change where a rule runs, set its `scope` in the config.

## Configuration

`nollm` finds its config with [lilconfig](https://github.com/antonk52/lilconfig).
Put it in one of these places:

- a `nollm` key in `package.json`
- `.nollmrc` or `.nollmrc.json`
- `.nollmrc.js`, `.nollmrc.cjs`, or `.nollmrc.mjs`
- `nollm.config.js`, `nollm.config.cjs`, or `nollm.config.mjs`

Parent directories are searched too.

```js
// nollm.config.js
export default {
  // .gitignore syntax
  ignore: ["CHANGELOG.md", "tests/fixtures/"],

  // extra banned words
  words: ["synergy", "circle back"],

  rules: {
    // turn a rule off
    "chat-opener": false,

    // run a built in rule somewhere else
    "em-dash": { scope: "text" },

    // add a rule, or replace a built in one
    "open-todo": {
      pattern: /\bTODO\b/,
      message: "Open TODO",
      scope: "comments",
    },
  },
};
```

In JSON configs, write the pattern as a string and add flags in a `flags` key.

A rule can also have a `check` function instead of a pattern.
It gets every line of the file as `{ text, line, column }`, plus the scope, and returns findings of the same shape, plus `text`.
The `paragraphs` export groups those lines into paragraphs with word and sentence counts.

`scope` is one of:

- `prose`: prose files only
- `comments`: comments in code files only
- `text`: prose and comments. This is the default
- `everywhere`: every line of every file

A config entry for a built in rule can change only `scope` or `message`. The pattern stays.

To silence one line, put `nollm-ignore-next-line` on the line before it.
To silence a whole file, put `nollm-ignore-file` anywhere in it.

## API

```js
import { check, lint } from "nollm";

const findings = check("README.md", "This is simply the best.");
// [{ line: 1, column: 9, ruleId: "filler-word", message: "...", text: "simply" }]

const summary = await lint({
  roots: ["src", "docs"],
  diff: "origin/main",
  onResult({ file, findings }) {
    // runs once per file, as soon as it is done
  },
});
// { files: 12, checked: 10, findings: 3, filesWithFindings: 2 }
```
