# Swish — Campus Social Network

> A private, verified social platform built exclusively for campus communities.  
> **Stack:** React + Vite + TailwindCSS v4 + Framer Motion + React Router v7

---

## 📌 Project Overview

**Swish** is a campus-exclusive social media web app (think Instagram × Campus). Students log in with a verified campus email and can share posts (emoji-style cards with gradients), like, comment, bookmark, and explore their campus community. There is also an admin dashboard for moderation.

The **landing page** (`/`) is a fully polished marketing site. The **authenticated app** (`/home`, `/explore`, `/profile/:userId`, `/notifications`) is a social feed UI — all running on **mock/hardcoded data** with no backend yet.

---

## 🗂️ Directory Structure

```
Swissh/
├── index.html                  # Entry HTML — Google Fonts (Inter, Plus Jakarta Sans), meta tags
├── vite.config.js              # Vite + React + Tailwind plugin
├── tsconfig.json               # TypeScript config
├── package.json                # Dependencies listed below
└── src/
    ├── main.jsx                # React DOM root mount
    ├── App.jsx                 # Router — all routes defined here
    ├── index.css               # Global base styles
    ├── style.css               # Additional global CSS
    │
    ├── context/
    │   ├── AuthContext.jsx     # Auth state — login/logout, hardcoded test users
    │   └── ThemeContext.jsx    # Dark/light mode toggle context
    │
    ├── data/
    │   └── mockData.js         # All mock posts, users, notifications, explore data
    │
    ├── pages/
    │   ├── LandingPage.jsx     # Public marketing landing page (/)
    │   ├── LoginPage.jsx       # Login form (/login)
    │   ├── JoinPage.jsx        # Sign-up / waitlist page (/join)
    │   ├── ProtectedRoute.jsx  # Auth guard (redirects to /login if not authed)
    │   └── app/
    │       ├── HomePage.jsx           # Main feed (/home)
    │       ├── ExplorePage.jsx        # Explore/search (/explore)
    │       ├── ProfilePage.jsx        # User profile (/profile/:userId)
    │       ├── NotificationsPage.jsx  # Notifications (/notifications)
    │       └── AdminPage.jsx          # Admin dashboard (/admin)
    │
    └── components/
        │   [Landing page sections — used only in LandingPage.jsx]
        ├── Navbar.jsx           # Public nav with mobile menu + dark mode toggle
        ├── Hero.jsx             # Hero section with animated CTA
        ├── Features.jsx         # Feature cards section
        ├── HowItWorks.jsx       # Step-by-step section
        ├── CommunitySection.jsx # Social proof / community section
        ├── TrustSection.jsx     # Trust/security badges
        ├── SecuritySection.jsx  # Privacy & security details
        ├── ProductPreview.jsx   # App mockup/preview section
        ├── FinalCTA.jsx         # Bottom call-to-action
        ├── Footer.jsx           # Site footer
        │
        └── app/                [Authenticated app shell & shared UI]
            ├── AppLayout.jsx        # Shell: Sidebar + <Outlet /> + RightPanel
            ├── Sidebar.jsx          # Desktop left sidebar (nav links, user info)
            ├── BottomNav.jsx        # Mobile bottom navigation bar
            ├── RightPanel.jsx       # Desktop right panel (suggestions, trending)
            ├── PostCard.jsx         # Individual post card (like, comment, save, share)
            ├── CommentDrawer.jsx    # Slide-up comments drawer
            ├── CreatePostModal.jsx  # Modal to create a new post
            └── Stories.jsx          # Stories row at top of feed
```

---

## 🔑 Routes

| Path | Auth Required | Component | Description |
|---|---|---|---|
| `/` | No | `LandingPage` | Marketing landing page |
| `/login` | No | `LoginPage` | Login with campus email |
| `/join` | No | `JoinPage` | Waitlist / sign-up |
| `/home` | Yes | `HomePage` | Main post feed |
| `/explore` | Yes | `ExplorePage` | Search & discover |
| `/profile/:userId` | Yes | `ProfilePage` | User profile |
| `/notifications` | Yes | `NotificationsPage` | Notification feed |
| `/admin` | Yes (admin only) | `AdminPage` | Moderation dashboard |

---

## 🔐 Auth System (Hardcoded — No Backend Yet)

Auth is managed by `AuthContext.jsx`. There is **no real backend** — credentials are validated against a hardcoded array.

### Test Credentials

| Role | Email | Password |
|---|---|---|
| Student | `rahul@campus.edu` | `swish123` |
| Admin | `admin@campus.edu` | `admin123` |

The `login()` function is marked with a `TODO` comment showing how to replace it with a real JWT API call later.

**Context API surface:**
```js
const { user, isAuthenticated, loginError, login, logout } = useAuth()
```

