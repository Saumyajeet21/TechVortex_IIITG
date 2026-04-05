export const govCards = [
  { logo: 'IMD', full: 'India Meteorological Department', desc: "Provides cyclone warnings, weather forecasts, and color-coded alerts for severe weather events.", url: 'https://mausam.imd.gov.in' },
  { logo: 'INCOIS', full: 'Indian National Centre for Ocean Information Services', desc: 'Real-time ocean forecasts, tsunami warnings, high wave alerts, and fishing zone advisories.', url: 'https://www.incois.gov.in' },
  { logo: 'NDMA', full: 'National Disaster Management Authority', desc: "Issues disaster preparedness guidelines and coordinates response across all government levels.", url: 'https://ndma.gov.in' },
  { logo: 'ICG', full: 'Indian Coast Guard', desc: 'Search and rescue at sea, pollution response, and maritime law enforcement. 24/7 operations.', url: 'https://indiancoastguard.gov.in' },
  { logo: 'CPCB', full: 'Central Pollution Control Board', desc: 'Monitors water, air, and noise pollution. Manages AQI network and handles complaints.', url: 'https://cpcb.nic.in' },
  { logo: 'MoES', full: 'Ministry of Earth Sciences', desc: "Oversees IMD, INCOIS, and NCAOR. Leads India's Deep Ocean Mission.", url: 'https://www.moes.gov.in' },
];

export const helplines = [
  { num: '112', label: 'National Emergency Number', color: 'var(--coral-red)' },
  { num: '1554', label: 'Indian Coast Guard (Maritime Rescue)', color: 'var(--ocean-mid)' },
  { num: '1078', label: 'NDMA Disaster Helpline', color: 'var(--ocean-teal)' },
  { num: '101', label: 'Fire & Emergency Services', color: 'var(--sunlight)' },
  { num: '102', label: 'Ambulance (Medical Emergency)', color: '#7d3c98' },
  { num: '1800-180-1551', label: 'Fishermen Distress Alert (Toll-Free)', color: 'var(--ocean-deep)', small: true },
];

export const apps = [
  { icon: '📱', name: 'Mausam App (IMD)', desc: 'Real-time weather alerts, cyclone tracking, rainfall forecast — available on Android & iOS' },
  { icon: '🌊', name: 'INCOIS Ocean Forecast App', desc: 'Wave height, sea conditions, potential fishing zones, tsunami alerts for coastal users and fishers' },
  { icon: '🌫️', name: 'SAFAR Air Quality App', desc: 'Real-time AQI monitoring for major Indian cities and coastal urban centers — iOS and Android' },
  { icon: '🆘', name: 'NDMA Sathi App', desc: 'Disaster alerts, preparedness guidelines, nearby shelter locations, and disaster response contacts' },
];

export const alertLevels = [
  { color: '#27ae60', bg: 'rgba(39,174,96,0.15)', label: '🟢 Green', text: 'No immediate threat. Normal weather. No action required.' },
  { color: '#f1c40f', bg: 'rgba(241,196,15,0.15)', labelColor: '#b7770d', label: '🟡 Yellow', text: 'Be Aware. Severe weather possible. Monitor situation. Begin preparations.' },
  { color: '#e67e22', bg: 'rgba(230,126,34,0.15)', labelColor: '#b7470d', label: '🟠 Orange', text: 'Be Prepared. Severe weather likely. Action required — prepare emergency supplies, be ready to evacuate.' },
  { color: '#c0392b', bg: 'rgba(192,57,43,0.15)', label: '🔴 Red', text: 'Take Action Now. Extremely severe weather. Evacuate immediately. Call 112 if in danger.' },
];
