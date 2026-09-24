"use client";

/**
 * Last-resort boundary for failures in the root layout itself. It replaces
 * the whole document, so it cannot rely on globals.css or site fonts.
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f7f4ee",
          color: "#1b1d23",
          fontFamily: "Georgia, 'Times New Roman', serif",
          padding: "2rem",
        }}
      >
        <main style={{ maxWidth: "32rem" }}>
          <h1 style={{ fontWeight: 500, fontSize: "2.25rem", lineHeight: 1.1, margin: 0 }}>
            Best City Spots is having trouble loading.
          </h1>
          <p style={{ fontFamily: "system-ui, sans-serif", color: "#4a4f59", lineHeight: 1.6 }}>
            Please try again in a moment.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              fontFamily: "system-ui, sans-serif",
              fontSize: "1rem",
              padding: "0.75rem 1.25rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "#195f91",
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
