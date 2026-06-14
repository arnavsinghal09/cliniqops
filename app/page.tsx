import LandingNav from "@/components/landing/LandingNav";
import Hero from "@/components/landing/Hero";
import FlowSection from "@/components/landing/FlowSection";
import ManifestoBand from "@/components/landing/ManifestoBand";
import TrustStrip from "@/components/landing/TrustStrip";
import Features from "@/components/landing/Features";
import MetricsBand from "@/components/landing/MetricsBand";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg">
      <LandingNav />
      <Hero />
      <FlowSection />
      <ManifestoBand />
      <TrustStrip />
      <Features />
      <MetricsBand />
      <CTA />
      <Footer />
    </div>
  );
}
