import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import * as llmClient from '@/server/llm/client';
import { POST } from '../../src/app/api/bulletin/route';

describe('/api/bulletin Endpoint', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('generates English WhatsApp bulletin', async () => {
    const req = new NextRequest('http://localhost:3000/api/bulletin', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        lang: 'en',
        rwaName: 'Green Park RWA',
        city: 'New Delhi (Anand Vihar)',
        shortCity: 'New Delhi',
        wind: 6,
        pm25: 285,
        naqi: 412,
        bandLabel: 'Severe',
        cigsPerDay: 13,
        windowLabel: '1:00 PM – 3:30 PM',
        sealLabel: '4:30 PM',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.bulletinText).toContain('Green Park RWA');
    expect(data.bulletinText).toContain('412 (Severe)');
    expect(data.bulletinText).toContain('1:00 PM – 3:30 PM');
    expect(data.bulletinText).toContain('Zero Biomass / Leaf Burning');
  });

  it('generates Hindi WhatsApp bulletin', async () => {
    const req = new NextRequest('http://localhost:3000/api/bulletin', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        lang: 'hi',
        rwaName: 'रोहिणी सेक्टर 9 RWA',
        city: 'New Delhi',
        shortCity: 'Delhi',
        wind: 5,
        pm25: 250,
        naqi: 380,
        bandLabel: 'Very Poor',
        cigsPerDay: 11,
        windowLabel: '1:00 PM – 3:30 PM',
        sealLabel: '4:30 PM',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.bulletinText).toContain('रोहिणी सेक्टर 9 RWA');
    expect(data.bulletinText).toContain('खुले में आग न जलाएँ');
  });

  it('uses AI bulletin when aiConsent is true and response passes guardrail', async () => {
    vi.spyOn(llmClient, 'createLlmClient').mockReturnValue({
      complete: vi
        .fn()
        .mockResolvedValue(
          '*Green Park RWA Air Advisory*\nNAQI 412 (Severe), PM2.5 285 µg/m³. Keep windows sealed after 4:30 PM and avoid leaf burning today.'
        ),
    });

    const req = new NextRequest('http://localhost:3000/api/bulletin', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        lang: 'en',
        rwaName: '',
        city: 'New Delhi',
        shortCity: 'Delhi',
        wind: null,
        pm25: 285,
        naqi: 412,
        bandLabel: 'Severe',
        cigsPerDay: 13,
        windowLabel: '1:00 PM – 3:30 PM',
        sealLabel: '4:30 PM',
        aiConsent: true,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.source).toBe('ai');
    expect(data.bulletinText).toContain('Green Park RWA Air Advisory');
  });

  it('falls back to basic template when AI bulletin contains a URL or is Hindi', async () => {
    vi.spyOn(llmClient, 'createLlmClient').mockReturnValue({
      complete: vi
        .fn()
        .mockResolvedValue(
          'Check https://example.com for more details about NAQI 380 and PM2.5 250 in Delhi today.'
        ),
    });

    const req = new NextRequest('http://localhost:3000/api/bulletin', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        lang: 'hi',
        rwaName: 'Vasant Kunj RWA',
        city: 'New Delhi',
        shortCity: 'Delhi',
        wind: 5,
        pm25: 250,
        naqi: 380,
        bandLabel: 'Very Poor',
        cigsPerDay: 11,
        windowLabel: '1:00 PM – 3:30 PM',
        sealLabel: '4:30 PM',
        aiConsent: true,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.source).toBe('basic');
    expect(data.bulletinText).toContain('Vasant Kunj RWA');
  });
});
