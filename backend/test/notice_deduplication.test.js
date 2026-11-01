// backend/test/notice_deduplication.test.js
// ─────────────────────────────────────────────────────────────────────────────
// Notice Deduplication and Idempotency Test Suite
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { identifyDuplicateNotices } from '../src/services/notice-cleanup.service.js'

describe('Notice Deduplication & Idempotency Safeguards', () => {
  const collegeIdA = new mongoose.Types.ObjectId()
  const collegeIdB = new mongoose.Types.ObjectId()
  const authorId1 = new mongoose.Types.ObjectId()
  const authorId2 = new mongoose.Types.ObjectId()

  it('1. identifyDuplicateNotices detects rapid duplicate submissions and keeps the earliest canonical notice', () => {
    const baseTime = new Date('2026-11-01T12:00:00.000Z')
    const notice1 = {
      _id: new mongoose.Types.ObjectId(),
      collegeId: collegeIdA,
      createdBy: authorId1,
      title: 'Exam Schedule Announced',
      content: 'Final semester examinations will commence from next Monday.',
      published: true,
      createdAt: baseTime,
    }
    const notice2Duplicate = {
      _id: new mongoose.Types.ObjectId(),
      collegeId: collegeIdA,
      createdBy: authorId1,
      title: 'Exam Schedule Announced',
      content: 'Final semester examinations will commence from next Monday.',
      published: true,
      createdAt: new Date(baseTime.getTime() + 1500), // 1.5 seconds later (rapid double submit)
    }
    const notice3Duplicate = {
      _id: new mongoose.Types.ObjectId(),
      collegeId: collegeIdA,
      createdBy: authorId1,
      title: 'Exam Schedule Announced ', // trailing space
      content: 'Final semester examinations will commence from next Monday. ',
      published: true,
      createdAt: new Date(baseTime.getTime() + 2800), // 2.8 seconds later
    }

    const result = identifyDuplicateNotices([notice1, notice2Duplicate, notice3Duplicate], 5000)

    assert.equal(result.duplicateIds.length, 2, 'Should identify exactly 2 duplicates')
    assert.ok(result.duplicateIds.includes(notice2Duplicate._id.toString()))
    assert.ok(result.duplicateIds.includes(notice3Duplicate._id.toString()))
    assert.equal(result.keptIds.length, 1, 'Should keep exactly 1 canonical notice')
    assert.equal(result.keptIds[0], notice1._id.toString(), 'Should keep earliest notice as canonical')
  })

  it('2. identifyDuplicateNotices preserves genuinely different notices even with identical titles', () => {
    const baseTime = new Date('2026-11-01T12:00:00.000Z')
    const noticeA = {
      _id: new mongoose.Types.ObjectId(),
      collegeId: collegeIdA,
      createdBy: authorId1,
      title: 'Campus Notice',
      content: 'Library will remain open 24x7 during preparatory week.',
      createdAt: baseTime,
    }
    const noticeB = {
      _id: new mongoose.Types.ObjectId(),
      collegeId: collegeIdA,
      createdBy: authorId1,
      title: 'Campus Notice',
      content: 'Sports complex is closed today for annual maintenance.',
      createdAt: new Date(baseTime.getTime() + 2000),
    }

    const result = identifyDuplicateNotices([noticeA, noticeB], 5000)
    assert.equal(result.duplicateIds.length, 0, 'Different content must not be flagged as duplicates')
    assert.equal(result.keptIds.length, 2, 'Both genuine notices must be kept')
  })

  it('3. identifyDuplicateNotices preserves notices from different colleges or different authors', () => {
    const baseTime = new Date('2026-11-01T12:00:00.000Z')
    const noticeColA = {
      _id: new mongoose.Types.ObjectId(),
      collegeId: collegeIdA,
      createdBy: authorId1,
      title: 'Holiday Announcement',
      content: 'College is closed tomorrow for national holiday.',
      createdAt: baseTime,
    }
    const noticeColB = {
      _id: new mongoose.Types.ObjectId(),
      collegeId: collegeIdB,
      createdBy: authorId2,
      title: 'Holiday Announcement',
      content: 'College is closed tomorrow for national holiday.',
      createdAt: new Date(baseTime.getTime() + 1000),
    }

    const result = identifyDuplicateNotices([noticeColA, noticeColB], 5000)
    assert.equal(result.duplicateIds.length, 0, 'Notices across different colleges/authors are distinct')
    assert.equal(result.keptIds.length, 2)
  })

  it('4. Canonical selection prioritizes pinned and published status over unpinned drafts', () => {
    const baseTime = new Date('2026-11-01T12:00:00.000Z')
    const draftNotice = {
      _id: new mongoose.Types.ObjectId(),
      collegeId: collegeIdA,
      createdBy: authorId1,
      title: 'Urgent Announcement',
      content: 'Please submit documents by Friday.',
      pinned: false,
      published: false,
      createdAt: baseTime,
    }
    const pinnedPublishedNotice = {
      _id: new mongoose.Types.ObjectId(),
      collegeId: collegeIdA,
      createdBy: authorId1,
      title: 'Urgent Announcement',
      content: 'Please submit documents by Friday.',
      pinned: true,
      published: true,
      createdAt: new Date(baseTime.getTime() + 1000),
    }

    const result = identifyDuplicateNotices([draftNotice, pinnedPublishedNotice], 5000)
    assert.equal(result.duplicateIds.length, 1)
    assert.equal(result.duplicateIds[0], draftNotice._id.toString(), 'Unpublished draft should be removed')
    assert.equal(result.keptIds[0], pinnedPublishedNotice._id.toString(), 'Pinned & published notice should be kept')
  })

  it('5. Frontend deduplication pattern cleans duplicate IDs while preserving order', () => {
    const id1 = new mongoose.Types.ObjectId().toString()
    const id2 = new mongoose.Types.ObjectId().toString()
    const id3 = new mongoose.Types.ObjectId().toString()

    const rawNotices = [
      { id: id1, title: 'Notice 1' },
      { id: id2, title: 'Notice 2' },
      { id: id1, title: 'Notice 1 (duplicate)' },
      { id: id3, title: 'Notice 3' },
      { id: id2, title: 'Notice 2 (duplicate)' },
    ]

    const seen = new Set()
    const unique = []
    for (const n of rawNotices) {
      const id = (n.id || n._id)?.toString()
      if (id && !seen.has(id)) {
        seen.add(id)
        unique.push(n)
      }
    }

    assert.equal(unique.length, 3)
    assert.deepEqual(unique.map(n => n.id), [id1, id2, id3])
  })

  it('6. Notice schema has partialFilterExpression on idempotencyKey allowing multiple non-keyed notices', async () => {
    const Notice = (await import('../src/models/Notice.js')).default
    const indexes = Notice.schema.indexes()
    const idempotencyIndex = indexes.find(idx => idx[0]?.idempotencyKey)

    assert.ok(idempotencyIndex, 'idempotencyKey index must exist')
    assert.equal(idempotencyIndex[1]?.unique, true, 'idempotencyKey index must be unique')
    assert.equal(idempotencyIndex[1]?.sparse, true, 'idempotencyKey index must be sparse')
    assert.deepEqual(
      idempotencyIndex[1]?.partialFilterExpression,
      { idempotencyKey: { $type: 'string' } },
      'idempotencyKey index must use partialFilterExpression for strings only'
    )
    assert.equal(
      Notice.schema.paths.idempotencyKey.defaultValue,
      undefined,
      'idempotencyKey must not have default null'
    )
  })
})

