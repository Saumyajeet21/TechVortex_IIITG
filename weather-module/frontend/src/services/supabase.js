import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function saveWeatherSnapshot(data) {
  const { error } = await supabase.from('weather_snapshots').insert([data]);
  if (error) console.error('Supabase insert error:', error);
}

export async function getLatestSnapshots(limit = 24) {
  const { data, error } = await supabase
    .from('weather_snapshots')
    .select('*')
    .order('fetched_at', { ascending: false })
    .limit(limit);
  if (error) console.error('Supabase fetch error:', error);
  return data ?? [];
}

export async function saveForecast(location, forecastData) {
  const { error } = await supabase.from('weather_forecasts').insert([{
    location,
    forecast_data: forecastData,
  }]);
  if (error) console.error('Forecast save error:', error);
}
