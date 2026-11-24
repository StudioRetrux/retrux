import { ChromeNav, HeroSection } from "./components/HeroOverlay";
import { HeroExperience } from "./hero/HeroExperience";

export default function Home() {
  return (
    <main className="relative h-dvh w-screen overflow-hidden">
      <HeroExperience />
      <ChromeNav />
      <HeroSection />
    </main>
  );
}
