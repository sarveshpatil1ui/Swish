import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Avatar from '../common/Avatar';
import SearchBar from '../common/SearchBar';
import './Navbar.css';

const Navbar = ({ currentUser, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: '/home', label: 'Home', icon: 'home' },
    { path: '/explore', label: 'Explore', icon: 'explore' },
    { path: '/notifications', label: 'Notifications', icon: 'notifications' },
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
      search: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
      ),
      create: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      ),
    };
    return icons[iconName] || null;
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="navbar">
      <div className="navbar__container">
        {/* Logo */}
        <Link to="/" className="navbar__logo">
          <span className="navbar__logo-text">Swish</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="navbar__desktop-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`navbar__nav-item ${isActive(item.path) ? 'navbar__nav-item--active' : ''}`}
            >
              <span className="navbar__nav-icon">{getIcon(item.icon)}</span>
              <span className="navbar__nav-label">{item.label}</span>
            </Link>
          ))}
          <Link
            to="/search"
            className={`navbar__nav-item ${isActive('/search') ? 'navbar__nav-item--active' : ''}`}
          >
            <span className="navbar__nav-icon">{getIcon('search')}</span>
            <span className="navbar__nav-label">Search</span>
          </Link>
        </div>

        {/* Right Section */}
        <div className="navbar__right">
          <SearchBar 
            className="navbar__search"
            placeholder="Search..."
          />
          <button
            className="navbar__create-btn"
            aria-label="Create post"
          >
            {getIcon('create')}
          </button>
          <div className="navbar__user">
            <Avatar
              src={currentUser?.avatar}
              username={currentUser?.name}
              size="medium"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
          </div>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="navbar__mobile-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {isMobileMenuOpen ? (
              <line x1="18" y1="6" x2="6" y2="18" />
            ) : (
              <>
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="navbar__mobile-menu">
          <div className="navbar__mobile-menu-content">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`navbar__mobile-nav-item ${isActive(item.path) ? 'navbar__mobile-nav-item--active' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="navbar__mobile-nav-icon">{getIcon(item.icon)}</span>
                <span className="navbar__mobile-nav-label">{item.label}</span>
              </Link>
            ))}
            <Link
              to="/search"
              className={`navbar__mobile-nav-item ${isActive('/search') ? 'navbar__mobile-nav-item--active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="navbar__mobile-nav-icon">{getIcon('search')}</span>
              <span className="navbar__mobile-nav-label">Search</span>
            </Link>
            {onLogout && (
              <button
                className="navbar__mobile-nav-item navbar__mobile-nav-item--logout"
                onClick={() => {
                  onLogout();
                  setIsMobileMenuOpen(false);
                }}
              >
                <span className="navbar__mobile-nav-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                </span>
                <span className="navbar__mobile-nav-label">Logout</span>
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;