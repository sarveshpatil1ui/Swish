# Swish - Private Social Sharing Platform for Campus Communities

A private social media platform designed exclusively for campus communities, enabling students to connect, share, and engage within their academic environment.

## 🎯 What is Swish?

Swish is a campus-focused social platform that provides:
- **Private community access** - Only verified campus members can join
- **Secure sharing** - Content stays within the campus community
- **Real-time engagement** - Connect with peers instantly
- **Campus-specific features** - Tailored for academic environments

## 🛠 Technologies Used

### Frontend
- **React 18** - UI framework
- **React Router** - Client-side routing
- **CSS3** - Styling (no external CSS frameworks)
- **HTML5** - Markup

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB

## 📁 Project Structure

```
Swish/
│
├── frontend/                 # React frontend application
│   ├── public/
│   │   └── index.html        # HTML template
│   ├── src/
│   │   ├── components/      # Reusable React components
│   │   │   ├── Navigation.jsx
│   │   │   └── Navigation.css
│   │   ├── pages/           # Page components
│   │   │   ├── Home.jsx
│   │   │   ├── Home.css
│   │   │   ├── Explore.jsx
│   │   │   ├── Explore.css
│   │   │   ├── Profile.jsx
│   │   │   ├── Profile.css
│   │   │   ├── Login.jsx
│   │   │   └── Login.css
│   │   ├── assets/          # Static assets (images, etc.)
│   │   ├── App.jsx          # Main App component
│   │   ├── App.css
│   │   ├── index.js         # React entry point
│   │   └── index.css        # Global styles
│   └── package.json         # Frontend dependencies
│
├── backend/                  # Express backend API
│   ├── config/
│   │   └── db.js           # MongoDB connection configuration
│   ├── controllers/         # Route controllers (to be added)
│   ├── models/             # Mongoose models (to be added)
│   ├── routes/
│   │   └── index.js       # API routes
│   ├── server.js           # Express server entry point
│   ├── .env.example        # Environment variables template
│   └── package.json        # Backend dependencies
│
├── README.md               # This file
└── .gitignore             # Git ignore rules
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (installed locally or MongoDB Atlas connection string)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd swish
   ```

2. **Install Frontend Dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Install Backend Dependencies**
   ```bash
   cd ../backend
   npm install
   ```

4. **Configure Environment Variables**
   ```bash
   cd backend
   cp .env.example .env
   ```
   Edit `.env` and set your MongoDB connection string:
   ```
   MONGODB_URI=mongodb://localhost:27017/swish
   PORT=5000
   ```

### Running the Application

#### Start Backend Server
```bash
cd backend
npm start
```
The backend will run on `http://localhost:5000`

#### Start Frontend Development Server
Open a new terminal:
```bash
cd frontend
npm start
```
The frontend will run on `http://localhost:3000`

### Verify Installation

1. Check backend health:
   ```bash
   curl http://localhost:5000/api/health
   ```
   Should return: `{"status":"success","message":"Swish API is running","timestamp":"..."}`

2. Open browser and navigate to `http://localhost:3000`
   - You should see the Swish homepage
   - Navigation bar with Home, Explore, Profile, and Login links
   - All pages should be accessible

## 📋 Current Implementation

### ✅ Implemented Features

**Frontend:**
- ✅ Basic React application structure
- ✅ Navigation bar with routing
- ✅ Home page with hero section and feature cards
- ✅ Explore page (placeholder)
- ✅ Profile page (placeholder)
- ✅ Login page with form UI (no authentication logic)
- ✅ Responsive CSS styling
- ✅ Clean, modular component structure

**Backend:**
- ✅ Express server setup
- ✅ MongoDB connection configuration
- ✅ Basic API structure with `/api/health` endpoint
- ✅ CORS enabled
- ✅ Environment variable support
- ✅ Modular folder structure for future expansion

### 🔜 Not Yet Implemented (Future Modules)

- ❌ User authentication (JWT, session management)
- ❌ Database models (User, Post, Comment, etc.)
- ❌ User registration and login API
- ❌ Post creation and management
- ❌ Image upload (Cloudinary integration)
- ❌ Real-time notifications
- ❌ Admin dashboard
- ❌ Advanced security features
- ❌ Testing framework
- ❌ Docker containerization
- ❌ CI/CD pipeline

## 👥 Team Collaboration

This project is designed for a 5-member team developing over 3-4 months. Each team member should:

1. **Create a feature branch** for their assigned module
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Follow the existing code structure** and conventions
3. **Test thoroughly** before creating pull requests
4. **Document changes** in commit messages

## 🎯 Suggested Next Module

**Recommended Next Step: User Authentication System**

Implement the foundational authentication module:
- User registration with campus email validation
- Login/logout functionality
- JWT token-based authentication
- Protected routes
- Basic user profile model

This will establish the core user management system needed for all other features.

## 📝 Development Notes

- Keep the code simple and readable
- Follow existing naming conventions
- Add comments only when necessary for complex logic
- Use the established folder structure
- Test locally before pushing changes
- Coordinate with team members to avoid conflicts

## 🐛 Troubleshooting

**MongoDB Connection Issues:**
- Ensure MongoDB is running locally
- Check your connection string in `.env`
- For MongoDB Atlas, use the correct connection string format

**Port Already in Use:**
- Change the PORT in backend `.env` file
- Update frontend API calls accordingly

**Dependency Issues:**
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again

---

**Happy Coding! 🚀**

*This is a basic starter project. Features will be added incrementally as the team develops the application over the next 3-4 months.*
