import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Tinypool } from "tinypool";
import { check } from "./check.js";
import { classify } from "./languages.js";
import { loadConfig } from "./config.js";

const { configPath, cwd } = Tinypool.workerData;
const config = await loadConfig(configPath);

/**
 * Checks one file.
 *
 * Returns { file, findings, skipped }.
 * skipped names the reason a file was not read, or is null.
 */
export default async function checkFile(file) {
  if (!classify(file)) return { file, findings: [], skipped: "unknown type" };

  let buffer;
  try {
    buffer = await readFile(resolve(cwd, file));
  } catch (error) {
    return { file, findings: [], skipped: error.code ?? "unreadable" };
  }

  if (buffer.length > config.maxBytes) return { file, findings: [], skipped: "too large" };
  if (isBinary(buffer)) return { file, findings: [], skipped: "binary" };

  return { file, findings: check(file, buffer.toString("utf8"), config.rules), skipped: null };
}

function isBinary(buffer) {
  const end = Math.min(buffer.length, 8000);
  for (let i = 0; i < end; i++) {
    if (buffer[i] === 0) return true;
  }
  return false;
}
