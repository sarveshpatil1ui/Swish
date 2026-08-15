import React from 'react';
import { Link } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = ({ currentUser }) => {
  const menuItems = [
    { path: '/home', icon: 'home', label: 'Home' },
    { path: '/explore', icon: 'explore', label: 'Explore' },
    { path: '/notifications', icon: 'notifications', label: 'Notifications' },
    { path: '/profile', icon: 'profile', label: 'Profile' },
  ];

  const getIcon = (iconName) => {
    const icons = {
      home: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
      explore: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
        </svg>
      ),
      notifications: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      ),
      profile: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      ),
    };
    return icons[iconName] || null;
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <Link to="/" className="sidebar__logo">
          <span className="sidebar__logo-text">Swish</span>
        </Link>
      </div>

      <nav className="sidebar__nav">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="sidebar__nav-item"
          >
            <span className="sidebar__nav-icon">{getIcon(item.icon)}</span>
            <span className="sidebar__nav-label">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__user">
          <img src={currentUser?.avatar} alt={currentUser?.name} />
          <div className="sidebar__userInfo">
            <div className="sidebar__userName">{currentUser?.name}</div>
            <div className="sidebar__userHandle">@{currentUser?.username}</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;