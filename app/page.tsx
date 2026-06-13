import LandingNav from "@/components/landing/LandingNav";
import Hero from "@/components/landing/Hero";
import TrustStrip from "@/components/landing/TrustStrip";
import Features from "@/components/landing/Features";
import MetricsBand from "@/components/landing/MetricsBrand";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

// Server Component shell. Each section is a client component (motion/3D), but
// the page itself ships no JS of its own — keeps the initial HTML lean.
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg">
      <LandingNav />
      <Hero />
      <TrustStrip />
      <Features />
      <MetricsBand />
      <CTA />
      <Footer />
    </div>
  );
}
