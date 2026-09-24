import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Apple touch icon: the brand mark on ink. Mirrors src/app/icon.svg. */
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#1b1d23",
      }}
    >
      <svg width="132" height="132" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="12.25" stroke="#f7f4ee" strokeWidth="1.5" />
        <ellipse cx="16" cy="16" rx="5.25" ry="12.25" stroke="#f7f4ee" strokeWidth="1.25" />
        <path d="M3.75 16h24.5" stroke="#f7f4ee" strokeWidth="1.25" />
        <circle cx="21.25" cy="10.5" r="3.25" fill="#7abdeb" stroke="#1b1d23" strokeWidth="1.5" />
      </svg>
    </div>,
    size
  );
}
