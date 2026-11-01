// backend/test/college_reconciliation.test.js
// ─────────────────────────────────────────────────────────────────────────────
// College & Department Reconciliation Verification Suite
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import {
  generateDeptCode,
  buildCollegeUserFilter,
  isUserInCollege,
} from '../src/services/college-reconciliation.service.js'

describe('College & Department Reconciliation Service', () => {
  const mockCollegeId = new mongoose.Types.ObjectId()
  const mockCollege = {
    _id: mockCollegeId,
    name: 'Datta Meghe College of Engineering',
    code: 'DMCE',
    domain: 'dmce.ac.in',
  }

  it('1. generateDeptCode accurately generates codes for known and custom departments', () => {
    const existing = new Set(['IT'])

    assert.equal(generateDeptCode('Information Technology'), 'IT')
    // Collision handling:
    assert.equal(generateDeptCode('Information Technology', existing), 'IT1')
    assert.equal(generateDeptCode('Computer Engineering'), 'CE')
    assert.equal(generateDeptCode('Mechanical Engineering'), 'ME')
    assert.equal(generateDeptCode('Civil Engineering'), 'CIVIL')
    assert.equal(generateDeptCode('Biomedical Engineering'), 'BIOMED')
    assert.equal(generateDeptCode('Applied Sciences'), 'AS')
    assert.equal(generateDeptCode('Robotics'), 'ROBO')
  })

  it('2. isUserInCollege accurately matches users by ObjectId, String, Name, or Domain', () => {
    // A: Matching ObjectId
    const userA = {
      _id: new mongoose.Types.ObjectId(),
      name: 'User A',
      collegeId: mockCollegeId,
      college: 'Datta Meghe College of Engineering',
      email: 'usera@gmail.com',
    }
    assert.equal(isUserInCollege(userA, mockCollege), true)

    // B: Matching String ID
    const userB = {
      _id: new mongoose.Types.ObjectId(),
      name: 'User B',
      collegeId: mockCollegeId.toString(),
      college: 'Datta Meghe College of Engineering',
      email: 'userb@gmail.com',
    }
    assert.equal(isUserInCollege(userB, mockCollege), true)

    // C: Matching College Name (legacy record without collegeId)
    const userC = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Vinay Patil',
      collegeId: null,
      college: 'Datta Meghe College of Engineering',
      email: 'vinay@dmce.ac.in',
      save() { return Promise.resolve(this) },
    }
    assert.equal(isUserInCollege(userC, mockCollege), true)
    // Verify auto-healing:
    assert.equal(userC.collegeId.toString(), mockCollegeId.toString())

    // D: Matching Email Domain (student registered before backfill)
    const userD = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Student D',
      collegeId: null,
      college: '',
      email: 'student@dmce.ac.in',
      save() { return Promise.resolve(this) },
    }
    assert.equal(isUserInCollege(userD, mockCollege), true)
    assert.equal(userD.collegeId.toString(), mockCollegeId.toString())

    // E: Non-matching user from another college
    const userOther = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Other Student',
      collegeId: new mongoose.Types.ObjectId(),
      college: 'KJSCE Mumbai',
      email: 'student@campus.edu',
    }
    assert.equal(isUserInCollege(userOther, mockCollege), false)
  })

  it('3. buildCollegeUserFilter builds resilient queries covering ObjectId, string, name, and domain', () => {
    const filter = buildCollegeUserFilter(mockCollege, { role: 'student' })

    assert.ok(filter.$and)
    assert.equal(filter.$and.length, 2)

    const collegeMatch = filter.$and[0]
    assert.ok(collegeMatch.$or)

    const clauses = collegeMatch.$or
    // Check ObjectId clause
    assert.ok(clauses.some(c => c.collegeId && c.collegeId.toString() === mockCollegeId.toString()))
    // Check string ID clause
    assert.ok(clauses.some(c => c.collegeId === mockCollegeId.toString()))
    // Check college name clause
    assert.ok(clauses.some(c => c.college === 'Datta Meghe College of Engineering'))
    // Check email domain regex clause
    assert.ok(clauses.some(c => c.email && c.email instanceof RegExp && c.email.test('vinay@dmce.ac.in')))

    // Check additional filter clause
    assert.deepEqual(filter.$and[1], { role: 'student' })
  })

  it('4. buildCollegeUserFilter safely handles missing or invalid college object', () => {
    const emptyFilter = buildCollegeUserFilter(null)
    assert.deepEqual(emptyFilter, { _id: null })

    const undefinedFilter = buildCollegeUserFilter({})
    assert.deepEqual(undefinedFilter, { _id: null })
  })
})
