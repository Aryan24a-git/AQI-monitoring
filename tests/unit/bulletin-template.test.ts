import { describe, it, expect } from 'vitest';
import { formatWhatsAppBulletin } from '../../src/domain/bulletinTemplate';

describe('Shared WhatsApp Bulletin Template', () => {
  const base = {
    rwaName: 'Green Park RWA',
    city: 'New Delhi, Delhi',
    shortCity: 'Delhi',
    pm25: 180,
    naqi: 345,
    bandLabel: 'Very Poor',
    cigsPerDay: 8.2,
    windowLabel: '12:00 PM - 3:00 PM',
    sealLabel: '5:00 PM',
  };

  it('uses calm wording below 8 km/h and light-breeze at or above 8 km/h in English', () => {
    const calm = formatWhatsAppBulletin({ ...base, lang: 'en', wind: 4 });
    const breezy = formatWhatsAppBulletin({ ...base, lang: 'en', wind: 17 });
    expect(calm).toContain('calm 4 km/h winds');
    expect(breezy).toContain('light-breeze 17 km/h winds');
    expect(breezy).not.toContain('calm');
  });

  it('uses Hindi wind wording and ventilation fallback when window is missing', () => {
    const hi = formatWhatsAppBulletin({
      ...base,
      lang: 'hi',
      wind: 15,
      windowLabel: null,
      sealLabel: null,
    });
    expect(hi).toContain('हल्की हवा (15 km/h)');
    expect(hi).toContain('प्रति-घंटा पूर्वानुमान उपलब्ध नहीं है');
  });
});
