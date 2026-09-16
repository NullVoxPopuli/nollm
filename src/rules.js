import { longSentences, uniformParagraphs, uniformSentences, wallOfText } from "./shape.js";

/**
 * A rule is a regular expression plus a message,
 * or a check function that reads all lines at once.
 *
 * scope controls where the rule runs:
 *   prose      → markdown and text files
 *   comments   → comments inside code files
 *   text       → both of the above (the default)
 *   everywhere → every line of every file
 *
 * Patterns must have the g flag.
 *
 * A check function gets the segments of one file and the scope
 * they came from. It returns { line, column, text } per finding.
 */

function words(list) {
  return list.map(escape).join("|");
}

function anyOf(list) {
  return new RegExp(String.raw`\b(?:${words(list)})\b`, "gi");
}

function escape(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const BANNED_WORDS = [
  "genuinely",
  "fails loudly",
  "fails quietly",
  "spearheaded",
  "exactly the crutch",
  "crutch",
  "load bearing",
  "load-bearing",
  "carrying",
];

const FILLER_WORDS = ["simply", "seamlessly", "seamless", "robust"];

const LLM_VOCABULARY = [
  "delve",
  "delves",
  "delving",
  "tapestry",
  "streamline",
  "streamlines",
  "streamlined",
  "cutting-edge",
  "game-changer",
  "game changer",
  "at its core",
  "deep dive",
  "dive into",
  "let's dive",
  "multifaceted",
  "pivotal",
  "crucial",
  "myriad",
  "plethora",
  "foster",
  "fosters",
  "meticulous",
  "meticulously",
  "a testament to",
  "in today's",
  "fast-paced",
  "ever-evolving",
  "effortlessly",
  "supercharge",
  "state-of-the-art",
  "battle-tested",
  "production-ready",
  "blazing fast",
  "blazingly fast",
  "lightning-fast",
  "lightning fast",
  "elevate your",
  "empower",
  "empowers",
  "empowering",
  "navigate the complexities",
  "unlock the",
];

const CHAT_OPENERS = [
  "great question",
  "good question",
  "certainly",
  "absolutely",
  "sure thing",
  "sure",
  "of course",
  "let me",
  "i will",
  "i'll",
  "looking at your",
  "here's a",
  "here is a",
  "i'd be happy to",
  "i would be happy to",
];

const CHAT_CLOSERS = [
  "let me know if",
  "hope this helps",
  "hope that helps",
  "feel free to",
  "happy to help",
  "don't hesitate to",
  "do not hesitate to",
  "if you have any questions",
  "if there is anything else",
  "if there's anything else",
  "anything else i can",
];

const AI_DISCLOSURES = [
  "as an ai",
  "as a language model",
  "as a large language model",
  "i apologize for the confusion",
  "i apologize for any confusion",
  "i don't have access to",
  "i cannot browse",
  "my knowledge cutoff",
  "my training data",
];

const DIFF_TALK = [
  "as requested",
  "as discussed",
  "per the discussion",
  "per our discussion",
  "per the review",
  "per review",
  "this pr",
  "this commit",
  "this diff",
  "this change",
  "no longer",
  "used to be",
  "used to use",
  "used to return",
  "the old implementation",
  "the old version",
  "the old code",
  "the old approach",
  "the old way",
  "updated to",
  "changed to",
  "instead of the old",
  "instead of the previous",
  "we removed",
  "we replaced",
  "we migrated",
  "we switched",
  "now uses",
  "now returns",
  "now handles",
  "now lives",
  "moved to",
];

// Diff talk only when it opens a sentence. "used previously" is fine.
const DIFF_OPENERS = ["previously", "formerly"];

const DRAMATIC_VERBS = [
  "blow up",
  "blows up",
  "blowing up",
  "blew up",
  "die with",
  "dies with",
  "died with",
  "fall over",
  "falls over",
  "fell over",
  "choke on",
  "chokes on",
  "choked on",
  "trip over",
  "trips over",
  "tripped over",
  "bites us",
  "bites you",
  "bit us",
  "explode",
  "explodes",
  "exploded",
  "barf",
  "barfs",
];

const ERROR_OPENERS = [
  "Cannot",
  "Could not",
  "Couldn't",
  "Unable to",
  "Failed to",
  "Unexpected",
  "Invalid",
  "Expected",
  "Missing",
  "Uncaught",
  "Assertion Failed",
  "Maximum call stack",
];

const ASIDE_OPENERS = ["and", "but", "though", "although", "plus", "as well as", "not to mention"];

const WHAT_COMMENT_STARTS = [
  "this function",
  "this method",
  "this class",
  "this component",
  "this helper",
  "this hook",
  "this file",
  "this module",
  "this variable",
  "this constant",
  "this line",
  "loop over",
  "loop through",
  "iterate over",
  "iterate through",
  "check if",
  "checks if",
  "increment",
  "decrement",
  "set the",
  "sets the",
  "get the",
  "gets the",
  "create a new",
  "creates a new",
  "initialize the",
  "initializes the",
  "import the",
  "imports the",
  "define the",
  "defines the",
  "call the",
  "calls the",
  "declare",
];

// A comment starts after its marker, so the rule skips the marker first.
const COMMENT_START = String.raw`^\s*(?:\/\/+|#+|\*+|\/\*+|<!--|--|;+|%+|"""|''')?\s*`;

// The start of a comment or of a sentence, as a lookbehind.
const SENTENCE_START = String.raw`(?<=${COMMENT_START}|[.!?:;]\s+)`;

export const rules = [
  {
    id: "banned-word",
    message: "Banned word",
    pattern: anyOf(BANNED_WORDS),
  },
  {
    id: "em-dash",
    message: "Em dash. Use a comma, a colon, or a new sentence",
    pattern: /\u2014/g,
    scope: "comments",
  },
  {
    id: "bold-list-item",
    message: "List item with a bold label followed by plain text",
    pattern: /^\s*(?:[-*+]|\d+[.)])\s+(?:\*\*[^*\n]{1,80}\*\*|__[^_\n]{1,80}__):?(?=\s+[^\s*_])/gm,
    scope: "prose",
  },
  {
    id: "filler-word",
    message: "Filler. Delete it or replace it",
    pattern: anyOf(FILLER_WORDS),
  },
  {
    id: "llm-vocabulary",
    message: "LLM vocabulary",
    pattern: anyOf(LLM_VOCABULARY),
  },
  {
    id: "chat-opener",
    message: "Chat opener. Start with the answer",
    pattern: new RegExp(
      String.raw`${COMMENT_START}(?:[-*+]\s+)?(?:${words(CHAT_OPENERS)})\b[!,:]?`,
      "gmi",
    ),
  },
  {
    id: "chat-closer",
    message: "Chat closer. Stop when the content stops",
    pattern: anyOf(CHAT_CLOSERS),
  },
  {
    id: "ai-disclosure",
    message: "Text written from the point of view of a chat assistant",
    pattern: anyOf(AI_DISCLOSURES),
  },
  {
    id: "contrast-cliche",
    message: "Contrast cliche (not just X, but Y)",
    pattern:
      /\b(?:not (?:just|only|merely|simply) [^.\n]{1,60}?,? but(?: also)?\b|it'?s not (?:just |about )?[^.\n]{1,40}?[,;] it'?s\b)/gi,
  },
  {
    id: "rhetorical-question",
    message: "Rhetorical question followed by its answer",
    pattern:
      /(?:\bwhy\? because\b|\bthe (?:result|catch|problem|solution|answer|best part|good news|bottom line|difference)\?)/gi,
    scope: "prose",
  },
  {
    id: "emoji-list",
    message: "List item that starts with an emoji",
    pattern:
      /^\s*(?:[-*+]|\d+[.)])\s+(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F)/gmu,
    scope: "prose",
  },
  {
    id: "diff-comment",
    message: "Comment describes the change, not the code. Put it in the commit message",
    pattern: new RegExp(
      String.raw`\b(?:${words(DIFF_TALK)})\b|${SENTENCE_START}(?:${words(DIFF_OPENERS)})\b`,
      "gmi",
    ),
    scope: "comments",
  },
  {
    id: "quoted-error",
    message:
      "Comment quotes an error message. Say what breaks and why, not what the terminal printed",
    pattern: new RegExp(
      String.raw`["\u201C](?:(?:${words(ERROR_OPENERS)})\b|\w+Error:|\w+ is not (?:a function|defined|iterable)\b)[^"\u201D\n]*["\u201D]?`,
      "g",
    ),
    scope: "comments",
  },
  {
    id: "dramatic-verb",
    message: "Dramatic failure verb. Say what happens: throws, hangs, returns null",
    pattern: anyOf(DRAMATIC_VERBS),
  },
  {
    id: "parenthetical-aside",
    message: "Parenthetical aside. Make it a sentence, or delete it",
    pattern: new RegExp(String.raw`\((?:${words(ASIDE_OPENERS)})\b[^()\n]*\)?`, "gi"),
  },
  {
    id: "what-comment",
    message: "Comment narrates what the code does. Say why, or delete it",
    pattern: new RegExp(String.raw`${COMMENT_START}(?:${words(WHAT_COMMENT_STARTS)})\b`, "gmi"),
    scope: "comments",
  },
  {
    id: "long-sentence",
    message: "Long sentence. One idea per sentence",
    check: longSentences,
  },
  {
    id: "wall-of-text",
    message: "Wall of text. Split the paragraph",
    check: wallOfText,
  },
  {
    id: "uniform-paragraphs",
    message: "Consecutive paragraphs of the same length",
    check: uniformParagraphs,
    scope: "prose",
  },
  {
    id: "uniform-sentences",
    message: "Sentences of the same length. Vary the rhythm",
    check: uniformSentences,
  },
];
