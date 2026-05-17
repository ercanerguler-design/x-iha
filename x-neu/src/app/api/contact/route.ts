import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, company, role, phone, message } = body as Record<string, string>;

    if (!name?.trim() || !company?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Eksik zorunlu alan' }, { status: 400 });
    }

    // If SMTP not configured, return 503 so client falls back to mailto
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return NextResponse.json({ error: 'SMTP_NOT_CONFIGURED' }, { status: 503 });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"X-IHA Demo" <${process.env.SMTP_USER}>`,

      to: 'sce@scegrup.com',
      subject: `[X-IHA] Demo Talebi — ${company} / ${name}`,
      html: `
        <div style="font-family:monospace;background:#050508;color:#e8e8e8;padding:24px;border:1px solid #00d4ff;max-width:600px;">
          <h2 style="color:#00d4ff;margin-top:0;font-family:sans-serif;">X-IHA — Demo Talebi</h2>
          <table style="width:100%;border-collapse:collapse;border-top:1px solid #1a2030;">
            <tr><td style="padding:8px 12px;color:#6b7280;width:110px;">İsim</td><td style="padding:8px 12px;">${name}</td></tr>
            <tr style="background:#0a0a12;"><td style="padding:8px 12px;color:#6b7280;">Şirket</td><td style="padding:8px 12px;">${company}</td></tr>
            <tr><td style="padding:8px 12px;color:#6b7280;">Görev</td><td style="padding:8px 12px;">${role || '—'}</td></tr>
            <tr style="background:#0a0a12;"><td style="padding:8px 12px;color:#6b7280;">Telefon</td><td style="padding:8px 12px;">${phone || '—'}</td></tr>
          </table>
          <div style="margin-top:16px;padding:16px;border-top:1px solid #1a2030;">
            <p style="color:#6b7280;margin:0 0 8px;">Mesaj:</p>
            <p style="margin:0;white-space:pre-wrap;">${message}</p>
          </div>
          <p style="margin-top:20px;font-size:11px;color:#444;">Bu e-posta X-IHA landing page üzerinden otomatik gönderilmiştir.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Contact API]', err);
    return NextResponse.json({ error: 'Mail gönderilemedi' }, { status: 500 });
  }
}
