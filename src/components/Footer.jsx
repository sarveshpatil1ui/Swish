import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'

const footerLinks = {
  Product: [
    { label: 'Home', href: '#home' },
    { label: 'Explore', href: '#features' },
    { label: 'Features', href: '#features' },
    { label: 'About', href: '#community' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'Campus Guidelines', href: '#' },
  ],
  Platform: [
    { label: 'How it Works', href: '#how-it-works' },
    { label: 'Security', href: '#security' },
    { label: 'Community', href: '#community' },
  ],
}

function scrollTo(href) {
  if (href.startsWith('#')) {
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }
}

export default function Footer() {
  return (
    <footer className="bg-slate-50 dark:bg-gray-900 border-t border-slate-200 dark:border-gray-800 transition-colors duration-300" aria-label="Footer">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2 mb-4" aria-label="Swish home">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Zap size={14} className="text-white fill-white" />
              </div>
              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="font-extrabold text-lg text-slate-900 dark:text-white">Swish</span>
            </Link>
            <p className="text-slate-500 dark:text-gray-400 text-sm leading-relaxed mb-2 max-w-[180px]">
              Your Campus. Your Community.
            </p>
            <p className="text-slate-400 dark:text-gray-600 text-xs max-w-[200px]">
              A private social network for verified campus communities.
            </p>
          </div>

          {/* Link groups */}
          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <p className="text-slate-900 dark:text-white font-semibold text-sm mb-4">{group}</p>
              <ul className="space-y-3" role="list">
                {links.map(link => (
                  <li key={link.label}>
                    {link.href.startsWith('#') ? (
                      <button
                        onClick={() => scrollTo(link.href)}
                        className="text-slate-500 dark:text-gray-500 hover:text-slate-900 dark:hover:text-gray-300 text-sm transition-colors duration-150"
                      >
                        {link.label}
                      </button>
                    ) : (
                      <a
                        href={link.href}
                        className="text-slate-500 dark:text-gray-500 hover:text-slate-900 dark:hover:text-gray-300 text-sm transition-colors duration-150"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 dark:border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-slate-400 dark:text-gray-600 text-sm">© 2026 Swish. Built for campus communities.</p>
          <p className="text-slate-300 dark:text-gray-700 text-xs">Crafted with ♥ for students</p>
        </div>
      </div>
    </footer>
  )
}
