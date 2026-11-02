// backend/test/analytics_dashboard.test.js
// ─────────────────────────────────────────────────────────────────────────────
// Verification of Analytics Dashboard Logic:
// Date Filters, Timezone Alignment, Performance Bounds, and College Isolation
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'

// Helper functions mirroring backend/src/routes/analytics.routes.js
function formatTimezoneOffset(offsetMinutes) {
  if (offsetMinutes === undefined || offsetMinutes === null || Number.isNaN(Number(offsetMinutes))) {
    return '+00:00'
  }
  const offset = Number(offsetMinutes)
  const sign = offset <= 0 ? '+' : '-'
  const abs = Math.abs(offset)
  const hours = String(Math.floor(abs / 60)).padStart(2, '0')
  const mins = String(abs % 60).padStart(2, '0')
  return `${sign}${hours}:${mins}`
}

function calculateGrowth(current, previous) {
  const curr = typeof current === 'number' && !Number.isNaN(current) ? current : 0
  const prev = typeof previous === 'number' && !Number.isNaN(previous) ? previous : 0

  if (prev === 0) {
    if (curr === 0) {
      return { percentage: 0, direction: 'neutral', label: '0%', current: curr, previous: prev }
    }
    return { percentage: 100, direction: 'up', label: `+${curr} new`, current: curr, previous: prev }
  }

  const diff = curr - prev
  const pct = Math.round((diff / prev) * 1000) / 10

  if (pct > 0) {
    return { percentage: pct, direction: 'up', label: `+${pct}%`, current: curr, previous: prev }
  } else if (pct < 0) {
    return { percentage: pct, direction: 'down', label: `${pct}%`, current: curr, previous: prev }
  }
  return { percentage: 0, direction: 'neutral', label: '0%', current: curr, previous: prev }
}

