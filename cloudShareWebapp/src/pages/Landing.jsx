import HeroSection from "../components/landing/HeroSection";
import FeatureSection from "../components/landing/FeatureSection";
import PriceSection from "../components/landing/PriceSection";
import TestimonialsSection from "../components/landing/TestimonialsSection";
import CTASection from "../components/landing/CTASection";
import Footer from "../components/landing/Footer";

const Landing = () => {
  return (
    <div className="landing-page bg-gradient-to-b from-gray-50 to-white">
      <HeroSection />
      <FeatureSection />
      <PriceSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Landing;
