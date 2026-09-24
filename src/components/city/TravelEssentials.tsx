import type { City } from "@/lib/cities";

/** Four practical planning notes, phrased from the city's own profile. */
export function TravelEssentials({ city }: { city: City }) {
  const notes = [
    {
      title: "Neighborhoods",
      body: city.admin_name
        ? `Start from ${city.admin_name} as the wider region, then let the places below point you to the smaller pockets worth your time.`
        : `Start with the landmarks below, then use your saved notes to build a personal read of ${city.city}.`,
    },
    {
      title: "Budget",
      body:
        city.capital === "primary"
          ? `As a national capital, ${city.city} prices higher around official quarters — use the price filter on Food and Stays to keep your shortlist realistic.`
          : city.population >= 5_000_000
            ? `Prices vary sharply between districts in a metro this size. The Food and Stays price filters keep your shortlist grounded.`
            : `Use the Food and Stays price filters to weigh landmark proximity against value in ${city.city}.`,
    },
    {
      title: "On the ground",
      body: `Open any place in Google Maps for directions, or group your saves into days and open each day as a walking route.`,
    },
    {
      title: "Sources",
      body: "Places come from Google, conditions from OpenWeather and Open-Meteo, and the overview is AI-written — each is labelled where it appears.",
    },
  ];
  return (
    <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
      {notes.map((note) => (
        <li key={note.title} className="border-rule border-t pt-4">
          <h3 className="font-medium">{note.title}</h3>
          <p className="text-ink-muted mt-1.5 text-sm">{note.body}</p>
        </li>
      ))}
    </ul>
  );
}
