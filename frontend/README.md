# Swish Frontend - Campus Social Platform

A modern, polished React frontend prototype for a private campus social sharing platform.

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will open at `http://localhost:3000`

## 📁 Project Structure

```
frontend/
├── public/
│   └── favicon.ico
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Avatar.jsx
│   │   │   ├── Avatar.css
│   │   │   ├── Button.jsx
│   │   │   ├── Button.css
│   │   │   ├── Card.jsx
│   │   │   ├── Card.css
│   │   │   ├── EmptyState.jsx
│   │   │   ├── EmptyState.css
│   │   │   ├── Input.jsx
│   │   │   ├── Input.css
│   │   │   ├── LoadingSkeleton.jsx
│   │   │   ├── LoadingSkeleton.css
│   │   │   ├── Modal.jsx
│   │   │   ├── Modal.css
│   │   │   ├── SearchBar.jsx
│   │   │   └── SearchBar.css
│   │   ├── layout/
│   │   │   ├── MobileNavigation.jsx
│   │   │   ├── MobileNavigation.css
│   │   │   ├── Navbar.jsx
│   │   │   └── Navbar.css
│   │   └── social/
│   │       ├── CreatePost.jsx
│   │       ├── CreatePost.css
│   │       ├── PostCard.jsx
│   │       ├── PostCard.css
│   │       ├── UserCard.jsx
│   │       └── UserCard.css
│   ├── data/
│   │   └── mockData.js
│   ├── layouts/
│   │   ├── MainLayout.jsx
│   │   └── MainLayout.css
│   ├── pages/
│   │   ├── Admin.jsx
│   │   ├── Admin.css
│   │   ├── EditProfile.jsx
│   │   ├── EditProfile.css
│   │   ├── Explore.jsx
│   │   ├── Explore.css
│   │   ├── Home.jsx
│   │   ├── Home.css
│   │   ├── Landing.jsx
│   │   ├── Landing.css
│   │   ├── Login.jsx
│   │   ├── Login.css
│   │   ├── Notifications.jsx
│   │   ├── Notifications.css
│   │   ├── Profile.jsx
│   │   ├── Profile.css
│   │   ├── Register.jsx
│   │   ├── Register.css
│   │   ├── Search.jsx
│   │   └── Search.css
│   ├── styles/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── variables.css
│   │   └── global.css
│   ├── App.jsx
│   └── index.js
├── package.json
└── README.md
```

## 🎨 Design System

### Color Palette
- **Primary**: #6366f1 (Indigo)
- **Secondary**: #10b981 (Emerald)
- **Accent**: #f59e0b (Amber)
- **Error**: #ef4444 (Red)
- **Success**: #10b981 (Green)
- **Warning**: #f59e0b (Yellow)
- **Info**: #3b82f6 (Blue)

### Typography
- **Font Family**: System fonts (San Francisco, Segoe UI, Roboto)
- **Sizes**: xs (0.75rem) to 4xl (2.25rem)
- **Weights**: 400, 500, 600, 700

### Spacing
- Based on 0.25rem increments (4px base)
- Ranges from xs (0.25rem) to 3xl (4rem)

### Border Radius
- sm: 0.25rem, md: 0.5rem, lg: 0.75rem, xl: 1rem, 2xl: 1.5rem, full: 9999px

### Shadows
- sm, md, lg, xl variants for depth hierarchy

## 📄 Pages Created

### 1. Landing Page (`/`)
- Hero section with call-to-action
- Feature showcase (4 key features)
- Statistics and testimonials placeholder
- Responsive design with animations

### 2. Login Page (`/login`)
- Email and password fields
- Remember me checkbox
- Forgot password link
- Form validation
- Link to registration

### 3. Register Page (`/register`)
- Full name, email, password fields
- Department and year selection
- Password confirmation
- Campus email validation (.edu)
- Comprehensive form validation

### 4. Home Feed (`/home`)
- Create post UI with image upload
- Social feed with post cards
- Like, comment, share, save functionality
- Sidebar with suggestions and trending topics
- Load more posts functionality

### 5. Explore Page (`/explore`)
- Search functionality
- Category browsing
- Tab-based filtering (All, Posts, People, Categories)
- Grid layouts for content
- Empty states and loading states

### 6. Profile Page (`/profile`)
- Profile header with avatar and stats
- User information display
- Tab-based content (Posts, Photos, Likes)
- Follow/unfollow functionality
- Edit profile button

### 7. Edit Profile Page (`/edit-profile`)
- Avatar upload with preview
- Basic information editing
- Academic information (department, year)
- Bio editing with character count
- Form validation

### 8. Notifications Page (`/notifications`)
- Filter tabs (All, Unread, Likes, Comments, Follows)
- Notification items with icons
- Read/unread status indicators
- Mark all as read functionality
- Different notification types

### 9. Search Page (`/search`)
- Search bar with autocomplete
- Search history
- Tab-based results (All, Users, Posts, Departments)
- Real-time filtering
- Empty states

### 10. Admin Dashboard (`/admin`)
- Overview with statistics cards
- User management table
- Report management system
- Analytics placeholder
- Admin actions (ban, remove post, etc.)

## 🧩 Components Created

### Common Components
- **Avatar**: User avatar with status indicators
- **Button**: Multiple variants (primary, secondary, outline, ghost, danger)
- **Card**: Reusable card component with variants
- **Input**: Form input with validation states
- **Modal**: Dialog component with backdrop
- **SearchBar**: Search input with clear button
- **LoadingSkeleton**: Loading placeholder components
- **EmptyState**: Empty state with icon and message

