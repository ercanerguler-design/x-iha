'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';

interface FormData {
  name: string;
  company: string;
  role: string;
  phone: string;
  message: string;
}

const initialForm: FormData = { name: '', company: '', role: '', phone: '', message: '' };

export default function Contact() {
  const [form, setForm] = useState<FormData>(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const validate = () => {
    const e: Partial<FormData> = {};
    if (!form.name.trim()) e.name = 'Ad Soyad zorunludur.';
    if (!form.company.trim()) e.company = 'Kurum zorunludur.';
    if (!form.phone.trim() || !/^\+?[\d\s\-]{7,15}$/.test(form.phone))
      e.phone = 'Geçerli bir telefon numarası girin.';
    if (!form.message.trim()) e.message = 'Mesaj alanı boş bırakılamaz.';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSending(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('API error');
      setSubmitted(true);
    } catch {
      // Fallback: open mail client pre-filled
      const subject = encodeURIComponent(`Demo Talebi — ${form.company} / ${form.name}`);
      const body = encodeURIComponent(`İsim: ${form.name}\nŞirket: ${form.company}\nGörev: ${form.role}\nTelefon: ${form.phone}\n\n${form.message}`);
      window.location.href = `mailto:sce@scegrup.com?subject=${subject}&body=${body}`;
      setSubmitted(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="contact" className="py-24 bg-[#070710]">
      <div className="max-w-7xl mx-auto px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left: info */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="font-mono-tech text-xs text-[#00d4ff] tracking-[0.3em] mb-4 opacity-70">
              // CONTACT
            </div>
            <h2 className="font-orbitron text-4xl lg:text-5xl font-bold text-white mb-6">
              DEMO <span className="text-[#00d4ff]">TALEP</span>
            </h2>
            <div className="w-20 h-px bg-[#00d4ff] mb-8" />
            <p className="font-rajdhani text-base text-gray-400 leading-relaxed mb-8">
              X-NEU sistemine ilişkin demo, teknik brifing veya tedarik sorgulamaları için formu doldurun.
              Yetkili satış temsilcimiz 24 saat içinde sizinle iletişime geçecektir.
            </p>

            <div className="space-y-4">
              {[
                { label: 'CLASSIFICATION', value: 'RESTRICTED' },
                { label: 'RESPONSE TIME', value: '< 24 HOURS' },
                { label: 'TARGET MARKET', value: 'DEFENSE PROCUREMENT' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between border-b border-[rgba(0,212,255,0.08)] pb-3">
                  <span className="font-mono-tech text-[10px] text-gray-600 tracking-widest">{item.label}</span>
                  <span className="font-mono-tech text-[10px] text-[#00d4ff] tracking-widest">{item.value}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: form */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            {submitted ? (
              <div className="hud-border p-10 text-center">
                <div className="font-mono-tech text-[#00ff88] text-xs tracking-[0.3em] mb-3">// TRANSMISSION SENT</div>
                <h3 className="font-orbitron text-2xl text-white mb-4">Talebiniz Alındı</h3>
                <p className="font-rajdhani text-gray-400">24 saat içinde yetkili personel sizinle iletişime geçecektir.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="hud-border p-8 space-y-5">
                {/* Name */}
                <Field
                  label="AD SOYAD *"
                  value={form.name}
                  error={errors.name}
                  onChange={(v) => setForm({ ...form, name: v })}
                  placeholder="Yusuf Kılıç"
                />
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="KURUM *"
                    value={form.company}
                    error={errors.company}
                    onChange={(v) => setForm({ ...form, company: v })}
                    placeholder="SSB / TAF"
                  />
                  <Field
                    label="GÖREV"
                    value={form.role}
                    onChange={(v) => setForm({ ...form, role: v })}
                    placeholder="Tedarik Uzmanı"
                  />
                </div>
                <Field
                  label="TELEFON *"
                  value={form.phone}
                  error={errors.phone}
                  onChange={(v) => setForm({ ...form, phone: v })}
                  placeholder="+90 5XX XXX XX XX"
                  type="tel"
                />
                <div>
                  <label className="font-mono-tech text-[10px] text-gray-600 tracking-widest block mb-2">
                    MESAJ *
                  </label>
                  <textarea
                    rows={4}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Demo veya teknik brifing talebinizi belirtin..."
                    className="w-full bg-[rgba(0,212,255,0.03)] border border-[rgba(0,212,255,0.15)] text-white text-sm font-rajdhani px-4 py-3 outline-none focus:border-[#00d4ff] transition-colors resize-none placeholder:text-gray-700"
                  />
                  {errors.message && <p className="font-mono-tech text-[10px] text-[#ff4d00] mt-1">{errors.message}</p>}
                </div>

                <button type="submit" disabled={sending} className="btn-danger w-full flex items-center justify-center gap-2 py-3 disabled:opacity-60 disabled:cursor-not-allowed">
                  {sending ? (
                    <span className="font-mono-tech text-xs tracking-widest animate-pulse">GÖNDERİLİYOR...</span>
                  ) : (
                    <><Send size={15} />Talebi İlet</>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  error,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="font-mono-tech text-[10px] text-gray-600 tracking-widest block mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[rgba(0,212,255,0.03)] border border-[rgba(0,212,255,0.15)] text-white text-sm font-rajdhani px-4 py-3 outline-none focus:border-[#00d4ff] transition-colors placeholder:text-gray-700"
      />
      {error && <p className="font-mono-tech text-[10px] text-[#ff4d00] mt-1">{error}</p>}
    </div>
  );
}