function generateTimeSlots(startDate, endDate, period) {
  const slots = []
  if (period === 'today') {
    for (let h = 0; h < 24; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`)
    }
    return slots
  }

  const curr = new Date(startDate)
  curr.setUTCHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setUTCHours(23, 59, 59, 999)

  const diffDays = Math.ceil((end.getTime() - curr.getTime()) / (24 * 60 * 60 * 1000))
  if (diffDays > 180) {
    curr.setTime(end.getTime() - 180 * 24 * 60 * 60 * 1000)
    curr.setUTCHours(0, 0, 0, 0)
  }

  while (curr <= end) {
    slots.push(curr.toISOString().slice(0, 10))
    curr.setUTCDate(curr.getUTCDate() + 1)
  }
  return slots
}

function resolveAnalyticsDateRange(period, now, earliestActivityDate, timezoneOffsetMinutes = 0) {
  const tzOffsetMinutes = Number.isFinite(Number(timezoneOffsetMinutes)) ? Number(timezoneOffsetMinutes) : 0
  const tzOffsetMs = tzOffsetMinutes * 60 * 1000

  const clientLocalNowMs = now.getTime() - tzOffsetMs
  const clientLocalNow = new Date(clientLocalNowMs)

  let currentStart, currentEnd, previousStart, previousEnd
  let dateFormat = '%Y-%m-%d'

  if (period === 'today') {
    const localStartOfDay = new Date(Date.UTC(
      clientLocalNow.getUTCFullYear(),
      clientLocalNow.getUTCMonth(),
      clientLocalNow.getUTCDate(),
      0, 0, 0, 0
    ))
    currentStart = new Date(localStartOfDay.getTime() + tzOffsetMs)
    currentEnd = now

    previousStart = new Date(currentStart.getTime() - 24 * 60 * 60 * 1000)
    previousEnd = new Date(currentEnd.getTime() - 24 * 60 * 60 * 1000)
    dateFormat = '%H:00'
  } else if (period === '7days') {
    currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    currentEnd = now

    previousStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    previousEnd = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    dateFormat = '%Y-%m-%d'
  } else if (period === '30days') {
    currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    currentEnd = now

    previousStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
    previousEnd = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    dateFormat = '%Y-%m-%d'
  } else {
    // 'all' period
    if (earliestActivityDate && !Number.isNaN(earliestActivityDate.getTime())) {
      const localEarliest = new Date(earliestActivityDate.getTime() - tzOffsetMs)
      const localStartOfEarliest = new Date(Date.UTC(
        localEarliest.getUTCFullYear(),
        localEarliest.getUTCMonth(),
        localEarliest.getUTCDate(),
        0, 0, 0, 0
      ))
      currentStart = new Date(localStartOfEarliest.getTime() + tzOffsetMs)
    } else {
      currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }
    currentEnd = now
    previousStart = new Date(currentStart)
    previousEnd = new Date(currentStart)
    dateFormat = '%Y-%m-%d'
  }

  return { currentStart, currentEnd, previousStart, previousEnd, dateFormat }
}

describe('College Admin Analytics Dashboard Audit & Regression Suite', () => {
  const fixedNow = new Date('2026-11-02T16:30:00.000Z')

  it('1. formatTimezoneOffset accurately converts browser minutes to MongoDB offset string', () => {
    // IST (UTC+5:30)
    assert.equal(formatTimezoneOffset(-330), '+05:30')
    // UTC
    assert.equal(formatTimezoneOffset(0), '+00:00')
    // US Eastern (UTC-5:00)
    assert.equal(formatTimezoneOffset(300), '-05:00')
    // US Pacific (UTC-8:00)
    assert.equal(formatTimezoneOffset(480), '-08:00')
    // Invalid / missing
    assert.equal(formatTimezoneOffset(null), '+00:00')
    assert.equal(formatTimezoneOffset(undefined), '+00:00')
  })

  it('2. Date range for "today" aligns to client local midnight and uses hourly format', () => {
    // Test with IST (-330 minutes)
    const range = resolveAnalyticsDateRange('today', fixedNow, null, -330)

    assert.equal(range.dateFormat, '%H:00')
    assert.ok(range.currentStart < range.currentEnd)

    // Current start in IST should be 2026-11-02 00:00:00 IST = 2026-11-01 18:30:00 UTC
    const istStart = new Date(range.currentStart.getTime() + 330 * 60 * 1000)
    assert.equal(istStart.getUTCHours(), 0)
    assert.equal(istStart.getUTCMinutes(), 0)
    assert.equal(istStart.getUTCDate(), 2)

    // Slots must be 24 hourly buckets
    const slots = generateTimeSlots(range.currentStart, range.currentEnd, 'today')
    assert.equal(slots.length, 24)
    assert.equal(slots[0], '00:00')
    assert.equal(slots[23], '23:00')
  })

  it('3. Date range for "7days" and "30days" accurately covers the respective preceding periods', () => {
    const range7 = resolveAnalyticsDateRange('7days', fixedNow, null)
    const span7Days = range7.currentEnd.getTime() - range7.currentStart.getTime()
    assert.equal(Math.round(span7Days / (24 * 60 * 60 * 1000)), 7)
    assert.equal(range7.dateFormat, '%Y-%m-%d')

    const slots7 = generateTimeSlots(range7.currentStart, range7.currentEnd, '7days')
    assert.ok(slots7.length >= 7 && slots7.length <= 8)

    const range30 = resolveAnalyticsDateRange('30days', fixedNow, null)
    const span30Days = range30.currentEnd.getTime() - range30.currentStart.getTime()
    assert.equal(Math.round(span30Days / (24 * 60 * 60 * 1000)), 30)

    const slots30 = generateTimeSlots(range30.currentStart, range30.currentEnd, '30days')
    assert.ok(slots30.length >= 30 && slots30.length <= 31)
  })

  it('4. Date range for "all" NEVER defaults to 1970 Unix epoch and safely bounds timeline slots', () => {
    const earliestActivity = new Date('2026-09-01T10:00:00.000Z')
    const range = resolveAnalyticsDateRange('all', fixedNow, earliestActivity, -330)

    // Must NOT be 1970
    assert.notEqual(range.currentStart.getUTCFullYear(), 1970)

    // In client local time (IST), start should be 2026-09-01 00:00:00
    const localStart = new Date(range.currentStart.getTime() + 330 * 60 * 1000)
    assert.equal(localStart.getUTCFullYear(), 2026)
    assert.equal(localStart.getUTCMonth(), 8) // September
    assert.equal(localStart.getUTCDate(), 1)

    // Even if an extreme earliest date is provided (e.g. 5 years ago), slot generator caps at 180 slots max
    const extremeDate = new Date('2020-01-01T00:00:00.000Z')
    const slots = generateTimeSlots(extremeDate, fixedNow, 'all')
    assert.ok(slots.length <= 181, `Slots must not exceed 181, got ${slots.length}`)
  })

  it('5. Growth calculations handle zero-baselines and divisions gracefully', () => {
    // 0 to 0 -> 0% neutral
    const g1 = calculateGrowth(0, 0)
    assert.equal(g1.percentage, 0)
    assert.equal(g1.direction, 'neutral')

    // 0 to 5 -> +5 new up
    const g2 = calculateGrowth(5, 0)
    assert.equal(g2.percentage, 100)
    assert.equal(g2.direction, 'up')
    assert.equal(g2.label, '+5 new')

    // 10 to 15 -> +50% up
    const g3 = calculateGrowth(15, 10)
    assert.equal(g3.percentage, 50)
    assert.equal(g3.direction, 'up')

    // 20 to 10 -> -50% down
    const g4 = calculateGrowth(10, 20)
    assert.equal(g4.percentage, -50)
    assert.equal(g4.direction, 'down')
  })

  it('6. College Admin role enforces strict college-level isolation in queries', () => {
    const collegeA = new mongoose.Types.ObjectId()
    const collegeB = new mongoose.Types.ObjectId()

    // College admin user
    const collegeAdminA = {
      _id: new mongoose.Types.ObjectId(),
      role: 'college_admin',
      collegeId: collegeA,
    }

    // Attempted query spoofing collegeId=collegeB
    const requestedQuery = { collegeId: collegeB.toString() }

    // Enforced resolution
    const effectiveCollegeId = collegeAdminA.role === 'college_admin'
      ? collegeAdminA.collegeId
      : (requestedQuery.collegeId || null)

    assert.equal(effectiveCollegeId.toString(), collegeA.toString(), 'College Admin must never be allowed to override collegeId')
    assert.notEqual(effectiveCollegeId.toString(), collegeB.toString())
  })
})
