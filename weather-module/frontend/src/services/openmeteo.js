const BASE_URL   = 'https://api.open-meteo.com/v1/forecast';
const OWM_BASE   = 'https://api.openweathermap.org/data/2.5/weather';
const GEO_URL    = 'https://geocoding-api.open-meteo.com/v1/search';
const AQI_URL    = 'https://air-quality-api.open-meteo.com/v1/air-quality';

// ── Geocode any city name → { name, lat, lon, country } ───────────────────
export async function geocodeCity(query) {
  if (!query.trim()) return [];
  const res = await fetch(`${GEO_URL}?name=${encodeURIComponent(query)}&count=6&language=en&format=json`);
  if (!res.ok) throw new Error('Geocoding failed');
  const json = await res.json();
  if (!json.results) return [];
  return json.results.map(r => ({
    name:    r.name,
    lat:     r.latitude,
    lon:     r.longitude,
    country: r.country,
    state:   r.admin1 ?? '',
  }));
}

// ── Fetch AQI (Air Quality Index) from Open-Meteo Air Quality API ──────────
export async function fetchAQI(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat, longitude: lon,
    current: 'european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone',
    hourly:  'european_aqi,pm2_5,pm10',
    forecast_days: 1,
    timezone: 'auto',
  });
  const res = await fetch(`${AQI_URL}?${params}`);
  if (!res.ok) throw new Error('AQI fetch failed');
  const d = await res.json();
  const c = d.current;
  return {
    europeanAqi:       c.european_aqi       ?? 0,
    usAqi:             c.us_aqi             ?? 0,
    pm25:              c.pm2_5              ?? 0,
    pm10:              c.pm10               ?? 0,
    carbonMonoxide:    c.carbon_monoxide    ?? 0,
    nitrogenDioxide:   c.nitrogen_dioxide   ?? 0,
    sulphurDioxide:    c.sulphur_dioxide    ?? 0,
    ozone:             c.ozone              ?? 0,
    hourly: d.hourly.time.map((t, i) => ({
      time: t.slice(11, 16),
      aqi:  d.hourly.european_aqi[i] ?? 0,
      pm25: d.hourly.pm2_5[i]        ?? 0,
      pm10: d.hourly.pm10[i]         ?? 0,
    })),
  };
}

// ── Indian AQI (CPCB) calculation ─────────────────────────────────────────
// Source: Central Pollution Control Board, India
function subIndex(concentration, breakpoints) {
  for (const [c_lo, c_hi, aqi_lo, aqi_hi] of breakpoints) {
    if (concentration >= c_lo && concentration <= c_hi) {
      return Math.round(
        ((aqi_hi - aqi_lo) / (c_hi - c_lo)) * (concentration - c_lo) + aqi_lo
      );
    }
  }
  return concentration > 0 ? 500 : 0;
}

export function calculateIndianAQI({ pm25, pm10, no2, so2, o3, co }) {
  // Breakpoints: [C_lo, C_hi, AQI_lo, AQI_hi] — official CPCB tables
  const pm25_bp = [[0,30,0,50],[30,60,51,100],[60,90,101,200],[90,120,201,300],[120,250,301,400],[250,500,401,500]];
  const pm10_bp = [[0,50,0,50],[50,100,51,100],[100,250,101,200],[250,350,201,300],[350,430,301,400],[430,600,401,500]];
  const no2_bp  = [[0,40,0,50],[40,80,51,100],[80,180,101,200],[180,280,201,300],[280,400,301,400],[400,800,401,500]];
  const so2_bp  = [[0,40,0,50],[40,80,51,100],[80,380,101,200],[380,800,201,300],[800,1600,301,400],[1600,2100,401,500]];
  const o3_bp   = [[0,50,0,50],[50,100,51,100],[100,168,101,200],[168,208,201,300],[208,748,301,400],[748,1000,401,500]];
  const co_bp   = [[0,1,0,50],[1,2,51,100],[2,10,101,200],[10,17,201,300],[17,34,301,400],[34,46,401,500]]; // mg/m³

  const indices = [
    { name: 'PM2.5', idx: subIndex(pm25,         pm25_bp) },
    { name: 'PM10',  idx: subIndex(pm10,          pm10_bp) },
    { name: 'NO₂',   idx: subIndex(no2,           no2_bp)  },
    { name: 'SO₂',   idx: subIndex(so2,           so2_bp)  },
    { name: 'O₃',    idx: subIndex(o3,            o3_bp)   },
    { name: 'CO',    idx: subIndex(co / 1000,     co_bp)   }, // μg/m³ → mg/m³
  ];

  // Indian AQI = the highest sub-index (dominant pollutant determines AQI)
  const dominant = indices.reduce((a, b) => a.idx > b.idx ? a : b);
  return { aqi: dominant.idx, dominant: dominant.name, all: indices };
}

// Indian CPCB AQI categories (0–500 scale)
export function getAQIInfo(aqi) {
  if (aqi <= 50)  return { label: 'Good',         color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   advice: 'Air quality is good. Enjoy outdoor activities safely!' };
  if (aqi <= 100) return { label: 'Satisfactory', color: '#a3e635', bg: 'rgba(163,230,53,0.12)',  advice: 'Sensitive people may experience minor breathing discomfort.' };
  if (aqi <= 200) return { label: 'Moderate',     color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  advice: 'People with lung/heart disease, children & elderly should limit prolonged outdoor exertion.' };
  if (aqi <= 300) return { label: 'Poor',         color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  advice: 'Breathing discomfort for most people on prolonged exposure. Avoid outdoor exercise.' };
  if (aqi <= 400) return { label: 'Very Poor',    color: '#f87171', bg: 'rgba(248,113,113,0.12)', advice: 'Respiratory illness on prolonged exposure. Avoid going outdoors.' };
  return           { label: 'Severe',             color: '#c084fc', bg: 'rgba(192,132,252,0.12)', advice: '🚨 Health emergency! Stay indoors with windows shut. Seek medical help if unwell.' };
}


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
