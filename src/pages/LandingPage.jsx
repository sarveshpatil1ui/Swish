import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import HowItWorks from '../components/HowItWorks'
import Features from '../components/Features'
import ProductPreview from '../components/ProductPreview'
import CommunitySection from '../components/CommunitySection'
import FinalCTA from '../components/FinalCTA'
import Footer from '../components/Footer'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-base-25 dark:bg-base-950 text-base-900 dark:text-white overflow-x-hidden transition-colors duration-200">
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <ProductPreview />
        <CommunitySection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
