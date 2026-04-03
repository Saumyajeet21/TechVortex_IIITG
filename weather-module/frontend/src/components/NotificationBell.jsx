import React, { useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';

const THRESHOLDS = {
  temperature: { value: 40, label: '🌡 Extreme Heat Warning', msg: (city, v) => `${city}: Temperature is ${v}°C — Stay hydrated!` },
  precipitation: { value: 20, label: '🌧 Heavy Rain Alert', msg: (city, v) => `${city}: Heavy rainfall ${v}mm — Avoid low-lying areas!` },
  windspeed: { value: 60, label: '💨 Strong Wind Advisory', msg: (city, v) => `${city}: Wind speed ${v} km/h — Secure loose objects!` },
};

export default function NotificationBell({ currentWeather, cityName }) {
  useEffect(() => {
    if (!currentWeather) return;

    if (currentWeather.temperature >= THRESHOLDS.temperature.value) {
      toast.error(THRESHOLDS.temperature.msg(cityName, currentWeather.temperature), {
        duration: 6000,
        icon: '🌡',
      });
    }
    if (currentWeather.precipitation >= THRESHOLDS.precipitation.value) {
      toast(THRESHOLDS.precipitation.msg(cityName, currentWeather.precipitation), {
        duration: 6000,
        icon: '🌧',
        style: { background: '#1e40af', color: '#fff' },
      });
    }
    if (currentWeather.windspeed >= THRESHOLDS.windspeed.value) {
      toast(THRESHOLDS.windspeed.msg(cityName, currentWeather.windspeed), {
        duration: 6000,
        icon: '💨',
        style: { background: '#4c1d95', color: '#fff' },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeather?.temperature, currentWeather?.precipitation, currentWeather?.windspeed]);

  return <Toaster position="top-right" toastOptions={{ style: { borderRadius: '12px', fontFamily: 'Inter, sans-serif' } }} />;
}
