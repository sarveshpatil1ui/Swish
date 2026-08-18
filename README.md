# Swish — Campus Social Network

![Swish Prototype](https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1200&h=400)

**Swish** is a modern, premium social networking platform designed exclusively for university and college campuses. It connects students, faculty, and campus organizations in a verified, trustworthy environment — think *Instagram × Campus Community* with role-based access, real-time messaging, and a polished dark-mode experience.

> **Status**: Frontend prototype with full UI, mock data, and client-side auth. Backend integration (APIs, database, real authentication) is planned for the next phase.

---

## 🎯 Project Goals

- **Verified Campus Communities** — Closed network gated by `.edu` email verification.
- **Premium UX** — Instagram-level polish with glassmorphism, micro-animations, and smooth page transitions.
- **Role-Based Access** — Distinct experiences for **Students**, **Faculty**, and **Admins**.
- **Real-time Engagement** — Stories, trending topics, direct messaging, and a dynamic home feed.
- **Responsive & Accessible** — Flawless across desktop, tablet, and mobile with full dark-mode support.

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React 19 (Vite 8) |
| **Language** | JavaScript (JSX) + TypeScript config |
| **Routing** | React Router v7 |
| **Styling** | TailwindCSS v4 (Vite plugin) + Vanilla CSS tokens |
| **Animations** | Framer Motion v13 |
| **Icons** | Lucide React |
| **Typography** | Inter + Plus Jakarta Sans (Google Fonts) |
| **State** | React Context (`SwishContext`, `ThemeContext`) |
| **Auth (mock)** | localStorage-based with role management |

---

## 📂 Project Structure

```
Swissh/
├── index.html                      # Entry point with SEO meta & font preloads
├── vite.config.js                  # Vite + React + TailwindCSS plugin
├── package.json
├── public/                         # Static assets (favicon, images)
└── src/
    ├── main.jsx                    # React DOM root
    ├── App.jsx                     # Router configuration & route guards
    ├── index.css                   # Global styles & CSS tokens
    ├── style.css                   # Additional base styles
    ├── context/
    │   ├── SwishContext.jsx         # Auth, users, posts, notifications state
    │   └── ThemeContext.jsx         # Dark/light mode provider
    ├── utils/
    │   └── auth.js                 # Mock auth helpers (localStorage CRUD)
    ├── data/
    │   └── mockData.js             # Seed data for users, posts, stories
    ├── components/
    │   ├── Navbar.jsx              # Public-facing navigation bar
    │   ├── Hero.jsx                # Landing page hero section
    │   ├── Features.jsx            # Feature cards section
    │   ├── ProductPreview.jsx      # Interactive product preview
    │   ├── CommunitySection.jsx    # Social proof / community stats
    │   ├── SecuritySection.jsx     # Trust & security messaging
    │   ├── TrustSection.jsx        # Trust indicators
    │   ├── HowItWorks.jsx          # Step-by-step onboarding flow
    │   ├── FinalCTA.jsx            # Call-to-action section
    │   ├── Footer.jsx              # Site-wide footer
    │   └── app/
    │       ├── AppLayout.jsx       # Authenticated shell (sidebar + content)
    │       ├── Sidebar.jsx         # Navigation sidebar (role-aware)
    │       ├── BottomNav.jsx       # Mobile bottom navigation bar
    │       ├── RightPanel.jsx      # Trending topics & suggestions panel
    │       ├── PostCard.jsx        # Feed post component (like, comment, share)
    │       ├── CommentDrawer.jsx   # Slide-out comment thread
    │       ├── CreatePostModal.jsx # Drag-and-drop image upload modal
    │       ├── Stories.jsx         # Horizontal stories strip
    │       └── StoryViewer.jsx     # Full-screen story viewer
    └── pages/
        ├── LandingPage.jsx         # Marketing landing page
        ├── LoginPage.jsx           # Login flow with role selection
        ├── JoinPage.jsx            # Registration / campus verification
        ├── ProtectedRoute.jsx      # Auth + role guard wrapper
        └── app/
            ├── HomePage.jsx        # Social feed with stories & trending
            ├── ExplorePage.jsx     # Discover posts, people & hashtags
            ├── ProfilePage.jsx     # User profile with stats & image grid
            ├── NotificationsPage.jsx # Interactive notification center
            ├── MessagesPage.jsx    # Real-time direct messaging UI
            ├── SettingsPage.jsx    # Multi-section settings panel
            ├── AdminPage.jsx       # Admin moderation dashboard
            └── FacultyPage.jsx     # Faculty analytics & management
```

---

