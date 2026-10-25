'use client';

import React from 'react';
import { Mail } from 'lucide-react';

const RESPONSE_TIMES = [
  { label: 'General inquiries', time: '24–48 hours' },
  { label: 'Account issues', time: '12–24 hours' },
  { label: 'Technical support', time: '24–48 hours' },
  { label: 'Urgent matters', time: '1–12 hours' }
];

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Support</h1>
        <p className="mt-2 text-sm text-gray-400">
          Email us once per issue. We work through the queue in the order requests arrive.
        </p>
      </div>

      <a
        href="mailto:support@shockwave-capital.com"
        className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black px-5 py-4 transition-colors hover:border-white/20"
      >
        <div>
          <p className="text-sm text-gray-400">Email</p>
          <p className="mt-1 text-base font-medium text-white">support@shockwave-capital.com</p>
        </div>
        <Mail size={18} className="shrink-0 text-gray-400" />
      </a>

      <section className="rounded-2xl border border-white/10 bg-black p-5">
        <h2 className="text-base font-semibold text-white">One email per issue</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-400">
          A second email about the same issue moves you to the back of the queue. Include your account, what happened, and any screenshots in the first message.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-white">Typical reply times</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {RESPONSE_TIMES.map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-black px-4 py-3">
              <p className="text-sm text-gray-400">{item.label}</p>
              <p className="mt-1 text-sm font-medium text-white">{item.time}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
