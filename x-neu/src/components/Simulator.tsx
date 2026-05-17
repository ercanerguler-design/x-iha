'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import type { SimulatorCanvasProps, TelemetryData } from './SimulatorScene';

// Three.js must be client-only — no SSR
const SimulatorCanvas = dynamic<SimulatorCanvasProps>(
  () => import('./SimulatorScene').then((m) => ({ default: m.SimulatorCanvas as React.ComponentType<SimulatorCanvasProps> })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#050508]">
        <span className="font-mono-tech text-xs text-[#00d4ff] animate-pulse tracking-widest">
          LOADING TACTICAL MAP...
        </span>
      </div>
    ),
  },
);

const DEFAULTS: TelemetryData = {
  altitude: 250, speed: 162, heading: 45, battery: 100,
  lat: 39.9334, lng: 32.8597, missionTime: 0,
};

function pad3(n: number) { return Math.round(n).toString().padStart(3, '0'); }
function fmtTime(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

export default function Simulator() {
  const telRef = useRef<TelemetryData>({ ...DEFAULTS });
  const [tel, setTel] = useState<TelemetryData>({ ...DEFAULTS });
  const [lockedTargets, setLockedTargets] = useState<number[]>([]);

  const handleTelemetry = useCallback((d: Partial<TelemetryData>) => {
    Object.assign(telRef.current, d);
  }, []);

  const handleTargetLock = useCallback((idx: number) => {
    setLockedTargets((prev) => (prev.includes(idx) ? prev : [...prev, idx]));
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTel({ ...telRef.current }), 125);
    return () => clearInterval(id);
  }, []);

  const battColor = tel.battery > 50 ? '#00ff88' : tel.battery > 20 ? '#ffaa00' : '#ff4d00';

  return (
    <section id="simulator" className="py-24 bg-[#050508]">
      <div className="max-w-7xl mx-auto px-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-end justify-between mb-8"
        >
          <div>
            <div className="font-mono-tech text-xs text-[#00d4ff] tracking-[0.3em] mb-3 opacity-70">
              // MISSION CONTROL INTERFACE
            </div>
            <h2 className="font-orbitron text-4xl lg:text-5xl font-bold text-white">
              WEB <span className="text-[#00d4ff]">SİMÜLATÖR</span>
            </h2>
          </div>
          <div className="hidden md:flex items-center gap-4 pb-1">
            <span className="font-mono-tech text-xs text-[#00ff88] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse inline-block" />
              LIVE
            </span>
            <span className="font-mono-tech text-[10px] text-[#ff4d00] border border-[#ff4d00] px-2 py-0.5">
              ARMED
            </span>
          </div>
        </motion.div>

        {/* Main grid: canvas + right panel */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_272px] gap-4">

          {/* Canvas + HUD overlays */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="relative overflow-hidden border border-[rgba(0,212,255,0.15)]"
            style={{ height: 520 }}
          >
            {/* Corner marks */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#00d4ff] z-10 pointer-events-none" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#00d4ff] z-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#00d4ff] z-10 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#00d4ff] z-10 pointer-events-none" />

            <SimulatorCanvas
              onTelemetry={handleTelemetry}
              lockedTargets={lockedTargets}
              onTargetLock={handleTargetLock}
            />

            {/* GPS — top left */}
            <div className="absolute top-4 left-5 z-10 font-mono-tech text-[10px] text-[#00d4ff] space-y-0.5 pointer-events-none opacity-80">
              <div>LAT {tel.lat.toFixed(4)}°N</div>
              <div>LNG {tel.lng.toFixed(4)}°E</div>
              <div className="text-[#00ff88]">GPS ● LOCK</div>
            </div>

            {/* Mission time — top right */}
            <div className="absolute top-4 right-5 z-10 font-mono-tech text-[10px] text-right space-y-0.5 pointer-events-none opacity-80">
              <div className="text-[#00d4ff]">T+ {fmtTime(tel.missionTime)}</div>
              <div className="text-[#ffaa00]">AUTONOMOUS</div>
            </div>

            {/* Speed / heading / altitude — bottom */}
            <div className="absolute bottom-4 left-5 right-5 z-10 flex justify-between items-end pointer-events-none">
              <div className="font-mono-tech">
                <div className="text-[9px] text-[#6b7280] mb-0.5">AIRSPEED</div>
                <div className="text-white text-base font-bold leading-none">
                  {tel.speed} <span className="text-[9px] text-[#6b7280]">km/h</span>
                </div>
              </div>
              <div className="font-mono-tech text-center">
                <div className="text-[9px] text-[#6b7280] mb-0.5">HEADING</div>
                <div className="text-[#00d4ff] text-xl font-bold leading-none">{pad3(tel.heading)}°</div>
              </div>
              <div className="font-mono-tech text-right">
                <div className="text-[9px] text-[#6b7280] mb-0.5">ALTITUDE</div>
                <div className="text-white text-base font-bold leading-none">
                  {tel.altitude} <span className="text-[9px] text-[#6b7280]">m</span>
                </div>
              </div>
            </div>

            {/* Scanline */}
            <div
              className="absolute inset-0 pointer-events-none z-10 opacity-20"
              style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,212,255,0.025) 2px,rgba(0,212,255,0.025) 4px)' }}
            />
          </motion.div>

          {/* Right panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col gap-3"
          >
            {/* Battery */}
            <div className="hud-border p-4">
              <div className="font-mono-tech text-[10px] text-[#6b7280] tracking-widest mb-2">POWER / BATTERY</div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-[#1a2030] rounded-sm overflow-hidden">
                  <div
                    className="h-full transition-all duration-300 rounded-sm"
                    style={{ width: `${tel.battery}%`, backgroundColor: battColor }}
                  />
                </div>
                <span className="font-mono-tech text-xs" style={{ color: battColor }}>
                  {Math.round(tel.battery)}%
                </span>
              </div>
            </div>

            {/* Telemetry */}
            <div className="hud-border p-4 space-y-2.5">
              <div className="font-mono-tech text-[10px] text-[#6b7280] tracking-widest mb-1">TELEMETRY</div>
              {(
                [
                  ['ALTITUDE', `${tel.altitude} m`],
                  ['AIRSPEED', `${tel.speed} km/h`],
                  ['HEADING', `${pad3(tel.heading)}°`],
                ] as [string, string][]
              ).map(([label, value]) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="font-mono-tech text-[10px] text-[#6b7280]">{label}</span>
                  <span className="font-mono-tech text-xs text-[#00d4ff]">{value}</span>
                </div>
              ))}
            </div>

            {/* Target status */}
            <div className="hud-border p-4">
              <div className="font-mono-tech text-[10px] text-[#6b7280] tracking-widest mb-3">TARGET STATUS</div>
              {(['TGT-01', 'TGT-02', 'TGT-03'] as const).map((tgt, i) => {
                const isLocked = lockedTargets.includes(i);
                return (
                  <div key={tgt} className="flex justify-between items-center py-1.5 border-b border-[#1a2030] last:border-0">
                    <span className="font-mono-tech text-[10px] text-[#e8e8e8]">{tgt}</span>
                    <span className="font-mono-tech text-[10px]" style={{ color: isLocked ? '#ff4d00' : '#6b7280' }}>
                      {isLocked ? '◉ LOCKED' : '○ SCAN'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Waypoints */}
            <div className="hud-border p-4">
              <div className="font-mono-tech text-[10px] text-[#6b7280] tracking-widest mb-3">WAYPOINTS</div>
              {['WP-01', 'WP-02', 'WP-03', 'WP-04', 'WP-05', 'WP-06'].map((wp) => (
                <div key={wp} className="flex justify-between items-center py-1">
                  <span className="font-mono-tech text-[10px] text-[#6b7280]">{wp}</span>
                  <span className="font-mono-tech text-[10px] text-[#00ff88]">● ACTIVE</span>
                </div>
              ))}
            </div>

            <a href="#contact">
              <button className="btn-primary w-full text-xs tracking-widest">DEMO ERİŞİMİ İSTE</button>
            </a>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-5 text-center font-mono-tech text-[10px] text-[#6b7280]"
        >
          Fareyi sürükle → kamera · Scroll → zoom ·&nbsp;
          <span className="text-[#00d4ff]">Unreal Engine 5 versiyonu geliştirme aşamasında</span>
        </motion.p>
      </div>
    </section>
  );
}
