import { getCityById } from "@/lib/cities";
import { 
  MapPin, Users, Navigation, ArrowLeft, Globe, Wind, Cloud, Thermometer,
  Sun, CloudSun, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

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

const weatherCodeMap: Record<number, { label: string; icon: any }> = {
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
  const weatherInfo = weather ? weatherCodeMap[weather.weather_code] || { label: "Unknown", icon: Cloud } : null;
  const WeatherIcon = weatherInfo?.icon || Cloud;

  const metrics = [
    { icon: Thermometer, label: "Current Temp", value: weather ? `${Math.round(weather.temperature_2m)}°C` : "N/A" },
    { icon: WeatherIcon, label: "Condition", value: weatherInfo?.label || "Unknown" },
    { icon: Wind, label: "Wind Speed", value: weather ? `${weather.wind_speed_10m} km/h` : "N/A" },
    { icon: Globe, label: "Coordinates", value: `${lat.toFixed(2)}°, ${lng.toFixed(2)}°` },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-slow-fade-in">
      {metrics.map((item, i) => (
        <div key={i} className="p-8 rounded-[2rem] bg-white/[0.01] border border-white/5 space-y-4 hover:bg-white/[0.04] transition-all duration-500">
          <item.icon className="w-5 h-5 text-blue-500/30" />
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-1">{item.label}</div>
            <div className="text-lg font-black text-white/80 tracking-tight">{item.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function WeatherSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="p-8 rounded-[2rem] bg-white/[0.01] border border-white/5 space-y-4 animate-pulse">
          <div className="w-5 h-5 bg-white/5 rounded-full" />
          <div className="space-y-2">
            <div className="w-12 h-2 bg-white/5 rounded" />
            <div className="w-20 h-4 bg-white/5 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function CityPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ id: string }>,
  searchParams: Promise<{ lat?: string; lng?: string }>
}) {
  const { id } = await params;
  const { lat, lng } = await searchParams;
  
  const city = await getCityById(parseInt(id));

  if (!city) {
    notFound();
  }

  const finalLat = lat ? parseFloat(lat) : city.lat;
  const finalLng = lng ? parseFloat(lng) : city.lng;

  return (
    <main className="min-h-screen bg-transparent text-white font-sans selection:bg-blue-500/30 selection:text-blue-200">
      <div className="max-w-5xl mx-auto px-6 py-20">
        <nav className="mb-20">
          <Link 
            href="/"
            className="inline-flex items-center gap-4 text-gray-500 hover:text-white transition-all group"
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/[0.03] border border-white/10 group-hover:bg-blue-500/20 group-hover:border-blue-500/40 transition-all duration-500 liquid-glass">
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </div>
            <span className="font-black uppercase tracking-[0.2em] text-xs">Return to Explorer</span>
          </Link>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          {/* Main Info Column */}
          <div className="lg:col-span-8 space-y-20">
            <header className="space-y-8 relative">
              <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-600/10 blur-[120px] -z-10 animate-pulse" />
              <div className="flex items-center gap-4 text-blue-400 font-black tracking-[0.4em] uppercase text-[10px]">
                <Navigation className="w-4 h-4" />
                {city.iso3} <span className="text-white/20">//</span> {city.capital || "Urban Center"}
              </div>
              <h1 className="text-8xl md:text-[10rem] font-black tracking-tighter leading-[0.8] bg-gradient-to-b from-white via-white to-white/20 bg-clip-text text-transparent">
                {city.city}
              </h1>
              <div className="flex items-center gap-6">
                <p className="text-4xl md:text-5xl text-white/40 font-black italic tracking-tight">
                  {city.country}
                </p>
                <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
              </div>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="p-10 rounded-[3rem] liquid-glass hover:bg-white/[0.05] transition-all duration-700 group/card shadow-2xl">
                <div className="flex items-center gap-4 text-gray-500 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover/card:bg-blue-500/20 transition-all">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Census Data</span>
                </div>
                <div className="text-5xl font-black text-white tracking-tighter mb-2">
                  {city.population?.toLocaleString() ?? 'N/A'}
                </div>
                <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">Global Residents</div>
              </div>

              <div className="p-10 rounded-[3rem] liquid-glass hover:bg-white/[0.05] transition-all duration-700 group/card shadow-2xl">
                <div className="flex items-center gap-4 text-gray-500 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover/card:bg-purple-500/20 transition-all">
                    <MapPin className="w-5 h-5 text-purple-400" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Territory</span>
                </div>
                <div className="text-3xl font-black text-white tracking-tight mb-2 leading-tight">
                  {city.admin_name || 'Autonomous'}
                </div>
                <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">Regional Hub</div>
              </div>
            </section>

            {/* Geographic Profile Section */}
            <section className="space-y-10">
              <h2 className="text-sm font-black uppercase tracking-[0.4em] text-white/20 flex items-center gap-4">
                Structural Profile <span className="h-px flex-1 bg-white/5" />
              </h2>
              <Suspense fallback={<WeatherSkeleton />}>
                <WeatherSection lat={finalLat} lng={finalLng} />
              </Suspense>
            </section>
          </div>

          {/* Sidebar / Quick Actions */}
          <div className="lg:col-span-4 space-y-8 sticky top-20">
            <div className="p-10 rounded-[3.5rem] bg-gradient-to-br from-blue-600 to-indigo-800 text-white shadow-3xl shadow-blue-500/20 space-y-8 relative overflow-hidden group/cta">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full translate-x-10 -translate-y-10 group-hover/cta:scale-150 transition-transform duration-1000" />
              <h3 className="text-3xl font-black leading-tight tracking-tighter">
                Explore The Urban <br /> Essence
              </h3>
              <p className="text-blue-100/70 font-bold text-sm leading-relaxed tracking-wide">
                Unlock exclusive insights and historical landmarks of {city.city} with our premium membership.
              </p>
              <button className="w-full py-6 bg-white text-blue-600 rounded-[2rem] font-black text-lg hover:bg-gray-100 transition-all active:scale-[0.98] shadow-xl">
                Get Access
              </button>
            </div>

            <div className="p-10 rounded-[3rem] liquid-glass space-y-8">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
                Core Metrics
              </h4>
              <div className="space-y-6">
                {[
                  { label: "Cost Index", value: "Premium" },
                  { label: "Connectivity", value: "Gigabit+" },
                  { label: "Safety Tier", value: "Alpha" },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center group/metric">
                    <span className="text-gray-400 font-black text-xs uppercase tracking-widest group-hover/metric:text-white transition-colors">{item.label}</span>
                    <span className="font-black text-white group-hover/metric:text-blue-400 transition-colors tracking-tight">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
