/**
 * A language describes how to find comments in a file.
 *
 * comments: pairs of start and end markers.
 *   An end of "\n" means the comment runs to the end of the line.
 *
 * strings: delimiters that open and close a string.
 *   Comment markers inside a string are ignored.
 *
 * regions: nested languages, for example <script> inside HTML.
 */

const clike = {
  comments: [
    ["/*", "*/"],
    ["//", "\n"],
  ],
  strings: ['"', "'", "`"],
  regions: [],
};

const css = {
  comments: [["/*", "*/"]],
  strings: ['"', "'"],
  regions: [],
};

const rust = {
  comments: clike.comments,
  strings: ['"'],
  regions: [],
};

const hash = {
  comments: [["#", "\n"]],
  strings: ['"', "'"],
  regions: [],
};

const python = {
  comments: [
    ['"""', '"""'],
    ["'''", "'''"],
    ["#", "\n"],
  ],
  strings: ['"', "'"],
  regions: [],
};

const config = {
  comments: [["#", "\n"]],
  strings: ['"'],
  regions: [],
};

const ruby = {
  comments: [
    ["=begin", "=end"],
    ["#", "\n"],
  ],
  strings: ['"', "'"],
  regions: [],
};

const dash = {
  comments: [["--", "\n"]],
  strings: ['"', "'"],
  regions: [],
};

const lua = {
  comments: [
    ["--[[", "]]"],
    ["--", "\n"],
  ],
  strings: ['"', "'"],
  regions: [],
};

const lisp = {
  comments: [[";", "\n"]],
  strings: ['"'],
  regions: [],
};

const glimmer = {
  comments: [
    ["{{!--", "--}}"],
    ["{{!", "}}"],
    ["<!--", "-->"],
  ],
  strings: [],
  regions: [],
};

const html = {
  comments: [["<!--", "-->"]],
  strings: [],
  regions: [
    ["<script", "</script>", clike],
    ["<style", "</style>", css],
  ],
};

const glimmerScript = {
  comments: clike.comments,
  strings: clike.strings,
  regions: [["<template", "</template>", glimmer]],
};

const byExtension = {
  js: clike,
  jsx: clike,
  mjs: clike,
  cjs: clike,
  ts: clike,
  tsx: clike,
  mts: clike,
  cts: clike,
  jsonc: clike,
  json5: clike,
  java: clike,
  kt: clike,
  kts: clike,
  scala: clike,
  groovy: clike,
  c: clike,
  h: clike,
  cc: clike,
  cpp: clike,
  cxx: clike,
  hpp: clike,
  hh: clike,
  m: clike,
  mm: clike,
  cs: clike,
  go: clike,
  swift: clike,
  dart: clike,
  php: clike,
  zig: clike,
  proto: clike,
  gradle: clike,
  rs: rust,
  css,
  scss: clike,
  sass: clike,
  less: clike,
  py: python,
  pyi: python,
  rb: ruby,
  rake: ruby,
  sh: hash,
  bash: hash,
  zsh: hash,
  fish: hash,
  pl: hash,
  pm: hash,
  r: hash,
  ex: hash,
  exs: hash,
  nim: hash,
  ps1: hash,
  yml: config,
  yaml: config,
  toml: config,
  ini: config,
  cfg: config,
  conf: config,
  env: config,
  properties: config,
  dockerfile: config,
  makefile: config,
  gitignore: config,
  sql: dash,
  hs: dash,
  elm: dash,
  ada: dash,
  lua,
  clj: lisp,
  cljs: lisp,
  edn: lisp,
  lisp,
  el: lisp,
  scm: lisp,
  rkt: lisp,
  hbs: glimmer,
  handlebars: glimmer,
  html: html,
  htm: html,
  xml: html,
  svg: html,
  vue: html,
  svelte: html,
  astro: html,
  gjs: glimmerScript,
  gts: glimmerScript,
};

const proseExtensions = new Set([
  "md",
  "mdx",
  "markdown",
  "txt",
  "text",
  "rst",
  "adoc",
  "asciidoc",
  "org",
]);

const proseNames = new Set([
  "readme",
  "contributing",
  "changelog",
  "license",
  "licence",
  "authors",
  "notice",
  "todo",
  "install",
  "history",
  "news",
]);

const codeNames = {
  dockerfile: config,
  makefile: config,
  gnumakefile: config,
  rakefile: ruby,
  gemfile: ruby,
  guardfile: ruby,
  vagrantfile: ruby,
  brewfile: ruby,
  justfile: hash,
  procfile: config,
};

/**
 * Returns { kind: "prose" } for text files,
 * { kind: "code", language } for source files,
 * and null for files this tool does not read.
 */
export function classify(filePath) {
  const base = filePath.slice(Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\")) + 1);
  const lower = base.toLowerCase();
  const dot = lower.lastIndexOf(".");

  if (dot === -1) {
    if (proseNames.has(lower)) return { kind: "prose" };
    const language = codeNames[lower];
    return language ? { kind: "code", language } : null;
  }

  const ext = lower.slice(dot + 1);
  const stem = lower.slice(0, dot);

  if (proseExtensions.has(ext)) return { kind: "prose" };
  if (dot === 0) {
    const language = byExtension[ext];
    return language ? { kind: "code", language } : null;
  }

  const language = byExtension[ext] ?? codeNames[stem];
  return language ? { kind: "code", language } : null;
}