## 📱 Features

### Public Pages

| Page | Highlights |
|---|---|
| **Landing** | Animated marketing page with feature cards, product preview, trust indicators, community stats, security section, and a final CTA |
| **Join** | Multi-step registration with campus `.edu` email verification messaging and role selection |
| **Login** | Polished login flow with demo-account quick access and role-based routing |

### Authenticated Pages (Student)

| Page | Highlights |
|---|---|
| **Home Feed** | Dynamic posts with image support, stories carousel with full-screen viewer, right-panel trending topics, bi-directional search filtering |
| **Explore** | Grid-based discovery of trending posts, people directory search, and active hashtags |
| **Profile** | User profile with follow/unfollow, follower/following stats, and image grid with skeleton loading |
| **Notifications** | Interactive alerts (likes, comments, follows) with unread badges, mark-all-read, and "all caught up" celebration |
| **Messages** | Full DM interface — conversation list, real-time chat bubbles, typing indicators, read receipts, emoji reactions, online status |
| **Settings** | Multi-section panel: Account, Appearance (dark mode toggle), Notifications, Privacy, Security, Help & Support, About |
| **Create Post** | Modal with drag-and-drop image upload, real-time caption character counter |

### Role-Restricted Pages

| Page | Access | Highlights |
|---|---|---|
| **Admin Dashboard** | `admin` only | User management with suspension toggles, report queue, content moderation, platform analytics with trend indicators |
| **Faculty Dashboard** | `faculty` + `admin` | Student directory, academic reports, post moderation tools, faculty-specific analytics with stat cards & trend tracking. Sub-routes: `/faculty/students`, `/faculty/reports`, `/faculty/moderation`, `/faculty/posts` |

### Shared Components

- **AppLayout** — Authenticated shell with responsive sidebar + bottom nav
- **Sidebar** — Role-aware navigation (shows Admin/Faculty links per role)
- **BottomNav** — Mobile-first bottom navigation bar
- **PostCard** — Feature-rich post card with like, comment, share, and save actions
- **CommentDrawer** — Slide-out threaded comments
- **Stories / StoryViewer** — Instagram-style stories strip and full-screen viewer
- **RightPanel** — Trending topics and "who to follow" suggestions

---

## 🔐 Authentication & Roles

The prototype uses a **client-side mock auth system** (`localStorage`) with three user roles:

| Role | Access |
|---|---|
| `student` | Home, Explore, Profile, Notifications, Messages, Settings |
| `faculty` | Everything students get + Faculty Dashboard |
| `admin` | Full access including Admin Dashboard + Faculty Dashboard |

Route protection is handled by `ProtectedRoute.jsx`, which supports:
- Basic auth gating (`isAuthenticated`)
- Role-based allow-lists (`allowedRoles`)
- Admin-only dashboard gating (`dashboardOnly`)

> ⚠️ **Security Notice**: The current auth is for demo purposes only. Passwords are stored in plain text in localStorage. See `src/utils/auth.js` for migration notes.

---

## 🛠️ Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/swissh.git
cd swissh

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open the URL shown by Vite (typically `http://localhost:5173`) in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

---

## 🎨 Design Philosophy

| Principle | Implementation |
|---|---|
| **Premium & Modern** | Curated indigo/slate palette, soft `rounded-2xl` borders, subtle glassmorphism, and refined shadows |
| **Dynamic & Alive** | Framer Motion page transitions, hover micro-interactions, animated stat cards, and smooth drawers |
| **Accessible** | Full dark-mode support via `ThemeContext`, keyboard-navigable focus rings, proper ARIA attributes, empty/loading/error states |
| **Typography** | Plus Jakarta Sans for headings, Inter for body — both loaded via Google Fonts with `font-display: swap` |
| **Responsive** | Desktop sidebar collapses to mobile bottom nav; all layouts adapt fluidly from mobile to widescreen |

---

## 🛣️ Roadmap

- [x] **Phase 1** — High-fidelity visual prototype
- [x] **Phase 1.5** — Extended features (Messages, Settings, Faculty Dashboard, role-based routing)
- [ ] **Phase 2** — Database architecture (MongoDB / PostgreSQL)
- [ ] **Phase 3** — RESTful API (Node.js / Express)
- [ ] **Phase 4** — JWT authentication & Cloudinary image hosting
- [ ] **Phase 5** — Real-time features (WebSockets for messaging & notifications)
- [ ] **Phase 6** — Mobile app (React Native)

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is private and not yet licensed for public distribution.

---

<p align="center">
  Built with ❤️ for campus communities everywhere
</p>
