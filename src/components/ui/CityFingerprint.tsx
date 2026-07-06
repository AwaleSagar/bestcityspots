import { getCityFingerprint, type FingerprintSeed } from "@/lib/fingerprint";

interface CityFingerprintProps {
  city: FingerprintSeed;
  className?: string;
}

/**
 * City Fingerprint: the city's deterministic contour glyph (see
 * src/lib/fingerprint.ts). Decorative — always pair with the city's visible
 * name; hidden from assistive tech. Pure render, safe in server components.
 */
export default function CityFingerprint({ city, className }: CityFingerprintProps) {
  const fingerprint = getCityFingerprint(city);

  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      focusable="false"
      fill="none"
    >
      {fingerprint.rings.map((ring, index) => (
        <path
          key={index}
          d={ring.d}
          stroke={ring.color}
          strokeWidth={ring.strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
      <circle cx={32} cy={32} r={2.25} fill={fingerprint.coreColor} />
    </svg>
  );
}
