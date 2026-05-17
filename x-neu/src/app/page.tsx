import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Stats from '@/components/Stats';
import Features from '@/components/Features';
import Specs from '@/components/Specs';
import Simulator from '@/components/Simulator';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main id="home">
      <Navbar />
      <Hero />
      <Stats />
      <Features />
      <Specs />
      <Simulator />
      <Contact />
      <Footer />
    </main>
  );
}
