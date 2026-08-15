import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './MobileNavigation.css';

const MobileNavigation = () => {
  const location = useLocation();

  const navItems = [
    { path: '/home', label: 'Home', icon: 'home' },
    { path: '/explore', label: 'Explore', icon: 'explore' },
    { path: '/notifications', label: 'Alerts', icon: 'notifications' },
    { path: '/profile', label: 'Profile', icon: 'profile' },
  ];

  const getIcon = (iconName) => {
    const icons = {
      home: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
      explore: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
        </svg>
      ),
      notifications: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      ),
      profile: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      ),
    };
    return icons[iconName] || null;
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="mobile-navigation">
      <div className="mobile-navigation__container">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`mobile-navigation__item ${isActive(item.path) ? 'mobile-navigation__item--active' : ''}`}
          >
            <span className="mobile-navigation__icon">{getIcon(item.icon)}</span>
            <span className="mobile-navigation__label">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default MobileNavigation;