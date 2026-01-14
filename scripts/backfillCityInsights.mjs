/**
 * Batch job: fetch top N populated cities and backfill AI insights via OpenRouter.
 *
 * Env:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   OPENROUTER_API_KEY
 *   OPENROUTER_MODEL (optional, default: google/gemini-1.5-flash)
 *   CITY_LIMIT (optional, default: 1000)
 *   CONCURRENCY (optional, default: 3)
 *
 * Run:
 *   node --experimental-fetch scripts/backfillCityInsights.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL || "google/gemini-3-flash-preview";
const CITY_LIMIT = Number(process.env.CITY_LIMIT || 1000);
const CONCURRENCY = Number(process.env.CONCURRENCY || 3);
const TTL_DAYS = 365;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

if (!OPENROUTER_API_KEY) {
  console.error("Missing OPENROUTER_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function sanitizeJson(text) {
  return text.replace(/```json/gi, "").replace(/```/g, "").trim();
}

function isFresh(updatedAt) {
  if (!updatedAt) return false;
  const updated = new Date(updatedAt);
  const days = (Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24);
  return days < TTL_DAYS;
}

async function fetchTopCities(limit) {
  const { data, error } = await supabase
    .from("cities")
    .select("id, city, country, population, lat, lng")
    .order("population", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

async function fetchExistingInsights(ids) {
  const { data, error } = await supabase
    .from("city_ai_insights")
    .select("city_id, updated_at")
    .in("city_id", ids);
  if (error) throw error;
  const map = new Map();
  (data || []).forEach((row) => map.set(row.city_id, row.updated_at));
  return map;
}

async function callOpenRouter(city) {
  const prompt = `
    You are a concise travel curator. Summarize ${city.city}, ${city.country}.
    Return ONLY a JSON object with keys:
    {
      "intro": "≤500 characters, vivid but factual city intro",
      "attractions": [
        { "name": "spot name", "why": "1 short sentence" },
        { "name": "spot name", "why": "1 short sentence" },
        { "name": "spot name", "why": "1 short sentence" }
      ],
      "seasons": [
        { "name": "Spring", "months": "Mar-May", "summary": "concise guidance" },
        { "name": "Summer", "months": "Jun-Aug", "summary": "concise guidance" },
        { "name": "Autumn", "months": "Sep-Nov", "summary": "concise guidance" },
        { "name": "Winter", "months": "Dec-Feb", "summary": "concise guidance" }
      ],
      "weather": [
        { "season": "Spring", "tempC": "avg temp range in °C", "notes": "travel tip" },
        { "season": "Summer", "tempC": "avg temp range in °C", "notes": "travel tip" },
        { "season": "Autumn", "tempC": "avg temp range in °C", "notes": "travel tip" },
        { "season": "Winter", "tempC": "avg temp range in °C", "notes": "travel tip" }
      ]
    }
    Do not add prose, code fences, or Markdown—just JSON.
  `;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://bestcityspots.example", // optional
      "X-Title": "CityInsightsBatch", // optional
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${body}`);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content || "";
  const parsed = JSON.parse(sanitizeJson(content));

  return {
    intro: parsed.intro || "",
    attractions: Array.isArray(parsed.attractions) ? parsed.attractions.slice(0, 4) : [],
    seasons: Array.isArray(parsed.seasons) ? parsed.seasons.slice(0, 4) : [],
    weather: Array.isArray(parsed.weather) ? parsed.weather.slice(0, 4) : [],
  };
}

async function upsertInsight(city, insight) {
  const { error } = await supabase.from("city_ai_insights").upsert({
    city_id: city.id,
    city_name: city.city,
    country: city.country,
    intro: insight.intro,
    attractions: insight.attractions,
    seasons: insight.seasons,
    weather: insight.weather,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

async function worker(city, existingMap) {
  const updatedAt = existingMap.get(city.id);
  if (isFresh(updatedAt)) {
    console.info(`[skip] fresh ${city.city}`);
    return { status: "skip" };
  }

  try {
    const insight = await callOpenRouter(city);
    await upsertInsight(city, insight);
    console.info(`[done] ${city.city}`);
    return { status: "done" };
  } catch (err) {
    console.error(`[fail] ${city.city}:`, err.message);
    return { status: "fail", error: err };
  }
}

async function run() {
  console.info(`Fetching top ${CITY_LIMIT} cities...`);
  const cities = await fetchTopCities(CITY_LIMIT);
  const ids = cities.map((c) => c.id);
  const existing = await fetchExistingInsights(ids);

  let idx = 0;
  let inFlight = 0;
  const results = { done: 0, skip: 0, fail: 0 };

  return await new Promise((resolve) => {
    const next = () => {
      while (inFlight < CONCURRENCY && idx < cities.length) {
        const city = cities[idx++];
        inFlight++;
        worker(city, existing).then((r) => {
          results[r.status] += 1;
          inFlight--;
          next();
        });
      }
      if (inFlight === 0 && idx >= cities.length) {
        resolve(results);
      }
    };
    next();
  });
}

run()
  .then((r) => {
    console.info("Done", r);
    process.exit(0);
  })
  .catch((e) => {
    console.error("Batch failed:", e);
    process.exit(1);
  });
