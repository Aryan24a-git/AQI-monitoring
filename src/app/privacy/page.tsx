import Link from 'next/link';

export const metadata = {
  title: 'Privacy & Data Notice — VayuSaathi',
};

function PrivacySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3 text-sm">
      <h2 className="font-bold text-base text-slate-900">{title}</h2>
      <ul className="list-disc list-inside space-y-1 text-slate-700">{children}</ul>
    </section>
  );
}

/** Static privacy and data-handling notice explaining device-local storage and AI consent. */
export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6 text-slate-800">
      <div className="space-y-2">
        <Link href="/" className="text-xs font-semibold text-teal-700 underline">
          &larr; Back to VayuSaathi
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Privacy &amp; Data Notice</h1>
        <p className="text-sm text-slate-600">
          VayuSaathi has no user accounts, no login, and no server-side user database.
        </p>
      </div>
      <PrivacySection title="What stays on your device">
        <li>
          Your household profile (vulnerabilities, purifier setup, commute, budget) is stored in{' '}
          <code>localStorage</code> in your browser.
        </li>
        <li>Completed daily pledges and saved ward pinboard notes stay in your browser.</li>
        <li>Your AI consent preference (Allow vs. Basic mode) stays in your browser.</li>
      </PrivacySection>
      <PrivacySection title="What is sent to external services">
        <li>
          <strong>Open-Meteo &amp; WAQI:</strong> City search queries and coordinates rounded to 2
          decimal places (~1 km) to fetch air quality and weather forecasts.
        </li>
        <li>
          <strong>Groq AI (only with your explicit consent):</strong> Both the browser and our
          server API routes (<code>/api/ask</code>, <code>/api/playbook</code>,{' '}
          <code>/api/bulletin</code>) require <code>aiConsent: true</code> before calling Groq.
          Without consent, the server returns the deterministic basic-mode response and never
          contacts Groq.
        </li>
      </PrivacySection>
    </main>
  );
}
