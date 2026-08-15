import React from 'react';
import Card from './Card';
import Avatar from './Avatar';
import Button from './Button';
import './EventCard.css';

const EventCard = ({ event, onJoin, onInterested }) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Card className="event-card" padding="medium" hover>
      <div className="event-card__image">
        <img src={event.image} alt={event.title} />
        <div className="event-card__date-badge">
          <div className="event-card__date-month">
            {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
          </div>
          <div className="event-card__date-day">
            {new Date(event.date).toLocaleDateString('en-US', { day: 'numeric' })}
          </div>
        </div>
      </div>
      
      <div className="event-card__content">
        <h3 className="event-card__title">{event.title}</h3>
        <div className="event-card__location">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          {event.location}
        </div>
        
        <div className="event-card__meta">
          <div className="event-card__attendees">
            <div className="event-card__avatars">
              {event.attendees.slice(0, 3).map((attendee, index) => (
                <Avatar
                  key={index}
                  src={attendee.avatar}
                  username={attendee.name}
                  size="small"
                  showStatus={false}
                />
              ))}
            </div>
            <span className="event-card__attendee-count">
              {event.attendeeCount} attending
            </span>
          </div>
          <div className="event-card__time">
            {event.time}
          </div>
        </div>
        
        <div className="event-card__actions">
          <Button
            variant={event.isJoined ? 'outline' : 'primary'}
            size="small"
            onClick={() => onJoin && onJoin(event.id)}
          >
            {event.isJoined ? 'Joined' : 'Join Event'}
          </Button>
          <Button
            variant="ghost"
            size="small"
            onClick={() => onInterested && onInterested(event.id)}
          >
            {event.isInterested ? '★ Interested' : '☆ Interested'}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default EventCard;