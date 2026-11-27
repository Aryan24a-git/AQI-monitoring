export interface BulletinInput {
  lang: 'en' | 'hi';
  rwaName: string;
  city: string;
  shortCity: string;
  wind: number;
  pm25: number;
  naqi: number;
  bandLabel: string;
  cigsPerDay: number;
  windowLabel?: string | null;
  sealLabel?: string | null;
}

/** Shared pure WhatsApp bulletin formatter used by both client preview and /api/bulletin. */
export function formatWhatsAppBulletin(req: BulletinInput): string {
  const name = req.rwaName.trim() || `${req.shortCity} Residents Welfare Group`;
  const hasVent = Boolean(req.windowLabel && req.sealLabel);
  const hiVentLine = hasVent
    ? `💨 *सुरक्षित वेंटिलेशन समय:* केवल *${req.windowLabel}* के बीच खिड़कियाँ खोलें। शाम *${req.sealLabel}* तक बंद रखें।`
    : `💨 *सुरक्षित वेंटिलेशन:* प्रति-घंटा पूर्वानुमान उपलब्ध नहीं है — धुंध रहने तक खिड़कियाँ बंद रखें।`;
  const enVentLine = hasVent
    ? `🪟 *Safe Ventilation Window:* Open windows only during *${req.windowLabel}*. Seal doors/windows by *${req.sealLabel}*.`
    : `🪟 *Ventilation Guidance:* Hourly forecast unavailable — keep windows sealed while outdoor haze remains high.`;

  if (req.lang === 'hi') {
    const windDescHi = req.wind < 8 ? 'शांत हवा' : 'हल्की हवा';
    return (
      `🌿 *${name} — आज का वायु स्वास्थ्य अलर्ट (VayuSaathi)*\n\n` +
      `📍 *क्षेत्र:* ${req.city}\n` +
      `📊 *CPCB NAQI:* *${req.naqi} (${req.bandLabel})* | PM2.5: ${req.pm25} µg/m³\n` +
      `${hiVentLine}\n\n` +
      `✅ *आज के 2 सामुदायिक संकल्प:*\n` +
      `1️⃣ *खुले में आग न जलाएँ:* कृपया गार्ड्स व सफाई कर्मियों से अनुरोध करें कि सूखे पत्ते या कचरा न जलाएँ — ${windDescHi} (${req.wind} km/h) में धुआँ यहीं फँस जाता है।\n` +
      `2️⃣ *कम-उत्सर्जन आवागमन:* आज अकेले कार निकालने के बजाय मेट्रो/कारपूल अपनाएँ और सूखे झाड़ू की जगह गीला पोछा लगाएँ।\n\n` +
      `🤝 आइए मिलकर अपनी कॉलोनी की हवा सुरक्षित रखें!`
    );
  }

  const windDesc = req.wind < 8 ? 'calm' : 'light-breeze';
  return (
    `🌿 *${name} — Daily Smog & Clean Air Bulletin (VayuSaathi)*\n\n` +
    `📍 *Area:* ${req.city}\n` +
    `📊 *CPCB NAQI:* *${req.naqi} (${req.bandLabel})* | PM2.5: ${req.pm25} µg/m³ (~${req.cigsPerDay} cigs/day eq.)\n` +
    `${enVentLine}\n\n` +
    `✅ *Today's 2 Community Pledges:*\n` +
    `1️⃣ *Zero Biomass / Leaf Burning:* Please remind society night guards & sweepers not to burn dry leaves or waste tonight — ${windDesc} ${req.wind} km/h winds trap smoke at breathing level.\n` +
    `2️⃣ *Smarter Commute & Wet Mopping:* Swap solo car runs for Metro/carpool where possible, avoid engine idling at our main gate, and switch from dry sweeping to wet mopping today.\n\n` +
    `🤝 Small coordinated habits cut our colony's local smog together!`
  );
}
