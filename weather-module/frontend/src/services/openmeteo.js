const BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const OWM_BASE  = 'https://api.openweathermap.org/data/2.5/weather';

// ── OpenWeatherMap current weather (station-accurate) ─────────────────────
export async function fetchCurrentWeatherOWM(lat, lon) {
  const key = import.meta.env.VITE_OWM_API_KEY;
  if (!key) throw new Error('Missing VITE_OWM_API_KEY in .env');

  const res = await fetch(
    `${OWM_BASE}?lat=${lat}&lon=${lon}&appid=${key}&units=metric`
  );
  if (!res.ok) throw new Error(`OWM fetch failed: ${res.status}`);
  const d = await res.json();

  return {
    temperature:  d.main.temp,
    feelsLike:    d.main.feels_like,
    humidity:     d.main.humidity,
    windspeed:    d.wind.speed * 3.6,          // m/s → km/h
    precipitation: d.rain?.['1h'] ?? 0,
    weathercode:  owmCodeToWMO(d.weather[0].id),
    description:  d.weather[0].description
                    .split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
    time: new Date().toISOString(),
  };
}

// Map OpenWeatherMap condition codes to WMO weathercodes (for icon lookup)
function owmCodeToWMO(id) {
  if (id >= 200 && id < 300) return 95;   // Thunderstorm
  if (id >= 300 && id < 400) return 51;   // Drizzle
  if (id >= 500 && id < 510) return 61;   // Rain
  if (id === 511)             return 66;   // Freezing rain
  if (id >= 520 && id < 600) return 80;   // Shower
  if (id >= 600 && id < 700) return 71;   // Snow
  if (id >= 700 && id < 800) return 45;   // Fog/mist
  if (id === 800)             return 0;    // Clear
  if (id === 801)             return 1;    // Few clouds
  if (id === 802)             return 2;    // Scattered
  return 3;                                // Broken/overcast
}

// Fetch live current weather for a given lat/lon
export async function fetchCurrentWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: 'temperature_2m,windspeed_10m,precipitation,weathercode,relative_humidity_2m,apparent_temperature',
    hourly: 'temperature_2m,precipitation,windspeed_10m,relative_humidity_2m',
    forecast_days: 3,
    timezone: 'auto',
  });

  const res = await fetch(`${BASE_URL}?${params}`);
  if (!res.ok) throw new Error('OpenMeteo fetch failed');
  return res.json();
}

// Fetch 72-hr hourly forecast data
export async function fetch72HourForecast(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    hourly: 'temperature_2m,precipitation,windspeed_10m,relative_humidity_2m,weathercode',
    forecast_days: 3,
    timezone: 'auto',
  });

  const res = await fetch(`${BASE_URL}?${params}`);
  if (!res.ok) throw new Error('OpenMeteo 72hr fetch failed');
  const json = await res.json();

  // Return array of 72 hourly objects
  return json.hourly.time.map((time, i) => ({
    time,
    temperature: json.hourly.temperature_2m[i],
    precipitation: json.hourly.precipitation[i],
    windspeed: json.hourly.windspeed_10m[i],
    humidity: json.hourly.relative_humidity_2m[i],
    weathercode: json.hourly.weathercode[i],
  }));
}

// Map weathercode to human-readable label
export function getWeatherLabel(code) {
  const map = {
    0: 'Clear Sky', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Icy Fog', 51: 'Light Drizzle', 53: 'Drizzle',
    55: 'Heavy Drizzle', 61: 'Light Rain', 63: 'Rain', 65: 'Heavy Rain',
    71: 'Light Snow', 73: 'Snow', 75: 'Heavy Snow', 80: 'Showers',
    81: 'Heavy Showers', 82: 'Violent Showers', 95: 'Thunderstorm',
    96: 'Hail Thunderstorm', 99: 'Heavy Hail Storm',
  };
  return map[code] ?? 'Unknown';
}

// List of Indian cities for the map
export const CITIES = [
  { name: 'Guwahati', lat: 26.1445, lon: 91.7362 },
  { name: 'Delhi', lat: 28.6139, lon: 77.2090 },
  { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
  { name: 'Chennai', lat: 13.0827, lon: 80.2707 },
  { name: 'Kolkata', lat: 22.5726, lon: 88.3639 },
  { name: 'Bangalore', lat: 12.9716, lon: 77.5946 },
  { name: 'Hyderabad', lat: 17.3850, lon: 78.4867 },
  { name: 'Jaipur', lat: 26.9124, lon: 75.7873 },
  { name: 'Bhopal', lat: 23.2599, lon: 77.4126 },
  { name: 'Patna', lat: 25.5941, lon: 85.1376 },
];
