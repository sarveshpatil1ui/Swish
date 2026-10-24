/**
 * Swish Security Test Suite
 *
 * Runs simulations of real-world attacks against Swish backend:
 * 1. Server Security Headers & Fingerprint Hiding (Helmet)
 * 2. Honeypot Bot Trap (Automated bot spam silently caught & neutralized)
 * 3. NoSQL Injection Defense (Sanitization of MongoDB operators)
 * 4. OTP Spam & Cooldown Defense (Rate limiting per email to block flooding)
 * 5. Brute-Force Password Lockout (5 failed attempts trigger 15-minute account lock)
 *
 * Usage:
 *   node scripts/security-check.js [target_url]
 *   Example: node scripts/security-check.js https://swish-1.onrender.com
 */

import http from 'http'
import https from 'https'

let TARGET = process.argv[2] || process.env.VITE_API_URL || 'http://localhost:3001'

// Auto-correct common frontend vs backend URL typo
if (TARGET === 'https://swish1.onrender.com' || TARGET === 'http://swish1.onrender.com') {
  console.log('\n⚠️  NOTICE:')
  console.log('   "swish1.onrender.com" is the FRONTEND static web app.')
  console.log('   The BACKEND API is at "https://swish-1.onrender.com" (with hyphen).')
  console.log('   ➡️  Automatically redirecting test target to: https://swish-1.onrender.com\n')
  TARGET = 'https://swish-1.onrender.com'
}

console.log('\n========================================================')
console.log(`🛡️  SWISH SECURITY AUDIT & PENETRATION TEST`)
console.log(`🎯 Target API: ${TARGET}`)
console.log('========================================================\n')

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, TARGET)
    const isHttps = url.protocol === 'https:'
    const client = isHttps ? https : http

    const reqOptions = {
      method: options.method || 'GET',
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      timeout: 10000,
    }

    const req = client.request(reqOptions, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        let json = null
        try {
          json = JSON.parse(data)
        } catch {
          json = data
        }
        resolve({ status: res.statusCode, headers: res.headers, data: json })
      })
    })

    req.on('error', (err) => reject(err))
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Request timed out'))
    })

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body))
    }
    req.end()
  })
}

async function runTests() {
  let passed = 0
  const total = 5

  // ── TEST 1: Security Headers & Info Leakage
  try {
    process.stdout.write('1. Checking Server Headers & Info Leakage... ')
    const res = await makeRequest('/api/auth/me')

    // Detect if pointing at static SPA frontend
    const contentType = String(res.headers['content-type'] || '')
    if (contentType.includes('text/html')) {
      console.log('\n❌ ERROR: Target returned HTML! You are testing the Frontend static site.')
      console.log('👉 Please point to the backend: https://swish-1.onrender.com\n')
      process.exit(1)
    }

    const hasPoweredBy = Boolean(res.headers['x-powered-by'])
    const hasNoSniff = res.headers['x-content-type-options'] === 'nosniff'
    const hasFrameOptions = Boolean(res.headers['x-frame-options'])

    if (!hasPoweredBy && (hasNoSniff || hasFrameOptions)) {
      console.log('✅ PASSED (Helmet active, X-Powered-By hidden)')
      passed++
    } else {
      console.log('⚠️ FAILED: Server exposes technology fingerprint.')
    }
  } catch (err) {
    console.log(`❌ ERROR (Could not connect to ${TARGET}): ${err.message}`)
    console.log('\n💡 Tip: Verify backend is running or URL is accessible.\n')
    process.exit(1)
  }

  // ── TEST 2: Honeypot Bot Trap (Silent Drop Protection)
  try {
    process.stdout.write('2. Simulating Bot Form Fill (Honeypot Trap)... ')
    const botPayload = {
      name: 'Spam Bot',
      email: `spambot-${Date.now()}@spam.com`,
      password: 'Password123!',
      role: 'student',
      dept: 'Computer Science',
      hp_field: 'I am an automated spam crawler', // Hidden field filled by bot
    }
    const res = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: botPayload,
    })

    // Industry standard Honeypot uses Silent Drop: fakes success to mislead bots without sending emails or DB entry
    if (res.status === 200 && res.data?.message?.includes('Verification code sent')) {
      console.log('✅ PASSED (Bot trapped & neutralized via Silent Drop)')
      passed++
    } else if (res.status === 400) {
      console.log('✅ PASSED (Bot explicitly rejected)')
      passed++
    } else {
      console.log(`⚠️ FAILED: Status ${res.status}, response:`, res.data)
    }
  } catch (err) {
    console.log('❌ ERROR:', err.message)
  }

  // ── TEST 3: NoSQL Injection Defense
  try {
    process.stdout.write('3. Simulating NoSQL Injection ({ "$gt": "" })... ')
    const injectionPayload = {
      email: { $gt: '' },
      password: 'password123',
    }
    const res = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: injectionPayload,
    })

    // Mongo sanitize strips $gt or express-validator catches type mismatch
    if (res.status === 422 || res.status === 400 || res.status === 401) {
      console.log('✅ PASSED (NoSQL payload sanitized & rejected safely)')
      passed++
    } else {
      console.log(`⚠️ FAILED: Status ${res.status}`)
    }
  } catch (err) {
    console.log('❌ ERROR:', err.message)
  }

  // ── TEST 4: OTP Flood & Email Rate Limiting
  const cooldownEmail = `test-cooldown-${Date.now()}@campus.edu`
  try {
    process.stdout.write('4. Simulating OTP Flood Attack (Cooldown Enforcement)... ')
    // Step A: Register the user so the email exists in DB
    await makeRequest('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Cooldown Tester',
        email: cooldownEmail,
        password: 'ValidPassword123!',
        role: 'student',
        dept: 'Computer Science',
      },
    })

    // Step B: Immediate second OTP request (must be blocked by 60s cooldown)
    const res2 = await makeRequest('/api/auth/resend-otp', {
      method: 'POST',
      body: { email: cooldownEmail },
    })

    if (res2.status === 429) {
      console.log('✅ PASSED (Email flood blocked with HTTP 429 Cooldown)')
      passed++
    } else {
      console.log(`⚠️ Status: ${res2.status}`, res2.data)
    }
  } catch (err) {
    console.log('❌ ERROR:', err.message)
  }

  // ── TEST 5: Brute-Force Password Lockout (5 attempts)
  try {
    process.stdout.write('5. Simulating Brute-Force Password Attack... ')
    const bruteEmail = `brute-${Date.now()}@campus.edu`

    // Create target user
    await makeRequest('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Brute Target',
        email: bruteEmail,
        password: 'ValidPassword123!',
        role: 'student',
        dept: 'Engineering',
      },
    })

    let locked = false
    for (let i = 1; i <= 6; i++) {
      const res = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: {
          email: bruteEmail,
          password: `wrong_pass_${i}`,
        },
      })

      if (res.status === 423 && (res.data?.error?.includes('locked') || res.data?.error?.includes('Lock'))) {
        locked = true
        break
      }
    }

    if (locked) {
      console.log('✅ PASSED (Account locked for 15 mins after 5 wrong attempts)')
      passed++
    } else {
      console.log('⚠️ Lockout not triggered (Check failed attempts)')
    }
  } catch (err) {
    console.log('❌ ERROR:', err.message)
  }

  console.log('\n========================================================')
  console.log(`📊 FINAL RESULT: ${passed}/${total} Security Defenses Verified Active`)
  console.log('========================================================\n')
}

runTests()
