# ADR-002: Affiliate Booking Links

Status: Accepted · Date: 2026-06-12 · Story: US-13 (audit AF-7)

## Context

Every user journey currently ends in an outbound Google Maps link. A booking
path closes the loop for users and creates the site's first sustainable
revenue. Constraints: zero impact on the performance budget, full
transparency (site pillar), and no tracking beyond an aggregate click count.

## Decision

**Booking.com Partner Programme, deep-search links, v1.**

- Chosen over Expedia (EPS Rapid requires API integration; Booking's
  `searchresults.html?ss=<query>&aid=<id>` deep link is a plain anchor) and
  over widgets/iframes (rejected outright — third-party JS on the
  performance-budgeted city pages).
- Rendering is gated on `NEXT_PUBLIC_BOOKING_AFFILIATE_ID`; until the team
  registers and sets the id in `.env.production`, no affiliate UI exists.
- Links appear on **stays cards only**, labeled "Partner", with
  `rel="sponsored nofollow noopener noreferrer"` (Google's paid-link
  guidance) and a title explaining the commission.
- Analytics: single aggregate `click_affiliate` action — no URL, no place,
  no user data in the event.
- Disclosure lives on /methodology (Transparency section).

## Consequences

- Zero bundle/CWV impact (plain anchors).
- Revenue reporting happens in the Booking partner dashboard, not in-app.
- If the programme's link format changes, the single construction site in
  `ExperiencesSection.tsx` is the only code to touch.
- Upgrade path: Expedia/EPS or direct hotel APIs if volume ever justifies
  server-side rate integration.
