import { WeatherData } from "@/lib/weather";
import { Wind, Droplets, Gauge, Thermometer } from "lucide-react";

interface CityVitalsProps {
  data: WeatherData;
}

function getAqiColor(aqi: number) {
  switch (aqi) {
    case 1:
      return "text-emerald-700 border-emerald-600/20 bg-emerald-500/10 dark:text-emerald-300";
    case 2:
      return "text-lime-700 border-lime-600/20 bg-lime-500/10 dark:text-lime-300";
    case 3:
      return "text-amber-700 border-amber-600/20 bg-amber-500/10 dark:text-amber-300";
    case 4:
      return "text-orange-700 border-orange-600/20 bg-orange-500/10 dark:text-orange-300";
    case 5:
      return "text-red-700 border-red-600/20 bg-red-500/10 dark:text-red-300";
    default:
      return "text-foreground/60 border-line bg-background/60";
  }
}

function getTempColor(temp: number) {
  if (temp <= 5) return "text-sky-600 dark:text-sky-400";
  if (temp <= 15)
    return "text-[color:var(--color-brand-secondary)] dark:text-[color:var(--color-brand-secondary)]";
  if (temp <= 28) return "text-foreground";
  return "text-orange-600 dark:text-orange-400";
}

function getTempIconColor(temp: number) {
  if (temp <= 5) return "text-sky-500 dark:text-sky-400";
  if (temp <= 15) return "text-[color:var(--color-brand-secondary)]";
  if (temp <= 28) return "text-[color:var(--color-brand-accent)]";
  return "text-orange-500 dark:text-orange-400";
}

export default function CityVitals({ data }: CityVitalsProps) {
  return (
    <div className="atlas-panel rounded-[1.4rem] p-5 shadow-xl sm:rounded-[1.7rem] sm:p-6 md:rounded-[2rem]">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-muted text-[10px] font-black tracking-[0.2em] uppercase">
          Live City Vitals
        </h3>
        <span className="text-muted text-xs font-bold uppercase">
          Updated{" "}
          {new Date(data.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Temp Stats */}
        <div className="space-y-1">
          <div className="text-muted flex items-center gap-2">
            <Thermometer className={`h-3 w-3 ${getTempIconColor(data.temp)}`} />
            <span className="text-[11px] font-bold tracking-wider uppercase">Temperature</span>
          </div>
          <div className={`text-3xl font-black tracking-tighter ${getTempColor(data.temp)}`}>
            {Math.round(data.temp)}°<span className="text-muted text-lg">C</span>
          </div>
          <p className="text-muted text-[10px] font-medium italic">
            Feels like {Math.round(data.feels_like)}°
          </p>
        </div>

        {/* Air Quality */}
        <div className="space-y-1">
          <div className="text-muted flex items-center gap-2">
            <Gauge className="h-3 w-3" />
            <span className="text-[11px] font-bold tracking-wider uppercase">Air Quality</span>
          </div>
          <div
            className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black tracking-widest uppercase ${getAqiColor(data.aqi)}`}
          >
            {data.aqi_label}
          </div>
          <p className="text-muted text-[10px] font-medium opacity-75">Index: {data.aqi}/5</p>
        </div>
      </div>

      <div className="border-line mt-6 flex gap-6 border-t pt-4">
        <div className="flex items-center gap-2">
          <Droplets className="h-3 w-3 text-sky-500 dark:text-sky-400" />
          <div>
            <span className="text-muted block text-[11px] font-black uppercase">Humidity</span>
            <span className="text-xs font-bold">{data.humidity}%</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Wind className="h-3 w-3 text-teal-500 dark:text-teal-400" />
          <div>
            <span className="text-muted block text-[11px] font-black uppercase">Wind</span>
            <span className="text-xs font-bold">
              {Math.round(data.wind_speed)} <span className="text-[10px] opacity-60">km/h</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
