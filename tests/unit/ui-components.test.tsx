// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DEFAULT_PROFILE, computeDeterministicImpact } from '@/domain/scenarios';
import { buildManualScenario } from '@/features/layout/fetchLiveCity';
import { findSafeVentilationWindow } from '@/domain/naqi';
import { ProfileDrawer } from '@/features/profile/ProfileDrawer';
import { AiConsentModal } from '@/features/copilot/AiConsentModal';
import { AqiHeroCard } from '@/features/hero/AqiHeroCard';
import { DispersionChart } from '@/features/hero/DispersionChart';
import { HotspotForm } from '@/features/community/HotspotComponents';
import { WhatsAppGenerator } from '@/features/community/WhatsAppGenerator';
import { VentilationCallouts } from '@/features/hero/VentilationCallouts';
import { ToastProvider } from '@/features/layout/ToastContainer';

afterEach(cleanup);

function makeSampleScenario(overrides: Partial<ReturnType<typeof buildManualScenario>> = {}) {
  const base = buildManualScenario(180);
  return {
    ...base,
    city: 'Delhi NCR',
    shortCity: 'Delhi',
    hourlyError: undefined,
    hourlyPM25: Array.from({ length: 24 }, (_, h) => (h >= 13 && h <= 15 ? 90 : 220)),
    hourlyWind: Array.from({ length: 24 }, (_, h) => (h >= 13 && h <= 15 ? 11 : 4)),
    ...overrides,
  };
}

