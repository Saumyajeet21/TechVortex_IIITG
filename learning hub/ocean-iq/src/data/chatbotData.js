export const faqMap = {
  cyclone: ['cyclone','storm','typhoon','hurricane','cyclones'],
  rip: ['rip current','rip','current','escape current'],
  incois: ['incois','ocean forecast','wave forecast','ocean data'],
  imd: ['imd','weather','meteorological','mausam'],
  ndma: ['ndma','disaster','management','disaster management'],
  emergency: ['emergency','helpline','contact','number','call','phone'],
  swim: ['swim','swimming','beach','safe to swim'],
  rain: ['rain','flood','after rain','heavy rain'],
  shark: ['shark','attack','sharks'],
  plastic: ['plastic','pollution','garbage','waste'],
  tsunami: ['tsunami','tidal wave'],
  mangrove: ['mangrove','mangroves','sundarbans'],
  oxygen: ['oxygen','phytoplankton','breathe'],
  blueconomy: ['blue economy','ocean economy','fishing industry'],
  monsoon: ['monsoon','rain season','indian monsoon'],
};

export const responses = {
  cyclone: '🌀 During a cyclone: (1) Monitor IMD alerts at mausam.imd.gov.in. (2) Evacuate immediately if ordered. (3) Secure loose items. (4) Prepare a 72+ hour emergency kit. (5) Stay away from coasts. Call 112 in emergencies.',
  rip: '🌊 To escape a rip current: DO NOT swim directly against it. Swim PARALLEL to the shore until you feel the current weaken, then angle back toward the beach. If unable to escape, float calmly and wave for help.',
  incois: '📡 INCOIS provides real-time ocean forecasts including wave heights, tsunami warnings, and fishing zone advisories. Visit incois.gov.in or download their mobile app.',
  imd: '🌤️ IMD is India\'s official weather agency. They issue cyclone warnings and color-coded weather alerts. Visit mausam.imd.gov.in or use the Mausam app.',
  ndma: '🏛️ NDMA coordinates disaster preparedness across India. Helpline: 1078. Visit ndma.gov.in for preparedness guidelines.',
  emergency: '📞 Key emergency numbers: 112 (National), 1554 (Coast Guard), 1078 (NDMA), 101 (Fire), 102 (Ambulance), 1800-180-1551 (Fishermen, toll-free).',
  swim: '🏊 Check INCOIS before swimming. Only swim in lifeguard-patrolled areas. Never swim alone. Watch for red warning flags — no swimming.',
  rain: '🌧️ Avoid swimming for 48–72 hours after heavy rain — stormwater carries sewage into the sea. Watch for stronger rip currents after storms.',
  shark: '🦈 Shark attacks are extremely rare. Avoid swimming at dawn/dusk, avoid areas near active fishing, and exit calmly without splashing if you see a shark.',
  plastic: '♻️ Never leave plastic on beaches. Report illegal dumping to CPCB (cpcb.nic.in). Refuse single-use plastic.',
  tsunami: '🚨 After a strong coastal earthquake: move inland to high ground (30m+) immediately. Do not wait for warnings. Call 112. INCOIS manages India\'s tsunami warning system.',
  mangrove: '🌿 Mangroves protect coasts from cyclones and tsunamis. India\'s Sundarbans is the world\'s largest mangrove forest. They are legally protected — do not damage them.',
  oxygen: '🌬️ Phytoplankton produce over 50% of Earth\'s oxygen. Protecting our oceans is directly linked to the air we breathe.',
  blueconomy: '⚓ India\'s Blue Economy includes fishing (14M+ tonnes/year), shipping (12 major ports), coastal tourism, and deep-sea mining. The Blue Revolution scheme aims to sustainably grow this sector.',
  monsoon: '🌧️ India\'s monsoon is driven by differential heating between the Asian continent and the Indian Ocean, delivering 70–90% of India\'s annual rainfall from June–September.',
  default: '🌊 I can help with: cyclones, rip currents, INCOIS & IMD services, emergency contacts, swimming safety, ocean pollution, tsunamis, and more. Try asking something specific!',
};

export const quickChips = [
  'What should I do during a cyclone?',
  'How do I escape a rip current?',
  'Is it safe to swim after heavy rain?',
  'What is INCOIS?',
  'Emergency contact numbers India',
  'What is a tsunami?',
];

export function getBotResponse(msg) {
  const m = msg.toLowerCase();
  for (const [key, kws] of Object.entries(faqMap)) {
    if (kws.some(kw => m.includes(kw))) return responses[key];
  }
  return responses.default;
}
