import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/db.js'
import College from '../models/College.js'

async function run() {
  await connectDB()
  const collegesToSeed = [
    {
      name: 'Smt. Indira Gandhi College of Engineering',
      code: 'SIGCE',
      domain: 'sigce.edu.in',
      location: 'Navi Mumbai, Maharashtra',
      active: true,
    },
    {
      name: 'KJSCE Mumbai',
      code: 'KJSCE',
      domain: 'campus.edu',
      location: 'Mumbai, Maharashtra',
      active: true,
    },
    {
      name: 'Demo College',
      code: 'DEMO',
      domain: 'abc.edu.in',
      location: 'Pune, Maharashtra',
      active: true,
    },
  ]

  for (const c of collegesToSeed) {
    const res = await College.findOneAndUpdate(
      { domain: c.domain },
      { $set: c },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
    console.log(`✅ Upserted college: ${res.name} (${res.domain})`)
  }

  const all = await College.find()
  console.log('\nAll active colleges in DB:')
  all.forEach(c => console.log(` - ${c.name} [${c.domain}] (active: ${c.active})`))

  await mongoose.disconnect()
  process.exit(0)
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
