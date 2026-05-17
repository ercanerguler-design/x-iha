import type { Metadata } from "next";
import { Orbitron, Rajdhani, Share_Tech_Mono } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-orbitron",
});

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-rajdhani",
});

const shareTechMono = Share_Tech_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-share-tech-mono",
});

export const metadata: Metadata = {
  title: "X-NEU | Loitering Munition System",
  description: "Next-generation autonomous loitering munition system for modern defense operations.",
  keywords: ["UAV", "loitering munition", "defense", "autonomous", "kamikaze drone"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className={`${orbitron.variable} ${rajdhani.variable} ${shareTechMono.variable} min-h-full flex flex-col bg-[#050508]`}>{children}</body>
    </html>
  );
}
