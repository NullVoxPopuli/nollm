/**
 * Shape rules look at paragraphs instead of single lines.
 *
 * A paragraph is a run of lines with no blank line between them.
 * Comment markers, headings, tables, and fenced code do not count.
 * A list item or a JSDoc tag starts a new paragraph.
 */

const MARKER = /^\s*(?:\/\/+|#+|\*+|\/\*+|<!--|\{\{!--|\{\{!|--|;+|%+|"""|''')?\s*/;
const TRAILER = /\s*(?:\*\/|-->|--\}\}|\}\}|"""|''')\s*$/;
const LIST_ITEM = /^(?:[-*+]|\d+[.)])\s+|^@\w+/;
const SENTENCE_END = /[.!?]+(?:["')\]]+)?(?:\s+|$)/;

/**
 * Words that cannot end a thought.
 * They point at whatever comes next,
 * so a line that stops on one stopped in the middle of a phrase.
 *
 * Words that can stand at the end of a clause stay out, however often they
 * also appear mid phrase. "Yes it can" and "give it to her" are ordinary,
 * so can and her are not here.
 */
export const DANGLING_WORDS = [
  "a",
  "an",
  "the",
  "of",
  "to",
  "in",
  "on",
  "at",
  "by",
  "for",
  "with",
  "from",
  "into",
  "onto",
  "upon",
  "over",
  "under",
  "about",
  "across",
  "after",
  "before",
  "between",
  "during",
  "through",
  "toward",
  "towards",
  "within",
  "without",
  "against",
  "among",
  "around",
  "beyond",
  "per",
  "via",
  "and",
  "or",
  "but",
  "nor",
  "that",
  "which",
  "who",
  "whom",
  "whose",
  "if",
  "when",
  "while",
  "because",
  "although",
  "though",
  "unless",
  "until",
  "since",
  "whether",
  "is",
  "are",
  "was",
  "were",
  "has",
  "have",
  "had",
  "its",
  "their",
  "your",
  "our",
  "my",
  "every",
];

const DANGLING_END = new RegExp(String.raw`\b(${DANGLING_WORDS.join("|")})\s*$`, "i");

export const WALL_WORDS = 120;
export const WALL_SENTENCES = 7;
export const LONG_SENTENCE_WORDS = 30;
export const UNIFORM_PARAGRAPH_MIN_WORDS = 25;
export const UNIFORM_PARAGRAPH_SPREAD = 1.25;
export const UNIFORM_SENTENCE_MIN_COUNT = 4;
export const UNIFORM_SENTENCE_MIN_WORDS = 8;
export const UNIFORM_SENTENCE_VARIATION = 0.2;

/**
 * Groups segments into paragraphs.
 *
 * Pass inComments: true for comment segments,
 * so comment markers are removed before counting.
 *
 * Each paragraph has:
 *   line, column → where it starts
 *   words        → word count
 *   sentences    → word count per sentence
 *   preview      → its first few words
 */
export function paragraphs(segments, options) {
  const result = group(segments, options);

  for (let i = 0; i < result.length; i++) {
    const paragraph = result[i];
    const spans = paragraph.spans;
    const sentences = [];
    for (let s = 0; s < spans.length; s++) sentences.push(spans[s].words);
    paragraph.sentences = sentences;
    delete paragraph.spans;
    delete paragraph.pieces;
  }

  return result;
}

/**
 * Groups segments into paragraphs and keeps where each sentence starts.
 *
 * Each paragraph has the public fields, plus two internal ones:
 *   spans  → { offset, words, preview } per sentence
 *   pieces → { offset, line, column } per source line
 *
 * locate() turns an offset into the paragraph's text back into a position.
 */
function group(segments, { inComments = false } = {}) {
  const result = [];
  let current = null;
  let inFence = false;
  let previousLine = 0;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const text = inComments ? strip(segment.text) : segment.text.trim();

    if (text.startsWith("```") || text.startsWith("~~~")) {
      inFence = !inFence;
      current = null;
      continue;
    }

    const gap = segment.line !== previousLine + 1;
    previousLine = segment.line;

    if (inFence || text.length === 0 || text.startsWith("#") || text.startsWith("|")) {
      current = null;
      continue;
    }

    if (gap || current === null || LIST_ITEM.test(text)) {
      current = { line: segment.line, column: segment.column, text: "", pieces: [] };
      result.push(current);
    }

    if (current.text.length > 0) current.text += " ";
    current.pieces.push({
      offset: current.text.length,
      line: segment.line,
      column: segment.column + segment.text.indexOf(text),
    });
    current.text += text;
  }

  for (let i = 0; i < result.length; i++) {
    const paragraph = result[i];
    const spans = sentenceSpans(paragraph.text);
    let words = 0;
    for (let s = 0; s < spans.length; s++) words += spans[s].words;
    paragraph.spans = spans;
    paragraph.words = words;
    paragraph.preview = preview(paragraph.text);
    delete paragraph.text;
  }

  return result;
}

/**
 * The line and column of an offset into a paragraph's text.
 */
function locate(paragraph, offset) {
  const pieces = paragraph.pieces;
  let piece = pieces[0];
  for (let i = 1; i < pieces.length; i++) {
    if (pieces[i].offset > offset) break;
    piece = pieces[i];
  }
  return { line: piece.line, column: piece.column + (offset - piece.offset) };
}

export function wallOfText(segments, scope) {
  const found = [];
  const all = paragraphs(segments, { inComments: scope === "comments" });

  for (let i = 0; i < all.length; i++) {
    const paragraph = all[i];
    if (paragraph.words <= WALL_WORDS && paragraph.sentences.length <= WALL_SENTENCES) continue;
    found.push({
      line: paragraph.line,
      column: paragraph.column,
      text: `${paragraph.words} words, ${paragraph.sentences.length} sentences: ${paragraph.preview}`,
    });
  }

  return found;
}

export function longSentences(segments, scope) {
  const found = [];
  const all = group(segments, { inComments: scope === "comments" });

  for (let i = 0; i < all.length; i++) {
    const spans = all[i].spans;
    for (let s = 0; s < spans.length; s++) {
      if (spans[s].words <= LONG_SENTENCE_WORDS) continue;
      const at = locate(all[i], spans[s].offset);
      found.push({
        line: at.line,
        column: at.column,
        text: `${spans[s].words} words: ${spans[s].preview}`,
      });
    }
  }

  return found;
}

export function uniformParagraphs(segments, scope) {
  const found = [];
  const all = paragraphs(segments, { inComments: scope === "comments" });
  let start = 0;

  while (start < all.length) {
    let end = start;
    let min = all[start].words;
    let max = min;

    while (end + 1 < all.length) {
      const next = all[end + 1].words;
      const lo = Math.min(min, next);
      const hi = Math.max(max, next);
      if (lo < UNIFORM_PARAGRAPH_MIN_WORDS || hi > lo * UNIFORM_PARAGRAPH_SPREAD) break;
      min = lo;
      max = hi;
      end++;
    }

    if (end - start >= 2 && min >= UNIFORM_PARAGRAPH_MIN_WORDS) {
      const counts = [];
      for (let i = start; i <= end; i++) counts.push(all[i].words);
      found.push({
        line: all[start].line,
        column: all[start].column,
        text: `${counts.length} paragraphs of ${counts.join(", ")} words`,
      });
      start = end + 1;
    } else {
      start++;
    }
  }

  return found;
}

export function uniformSentences(segments, scope) {
  const found = [];
  const all = paragraphs(segments, { inComments: scope === "comments" });

  for (let i = 0; i < all.length; i++) {
    const lengths = all[i].sentences;
    if (lengths.length < UNIFORM_SENTENCE_MIN_COUNT) continue;

    const mean = all[i].words / lengths.length;
    if (mean < UNIFORM_SENTENCE_MIN_WORDS) continue;

    let squares = 0;
    for (let s = 0; s < lengths.length; s++) squares += (lengths[s] - mean) ** 2;
    const variation = Math.sqrt(squares / lengths.length) / mean;
    if (variation >= UNIFORM_SENTENCE_VARIATION) continue;

    found.push({
      line: all[i].line,
      column: all[i].column,
      text: `${lengths.length} sentences of ${lengths.join(", ")} words`,
    });
  }

  return found;
}

function strip(text) {
  return text.replace(TRAILER, "").replace(MARKER, "").trim();
}

function sentenceSpans(text) {
  const spans = [];
  const ends = new RegExp(SENTENCE_END.source, "g");
  let start = 0;
  let match;

  while ((match = ends.exec(text)) !== null) {
    push(start, text.slice(start, match.index));
    start = match.index + match[0].length;
  }
  push(start, text.slice(start));
  return spans;

  function push(offset, part) {
    const count = wordCount(part);
    if (count > 0) spans.push({ offset, words: count, preview: preview(part) });
  }
}

function wordCount(text) {
  let count = 0;
  let inWord = false;
  for (let i = 0; i < text.length; i++) {
    const space = text.charCodeAt(i) <= 32;
    if (!space && !inWord) count++;
    inWord = !space;
  }
  return count;
}

function preview(text) {
  const words = text.split(/\s+/, 6);
  return words.join(" ") + (words.length === 6 ? "..." : "");
}

/**
 * Line breaks that land in the middle of a phrase.
 *
 * A break reads as a pause, so the line before it should be able to stop.
 * A line ending on a word that points at the next one cannot.
 *
 * Only a break the next line carries on counts.
 * A blank line, a heading, a table, a fence, or a new list item
 * each end the thought by themselves, so the line before one is skipped.
 */
export function midPhraseBreaks(segments, scope) {
  const inComments = scope === "comments";
  const found = [];
  let fence = false;
  let previous = null;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const text = inComments ? strip(segment.text) : segment.text.trim();

    if (text.startsWith("```") || text.startsWith("~~~")) {
      fence = !fence;
      previous = null;
      continue;
    }

    if (fence || text.length === 0 || text.startsWith("#") || text.startsWith("|")) {
      previous = null;
      continue;
    }

    const carriesOn = previous !== null && segment.line === previous.line + 1;
    if (carriesOn && !LIST_ITEM.test(text)) {
      const match = DANGLING_END.exec(previous.text);
      if (match) {
        found.push({
          line: previous.line,
          column: previous.column + match.index,
          text: match[1],
        });
      }
    }

    previous = {
      text,
      line: segment.line,
      column: segment.column + segment.text.indexOf(text),
    };
  }

  return found;
}
