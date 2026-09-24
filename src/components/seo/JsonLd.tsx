import { serializeJsonLd } from "@/lib/json-ld";

/** JSON-LD script tag; always serialized through serializeJsonLd (XSS-safe). */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
