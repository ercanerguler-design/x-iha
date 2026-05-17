'use client';

import { motion } from 'framer-motion';
import { Radio, Eye, Cpu, Shield, Zap, Navigation } from 'lucide-react';

const features = [
  {
    icon: Eye,
    title: 'AI Hedef Tanıma',
    desc: 'YOLO v8 tabanlı gerçek zamanlı görüntü işleme ile 12 farklı hedef sınıfını milisaniyeler içinde tespit eder.',
    color: '#00d4ff',
    tag: 'AI / ML',
  },
  {
    icon: Radio,
    title: 'Şifreli Veri Linki',
    desc: 'AES-256 şifreleme ve frekans atlama teknolojisi ile jam-resistant, 200 km menzilli güvenli iletişim.',
    color: '#00ff88',
    tag: 'COMMS',
  },
  {
    icon: Cpu,
    title: 'Otonom Uçuş',
    desc: 'ArduPilot tabanlı flight controller ile waypoint navigasyon, BVLOS operasyon ve otomatik görev planlaması.',
    color: '#00d4ff',
    tag: 'AUTOPILOT',
  },
  {
    icon: Shield,
    title: 'Anti-Jam GPS',
    desc: 'GPS redde dayanıklı INS/IMU entegrasyonu. Sinyal kesilmesi durumunda ataletsel navigasyona geçiş.',
    color: '#ff4d00',
    tag: 'NAV',
  },
  {
    icon: Zap,
    title: 'Hızlı Konuşlanma',
    desc: 'Man-portable tasarım, 15 dakika kurulum süresi. Kompakt kapsüleden fırlatma imkânı.',
    color: '#00ff88',
    tag: 'DEPLOY',
  },
  {
    icon: Navigation,
    title: 'Termal + EO Kamera',
    desc: '30x optik zoom EO kamera ve 640x512 uncooled termal sensör ile gece/gündüz görev kapasitesi.',
    color: '#00d4ff',
    tag: 'ISR',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 grid-bg">
      <div className="max-w-7xl mx-auto px-8">
        {/* Section header */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="font-mono-tech text-xs text-[#00d4ff] tracking-[0.3em] mb-4 opacity-70">
            // CAPABILITY OVERVIEW
          </div>
          <h2 className="font-orbitron text-4xl lg:text-5xl font-bold text-white mb-4">
            SİSTEM <span className="text-[#00d4ff]">KAPASİTELERİ</span>
          </h2>
          <div className="w-20 h-px bg-[#00d4ff]" />
        </motion.div>

        {/* Feature grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                className="group relative hud-border p-6 bg-[rgba(10,10,18,0.8)] hover:bg-[rgba(0,212,255,0.04)] transition-colors duration-300 cursor-default"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                {/* Tag */}
                <div
                  className="absolute top-4 right-4 font-mono-tech text-[10px] tracking-widest px-2 py-1"
                  style={{ color: f.color, border: `1px solid ${f.color}30` }}
                >
                  {f.tag}
                </div>

                {/* Icon */}
                <div
                  className="w-12 h-12 flex items-center justify-center mb-5 border"
                  style={{ borderColor: `${f.color}30`, background: `${f.color}08` }}
                >
                  <Icon size={22} style={{ color: f.color }} />
                </div>

                <h3 className="font-orbitron font-bold text-base text-white mb-3 tracking-wide">
                  {f.title}
                </h3>
                <p className="font-rajdhani text-sm text-gray-500 leading-relaxed">
                  {f.desc}
                </p>

                {/* Hover accent line */}
                <div
                  className="absolute bottom-0 left-0 w-0 h-px group-hover:w-full transition-all duration-500"
                  style={{ background: f.color }}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
