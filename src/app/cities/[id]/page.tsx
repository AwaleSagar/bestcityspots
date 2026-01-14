import { getCityById } from "@/lib/cities";
import { formatPopulation } from "@/lib/format";
import { getTopPlaces } from "@/lib/places";
import { getCityMetrics } from "@/lib/metrics";
import { getCityInsight } from "@/lib/intelligence";
import ExperiencesSection from "./ExperiencesSection";
import {
  MapPin,
  Users,
  Navigation,
  ArrowLeft,
  Globe,
  Wind,
  Cloud,
  Thermometer,
  Sun,
  CloudSun,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Sparkles,
  CalendarRange,
  Activity,
  Cloud as CloudIcon,
  ThermometerSun,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import React, { Suspense } from "react";

async function getWeatherData(lat: number, lng: number) {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.current;
  } catch (e) {
    console.error("Weather fetch failed:", e);
    return null;
  }
}

const weatherCodeMap: Record<
  number,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  0: { label: "Clear Sky", icon: Sun },
  1: { label: "Mainly Clear", icon: CloudSun },
  2: { label: "Partly Cloudy", icon: CloudSun },
  3: { label: "Overcast", icon: Cloud },
  45: { label: "Foggy", icon: CloudFog },
  48: { label: "Depositing Fog", icon: CloudFog },
  51: { label: "Light Drizzle", icon: CloudDrizzle },
  53: { label: "Moderate Drizzle", icon: CloudDrizzle },
  55: { label: "Dense Drizzle", icon: CloudDrizzle },
  61: { label: "Slight Rain", icon: CloudRain },
  63: { label: "Moderate Rain", icon: CloudRain },
  65: { label: "Heavy Rain", icon: CloudRain },
  71: { label: "Slight Snow", icon: CloudSnow },
  73: { icon: CloudSnow, label: "Moderate Snow" },
  75: { label: "Heavy Snow", icon: CloudSnow },
  80: { label: "Slight Showers", icon: CloudRain },
  81: { label: "Moderate Showers", icon: CloudRain },
  82: { label: "Violent Showers", icon: CloudRain },
  95: { label: "Thunderstorm", icon: CloudLightning },
};

