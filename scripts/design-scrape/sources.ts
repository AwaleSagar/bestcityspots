/**
 * Curated list of 100+ travel competitor sites for design-system extraction.
 *
 * Each entry produces one branding + markdown scrape via Firecrawl.
 * Organized by segment so aggregation can group design patterns by category.
 *
 * Usage (consumed by run.ts):
 *   import { SOURCES } from "./sources";
 */

export type Segment =
  | "marketplace"
  | "city-guide"
  | "discovery"
  | "magazine"
  | "digital-nomad"
  | "rankings"
  | "experiences"
  | "luxury"
  | "transit";

export interface SourceEntry {
  slug: string;
  url: string;
  name: string;
  segment: Segment;
}

const raw: Array<[string, string, string, Segment]> = [
  // --- Marketplaces / Booking ---
  ["airbnb", "https://www.airbnb.com", "Airbnb", "marketplace"],
  ["booking", "https://www.booking.com", "Booking.com", "marketplace"],
  ["expedia", "https://www.expedia.com", "Expedia", "marketplace"],
  ["vrbo", "https://www.vrbo.com", "Vrbo", "marketplace"],
  ["hotels", "https://www.hotels.com", "Hotels.com", "marketplace"],
  ["trip", "https://www.trip.com", "Trip.com", "marketplace"],
  ["kayak", "https://www.kayak.com", "Kayak", "marketplace"],
  ["hopper", "https://www.hopper.com", "Hopper", "marketplace"],
  ["agoda", "https://www.agoda.com", "Agoda", "marketplace"],
  ["trivago", "https://www.trivago.com", "Trivago", "marketplace"],
  ["plumguide", "https://www.plumguide.com", "Plum Guide", "marketplace"],
  ["hostelworld", "https://www.hostelworld.com", "Hostelworld", "marketplace"],
  ["mr-smith", "https://www.mrandmrssmith.com", "Mr & Mrs Smith", "marketplace"],
  ["tablet-hotels", "https://www.tablethotels.com", "Tablet Hotels", "marketplace"],
  ["secret-escapes", "https://www.secretescapes.com", "Secret Escapes", "luxury"],
  ["voyage-prive", "https://www.voyageprive.com", "Voyage Prive", "luxury"],
  ["luxury-escapes", "https://www.luxuryescapes.com", "Luxury Escapes", "luxury"],

  // --- City Guides / Editorial ---
  ["lonely-planet", "https://www.lonelyplanet.com", "Lonely Planet", "city-guide"],
  ["culture-trip", "https://theculturetrip.com", "Culture Trip", "city-guide"],
  ["atlas-obscura", "https://www.atlasobscura.com", "Atlas Obscura", "city-guide"],
  ["time-out", "https://www.timeout.com", "Time Out", "city-guide"],
  ["fodors", "https://www.fodors.com", "Fodor's", "city-guide"],
  ["frommers", "https://www.frommers.com", "Frommer's", "city-guide"],
  ["rough-guides", "https://www.roughguides.com", "Rough Guides", "city-guide"],
  ["spotted-by-locals", "https://www.spottedbylocals.com", "Spotted by Locals", "city-guide"],
  ["like-a-local", "https://likealocalguide.com", "Like a Local Guide", "city-guide"],
  ["onthegrid", "https://onthegrid.city", "On the Grid", "city-guide"],
  ["jetsetter", "https://www.jetsetter.com", "Jetsetter", "city-guide"],
  ["fathom", "https://fathomaway.com", "Fathom", "city-guide"],
  ["travel-kate", "https://www.nerdwallet.com/blog/travel", "NerdWallet Travel", "city-guide"],

  // --- Discovery / Reviews / Itinerary ---
  ["tripadvisor", "https://www.tripadvisor.com", "TripAdvisor", "discovery"],
  ["wanderlog", "https://wanderlog.com", "Wanderlog", "discovery"],
  ["foursquare", "https://foursquare.com", "Foursquare", "discovery"],
  ["roadtrippers", "https://www.roadtrippers.com", "Roadtrippers", "discovery"],
  ["visitacity", "https://www.visitacity.com", "Visit a City", "discovery"],
  ["sygic-travel", "https://travel.sygic.com", "Sygic Travel", "discovery"],
  ["inspirock", "https://www.inspirock.com", "Inspirock", "discovery"],
  ["tripsavvy", "https://www.tripsavvy.com", "TripSavvy", "discovery"],
  ["stippl", "https://www.stippl.io", "Stippl", "discovery"],
  ["tripplanner-ai", "https://www.tripplanner.ai", "Trip Planner AI", "discovery"],
  ["tripit", "https://www.tripit.com", "TripIt", "discovery"],
  ["rome2rio", "https://www.rome2rio.com", "Rome2Rio", "transit"],
  ["citymapper", "https://citymapper.com", "Citymapper", "transit"],
  ["transit-app", "https://transit.app", "Transit", "transit"],

  // --- Magazines ---
  ["cntraveler", "https://www.cntraveler.com", "Condé Nast Traveler", "magazine"],
  ["travel-leisure", "https://www.travelandleisure.com", "Travel + Leisure", "magazine"],
  ["afar", "https://www.afar.com", "AFAR", "magazine"],
  ["natgeo-travel", "https://www.nationalgeographic.com/travel", "Nat Geo Travel", "magazine"],
  ["bbc-travel", "https://www.bbc.com/travel", "BBC Travel", "magazine"],
  ["travel-weekly", "https://www.travelweekly.com", "Travel Weekly", "magazine"],
  ["skift", "https://skift.com", "Skift", "magazine"],
  [
    "independent-traveler",
    "https://www.independenttraveler.com",
    "Independent Traveler",
    "magazine",
  ],
  ["monocle-travel", "https://monocle.com/travel", "Monocle Travel", "magazine"],
  ["condor-travel", "https://www.theguardian.com/travel", "Guardian Travel", "magazine"],

  // --- Digital Nomad / Remote ---
  ["nomad-list", "https://nomadlist.com", "Nomad List", "digital-nomad"],
  ["outsite", "https://www.outsite.co", "Outsite", "digital-nomad"],
  ["selina", "https://www.selina.com", "Selina", "digital-nomad"],
  ["wanders", "https://www.workfrom.co", "Workfrom", "digital-nomad"],
  ["sun-and-co", "https://www.sunandco.com", "Sun and Co", "digital-nomad"],
  ["expatistan", "https://www.expatistan.com", "Expatistan", "digital-nomad"],
  ["teleport", "https://www.nestpick.com", "Nestpick", "digital-nomad"],

  // --- Best-of / Rankings ---
  ["usnews-travel", "https://travel.usnews.com", "US News Travel", "rankings"],
  ["best-cities", "https://www.bestcities.org", "Best Cities", "rankings"],
  ["resonance", "https://resonanceco.com", "Resonance Consultancy", "rankings"],

  // --- Experiences / Tours ---
  ["getyourguide", "https://www.getyourguide.com", "GetYourGuide", "experiences"],
  ["viator", "https://www.viator.com", "Viator", "experiences"],
  ["klook", "https://www.klook.com", "Klook", "experiences"],
  ["musement", "https://www.musement.com", "Musement", "experiences"],
  ["withlocals", "https://www.withlocals.com", "Withlocals", "experiences"],
  ["tours-by-locals", "https://toursbylocals.com", "Tours by Locals", "experiences"],
  ["context-travel", "https://www.contexttravel.com", "Context Travel", "experiences"],
  ["eating-europe", "https://www.eatingeurope.com", "Eating Europe", "experiences"],
  ["airbnb-experiences", "https://www.airbnb.com/experiences", "Airbnb Experiences", "experiences"],
  ["devour-tours", "https://www.devourtours.com", "Devour Tours", "experiences"],

  // --- Luxury / Boutique ---
  ["belmond", "https://www.belmond.com", "Belmond", "luxury"],
  ["andbeyond", "https://www.andbeyond.com", "andBeyond", "luxury"],
  ["africa-alive", "https://www.singita.com", "Singita", "luxury"],
  ["soneva", "https://soneva.com", "Soneva", "luxury"],
  ["aman", "https://www.aman.com", "Aman", "luxury"],
  ["rosewood", "https://www.rosewoodhotels.com", "Rosewood", "luxury"],

  // --- Transit / Maps / Airlines ---
  ["google-travel", "https://www.google.com/travel", "Google Travel", "transit"],
  ["skyscanner", "https://www.skyscanner.com", "Skyscanner", "transit"],
  ["google-flights", "https://www.google.com/travel/flights", "Google Flights", "transit"],
  ["hsixt", "https://www.sixt.com", "Sixt", "transit"],
  ["turo", "https://turo.com", "Turo", "transit"],

  // --- Long-tail / niche travel brands (top-up to 100+) ---
  [
    "fodor-travel",
    "https://www.tripsavvy.com/best-destinations",
    "TripSavvy Destinations",
    "rankings",
  ],
  ["housing-anywhere", "https://housinganywhere.com", "Housing Anywhere", "marketplace"],
  ["welcomenative", "https://www.welcomenative.com", "Native", "digital-nomad"],
  ["sabbatical-homes", "https://sabbaticalhomes.com", "Sabbatical Homes", "marketplace"],
  ["wimdu", "https://www.9flats.com", "9flats", "marketplace"],
  ["oars", "https://www.oars.com", "OARS", "experiences"],
  ["intrepid", "https://www.intrepidtravel.com", "Intrepid Travel", "experiences"],
  ["gadventures", "https://www.gadventures.com", "G Adventures", "experiences"],
  ["headout", "https://www.headout.com", "Headout", "experiences"],
  ["tiqets", "https://www.tiqets.com", "Tiqets", "experiences"],
  ["helo", "https://www.hellotickets.com", "HelloTickets", "experiences"],
  ["city-discovery", "https://www.city-discovery.com", "City Discovery", "experiences"],
  ["local-guides", "https://www.takewalks.com", "Take Walks", "experiences"],
  [
    "devour-barcelona",
    "https://www.devourbarcelonafoodtours.com",
    "Devour Barcelona",
    "experiences",
  ],
  ["secret-food", "https://secretfoodtours.com", "Secret Food Tours", "experiences"],
  ["coyote-trail", "https://www.macsadventures.com", "Mac's Adventures", "experiences"],
];

function makeSlugUnique(entries: typeof raw): typeof raw {
  const seen = new Set<string>();
  return entries.map(([slug, url, name, seg]) => {
    let s = slug;
    let n = 2;
    while (seen.has(s)) {
      s = `${slug}-${n++}`;
    }
    seen.add(s);
    return [s, url, name, seg] as [string, string, string, Segment];
  });
}

export const SOURCES: SourceEntry[] = makeSlugUnique(raw).map(([slug, url, name, segment]) => ({
  slug,
  url,
  name,
  segment,
}));

export const SOURCES_BY_SEGMENT: Record<Segment, SourceEntry[]> = SOURCES.reduce(
  (acc, s) => {
    (acc[s.segment] ??= []).push(s);
    return acc;
  },
  {} as Record<Segment, SourceEntry[]>
);

export const SEGMENTS: Segment[] = [
  "marketplace",
  "city-guide",
  "discovery",
  "magazine",
  "digital-nomad",
  "rankings",
  "experiences",
  "luxury",
  "transit",
];

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`Total sources: ${SOURCES.length}`);
  for (const seg of SEGMENTS) {
    console.log(`  ${seg}: ${SOURCES_BY_SEGMENT[seg]?.length ?? 0}`);
  }
}
