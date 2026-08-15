import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Explore from './pages/Explore';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import Notifications from './pages/Notifications';
import Search from './pages/Search';
import Admin from './pages/Admin';
import { mockCurrentUser } from './data/mockData';
import './styles/global.css';

function App() {
  const [currentUser, setCurrentUser] = React.useState(mockCurrentUser);

  const handleLogout = () => {
    // For demo purposes, just reload the page
    window.location.reload();
  };

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route path="/home" element={
          <MainLayout currentUser={currentUser} onLogout={handleLogout}>
            <Home />
          </MainLayout>
        } />
        <Route path="/explore" element={
          <MainLayout currentUser={currentUser} onLogout={handleLogout}>
            <Explore />
          </MainLayout>
        } />
        <Route path="/profile" element={
          <MainLayout currentUser={currentUser} onLogout={handleLogout}>
            <Profile />
          </MainLayout>
        } />
        <Route path="/profile/:userId" element={
          <MainLayout currentUser={currentUser} onLogout={handleLogout}>
            <Profile />
          </MainLayout>
        } />
        <Route path="/edit-profile" element={
          <MainLayout currentUser={currentUser} onLogout={handleLogout}>
            <EditProfile />
          </MainLayout>
        } />
        <Route path="/notifications" element={
          <MainLayout currentUser={currentUser} onLogout={handleLogout}>
            <Notifications />
          </MainLayout>
        } />
        <Route path="/search" element={
          <MainLayout currentUser={currentUser} onLogout={handleLogout}>
            <Search />
          </MainLayout>
        } />
        <Route path="/admin" element={
          <MainLayout currentUser={currentUser} onLogout={handleLogout}>
            <Admin />
          </MainLayout>
        } />

        {/* Catch all - 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;