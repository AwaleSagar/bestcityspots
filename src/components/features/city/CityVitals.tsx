import { WeatherData } from "@/lib/weather";
import { Wind, Droplets, Gauge, Thermometer } from "lucide-react";

interface CityVitalsProps {
  data: WeatherData;
}

export default function CityVitals({ data }: CityVitalsProps) {
  const getAqiColor = (aqi: number) => {
    switch (aqi) {
      case 1: return "text-emerald-400 border-emerald-500/20 bg-emerald-500/5";
      case 2: return "text-green-400 border-green-500/20 bg-green-500/5";
      case 3: return "text-amber-400 border-amber-500/20 bg-amber-500/5";
      case 4: return "text-orange-400 border-orange-500/20 bg-orange-500/5";
      case 5: return "text-red-400 border-red-500/20 bg-red-500/5";
      default: return "text-foreground/40 border-foreground/10 bg-foreground/5";
    }
  };

  return (
    <div className="liquid-glass rounded-[2rem] border border-foreground/5 p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">
          Live City Vitals
        </h3>
        <span className="text-[8px] font-bold text-foreground/20 uppercase">
          Updated {new Date(data.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Temp Stats */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-foreground/40">
            <Thermometer className="h-3 w-3" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Temperature</span>
          </div>
          <div className="text-3xl font-black tracking-tighter">
            {Math.round(data.temp)}°<span className="text-lg text-foreground/30">C</span>
          </div>
          <p className="text-[10px] font-medium text-foreground/50 italic">
            Feels like {Math.round(data.feels_like)}°
          </p>
        </div>

        {/* Air Quality */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-foreground/40">
            <Gauge className="h-3 w-3" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Air Quality</span>
          </div>
          <div className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${getAqiColor(data.aqi)}`}>
            {data.aqi_label}
          </div>
          <p className="text-[10px] font-medium text-foreground/50 opacity-60">
            Index: {data.aqi}/5
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-6 border-t border-foreground/5 pt-4">
        <div className="flex items-center gap-2">
          <Droplets className="h-3 w-3 text-blue-400/50" />
          <div>
            <span className="block text-[8px] font-black text-foreground/30 uppercase">Humidity</span>
            <span className="text-xs font-bold">{data.humidity}%</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Wind className="h-3 w-3 text-teal-400/50" />
          <div>
            <span className="block text-[8px] font-black text-foreground/30 uppercase">Wind</span>
            <span className="text-xs font-bold">{Math.round(data.wind_speed)} <span className="text-[8px] opacity-50">km/h</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}
