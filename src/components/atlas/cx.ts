/**
 * Tiny class-name composer. Keeps the atlas primitives dependency-free
 * (no `clsx`/`tailwind-merge`) while still allowing conditional joins.
 */
export type ClassValue =
  | string
  | number
  | null
  | false
  | undefined
  | ClassValue[]
  | { [key: string]: boolean | null | undefined };

export function cx(...values: ClassValue[]): string {
  const out: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (typeof value === "string" || typeof value === "number") {
      out.push(String(value));
    } else if (Array.isArray(value)) {
      const inner = cx(...value);
      if (inner) out.push(inner);
    } else if (typeof value === "object") {
      for (const key of Object.keys(value)) {
        // eslint-disable-next-line security/detect-object-injection
        if (value[key]) out.push(key);
      }
    }
  }
  return out.join(" ");
}
