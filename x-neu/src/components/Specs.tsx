'use client';

import { motion } from 'framer-motion';

const specs = [
  {
    category: 'AIRFRAME',
    rows: [
      { label: 'Gövde Tipi', value: 'Loitering Munition / Fixed Wing' },
      { label: 'Gövde Malzeme', value: 'Carbon Fiber Composite' },
      { label: 'Kanat Açıklığı', value: '1.2 m' },
      { label: 'Ağırlık (T/O)', value: '4.8 kg' },
      { label: 'Yük Kapasitesi', value: '0.8 kg' },
    ],
  },
  {
    category: 'PERFORMANCE',
    rows: [
      { label: 'Operasyonel Menzil', value: '200 km' },
      { label: 'Dayanıklılık', value: '4+ saat' },
      { label: 'Cruise Hız', value: '120 km/h' },
      { label: 'Maks. Hız', value: '180 km/h' },
      { label: 'Operasyon İrtifası', value: '50 – 4000 m AGL' },
    ],
  },
  {
    category: 'AVIONICS',
    rows: [
      { label: 'Flight Controller', value: 'Raspberry Pi CM4 + Navio2' },
      { label: 'IMU', value: 'Dual Redundant MPU-6000' },
      { label: 'GPS', value: 'u-blox F9P RTK + INS Backup' },
      { label: 'Veri Linki', value: 'LoRa 915MHz / LTE 4G' },
      { label: 'Şifreleme', value: 'AES-256 / TLS 1.3' },
    ],
  },
  {
    category: 'PAYLOAD',
    rows: [
      { label: 'EO Kamera', value: '4K / 30x Optik Zoom' },
      { label: 'IR Sensör', value: '640×512 Uncooled LWIR' },
      { label: 'AI İşlemci', value: 'Nvidia Jetson Nano' },
      { label: 'Hedef Tanıma', value: 'YOLOv8 Real-time' },
      { label: 'Veri Kaydı', value: '256 GB SSD Onboard' },
    ],
  },
];

export default function Specs() {
  return (
    <section id="specs" className="py-24 bg-[#070710]">
      <div className="max-w-7xl mx-auto px-8">
        {/* Header */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="font-mono-tech text-xs text-[#00d4ff] tracking-[0.3em] mb-4 opacity-70">
            // TECHNICAL DATA SHEET
          </div>
          <h2 className="font-orbitron text-4xl lg:text-5xl font-bold text-white mb-4">
            TEKNİK <span className="text-[#00d4ff]">ÖZELLİKLER</span>
          </h2>
          <div className="w-20 h-px bg-[#00d4ff]" />
        </motion.div>

        {/* Spec tables */}
        <div className="grid md:grid-cols-2 gap-8">
          {specs.map((block, bi) => (
            <motion.div
              key={block.category}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: bi * 0.15 }}
              className="border border-[rgba(0,212,255,0.12)] bg-[rgba(0,212,255,0.02)]"
            >
              {/* Category header */}
              <div className="px-6 py-3 border-b border-[rgba(0,212,255,0.12)] flex items-center gap-3">
                <div className="w-1.5 h-1.5 bg-[#00d4ff]" />
                <span className="font-mono-tech text-xs text-[#00d4ff] tracking-[0.3em]">
                  {block.category}
                </span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-[rgba(0,212,255,0.05)]">
                {block.rows.map((row) => (
                  <div key={row.label} className="flex justify-between items-center px-6 py-3.5 group hover:bg-[rgba(0,212,255,0.04)] transition-colors">
                    <span className="font-rajdhani text-sm text-gray-500 group-hover:text-gray-400 transition-colors">
                      {row.label}
                    </span>
                    <span className="font-mono-tech text-xs text-white tracking-wide">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Classification badge */}
        <motion.div
          className="mt-10 flex items-center gap-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          <div className="w-3 h-3 border border-[#ff4d00] rotate-45" />
          <span className="font-mono-tech text-[10px] text-[#ff4d00] tracking-[0.3em] opacity-70">
            RESTRICTED — FOR AUTHORIZED PERSONNEL ONLY
          </span>
        </motion.div>
      </div>
    </section>
  );
}
