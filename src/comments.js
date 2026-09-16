/**
 * Scans a source file and returns its comments as segments.
 *
 * A segment is one physical line of one comment:
 *   { text, line, column }
 *
 * line and column are 1-based.
 * Block comments produce one segment per line.
 * Comment markers stay in the text.
 */
export function extractComments(source, language) {
  const segments = [];
  const stack = [{ language, end: null }];
  let index = 0;
  let line = 1;
  let lineStart = 0;

  while (index < source.length) {
    const frame = stack[stack.length - 1];
    const current = frame.language;

    if (frame.end && startsWith(source, index, frame.end)) {
      index += frame.end.length;
      stack.pop();
      continue;
    }

    const region = findRegion(source, index, current.regions);
    if (region) {
      index += region[0].length;
      stack.push({ language: region[2], end: region[1] });
      continue;
    }

    const comment = findMarker(source, index, current.comments);
    if (comment) {
      const [start, end] = comment;
      const closeAt =
        end === "\n" ? source.indexOf("\n", index) : source.indexOf(end, index + start.length);
      const stop = closeAt === -1 ? source.length : end === "\n" ? closeAt : closeAt + end.length;

      pushLines(segments, source, index, stop, line, lineStart);

      for (let i = index; i < stop; i++) {
        if (source.charCodeAt(i) === 10) {
          line++;
          lineStart = i + 1;
        }
      }
      index = stop;
      continue;
    }

    const quote = findString(source, index, current.strings);
    if (quote) {
      index += quote.length;
      while (index < source.length) {
        const code = source.charCodeAt(index);
        if (code === 92) {
          if (source.charCodeAt(index + 1) === 10) {
            line++;
            lineStart = index + 2;
          }
          index += 2;
          continue;
        }
        if (code === 10) {
          if (quote !== "`") break;
          line++;
          lineStart = index + 1;
        }
        if (startsWith(source, index, quote)) {
          index += quote.length;
          break;
        }
        index++;
      }
      continue;
    }

    if (source.charCodeAt(index) === 10) {
      line++;
      lineStart = index + 1;
    }
    index++;
  }

  return segments;
}

/**
 * Every line of a prose file is a segment.
 */
export function extractLines(source) {
  const segments = [];
  let line = 1;
  let start = 0;

  while (start <= source.length) {
    let end = source.indexOf("\n", start);
    if (end === -1) end = source.length;
    if (end > start) {
      segments.push({ text: source.slice(start, end), line, column: 1 });
    }
    line++;
    start = end + 1;
  }

  return segments;
}

function pushLines(segments, source, from, to, line, lineStart) {
  let start = from;
  let currentLine = line;
  let currentLineStart = lineStart;

  while (start < to) {
    let end = source.indexOf("\n", start);
    if (end === -1 || end > to) end = to;
    if (end > start) {
      segments.push({
        text: source.slice(start, end),
        line: currentLine,
        column: start - currentLineStart + 1,
      });
    }
    currentLine++;
    currentLineStart = end + 1;
    start = end + 1;
  }
}

function startsWith(source, index, marker) {
  return source.startsWith(marker, index);
}

function findMarker(source, index, markers) {
  for (let i = 0; i < markers.length; i++) {
    if (startsWith(source, index, markers[i][0])) return markers[i];
  }
  return null;
}

function findRegion(source, index, regions) {
  for (let i = 0; i < regions.length; i++) {
    if (startsWith(source, index, regions[i][0])) return regions[i];
  }
  return null;
}

function findString(source, index, quotes) {
  for (let i = 0; i < quotes.length; i++) {
    if (startsWith(source, index, quotes[i])) return quotes[i];
  }
  return null;
}
