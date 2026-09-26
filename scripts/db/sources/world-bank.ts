/**
 * World Bank World Development Indicators (https://data.worldbank.org, CC BY 4.0).
 * Keyless public API. All values are COUNTRY-LEVEL and labelled as such.
 *
 *   PA.NUS.PPP      PPP conversion factor, GDP (LCU per international $)
 *   PA.NUS.FCRF     Official exchange rate (LCU per US$, period average)
 *   VC.IHR.PSRC.P5  Intentional homicides per 100,000 people (source: UNODC)
 *   SH.MED.PHYS.ZS  Physicians per 1,000 people (source: WHO)
 *
 * Price level index = PPP ÷ exchange rate × 100 for the same year, i.e. the
 * World Bank "price level ratio" rebased so that the United States = 100.
 * (The ratio's own series, PA.NUS.PPPC.RF, is not served by the v2 API.)
 */

import { z } from "zod";

const API = "https://api.worldbank.org/v2";
const FIRST_YEAR = 2015;

export const WORLD_BANK_ATTRIBUTION =
  "World Bank, World Development Indicators (https://data.worldbank.org), licensed CC BY 4.0";

export interface IndicatorRow {
  iso2: string;
  price_level_index: number | null;
  price_level_year: number | null;
  homicide_rate_per_100k: number | null;
  homicide_year: number | null;
  physicians_per_1000: number | null;
  physicians_year: number | null;
  source: Record<string, string>;
}

const observation = z.object({
  countryiso3code: z.string(),
  date: z.string().regex(/^\d{4}$/),
  value: z.number().nullable(),
});

const responseSchema = z.tuple([
  z.object({ page: z.number(), pages: z.number(), lastupdated: z.string().optional() }),
  z.array(observation).nullable(),
]);

type Series = Map<string, Map<number, number>>; // iso3 → year → value

async function fetchSeries(
  indicator: string
): Promise<{ series: Series; lastUpdated: string | null }> {
  const lastYear = new Date().getUTCFullYear();
  const url = `${API}/country/all/indicator/${indicator}?format=json&per_page=20000&date=${FIRST_YEAR}:${lastYear}`;
  const response = await fetch(url, {
    headers: { "user-agent": "bestcityspots-seed/1.0 (+https://bestcityspots.co)" },
  });
  if (!response.ok) throw new Error(`World Bank ${indicator}: HTTP ${response.status}`);

  const parsed = responseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error(`World Bank ${indicator}: unexpected response shape (${parsed.error.message})`);
  }
  const [meta, rows] = parsed.data;
  if (meta.pages > 1) throw new Error(`World Bank ${indicator}: response unexpectedly paginated`);

  const series: Series = new Map();
  for (const row of rows ?? []) {
    if (
      row.value === null ||
      !Number.isFinite(row.value) ||
      !/^[A-Z]{3}$/.test(row.countryiso3code)
    ) {
      continue;
    }
    const byYear = series.get(row.countryiso3code) ?? new Map<number, number>();
    byYear.set(Number(row.date), row.value);
    series.set(row.countryiso3code, byYear);
  }
  return { series, lastUpdated: meta.lastupdated ?? null };
}

function latest(byYear: Map<number, number> | undefined): { year: number; value: number } | null {
  if (!byYear || byYear.size === 0) return null;
  const year = Math.max(...byYear.keys());
  return { year, value: byYear.get(year)! };
}

function round(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

/**
 * Fetches all four series and returns one row per known country (regional
 * aggregates such as "WLD" are dropped because they aren't in `iso3ToIso2`).
 */
export async function loadWorldBankIndicators(
  iso3ToIso2: Map<string, string>,
  log: (message: string) => void = () => {}
): Promise<{ rows: IndicatorRow[]; lastUpdated: string | null }> {
  log("fetching World Bank WDI series");
  const [ppp, fx, homicide, physicians] = await Promise.all([
    fetchSeries("PA.NUS.PPP"),
    fetchSeries("PA.NUS.FCRF"),
    fetchSeries("VC.IHR.PSRC.P5"),
    fetchSeries("SH.MED.PHYS.ZS"),
  ]);

  const rows: IndicatorRow[] = [];
  for (const [iso3, iso2] of iso3ToIso2) {
    const source: Record<string, string> = {};

    // Price level: latest year where both PPP and the exchange rate exist.
    let priceLevel: { year: number; value: number } | null = null;
    const pppYears = ppp.series.get(iso3);
    const fxYears = fx.series.get(iso3);
    if (pppYears && fxYears) {
      const years = [...pppYears.keys()].filter((y) => fxYears.has(y) && fxYears.get(y)! > 0);
      if (years.length > 0) {
        const year = Math.max(...years);
        const value = (pppYears.get(year)! / fxYears.get(year)!) * 100;
        // Guard against unit breaks (redenominations) producing nonsense.
        if (value >= 5 && value <= 500) priceLevel = { year, value: round(value, 2) };
      }
    }
    if (priceLevel) {
      source.cost = `World Bank WDI · ${priceLevel.year} price level (PPP ÷ exchange rate), country-level, US = 100`;
    }

    const homicideLatest = latest(homicide.series.get(iso3));
    if (homicideLatest) {
      source.safety = `World Bank WDI (UNODC) · ${homicideLatest.year} intentional homicides per 100k, country-level`;
    }

    const physiciansLatest = latest(physicians.series.get(iso3));
    if (physiciansLatest) {
      source.health = `World Bank WDI (WHO) · ${physiciansLatest.year} physicians, country-level`;
    }

    if (!priceLevel && !homicideLatest && !physiciansLatest) continue;

    rows.push({
      iso2,
      price_level_index: priceLevel?.value ?? null,
      price_level_year: priceLevel?.year ?? null,
      homicide_rate_per_100k: homicideLatest ? round(homicideLatest.value, 3) : null,
      homicide_year: homicideLatest?.year ?? null,
      physicians_per_1000: physiciansLatest ? round(physiciansLatest.value, 3) : null,
      physicians_year: physiciansLatest?.year ?? null,
      source,
    });
  }

  rows.sort((a, b) => a.iso2.localeCompare(b.iso2));
  return { rows, lastUpdated: ppp.lastUpdated };
}
