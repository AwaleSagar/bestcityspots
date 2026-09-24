/**
 * Decorative orthographic globe linework (meridians + parallels) for the
 * home hero. Pure SVG, no image request; hidden from assistive tech.
 */
const R = 300;
const MERIDIANS = [0.2, 0.42, 0.62, 0.8, 0.94];
const PARALLELS = [-0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75];

export function Graticule({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox={`${-R - 2} ${-R - 2} ${2 * R + 4} ${2 * R + 4}`}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      <circle r={R} vectorEffect="non-scaling-stroke" />
      <line x1="0" y1={-R} x2="0" y2={R} vectorEffect="non-scaling-stroke" />
      {MERIDIANS.map((ratio) => (
        <ellipse key={`m-${ratio}`} rx={R * ratio} ry={R} vectorEffect="non-scaling-stroke" />
      ))}
      {PARALLELS.map((ratio) => {
        const y = R * ratio;
        const half = Math.sqrt(R * R - y * y);
        return (
          <line
            key={`p-${ratio}`}
            x1={-half}
            y1={y}
            x2={half}
            y2={y}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </svg>
  );
}
