import { WeatherData } from "@/lib/weather";
import { Wind, Droplets, Gauge, Thermometer } from "lucide-react";

interface CityVitalsProps {
  data: WeatherData;
}

export default function CityVitals({ data }: CityVitalsProps) {
  const getAqiColor = (aqi: number) => {
    switch (aqi) {
      case 1: return "text-emerald-700 border-emerald-600/20 bg-emerald-500/8 dark:text-emerald-300";
      case 2: return "text-lime-700 border-lime-600/20 bg-lime-500/8 dark:text-lime-300";
      case 3: return "text-amber-700 border-amber-600/20 bg-amber-500/10 dark:text-amber-300";
      case 4: return "text-orange-700 border-orange-600/20 bg-orange-500/10 dark:text-orange-300";
      case 5: return "text-red-700 border-red-600/20 bg-red-500/10 dark:text-red-300";
      default: return "text-foreground/60 border-line bg-background/60";
    }
  };

  const getTempColor = (temp: number) => {
    if (temp <= 5) return "text-sky-600 dark:text-sky-400";
    if (temp <= 15) return "text-[color:var(--color-brand-secondary)] dark:text-[color:var(--color-brand-secondary)]";
    if (temp <= 28) return "text-foreground";
    return "text-orange-600 dark:text-orange-400";
  };

  const getTempIconColor = (temp: number) => {
    if (temp <= 5) return "text-sky-500 dark:text-sky-400";
    if (temp <= 15) return "text-[color:var(--color-brand-secondary)]";
    if (temp <= 28) return "text-[color:var(--color-brand-accent)]";
    return "text-orange-500 dark:text-orange-400";
  };

  return (
    <div className="atlas-panel rounded-[1.4rem] p-5 shadow-xl sm:rounded-[1.7rem] sm:p-6 md:rounded-[2rem]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
          Live City Vitals
        </h3>
        <span className="text-[8px] font-bold text-muted uppercase">
          Updated {new Date(data.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Temp Stats */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted">
            <Thermometer className={`h-3 w-3 ${getTempIconColor(data.temp)}`} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Temperature</span>
          </div>
          <div className={`text-3xl font-black tracking-tighter ${getTempColor(data.temp)}`}>
            {Math.round(data.temp)}°<span className="text-lg text-muted">C</span>
          </div>
          <p className="text-[10px] font-medium text-muted italic">
            Feels like {Math.round(data.feels_like)}°
          </p>
        </div>

        {/* Air Quality */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted">
            <Gauge className="h-3 w-3" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Air Quality</span>
          </div>
          <div className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${getAqiColor(data.aqi)}`}>
            {data.aqi_label}
          </div>
          <p className="text-[10px] font-medium text-muted opacity-75">
            Index: {data.aqi}/5
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-6 border-t border-line pt-4">
        <div className="flex items-center gap-2">
          <Droplets className="h-3 w-3 text-sky-500 dark:text-sky-400" />
          <div>
            <span className="block text-[8px] font-black text-muted uppercase">Humidity</span>
            <span className="text-xs font-bold">{data.humidity}%</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Wind className="h-3 w-3 text-teal-500 dark:text-teal-400" />
          <div>
            <span className="block text-[8px] font-black text-muted uppercase">Wind</span>
            <span className="text-xs font-bold">{Math.round(data.wind_speed)} <span className="text-[8px] opacity-60">km/h</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}
