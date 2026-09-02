import React, { useState, useEffect } from "react";
import { Cloud, CloudRain, Sun, Wind, Eye, Droplets, Thermometer } from "lucide-react";

const WEATHER_ICONS = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
};

const WEATHER_TYPES = {
  sunny: { icon: Sun, label: "Sunny", color: "text-amber-400" },
  cloudy: { icon: Cloud, label: "Cloudy", color: "text-gray-400" },
  rainy: { icon: CloudRain, label: "Rainy", color: "text-blue-400" },
};

export default function WeatherWidget() {
  const [weather, setWeather] = useState({
    temp: 32,
    condition: "sunny",
    humidity: 45,
    visibility: 10,
    windSpeed: 12,
  });

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 18) {
      setWeather({
        temp: 32,
        condition: "sunny",
        humidity: 45,
        visibility: 10,
        windSpeed: 12,
      });
    } else {
      setWeather({
        temp: 24,
        condition: "cloudy",
        humidity: 60,
        visibility: 8,
        windSpeed: 8,
      });
    }
  }, []);

  const { icon: WeatherIcon, color } = WEATHER_TYPES[weather.condition];

  return (
    <div className="glass rounded-lg px-3 py-2 flex items-center gap-3">
      <WeatherIcon className={`w-4 h-4 ${color}`} />
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-display font-bold text-aero-t1">{weather.temp}°</span>
      </div>
      <div className="h-4 w-px bg-aero-border/50" />
      <div className="flex items-center gap-2 text-[10px] text-aero-t2">
        <Droplets className="w-3 h-3" />
        <span>{weather.humidity}%</span>
      </div>
      <div className="h-4 w-px bg-aero-border/50" />
      <div className="flex items-center gap-2 text-[10px] text-aero-t2">
        <Eye className="w-3 h-3" />
        <span>{weather.visibility}km</span>
      </div>
      <div className="h-4 w-px bg-aero-border/50" />
      <div className="flex items-center gap-2 text-[10px] text-aero-t2">
        <Wind className="w-3 h-3" />
        <span>{weather.windSpeed}km/h</span>
      </div>
    </div>
  );
}
