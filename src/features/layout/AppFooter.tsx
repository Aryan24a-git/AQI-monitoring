'use client';

import React from 'react';
import Link from 'next/link';

/** App footer. */
export function AppFooter() {
  return (
    <footer className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-20 md:pb-6 text-xs text-slate-600 border-t border-stone-200/80 flex flex-col sm:flex-row items-center justify-between gap-2">
      <p>
        Data:{' '}
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-900 inline-flex items-center min-h-[44px]"
        >
          Open-Meteo
        </a>{' '}
        (CC BY 4.0) &bull;{' '}
        <a
          href="https://aqicn.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-900 inline-flex items-center justify-center min-w-[44px] min-h-[44px]"
        >
          WAQI
        </a>{' '}
        &bull; AI: Groq (openai/gpt-oss-120b)
      </p>
      <p>
        Informational only, not medical advice &bull;{' '}
        <Link
          href="/privacy"
          className="underline hover:text-slate-900 inline-flex items-center min-h-[44px]"
        >
          Privacy &amp; Data Notice
        </Link>
      </p>
    </footer>
  );
}
