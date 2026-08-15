import React, { useState } from 'react';
import NotificationItem from '../components/common/NotificationItem';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { mockNotifications } from '../data/mockData';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';
import './Notifications.css';

const Notifications = () => {
  const [notifications, setNotifications] = useState(mockNotifications);
  const [filter, setFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'likes', label: 'Likes' },
    { id: 'comments', label: 'Comments' },
    { id: 'follows', label: 'Follows' }
  ];

  const markAsRead = (notificationId) => {
    setNotifications(notifications.map(notif =>
      notif.id === notificationId ? { ...notif, isRead: true } : notif
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(notif => ({ ...notif, isRead: true })));
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notif.isRead;
    return notif.type === filter.slice(0, -1);
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="notifications">
      <div className="notifications__container">
        <div className="notifications__header">
          <h1 className="notifications__title">Notifications</h1>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="small"
              onClick={markAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </div>

        <div className="notifications__filters">
          {filters.map(f => (
            <button
              key={f.id}
              className={`notifications__filter ${filter === f.id ? 'notifications__filter--active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              {f.id === 'unread' && unreadCount > 0 && (
                <span className="notifications__filter-badge">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>

        <Card className="notifications__list" padding="none">
          {isLoading ? (
            <div className="notifications__loading">
              <LoadingSkeleton variant="card" height={80} count={5} />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="notifications__empty">
              <EmptyState
                icon={
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                }
                title="No notifications"
                description="You're all caught up!"
              />
            </div>
          ) : (
            <div className="notifications__items">
              {filteredNotifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={markAsRead}
                />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Notifications;