async function WeatherSection({ lat, lng }: { lat: number; lng: number }) {
  const weather = await getWeatherData(lat, lng);
  const weatherInfo = weather
    ? weatherCodeMap[weather.weather_code] || { label: "Unknown", icon: Cloud }
    : null;
  const WeatherIcon = weatherInfo?.icon || Cloud;

  const metrics = [
    {
      icon: Thermometer,
      label: "Current Temp",
      value: weather ? `${Math.round(weather.temperature_2m)}°C` : "N/A",
    },
    { icon: WeatherIcon, label: "Condition", value: weatherInfo?.label || "Unknown" },
    { icon: Wind, label: "Wind Speed", value: weather ? `${weather.wind_speed_10m} km/h` : "N/A" },
    { icon: Globe, label: "Coordinates", value: `${lat.toFixed(2)}°, ${lng.toFixed(2)}°` },
  ];

  return (
    <div className="animate-slow-fade-in grid grid-cols-2 gap-4 md:grid-cols-4">
      {metrics.map((item, i) => (
        <div
          key={i}
          className="space-y-4 rounded-[2rem] border border-white/5 bg-white/[0.01] p-8 transition-all duration-500 hover:bg-white/[0.04]"
        >
          <item.icon className="h-5 w-5 text-blue-500/30" />
          <div>
            <div className="mb-1 text-[9px] font-black tracking-widest text-gray-600 uppercase">
              {item.label}
            </div>
            <div className="text-lg font-black tracking-tight text-white/80">{item.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricRow({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
}) {
  const display =
    value === null || value === undefined || value === "" ? (
      <span className="text-white/30">N/A</span>
    ) : (
      <span className="font-black tracking-tight text-white">
        {typeof value === "number" ? value.toLocaleString() : value} {unit}
      </span>
    );

  return (
    <div className="group/metric flex items-center justify-between">
      <span className="text-xs font-black tracking-widest text-white/40 uppercase transition-colors group-hover/metric:text-white">
        {label}
      </span>
      {display}
    </div>
  );
}

function MetricCard({
  label,
  value,
  unit,
  icon: Icon,
  source,
}: {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  icon: React.ComponentType<{ className?: string }>;
  source?: string;
}) {
  const isEmpty = value === null || value === undefined || value === "";
  const display = isEmpty ? (
    <span className="text-white/30">N/A</span>
  ) : (
    <span className="text-2xl font-black tracking-tight text-white">
      {typeof value === "number" ? value.toLocaleString() : value} {unit}
    </span>
  );

  return (
    <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
          <Icon className="h-5 w-5 text-blue-300" />
        </div>
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">{label}</div>
          {display}
        </div>
      </div>
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 text-right">
        {isEmpty ? "Pending" : source || "Live"}
      </div>
    </div>
  );
}

async function ExperiencesWrapper({
  cityName,
  lat,
  lng,
}: {
  cityName: string;
  lat: number;
  lng: number;
}) {
  const [landmarks, restaurants, hotels] = await Promise.all([
    getTopPlaces(cityName, "landmarks", { lat, lng }),
    getTopPlaces(cityName, "restaurants", { lat, lng }),
    getTopPlaces(cityName, "hotels", { lat, lng }),
  ]);

  return (
    <div className="space-y-8">
      <h2 className="flex items-center gap-4 text-sm font-black tracking-[0.4em] text-white/40 uppercase">
        Top Experiences <span className="h-px flex-1 bg-white/5" />
      </h2>
      <ExperiencesSection
        cityName={cityName}
        landmarks={landmarks}
        restaurants={restaurants}
        hotels={hotels}
      />
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="space-y-8">
      <div className="h-4 w-48 bg-white/5 rounded animate-pulse" />
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 w-24 bg-white/5 rounded-2xl animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse h-24 rounded-[2.5rem] border border-white/5 bg-white/[0.01]"
          />
        ))}
      </div>
    </div>
  );
}

function WeatherSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="animate-pulse space-y-4 rounded-[2rem] border border-white/5 bg-white/[0.01] p-8"
        >
          <div className="h-5 w-5 rounded-full bg-white/5" />
          <div className="space-y-2">
            <div className="h-2 w-12 rounded bg-white/5" />
            <div className="h-4 w-20 rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function CityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lat?: string; lng?: string }>;
}) {
  const { id } = await params;
  const { lat, lng } = await searchParams;

  const city = await getCityById(parseInt(id));

  if (!city) {
    notFound();
  }

  const finalLat = lat ? parseFloat(lat) : city.lat;
  const finalLng = lng ? parseFloat(lng) : city.lng;
  const aiInsight = await getCityInsight(city);
  const metrics = await getCityMetrics(city);

  return (
    <main className="min-h-screen bg-transparent font-sans text-white selection:bg-blue-500/30 selection:text-blue-200">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <nav className="mb-12">
          <Link
            href="/"
            className="group inline-flex items-center gap-4 text-gray-500 transition-all hover:text-white"
          >
            <div className="liquid-glass flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] transition-all duration-500 group-hover:border-blue-500/40 group-hover:bg-blue-500/20">
              <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
            </div>
            <span className="text-xs font-black tracking-[0.2em] uppercase">
              Return to Explorer
            </span>
          </Link>
        </nav>

        <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-12">
          {/* Main Info Column */}
          <div className="space-y-12 lg:col-span-8">
            <header className="relative space-y-6 py-6 overflow-visible">
              <div className="absolute -top-20 -left-20 -z-10 h-64 w-64 animate-pulse bg-blue-600/10 blur-[120px]" />
              <div className="flex items-center gap-4 text-[10px] font-black tracking-[0.4em] text-blue-400 uppercase">
                <Navigation className="h-4 w-4" />
                {city.iso3} <span className="text-white/20">/&#47;</span>{" "}
                {city.capital || "Urban Center"}
              </div>
              <h1 className="bg-gradient-to-b from-white via-white to-white/20 bg-clip-text text-6xl leading-[1.1] font-black tracking-tighter text-transparent md:text-8xl break-words block pb-4">
                {city.city}
              </h1>
              <div className="flex items-center gap-6">
                <p className="text-4xl font-black tracking-tight text-white/40 italic md:text-5xl">
                  {city.country}
                </p>
                <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
              </div>
            </header>

            {aiInsight && (
              <section className="space-y-6 rounded-[3rem] border border-white/5 bg-white/[0.02] p-10 shadow-2xl">
                <div className="flex items-center gap-3 text-xs font-black tracking-[0.3em] text-blue-300 uppercase">
                  <Sparkles className="h-4 w-4 text-blue-300" />
                  AI City Briefing
                </div>
                <p className="text-lg leading-relaxed text-white/80">{aiInsight.intro}</p>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-white/50">
                      Major attractions
                    </div>
                    <div className="space-y-3">
                      {aiInsight.attractions.map((a, idx) => (
                        <div
                          key={idx}
                          className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-sm text-white/80"
                        >
                          <div className="text-white font-black">{a.name}</div>
                          <div className="text-white/60">{a.why}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-white/50">
                      <CalendarRange className="h-4 w-4 text-blue-300" />
                      Seasons
                    </div>
                    <div className="space-y-3">
                      {aiInsight.seasons.map((s, idx) => (
                        <div
                          key={idx}
                          className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-sm text-white/80"
                        >
                          <div className="flex items-center justify-between text-white">
                            <span className="font-black">{s.name}</span>
                            <span className="text-[11px] uppercase tracking-[0.2em] text-white/50">
                              {s.months}
                            </span>
                          </div>
                          <div className="text-white/60">{s.summary}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-white/50">
                      Year-round weather
                    </div>
                    <div className="space-y-3">
                      {aiInsight.weather.map((w, idx) => (
                        <div
                          key={idx}
                          className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-sm text-white/80"
                        >
                          <div className="flex items-center justify-between text-white">
                            <span className="font-black">{w.season}</span>
                            <span className="text-[11px] uppercase tracking-[0.2em] text-blue-300">
                              {w.tempC}
                            </span>
                          </div>
                          <div className="text-white/60">{w.notes}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            <section className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              <div className="liquid-glass group/card rounded-[3rem] p-10 shadow-2xl transition-all duration-700 hover:bg-white/[0.05]">
                <div className="mb-6 flex items-center gap-4 text-gray-400">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 transition-all group-hover/card:bg-blue-500/20">
                    <Users className="h-5 w-5 text-blue-400" />
                  </div>
                  <span className="text-[11px] font-black tracking-[0.2em] uppercase">
                    Census Data
                  </span>
                </div>
                <div className="mb-2 text-5xl font-black tracking-tighter text-white">
                  {formatPopulation(city.population)}
                </div>
                <div className="text-xs font-bold tracking-widest text-white/40 uppercase">
                  Global Residents
                </div>
              </div>

              <div className="liquid-glass group/card rounded-[3rem] p-10 shadow-2xl transition-all duration-700 hover:bg-white/[0.05]">
                <div className="mb-6 flex items-center gap-4 text-gray-400">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 transition-all group-hover/card:bg-purple-500/20">
                    <MapPin className="h-5 w-5 text-purple-400" />
                  </div>
                  <span className="text-[11px] font-black tracking-[0.2em] uppercase">
                    Territory
                  </span>
                </div>
                <div className="mb-2 text-3xl leading-tight font-black tracking-tight text-white">
                  {city.admin_name || "Autonomous"}
                </div>
                <div className="text-xs font-bold tracking-widest text-white/40 uppercase">
                  Regional Hub
                </div>
              </div>
            </section>

            {/* Geographic Profile Section */}
            <section className="space-y-10">
              <h2 className="flex items-center gap-4 text-sm font-black tracking-[0.4em] text-white/40 uppercase">
                Structural Profile <span className="h-px flex-1 bg-white/5" />
              </h2>
              <Suspense fallback={<WeatherSkeleton />}>
                <WeatherSection lat={finalLat} lng={finalLng} />
              </Suspense>
            </section>

            {/* Landmarks Section */}
            <Suspense fallback={<SectionSkeleton />}>
              <ExperiencesWrapper cityName={city.city} lat={finalLat} lng={finalLng} />
            </Suspense>
          </div>

          {/* Sidebar / Quick Actions */}
          <div className="sticky top-20 space-y-8 lg:col-span-4">
            <div className="shadow-3xl group/cta relative space-y-8 overflow-hidden rounded-[3.5rem] bg-gradient-to-br from-blue-600 to-indigo-800 p-10 text-white shadow-blue-500/20">
              <div className="absolute top-0 right-0 h-32 w-32 translate-x-10 -translate-y-10 rounded-full bg-white/10 blur-3xl transition-transform duration-1000 group-hover/cta:scale-150" />
              <h3 className="text-3xl leading-tight font-black tracking-tighter">
                Explore The Urban <br /> Essence
              </h3>
              <p className="text-sm leading-relaxed font-bold tracking-wide text-blue-100/70">
                Unlock exclusive insights and historical landmarks of {city.city} with our premium
                membership.
              </p>
              <button className="w-full rounded-[2rem] bg-white py-6 text-lg font-black text-blue-600 shadow-xl transition-all hover:bg-gray-100 active:scale-[0.98]">
                Get Access
              </button>
            </div>

            <div className="liquid-glass space-y-8 rounded-[3rem] p-10">
              <h4 className="text-[11px] font-black tracking-[0.3em] text-white/40 uppercase">
                Core Metrics
              </h4>
              <div className="grid grid-cols-1 gap-4">
                <MetricCard
                  icon={CloudIcon}
                  label="Pollution (PM2.5)"
                  value={metrics?.pollution_pm25}
                  unit="µg/m³"
                  source={metrics?.source?.pollution as string | undefined}
                />
                <MetricCard
                  icon={ThermometerSun}
                  label="Climate Comfort"
                  value={metrics?.climate_comfort}
                  source={metrics?.source?.climate as string | undefined}
                />
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                <Activity className="h-4 w-4" />
                {metrics?.updated_at ? `Updated ${new Date(metrics.updated_at).toLocaleDateString()}` : "Pending data"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