**User object shape:**
```js
{
  id, name, username, initials, avatarColor,
  dept, year, bio, role,      // role: 'student' | 'admin'
  followers, following, posts,
  campus                       // e.g. 'KJSCE Mumbai'
}
```

---

## 🎨 Design System

- **Fonts:** Inter (UI text), Plus Jakarta Sans (headings) — loaded via Google Fonts in `index.html`
- **CSS Framework:** TailwindCSS v4 (via `@tailwindcss/vite` plugin — NOT the old PostCSS setup)
- **Animation:** Framer Motion (`motion.*` components, `AnimatePresence`)
- **Icons:** Lucide React
- **Theme:** Dark/light mode via `ThemeContext` — uses Tailwind `dark:` prefix classes
- **Color palette:** Indigo-based (`indigo-600` primary), Rose for likes, Emerald for success states
- **Border radius:** `rounded-2xl` for cards, `rounded-full` for avatars and inputs
- **Glassmorphism:** Used on landing page (`bg-white/80 backdrop-blur-sm`)

---

## 📦 Dependencies

```json
{
  "react": "(via @vitejs/plugin-react ^6.0.5)",
  "react-router-dom": "^7.18.2",
  "framer-motion": "^13.0.0",
  "lucide-react": "^1.30.0",
  "tailwindcss": "^4.3.3",
  "@tailwindcss/vite": "^4.3.3",
  "typescript": "~6.0.2",
  "vite": "^8.2.0"
}
```

> **Important — TailwindCSS v4:** Does NOT use `tailwind.config.js`. Config is done inside CSS via `@theme` directives. The plugin is `@tailwindcss/vite`, not the old PostCSS plugin.

---

## 🗃️ Mock Data (`src/data/mockData.js`)

All data is **static and imported directly** — no API calls exist yet.

**Post object shape:**
```js
{
  id, userId, userName, userInitials, userAvatarColor, userDept,
  createdAt, emoji, label, caption,
  tags: [],
  gradientFrom, gradientTo,           // light mode CSS gradient colors
  gradientFromDark, gradientToDark,   // dark mode CSS gradient colors
  likes, liked, comments: [], saved
}
```

**Comment object shape:**
```js
{ id, userId, userName, userInitials, avatarColor, text, time }
```

---

## 🚀 Running Locally

```bash
npm install
npm run dev
# Opens at http://localhost:5173
```

---

## 🏗️ Current State & TODOs

### Done
- Full landing page (all sections, animated, responsive)
- Login & Join pages with form validation
- Auth context with hardcoded users + role-based admin access
- Dark / light mode toggle
- Main feed with PostCard (like, comment drawer, save, share/copy link)
- Create post modal
- Stories row
- Explore page
- Profile page
- Notifications page
- Admin dashboard page
- Protected routes

### Not Yet Built
- Real backend / REST API (all data is hardcoded mock)
- JWT authentication (AuthContext has a TODO comment showing the fetch pattern)
- Image uploads (posts are emoji + gradient cards only)
- Real-time updates (no WebSocket/SSE)
- Data persistence (state resets on page refresh)
- `react` and `react-dom` are missing from `package.json` dependencies (pulled in transitively)

---

## 💡 Prompt Writing Guide

When asking an AI to help on this project, paste the relevant sections above plus these key facts:

### Must-include context for any prompt

1. **Stack:** React + Vite + TailwindCSS v4 (no `tailwind.config.js`, uses `@tailwindcss/vite`) + Framer Motion + Lucide React + React Router v7
2. **No backend:** All data is in `src/data/mockData.js`, no fetch/API calls anywhere
3. **Auth:** Hardcoded users in `AuthContext.jsx`, test login `rahul@campus.edu` / `swish123`
4. **Dark mode:** Via Tailwind `dark:` classes, toggled by `ThemeContext`
5. **Exact file path** you want modified

### Example prompts

**Add a feature to PostCard:**
> "In `src/components/app/PostCard.jsx` (React + TailwindCSS v4 + Framer Motion), add a double-tap to like animation on the post image area. Local like state is in `useState`. Keep all existing `dark:` class variants intact."

**Wire up a new feed filter:**
> "In `src/pages/app/HomePage.jsx`, add a horizontal pill-filter bar above the post feed to filter posts by tag. All posts come from `src/data/mockData.js` (imported as an array). Use TailwindCSS v4 utility classes and match the existing indigo color scheme. No backend calls."

**Create a new component matching the existing style:**
> "Create `src/components/app/TrendingCard.jsx`. Match the existing card style: `bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-4`. Use Lucide React icons. Accept props: `{ title, count, tags }`."

**Fix auth / add a field:**
> "In `src/context/AuthContext.jsx`, add a `campus` field filter so users can only see posts from their own campus. The hardcoded test user's campus is `KJSCE Mumbai`. No backend — filter the imported mock data array."
