import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import TrustSection from '../components/TrustSection'
import Features from '../components/Features'
import ProductPreview from '../components/ProductPreview'
import HowItWorks from '../components/HowItWorks'
import CommunitySection from '../components/CommunitySection'
import SecuritySection from '../components/SecuritySection'
import FinalCTA from '../components/FinalCTA'
import Footer from '../components/Footer'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 overflow-x-hidden transition-colors duration-300">
      <Navbar />
      <main>
        <Hero />
        <TrustSection />
        <Features />
        <ProductPreview />
        <HowItWorks />
        <CommunitySection />
        <SecuritySection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
