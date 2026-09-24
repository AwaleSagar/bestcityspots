import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Best City Spots - Urban Intelligence";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

const PAPER = "#f7f4ee";
const INK = "#1b1d23";
const MUTED = "#5b606b";
const ACCENT = "#195f91";
const RULE = "#d9d4ca";

/** Social card in the editorial-almanac style: paper, ink and one accent. */
export default async function Image() {
  const meridians = [0.2, 0.42, 0.62, 0.8, 0.94];
  const parallels = [-0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75];
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        backgroundColor: PAPER,
        color: INK,
        fontFamily: "serif",
        overflow: "hidden",
      }}
    >
      <svg
        width="760"
        height="760"
        viewBox="-302 -302 604 604"
        style={{ position: "absolute", right: -170, top: -65 }}
        fill="none"
        stroke={RULE}
        strokeWidth="1.5"
      >
        <circle r="300" />
        <line x1="0" y1="-300" x2="0" y2="300" />
        {meridians.map((ratio) => (
          <ellipse key={`m${ratio}`} rx={300 * ratio} ry="300" />
        ))}
        {parallels.map((ratio) => {
          const y = 300 * ratio;
          const half = Math.sqrt(300 * 300 - y * y);
          return <line key={`p${ratio}`} x1={-half} y1={y} x2={half} y2={y} />;
        })}
        <circle cx="128" cy="-134" r="22" fill={ACCENT} stroke={PAPER} strokeWidth="8" />
      </svg>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, letterSpacing: -0.5 }}>Best City Spots</div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 760 }}>
          <div style={{ fontSize: 76, lineHeight: 1.04, letterSpacing: -2 }}>
            Choose your next city with the facts in view.
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 28,
              color: MUTED,
              fontFamily: "sans-serif",
              lineHeight: 1.4,
            }}
          >
            Live conditions · labelled AI briefings · places travelers rate
          </div>
        </div>
        <div
          style={{
            display: "flex",
            borderTop: `2px solid ${RULE}`,
            paddingTop: 22,
            fontSize: 24,
            color: MUTED,
            fontFamily: "sans-serif",
          }}
        >
          bestcityspots.com
        </div>
      </div>
    </div>,
    size
  );
}
