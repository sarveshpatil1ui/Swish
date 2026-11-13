import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'

const footerLinks = {
  Navigation: [
    { label: 'Campus Overview', href: '#home' },
    { label: 'Verification Protocol', href: '#how-it-works' },
    { label: 'Capabilities', href: '#features' },
    { label: 'Interface Preview', href: '#preview' },
    { label: 'Why Swish', href: '#community' },
  ],
  Access: [
    { label: 'Student Sign In', to: '/login' },
    { label: 'Join Your Campus', to: '/join' },
    { label: 'Register Your College', to: '/college-onboarding' },
    { label: 'Reset Credentials', to: '/forgot-password' },
  ],
  Governance: [
    { label: 'Institutional Isolation', href: '#how-it-works' },
    { label: 'Community Standards', href: '#features' },
    { label: 'College Admin Portal', to: '/college-onboarding' },
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
    <footer className="bg-base-25 dark:bg-base-950 border-t border-base-200 dark:border-base-800 transition-colors duration-200 text-xs" aria-label="Footer">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12 mb-10">
          
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2 mb-3" aria-label="Swish home">
              <div className="w-6 h-6 rounded-md bg-accent-500 flex items-center justify-center shadow-xs">
                <Zap size={13} className="text-white fill-white" />
              </div>
              <span
                className="font-bold text-base text-base-900 dark:text-white tracking-tight"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Swish
              </span>
            </Link>
            <p className="text-base-500 dark:text-base-400 leading-relaxed mb-3 max-w-[220px]">
              The closed-loop social and communication network for verified higher education campuses.
            </p>
            <p className="text-[11px] font-mono text-base-400">
              Institutional Email Required
            </p>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <p className="font-mono text-[11px] uppercase tracking-wider text-base-900 dark:text-white font-bold mb-3.5">
                {group}
              </p>
              <ul className="space-y-2.5" role="list">
                {links.map(link => (
                  <li key={link.label}>
                    {link.to ? (
                      <Link
                        to={link.to}
                        className="text-base-500 hover:text-base-900 dark:hover:text-base-200 transition-colors"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <button
                        onClick={() => scrollTo(link.href)}
                        className="text-base-500 hover:text-base-900 dark:hover:text-base-200 transition-colors cursor-pointer text-left"
                      >
                        {link.label}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

        </div>

        {/* Bottom Bar */}
        <div className="border-t border-base-200/80 dark:border-base-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-base-400 font-mono text-[11px]">
          <p>© 2026 Swish Campus Systems. Built exclusively for verified academic institutions.</p>
          <div className="flex items-center gap-4">
            <span>Domain Secured</span>
            <span>Closed Perimeter</span>
          </div>
        </div>

      </div>
    </footer>
  )
}
