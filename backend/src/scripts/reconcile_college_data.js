// backend/src/scripts/reconcile_college_data.js
// ─────────────────────────────────────────────────────────────────────────────
// Safe College Data Reconciliation & Migration Script
//
// Reconciles:
// - College Admin -> College association
// - Student & Faculty -> College association
// - Student & Faculty -> Department references
// - Department collection backfill from legacy text fields
// ─────────────────────────────────────────────────────────────────────────────
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/db.js'
import College from '../models/College.js'
import User from '../models/User.js'
import Department from '../models/Department.js'
import {
  autoHealCollegeUsers,
  reconcileCollegeDepartments,
  buildCollegeUserFilter,
} from '../services/college-reconciliation.service.js'

async function runReconciliation() {
  console.log('\n======================================================')
  console.log('🔄  Starting College Data Reconciliation & Migration')
  console.log('======================================================\n')

  try {
    await connectDB()
    console.log('✔ Database connection established.\n')

    const colleges = await College.find({})
    console.log(`Found ${colleges.length} colleges in database.\n`)

    const overallReport = {
      collegesProcessed: 0,
      departmentsCreated: 0,
      usersReconciled: 0,
      collegesSummary: [],
    }

    for (const college of colleges) {
      console.log(`------------------------------------------------------`)
      console.log(`🏫 College: ${college.name} (${college.domain || 'no domain'}) [ID: ${college._id}]`)

      // 1. Reconcile College Admins for this college
      const adminFilter = {
        role: 'college_admin',
        $or: [
          { collegeId: college._id },
          { collegeId: college._id.toString() },
          { college: college.name },
          ...(college.domain ? [{ email: new RegExp(`@${college.domain.replace('.', '\\.')}$`, 'i') }] : []),
        ],
      }
      const collegeAdmins = await User.find(adminFilter)
      for (const admin of collegeAdmins) {
        if (!admin.collegeId || admin.collegeId.toString() !== college._id.toString() || admin.college !== college.name) {
          admin.collegeId = college._id
          admin.college = college.name
          await admin.save()
          console.log(`   👑 Reconciled College Admin: ${admin.email} -> ${college.name}`)
        }
      }

      // 2. Auto-heal users belonging to this college
      await autoHealCollegeUsers(college)

      // 3. Reconcile departments and user department references
      const deptReport = await reconcileCollegeDepartments(college)
      overallReport.departmentsCreated += deptReport.departmentsCreated
      overallReport.usersReconciled += deptReport.usersReconciled

      // 4. Count students and faculty
      const studentFilter = buildCollegeUserFilter(college, { role: 'student' })
      const facultyFilter = buildCollegeUserFilter(college, { role: 'faculty' })
      const studentCount = await User.countDocuments(studentFilter)
      const facultyCount = await User.countDocuments(facultyFilter)
      const depts = await Department.find({ collegeId: college._id })

      console.log(`   🏢 Departments: ${depts.length} (${deptReport.departmentsCreated} created)`)
      depts.forEach(d => console.log(`      • [${d.code}] ${d.name}`))
      console.log(`   👨‍🎓 Students: ${studentCount}`)
      console.log(`   👩‍🏫 Faculty: ${facultyCount}`)

      overallReport.collegesProcessed++
      overallReport.collegesSummary.push({
        college: college.name,
        departments: depts.length,
        students: studentCount,
        faculty: facultyCount,
        createdDepartments: deptReport.departmentsCreated,
        reconciledUsers: deptReport.usersReconciled,
      })
    }

    console.log(`\n======================================================`)
    console.log('✅  Reconciliation Complete')
    console.log(`   • Colleges Processed: ${overallReport.collegesProcessed}`)
    console.log(`   • Departments Created: ${overallReport.departmentsCreated}`)
    console.log(`   • Users Reconciled: ${overallReport.usersReconciled}`)
    console.log('======================================================\n')

    await mongoose.disconnect()
    process.exit(0)
  } catch (err) {
    console.error('❌ Reconciliation failed:', err)
    process.exit(1)
  }
}

runReconciliation()
