/**
 * Best-effort partial JSON parser.
 *
 * Used to render incremental UI from a streaming AI response that is producing
 * a JSON object/array. The parser closes any open strings/objects/arrays and
 * trims trailing commas / dangling colons so that an in-flight token sequence
 * still produces a structurally valid value.
 *
 * Trade-offs:
 *  - The "completion" is a structural close, not a semantic guess: an
 *    in-progress string is closed at the cursor (its tail will reflate when
 *    more bytes arrive on the next tick).
 *  - Invalid escape sequences mid-stream are tolerated by truncating the open
 *    string at the last safe boundary.
 *  - Numbers in flight (e.g. `"1.`) are dropped if we cannot finalize them.
 *
 * Returns `null` if the buffer cannot be coerced into a valid JSON value yet
 * (e.g. only whitespace, or a stray control character).
 */
export function parsePartialJson<T = unknown>(raw: string): T | null {
  if (!raw) return null;

  // Strip ```json fences if Gemini decided to wrap the payload.
  let s = raw.replace(/```json|```/gi, "").trim();
  if (!s) return null;

  // Find the first JSON-ish opener. Anything before it is preamble.
  const firstBrace = s.indexOf("{");
  const firstBracket = s.indexOf("[");
  let start = -1;
  if (firstBrace === -1) start = firstBracket;
  else if (firstBracket === -1) start = firstBrace;
  else start = Math.min(firstBrace, firstBracket);
  if (start === -1) return null;
  s = s.slice(start);

  const stack: Array<"{" | "[" | '"'> = [];
  let escape = false;
  let lastSafe = 0; // index after which we can safely truncate without
  // breaking an escape sequence.

  for (let i = 0; i < s.length; i += 1) {
    const ch = s.charAt(i);
    const inString = stack[stack.length - 1] === '"';

    if (escape) {
      escape = false;
      lastSafe = i + 1;
      continue;
    }

    if (inString) {
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') {
        stack.pop();
        lastSafe = i + 1;
      } else {
        lastSafe = i + 1;
      }
      continue;
    }

    if (ch === '"') {
      stack.push('"');
      lastSafe = i + 1;
      continue;
    }
    if (ch === "{" || ch === "[") {
      stack.push(ch);
      lastSafe = i + 1;
      continue;
    }
    if (ch === "}" || ch === "]") {
      const open = stack[stack.length - 1];
      if ((ch === "}" && open === "{") || (ch === "]" && open === "[")) {
        stack.pop();
        lastSafe = i + 1;
      }
      continue;
    }
    // Outside strings, any non-whitespace structural token (`,`, `:`,
    // digits, `t`/`f`/`n` literal starts) is a safe truncation point.
    lastSafe = i + 1;
  }

  // Truncate to the last safe point (drops a half-written escape).
  let candidate = s.slice(0, lastSafe);

  // Close any open string.
  if (stack[stack.length - 1] === '"') {
    candidate += '"';
    stack.pop();
  }

  // Strip dangling separators at the tail (`,`, `:`, or `key":` without value).
  // Walk backwards skipping whitespace.
  candidate = candidate.replace(/[\s\uFEFF\xA0]+$/g, "");
  // Drop trailing comma.
  while (candidate.endsWith(",")) candidate = candidate.slice(0, -1).replace(/[\s\uFEFF\xA0]+$/g, "");
  // Drop trailing colon and the key it belongs to (`"foo":` -> remove).
  if (candidate.endsWith(":")) {
    candidate = candidate.slice(0, -1).replace(/[\s\uFEFF\xA0]+$/g, "");
    // Now we expect `..."key"` or `..."key":` — strip the unmatched key string.
    const lastQuote = candidate.lastIndexOf('"');
    if (lastQuote !== -1) {
      // find the matching opening quote (walk back, ignoring escaped).
      let openQ = -1;
      for (let i = lastQuote - 1; i >= 0; i -= 1) {
        if (candidate.charAt(i) === '"' && candidate.charAt(i - 1) !== "\\") {
          openQ = i;
          break;
        }
      }
      if (openQ !== -1) {
        candidate = candidate.slice(0, openQ).replace(/[\s\uFEFF\xA0,]+$/g, "");
      }
    }
  }
  // Drop a partially typed literal/number at the tail (e.g. `nu`, `tru`, `1.`).
  candidate = candidate.replace(/[A-Za-z0-9._+-]+$/u, (m) => {
    if (m === "true" || m === "false" || m === "null") return m;
    if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(m)) return m;
    return "";
  });
  candidate = candidate.replace(/[\s,]+$/g, "");

  // Close remaining open structures (LIFO).
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    // i is a bounded loop index over a local array.
    // eslint-disable-next-line security/detect-object-injection
    const open = stack[i];
    if (open === "{") candidate += "}";
    else if (open === "[") candidate += "]";
  }

  try {
    return JSON.parse(candidate) as T;
  } catch {
    return null;
  }
}
