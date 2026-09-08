
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { connectDB } from './config/db.js'
import User from './models/User.js'
import Post from './models/Post.js'
import Comment from './models/Comment.js'
import Follow from './models/Follow.js'
import College from './models/College.js'

const BCRYPT_ROUNDS = 12

const DEMO_ACCOUNTS = [
  {
    name:         'Rahul Sharma',
    username:     'rahul.sharma',
    initials:     'RS',
    avatarColor:  '#6366f1',
    email:        'rahul@campus.edu',
    password:     'swish123',
    role:         'student',
    college:      'KJSCE Mumbai',
    dept:         'Information Technology',
    bio:          'Full Stack Developer 🚀 | Hackathon enthusiast | Building Swish',
    year:         '3rd Year',
    studentId:    'IT2024001',
    isEmailVerified: true,
    isDemo:       true,
  },
  {
    name:         'Demo Student',
    username:     'demo.student',
    initials:     'DS',
    avatarColor:  '#6366f1',
    email:        'student@campus.edu',
    password:     'student123',
    role:         'student',
    college:      'KJSCE Mumbai',
    dept:         'Computer Science',
    bio:          'Campus explorer 🎓',
    year:         '2nd Year',
    studentId:    'CS2024099',
    isEmailVerified: true,
    isDemo:       true,
  },
  {
    name:         'Demo Faculty',
    username:     'demo.faculty',
    initials:     'DF',
    avatarColor:  '#10b981',
    email:        'faculty@campus.edu',
    password:     'faculty123',
    role:         'faculty',
    college:      'KJSCE Mumbai',
    dept:         'Computer Science',
    bio:          'Educator & researcher 📚',
    designation:  'Assistant Professor',
    employeeId:   'EMP2024001',
    isEmailVerified: true,
    isDemo:       true,
  },
  {
    name:         'Admin User',
    username:     'swish.admin',
    initials:     'AU',
    avatarColor:  '#ef4444',
    email:        'admin@swish.com',
    password:     'admin123',
    role:         'admin',
    college:      '',
    dept:         'Administration',
    bio:          'Swish Platform Administrator',
    isEmailVerified: true,
    isDemo:       true,
  },
  {
    name:         'Demo College Admin',
    username:     'demo.collegeadmin',
    initials:     'DA',
    avatarColor:  '#f59e0b',
    email:        'collegeadmin@campus.edu',
    password:     'college123',
    role:         'college_admin',
    college:      'KJSCE Mumbai',
    dept:         'Administration',
    designation:  'College Administrator',
    bio:          'Managing college operations and student services',
    isEmailVerified: true,
    isDemo:       true,
  },
  // ── New test profiles ──────────────────────────────────────────────────────
  {
    name:         'Priya Desai',
    username:     'priya.desai',
    initials:     'PD',
    avatarColor:  '#ec4899',
    email:        'priya@campus.edu',
    password:     'swish123',
    role:         'student',
    college:      'KJSCE Mumbai',
    dept:         'Computer Science',
    bio:          'UI/UX Designer 🎨 | React lover | Coffee addict ☕',
    year:         '3rd Year',
    studentId:    'CS2024042',
    isEmailVerified: true,
    isDemo:       true,
  },
  {
    name:         'Arjun Mehta',
    username:     'arjun.mehta',
    initials:     'AM',
    avatarColor:  '#f59e0b',
    email:        'arjun@campus.edu',
    password:     'swish123',
    role:         'student',
    college:      'KJSCE Mumbai',
    dept:         'Electronics',
    bio:          'IoT hacker 🔧 | Arduino & Raspberry Pi | Robotics Club Lead 🤖',
    year:         '4th Year',
    studentId:    'EC2023015',
    isEmailVerified: true,
    isDemo:       true,
  },
  {
    name:         'Sneha Iyer',
    username:     'sneha.iyer',
    initials:     'SI',
    avatarColor:  '#14b8a6',
    email:        'sneha@campus.edu',
    password:     'swish123',
    role:         'student',
    college:      'KJSCE Mumbai',
    dept:         'Information Technology',
    bio:          'ML enthusiast 🧠 | Kaggle competitor | Open-source contributor 💻',
    year:         '3rd Year',
    studentId:    'IT2024037',
    isEmailVerified: true,
    isDemo:       true,
  },
]

