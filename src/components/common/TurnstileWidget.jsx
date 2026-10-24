import React, { useEffect, useRef } from 'react'

/**
 * Cloudflare Turnstile Widget Component.
 *
 * If VITE_CLOUDFLARE_TURNSTILE_SITE_KEY is not defined, this component renders
 * nothing and does not block form submissions (ideal for dev & testing).
 *
 * When the site key is provided:
 * 1. Lazily loads the Turnstile script from Cloudflare.
 * 2. Renders the widget in the container.
 * 3. Calls `onVerify(token)` upon successful verification.
 * 4. Calls `onExpire()` or `onError()` when appropriate.
 */
export default function TurnstileWidget({ onVerify, onExpire, onError, theme = 'auto', className = '' }) {
  const containerRef = useRef(null)
  const widgetIdRef = useRef(null)
  const siteKey = import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY

  useEffect(() => {
    if (!siteKey || !containerRef.current) return

    let isMounted = true

    const renderWidget = () => {
      if (!isMounted || !window.turnstile || !containerRef.current) return
      try {
        if (widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current)
          widgetIdRef.current = null
        }
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          callback: (token) => {
            if (isMounted) onVerify?.(token)
          },
          'expired-callback': () => {
            if (isMounted) {
              onVerify?.('')
              onExpire?.()
            }
          },
          'error-callback': (err) => {
            console.error('[Turnstile] Error callback:', err)
            if (isMounted) onError?.(err)
          },
        })
      } catch (err) {
        console.error('[Turnstile] Render error:', err)
      }
    }

    if (window.turnstile) {
      renderWidget()
    } else {
      const existingScript = document.getElementById('cf-turnstile-script')
      if (!existingScript) {
        const script = document.createElement('script')
        script.id = 'cf-turnstile-script'
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
        script.async = true
        script.defer = true
        script.onload = () => {
          if (window.turnstile) {
            window.turnstile.ready(() => renderWidget())
          }
        }
        document.head.appendChild(script)
      } else {
        existingScript.addEventListener('load', () => {
          if (window.turnstile) {
            window.turnstile.ready(() => renderWidget())
          }
        })
      }
    }

    return () => {
      isMounted = false
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {}
        widgetIdRef.current = null
      }
    }
  }, [siteKey, theme])

  if (!siteKey) {
    return null
  }

  return (
    <div className={`flex justify-center my-3 ${className}`}>
      <div ref={containerRef} />
    </div>
  )
}
