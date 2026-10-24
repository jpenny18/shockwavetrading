'use client';

import { useRouter } from 'next/navigation';

export default function VipOrderReceived() {
  const router = useRouter();

  return (
    <div className="relative z-10 mx-auto max-w-4xl">
      <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#0FF1CE] to-[#00D9FF]">
        <svg className="h-12 w-12 text-black" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      </div>

      <h1 className="mb-4 bg-gradient-to-r from-[#0FF1CE] to-[#00D9FF] bg-clip-text text-3xl font-extrabold text-transparent md:mb-6 md:text-5xl lg:text-6xl">
        VIP Order Received!
      </h1>

      <p className="mx-auto mb-8 max-w-3xl text-base leading-relaxed text-gray-300 md:text-lg lg:text-xl">
        Your VIP allocation payment has been received! We&apos;re now setting up your account and dedicated VIP infrastructure.
      </p>

      <div className="mx-auto mb-8 max-w-2xl rounded-2xl border border-[#0FF1CE]/20 bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 p-8 backdrop-blur-sm">
        <h2 className="mb-6 text-2xl font-bold text-[#0FF1CE]">What happens next?</h2>
        <div className="space-y-4 text-left">
          {[
            ['1', 'Account Setup (2-4 hours)', "We're configuring your VIP allocation and provisioning your access to the Shockwave Capital VIP Dashboard."],
            ['2', 'Dedicated Account Manager Assigned', 'Your personal account manager will reach out via email to handle onboarding, credentials, and any questions — available 24/7.'],
            ['3', 'Start Trading', 'Trade with simple rules: 15% max drawdown, 8% daily drawdown, no consistency requirements, and no unnecessary restrictions.'],
          ].map(([step, title, copy]) => (
            <div key={step} className="flex items-start space-x-4">
              <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#0FF1CE]">
                <span className="text-sm font-bold text-black">{step}</span>
              </div>
              <div>
                <h3 className="mb-1 font-semibold text-white">{title}</h3>
                <p className="text-sm text-gray-400">{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Max DD', value: '15%' },
          { label: 'Daily DD', value: '8%' },
          { label: 'Leverage', value: '1:100' },
          { label: 'Profit Split', value: '80%' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl bg-gradient-to-br from-[#0FF1CE]/20 to-[#0FF1CE]/5 p-4 text-center">
            <div className="text-xl font-bold text-[#0FF1CE]">{item.value}</div>
            <div className="text-sm text-gray-300">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col justify-center gap-4 md:flex-row">
        <button
          onClick={() => router.push('/dashboard')}
          className="rounded-xl bg-gradient-to-r from-[#0FF1CE] to-[#00D9FF] px-8 py-4 text-lg font-bold text-black transition-transform hover:scale-105"
        >
          Go to Dashboard
        </button>
        <button
          onClick={() => router.push('/support-center')}
          className="rounded-xl border-2 border-[#0FF1CE] px-8 py-4 text-lg font-bold text-[#0FF1CE] transition-colors hover:bg-[#0FF1CE]/10"
        >
          Contact Support
        </button>
      </div>

      <p className="mt-6 text-sm text-gray-400">Welcome to VIP — serious capital, simple rules, dedicated infrastructure.</p>
    </div>
  );
}
