'use client';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[rgba(0,212,255,0.08)] bg-[#050508] py-10">
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative w-6 h-6">
              <div className="absolute inset-0 border border-[#00d4ff] rotate-45 scale-75" />
              <div className="absolute inset-0 border border-[#ff4d00] rotate-[30deg] scale-50 opacity-70" />
            </div>
            <span className="font-orbitron font-black text-sm text-white tracking-widest">
              X<span className="text-[#00d4ff]">-</span>NEU
            </span>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-6">
            {[
              { label: 'Özellikler', href: '#features' },
              { label: 'Teknik Specs', href: '#specs' },
              { label: 'Simülatör', href: '#simulator' },
              { label: 'İletişim', href: '#contact' },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="font-rajdhani text-xs text-gray-600 hover:text-[#00d4ff] transition-colors uppercase tracking-wider"
              >
                {l.label}
              </a>
            ))}
          </nav>

          {/* Copyright */}
          <div className="font-mono-tech text-[10px] text-gray-700 tracking-widest text-center">
            © {year} X-NEU DEFENSE SYSTEMS
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-[rgba(0,212,255,0.05)] text-center">
          <p className="font-mono-tech text-[9px] text-gray-800 tracking-widest">
            RESTRICTED — EXPORT CONTROLLED UNDER APPLICABLE REGULATIONS — FOR AUTHORIZED USE ONLY
          </p>
        </div>
      </div>
    </footer>
  );
}
