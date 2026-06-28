/**
 * Serialize a JSON-LD object for safe embedding inside a
 * `<script type="application/ld+json">` block via `dangerouslySetInnerHTML`.
 *
 * `JSON.stringify` alone does NOT escape `</script>` sequences. If any string
 * field contains the literal `</script>`, the browser closes the JSON-LD
 * script block early and the remainder is parsed as HTML — a stored-XSS vector
 * whenever the embedded data is attacker-influenced (e.g. cached AI content,
 * provider-sourced place names).
 *
 * Mitigation follows the OWASP guidance for HTML script-block injection:
 * escape `&`, `<`, `>`, and the JS line/paragraph separators that break out of
 * a JS string context. The result is still valid JSON inside the script block.
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
