import Link from 'next/link';

export const metadata = {
  title: 'Privacy & Data Notice — VayuSaathi',
};

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

      <section className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3 text-sm">
        <h2 className="font-bold text-base text-slate-900">What stays on your device</h2>
        <ul className="list-disc list-inside space-y-1 text-slate-700">
          <li>
            Your household profile (vulnerabilities, purifier setup, commute, budget) is stored in{' '}
            <code>localStorage</code> in your browser.
          </li>
          <li>Completed daily pledges and saved ward pinboard notes stay in your browser.</li>
          <li>Your AI consent preference (Allow vs. Basic mode) stays in your browser.</li>
        </ul>
      </section>

      <section className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3 text-sm">
        <h2 className="font-bold text-base text-slate-900">What is sent to external services</h2>
        <ul className="list-disc list-inside space-y-1 text-slate-700">
          <li>
            <strong>Open-Meteo &amp; WAQI:</strong> City search queries and coordinates rounded to 2
            decimal places (~1 km) to fetch air quality and weather forecasts.
          </li>
          <li>
            <strong>Groq AI (only when AI is enabled and you allow it):</strong> Your question and
            the day&apos;s air quality numbers are sent to Groq&apos;s API to generate a response.
            In Basic mode, nothing is sent to Groq.
          </li>
        </ul>
      </section>
    </main>
  );
}
