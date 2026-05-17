import { CoachesSection } from "./CoachesSection";
import { CtaSection } from "./CtaSection";
import { FeaturesBar } from "./FeaturesBar";
import { FeedbackSection } from "./FeedbackSection";
import { Footer } from "./Footer";
import { HeroSection } from "./HeroSection";
import { HowItWorksSection } from "./HowItWorksSection";
import { LandingAIBackground } from "./LandingAIBackground";
import { Navbar } from "./Navbar";
import { ProblemSection } from "./ProblemSection";
import { ProgressSection } from "./ProgressSection";
import { TwoWaysSection } from "./TwoWaysSection";

/**
 * All landing styles are scoped under #podium-landing via Tailwind utilities.
 * No global CSS — safe for a separate login page to use its own theme.
 */
export function LandingPage() {
  return (
    <div
      id="podium-landing"
      className="relative min-h-screen bg-[#050505] font-[family-name:var(--font-geist-sans)] text-white antialiased"
    >
      <LandingAIBackground />
      <div className="relative z-10">
        <Navbar />
        <main>
          <HeroSection />
          <ProblemSection />
          <TwoWaysSection />
          <HowItWorksSection />
          <CoachesSection />
          <FeedbackSection />
          <ProgressSection />
          <FeaturesBar />
          <CtaSection />
        </main>
        <Footer />
      </div>
    </div>
  );
}