describe('UI components', () => {
  it('ProfileDrawer saves updated purifier and closes on Escape', () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(
      <ProfileDrawer isOpen onClose={onClose} profile={DEFAULT_PROFILE} onSaveProfile={onSave} />
    );
    fireEvent.click(screen.getByRole('button', { name: '1 Room HEPA' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save & Apply' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ purifier: 'one_room' }));
    expect(onClose).toHaveBeenCalled();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('AiConsentModal invokes allow and basic callbacks', () => {
    const onAllow = vi.fn();
    const onDecline = vi.fn();
    render(<AiConsentModal onAllow={onAllow} onDecline={onDecline} />);
    fireEvent.click(screen.getByRole('button', { name: 'Allow' }));
    fireEvent.click(screen.getByRole('button', { name: 'Use basic mode' }));
    expect(onAllow).toHaveBeenCalledOnce();
    expect(onDecline).toHaveBeenCalledOnce();
  });

  it('AqiHeroCard labels all four source paths accurately without contradiction', () => {
    // 1. City with fresh WAQI station: Open-Meteo model tiles + separate Station AQI note
    const cityWithStation = makeSampleScenario({
      sourceLabel: 'Model-derived NAQI equivalent (Open-Meteo)',
      pm10: 143,
      no2: 32,
      wind: 4,
      stationAqi: {
        usAqi: 205,
        stationName: 'Mandir Marg',
        distanceKm: 3.6,
        ageLabel: '1.4h ago',
        obsTime: '11:00 am',
      },
    });
    render(
      <AqiHeroCard
        location={cityWithStation}
        impact={computeDeterministicImpact(cityWithStation, DEFAULT_PROFILE)}
      />
    );
    expect(screen.getByText('Model-derived NAQI equivalent (Open-Meteo)')).toBeTruthy();
    expect(screen.getAllByText('Open-Meteo model').length).toBe(4);
    expect(screen.queryByText(/approx\. from station AQI/i)).toBeNull();
    expect(screen.getByText(/Station AQI \(US scale\):/i)).toBeTruthy();
    cleanup();

    // 2. City with model only (stale WAQI fallback)
    const cityModelOnly = makeSampleScenario({
      sourceLabel: 'Model-derived NAQI equivalent (Open-Meteo)',
      pm10: 143,
      no2: 32,
      wind: 4,
      stationFallbackNote: 'Nearest WAQI station reading is >3h old — showing model only',
    });
    render(
      <AqiHeroCard
        location={cityModelOnly}
        impact={computeDeterministicImpact(cityModelOnly, DEFAULT_PROFILE)}
      />
    );
    expect(screen.getAllByText('Open-Meteo model').length).toBe(4);
    expect(screen.getByText(/Nearest WAQI station reading is >3h old/i)).toBeTruthy();
    cleanup();

    // 3. GPS station reading
    const gpsLoc = makeSampleScenario({
      id: 'gps-28.61-77.21',
      sourceLabel: 'Station observation (WAQI)',
      pm25Approx: true,
    });
    render(
      <AqiHeroCard location={gpsLoc} impact={computeDeterministicImpact(gpsLoc, DEFAULT_PROFILE)} />
    );
    expect(screen.getAllByText('Not measured').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText(/NAQI estimated from PM2\.5 only/i)).toBeTruthy();
    expect(screen.getByText(/approx\. from station AQI/i)).toBeTruthy();
    cleanup();

    // 4. Manual PM2.5 entry
    const manualLoc = makeSampleScenario();
    render(
      <AqiHeroCard
        location={manualLoc}
        impact={computeDeterministicImpact(manualLoc, DEFAULT_PROFILE)}
      />
    );
    expect(screen.getByText('User-entered')).toBeTruthy();
    expect(screen.getAllByText('Not measured').length).toBeGreaterThanOrEqual(3);
  });

  it('VentilationCallouts labels least-polluted window and warns when avgWindowPM > 60', () => {
    const loc = makeSampleScenario();
    const vent = findSafeVentilationWindow(loc.hourlyPM25, loc.hourlyWind);
    render(<VentilationCallouts vent={vent} />);
    expect(screen.getByText(/Best window to ventilate:/i)).toBeTruthy();
    expect(screen.getByText(/Least-polluted window/i)).toBeTruthy();
    expect(screen.getByText(/outdoor PM2\.5/i)).toBeTruthy();
    expect(screen.getByText(/Even the cleanest hours are still/i)).toBeTruthy();
  });

  it('DispersionChart responds to keyboard arrows and renders 24-hour data table', () => {
    const loc = makeSampleScenario();
    const vent = findSafeVentilationWindow(loc.hourlyPM25, loc.hourlyWind);
    render(<DispersionChart location={loc} vent={vent} bandColor="#dc2626" />);
    const region = screen.getByRole('region', { name: /24-hour smog dispersion chart/i });
    fireEvent.keyDown(region, { key: 'Home' });
    expect(screen.getByText('12:00 AM')).toBeTruthy();
    fireEvent.keyDown(region, { key: 'ArrowRight' });
    expect(screen.getByText('1:00 AM')).toBeTruthy();
    fireEvent.keyDown(region, { key: 'End' });
    expect(screen.getByText('11:00 PM')).toBeTruthy();
    expect(screen.getByText('View 24-hour data table')).toBeTruthy();
    expect(screen.getAllByRole('row').length).toBe(25);
  });

  it('HotspotForm submits category, locality, and description', () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <HotspotForm
        category="Open Waste Burning"
        setCategory={vi.fn()}
        locality="Saket"
        setLocality={vi.fn()}
        description="Leaves burning near park gate"
        setDescription={vi.fn()}
        onSubmit={onSubmit}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Save report on this device/i }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('WhatsAppGenerator switches between English and Hindi bulletins', () => {
    const loc = makeSampleScenario();
    const vent = findSafeVentilationWindow(loc.hourlyPM25, loc.hourlyWind);
    const impact = computeDeterministicImpact(loc, DEFAULT_PROFILE);
    render(
      <ToastProvider>
        <WhatsAppGenerator location={loc} vent={vent} impact={impact} />
      </ToastProvider>
    );
    expect(screen.getByText(/Daily Smog & Clean Air Bulletin/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'हिन्दी' }));
    expect(screen.getByText(/आज का वायु स्वास्थ्य अलर्ट/i)).toBeTruthy();
  });
});
