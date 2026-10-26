import { conflictGuide, spotlight } from "@/lib/guide";
import { ingredients, rules, sources } from "@/lib/knowledge";
import AccountDialog from "./account/AccountDialog";
import CommunityChat from "./account/CommunityChat";
import CheckSection from "./components/CheckSection";
import ConflictGuide from "./components/ConflictGuide";
import Faq from "./components/Faq";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Hero from "./components/Hero";
import HowItWorks from "./components/HowItWorks";
import RoutineBanner from "./components/RoutineBanner";
import Spotlight, { type SpotlightTab } from "./components/Spotlight";

const SPOTLIGHT_TABS: SpotlightTab[] = [
  {
    id: "actives",
    labelKey: "actives",
    tone: "rose",
    items: spotlight(["retinol", "glycolic-acid", "salicylic-acid", "ascorbic-acid"]),
  },
  {
    id: "hydrators",
    labelKey: "hydrators",
    tone: "sage",
    items: spotlight(["sodium-hyaluronate", "ceramide-np", "niacinamide", "panthenol"]),
  },
  {
    id: "watch-outs",
    labelKey: "watchOuts",
    tone: "noir",
    items: spotlight(["fragrance", "limonene", "methylisothiazolinone", "dmdm-hydantoin"]),
  },
];

export default function Home() {
  return (
    <>
      <Header />
      <main id="main">
        <Hero />
        <CheckSection />
        <RoutineBanner />
        <Spotlight tabs={SPOTLIGHT_TABS} />
        <ConflictGuide entries={conflictGuide()} />
        <CommunityChat />
        <HowItWorks counts={{ ingredients: ingredients.length, rules: rules.length, sources: sources.length }} sources={sources} />
        <Faq />
      </main>
      <Footer />
      <AccountDialog />
    </>
  );
}
