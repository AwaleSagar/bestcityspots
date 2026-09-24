import { permanentRedirect } from "next/navigation";

/** The "Passport" became "Saved" in the 2026 redesign; keep old links working. */
export default function PassportRedirect() {
  permanentRedirect("/saved");
}
