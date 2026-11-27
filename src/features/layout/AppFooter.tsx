'use client';

import React from 'react';
import Link from 'next/link';

export function AppFooter() {
  return (
    <footer className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-4 text-[11px] text-slate-600 border-t border-stone-200/80 flex flex-col sm:flex-row items-center justify-between gap-2">
      <p>
        Data:{' '}
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-900"
        >
          Open-Meteo
        </a>{' '}
        (CC BY 4.0) &bull;{' '}
        <a
          href="https://aqicn.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-900"
        >
          WAQI
        </a>{' '}
        &bull; AI: Groq (openai/gpt-oss-120b)
      </p>
      <p>
        No accounts &bull; Profile stays in browser &bull;{' '}
        <Link href="/privacy" className="underline hover:text-slate-900">
          Privacy &amp; Data Notice
        </Link>
      </p>
    </footer>
  );
}
