'use client';

import { Suspense, useRef, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { motion } from 'framer-motion';
import { DroneModel, ParticleField } from './DroneScene';

function TypingText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        setDisplayed(text.slice(0, i + 1));
        i++;
        if (i >= text.length) clearInterval(interval);
      }, 60);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timer);
  }, [text, delay]);
  return <span>{displayed}<span className="animate-pulse">_</span></span>;
}

export default function Hero() {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center grid-bg overflow-hidden"
    >
      {/* Scanlines overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
        }}
      />

      {/* Top status bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center px-8 py-3 border-b border-[rgba(0,212,255,0.1)]">
        <span className="font-mono-tech text-xs text-[#00d4ff] opacity-70">
          SYS // ACTIVE &nbsp;|&nbsp; LINK // SECURE &nbsp;|&nbsp; GPS // LOCK
        </span>
        <span className="font-mono-tech text-xs text-[#ff4d00] opacity-70 animate-pulse">
          ◉ LIVE FEED
        </span>
      </div>

      {/* 3D Canvas */}
      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [0, 0, 6], fov: 50 }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.2} />
          <pointLight position={[5, 5, 5]} intensity={2} color="#00d4ff" />
          <pointLight position={[-5, -5, -5]} intensity={1} color="#ff4d00" />
          <spotLight position={[0, 10, 0]} intensity={3} color="#ffffff" angle={0.3} penumbra={1} />
          <Suspense fallback={null}>
            <DroneModel />
            <ParticleField />
            <Environment preset="night" />
          </Suspense>
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate={false}
            maxPolarAngle={Math.PI / 1.5}
            minPolarAngle={Math.PI / 3}
          />
        </Canvas>
      </div>

      {/* Content overlay - LEFT */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-8 flex flex-col lg:flex-row items-center justify-between">
        <motion.div
          className="max-w-xl"
          initial={{ opacity: 0, x: -60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
            <span className="font-mono-tech text-xs text-[#00ff88] tracking-[0.2em] uppercase">
              Defense Technology
            </span>
          </div>

          {/* Main title */}
          <div className="relative mb-2">
            <h1
              className="font-orbitron text-7xl lg:text-8xl font-black text-white glitch-text leading-none"
              data-text="X-IHA"
            >
              X-IHA
            </h1>
          </div>

          <div className="font-orbitron text-sm tracking-[0.4em] text-[#00d4ff] mb-8 font-medium">
            LOITERING MUNITION SYSTEM
          </div>

          <p className="font-rajdhani text-lg text-gray-400 leading-relaxed mb-10 max-w-md">
            Otonom hedef takibi, uzun menzilli görev kapasitesi ve hassas vuruş
            doğruluğuyla tasarlanmış yeni nesil gezgin mühimmat sistemi.
          </p>

          {/* HUD stat pills */}
          <div className="flex flex-wrap gap-4 mb-10">
            {[
              { label: 'MENZIL', value: '200 KM' },
              { label: 'DAYANIKLILIK', value: '4 SAAT' },
              { label: 'HIZ', value: '180 km/h' },
            ].map((s) => (
              <div key={s.label} className="hud-border px-4 py-2 bg-[rgba(0,212,255,0.03)]">
                <div className="font-mono-tech text-[10px] text-[#00d4ff] tracking-widest opacity-70">{s.label}</div>
                <div className="font-orbitron text-base font-bold text-white">{s.value}</div>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4">
            <a href="#contact" className="btn-danger">
              Demo Talep Et
            </a>
            <a href="#specs" className="btn-primary">
              Teknik Özellikler
            </a>
          </div>
        </motion.div>

        {/* RIGHT side terminal */}
        <motion.div
          className="hidden lg:block w-80 font-mono-tech text-xs text-[#00d4ff] bg-[rgba(5,5,8,0.85)] border border-[rgba(0,212,255,0.15)] p-5 mt-10 lg:mt-0"
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.6 }}
        >
          <div className="text-[#ff4d00] mb-3 tracking-widest">// MISSION BRIEF</div>
          <div className="space-y-1 opacity-80">
            <div><span className="text-[#00ff88]">STATUS</span>: ARMED</div>
            <div><span className="text-[#00ff88]">MODE</span>: AUTONOMOUS</div>
            <div><span className="text-[#00ff88]">ALT</span>: 1200 m AGL</div>
            <div><span className="text-[#00ff88]">BATT</span>: 98%</div>
            <div><span className="text-[#00ff88]">LINK</span>: AES-256 ENC</div>
            <div><span className="text-[#00ff88]">GPS</span>: LOCK [12 SAT]</div>
            <div><span className="text-[#00ff88]">TARGET</span>: <span className="text-[#ff4d00]">ACQUIRED</span></div>
          </div>
          <div className="mt-4 pt-4 border-t border-[rgba(0,212,255,0.1)] text-[10px] opacity-50">
            <TypingText text="> Initializing flight control..." delay={1500} />
          </div>
        </motion.div>
      </div>

      {/* Bottom scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2"
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <span className="font-mono-tech text-[10px] text-[#00d4ff] tracking-[0.3em] opacity-50">SCROLL</span>
        <div className="w-px h-8 bg-gradient-to-b from-[#00d4ff] to-transparent" />
      </motion.div>
    </section>
  );
}
