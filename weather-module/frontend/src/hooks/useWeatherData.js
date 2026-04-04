import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchCurrentWeather, fetchCurrentWeatherOWM, CITIES } from '../services/openmeteo';
import { saveWeatherSnapshot, getLatestSnapshots } from '../services/supabase';

const MAP_REFRESH_MS  = 15 * 60 * 1000;  // map dots refresh every 15 min
const MAIN_REFRESH_MS = 60 * 60 * 1000;  // main card refreshes every 60 min

export function useWeatherData() {
  const [weatherMap, setWeatherMap]       = useState({});
  const [selectedCity, setSelectedCity]   = useState(CITIES[0]);
  const [currentWeather, setCurrentWeather] = useState(null);
  const [hourlyData, setHourlyData]       = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [lastUpdated, setLastUpdated]     = useState(null);
  const [mapSource, setMapSource]         = useState('loading'); // 'db' | 'live' | 'loading'
  const mapTimerRef = useRef(null);

  // ── Step 1: Hydrate map from Supabase (instant, no API call) ─────────────
  const loadMapFromDB = useCallback(async () => {
    try {
      const rows = await getLatestSnapshots(50); // last 50 snapshots
      if (!rows.length) return false;

      // Group by location — take the freshest row per city
      const byCity = {};
      for (const row of rows) {
        if (!byCity[row.location]) byCity[row.location] = row;
      }

      const dbMap = {};
      for (const [cityName, row] of Object.entries(byCity)) {
        dbMap[cityName] = {
          temperature:   row.temperature,
          windspeed:     row.windspeed,
          precipitation: row.precipitation,
          weathercode:   row.weathercode,
          humidity:      row.humidity,
          fromDB:        true,
          fetchedAt:     row.fetched_at,
        };
      }

      if (Object.keys(dbMap).length > 0) {
        setWeatherMap(dbMap);
        setMapSource('db');
        console.log(`📦 Map hydrated from Supabase (${Object.keys(dbMap).length} cities)`);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Supabase load failed:', err.message);
      return false;
    }
  }, []);

  // ── Step 2: Fetch live data for all cities from Open-Meteo ───────────────
  const fetchMapFromLive = useCallback(async () => {
    const results = {};
    let successCount = 0;

    await Promise.allSettled(
      CITIES.map(async (city) => {
        try {
          const data = await fetchCurrentWeather(city.lat, city.lon);
          results[city.name] = {
            temperature:   data.current.temperature_2m,
            weathercode:   data.current.weathercode,
            windspeed:     data.current.windspeed_10m,
            precipitation: data.current.precipitation,
            humidity:      data.current.relative_humidity_2m,
            fromDB:        false,
            fetchedAt:     new Date().toISOString(),
          };
          successCount++;

          // Write fresh snapshot to Supabase in background
          saveWeatherSnapshot({
            location:      city.name,
            latitude:      city.lat,
            longitude:     city.lon,
            temperature:   data.current.temperature_2m,
            windspeed:     data.current.windspeed_10m,
            precipitation: data.current.precipitation,
            weathercode:   data.current.weathercode,
            humidity:      data.current.relative_humidity_2m,
          }).catch(() => {}); // non-blocking
        } catch (err) {
          console.warn(`⚠️ Open-Meteo failed for ${city.name}:`, err.message);
        }
      })
    );

    if (successCount > 0) {
      setWeatherMap(prev => ({ ...prev, ...results })); // merge with DB data
      setMapSource('live');
      console.log(`🌐 Live map updated: ${successCount}/${CITIES.length} cities`);
    }
  }, []);

  // ── Combined map loader: DB first, then live overlay ─────────────────────
  const refreshMap = useCallback(async () => {
    setMapSource('loading');
    await loadMapFromDB();    // show cached data instantly
    await fetchMapFromLive(); // overlay with fresh data
  }, [loadMapFromDB, fetchMapFromLive]);

  // ── Main weather fetch for selected city ──────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Current conditions: OWM first, fallback to Open-Meteo
      let cur;
      try {
        cur = await fetchCurrentWeatherOWM(selectedCity.lat, selectedCity.lon);
      } catch {
        const data = await fetchCurrentWeather(selectedCity.lat, selectedCity.lon);
        const c = data.current;
        cur = {
          temperature:   c.temperature_2m,
          feelsLike:     c.apparent_temperature,
          windspeed:     c.windspeed_10m,
          precipitation: c.precipitation,
          weathercode:   c.weathercode,
          humidity:      c.relative_humidity_2m,
          description:   null,
          time:          c.time,
        };
      }
      setCurrentWeather(cur);

      // Hourly chart data from Open-Meteo
      const hourlyRaw = await fetchCurrentWeather(selectedCity.lat, selectedCity.lon);
      const hourly = hourlyRaw.hourly.time.slice(0, 24).map((t, i) => ({
        time:          t.slice(11, 16),
        temperature:   hourlyRaw.hourly.temperature_2m[i],
        precipitation: hourlyRaw.hourly.precipitation[i],
        windspeed:     hourlyRaw.hourly.windspeed_10m[i],
        humidity:      hourlyRaw.hourly.relative_humidity_2m[i],
      }));
      setHourlyData(hourly);

      // Save to Supabase
      await saveWeatherSnapshot({
        location:      selectedCity.name,
        latitude:      selectedCity.lat,
        longitude:     selectedCity.lon,
        temperature:   cur.temperature,
        windspeed:     cur.windspeed,
        precipitation: cur.precipitation,
        weathercode:   cur.weathercode,
        humidity:      cur.humidity,
      });

      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedCity]);

  // ── Mount: load map (DB → Live), then start refresh timers ───────────────
  useEffect(() => {
    fetchAll();
    refreshMap();

    const mainTimer = setInterval(fetchAll,  MAIN_REFRESH_MS);
    mapTimerRef.current = setInterval(fetchMapFromLive, MAP_REFRESH_MS);

    return () => {
      clearInterval(mainTimer);
      clearInterval(mapTimerRef.current);
    };
  }, [fetchAll, refreshMap, fetchMapFromLive]);

  return {
    currentWeather,
    hourlyData,
    weatherMap,
    mapSource,      // 'db' | 'live' | 'loading'
    selectedCity,
    setSelectedCity,
    loading,
    error,
    lastUpdated,
    refresh: fetchAll,
    refreshMap,
  };
}
