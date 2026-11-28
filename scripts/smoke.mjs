/**
 * Cross-platform smoke verification script (Node.js ESM)
 * Runs against live running server on PORT (default 3000)
 */

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

const tinyPngBase64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function check(name, fn) {
  try {
    process.stdout.write(`  • ${name}... `);
    await fn();
    console.log('✓ PASS');
    return true;
  } catch (err) {
    console.log(`✗ FAIL (${err.message})`);
    return false;
  }
}

async function runSmoke() {
  console.log(`\n======================================================`);
  console.log(`  VayuSaathi Smoke Verification: ${BASE_URL}`);
  console.log(`======================================================\n`);

  let allPass = true;

  allPass =
    (await check('GET / (Root HTML & Security Headers)', async () => {
      const res = await fetch(`${BASE_URL}/`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const csp = res.headers.get('content-security-policy');
      const nosniff = res.headers.get('x-content-type-options');
      if (!nosniff) throw new Error('Missing x-content-type-options');
      if (!csp) throw new Error('Missing content-security-policy');
    })) && allPass;

  allPass =
    (await check('GET /api/health (Liveness probe)', async () => {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.status !== 'ok') throw new Error('status != ok');
    })) && allPass;

  allPass =
    (await check('GET /api/ready (Readiness probe)', async () => {
      const res = await fetch(`${BASE_URL}/api/ready`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    })) && allPass;

  allPass =
    (await check('GET /api/city-scenario?q=Delhi', async () => {
      const res = await fetch(`${BASE_URL}/api/city-scenario?q=Delhi`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.city || typeof json.pm25 !== 'number') throw new Error('Invalid city scenario');
    })) && allPass;

  allPass =
    (await check('POST /api/playbook (Deterministic playbook generation)', async () => {
      const res = await fetch(`${BASE_URL}/api/playbook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: {
            id: 'smoke-delhi',
            city: 'New Delhi, India',
            shortCity: 'New Delhi',
            subtitle: 'Smoke Test',
            sourceLabel: 'Smoke Test',
            pm25: 180,
            hourlyPM25: [],
            hourlyWind: [],
          },
          profile: {
            vulnerabilities: ['kids'],
            purifier: 'none',
            kitchenExhaust: true,
            commuteMode: 'solo_car',
            commuteKm: 16,
            budgetTier: 'zero_cost',
          },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.playbook?.iaqHacks?.length) throw new Error('No playbook actions generated');
    })) && allPass;

  allPass =
    (await check('POST /api/bulletin (Bilingual WhatsApp RWA advisory)', async () => {
      const res = await fetch(`${BASE_URL}/api/bulletin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lang: 'hi',
          rwaName: 'Green Park Society',
          city: 'New Delhi',
          shortCity: 'Delhi',
          wind: 6,
          pm25: 220,
          naqi: 360,
          bandLabel: 'Very Poor',
          cigsPerDay: 10,
          windowLabel: '11:00 AM – 1:00 PM',
          sealLabel: '4:00 PM',
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.bulletinText || !json.bulletinText.includes('Green Park Society'))
        throw new Error('Invalid bulletin body');
    })) && allPass;

  allPass =
    (await check('POST /api/ask (Follow-up Q&A with Guardrails)', async () => {
      const res = await fetch(`${BASE_URL}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'Should I open my windows in the morning smog?',
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.answer || !json.disclaimer) throw new Error('Missing answer or disclaimer');
    })) && allPass;

  console.log(`\n======================================================`);
  if (allPass) {
    console.log(`  ALL SMOKE CHECKS PASSED (100% OPERATIONAL)`);
    console.log(`======================================================\n`);
    process.exit(0);
  } else {
    console.error(`  SOME SMOKE CHECKS FAILED`);
    console.log(`======================================================\n`);
    process.exit(1);
  }
}

runSmoke();