### Layout Components
- **Navbar**: Desktop navigation with logo and menu
- **MobileNavigation**: Bottom navigation for mobile
- **MainLayout**: Main app layout wrapper

### Social Components
- **PostCard**: Social media post with interactions
- **UserCard**: User profile card with follow button
- **CreatePost**: Post creation form with image upload

## 🔧 Features Implemented

### Navigation
- Responsive desktop navbar
- Mobile bottom navigation
- Active state indicators
- Mobile hamburger menu
- Search integration

### User Interactions
- Like/unlike posts
- Comment on posts
- Share posts
- Save/bookmark posts
- Follow/unfollow users
- Create new posts
- Edit profile

### UI States
- Loading states (skeletons)
- Empty states
- Error states (form validation)
- Hover states
- Active states
- Disabled states

### Responsive Design
- Mobile-first approach
- Tablet and desktop layouts
- Adaptive grids
- Touch-friendly interfaces
- Optimized images

## 📊 Mock Data

Comprehensive mock data structure includes:
- **Users**: 8 sample users with complete profiles
- **Posts**: 8 realistic campus-related posts
- **Notifications**: Various notification types
- **Categories**: 8 content categories
- **Departments**: 12 academic departments
- **Admin Stats**: Dashboard statistics
- **Reported Posts**: Sample reported content

## 🔄 Backend Integration

The application is structured for easy backend integration:

### Current Structure:
```javascript
// Import mock data
import { mockUsers, mockPosts } from './data/mockData';

// Use in components
const users = mockUsers;
```

### Future Backend Integration:
```javascript
// Replace with API calls
import { getUsers, getPosts } from './services/api';

// Use in components
const users = await getUsers();
const posts = await getPosts();
```

### Service Layer Structure:
Create `src/services/api.js`:
```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

export const getUsers = async () => {
  const response = await axios.get(`${API_BASE_URL}/users`);
  return response.data;
};

export const getPosts = async () => {
  const response = await axios.get(`${API_BASE_URL}/posts`);
  return response.data;
};
```

## 🎯 Key Design Decisions

### 1. **Component Architecture**
- Atomic design principles
- Reusable component library
- Separation of concerns
- Props-based configuration

### 2. **CSS Architecture**
- CSS custom properties (variables)
- BEM-inspired naming
- Component-scoped styles
- Responsive breakpoints

### 3. **State Management**
- React hooks (useState, useEffect)
- Local component state
- Prop drilling for simplicity
- Ready for Redux/Zustand if needed

### 4. **Routing**
- React Router v6
- Nested routes
- Protected routes
- Navigation patterns

### 5. **Performance**
- Code splitting ready
- Lazy loading capable
- Optimized images
- Minimal dependencies

## 🐛 Known Limitations

1. **No Real Authentication**: UI-only, uses mock login
2. **No Real Backend**: All data is mock/local
3. **No Real-time Features**: No WebSocket integration
4. **No Image Upload**: Simulated with FileReader
5. **No Persistence**: Data resets on refresh
6. **No Error Handling**: Basic error states only

## 🚀 Future Enhancements

### Backend Integration
- Connect to Node.js + Express + MongoDB
- Implement JWT authentication
- Real API endpoints
- WebSocket for real-time features

### Features
- Real-time notifications
- Image upload to cloud storage
- Advanced search with filters
- Direct messaging
- Stories feature
- Video posts
- Analytics dashboard

### Technical
- Add Redux/Zustand for state management
- Implement React Query for data fetching
- Add TypeScript support
- Set up CI/CD pipeline
- Add comprehensive testing

## 📱 Responsive Breakpoints

- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: 1024px - 1280px
- **Large Desktop**: > 1280px

## 🎨 Brand Identity

### Swish Visual Identity
- **Modern & Clean**: Minimalist design approach
- **Premium Feel**: High-quality animations and transitions
- **Student-Friendly**: Approachable and engaging
- **Professional**: Suitable for academic environment
- **Consistent**: Unified design language across all pages

### Logo Treatment
- Text-based logo with custom styling
- Primary color accent
- Clean typography
- Scalable for all sizes

## 🔒 Security Considerations

### Current Implementation
- Client-side validation only
- No real authentication
- Mock data only
- No secure data transmission

### Production Requirements
- Server-side validation
- JWT authentication
- HTTPS only
- Input sanitization
- XSS protection
- CSRF protection
- Rate limiting

## 📝 Development Notes

### Code Style
- JSX for components
- Functional components with hooks
- CSS modules (component-scoped)
- Consistent naming conventions
- Clean, readable code

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ JavaScript
- CSS Grid and Flexbox
- CSS Custom Properties

## 🎓 Learning Resources

This project demonstrates:
- Modern React patterns
- Component-based architecture
- Responsive design principles
- CSS custom properties
- React Router navigation
- Form validation
- State management
- Mock data patterns

## 🤝 Contributing

This is a frontend prototype for comparison purposes. When connecting to backend:
1. Replace mock data imports with API calls
2. Implement real authentication
3. Add error handling
4. Add loading states for API calls
5. Implement proper data validation

## 📄 License

This is a project prototype for educational purposes.

---

**Built with ❤️ for campus communities**