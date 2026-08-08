# Swish — Campus Social Network

![Swish Prototype](https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1200&h=400)

**Swish** is a modern, premium social networking platform designed exclusively for university and college campuses. It aims to connect students, faculty, and campus organizations in a verified, trustworthy environment.

> **Note**: This repository currently contains the **high-fidelity UI prototype**. The frontend is fully designed and interactive using mock data, in preparation for a team UI review. Backend APIs, databases, and real authentication will be implemented in the next phase.

## 🎯 Project Goals

- **Verified Campus Communities**: A closed network requiring an `.edu` email address.
- **Modern & Premium UX**: An interface that feels like "Instagram × Campus Community" but with its own unique, trustworthy identity.
- **Real-time Engagement**: Features like stories, trending topics, and a dynamic home feed.
- **Responsive Design**: Flawless experience across desktop, tablet, and mobile devices (including dark mode).

## 🚀 Tech Stack (Frontend)

- **Framework**: React (Vite)
- **Routing**: React Router v7
- **Styling**: TailwindCSS v4 + Vanilla CSS tokens
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **State Management**: React Context (`AuthContext`, `ThemeContext`)

## 📱 Prototype Features

The current UI prototype includes the following polished screens and interactions:

### Public Pages
- **Landing Page**: High-converting, animated marketing page with features, trust indicators, and product previews.
- **Join/Login**: Realistic authentication flows with campus verification messaging.

### Application Pages (Authenticated)
- **Home Feed**: Dynamic feed with image posts, stories viewer, right-panel trending topics, and real-time bi-directional search filtering.
- **Explore**: Grid-based discovery of trending posts, a "People" search directory, and active hashtags.
- **Profile**: User profiles with follow interactions, stats, and an image grid with skeleton loading states.
- **Notifications**: Interactive alerts (likes, comments, follows) with unread badging and an "all caught up" celebration state.
- **Create Post**: Drag-and-drop image upload modal with real-time caption character counting.
- **Admin Dashboard**: Moderation tools, user suspension toggles, and report management with simulated network loading states.

## 🛠️ Getting Started

To run this UI prototype locally:

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the development server**
   ```bash
   npm run dev
   ```

3. **View the app**
   Open `http://localhost:5174` (or the port specified by Vite) in your browser.

## 🎨 Design Philosophy

Swish is built on the following design principles:
- **Friendly & Trustworthy**: Soft border radii (`rounded-2xl`), subtle shadows, and a refined indigo/slate color palette.
- **Dynamic**: Extensive use of micro-interactions, hover states, and smooth Framer Motion page transitions.
- **Accessible**: Full support for dark mode, focus rings, and proper empty/loading states across all views.

## 🛣️ Roadmap

- [x] Phase 1: High-fidelity visual prototype (Current)
- [ ] Phase 2: Database architecture (MongoDB/PostgreSQL)
- [ ] Phase 3: RESTful Node.js / Express API
- [ ] Phase 4: JWT Authentication & Cloudinary image hosting
- [ ] Phase 5: Real-time features (WebSockets)
