import React from 'react';
import Avatar from './Avatar';
import './NotificationItem.css';

const NotificationItem = ({ notification, onRead }) => {
  const getIcon = (type) => {
    const icons = {
      like: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" color="#ef4444">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      ),
      comment: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
        </svg>
      ),
      follow: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="8.5" cy="7" r="4"/>
          <line x1="20" y1="8" x2="20" y2="14"/>
          <line x1="23" y1="11" x2="17" y2="11"/>
        </svg>
      ),
    };
    return icons[type] || icons.like;
  };

  const getColor = (type) => {
    const colors = {
      like: '#ef4444',
      comment: '#3b82f6',
      follow: '#10b981',
    };
    return colors[type] || '#3b82f6';
  };

  return (
    <div 
      className={`notification-item ${!notification.isRead ? 'notification-item--unread' : ''}`}
      onClick={() => !notification.isRead && onRead && onRead(notification.id)}
    >
      <div 
        className="notification-item__icon"
        style={{ backgroundColor: `${getColor(notification.type)}20` }}
      >
        {getIcon(notification.type)}
      </div>
      
      <Avatar
        src={notification.user.avatar}
        username={notification.user.name}
        size="medium"
      />
      
      <div className="notification-item__content">
        <div className="notification-item__message">
          <strong>{notification.user.name}</strong>
          <span>{notification.message}</span>
        </div>
        <div className="notification-item__time">{notification.timestamp}</div>
      </div>
      
      {!notification.isRead && (
        <div className="notification-item__indicator" />
      )}
    </div>
  );
};

export default NotificationItem;