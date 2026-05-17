'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

const stats = [
  { value: 200, suffix: 'km', label: 'Operasyonel Menzil', color: '#00d4ff' },
  { value: 4, suffix: 'h', label: 'Görev Süresi', color: '#00ff88' },
  { value: 180, suffix: 'km/h', label: 'Maksimum Hız', color: '#00d4ff' },
  { value: 99.7, suffix: '%', label: 'Hedef İsabet', color: '#ff4d00' },
];

function Counter({ target, suffix, color }: { target: number; suffix: string; color: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null!);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const interval = setInterval(() => {
      current = Math.min(current + increment, target);
      setCount(parseFloat(current.toFixed(1)));
      if (current >= target) clearInterval(interval);
    }, duration / steps);
    return () => clearInterval(interval);
  }, [inView, target]);

  return (
    <div ref={ref} className="font-orbitron text-5xl font-black" style={{ color }}>
      {count % 1 === 0 ? Math.floor(count) : count}
      <span className="text-2xl ml-1">{suffix}</span>
    </div>
  );
}

export default function Stats() {
  return (
    <section className="py-20 border-y border-[rgba(0,212,255,0.08)] bg-[#070710]">
      <div className="max-w-7xl mx-auto px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              className="text-center hud-border p-6 bg-[rgba(0,212,255,0.02)]"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
            >
              <Counter target={s.value} suffix={s.suffix} color={s.color} />
              <div className="font-mono-tech text-xs text-gray-500 mt-3 tracking-widest uppercase">
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
