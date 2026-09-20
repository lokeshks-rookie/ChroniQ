import Hero from './sections/Hero';
import SearchBar from './sections/SearchBar';
import HowItWorks from './sections/HowItWorks';
import FeaturedHospitals from './sections/FeaturedHospitals';
import StatsBand from './sections/StatsBand';

export default function LandingPage() {
  return (
    <main id="main-content">
      {/* 1 — Hero: ink bg, big headline, dual CTAs */}
      <Hero />

      {/* 2 — Search bar: overlaps hero bottom with translateY(50%) */}
      <SearchBar />

      {/* 3 — How it works: base bg (extra top padding for search bar overlap) */}
      <HowItWorks />

      {/* 4 — Featured hospitals: cream-tinted bg, horizontal scroll cards */}
      <FeaturedHospitals />

      {/* 5 — Stats band: ink bg, count-up numbers */}
      <StatsBand />
    </main>
  );
}
