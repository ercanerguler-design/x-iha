'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const links = [
  { label: 'Özellikler', href: '#features' },
  { label: 'Teknik Specs', href: '#specs' },
  { label: 'Simülatör', href: '#simulator' },
  { label: 'İletişim', href: '#contact' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-[rgba(5,5,8,0.95)] border-b border-[rgba(0,212,255,0.15)] backdrop-blur-md'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="#home" className="flex items-center gap-3">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 border border-[#00d4ff] rotate-45 scale-75" />
            <div className="absolute inset-0 border border-[#ff4d00] rotate-[30deg] scale-50 opacity-70" />
          </div>
          <span className="font-orbitron font-black text-lg text-white tracking-widest">
            X<span className="text-[#00d4ff]">-</span>NEU
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="font-rajdhani font-semibold text-sm tracking-[0.1em] text-gray-400 hover:text-[#00d4ff] transition-colors uppercase relative group"
            >
              {l.label}
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-[#00d4ff] group-hover:w-full transition-all duration-300" />
            </a>
          ))}
          <a href="#contact" className="btn-danger text-xs py-2 px-4">
            Demo Talep
          </a>
        </nav>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-[#00d4ff]"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[rgba(5,5,8,0.98)] border-t border-[rgba(0,212,255,0.1)] px-8 pb-6 pt-4"
          >
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="block font-rajdhani font-semibold text-base text-gray-400 hover:text-[#00d4ff] py-3 border-b border-[rgba(0,212,255,0.05)] uppercase tracking-widest"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </a>
            ))}
            <a href="#contact" className="btn-danger block text-center mt-4">
              Demo Talep
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