async function seed() {
  await connectDB()
  console.log('\n🌱  Starting seed...\n')

  // ── 0. Ensure demo college exists and get its ID ─────────────────────────────
  const demoCollege = await College.findOneAndUpdate(
    { domain: 'campus.edu' },
    { 
      $set: { 
        name: 'KJSCE Mumbai',
        code: 'KJSCE',
        domain: 'campus.edu',
        location: 'Mumbai, Maharashtra',
        active: true,
        website: 'https://kjsce.somaiya.edu',
        address: 'Vidyavihar, Mumbai - 400077',
        phone: '+91-22-24061234',
        email: 'info@kjsce.edu',
        description: 'K. J. Somaiya College of Engineering - A premier engineering institution in Mumbai'
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
  console.log(`  ✅  Demo college: ${demoCollege.name} (id: ${demoCollege._id})`)

  // ── 1. Upsert demo users ────────────────────────────────────────────────────
  const userMap = {}   // email → User document

  for (const account of DEMO_ACCOUNTS) {
    const { password, ...rest } = account
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

    // Add collegeId for college_admin role
    const userData = { ...rest, passwordHash }
    if (rest.role === 'college_admin') {
      userData.collegeId = demoCollege._id
    }

    const result = await User.findOneAndUpdate(
      { email: rest.email },
      { $set: userData },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    userMap[rest.email] = result
    console.log(`  ✅  ${result.role.padEnd(7)} ${result.email} (id: ${result._id})`)
  }

  // ── Convenient references ──────────────────────────────────────────────────
  const rahul   = userMap['rahul@campus.edu']
  const student = userMap['student@campus.edu']
  const faculty = userMap['faculty@campus.edu']
  const admin   = userMap['admin@swish.com']
  const priya   = userMap['priya@campus.edu']
  const arjun   = userMap['arjun@campus.edu']
  const sneha   = userMap['sneha@campus.edu']

  // ── 2. Seed follow relationships ──────────────────────────────────────────
  console.log('\n👥  Seeding follow relationships...\n')

  const DEMO_FOLLOWS = [
    // Priya, Arjun, Sneha all follow Rahul
    { follower: priya._id,   following: rahul._id },
    { follower: arjun._id,   following: rahul._id },
    { follower: sneha._id,   following: rahul._id },
    // Rahul follows Priya & Arjun back
    { follower: rahul._id,   following: priya._id },
    { follower: rahul._id,   following: arjun._id },
    // Student follows everyone
    { follower: student._id, following: rahul._id },
    { follower: student._id, following: priya._id },
    { follower: student._id, following: arjun._id },
    { follower: student._id, following: sneha._id },
    { follower: student._id, following: faculty._id },
    // Faculty follows Rahul & Sneha
    { follower: faculty._id, following: rahul._id },
    { follower: faculty._id, following: sneha._id },
    // Cross-follows between new users
    { follower: priya._id,   following: sneha._id },
    { follower: sneha._id,   following: priya._id },
    { follower: arjun._id,   following: sneha._id },
    { follower: priya._id,   following: arjun._id },
  ]

  for (const f of DEMO_FOLLOWS) {
    await Follow.findOneAndUpdate(
      { follower: f.follower, following: f.following },
      { $set: f },
      { upsert: true, new: true }
    )
    console.log(`  ➡️   ${f.follower} → ${f.following}`)
  }

  // Recompute follower/following counts for each user
  for (const user of Object.values(userMap)) {
    const followersCount = await Follow.countDocuments({ following: user._id })
    const followingCount = await Follow.countDocuments({ follower: user._id })
    await User.findByIdAndUpdate(user._id, {
      followers: followersCount,
      following: followingCount,
    })
  }
  console.log('  ✅  Follower/following counts synced')

  // ── 3. Seed demo posts ──────────────────────────────────────────────────────
  console.log('\n📝  Seeding demo posts...\n')

  const DEMO_POSTS = [
    // ── Rahul's posts ─────────────────────────────────────────────
    {
      user:    rahul._id,
      content: '🚀 Just shipped the first version of Swish — a campus social network built for students and faculty! Drop a follow if you want to stay updated 👇',
      likes:   [student._id, faculty._id, priya._id, arjun._id, sneha._id],
    },
    {
      user:    rahul._id,
      content: '📦 Tech stack breakdown for Swish:\n• Backend: Node.js + Express + MongoDB\n• Auth: JWT + bcrypt\n• Real-time: coming soon 👀\n\nWhat feature should I build next?',
      likes:   [student._id, priya._id, sneha._id],
    },
    {
      user:    rahul._id,
      content: '🎯 Hackathon tip: start with the problem, not the tech. We wasted 3 hours picking between Next.js and Vite before we even validated the idea. Lesson learnt 😅',
      likes:   [faculty._id, arjun._id],
    },
    // ── Priya's posts ─────────────────────────────────────────────
    {
      user:    priya._id,
      content: '🎨 Just redesigned the Swish feed UI with glassmorphism cards and smooth hover animations. Dark mode looks *chef\'s kiss* 🤌\n\nDesign matters, people!',
      likes:   [rahul._id, sneha._id, student._id, arjun._id],
    },
    {
      user:    priya._id,
      content: '💡 Figma tip: Use Auto Layout + Variables for a scalable design system. Saved me 10+ hours this semester on club event posters alone.',
      likes:   [rahul._id, sneha._id],
    },
    // ── Arjun's post ──────────────────────────────────────────────
    {
      user:    arjun._id,
      content: '🤖 Our robotics club just won 2nd place at TechFest! Built an autonomous line-follower with PID control and custom 3D-printed chassis.\n\nTeam effort all the way 💪🏆',
      likes:   [rahul._id, priya._id, sneha._id, faculty._id, student._id],
    },
    // ── Sneha's posts ─────────────────────────────────────────────
    {
      user:    sneha._id,
      content: '🧠 Finally cracked top 5% on the Kaggle Titanic challenge. Gradient boosting + feature engineering > fancy deep learning for tabular data.\n\nHappy to share my notebook if anyone wants to learn! 📓',
      likes:   [rahul._id, arjun._id, faculty._id],
    },
    {
      user:    sneha._id,
      content: '📚 Open-source contribution #12 merged today! Fixed a memory leak in a popular Python ML library.\n\nContributing to OSS is the best way to level up as a developer. Don\'t be scared of "imposter syndrome" — just open that PR 🚀',
      likes:   [rahul._id, priya._id, faculty._id, student._id],
    },
  ]

  const DEMO_COMMENTS = [
    // ── Comments on Rahul's posts ─────────────────────────────────
    { postIndex: 0, user: student._id, text: 'This is so cool! Already followed 🔥' },
    { postIndex: 0, user: faculty._id, text: 'Great initiative Rahul! Looking forward to seeing it grow 👍' },
    { postIndex: 0, user: priya._id,   text: 'Love the UI! Let me know if you need design help 🎨' },
    { postIndex: 0, user: sneha._id,   text: 'Bookmarked! Will definitely be using this for campus updates.' },

    { postIndex: 1, user: student._id, text: 'Please add dark mode next! 🌙' },
    { postIndex: 1, user: faculty._id, text: 'Solid stack choice. Have you considered adding WebSockets for real-time notifications?' },
    { postIndex: 1, user: priya._id,   text: 'I vote for a stories feature! Like Instagram but for campus events 📸' },

    { postIndex: 2, user: student._id, text: 'So true 😂 we did the exact same thing at last hackathon' },
    { postIndex: 2, user: arjun._id,   text: 'We once spent 4 hours on the team name before writing a single line of code 💀' },

    // ── Comments on Priya's posts ─────────────────────────────────
    { postIndex: 3, user: rahul._id,   text: 'The glassmorphism cards look amazing! Merging your PR tonight 🙌' },
    { postIndex: 3, user: sneha._id,   text: 'Can you share the CSS for those hover effects? Would love to learn!' },
    { postIndex: 3, user: arjun._id,   text: 'Dark mode supremacy 🌑' },

    { postIndex: 4, user: rahul._id,   text: 'Auto Layout changed my life. Great tip Priya!' },
    { postIndex: 4, user: sneha._id,   text: 'Need to try Variables, been doing everything manually 😭' },

    // ── Comments on Arjun's post ──────────────────────────────────
    { postIndex: 5, user: rahul._id,   text: 'Congrats to the whole team! 🎉 That PID implementation was clean.' },
    { postIndex: 5, user: priya._id,   text: 'The chassis looked so cool! Do you have build photos?' },
    { postIndex: 5, user: faculty._id, text: 'Well done Arjun. Consider writing this up for the department newsletter.' },
    { postIndex: 5, user: sneha._id,   text: 'Amazing work! Robotics club keeps winning 🏆' },

    // ── Comments on Sneha's posts ─────────────────────────────────
    { postIndex: 6, user: rahul._id,   text: 'Top 5%! That\'s insane 🔥 Please share the notebook!' },
    { postIndex: 6, user: arjun._id,   text: 'Feature engineering is an art. Would love to see your approach.' },
    { postIndex: 6, user: faculty._id, text: 'Excellent work Sneha! This could be a great seminar topic for juniors.' },

    { postIndex: 7, user: rahul._id,   text: '12 merged PRs?! That\'s goals. What library was it?' },
    { postIndex: 7, user: priya._id,   text: 'So inspiring! I need to start contributing too 💪' },
    { postIndex: 7, user: faculty._id, text: 'Open-source contributions look great on a resume. Well done!' },
  ]

  // Upsert posts (match by user + content so re-running seed is safe)
  const createdPosts = []
  for (const postData of DEMO_POSTS) {
    const post = await Post.findOneAndUpdate(
      { user: postData.user, content: postData.content },
      { $set: postData },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
    createdPosts.push(post)
    console.log(`  ✅  Post by ${post.user} — "${post.content.slice(0, 50)}..."`)
  }

  // Recompute post counts per user
  for (const user of Object.values(userMap)) {
    const postCount = await Post.countDocuments({ user: user._id, isDeleted: false })
    await User.findByIdAndUpdate(user._id, { posts: postCount })
  }
  console.log('  ✅  Post counts synced')

  // ── 4. Seed comments ────────────────────────────────────────────────────────
  console.log('\n💬  Seeding comments...\n')

  for (const c of DEMO_COMMENTS) {
    const post = createdPosts[c.postIndex]
    const comment = await Comment.findOneAndUpdate(
      { post: post._id, user: c.user, text: c.text },
      { $set: { post: post._id, user: c.user, text: c.text } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
    // Keep commentsCount in sync
    const count = await Comment.countDocuments({ post: post._id, isDeleted: false })
    await Post.findByIdAndUpdate(post._id, { commentsCount: count })
    console.log(`  💬  Post[${c.postIndex}] — "${comment.text.slice(0, 45)}..."`)
  }

  console.log('\n✅  Seed complete.\n')
  console.log('──────────────────────────────────────────────')
  console.log('  Test accounts:')
  console.log('    • rahul@campus.edu          (password: swish123)')
  console.log('    • priya@campus.edu          (password: swish123)')
  console.log('    • arjun@campus.edu          (password: swish123)')
  console.log('    • sneha@campus.edu          (password: swish123)')
  console.log('    • student@campus.edu        (password: student123)')
  console.log('    • faculty@campus.edu        (password: faculty123)')
  console.log('    • admin@swish.com           (password: admin123)')
  console.log('    • collegeadmin@campus.edu  (password: college123)')
  console.log('──────────────────────────────────────────────\n')

  await mongoose.disconnect()
  process.exit(0)
}

seed().catch(err => {
  console.error('❌  Seed failed:', err)
  process.exit(1)
})

