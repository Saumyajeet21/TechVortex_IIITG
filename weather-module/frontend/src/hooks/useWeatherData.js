import { useState, useEffect, useCallback } from 'react';
import { fetchCurrentWeather, fetchCurrentWeatherOWM, CITIES } from '../services/openmeteo';
import { saveWeatherSnapshot } from '../services/supabase';

const REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hour in ms

export function useWeatherData() {
  const [weatherMap, setWeatherMap] = useState({}); // { cityName: weatherData }
  const [selectedCity, setSelectedCity] = useState(CITIES[0]);
  const [currentWeather, setCurrentWeather] = useState(null);
  const [hourlyData, setHourlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // ── Current conditions: OpenWeatherMap (station-accurate) ──────────────
      let cur;
      try {
        cur = await fetchCurrentWeatherOWM(selectedCity.lat, selectedCity.lon);
      } catch (owmErr) {
        console.warn('OWM failed, falling back to OpenMeteo:', owmErr.message);
        // Fallback to OpenMeteo if OWM key is invalid/expired
        const data = await fetchCurrentWeather(selectedCity.lat, selectedCity.lon);
        const c = data.current;
        cur = {
          temperature: c.temperature_2m, feelsLike: c.apparent_temperature,
          windspeed: c.windspeed_10m, precipitation: c.precipitation,
          weathercode: c.weathercode, humidity: c.relative_humidity_2m,
          description: null, time: c.time,
        };
      }
      setCurrentWeather(cur);

      // ── Hourly chart data: keep OpenMeteo (best for forecasts) ─────────────
      const hourlyRaw = await fetchCurrentWeather(selectedCity.lat, selectedCity.lon);
      const hourly = hourlyRaw.hourly.time.slice(0, 24).map((t, i) => ({
        time: t.slice(11, 16),
        temperature:  hourlyRaw.hourly.temperature_2m[i],
        precipitation:hourlyRaw.hourly.precipitation[i],
        windspeed:    hourlyRaw.hourly.windspeed_10m[i],
        humidity:     hourlyRaw.hourly.relative_humidity_2m[i],
      }));
      setHourlyData(hourly);

      // ── Save snapshot to Supabase ──────────────────────────────────────────
      await saveWeatherSnapshot({
        location: selectedCity.name,
        latitude: selectedCity.lat, longitude: selectedCity.lon,
        temperature: cur.temperature, windspeed: cur.windspeed,
        precipitation: cur.precipitation, weathercode: cur.weathercode,
        humidity: cur.humidity,
      });

      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedCity]);

  // Fetch map markers for all cities (lightweight)
  const fetchMapData = useCallback(async () => {
    const results = {};
    await Promise.all(
      CITIES.map(async (city) => {
        try {
          const data = await fetchCurrentWeather(city.lat, city.lon);
          results[city.name] = {
            temperature: data.current.temperature_2m,
            weathercode: data.current.weathercode,
            windspeed: data.current.windspeed_10m,
            precipitation: data.current.precipitation,
          };
        } catch (_) {}
      })
    );
    setWeatherMap(results);
  }, []);

  useEffect(() => {
    fetchAll();
    fetchMapData();
    const interval = setInterval(() => {
      fetchAll();
      fetchMapData();
    }, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchAll, fetchMapData]);

  return {
    currentWeather,
    hourlyData,
    weatherMap,
    selectedCity,
    setSelectedCity,
    loading,
    error,
    lastUpdated,
    refresh: fetchAll,
  };
}
